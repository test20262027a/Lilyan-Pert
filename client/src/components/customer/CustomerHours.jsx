import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtDate, fmtWeekday } from '../../format';

/*
 * Today's trading hours, read on the business's own clock (the page resolves the
 * day, the verdict and the re-check tick in the business timezone, including an
 * interval that runs past midnight). It renders only when the owner actually
 * saved a schedule, so the sections around it simply share the space when the
 * card is absent.
 *
 * Layout follows the reference: a tinted header row with the title, its icon and
 * the state pill, then the day and date in a soft calendar badge opposite the
 * trading range. The state pill carries the same four verdicts the ordering
 * panel uses — open, not yet open, closed, holiday — and tints the card, so the
 * hours card and the paused ordering surface can never contradict each other.
 *
 * The date goes through the shared formatter, so Persian shows the Solar Hijri
 * calendar and every other language its own localized date.
 */
const STATE = {
  open: { label: 'dash_open_now', tone: 'is-open' },
  before: { label: 'customer_hours_before', tone: 'is-soon' },
  after: { label: 'dash_closed_now', tone: 'is-closed' },
  holiday: { label: 'customer_hours_holiday', tone: 'is-holiday' },
  no_schedule: { label: 'customer_hours_unset', tone: 'is-closed' },
};

export default function CustomerHours({ hours, timeZone, status }) {
  const { t, locale } = useI18n();
  if (!hours || !hours.now) return null;

  const today = hours.today;
  const state = status?.state || (hours.valid ? (hours.is_open ? 'open' : 'after') : 'no_schedule');
  const view = STATE[state] || STATE.after;
  /* The range stays visible for a day that is scheduled but not open yet — only
     an off day has no range to show. */
  const closed = !today || today.closed;

  return (
    <section className={`cui-hours ${view.tone}`}>
      <header className="cui-hours__head">
        <span className="cui-hours__icon">
          <Icon name="clock" size={17} />
        </span>
        <h2 className="cui-hours__title">{t('dash_working_hours')}</h2>
        <span className={`cui-state ${view.tone}`}>
          <i aria-hidden="true" />
          {t(view.label)}
        </span>
      </header>

      <div className="cui-hours__body">
        <div className="cui-hours__date">
          <span className="cui-hours__dateicon">
            <Icon name="calendar" size={16} />
          </span>
          <span className="cui-hours__datetext">
            <strong className="cui-hours__day">
              {fmtWeekday(new Date(), locale, timeZone, { long: true })}
            </strong>
            <span className="cui-hours__fulldate">{fmtDate(new Date(), locale, timeZone)}</span>
          </span>
        </div>

        <div className="cui-hours__time">
          <Icon name="clock" size={15} />
          {closed ? (
            <span className="is-closed">
              {today?.closed ? t('customer_menu_closed_today') : t('dash_closed_now')}
            </span>
          ) : (
            <span dir="ltr">
              {today.open} – {today.close}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
