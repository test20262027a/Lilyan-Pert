import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { Alert, Select } from '../ui';
import { localized, useI18n } from '../../i18n';
import { promotionsErrorText } from './errorText';
import { PromotionModalArtwork } from './PromotionsArtwork';

const BLANK = {
  code: '',
  discount_type: 'percent',
  discount_value: 10,
  target_type: 'order',
  product_id: '',
  category_id: '',
  min_order: 0,
  max_uses: 100,
  starts_at: '',
  ends_at: '',
  active: true,
};

/*
 * Create / edit one promotion, in the order the design asks for: code, type and
 * value, minimum order and maximum uses, the validity window, the active switch
 * and the discount target.
 *
 * The modal only collects values — every rule (unique code, value range, date
 * order, target membership) is validated again on the server, which also
 * recalculates the discount at checkout.
 */
export default function PromotionFormModal({ modal, products, categories, busy, error, onClose, onSave }) {
  const { t, locale } = useI18n();
  const [values, setValues] = useState(() => ({ ...BLANK, ...modal.values }));
  const [localError, setLocalError] = useState(null);

  const set = (key, value) => setValues((state) => ({ ...state, [key]: value }));

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const submit = () => {
    if (!String(values.code).trim()) {
      setLocalError('CODE_REQUIRED');
      return;
    }
    if (values.target_type === 'product' && !values.product_id) {
      setLocalError('INVALID_PRODUCT');
      return;
    }
    if (values.target_type === 'category' && !values.category_id) {
      setLocalError('INVALID_CATEGORY');
      return;
    }
    setLocalError(null);
    onSave({ ...values, code: String(values.code).trim() }, modal.id);
  };

  const shownError = localError || error;

  return (
    <div
      className="promo-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="promo-modal"
        role="dialog"
        aria-modal="true"
        aria-label={modal.id ? t('marketing_edit_promotion') : t('disc_add')}
      >
        <header className="promo-modal__head">
          <div className="promo-modal__titlewrap">
            <span className="promo-modal__icon" aria-hidden="true">
              <Icon name="tag" size={22} />
            </span>
            <h2 className="promo-modal__title">
              {modal.id ? t('marketing_edit_promotion') : t('disc_add')}
            </h2>
          </div>
          <div className="promo-modal__art-wrap" aria-hidden="true">
            <PromotionModalArtwork />
          </div>
          <button
            type="button"
            className="promo-modal__close"
            onClick={onClose}
            aria-label={t('action_close')}
            title={t('action_close')}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="promo-modal__body">
          {/* 1 — discount code */}
          <label className="promo-field">
            <span className="promo-label promo-label--marked">
              {t('disc_code')}
              <i className="promo-req" aria-hidden="true">*</i>
            </span>
            <input
              className="promo-input"
              dir="ltr"
              value={values.code}
              maxLength={40}
              placeholder="SUMMER20"
              onChange={(event) => set('code', event.target.value)}
              autoFocus
            />
          </label>

          {/* 2 — type + value */}
          <div className="promo-row">
            <label className="promo-field">
              <span className="promo-label">{t('marketing_promotion_type')}</span>
              <Select
                value={values.discount_type}
                onChange={(next) => set('discount_type', next)}
                aria-label={t('marketing_promotion_type')}
                options={[
                  { value: 'percent', label: t('marketing_discount_percent') },
                  { value: 'fixed', label: t('marketing_discount_fixed') },
                ]}
              />
            </label>
            <label className="promo-field">
              <span className="promo-label">
                {t('disc_value')}
                <i className="promo-req" aria-hidden="true">*</i>
              </span>
              <input
                className="promo-input"
                type="number"
                min="0"
                step="0.01"
                value={values.discount_value}
                onChange={(event) => set('discount_value', event.target.value)}
              />
            </label>
          </div>

          {/* 3 — minimum order + maximum uses */}
          <div className="promo-row">
            <label className="promo-field">
              <span className="promo-label">{t('disc_min_order')}</span>
              <input
                className="promo-input"
                type="number"
                min="0"
                step="1"
                value={values.min_order}
                onChange={(event) => set('min_order', event.target.value)}
              />
            </label>
            <label className="promo-field">
              <span className="promo-label">{t('disc_max_uses')}</span>
              <input
                className="promo-input"
                type="number"
                min="1"
                step="1"
                placeholder={t('disc_unlimited')}
                value={values.max_uses ?? ''}
                onChange={(event) => set('max_uses', event.target.value)}
              />
            </label>
          </div>

          {/* 4 — validity window */}
          <div className="promo-row">
            <label className="promo-field">
              <span className="promo-label">{t('disc_starts_at')}</span>
              <span className="promo-date">
                <input
                  className="promo-input"
                  type="date"
                  value={values.starts_at || ''}
                  onChange={(event) => set('starts_at', event.target.value)}
                />
                <Icon name="calendar" size={16} />
              </span>
            </label>
            <label className="promo-field">
              <span className="promo-label">{t('disc_ends_at')}</span>
              <span className="promo-date">
                <input
                  className="promo-input"
                  type="date"
                  value={values.ends_at || ''}
                  onChange={(event) => set('ends_at', event.target.value)}
                />
                <Icon name="calendar" size={16} />
              </span>
            </label>
          </div>

          {/* 5 — active switch */}
          <label className="promo-switch-row">
            <span className="promo-switch-row__label">{t('label_active')}</span>
            <span className="switch">
              <input
                type="checkbox"
                checked={values.active !== false}
                onChange={(event) => set('active', event.target.checked)}
                aria-label={t('label_active')}
              />
              <span className="switch__track" />
            </span>
          </label>

          {/* 6 — discount target */}
          <label className="promo-field">
            <span className="promo-label promo-label--marked">{t('disc_target')}</span>
            <Select
              value={values.target_type}
              onChange={(next) => set('target_type', next)}
              aria-label={t('disc_target')}
              options={[
                { value: 'order', label: t('disc_target_order') },
                { value: 'category', label: t('disc_target_category') },
                { value: 'product', label: t('disc_target_product') },
              ]}
            />
          </label>

          {values.target_type === 'category' ? (
            <label className="promo-field">
              <span className="promo-label">{t('disc_choose_category')}</span>
              <Select
                value={values.category_id || ''}
                onChange={(next) => set('category_id', next)}
                aria-label={t('disc_choose_category')}
                options={[
                  { value: '', label: '—' },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: localized(category, 'name', locale),
                  })),
                ]}
              />
            </label>
          ) : null}

          {values.target_type === 'product' ? (
            <label className="promo-field">
              <span className="promo-label">{t('disc_choose_product')}</span>
              <Select
                value={values.product_id || ''}
                onChange={(next) => set('product_id', next)}
                aria-label={t('disc_choose_product')}
                options={[
                  { value: '', label: '—' },
                  ...products.map((product) => ({
                    value: product.id,
                    label: localized(product, 'name', locale),
                  })),
                ]}
              />
            </label>
          ) : null}

          {shownError ? <Alert kind="error">{promotionsErrorText(shownError, t)}</Alert> : null}
        </div>

        <footer className="promo-modal__foot">
          <button type="button" className="promo-save" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : null}
            {t('action_save')}
          </button>
          <button type="button" className="promo-cancel" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
        </footer>
      </div>
    </div>
  );
}
