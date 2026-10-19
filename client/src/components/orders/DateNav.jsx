import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { addDaysToDay, fmtDay, isoDay } from '../../format';

/*
 * Banner date controls: the date pill (a real date picker), the previous day,
 * Today and the next day. The day is a plain `yyyy-mm-dd` calendar day, so
 * stepping and display never drift with the browser's own timezone.
 * The chevrons are directional icons, so they point the right way in RTL.
 */
export default function DateNav({ value, onChange, timeZone }) {
  const { t, locale } = useI18n();
  const today = isoDay(new Date(), timeZone);

  return (
    <div className="odate">
      <label className="odate__pick" title={t('order_select_date')}>
        <Icon name="calendar" size={15} />
        <span className="odate__value">{fmtDay(value, locale, timeZone, { numeric: true })}</span>
        <Icon name="chevronDown" size={13} className="odate__caret" />
        {/* A real date input sits on top of the pill, so clicking opens the picker. */}
        <input
          className="odate__input"
          type="date"
          value={value}
          aria-label={t('order_select_date')}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
        />
      </label>

      <button
        type="button"
        className="odate__btn"
        onClick={() => onChange(addDaysToDay(value, -1))}
        aria-label={t('order_prev_day')}
        title={t('order_prev_day')}
      >
        <Icon name="chevronLeft" size={15} />
      </button>

      <button
        type="button"
        className={`odate__btn odate__btn--today ${value === today ? 'is-active' : ''}`}
        onClick={() => onChange(today)}
      >
        {t('order_today')}
      </button>

      <button
        type="button"
        className="odate__btn"
        onClick={() => onChange(addDaysToDay(value, 1))}
        aria-label={t('order_next_day')}
        title={t('order_next_day')}
      >
        <Icon name="chevronRight" size={15} />
      </button>
    </div>
  );
}
