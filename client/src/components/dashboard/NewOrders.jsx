import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { EmptyState, SectionCard, StatusBadge } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDateTime, fmtMoney, fmtNumber } from '../../format';

/**
 * The newest orders for this business. Rows are keyed by order id, so a poll
 * that returns the same order twice can never duplicate it, and every row
 * opens the real order detail page where the permitted actions live.
 */
export default function NewOrders({ orders = [], currency, locale, timeZone }) {
  const { t } = useI18n();

  return (
    <SectionCard
      icon="receipt"
      iconClass="ic-blue"
      title={t('dash_new_orders')}
      actions={
        <Link className="btn btn--sm" to="/orders">
          <Icon name="arrowRight" size={14} />
          {t('action_view')}
        </Link>
      }
    >
      {orders.length === 0 ? (
        <EmptyState icon="receipt" title={t('dash_no_data')} />
      ) : (
        <div className="new-orders">
          {orders.map((o) => (
            <Link className="new-order" to={`/orders/${o.id}`} key={o.id}>
              <span className="new-order__no">#{o.order_number}</span>
              <span className="new-order__meta">
                <Icon name="table" size={13} />
                {o.table_name || o.customer_name || '—'}
              </span>
              <span className="new-order__meta">{fmtDateTime(o.created_at, locale, timeZone)}</span>
              <span className="new-order__meta">
                {fmtNumber(o.item_count || 0, locale)} {t('dash_items')}
              </span>
              <StatusBadge status={o.status} />
              <strong className="new-order__total">{fmtMoney(o.total, currency, locale)}</strong>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
