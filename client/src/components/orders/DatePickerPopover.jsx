import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { addDaysToDay, fmtWeekday } from '../../format';

/*
 * The Orders calendar.
 *
 * Every day it handles is a plain `yyyy-mm-dd` Gregorian calendar day — the
 * same value the API filters on — so selecting a day can never drift through a
 * timezone. What the user *sees* is that day in the active language's own
 * calendar: the grid asks `Intl` for the Persian/Jalali (or Gregorian) year,
 * month and day of each candidate date, so a Persian user picks «۵ آبان» and
 * the popover hands back the matching Gregorian day. Nothing is hardcoded and
 * no second calendar system is stored anywhere.
 */

/* Latin digits everywhere but Persian, and the Persian calendar for Persian —
   the same numbering rules the shared formatters apply. */
const INTL = {
  en: 'en-GB',
  ku: 'ckb-IQ',
  fa: 'fa-IR-u-ca-persian-nu-arabext',
  ar: 'ar-IQ-u-nu-latn',
};
const FALLBACK = 'en-GB';

function safeLocale(locale) {
  const tag = INTL[locale] || FALLBACK;
  try {
    new Intl.DateTimeFormat(tag);
    return tag;
  } catch {
    return FALLBACK;
  }
}

/** Intl may render numbers in the locale's own digits; calendar maths needs Latin ones. */
const latin = (value) =>
  String(value)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

const noon = (ymd) => new Date(`${ymd}T12:00:00Z`);

