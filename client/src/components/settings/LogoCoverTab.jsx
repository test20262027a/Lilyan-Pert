import { useState } from 'react';
import Icon from '../Icon';
import { ConfirmDialog, useToast } from '../ui';
import { useI18n } from '../../i18n';
import { uploadImage } from '../../api';
import { SettingsCard } from './SettingsCard';

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Logo & cover. The chosen file is stored through the existing media endpoint
 * and only its final URL enters the draft, so a temporary object URL can never
 * become a permanent reference. The business record itself is unchanged until
 * the workspace Save is pressed.
 */
function MediaField({
  label,
  hint,
  uploadLabel,
  value,
  onChange,
  canManage,
  shape,
  removeTitle,
  removeMessage,
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('error_invalid_image'));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('settings_image_too_large'));
      return;
    }
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch {
      toast.error(t('error_invalid_image'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`set-media-field set-media-field--${shape}`}>
      <div className="set-media-field__head">
        <span className="set-media-field__label">{label}</span>
      </div>

      <div className={`set-media ${value ? 'has-image' : ''}`}>
        {value ? <img src={value} alt="" /> : null}
        {!value ? (
          <span className="set-media__empty">
            <Icon name="image" size={26} />
          </span>
        ) : null}
        {/* The remove control sits on the picture itself, as in the reference. */}
        {value && canManage ? (
          <button
            type="button"
            className="set-media__remove"
            onClick={() => setConfirm(true)}
            title={t('menu_remove_image')}
            aria-label={removeTitle}
          >
            <Icon name="close" size={13} />
          </button>
        ) : null}
      </div>

      <div className="set-media-field__foot">
        <label className="btn btn--sm" style={{ cursor: canManage && !busy ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.55 }}>
          {busy ? <span className="spinner" /> : <Icon name="upload" size={14} />}
          {uploadLabel}
          <input type="file" accept="image/*" hidden disabled={!canManage || busy} onChange={pick} />
        </label>
        <span className="set-media-field__hint">{hint}</span>
      </div>

      {confirm ? (
        <ConfirmDialog
          title={removeTitle}
          message={removeMessage}
          confirmLabel={t('menu_remove_image')}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            onChange(null);
            setConfirm(false);
          }}
        />
      ) : null}
    </div>
  );
}

export default function LogoCoverTab({ draft, setVal, canManage }) {
  const { t } = useI18n();
  return (
    <SettingsCard
      icon="image"
      tone="amber"
      title={t('settings_branding_title')}
      subtitle={t('settings_branding_hint')}
    >
      <div className="set-media-grid">
        {/* Cover first: it is the wider cell on the physical right in RTL. */}
        <MediaField
          label={t('settings_cover')}
          hint={t('settings_cover_hint')}
          uploadLabel={t('settings_upload_cover')}
          value={draft.cover_url}
          onChange={(value) => setVal('cover_url', value)}
          canManage={canManage}
          shape="cover"
          removeTitle={t('settings_remove_cover_title')}
          removeMessage={t('settings_remove_cover_message')}
        />
        <MediaField
          label={t('settings_logo')}
          hint={t('settings_logo_hint')}
          uploadLabel={t('action_upload')}
          value={draft.logo_url}
          onChange={(value) => setVal('logo_url', value)}
          canManage={canManage}
          shape="logo"
          removeTitle={t('settings_remove_logo_title')}
          removeMessage={t('settings_remove_logo_message')}
        />
      </div>
    </SettingsCard>
  );
}
