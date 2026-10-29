import Icon from '../Icon';
import { Money, StatusBadge } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDate, fmtTime } from '../../format';
import StatusMenu from './StatusMenu';
import OrderTableLabel from './OrderTableLabel';

/*
 * Phone layout: the same order kept as a compact card — number, date/time,
 * table, customer, amount, status and both actions — because seven columns
 * cannot stay readable on a small screen. No information is dropped.
 */
export default function OrdersCards({ orders, currency, timeZone, busyId, onView, onStatusChange }) {
  const { t, locale } = useI18n();

  return (
    <>
      {orders.map((order) => (
        <article className="ocard" key={order.id}>
          <div className="ocard__top">
            <span className="ocard__no">#{order.order_number}</span>
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

          {/* Same fixed grid as the table row, so both actions keep their size. */}
          <div className="ocard__foot">
            <div className="orow-actions">
              <button
                type="button"
                className="orow-btn"
                onClick={() => onView?.(order.id)}
                aria-label={`${t('action_view')} #${order.order_number}`}
                title={t('action_view')}
              >
                <Icon name="eye" size={15} />
              </button>
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
