import DashIcon from '../dashboard/DashIcon';
import { useI18n } from '../../i18n';
import { fmtMoney, fmtNumber } from '../../format';

/**
 * The four headline figures of the Statistics page, in right-to-left order:
 * total visits, daily visits, weekly visits and lifetime revenue. Every value
 * comes from the server summary — nothing here is derived or estimated.
 *
 * `tone` is the shared 3D icon category colour, so the meaning of a hue never
 * depends on where it appears: purple is visitors, turquoise growth,
 * cyan trends and emerald money — the same table the dashboard uses.
 */
const CARDS = [
  {
    key: 'views',
    tone: 'purple',
    icon: 'eye',
    label: 'statistics_total_visits',
    money: false,
    pick: (totals) => totals.views,
  },
  {
    key: 'today',
    tone: 'turquoise',
    icon: 'trendUp',
    label: 'statistics_daily_visits',
    money: false,
    pick: (totals) => totals.views_today,
  },
  {
    key: 'week',
    tone: 'cyan',
    icon: 'chartBars',
    label: 'statistics_weekly_visits',
    money: false,
    pick: (totals) => totals.views_week,
  },
  {
    key: 'revenue',
    tone: 'emerald',
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
          <article className="stats-kpi" key={card.key}>
            <div className="stats-kpi__top">
              <DashIcon name={card.icon} tone={card.tone} size={38} hover />
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