/** The active calendar's year/month for a Gregorian calendar day. */
function calendarMonth(ymd, tag, timeZone) {
  const parts = new Intl.DateTimeFormat(tag, {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(noon(ymd));
  const at = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { year: Number(latin(at.year)), month: Number(latin(at.month)) };
}

/** Every day of the calendar month that contains `ymd`, as Gregorian days. */
function monthOf(ymd, tag, timeZone) {
  const head = calendarMonth(ymd, tag, timeZone);
  const same = (day) => {
    const p = calendarMonth(day, tag, timeZone);
    return p.year === head.year && p.month === head.month;
  };
  let start = ymd;
  for (let i = 0; i < 40; i += 1) {
    const prev = addDaysToDay(start, -1);
    if (!same(prev)) break;
    start = prev;
  }
  let end = ymd;
  for (let i = 0; i < 40; i += 1) {
    const next = addDaysToDay(end, 1);
    if (!same(next)) break;
    end = next;
  }
  const days = [];
  for (let day = start; day <= end; day = addDaysToDay(day, 1)) days.push(day);
  return { ...head, start, end, days };
}

/** 0 = Sunday … 6 = Saturday, as the locale writes its weeks. */
function weekStart(tag, locale) {
  try {
    const intl = new Intl.Locale(tag);
    const info = intl.getWeekInfo ? intl.getWeekInfo() : intl.weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
  } catch {
    /* older engines: fall through to the regional default */
  }
  return locale === 'en' ? 0 : 6;
}

export default function DatePickerPopover({ anchorEl, value, today, timeZone, onSelect, onClose }) {
  const { t, locale, rtl } = useI18n();
  const tag = safeLocale(locale);
  const cardRef = useRef(null);
  const [view, setView] = useState(value);
  const [focus, setFocus] = useState(value);
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });

  const grid = useMemo(() => monthOf(view, tag, timeZone), [view, tag, timeZone]);
  const first = weekStart(tag, locale);
  const leading = (noon(grid.start).getUTCDay() - first + 7) % 7;

  // Numeric month, never a written one: 2026/10 — ۱۴۰۵/۰۸ in Persian.
  const heading = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, { timeZone, month: '2-digit', year: 'numeric' }).format(noon(grid.start)),
    [tag, timeZone, grid.start],
  );
  /* Weekday names come from the shared formatter, which knows the app's own
     Kurdish names — the browser has no `ckb` data and would answer in English. */
  const weekdayLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < 7; i += 1) {
      labels.push(fmtWeekday(noon(addDaysToDay('2024-01-07', i)), locale, timeZone));
    }
    return labels.slice(first).concat(labels.slice(0, first));
  }, [locale, timeZone, first]);
  const dayLabel = useCallback(
    (ymd) => new Intl.DateTimeFormat(tag, { timeZone, day: 'numeric' }).format(noon(ymd)),
    [tag, timeZone],
  );

  /* ------------------------------------------------------------- placement */

  const place = useCallback(() => {
    const anchor = anchorEl?.getBoundingClientRect();
    const card = cardRef.current;
    if (!anchor || !card) return;
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const margin = 8;
    const gap = 8;
    const preferred = rtl ? anchor.right - width : anchor.left;
    const left = Math.max(margin, Math.min(preferred, vw - width - margin));
    let top = anchor.bottom + gap;
    if (top + height > vh - margin && anchor.top - height - gap >= margin) top = anchor.top - height - gap;
    top = Math.max(margin, Math.min(top, vh - height - margin));
    setPos((current) =>
      current.ready && current.top === top && current.left === left ? current : { top, left, ready: true },
    );
  }, [anchorEl, rtl]);

  // Measured after paint, so the popover knows its own size before it appears.
  useLayoutEffect(() => {
    place();
  }, [place, grid.start]);

  useEffect(() => {
    const onScroll = () => place();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [place]);

  // A click anywhere outside the popover (or on the trigger, which toggles it) closes it.
  useEffect(() => {
    const onPointerDown = (event) => {
      if (cardRef.current?.contains(event.target)) return;
      if (anchorEl?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [anchorEl, onClose]);

  // The focused day owns the keyboard, and keeps itself on the visible month.
  useEffect(() => {
    cardRef.current?.querySelector(`[data-day="${focus}"]`)?.focus();
  }, [focus, grid.start]);

  /* -------------------------------------------------------------- keyboard */

  const step = (days) => {
    const next = addDaysToDay(focus, days);
    setFocus(next);
    setView(next);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const forward = event.key === 'ArrowRight' ? 1 : -1;
      step(rtl ? -forward : forward);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      step(event.key === 'ArrowDown' ? 7 : -7);
      return;
    }
    if (event.key === 'PageDown' || event.key === 'PageUp') {
      event.preventDefault();
      const next = addDaysToDay(event.key === 'PageDown' ? grid.end : grid.start, event.key === 'PageDown' ? 1 : -1);
      setView(next);
      setFocus(next);
    }
  };

  const choose = (ymd) => {
    onSelect(ymd);
    onClose();
  };

  return createPortal(
    <div
      ref={cardRef}
      className={`odate__pop ${pos.ready ? 'is-placed' : ''}`}
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-label={t('order_select_date')}
      onKeyDown={onKeyDown}
    >
      <header className="odate__pop-head">
        <button
          type="button"
          className="odate__pop-nav"
          onClick={() => setView(addDaysToDay(grid.start, -1))}
          aria-label={t('order_prev_month')}
          title={t('order_prev_month')}
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <span className="odate__pop-title" aria-live="polite">
          {heading}
        </span>
        <button
          type="button"
          className="odate__pop-nav"
          onClick={() => setView(addDaysToDay(grid.end, 1))}
          aria-label={t('order_next_month')}
          title={t('order_next_month')}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </header>

      <div className="odate__pop-week" aria-hidden="true">
        {weekdayLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <div className="odate__pop-grid" role="grid">
        {Array.from({ length: leading }, (_, index) => (
          <span key={`pad-${index}`} className="odate__pop-pad" aria-hidden="true" />
        ))}
        {grid.days.map((ymd) => (
          <button
            key={ymd}
            type="button"
            data-day={ymd}
            className={`odate__pop-day ${ymd === value ? 'is-selected' : ''} ${ymd === today ? 'is-today' : ''}`}
            aria-pressed={ymd === value}
            aria-current={ymd === today ? 'date' : undefined}
            tabIndex={ymd === focus ? 0 : -1}
            onClick={() => choose(ymd)}
          >
            {dayLabel(ymd)}
          </button>
        ))}
      </div>

      <footer className="odate__pop-foot">
        <button type="button" className="odate__pop-today" onClick={() => choose(today)}>
          <Icon name="calendar" size={14} />
          {t('order_today')}
        </button>
      </footer>
    </div>,
    document.body,
  );
}
