import { useEffect, useState } from 'react';
import Icon from '../Icon';
import TimeRange from '../TimeRange';
import DashIcon from './DashIcon';
import { useI18n } from '../../i18n';
import { fmtClock, fmtDate } from '../../format';
import './hoursBar.css';

/** The clock ticks without refetching the dashboard payload. */
const TICK_MS = 10000;

/**
 * Date, live time and today's opening hours, as one compact full-width bar.
 *
 * Everything comes from the business configuration: `hours.is_open` is the
 * server's authoritative open/closed verdict for the configured timezone, and a
 * missing or malformed schedule is reported as unknown rather than assumed
 * open. Nothing is recalculated here.
 *
 * Layout: information groups in reading order — title, date, status, today's
 * range, live clock — separated by hairline dividers. The bar is a single flex
 * row that mirrors as one object in Kurdish, Persian and Arabic. Only this bar
 * re-renders on a tick; the dashboard does not.
 */
export default function DateHours({ hours, timeZone, locale }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const today = hours?.today || null;
  const closedToday = Boolean(today?.closed);
  const hasRange = Boolean(today && !closedToday && today.open && today.close);
  // A schedule whose closing time is earlier than its opening time runs past
  // midnight, and the closing time already belongs to the next calendar day.
  const overnight = hasRange && String(today.open) > String(today.close);
  const open = Boolean(hours?.valid && hours.is_open);
  const status = !hours?.valid ? t('dash_hours_unknown') : open ? t('dash_open_now') : t('dash_closed_now');

  return (
    <section className="card hours-bar">
      <div className="hours-bar__group" data-part="title">
        <DashIcon name="calendar" tone="indigo" size={38} />
        <span className="hours-bar__title">{t('dash_date_hours')}</span>
      </div>

      <span className="hours-bar__sep" aria-hidden="true" />

      <div className="hours-bar__group" data-part="date">
        <span className="hours-bar__ico" aria-hidden="true">
          <Icon name="calendar" size={15} />
        </span>
        <span className="hours-bar__value">{fmtDate(now, locale, timeZone)}</span>
      </div>

      <span className="hours-bar__sep" aria-hidden="true" />

      <div className="hours-bar__group" data-part="status">
        <span className={`hours-bar__status ${open ? 'is-open' : 'is-closed'}`}>
          <span className="hours-bar__dot" aria-hidden="true" />
          {status}
        </span>
      </div>

      <span className="hours-bar__sep" aria-hidden="true" />

      <div className="hours-bar__group" data-part="hours">
        <span className="hours-bar__ico" aria-hidden="true">
          <Icon name="clock" size={15} />
        </span>
        <span className="hours-bar__label">{t('dash_today_hours')}</span>
        {hasRange ? (
          <span className="hours-bar__value hours-bar__range">
            {/* Opening time first in reading order: right in RTL, left in LTR. */}
            <TimeRange className="hours-bar__times" open={today.open} close={today.close} />
            {overnight ? (
              <span className="hours-bar__overnight" title={t('dash_overnight')}>
                +1
              </span>
            ) : null}
          </span>
        ) : (
          <span className="hours-bar__value hours-bar__value--empty">
            {closedToday ? t('settings_closed_today') : t('dash_hours_unknown')}
          </span>
        )}
      </div>

      <span className="hours-bar__sep" aria-hidden="true" />

      <div className="hours-bar__group" data-part="live">
        <span className="hours-bar__ico" aria-hidden="true">
          <Icon name="clock" size={15} />
        </span>
        <span className="hours-bar__label">{t('dash_live_time')}</span>
        <span className="hours-bar__value hours-bar__clock">{fmtClock(now, locale, timeZone)}</span>
      </div>
    </section>
  );
}
