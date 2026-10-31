import { SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import DashIcon from './DashIcon';
import OrdersTable from './OrdersTable';
import RecentOrdersFilter, { statusTone } from './RecentOrdersFilter';

/**
 * The dashboard's newest orders. The status filter in the header is a real
 * server-side filter over the business's whole order history, so picking
 * "completed" finds an older completed order even when the six most recent
 * rows are all still pending. Rows stay keyed by order id and every row opens
 * the same order detail modal, so the section's management actions are intact.
 */
export default function NewOrders({
  orders = [],
  status = 'all',
  onStatusChange,
  counts,
  currency,
  locale,
  timeZone,
  failed = false,
  onRetry,
  onOpenOrder,
}) {
  const { t } = useI18n();

  /* Only a narrowed list can be empty because of the filter; an unfiltered
     section keeps its original "no data" row. */
  const filtered = status !== 'all';
  const empty = filtered ? (
    <div className="orders-empty">
      <DashIcon name="filter" tone={statusTone(status)} size={34} shape="circle" />
      <span className="orders-empty__title">
        {t('dash_orders_none_status', { status: t(`status_${status}`) })}
      </span>
      <span className="orders-empty__hint">{t('dash_orders_none_hint')}</span>
    </div>
  ) : null;

  return (
    <SectionCard
      className="recent-orders"
      icon="receipt"
      iconTone="orange"
      title={t('dash_new_orders')}
      actions={<RecentOrdersFilter value={status} onChange={onStatusChange} counts={counts} />}
    >
      <OrdersTable
        orders={orders}
        currency={currency}
        locale={locale}
        timeZone={timeZone}
        failed={failed}
        onRetry={onRetry}
        onOpenOrder={onOpenOrder}
        empty={empty}
      />
    </SectionCard>
  );
}
