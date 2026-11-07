import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import DashIcon from '../dashboard/DashIcon';
import { useToast } from '../ui';
import DeleteConfirmationDialog from '../confirm/DeleteConfirmationDialog';
import { useI18n } from '../../i18n';
import { uploadImage } from '../../api';

// The upload policy the media endpoint already enforces.
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * One image card with a shared four-region structure — identity, preview,
 * upload control, guidance — so every card in the branding row lines up region
 * for region whatever shape its preview keeps.
 *
 * `shape` picks the frame: `logo` and `cover` show the whole picture, `login`
 * shows it exactly as the sign-in page will (a full-bleed cover fit under the
 * frosted card), because a login backdrop is judged on how it looks behind the
 * form, not in isolation.
 *
 * The chosen file is shown immediately through a local object URL, then stored
 * through the existing media endpoint and only its final URL enters the draft:
 * a temporary preview can never become a permanent reference, and a failed
 * upload leaves the previously saved image untouched.
 */
export default function MediaCard({
  shape,
  icon = 'image',
  tone = 'blue',
  label,
  hint,
  dims,
  uploadLabel,
  value,
  onChange,
  canManage,
  removeTitle,
  removeMessage,
}) {
  const { t, dir } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [local, setLocal] = useState(null);
  const [broken, setBroken] = useState(false);
  const dragDepth = useRef(0);

  // A different saved image (a tab reload, a discard) replaces the preview.
  useEffect(() => {
    setBroken(false);
  }, [value]);

  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('error_invalid_image'));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('settings_image_too_large'));
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocal(preview);
    setBroken(false);
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch {
      toast.error(t('error_invalid_image'));
    } finally {
      URL.revokeObjectURL(preview);
      setLocal(null);
      setBusy(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!canManage || busy) return;
    pick(event.dataTransfer?.files?.[0]);
  };

  const source = local || value;
  const showImage = Boolean(source) && !broken;

  return (
    <section
      className={`set-media-card set-media-card--${shape} ${dragging ? 'is-dragging' : ''}`}
      dir={dir}
    >
      <header className="set-media-card__head">
        <DashIcon name={icon} tone={tone} size={34} />
        <div className="set-media-card__titles">
          <span className="set-media-card__label">{label}</span>
          {hint ? <span className="set-media-card__desc">{hint}</span> : null}
        </div>
        {value && canManage ? (
          <button
            type="button"
            className="set-media-card__remove"
            onClick={() => setConfirm(true)}
            title={t('menu_remove_image')}
            aria-label={removeTitle}
          >
            <Icon name="close" size={13} />
          </button>
        ) : null}
      </header>

      <div
        className={`set-media-card__preview ${showImage ? 'has-image' : ''} ${busy ? 'is-busy' : ''}`}
        aria-busy={busy}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!canManage) return;
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!canManage) return;
          event.preventDefault();
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={onDrop}
      >
        {showImage ? (
          <img src={source} alt={label} onError={() => setBroken(true)} />
        ) : (
          <span className="set-media-card__empty">
            <span className="set-media-card__empty-icon" aria-hidden="true">
              <Icon name="image" size={20} />
            </span>
            <span className="set-media-card__empty-text">
              {broken ? t('settings_image_missing') : t('settings_media_empty')}
            </span>
          </span>
        )}
        {/* The login frame is judged behind the frosted card it will sit under. */}
        {shape === 'login' && showImage ? (
          <span className="set-media-card__login-mock" aria-hidden="true">
            <span className="set-media-card__login-form" />
          </span>
        ) : null}
        {busy ? <span className="set-media-card__loading" aria-hidden="true" /> : null}
      </div>

      <div className="set-media-card__foot">
        <label
          className={`set-media-card__upload app-action-button ${canManage && !busy ? '' : 'is-disabled'}`}
        >
          <span className="button-label">{value ? t('settings_replace_image') : uploadLabel}</span>
          {busy ? (
            <span className="spinner button-icon" />
          ) : (
            <Icon name="upload" size={15} className="button-icon" />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            hidden
            disabled={!canManage || busy}
            aria-label={value ? t('settings_replace_image') : uploadLabel}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              pick(file);
            }}
          />
        </label>
        {dims ? <p className="set-media-card__dims">{dims}</p> : null}
      </div>

      {confirm ? (
        <DeleteConfirmationDialog
          entityType="asset"
          title={removeTitle}
          description={removeMessage}
          entityName={label}
          entityImage={value || null}
          confirmLabel={t('menu_remove_image')}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            onChange(null);
            setConfirm(false);
          }}
        />
      ) : null}
    </section>
  );
}
