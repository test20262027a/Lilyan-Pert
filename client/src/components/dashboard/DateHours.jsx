import Icon from '../Icon';
import { Badge } from '../ui';
import LiveClock from '../LiveClock';
import { useI18n } from '../../i18n';
import { fmtDate } from '../../format';

/**
 * Date, live time and today's opening hours. Everything comes from the
 * business configuration: `hours.is_open` is the server's authoritative
 * open/closed verdict for the configured timezone, and a missing or malformed
 * schedule is reported as unknown rather than assumed open.
 */
export default function DateHours({ hours, timeZone, locale }) {
  const { t } = useI18n();
  const today = hours?.today || null;
  const closedToday = Boolean(today?.closed);
  const range = today && !closedToday && today.open && today.close ? `${today.open} – ${today.close}` : null;
  const overnight = today && !closedToday && today.open > today.close;

  const badge = hours?.valid
    ? { kind: hours.is_open ? 'active' : 'inactive', label: hours.is_open ? t('dash_open_now') : t('dash_closed_now') }
    : { kind: 'inactive', label: t('dash_hours_unknown') };

  return (
    <section className="card hours-card">
      <header className="card__head">
        <span className="card__icon ic-blue">
          <Icon name="calendar" size={18} />
        </span>
        <div className="card__titles">
          <div className="card__title">{t('dash_date_hours')}</div>
        </div>
        <Badge kind={badge.kind}>
          <span className={`live-dot ${hours?.is_open ? '' : 'live-dot--off'}`} />
          {badge.label}
        </Badge>
      </header>

      <div className="card__body hours-card__body">
        <div className="hours-card__group">
          <span className="hours-card__label">
            <Icon name="calendar" size={13} />
            {t('dash_range_today')}
          </span>
          <span className="hours-card__date">{fmtDate(new Date(), locale, timeZone, { weekday: true })}</span>
          {/* Only this isolated component re-renders on every clock tick. */}
          <span className="hours-card__value hours-card__value--green hours-card__value--lg">
            <LiveClock timeZone={timeZone} />
          </span>
        </div>

        <span className="hours-card__divider" aria-hidden="true" />

        <div className="hours-card__group">
          <span className="hours-card__label">
            <Icon name="clock" size={13} className="ic-green" />
            {t('dash_today_hours')}
          </span>
          <span className="hours-card__value hours-card__value--green hours-card__value--lg hours-card__value--range">
            {/* Times must read start-first in every language. */}
            {range ? (
              <span className="hours-card__times" dir="ltr">
                {range}
              </span>
            ) : closedToday ? t('settings_closed_today') : t('dash_hours_unknown')}
            {overnight && range ? (
              <span className="hours-card__overnight" title={t('dash_overnight')}>
                +1
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </section>
  );
}
