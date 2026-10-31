import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/*
 * The one quantity stepper of the customer menu: a raised plus, the bold count
 * and a neutral minus.
 *
 * It never owns state — every surface (product card, product sheet) renders it
 * with the same cart quantity and the same handlers, so the card, the sheet, the
 * cart badge and the cart sheet can never disagree. Reaching zero is the cart's
 * decision (`onDecrease` removes the line), never a negative count here.
 *
 * The plus sits at the inline-start edge and the minus at the inline-end, so the
 * control mirrors with the text direction exactly like the rest of the menu.
 */
export default function ProductQuantityControl({
  quantity,
  onIncrease,
  onDecrease,
  size = 'md',
  disabled = false,
  className = '',
}) {
  const { t, locale } = useI18n();
  const value = Number(quantity) || 0;
  const count = fmtNumber(value, locale);

  return (
    <div
      className={`cui-qc ${size === 'lg' ? 'cui-qc--lg' : ''} ${className}`.trim()}
      role="group"
      aria-label={t('customer_menu_quantity')}
    >
      <button
        type="button"
        className="cui-qc__btn cui-qc__btn--plus"
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) onIncrease?.();
        }}
        disabled={disabled}
        aria-label={t('customer_menu_qty_increase')}
        title={t('customer_menu_qty_increase')}
      >
        <Icon name="plus" size={size === 'lg' ? 19 : 17} />
      </button>

      <span className="cui-qc__value" aria-live="polite">
        {count}
      </span>

      <button
        type="button"
        className="cui-qc__btn cui-qc__btn--minus"
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) onDecrease?.();
        }}
        disabled={disabled}
        aria-label={t('customer_menu_qty_decrease')}
        title={t('customer_menu_qty_decrease')}
      >
        <Icon name="minus" size={size === 'lg' ? 19 : 17} />
      </button>
    </div>
  );
}
