import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtMoney, fmtNumber } from '../../format';

/**
 * The four headline figures of the Statistics page, in right-to-left order:
 * total visits, daily visits, weekly visits and lifetime revenue. Every value
 * comes from the server summary — nothing here is derived or estimated.
 */
const CARDS = [
  {
    key: 'views',
    tone: 'blue',
    icon: 'eye',
    label: 'statistics_total_visits',
    money: false,
    pick: (totals) => totals.views,
  },
  {
    key: 'today',
    tone: 'green',
    icon: 'trendUp',
    label: 'statistics_daily_visits',
    money: false,
    pick: (totals) => totals.views_today,
  },
  {
    key: 'week',
    tone: 'purple',
    icon: 'chartBars',
    label: 'statistics_weekly_visits',
    money: false,
    pick: (totals) => totals.views_week,
  },
  {
    key: 'revenue',
    tone: 'orange',
    icon: 'banknote',
    label: 'statistics_total_revenue',
    money: true,
    pick: (totals) => totals.revenue,
  },
];

export default function StatCards({ totals = {}, currency, locale }) {
  const { t } = useI18n();

  return (
    <div className="stats-kpis">
      {CARDS.map((card) => {
        const value = card.pick(totals);
        return (
          <article className={`stats-kpi stats-kpi--${card.tone}`} key={card.key}>
            <div className="stats-kpi__top">
              <span className="stats-kpi__icon">
                <Icon name={card.icon} size={17} />
              </span>
              <span className="stats-kpi__label">{t(card.label)}</span>
            </div>
            <div className="stats-kpi__value">
              {card.money ? fmtMoney(value, currency, locale) : fmtNumber(value, locale)}
            </div>
          </article>
        );
      })}
    </div>
  );
}
