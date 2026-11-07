import { Money, StatusBadge } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDate, fmtDigits, fmtTime } from '../../format';
import StatusMenu from './StatusMenu';
import OrderTableLabel from './OrderTableLabel';

/*
 * Seven-column orders table, laid out right-to-left exactly as the reference:
 * order number, date/time, customer, table, status, amount, actions. The
 * columns stay in this DOM order in every language — the writing direction
 * decides which side of the table it starts from.
 *
 * The whole row is the control that opens the order: no separate view button,
 * no horizontal scroll container. Clicking anywhere on the row opens the same
 * details modal, Enter and Space do it from the keyboard, and the actions cell
 * stops both events so changing a status never opens the order underneath it.
 */
export default function OrdersTable({ orders, currency, timeZone, busyId, onView, onStatusChange }) {
  const { t, locale } = useI18n();

  const open = (order) => onView?.(order.id);
  const openOnKey = (event, order) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    open(order);
  };
  /* A status change belongs to the dropdown, never to the row behind it. */
  const keepActions = (event) => event.stopPropagation();
  const keepActionKeys = (event) => {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  };

  return (
    <table className="otable">
      <thead>
        <tr>
          <th>{t('order_number')}</th>
          <th>{t('order_datetime')}</th>
          <th>{t('label_customer')}</th>
          <th>{t('label_table')}</th>
          <th>{t('label_status')}</th>
          <th className="otable__amount">{t('order_grand_total')}</th>
          <th className="otable__actions-head">{t('label_actions')}</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr
            key={order.id}
            className="otable__row"
            tabIndex={0}
            aria-label={`${t('action_view')} #${fmtDigits(order.order_number, locale)}`}
            onClick={() => open(order)}
            onKeyDown={(event) => openOnKey(event, order)}
          >
            <td className="otable__no">#{fmtDigits(order.order_number, locale)}</td>
            <td className="otable__when">
              <span>{fmtDate(order.created_at, locale, timeZone, { short: true })}</span>
              <span>{fmtTime(order.created_at, locale, timeZone)}</span>
            </td>
            <td className="otable__customer">{order.customer_name || '—'}</td>
            <td>
              <OrderTableLabel name={order.table_name} source={order.table_source} />
            </td>
            <td>
              <StatusBadge status={order.status} />
            </td>
            <td className="otable__amount">
              <Money value={order.total} currency={currency} />
            </td>
            <td className="otable__actions" onClick={keepActions} onKeyDown={keepActionKeys}>
              <div className="orow-actions">
                <StatusMenu
                  order={order}
                  busy={busyId === order.id}
                  onSelect={(status) => onStatusChange(order, status)}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
