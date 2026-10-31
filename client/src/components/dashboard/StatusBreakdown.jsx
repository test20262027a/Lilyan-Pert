import DashIcon from './DashIcon';
import { SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/*
 * The five authoritative order statuses, in the dashboard's right-to-left
 * order. Each status keeps one category colour across the dashboard (pending
 * amber, preparing violet, ready cyan, completed teal, cancelled red); the
 * labels come from the shared status translations — no second status system
 * is introduced here.
 */
const STATUSES = [
  { key: 'pending', icon: 'clock', tone: 'amber' },
  { key: 'preparing', icon: 'chefHat', tone: 'violet' },
  { key: 'ready', icon: 'package', tone: 'cyan' },
  { key: 'completed', icon: 'checkCircle', tone: 'teal' },
  { key: 'cancelled', icon: 'xCircle', tone: 'red' },
];

/**
 * Five compact pastel tiles showing how many orders sit in each status. They
 * are informational only — the tiles are not links, so they never look
 * clickable, and they never trigger external push notifications.
 */
export default function StatusBreakdown({ flow = {} }) {
  const { t, locale } = useI18n();

  return (
    <SectionCard icon="clipboard" iconTone="violet" title={t('dash_status_notifications')}>
      <div className="status-row">
        {STATUSES.map((s) => (
          <article className={`status-tile status-tile--${s.tone} dash-tone-${s.tone}`} key={s.key}>
            <DashIcon name={s.icon} tone={s.tone} size={50} shape="circle" hover />
            <span className="status-tile__label" title={t(`status_${s.key}`)}>
              {t(`status_${s.key}`)}
            </span>
            <span className="status-tile__value">{fmtNumber(flow[s.key] || 0, locale)}</span>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
