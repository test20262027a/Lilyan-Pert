import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

const num = (v) => Number(v) || 0;

/** Share of a total, guarding the zero denominator. */
const share = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function Kpi({ tone, icon, label, value, hint, hintTone }) {
  return (
    <article className={`kpi kpi--${tone}`}>
      <span className="kpi__icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {hint ? <span className={`kpi__hint ${hintTone ? `kpi__hint--${hintTone}` : ''}`}>{hint}</span> : null}
    </article>
  );
}

/**
 * Four pastel headline metrics — total (blue), today (amber), completed
 * (green) and cancelled (pink), in that right-to-left order. Every number is
 * aggregated by the dashboard endpoint from this business's own orders.
 */
export default function KpiCards({ kpi = {}, locale }) {
  const { t } = useI18n();
  const total = num(kpi.total_orders);
  const today = num(kpi.today_orders);
  const yesterday = num(kpi.yesterday_orders);
  const completed = num(kpi.completed_orders);
  const cancelled = num(kpi.cancelled_orders);

  const delta = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : null;
  const deltaHint =
    delta === null
      ? `${t('dash_yesterday')}: ${fmtNumber(yesterday, locale)}`
      : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} ${fmtNumber(Math.abs(delta), locale)}% ${t('dash_vs_yesterday')}`;

  return (
    <div className="kpi-row">
      <Kpi
        tone="blue"
        icon="clipboard"
        label={t('dash_orders_total')}
        value={fmtNumber(total, locale)}
        hint={`${fmtNumber(share(today, total), locale)}% ${t('dash_of_total')}`}
      />
      <Kpi
        tone="amber"
        icon="cart"
        label={t('dash_orders_today')}
        value={fmtNumber(today, locale)}
        hint={deltaHint}
        hintTone={delta === null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : null}
      />
      <Kpi
        tone="green"
        icon="checkCircle"
        label={t('dash_orders_completed')}
        value={fmtNumber(completed, locale)}
        hint={`${fmtNumber(share(completed, total), locale)}% ${t('dash_of_total')}`}
      />
      <Kpi
        tone="pink"
        icon="xCircle"
        label={t('dash_orders_cancelled')}
        value={fmtNumber(cancelled, locale)}
        hint={`${fmtNumber(share(cancelled, total), locale)}% ${t('dash_of_total')}`}
      />
    </div>
  );
}
