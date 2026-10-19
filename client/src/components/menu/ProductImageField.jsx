import { useState } from 'react';
import Icon from '../Icon';
import { useToast } from '../ui';
import { useI18n } from '../../i18n';
import { uploadImage } from '../../api';

/* JPG, PNG and WebP, as the reference form promises. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/*
 * The product photograph.
 *
 * Empty, it is the reference's large dashed drop zone: click it, or drop a file
 * on it. Once a picture is chosen the frame follows the picture instead of
 * cropping it — the image is shown whole (object-fit: contain) at its natural
 * aspect ratio, and it is exactly this stored file the product card later
 * displays.
 *
 * Uploading happens immediately through the app's existing media endpoint, so
 * the form always carries a real, permanent URL — never an empty placeholder.
 * The picture can be replaced or removed again before the product is saved.
 */
export default function ProductImageField({ value, onChange, onUploading }) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pick = async (file) => {
    if (!file || busy) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error(t('error_invalid_image'));
      return;
    }
    setBusy(true);
    onUploading?.(true);
    try {
      // Throws IMAGE_TOO_LARGE / server errors — reported, never swallowed.
      onChange(await uploadImage(file));
    } catch (err) {
      toast.error(err.message === 'IMAGE_TOO_LARGE' ? t('error_image_too_large') : t('error_invalid_image'));
    } finally {
      setBusy(false);
      onUploading?.(false);
    }
  };

  const input = (
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        pick(file);
      }}
    />
  );

  if (value) {
    return (
      <div className="mform__image">
        <div className="mform__image-frame">
          <img src={value} alt="" />
        </div>
        <div className="mform__image-actions">
          <label className={`mform__mini ${busy ? 'is-busy' : ''}`}>
            {busy ? <span className="spinner" /> : <Icon name="upload" size={14} />}
            {t('menu_upload_image')}
            {input}
          </label>
          <button type="button" className="mform__mini" onClick={() => onChange(null)} disabled={busy}>
            <Icon name="trash" size={14} />
            {t('menu_remove_image')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <label
      className={`mform__drop ${dragging ? 'is-dragging' : ''} ${busy ? 'is-busy' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files?.[0]);
      }}
    >
      {busy ? <span className="spinner" /> : <Icon name="image" size={30} />}
      <span className="mform__drop-label">{busy ? t('state_loading') : t('menu_upload_image')}</span>
      {input}
    </label>
  );
}
