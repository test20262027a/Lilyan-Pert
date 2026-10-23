import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { Money, StatusBadge } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDate, fmtTime } from '../../format';
import StatusMenu from './StatusMenu';
import OrderTableLabel from './OrderTableLabel';

/*
 * Seven-column orders table, laid out right-to-left exactly as the reference:
 * order number, date/time, customer, table, status, amount, actions. The
 * columns stay in this DOM order in every language — the writing direction
 * decides which side of the table it starts from.
 *
 * The scroll wrapper keeps a narrow tablet usable without ever overflowing the
 * page; the row status menu is positioned fixed, so it is never clipped here.
 */
export default function OrdersTable({ orders, currency, timeZone, busyId, linkState, onStatusChange }) {
  const { t, locale } = useI18n();

  return (
    <div className="otable-scroll">
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
            <tr key={order.id}>
              <td className="otable__no">#{order.order_number}</td>
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
              <td className="otable__actions">
                <Link
                  className="orow-btn"
                  to={`/orders/${order.id}`}
                  state={linkState}
                  aria-label={`${t('action_view')} #${order.order_number}`}
                  title={t('action_view')}
                >
                  <Icon name="eye" size={15} />
                </Link>
                <StatusMenu
                  order={order}
                  busy={busyId === order.id}
                  onSelect={(status) => onStatusChange(order, status)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
