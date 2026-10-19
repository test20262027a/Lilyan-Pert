import Icon from '../Icon';
import { SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/*
 * The five authoritative order statuses, in the dashboard's right-to-left
 * order. Icons and colours differ per status, the labels come from the shared
 * status translations — no second status system is introduced here.
 */
const STATUSES = [
  { key: 'pending', icon: 'clock', tone: 'blue' },
  { key: 'preparing', icon: 'chefHat', tone: 'amber' },
  { key: 'ready', icon: 'package', tone: 'lavender' },
  { key: 'completed', icon: 'checkCircle', tone: 'green' },
  { key: 'cancelled', icon: 'xCircle', tone: 'pink' },
];

/** Five compact pastel tiles showing how many orders sit in each status. */
export default function StatusBreakdown({ flow = {} }) {
  const { t, locale } = useI18n();

  return (
    <SectionCard icon="clipboard" iconClass="ic-teal" title={t('dash_status_notifications')}>
      <div className="status-row">
        {STATUSES.map((s) => (
          <article className={`status-tile status-tile--${s.tone}`} key={s.key}>
            <span className="status-tile__icon">
              <Icon name={s.icon} size={17} />
            </span>
            <span className="status-tile__value">{fmtNumber(flow[s.key] || 0, locale)}</span>
            <span className="status-tile__label" title={t(`status_${s.key}`)}>
              {t(`status_${s.key}`)}
            </span>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
