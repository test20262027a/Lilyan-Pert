import StatPanel from './StatPanel';
import { useI18n } from '../../i18n';
import { fmtMoney } from '../../format';

/**
 * Revenue for the three fixed windows, right to left: today, this week and this
 * month. The API computes every boundary in the business timezone from the
 * stored order totals — this component only formats them.
 */
export default function RevenuePanel({ revenue = {}, currency, locale }) {
  const { t } = useI18n();
  const items = [
    { key: 'today', label: 'statistics_revenue_today', value: revenue.today },
    { key: 'week', label: 'statistics_revenue_week', value: revenue.week },
    { key: 'month', label: 'statistics_revenue_month', value: revenue.month },
  ];

  return (
    <StatPanel icon="wallet" tone="green" title={t('statistics_revenue')} className="stat-panel--revenue">
      <div className="stats-revenue">
        {items.map((item) => (
          <div className="stats-revenue__item" key={item.key}>
            <span className="stats-revenue__label">{t(item.label)}</span>
            <span className="stats-revenue__value">{fmtMoney(item.value, currency, locale)}</span>
          </div>
        ))}
      </div>
    </StatPanel>
  );
}
