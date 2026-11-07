import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { uploadImage, uploadImageDataUrl } from '../../api';
import { adErrorText } from './errorText';

/* The advertisement's shape: 1440 × 810 (16:9). */
const OUT_W = 1440;
const OUT_H = 810;
const RATIO = OUT_W / OUT_H;

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

/** Close enough to 16:9 to need no cropping at all. */
const isSixteenNine = (width, height) => Math.abs(width / height - RATIO) <= RATIO * 0.01;

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = src;
  });

/**
 * Paints the visible 16:9 window of `img` onto `canvas`.
 *
 * `zoom` (1…3) scales the picture around the window's centre and `nx` / `ny`
 * (−1…1) pan it, so the same numbers draw the preview and the picture that is
 * finally stored — what the administrator sees is what is saved.
 */
function drawCrop(canvas, img, zoom, nx, ny) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom;
  const sw = img.naturalWidth * scale;
  const sh = img.naturalHeight * scale;
  const maxX = Math.max(0, (sw - W) / 2);
  const maxY = Math.max(0, (sh - H) / 2);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#10131a';
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (W - sw) / 2 + nx * maxX, (H - sh) / 2 + ny * maxY, sw, sh);
}

const PREVIEW_W = 720;
const PREVIEW_H = 405;

/*
 * The advertisement picture.
 *
 * Empty it is the 16:9 dashed drop zone from the reference form: click to open
 * the device file picker, or drop a file on it. A picture that is already 16:9
 * is uploaded untouched; any other shape opens a crop step where the
 * administrator drags and zooms the picture inside the 16:9 window and
 * confirms the result, which is then rendered to 1440 × 810 and stored through
 * the app's media endpoint.
 *
 * A file is always read BEFORE the input is cleared: clearing `input.value`
 * empties its live FileList, which is why reading it afterwards silently did
 * nothing.
 */
