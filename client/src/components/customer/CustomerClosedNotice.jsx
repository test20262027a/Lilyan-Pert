import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtWeekdayDate } from '../../format';
import '../../customerAvailability.css';

/*
 * Why ordering is paused, shown as one calm glass card at the top of the menu.
 *
 * The wording comes from the state the opening helper resolved, never from a
 * guess: before the saved opening time, after the closing time, an off day, or a
 * day with no usable schedule. The saved hours and today's date sit beside it so
 * the guest knows exactly when ordering comes back.
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

export default function CustomerClosedNotice({ status, timeZone }) {
  const { t, locale } = useI18n();
  const copy = COPY[status?.state] || COPY.after;
  const open = status?.open || '';
  const close = status?.close || '';

  const detail = copy.hint === 'customer_closed_before_hint'
    ? { time: open }
    : { open, close };

  return (
    <section className={`cui-closed cui-closed--${copy.tone}`} role="status">
      <span className="cui-closed__icon" aria-hidden="true">
        <Icon name={copy.icon} size={20} />
      </span>

      <div className="cui-closed__text">
        <span className="cui-closed__pill">{t('customer_closed_ordering_paused')}</span>
        <h2 className="cui-closed__title">{t(copy.title)}</h2>
        <p className="cui-closed__hint">{t(copy.hint, detail)}</p>

        <div className="cui-closed__meta">
          <span className="cui-closed__chip">
            <Icon name="calendar" size={13} />
            {fmtWeekdayDate(new Date(), locale, timeZone)}
          </span>
          {open && close && copy.tone !== 'holiday' ? (
            <span className="cui-closed__chip cui-closed__chip--time" dir="ltr">
              <Icon name="clock" size={13} />
              {open} – {close}
            </span>
          ) : null}
        </div>
      </div>

      <p className="cui-closed__note">
        <Icon name="lock" size={13} />
        {t('customer_closed_browse')}
      </p>
    </section>
  );
}
