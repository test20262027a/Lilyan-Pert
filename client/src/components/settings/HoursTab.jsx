import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { SettingsCard, SwitchControl } from './SettingsCard';

/*
 * The week in the reference order. In a right-to-left layout the first card is
 * the physical right one, so Monday leads. The open/closed verdict itself is
 * always computed by the API in the business timezone — this tab only edits the
 * stored schedule.
 */
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const WEEKDAY = { Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };

/** Today's day key inside the business timezone (never the browser's). */
function todayKey(timeZone) {
  try {
    const short = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date());
    return WEEKDAY[short] || null;
  } catch {
    return null;
  }
}

export default function HoursTab({ draft, setJson, canManage }) {
  const { t } = useI18n();
  const today = todayKey(draft.timezone || 'UTC');

  return (
    <SettingsCard
      icon="clock"
      tone="amber"
      title={t('settings_hours_title')}
      subtitle={t('settings_hours_hint')}
    >
      <div className="set-days">
        {DAYS.map((day) => {
          const value = draft.working_hours?.[day] || { open: '09:00', close: '23:00', closed: false };
          const closed = Boolean(value.closed);
          const isToday = today === day;
          return (
            <div key={day} className={`set-day ${isToday ? 'is-today' : ''} ${closed ? 'is-closed' : ''}`}>
              <div className="set-day__name">
                <span>{t(`settings_day_${day}`)}</span>
                <SwitchControl
                  checked={!closed}
                  disabled={!canManage}
                  label={`${t(`settings_day_${day}`)} ${t('settings_open_control')}`}
                  onChange={(open) => setJson('working_hours', day, { ...value, closed: !open })}
                />
              </div>
              {/* The open/closed verdict sits directly under the day name and
                  the Today chip takes the opposite corner — the two labels
                  swapped corners, their values and meaning are unchanged. */}
              <span className={`set-day__state ${closed ? 'is-closed' : ''}`}>
                <span className="set-day__status">
                  {closed ? t('settings_status_closed') : t('settings_status_open')}
                </span>
                {isToday ? <span className="set-day__badge">{t('settings_today')}</span> : null}
              </span>

              <div className="set-day__times">
                <span className="set-day__time">
                  <Icon name="clock" size={12} />
                  <input
                    type="time"
                    value={value.open || '09:00'}
                    disabled={!canManage || closed}
                    aria-label={`${t(`settings_day_${day}`)} ${t('settings_hours_open')}`}
                    onChange={(event) => setJson('working_hours', day, { ...value, open: event.target.value })}
                  />
                </span>
                <span className="set-day__time">
                  <Icon name="clock" size={12} />
                  <input
                    type="time"
                    value={value.close || '23:00'}
                    disabled={!canManage || closed}
                    aria-label={`${t(`settings_day_${day}`)} ${t('settings_hours_close')}`}
                    onChange={(event) => setJson('working_hours', day, { ...value, close: event.target.value })}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="set-hint">{t('settings_hours_overnight')}</p>
    </SettingsCard>
  );
}
