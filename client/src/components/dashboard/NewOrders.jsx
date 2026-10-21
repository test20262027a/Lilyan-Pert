import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';
import OrdersTable from './OrdersTable';

/**
 * The newest orders for this business. Rows are keyed by order id, so a poll
 * that returns the same order twice can never duplicate it, and every row
 * opens the real order detail page where the permitted actions live.
 */
export default function NewOrders({
  orders = [],
  total = 0,
  currency,
  locale,
  timeZone,
  failed = false,
  onRetry,
}) {
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
      footer={
        !failed && orders.length > 0 ? (
          <div className="orders-table__foot">
            {t('dash_orders_showing', {
              shown: fmtNumber(orders.length, locale),
              total: fmtNumber(Math.max(total, orders.length), locale),
            })}
          </div>
        ) : null
      }
    >
      <OrdersTable
        orders={orders}
        currency={currency}
        locale={locale}
        timeZone={timeZone}
        failed={failed}
        onRetry={onRetry}
      />
    </SectionCard>
  );
}
