import DashIcon from './DashIcon';
import Select from '../select/Select';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';

/*
 * The status filter that sits in the Recent Orders header.
 *
 * It offers the application's own authoritative statuses — never a second
 * status system — and every status keeps the colour it has everywhere else on
 * the dashboard: pending amber, preparing orange, ready violet, completed teal,
 * cancelled red. The 3D icon plate on the trigger follows the chosen status, so
 * the header always shows which slice of orders is on screen.
 *
 * `counts` is the dashboard's own per-status order tally (its `order_flow`), so
 * each option can show how many orders it holds without a second request.
 */
const FILTERS = [
  { key: 'all', tone: 'indigo' },
  { key: 'pending', tone: 'amber' },
  { key: 'preparing', tone: 'orange' },
  { key: 'ready', tone: 'violet' },
  { key: 'completed', tone: 'teal' },
  { key: 'cancelled', tone: 'red' },
];

/** The 3D tone a status keeps on the dashboard (also used by the empty state). */
export const statusTone = (key) => (FILTERS.find((f) => f.key === key) || FILTERS[0]).tone;

export default function RecentOrdersFilter({ value = 'all', onChange, counts }) {
  const { t, locale } = useI18n();
  const current = FILTERS.find((f) => f.key === value) || FILTERS[0];
  const label = (key) => (key === 'all' ? t('user_filter_status_all') : t(`status_${key}`));

  /* "All" is the sum of the authoritative tally; a status with no count yet
     simply shows no badge instead of an invented zero. */
  const tally = counts || null;
  const total = tally ? FILTERS.reduce((sum, f) => (f.key === 'all' ? sum : sum + (Number(tally[f.key]) || 0)), 0) : null;
  const countOf = (key) => {
    if (!tally) return null;
    const n = key === 'all' ? total : Number(tally[key]);
    return Number.isFinite(n) ? fmtDigits(n, locale) : null;
  };

  return (
    <div className="rof">
      <span className="rof__ico" aria-hidden="true">
        <DashIcon name="filter" tone={current.tone} size={26} />
      </span>
      <Select
        className="rof__sel"
        value={value}
        onChange={onChange}
        data-status={value}
        ariaLabel={t('order_filter_status')}
        options={FILTERS.map((f) => {
          const count = countOf(f.key);
          return {
            value: f.key,
            label: label(f.key),
            leading: <span className={`rof__dot rof__dot--${f.key}`} />,
            trailing: count,
          };
        })}
      />
    </div>
  );
}
