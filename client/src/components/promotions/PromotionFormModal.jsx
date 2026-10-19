import { useState } from 'react';
import Icon from '../Icon';
import { Field, Modal, Select, Switch } from '../ui';
import { localized, useI18n } from '../../i18n';

/*
 * Create / edit one promotion. The form only sends the fields the promotions
 * module supports; prices, validity and the redemption limit are all validated
 * again on the server.
 */
export default function PromotionFormModal({ modal, products, busy, onClose, onSave }) {
  const { t, locale } = useI18n();
  const [values, setValues] = useState({
    product_id: modal.values.product_id || '',
    discount_type: modal.values.discount_type || 'percent',
    discount_value: modal.values.discount_value ?? 10,
    starts_at: modal.values.starts_at || '',
    ends_at: modal.values.ends_at || '',
    max_uses: modal.values.max_uses ?? '',
    active: modal.values.active !== false,
    title_en: modal.values.title_en || '',
    title_ku: modal.values.title_ku || '',
    title_fa: modal.values.title_fa || '',
    title_ar: modal.values.title_ar || '',
  });

  const set = (key, value) => setValues((state) => ({ ...state, [key]: value }));

  return (
    <Modal
      title={modal.id ? t('marketing_edit_promotion') : t('disc_add')}
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
        <Field label={t('marketing_promotion_product')}>
          <Select
            value={values.product_id}
            onChange={(v) => set('product_id', v)}
            options={products.map((p) => ({ value: p.id, label: localized(p, 'name', locale) }))}
          />
        </Field>
        <Field label={t('marketing_promotion_type')}>
          <Select
            value={values.discount_type}
            onChange={(v) => set('discount_type', v)}
            options={[
              { value: 'percent', label: t('marketing_discount_percent') },
              { value: 'fixed', label: t('marketing_discount_fixed') },
            ]}
          />
        </Field>
        <Field label={t('marketing_discount_value')}>
          <input
            className="input"
            type="number"
            min="0"
            value={values.discount_value}
            onChange={(e) => set('discount_value', e.target.value)}
          />
        </Field>
        <Field label={t('disc_max_uses')} hint={t('disc_max_uses_hint')}>
          <input
            className="input"
            type="number"
            min="1"
            placeholder={t('disc_unlimited')}
            value={values.max_uses}
            onChange={(e) => set('max_uses', e.target.value)}
          />
        </Field>
        <Field label={t('marketing_starts_at')}>
          <input className="input" type="date" value={values.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
        </Field>
        <Field label={t('marketing_ends_at')}>
          <input className="input" type="date" value={values.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
        </Field>
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        {['en', 'ku', 'fa', 'ar'].map((code) => (
          <Field key={code} label={`${t('label_name')} · ${code.toUpperCase()}`}>
            <input
              className="input"
              dir={code === 'en' ? 'ltr' : 'rtl'}
              value={values[`title_${code}`]}
              onChange={(e) => set(`title_${code}`, e.target.value)}
            />
          </Field>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Switch
          checked={values.active}
          onChange={(v) => set('active', v)}
          label={t('label_active')}
          ariaLabel={t('label_active')}
        />
      </div>
    </Modal>
  );
}
