import Icon from '../Icon';
import DashIcon from './DashIcon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

const num = (v) => Number(v) || 0;

/** Share of a total, guarding the zero denominator. */
const share = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function Kpi({ tone, icon, label, value, hint, hintTone }) {
  return (
    <article className={`kpi kpi--${tone} dash-tone-${tone}`}>
      <DashIcon name={icon} tone={tone} size={52} shape="circle" hover />
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {hint ? <span className={`kpi__hint ${hintTone ? `kpi__hint--${hintTone}` : ''}`}>{hint}</span> : null}
    </article>
  );
}

/**
 * Four pastel headline metrics — total orders (blue), today's orders (orange),
 * completed (teal) and cancelled (red), in that right-to-left order. Every number is
 * aggregated by the dashboard endpoint from this business's own orders.
 *
 * "Today" is the only metric whose displayed value is a single day, so it is
 * the only one carrying a day-over-day comparison. The two cumulative counts
 * show their share of all orders instead, which is comparable to what they
 * display and never invents a growth figure.
 */
export default function KpiCards({ kpi = {}, locale }) {
  const { t } = useI18n();
  const total = num(kpi.total_orders);
  const today = num(kpi.today_orders);
  const yesterday = num(kpi.yesterday_orders);
  const completed = num(kpi.completed_orders);
  const cancelled = num(kpi.cancelled_orders);

  const delta = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : null;
  const todayHint =
    delta === null ? (
      `${t('dash_yesterday')}: ${fmtNumber(yesterday, locale)}`
    ) : (
      <>
        {delta !== 0 ? (
          <Icon name="trendUp" size={12} className={`kpi__trend ${delta < 0 ? 'is-down' : ''}`} />
        ) : null}
        <strong>{`${fmtNumber(Math.abs(delta), locale)}%`}</strong>
        {` ${t('dash_vs_yesterday')}`}
      </>
    );

  return (
    <div className="kpi-row">
      <Kpi tone="blue" icon="clipboard" label={t('dash_orders_total')} value={fmtNumber(total, locale)} />
      <Kpi
        tone="orange"
        icon="cart"
        label={t('dash_orders_today')}
        value={fmtNumber(today, locale)}
        hint={todayHint}
        hintTone={delta === null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : null}
      />
      <Kpi
        tone="teal"
        icon="checkCircle"
        label={t('dash_orders_completed')}
        value={fmtNumber(completed, locale)}
        hint={
          <>
            <strong>{fmtNumber(share(completed, total), locale)}%</strong>
            {` ${t('dash_of_total')}`}
          </>
        }
      />
      <Kpi
        tone="red"
        icon="xCircle"
        label={t('dash_orders_cancelled')}
        value={fmtNumber(cancelled, locale)}
        hint={
          <>
            <strong>{fmtNumber(share(cancelled, total), locale)}%</strong>
            {` ${t('dash_of_total')}`}
          </>
        }
      />
    </div>
  );
}
