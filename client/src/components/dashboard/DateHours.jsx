import { useEffect, useState } from 'react';
import Icon from '../Icon';
import DashIcon from './DashIcon';
import { Badge } from '../ui';
import { useI18n } from '../../i18n';
import { fmtClock, fmtWeekdayDate } from '../../format';

/** The clock ticks without refetching the dashboard payload. */
const TICK_MS = 10000;

/**
 * Date, live time and today's opening hours. Everything comes from the
 * business configuration: `hours.is_open` is the server's authoritative
 * open/closed verdict for the configured timezone, and a missing or malformed
 * schedule is reported as unknown rather than assumed open.
 *
 * Layout: the date sits at the top of its column and the two large values are
 * pushed to the bottom, so the live clock and the working-hours range share one
 * baseline. Only this card re-renders on a tick — the dashboard does not.
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
  const range = hasRange ? `${today.open} – ${today.close}` : null;
  // A schedule whose closing time is earlier than its opening time runs past
  // midnight, and the closing time already belongs to the next calendar day.
  const overnight = hasRange && String(today.open) > String(today.close);

  const badge = hours?.valid
    ? { kind: hours.is_open ? 'active' : 'inactive', label: hours.is_open ? t('dash_open_now') : t('dash_closed_now') }
    : { kind: 'inactive', label: t('dash_hours_unknown') };

  return (
    <section className="card hours-card">
      <header className="card__head">
        <DashIcon name="calendar" tone="indigo" size={36} />
        <div className="card__titles">
          <div className="card__title">{t('dash_date_hours')}</div>
        </div>
        <Badge kind={badge.kind}>
          <span className={`live-dot ${hours?.is_open ? '' : 'live-dot--off'}`} />
          {badge.label}
        </Badge>
      </header>

      <div className="card__body hours-card__body">
        <div className="hours-card__col">
          <span className="hours-card__date">
            <Icon
              name="calendar"
              size={14}
              className="hours-card__date-icon"
              style={{ color: 'var(--dashic-indigo-ink)' }}
            />
            <span className="hours-card__date-text">{fmtWeekdayDate(now, locale, timeZone)}</span>
          </span>
          <span className="hours-card__clock" aria-label={fmtClock(now, locale, timeZone)}>
            {fmtClock(now, locale, timeZone)}
          </span>
        </div>

        <span className="hours-card__divider" aria-hidden="true" />

        <div className="hours-card__col">
          <span className="hours-card__hours-label">
            <Icon name="clock" size={15} style={{ color: 'var(--dashic-indigo-ink)' }} />
            {t('dash_today_hours')}
          </span>
          {range ? (
            <span className="hours-card__range">
              {/* Times must read start-first in every language. */}
              <span className="hours-card__times" dir="ltr">
                {range}
              </span>
              {overnight ? (
                <span className="hours-card__overnight" title={t('dash_overnight')}>
                  +1
                </span>
              ) : null}
            </span>
          ) : (
            <span className="hours-card__range hours-card__range--empty">
              {closedToday ? t('settings_closed_today') : t('dash_hours_unknown')}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
