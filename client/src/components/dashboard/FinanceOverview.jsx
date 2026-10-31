import { useState } from 'react';
import Icon from '../Icon';
import DashIcon from './DashIcon';
import BusinessInsights from './BusinessInsights';
import DateRangeModal from './DateRangeModal';
import { useI18n } from '../../i18n';
import { fmtMoney, fmtNumber } from '../../format';

const RANGES = [
  { key: 'today', i18n: 'dash_range_today' },
  { key: 'week', i18n: 'dash_range_week' },
  { key: 'month', i18n: 'dash_range_month' },
  { key: 'year', i18n: 'dash_range_year' },
  { key: 'all', i18n: 'dash_range_alltime' },
  { key: 'custom', i18n: 'dash_range_custom' },
];

/*
 * One metric tile: icon, label, the figure and its comparison, all centred.
 * The tone only picks the pastel surface — the figure itself is whatever the
 * API returned for the selected period.
 */
function Stat({ icon, label, value, delta, tone = 'green' }) {
  const { t, locale } = useI18n();
  return (
    <div className={`fstat fstat--${tone} dash-tone-${tone}`}>
      <DashIcon name={icon} tone={tone} size={50} shape="circle" hover />
      <span className="fstat__label">{label}</span>
      <span className="fstat__value">{value}</span>
      {delta === null || delta === undefined ? (
        <span className="fstat__delta fstat__delta--empty" aria-hidden="true" />
      ) : (
        <span className={`fstat__delta ${delta < 0 ? 'is-down' : delta > 0 ? 'is-up' : ''}`}>
          <Icon name="trendUp" size={12} className={`fstat__trend ${delta < 0 ? 'is-down' : ''}`} />
          {t(delta < 0 ? 'dash_delta_down' : 'dash_delta_up', { pct: fmtNumber(Math.abs(delta), locale) })}
        </span>
      )}
    </div>
  );
}

/**
 * Business overview: the period filter, four financial metrics and the
 * period's insights. The figures are recomputed by the API for the chosen
 * window (business timezone) — the client never calculates money, and
 * comparisons come from the API too, so a period with no previous data shows
 * nothing instead of an invented -100%.
 *
 * The custom range is confirmed in a modal; only a valid, applied range leaves
 * it, so cancelling keeps the range the cards are currently showing.
 */
export default function FinanceOverview({
  finance,
  insights,
  range,
  onRange,
  custom,
  onCustom,
  busy,
  currency,
  locale,
  timeZone,
  showInsights = true,
}) {
  const { t } = useI18n();
  const f = finance || {};
  const [picker, setPicker] = useState(false);

  const openPicker = () => setPicker(true);

  return (
    <section className={`card finance ${busy ? 'is-busy' : ''}`}>
      <header className="card__head">
        <DashIcon name="chartBars" tone="turquoise" size={36} />
        <div className="card__titles">
          <div className="card__title">{t('dash_business_overview')}</div>
        </div>
      </header>

      <div className="card__body">
        <div className="finance__filters" role="group" aria-label={t('dash_business_overview')}>
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`range-pill ${item.key === 'custom' ? 'range-pill--custom' : ''} ${
                range === item.key ? 'is-active' : ''
              }`}
              aria-pressed={range === item.key}
              disabled={busy}
              onClick={() => (item.key === 'custom' ? openPicker() : onRange(item.key))}
            >
              {item.key === 'custom' ? <Icon name="calendar" size={13} /> : null}
              {t(item.i18n)}
            </button>
          ))}
        </div>

        <div className="fstat-row" style={{ marginTop: 12 }}>
          <Stat
            tone="emerald"
            icon="banknote"
            label={t('dash_revenue_label')}
            value={fmtMoney(f.revenue, currency, locale)}
            delta={f.revenue_pct}
          />
          <Stat
            tone="blue"
            icon="cart"
            label={t('dash_orders')}
            value={fmtNumber(f.orders || 0, locale)}
            delta={f.orders_pct}
          />
          <Stat
            tone="purple"
            icon="eye"
            label={t('dash_menu_views')}
            value={fmtNumber(f.views || 0, locale)}
            delta={f.views_pct}
          />
          <Stat
            tone="gold"
            icon="receipt"
            label={t('dash_avg_order_value')}
            value={fmtMoney(f.avg_order, currency, locale)}
          />
        </div>

        {showInsights ? <BusinessInsights insights={insights} finance={f} locale={locale} /> : null}
      </div>

      {picker ? (
        <DateRangeModal
          value={custom}
          timeZone={timeZone}
          locale={locale}
          onClose={() => setPicker(false)}
          onApply={(next) => {
            setPicker(false);
            onCustom(next);
          }}
        />
      ) : null}
    </section>
  );
}
