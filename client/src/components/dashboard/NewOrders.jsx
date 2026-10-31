import { SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import OrdersTable from './OrdersTable';

/**
 * The newest orders still in the kitchen pipeline for this business. Rows are
 * keyed by order id, so a poll that returns the same order twice can never
 * duplicate it, and every row opens the real order detail page where the
 * permitted actions live. There is no extra "view" button here: the section
 * already lists the orders themselves.
 */
export default function NewOrders({
  orders = [],
  currency,
  locale,
  timeZone,
  failed = false,
  onRetry,
  onOpenOrder,
}) {
  const { t } = useI18n();

  return (
    <SectionCard icon="receipt" iconTone="orange" title={t('dash_new_orders')}>
      <OrdersTable
        orders={orders}
        currency={currency}
        locale={locale}
        timeZone={timeZone}
        failed={failed}
        onRetry={onRetry}
        onOpenOrder={onOpenOrder}
      />
    </SectionCard>
  );
}
