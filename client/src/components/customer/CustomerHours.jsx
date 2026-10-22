import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtDate, fmtWeekday } from '../../format';

/*
 * Today's trading hours, read on the business's own clock (the API resolves the
 * day key and the open/closed verdict in the business timezone, including an
 * interval that runs past midnight). It renders only when the owner actually
 * saved a schedule, so the sections around it simply share the space when the
 * card is absent.
 *
 * Layout follows the reference: a tinted header row with the title, its icon and
 * the state pill — the state on its own, never with the business type beside it
 * — then the day and date in a soft calendar badge opposite the trading range.
 * The date goes through the shared formatter, so Persian shows the Solar Hijri
 * calendar and every other language its own localized date.
 */
export default function CustomerHours({ hours, timeZone }) {
  const { t, locale } = useI18n();
  if (!hours || !hours.now) return null;

  const today = hours.today;
  const closed = !today || today.closed;

  return (
    <section className="cui-hours">
      <header className="cui-hours__head">
        <span className="cui-hours__icon">
          <Icon name="clock" size={17} />
        </span>
        <h2 className="cui-hours__title">{t('dash_working_hours')}</h2>
        {hours.valid ? (
          <span className={`cui-state ${hours.is_open ? 'is-open' : 'is-closed'}`}>
            <i aria-hidden="true" />
            {hours.is_open ? t('dash_open_now') : t('dash_closed_now')}
          </span>
        ) : null}
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
            <span className="is-closed">{t('customer_menu_closed_today')}</span>
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
