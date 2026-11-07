import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import DatePickerPopover from '../orders/DatePickerPopover';
import { fmtDay, isoDay, zoneFor } from '../../format';
import { useI18n } from '../../i18n';
import './globalDatePicker.css';

/*
 * The one date field of the application.
 *
 * Nothing here shows a native date control: the button opens the app's own
 * calendar (the same `DatePickerPopover` the Orders page and the date-range
 * modal use), so the day a Persian owner reads is the Jalali one while the
 * value handed back to the form stays a `yyyy-mm-dd` Gregorian day — exactly
 * what every endpoint already stores.
 *
 * `withTime` adds a plain time field beside the calendar for the forms that
 * schedule an instant (advertisements). The calendar still owns the date; the
 * value keeps the API's `yyyy-mm-ddThh:mm` shape.
 */
export default function GlobalDatePicker({
  value = '',
  onChange,
  min,
  max,
  timeZone,
  placeholder,
  disabled = false,
  withTime = false,
  allowClear = true,
  fieldClassName = 'input',
  ariaLabel,
}) {
  const { t, locale } = useI18n();
  const zone = timeZone || zoneFor(locale);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);

  const raw = String(value || '');
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10)) ? raw.slice(0, 10) : '';
  const time = /^\d{2}:\d{2}$/.test(raw.slice(11, 16)) ? raw.slice(11, 16) : '';
  const today = isoDay(new Date(), zone);

  /* The calendar is portalled outside the form that opened it, so its Escape
     must not reach the dialog behind it: the first Escape closes only the
     calendar, exactly like the shared date-range modal does. */
  useEffect(() => {
    if (!open) return undefined;
    const guard = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener('keydown', guard, true);
    return () => document.removeEventListener('keydown', guard, true);
  }, [open]);

  const pickDay = (next) => {
    if (!onChange) return;
    onChange(withTime ? `${next}T${time || '00:00'}` : next);
  };

  const pickTime = (event) => {
    const next = event.target.value;
    if (!onChange) return;
    // A time without a day has nothing to be relative to — the field then
    // anchors on today, so the value is always a complete instant.
    onChange(`${day || today}T${next || '00:00'}`);
  };

  const shown = day ? fmtDay(day, locale, zone) : '';

  return (
    <span className={`gdate ${fieldClassName} ${withTime ? 'gdate--time' : ''}`.trim()}>
      <button
        type="button"
        ref={buttonRef}
        className="gdate__btn"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel || t('order_select_date')}
      >
        <span className={`gdate__value ${shown ? '' : 'is-empty'}`.trim()}>
          {shown || placeholder || t('order_select_date')}
        </span>
        <Icon name="calendar" size={16} className="gdate__icon" />
      </button>

      {withTime ? (
        <input
          className="gdate__time"
          type="time"
          dir="ltr"
          value={time}
          onChange={pickTime}
          disabled={disabled}
          aria-label={t('label_time')}
        />
      ) : null}

      {allowClear && (day || time) && !disabled ? (
        <button
          type="button"
          className="gdate__clear"
          onClick={() => onChange?.('')}
          aria-label={t('action_clear')}
          title={t('action_clear')}
        >
          <Icon name="close" size={13} />
        </button>
      ) : null}

      {open ? (
        <DatePickerPopover
          anchorEl={buttonRef.current}
          value={day || today}
          today={today}
          timeZone={zone}
          min={min}
          max={max}
          onSelect={pickDay}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </span>
  );
}
