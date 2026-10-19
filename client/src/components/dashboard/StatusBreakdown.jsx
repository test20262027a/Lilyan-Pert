import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/** The five authoritative order statuses — the same keys the API groups by. */
const STATUSES = [
  { key: 'pending', icon: 'clock' },
  { key: 'preparing', icon: 'utensils' },
  { key: 'ready', icon: 'check' },
  { key: 'completed', icon: 'receipt' },
  { key: 'cancelled', icon: 'close' },
];

/** Five compact pastel tiles showing how many orders sit in each status. */
export default function StatusBreakdown({ flow = {} }) {
  const { t, locale } = useI18n();

  return (
    <div className="status-row">
      {STATUSES.map((s) => (
        <article className={`status-tile status-tile--${s.key}`} key={s.key}>
          <span className="status-tile__icon">
            <Icon name={s.icon} size={16} />
          </span>
          <span className="status-tile__label" title={t(`status_${s.key}`)}>
            {t(`status_${s.key}`)}
          </span>
          <span className="status-tile__value">{fmtNumber(flow[s.key] || 0, locale)}</span>
        </article>
      ))}
    </div>
  );
}
