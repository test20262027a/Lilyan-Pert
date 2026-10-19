import { useState } from 'react';
import Icon from '../Icon';
import { Field, Modal, Switch, useToast } from '../ui';
import { useI18n } from '../../i18n';
import { uploadImage } from '../../api';

/*
 * Create / edit one advertisement: the four localized title and subtitle pairs,
 * the picture, the optional link and the active flag. The picture is uploaded
 * through the media endpoint first, so the record only ever stores a stored URL.
 */
export default function AdFormModal({ modal, busy, onClose, onSave }) {
  const { t } = useI18n();
  const toast = useToast();
  const [values, setValues] = useState({
    title_ku: modal.values.title_ku || '',
    title_fa: modal.values.title_fa || '',
    title_ar: modal.values.title_ar || '',
    title_en: modal.values.title_en || '',
    subtitle_ku: modal.values.subtitle_ku || '',
    subtitle_fa: modal.values.subtitle_fa || '',
    subtitle_ar: modal.values.subtitle_ar || '',
    subtitle_en: modal.values.subtitle_en || '',
    image_url: modal.values.image_url || null,
    link_url: modal.values.link_url || '',
    active: modal.values.active !== false,
  });

  const set = (key, value) => setValues((state) => ({ ...state, [key]: value }));

  return (
    <Modal
      title={modal.id ? t('marketing_edit_ad') : t('marketing_create_ad')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={() => onSave(values, modal.id)} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
      }
    >
      <div className="form-grid">
        {['en', 'ku', 'fa', 'ar'].map((code) => (
          <Field key={code} label={`${t('marketing_ad_title')} · ${code.toUpperCase()}`}>
            <input
              className="input"
              dir={code === 'en' ? 'ltr' : 'rtl'}
              value={values[`title_${code}`]}
              onChange={(e) => set(`title_${code}`, e.target.value)}
            />
          </Field>
        ))}
        {['en', 'ku', 'fa', 'ar'].map((code) => (
          <Field key={`sub-${code}`} label={`${t('marketing_ad_subtitle')} · ${code.toUpperCase()}`}>
            <input
              className="input"
              dir={code === 'en' ? 'ltr' : 'rtl'}
              value={values[`subtitle_${code}`]}
              onChange={(e) => set(`subtitle_${code}`, e.target.value)}
            />
          </Field>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="field">
          <span className="field__label">{t('marketing_ad_image')}</span>
          {values.image_url ? (
            <div className="image-preview image-preview--contain">
              <img src={values.image_url} alt="" />
            </div>
          ) : null}
          <div className="btn-row">
            <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
              <Icon name="upload" size={15} />
              {t('menu_upload_image')}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    set('image_url', await uploadImage(file));
                  } catch {
                    toast.error(t('error_invalid_image'));
                  }
                }}
              />
            </label>
            {values.image_url ? (
              <button className="btn btn--sm" onClick={() => set('image_url', null)}>
                <Icon name="trash" size={15} />
                {t('menu_remove_image')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label={t('marketing_ad_link')}>
          <input
            className="input"
            dir="ltr"
            value={values.link_url}
            onChange={(e) => set('link_url', e.target.value)}
          />
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
          <Switch
            checked={values.active}
            onChange={(v) => set('active', v)}
            label={t('label_active')}
            ariaLabel={t('label_active')}
          />
        </div>
      </div>
    </Modal>
  );
}
