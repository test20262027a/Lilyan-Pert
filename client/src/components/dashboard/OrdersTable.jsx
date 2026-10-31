import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtDate, fmtDigits, fmtMoney, fmtTime } from '../../format';

const COLUMNS = 6;

/*
 * The dashboard's compact six-column order table. It renders only the real
 * rows the API returned for this business — no placeholder orders — and each
 * row opens the same order modal the Orders page uses, so the dashboard never
 * navigates away and never falls back to the old detail page.
 */
export default function OrdersTable({
  orders = [],
  currency,
  locale,
  timeZone,
  failed = false,
  onRetry,
  onOpenOrder,
}) {
  const { t } = useI18n();
  const open = (order) => onOpenOrder?.(order.id);

  return (
    <div className="orders-table__wrap">
      <table className="orders-table">
        <thead>
          <tr>
            <th scope="col" className="orders-table__col-no">{t('order_number')}</th>
            <th scope="col">{t('order_datetime')}</th>
            <th scope="col">{t('label_customer')}</th>
            <th scope="col">{t('label_table')}</th>
            <th scope="col">{t('label_status')}</th>
            <th scope="col">{t('label_total')}</th>
          </tr>
        </thead>
        <tbody>
          {failed ? (
            <tr>
              <td colSpan={COLUMNS} className="orders-table__state">
                <span className="orders-table__state-inner">
                  <Icon name="alert" size={18} style={{ color: 'var(--dashic-amber-ink)' }} />
                  <span>{t('dash_orders_error')}</span>
                  {onRetry ? (
                    <button type="button" className="btn btn--sm" onClick={onRetry}>
                      {t('action_retry')}
                    </button>
                  ) : null}
                </span>
              </td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS} className="orders-table__state">
                <span className="orders-table__state-inner">
                  <Icon name="receipt" size={18} style={{ color: 'var(--dashic-blue-ink)' }} />
                  <span>{t('dash_no_data')}</span>
                </span>
              </td>
            </tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id} className="orders-table__row" onClick={() => open(o)}>
                <td className="orders-table__no">
                  <button
                    type="button"
                    className="orders-table__link"
                    onClick={(e) => {
                      e.stopPropagation();
                      open(o);
                    }}
                  >
                    #{fmtDigits(o.order_number, locale)}
                  </button>
                </td>
                <td className="orders-table__when">
                  <span>{fmtDate(o.created_at, locale, timeZone, { short: true })}</span>
                  <span className="orders-table__time">{fmtTime(o.created_at, locale, timeZone)}</span>
                </td>
                <td className="orders-table__ellipsis" data-label={t('label_customer')}>
                  {o.customer_name?.trim() || '—'}
                </td>
                <td className="orders-table__ellipsis orders-table__table" data-label={t('label_table')}>
                  {o.table_name?.trim() || '—'}
                </td>
                <td>
                  <span className={`orders-table__status orders-table__status--${o.status}`}>
                    {t(`status_${o.status}`)}
                  </span>
                </td>
                <td className="orders-table__total">{fmtMoney(o.total, currency, locale)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
