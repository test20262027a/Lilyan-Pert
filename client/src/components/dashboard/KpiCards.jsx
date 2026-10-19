import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtMoney, fmtNumber } from '../../format';

function Kpi({ tone, icon, label, value, hint }) {
  return (
    <article className={`kpi kpi--${tone}`}>
      <span className="kpi__icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {hint ? <span className="kpi__hint" title={hint}>{hint}</span> : null}
    </article>
  );
}

/**
 * Four pastel headline metrics — blue, amber, green, pink, in that order.
 * Every number is aggregated by the dashboard endpoint from stored records.
 */
export default function KpiCards({ data, locale, currency }) {
  const { t } = useI18n();
  const views = data.views || {};
  const revenue = data.revenue || {};

  return (
    <div className="kpi-row">
      <Kpi
        tone="blue"
        icon="eye"
        label={t('dash_views_total')}
        value={fmtNumber(views.total || 0, locale)}
        hint={`${t('dash_views_today')}: ${fmtNumber(views.today || 0, locale)}`}
      />
      <Kpi
        tone="amber"
        icon="receipt"
        label={t('dash_orders_today')}
        value={fmtNumber(revenue.orders_today || 0, locale)}
        hint={`${t('dash_orders_total')}: ${fmtNumber(data.order_flow_total || 0, locale)}`}
      />
      <Kpi
        tone="green"
        icon="wallet"
        label={t('dash_revenue_today')}
        value={fmtMoney(revenue.today, currency, locale)}
        hint={`${t('dash_revenue_month')}: ${fmtMoney(revenue.month, currency, locale)}`}
      />
      <Kpi
        tone="pink"
        icon="chart"
        label={t('dash_avg_order')}
        value={fmtMoney(revenue.avg_order, currency, locale)}
        hint={`${t('dash_revenue_all')}: ${fmtMoney(revenue.total, currency, locale)}`}
      />
    </div>
  );
}
