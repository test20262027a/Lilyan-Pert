import { useRef, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { addDaysToDay, fmtDay, isoDay } from '../../format';
import DatePickerPopover from './DatePickerPopover';

/*
 * Banner date controls: the date pill (a real calendar popover), the previous
 * day, Today and the next day. The day is a plain `yyyy-mm-dd` calendar day, so
 * stepping and display never drift with the browser's own timezone — and
 * "Today" is today on the business's clock, not the browser's.
 * The chevrons are directional icons, so they point the right way in RTL.
 */
export default function DateNav({ value, onChange, timeZone }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const today = isoDay(new Date(), timeZone);

  return (
    <div className="odate">
      <button
        type="button"
        ref={triggerRef}
        className={`odate__pick ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('order_select_date')} — ${fmtDay(value, locale, timeZone)}`}
        title={t('order_select_date')}
      >
        <Icon name="calendar" size={15} />
        <span className="odate__value">{fmtDay(value, locale, timeZone, { numeric: true })}</span>
        <Icon name="chevronDown" size={13} className="odate__caret" />
      </button>

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

      {open ? (
        <DatePickerPopover
          anchorEl={triggerRef.current}
          value={value}
          today={today}
          timeZone={timeZone}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
