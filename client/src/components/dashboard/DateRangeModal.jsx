import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtDay, isoDay } from '../../format';
import DatePickerPopover from '../orders/DatePickerPopover';

const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

const FOCUSABLE = 'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Custom date-range picker for Business Insights. The two values it returns are
 * plain `yyyy-mm-dd` calendar days; the API turns them into the business
 * timezone's inclusive window, so what is applied here is exactly what the
 * server ranges over. Nothing is sent until Apply succeeds — closing the modal
 * keeps the previously applied range untouched.
 *
 * The fields open the app's own calendar popover rather than a native date
 * input, so the day a Persian user reads and picks is the Jalali (Solar Hijri)
 * one, while the value handed back is still the Gregorian calendar day.
 */
export default function DateRangeModal({ value, timeZone, locale, onApply, onClose }) {
  const { t } = useI18n();
  const [from, setFrom] = useState(value?.from || '');
  const [to, setTo] = useState(value?.to || '');
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(null);
  const cardRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const pickerOpenRef = useRef(false);
  const today = isoDay(new Date(), timeZone);

  useEffect(() => {
    pickerOpenRef.current = Boolean(picker);
  }, [picker]);

  // Escape closes, Tab stays inside the dialog, and the page behind stays put.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    fromRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // An open calendar takes the first Escape; the modal the next one.
        if (pickerOpenRef.current) {
          setPicker(null);
          return;
        }
        onClose();
        return;
      }
      if (e.key !== 'Tab' || pickerOpenRef.current) return;
      const nodes = Array.from(cardRef.current?.querySelectorAll(FOCUSABLE) || []);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose]);

  const apply = (e) => {
    e.preventDefault();
    if (!isDay(from)) {
      setError(t('dash_range_from_required'));
      fromRef.current?.focus();
      return;
    }
    if (!isDay(to)) {
      setError(t('dash_range_to_required'));
      toRef.current?.focus();
      return;
    }
    if (from > to) {
      setError(t('dash_range_invalid'));
      return;
    }
    onApply({ from, to });
  };

  const field = (key, label, day, ref) => (
    <div className="dash-field">
      <span className="dash-field__label">{label}</span>
      <span className="dash-field__control">
        <button
          type="button"
          ref={ref}
          className={`dash-field__input ${picker === key ? 'is-open' : ''} ${
            error && !isDay(day) ? 'is-invalid' : ''
          }`}
          onClick={() => setPicker((current) => (current === key ? null : key))}
          aria-haspopup="dialog"
          aria-expanded={picker === key}
          aria-label={`${label} — ${isDay(day) ? fmtDay(day, locale, timeZone) : t('order_select_date')}`}
        >
          <span className={`dash-field__value ${isDay(day) ? '' : 'is-empty'}`}>
            {isDay(day) ? fmtDay(day, locale, timeZone) : t('order_select_date')}
          </span>
        </button>
        <Icon name="calendar" size={16} className="dash-field__icon" />
      </span>
    </div>
  );

  return createPortal(
    <div
      className="dash-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dash-modal__card" role="dialog" aria-modal="true" aria-labelledby="dash-modal-title" ref={cardRef}>
        <header className="dash-modal__head">
          <h2 className="dash-modal__title" id="dash-modal-title">
            {t('dash_range_custom')}
          </h2>
          <p className="dash-modal__subtitle">{t('dash_range_hint')}</p>
          <button
            type="button"
            className="dash-modal__close"
            onClick={onClose}
            aria-label={t('action_close')}
            title={t('action_close')}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <form className="dash-modal__form" onSubmit={apply} noValidate>
          <div className="dash-modal__body">
            <div className="dash-modal__fields">
              {field('from', t('dash_range_from'), from, fromRef)}
              {field('to', t('dash_range_to'), to, toRef)}
            </div>

            {error ? (
              <p className="dash-modal__error" role="alert">
                <Icon name="alert" size={14} />
                {error}
              </p>
            ) : null}
          </div>

          <footer className="dash-modal__foot">
            <button type="button" className="dash-modal__btn" onClick={onClose}>
              {t('action_cancel')}
            </button>
            <button type="submit" className="dash-modal__btn dash-modal__btn--apply">
              {t('action_apply')}
            </button>
          </footer>
        </form>

        {picker ? (
          <DatePickerPopover
            anchorEl={(picker === 'from' ? fromRef : toRef).current}
            value={(picker === 'from' ? from : to) || today}
            today={today}
            timeZone={timeZone}
            onSelect={(day) => {
              if (picker === 'from') setFrom(day);
              else setTo(day);
              setError('');
            }}
            onClose={() => setPicker(null)}
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
