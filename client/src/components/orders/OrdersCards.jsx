import { Money, StatusBadge } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDate, fmtDigits, fmtTime } from '../../format';
import StatusMenu from './StatusMenu';
import OrderTableLabel from './OrderTableLabel';

/*
 * Phone layout: the same order kept as a compact card — number, date/time,
 * table, customer, amount, status and the status action — because seven
 * columns cannot stay readable on a small screen. No information is dropped.
 *
 * The whole card opens the order, exactly like a table row: a tap anywhere on
 * it, or Enter / Space from the keyboard. The status control stops those
 * events, so changing a status never opens the order underneath it.
 */
export default function OrdersCards({ orders, currency, timeZone, busyId, onView, onStatusChange }) {
  const { t, locale } = useI18n();

  const open = (order) => onView?.(order.id);
  const openOnKey = (event, order) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    open(order);
  };
  const keepActions = (event) => event.stopPropagation();
  const keepActionKeys = (event) => {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  };

  return (
    <>
      {orders.map((order) => (
        <article
          className="ocard"
          key={order.id}
          tabIndex={0}
          aria-label={`${t('action_view')} #${fmtDigits(order.order_number, locale)}`}
          onClick={() => open(order)}
          onKeyDown={(event) => openOnKey(event, order)}
        >
          <div className="ocard__top">
            <span className="ocard__no">#{fmtDigits(order.order_number, locale)}</span>
            <StatusBadge status={order.status} />
            <span className="ocard__amount">
              <Money value={order.total} currency={currency} />
            </span>
          </div>

          <div className="ocard__meta">
            <span>{fmtDate(order.created_at, locale, timeZone, { short: true })}</span>
            <span>{fmtTime(order.created_at, locale, timeZone)}</span>
            <OrderTableLabel name={order.table_name} source={order.table_source} />
            <span>{order.customer_name || '—'}</span>
          </div>

          <div className="ocard__foot" onClick={keepActions} onKeyDown={keepActionKeys}>
            <div className="orow-actions">
              <StatusMenu
                order={order}
                busy={busyId === order.id}
                onSelect={(status) => onStatusChange(order, status)}
              />
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
