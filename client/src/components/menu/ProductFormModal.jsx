import { useState } from 'react';
import Icon from '../Icon';
import { Alert, Field, Modal, Select, Switch, useToast } from '../ui';
import { useI18n, LOCALES, localized } from '../../i18n';
import { uploadImage } from '../../api';
import { catalogErrorText } from './errorText';

/*
 * Image upload + preview. The preview keeps the whole image and its natural
 * aspect ratio — the frame adapts to the picture instead of reserving a large
 * empty box. Storage goes through the app's existing media endpoint.
 */
function ImagePicker({ value, onChange, label, hint }) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async (file) => {
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      toast.error(err.message === 'IMAGE_TOO_LARGE' ? t('error_image_too_large') : t('error_invalid_image'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {value ? (
        <div className="image-preview image-preview--contain">
          <img src={value} alt="" />
        </div>
      ) : null}
      <div className="btn-row">
        <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
          {busy ? <span className="spinner" /> : <Icon name="upload" size={15} />}
          {t('menu_upload_image')}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) pick(file);
            }}
          />
        </label>
        {value ? (
          <button type="button" className="btn btn--sm" onClick={() => onChange(null)}>
            <Icon name="trash" size={15} />
            {t('menu_remove_image')}
          </button>
        ) : null}
      </div>
      <span className="field__hint">{hint}</span>
    </div>
  );
}

/*
 * Create / edit product. A category is required — when one is selected in the
 * management screen it arrives pre-picked. Product status stays independent of
 * the category: `active` and `available` are the product's own stored flags.
 */
export default function ProductFormModal({ modal, categories, busy, error, onClose, onSave }) {
  const { t, locale } = useI18n();
  const [values, setValues] = useState({
    ku: modal.values.name_ku || '',
    fa: modal.values.name_fa || '',
    ar: modal.values.name_ar || '',
    en: modal.values.name_en || '',
    desc_ku: modal.values.description_ku || '',
    desc_fa: modal.values.description_fa || '',
    desc_ar: modal.values.description_ar || '',
    desc_en: modal.values.description_en || '',
    price: modal.values.price ?? '',
    category_id: modal.values.category_id || '',
    image_url: modal.values.image_url || null,
    active: modal.values.active !== false,
    available: modal.values.available !== false,
    sort_order: modal.values.sort_order ?? 0,
  });
  const [localError, setLocalError] = useState(null);

  const submit = () => {
    const named = LOCALES.some((l) => String(values[l.code] || '').trim() !== '');
    if (!named) {
      setLocalError('NAME_REQUIRED');
      return;
    }
    const price = Number(values.price);
    if (String(values.price).trim() === '' || !Number.isFinite(price) || price < 0) {
      setLocalError('INVALID_PRICE');
      return;
    }
    if (!values.category_id) {
      setLocalError('CATEGORY_NOT_FOUND');
      return;
    }
    setLocalError(null);
    onSave(
      {
        name_ku: values.ku, name_fa: values.fa, name_ar: values.ar, name_en: values.en,
        description_ku: values.desc_ku, description_fa: values.desc_fa,
        description_ar: values.desc_ar, description_en: values.desc_en,
        price,
        category_id: values.category_id,
        image_url: values.image_url,
        active: values.active,
        available: values.available,
        sort_order: Number(values.sort_order) || 0,
      },
      modal.id,
    );
  };

  return (
    <Modal
      title={modal.mode === 'edit' ? t('menu_edit_product') : t('menu_create_product')}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
      }
    >
      {error || localError ? (
        <div style={{ marginBottom: 14 }}>
          <Alert kind="error">{catalogErrorText(error || localError, t)}</Alert>
        </div>
      ) : null}

      <div className="form-grid">
        {LOCALES.map((l) => (
          <Field key={l.code} label={`${t('menu_product_name')} · ${l.label}`}>
            <input
              className="input"
              dir={l.rtl ? 'rtl' : 'ltr'}
              value={values[l.code] || ''}
              onChange={(e) => setValues((s) => ({ ...s, [l.code]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        {LOCALES.map((l) => (
          <Field key={l.code} label={`${t('menu_product_description')} · ${l.label}`}>
            <textarea
              className="textarea"
              dir={l.rtl ? 'rtl' : 'ltr'}
              value={values[`desc_${l.code}`] || ''}
              onChange={(e) => setValues((s) => ({ ...s, [`desc_${l.code}`]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label={t('menu_product_price')}>
          <input
            className="input"
            type="number"
            min="0"
            step="250"
            value={values.price}
            onChange={(e) => setValues((s) => ({ ...s, price: e.target.value }))}
          />
        </Field>
        <Field label={t('menu_product_category')}>
          <Select
            value={values.category_id}
            onChange={(v) => setValues((s) => ({ ...s, category_id: v }))}
            placeholder={t('menu_select_category')}
            options={categories.map((c) => ({
              value: c.id,
              label: localized(c, 'name', locale) || c.name_en || c.name_ku,
            }))}
          />
        </Field>
        <Field label={t('label_sort_order')}>
          <input
            className="input"
            type="number"
            value={values.sort_order}
            onChange={(e) => setValues((s) => ({ ...s, sort_order: Number(e.target.value) }))}
          />
        </Field>
      </div>

      <div style={{ marginTop: 14 }}>
        <ImagePicker
          label={t('menu_product_image')}
          hint={t('menu_image_hint')}
          value={values.image_url}
          onChange={(url) => setValues((s) => ({ ...s, image_url: url }))}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="switch-row">
          <div className="switch-row__text">
            <div className="switch-row__title">{t('menu_product_active')}</div>
          </div>
          <Switch
            checked={values.active}
            onChange={(v) => setValues((s) => ({ ...s, active: v }))}
            ariaLabel={t('menu_product_active')}
          />
        </div>
        <div className="switch-row">
          <div className="switch-row__text">
            <div className="switch-row__title">{t('menu_product_available')}</div>
          </div>
          <Switch
            checked={values.available}
            onChange={(v) => setValues((s) => ({ ...s, available: v }))}
            ariaLabel={t('menu_product_available')}
          />
        </div>
      </div>
    </Modal>
  );
}
