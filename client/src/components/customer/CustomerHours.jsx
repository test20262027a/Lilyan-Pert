import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtWeekdayDate } from '../../format';

/*
 * Today's trading hours, read on the business's own clock (the API resolves the
 * day key and the open/closed verdict in the business timezone). It renders only
 * when the owner actually saved a schedule for today, so the sections around it
 * simply share the space when the card is absent.
 */
export default function CustomerHours({ hours, timeZone }) {
  const { t, locale } = useI18n();
  if (!hours || !hours.now) return null;

  const today = hours.today;
  const closed = !today || today.closed;

  return (
    <section className="cui-hours">
      <span className="cui-hours__icon">
        <Icon name="clock" size={20} />
      </span>
      <div className="cui-hours__text">
        <p className="cui-hours__title">{t('dash_working_hours')}</p>
        <p className="cui-hours__day">{fmtWeekdayDate(new Date(), locale, timeZone)}</p>
      </div>
      <div className="cui-hours__right">
        {closed ? (
          <span className="cui-hours__range is-closed">{t('customer_menu_closed_today')}</span>
        ) : (
          <span className="cui-hours__range" dir="ltr">
            {today.open} – {today.close}
          </span>
        )}
        {hours.valid ? (
          <span className={`cui-state ${hours.is_open ? 'is-open' : 'is-closed'}`}>
            <i aria-hidden="true" />
            {hours.is_open ? t('dash_open_now') : t('dash_closed_now')}
          </span>
        ) : null}
      </div>
    </section>
  );
}
