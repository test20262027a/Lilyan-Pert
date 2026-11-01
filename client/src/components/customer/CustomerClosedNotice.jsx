import Icon from '../Icon';
import TimeRange from '../TimeRange';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';
import '../../customerAvailability.css';

/*
 * Why ordering is paused, shown as one compact glass card at the top of the menu.
 *
 * The wording comes from the state the opening helper resolved, never from a
 * guess: before the saved opening time, after the closing time, an off day, or a
 * day with no usable schedule. Every line — title, hint and the three status
 * badges — is read from the translation dictionaries, so the paused state speaks
 * the guest's language exactly like the rest of the menu.
 *
 * The day is named from the same dictionary keys the Working Hours editor uses
 * (`settings_day_*`), so a language whose calendar data a browser lacks still
 * shows its own weekday instead of falling back to English.
 */

const COPY = {
  before: { title: 'customer_closed_before_title', hint: 'customer_closed_before_hint', icon: 'clock', tone: 'soon' },
  after: { title: 'customer_closed_after_title', hint: 'customer_closed_after_hint', icon: 'moon', tone: 'closed' },
  holiday: { title: 'customer_closed_holiday_title', hint: 'customer_closed_holiday_hint', icon: 'calendar', tone: 'holiday' },
  no_schedule: {
    title: 'customer_closed_schedule_title',
    hint: 'customer_closed_schedule_hint',
    icon: 'info',
    tone: 'closed',
  },
};

const WEEKDAY_KEY = { Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };

/** Today's day key on the business clock, never the browser's. */
function todayKey(timeZone) {
  try {
    const short = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date());
    return WEEKDAY_KEY[short] || null;
  } catch {
    return null;
  }
}

export default function CustomerClosedNotice({ status, timeZone }) {
  const { t, locale } = useI18n();
  const copy = COPY[status?.state] || COPY.after;
  const open = status?.open || '';
  const close = status?.close || '';
  const day = todayKey(timeZone);
  const hours = copy.tone !== 'holiday' && open && close ? { open, close } : null;

  return (
    <section className={`cui-closed cui-closed--${copy.tone}`} role="status">
      <span className="cui-closed__aura" aria-hidden="true" />

      <div className="cui-closed__main">
        <span className="cui-closed__icon" aria-hidden="true">
          <Icon name={copy.icon} size={22} />
        </span>

        <div className="cui-closed__text">
          <h2 className="cui-closed__title">{t(copy.title)}</h2>
          <p className="cui-closed__hint">{t(copy.hint)}</p>
        </div>

        {/* The three status badges share the title's row and sit on the
            opposite side of it, so the card reads as one line: message at the
            start, state at the end, mirrored by the document direction. */}
        <div className="cui-closed__badges">
          <span className="cui-closed__badge cui-closed__badge--day">
            <i className="cui-closed__badge-icon" aria-hidden="true">
              <Icon name="calendar" size={13} />
            </i>
            <span className="cui-closed__badge-text">
              {t('customer_closed_today')}
              {day ? ` · ${t(`settings_day_${day}`)}` : ''}
            </span>
            {hours ? (
              /* Opening time first in reading order: the shared range row puts
                 it on the RIGHT in Kurdish, Persian and Arabic and on the LEFT
                 in English, never touching the saved schedule. */
              <TimeRange
                className="cui-closed__badge-time"
                open={fmtDigits(hours.open, locale)}
                close={fmtDigits(hours.close, locale)}
              />
            ) : null}
          </span>

          <span className="cui-closed__badge cui-closed__badge--closed">
            <i className="cui-closed__badge-icon" aria-hidden="true">
              <Icon name="lock" size={13} />
            </i>
            <span className="cui-closed__badge-text">
              {copy.tone === 'soon' ? t('customer_hours_before') : t('customer_menu_closed_today')}
            </span>
          </span>

          <span className="cui-closed__badge cui-closed__badge--paused">
            <i className="cui-closed__badge-icon" aria-hidden="true">
              <Icon name="clock" size={13} />
            </i>
            <span className="cui-closed__badge-text">{t('customer_closed_ordering_paused')}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