export default function AdImageField({ value, onChange, onUploading }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [crop, setCrop] = useState(null);
  const [error, setError] = useState(null);
  const [small, setSmall] = useState(false);
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  // Paint the crop window whenever the picture, the zoom or the pan changes.
  useEffect(() => {
    if (!crop || !canvasRef.current) return;
    drawCrop(canvasRef.current, crop.img, crop.zoom, crop.nx, crop.ny);
  }, [crop]);

  // Warn about a stored picture that is smaller than the recommended size.
  useEffect(() => {
    if (!value) {
      setSmall(false);
      return undefined;
    }
    let alive = true;
    loadImage(value)
      .then((img) => {
        if (alive) setSmall(img.naturalWidth < OUT_W || img.naturalHeight < OUT_H);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value]);

  const pick = async (file) => {
    if (!file || busy) return;
    if (!ACCEPTED.includes(file.type)) {
      setError('INVALID_IMAGE');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('IMAGE_TOO_LARGE');
      return;
    }
    setError(null);
    setBusy(true);
    onUploading?.(true);
    try {
      const dataUrl = await readFile(file);
      const img = await loadImage(dataUrl);
      if (isSixteenNine(img.naturalWidth, img.naturalHeight)) {
        onChange(await uploadImage(file));
      } else {
        // Nothing is stored until the administrator confirms the crop.
        setCrop({ img, zoom: 1, nx: 0, ny: 0 });
      }
    } catch (err) {
      setError(err?.code === 'IMAGE_TOO_LARGE' ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED');
    } finally {
      setBusy(false);
      onUploading?.(false);
    }
  };

  const adjustSaved = async () => {
    if (!value || busy) return;
    setError(null);
    try {
      setCrop({ img: await loadImage(value), zoom: 1, nx: 0, ny: 0 });
    } catch {
      setError('UPLOAD_FAILED');
    }
  };

  const confirmCrop = async () => {
    if (!crop || busy) return;
    setBusy(true);
    onUploading?.(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      drawCrop(canvas, crop.img, crop.zoom, crop.nx, crop.ny);
      onChange(await uploadImageDataUrl(canvas.toDataURL('image/jpeg', 0.92)));
      setCrop(null);
      setError(null);
    } catch {
      // The previously saved picture is untouched; the crop can be retried.
      setError('UPLOAD_FAILED');
    } finally {
      setBusy(false);
      onUploading?.(false);
    }
  };

  // Dragging the preview pans the picture inside the fixed window.
  const onPointerDown = (event) => {
    if (!crop || busy) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event) => {
    const start = dragRef.current;
    const canvas = canvasRef.current;
    if (!start || !crop || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const factor = PREVIEW_W / rect.width;
    const dx = (event.clientX - start.x) * factor;
    const dy = (event.clientY - start.y) * factor;
    dragRef.current = { x: event.clientX, y: event.clientY };

    const scale = Math.max(PREVIEW_W / crop.img.naturalWidth, PREVIEW_H / crop.img.naturalHeight) * crop.zoom;
    const maxX = Math.max(1, (crop.img.naturalWidth * scale - PREVIEW_W) / 2);
    const maxY = Math.max(1, (crop.img.naturalHeight * scale - PREVIEW_H) / 2);
    setCrop((state) => {
      if (!state) return state;
      const nx = Math.min(1, Math.max(-1, state.nx - dx / maxX));
      const ny = Math.min(1, Math.max(-1, state.ny - dy / maxY));
      return { ...state, nx, ny };
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED.join(',')}
      hidden
      onChange={(event) => {
        // Read the file first, then reset — clearing the input empties its list.
        const file = event.target.files?.[0];
        event.target.value = '';
        pick(file);
      }}
    />
  );

  if (crop) {
    return (
      <div className="ad-crop">
        <div className="ad-crop__head">
          <span className="ad-crop__title">{t('ads_crop_title')}</span>
          <span className="ad-crop__hint">{t('ads_recommended')}</span>
        </div>
        <canvas
          ref={canvasRef}
          className="ad-crop__canvas"
          width={PREVIEW_W}
          height={PREVIEW_H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <p className="ad-crop__hint">{t('ads_crop_hint')}</p>
        <label className="ad-crop__zoom">
          {t('ads_crop_zoom')}
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={crop.zoom}
            onChange={(event) => {
              const zoom = Number(event.target.value);
              setCrop((state) => (state ? { ...state, zoom } : state));
            }}
          />
        </label>
        {error ? <p className="ad-upnote ad-upnote--warn">{adErrorText(error, t)}</p> : null}
        <div className="ad-crop__actions">
          <button type="button" className="ad-mini" onClick={confirmCrop} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={14} />}
            {t('ads_crop_confirm')}
          </button>
          <button type="button" className="ad-mini" onClick={() => setCrop(null)} disabled={busy}>
            {t('action_cancel')}
          </button>
        </div>
      </div>
    );
  }

  if (value) {
    return (
      <div className="ad-upfilled">
        <img src={value} alt="" />
        <div className="ad-upfilled__actions">
          <button
            type="button"
            className="ad-mini"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? <span className="spinner" /> : <Icon name="upload" size={14} />}
            {t('ads_replace_image')}
          </button>
          <button type="button" className="ad-mini" onClick={adjustSaved} disabled={busy}>
            <Icon name="camera" size={14} />
            {t('ads_adjust_image')}
          </button>
          <button
            type="button"
            className="ad-mini ad-mini--danger"
            onClick={() => onChange('')}
            disabled={busy}
          >
            <Icon name="trash" size={14} />
            {t('menu_remove_image')}
          </button>
        </div>
        {small ? <p className="ad-upnote ad-upnote--warn">{t('ads_quality_warning')}</p> : null}
        {error ? <p className="ad-upnote ad-upnote--warn">{adErrorText(error, t)}</p> : null}
        {fileInput}
      </div>
    );
  }

  return (
    <>
      <div
        className={`ad-drop ${dragging ? 'is-over' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={t('ads_upload_hint')}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!busy) inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) pick(event.dataTransfer?.files?.[0]);
        }}
      >
        <span className="ad-drop__icon" aria-hidden="true">
          <Icon name="upload" size={20} />
        </span>
        <span className="ad-drop__title">{busy ? t('ads_uploading') : t('ads_upload_hint')}</span>
        <span className="ad-drop__hint">{t('ads_recommended')}</span>
        <span className="ad-drop__formats">{t('ads_formats')}</span>
        {busy ? (
          <span className="ad-drop__progress" aria-hidden="true">
            <i />
          </span>
        ) : null}
      </div>
      {error ? <p className="ad-upnote ad-upnote--warn">{adErrorText(error, t)}</p> : null}
      {fileInput}
    </>
  );
}
