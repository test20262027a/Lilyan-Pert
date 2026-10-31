import { useRef, useState } from 'react';
import Icon from '../Icon';
import UserAvatar from '../UserAvatar';
import { useToast } from '../ui';
import { useI18n } from '../../i18n';
import { uploadImageDataUrl } from '../../api';
import './userPhoto.css';

/* The photo formats the form promises, plus the 5 MB ceiling. */
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const TARGET = 512;

/**
 * Crops the picture to a centred 1:1 square and re-encodes it small enough for
 * an avatar. Nothing is stretched: the square is taken out of the middle of the
 * image and both sides keep their original proportion.
 */
function squareDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('INVALID_IMAGE'));
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        const sourceX = (image.width - side) / 2;
        const sourceY = (image.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = TARGET;
        canvas.height = TARGET;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, sourceX, sourceY, side, side, 0, 0, TARGET, TARGET);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/*
 * Profile picture & fallback avatar.
 *
 * The live circular preview follows every change immediately: uploading,
 * removing, or picking a silhouette. The uploaded photo always wins in the
 * preview, and the avatar choice stays visible in the dropdown underneath so the
 * administrator can see what will be restored if the photo is removed later.
 *
 * Uploading goes straight through the app's existing media endpoint, so the form
 * only ever holds a real stored reference — never a base64 blob in the record.
 */
export default function UserPhotoField({
  photo,
  avatarType = 'default',
  onPhotoChange,
  onAvatarChange,
  name,
  disabled = false,
  onUploading,
  className = '',
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  // Neutral first: the default choice is never inferred from the name.
  const avatarOptions = [
    { value: 'default', label: t('user_avatar_default') },
    { value: 'male', label: t('user_avatar_male') },
    { value: 'female', label: t('user_avatar_female') },
  ];

  const pick = async (file) => {
    if (!file || busy) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error(t('error_invalid_image'));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('error_profile_image_too_large'));
      return;
    }
    setBusy(true);
    onUploading?.(true);
    try {
      // A failed upload is reported and leaves the stored photo untouched.
      const url = await uploadImageDataUrl(await squareDataUrl(file));
      onPhotoChange?.(url);
    } catch (err) {
      toast.error(err?.code === 'IMAGE_TOO_LARGE' ? t('error_profile_image_too_large') : t('error_invalid_image'));
    } finally {
      setBusy(false);
      onUploading?.(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={`uphoto ${className}`.trim()}>
      {/* Live preview beside the upload controls: the large circular frame is
          the same avatar component the rest of the app shows, so what the
          administrator sees here is exactly what the account will look like. */}
      <div className="uphoto__head">
        <span className={`uphoto__stage ${busy ? 'is-busy' : ''}`}>
          <span className="uphoto__frame">
            <UserAvatar src={photo || null} avatarType={avatarType} size={96} alt={name || ''} />
          </span>
          <span className="uphoto__badge" aria-hidden="true">
            {busy ? <span className="spinner" /> : <Icon name="camera" size={12} />}
          </span>
        </span>

        <div className="uphoto__panel">
          <div className="uphoto__actions">
            <label className={`uphoto__btn uphoto__btn--primary ${disabled || busy ? 'is-disabled' : ''}`}>
              <Icon name="upload" size={14} />
              <span>{t('user_upload_photo')}</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={disabled || busy}
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </label>
            {photo ? (
              <button
                type="button"
                className="uphoto__btn"
                disabled={disabled || busy}
                onClick={() => onPhotoChange?.(null)}
              >
                <Icon name="trash" size={14} />
                <span>{t('user_remove_photo')}</span>
              </button>
            ) : null}
          </div>
          <p className="um-note uphoto__hint">{t('user_photo_hint')}</p>
        </div>
      </div>

      <div className="uphoto__field">
        <div className="uphoto__fieldhead">
          <span className="uphoto__label">{t('user_avatar_choose')}</span>
          <span className="uphoto__rule" aria-hidden="true" />
        </div>
        {/* Three premium portrait cards side by side: the chosen one lifts out
            of the row, gains a themed ring and a check mark, so the selection
            is unmistakable while every option stays easy to hit. */}
        <div
          className="uavatar-picker"
          role="radiogroup"
          aria-label={t('user_avatar_label')}
        >
          {avatarOptions.map((option) => {
            const selected = avatarType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                className={`uavatar-option ${selected ? 'is-selected' : ''}`}
                onClick={() => onAvatarChange?.(option.value)}
                disabled={disabled}
              >
                <span className="uavatar-option__disc">
                  <UserAvatar avatarType={option.value} size={54} />
                  <span className="uavatar-option__check" aria-hidden="true">
                    <Icon name="check" size={10} />
                  </span>
                </span>
                <span className="uavatar-option__label">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
