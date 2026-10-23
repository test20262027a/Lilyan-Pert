import { useEffect, useMemo, useState } from 'react';
import Icon from '../../Icon';
import { Money, Select } from '../../ui';
import { useI18n } from '../../../i18n';
import { fmtMoneyParts } from '../../../format';

const round2 = (n) => Math.round(n * 100) / 100;

/*
 * The administrator's own discount on an order.
 *
 * This card only ever names the type and the number that was typed — the
 * amount, the tax, the service fee and the total are recalculated by the
 * server from the order's saved subtotal and currency. Everything shown here
 * before "Apply discount" is a clearly marked preview, never a saved value.
 *
 * A coupon the guest really redeemed is authoritative: the card stays visible
 * so the reason is obvious, but every control is locked.
 */
export default function ManualDiscountCard({
  order,
  business,
  currency,
  canEdit,
  busy,
  onApply,
  onRemove,
  onDirtyChange,
}) {
  const { t, locale } = useI18n();
  const subtotal = Number(order?.subtotal) || 0;
  const savedAmount = Number(order?.manual_discount_amount) || 0;
  const hasCoupon = Boolean(order?.promotion_code);
  const closed = order?.status === 'completed' || order?.status === 'cancelled';

  const [type, setType] = useState(order?.manual_discount_type || 'fixed');
  const [value, setValue] = useState('');

  const disabled = hasCoupon || closed || !canEdit || busy;
  const unit = useMemo(() => fmtMoneyParts(0, currency, locale).symbol, [currency, locale]);
  const typed = String(value).trim();
  const numeric = Number(typed);
  const hasInput = typed !== '';

  const discountAmount = useMemo(() => {
    if (!hasInput || !Number.isFinite(numeric) || numeric <= 0) return 0;
    if (type === 'percent') return round2((subtotal * Math.min(100, numeric)) / 100);
    return round2(Math.min(subtotal, numeric));
  }, [hasInput, numeric, type, subtotal]);

  const error = (() => {
    if (!hasInput) return null;
    if (!Number.isFinite(numeric) || numeric <= 0) return t('od_discount_invalid');
    if (type === 'percent' && numeric > 100) return t('od_discount_max_percent');
    if (type === 'fixed' && numeric > subtotal) return t('od_discount_too_large');
    return null;
  })();

  const updatedTotal = useMemo(() => {
    const taxable = round2(Math.max(0, subtotal - discountAmount));
    const tax = round2((taxable * Number(business?.tax_rate || 0)) / 100);
    const service = round2((taxable * Number(business?.service_charge_rate || 0)) / 100);
    return round2(taxable + tax + service);
  }, [subtotal, discountAmount, business]);

  /* An unapplied number is unsaved work: the modal asks before it closes. */
  useEffect(() => {
    onDirtyChange?.(hasInput && discountAmount !== savedAmount);
  }, [hasInput, discountAmount, savedAmount, onDirtyChange]);

  const reason = hasCoupon
    ? t('od_coupon_lock')
    : closed
      ? t('od_locked_discount')
      : !canEdit
        ? t('od_no_permission')
        : null;

  const apply = () => {
    if (disabled || error || discountAmount <= 0) return;
    onApply({ type, value: numeric });
  };

  const remove = () => {
    if (disabled) return;
    onRemove();
  };

  return (
    <section className={`odm-card odm-disc ${disabled ? 'is-locked' : ''}`}>
      <header className="odm-card__head">
        <span className="odm-card__icon">
          <Icon name="tag" size={16} />
        </span>
        <h3 className="odm-card__title">{t('od_manual_discount')}</h3>
        {hasCoupon ? (
          <span className="odm-disc__lock" title={t('od_coupon_lock')}>
            <Icon name="lock" size={14} />
          </span>
        ) : null}
      </header>

      <p className={`odm-disc__hint ${reason ? 'is-warning' : ''}`}>
        {reason ? <Icon name="info" size={13} /> : null}
        {reason || t('od_discount_hint')}
      </p>

      {savedAmount > 0 ? (
        <div className="odm-disc__saved">
          <span className="odm-disc__saved-label">{t('od_current_discount')}</span>
          <strong className="odm-disc__saved-amount">
            −<Money value={savedAmount} currency={currency} />
          </strong>
          <button type="button" className="odm-disc__remove" onClick={remove} disabled={disabled}>
            <Icon name="trash" size={13} />
            {t('od_remove_discount')}
          </button>
        </div>
      ) : null}

      <div className="odm-disc__controls">
        <label className="odm-disc__field">
          <span className="odm-disc__label">{t('od_discount_value')}</span>
          <span className="odm-disc__input">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled}
              placeholder="0"
              aria-label={t('od_discount_value')}
            />
            <span className="odm-disc__unit">{type === 'percent' ? '%' : unit}</span>
          </span>
        </label>
        <div className="odm-disc__field">
          <span className="odm-disc__label">{t('od_discount_type')}</span>
          <Select
            value={type}
            onChange={setType}
            disabled={disabled}
            ariaLabel={t('od_discount_type')}
            options={[
              { value: 'fixed', label: t('od_fixed') },
              { value: 'percent', label: t('od_percent') },
            ]}
          />
        </div>
      </div>

      {!disabled && hasInput && discountAmount > 0 && !error ? (
        <div className="odm-disc__preview">
          <div className="odm-disc__preview-head">
            <Icon name="eye" size={13} />
            {t('od_preview')}
          </div>
          <div className="odm-disc__row">
            <span>{t('od_eligible')}</span>
            <Money value={subtotal} currency={currency} />
          </div>
          <div className="odm-disc__row">
            <span>{t('od_proposed')}</span>
            <span className="odm-disc__minus">
              −<Money value={discountAmount} currency={currency} />
            </span>
          </div>
          <div className="odm-disc__row odm-disc__row--total">
            <span>{t('od_updated_total')}</span>
            <Money value={updatedTotal} currency={currency} />
          </div>
          <p className="odm-disc__note">{t('od_preview_hint')}</p>
        </div>
      ) : null}

      {error && !disabled ? <p className="odm-disc__error">{error}</p> : null}

      <button
        type="button"
        className="odm-disc__apply"
        onClick={apply}
        disabled={disabled || Boolean(error) || discountAmount <= 0}
      >
        {busy ? <span className="spinner" /> : <Icon name="percent" size={15} />}
        {t('od_apply_discount')}
      </button>
    </section>
  );
}
