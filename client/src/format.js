/* Date/time/number formatting shared by every screen.
 *
 * Two rules drive every value the interface prints:
 *
 *  - Kurdish, Arabic and English always show Latin digits (0-9); Persian shows
 *    Persian digits (۰-۹). The numbering system is passed to Intl explicitly, so
 *    a browser's own locale data can never bring Arabic-Indic digits back.
 *  - Every date is numeric — 2026/10/31 — and every time is numeric — 14:35.
 *    No written month names anywhere. Persian keeps the Solar Hijri calendar,
 *    every other language keeps the Gregorian one.
 *
 * Digits are a display concern only: stored values, API payloads and inputs stay
 * canonical, which is why the helpers return strings and never mutate input.
 */

import ku from './i18n/ku';
import en from './i18n/en';
import fa from './i18n/fa';
import ar from './i18n/ar';

/* Persian calendar for Persian; Gregorian for the rest. */
const calendarFor = (locale) => (locale === 'fa' ? 'persian' : 'gregory');

/* Latin digits everywhere except Persian, which is the only language that
 * prints Persian digits. */
const numberTag = (locale) => (locale === 'fa' ? 'fa-IR-u-nu-arabext' : 'en-US-u-nu-latn');

/* Numeric calendar fields are always read in Latin digits, then mapped to the
 * language's own digits when they are assembled. */
const fieldsTag = (locale) => `en-US-u-ca-${calendarFor(locale)}-nu-latn`;

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * The language's digits for a ready-made string of numbers — chart axis labels,
 * a month number, a year. Persian maps to ۰-۹; every other language is left
 * exactly as it is.
 */
export function fmtDigits(text, locale) {
  const value = String(text ?? '');
  return locale === 'fa' ? value.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]) : value;
}

/* Kurdish weekday names — the browser usually ships no `ckb` data, so a Kurdish
 * weekday is read from the app's own dictionary. Weekday names are the only
 * names left in a date; months are always numeric. */
const KU_WEEKDAYS = Array.from({ length: 7 }, (_, i) => ku[`date_weekday_${i}`]);
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/* The calendar header needs one marker per column, so it uses the dictionaries'
 * compact weekday labels (three to five characters) instead of the full names a
 * sentence uses: a full Kurdish Thursday is wider than a seventh of the grid and
 * would push its column out of line with the dates below it. */
const DICTS = { ku, en, fa, ar };
const WEEKDAY_SHORT = Object.fromEntries(
  Object.entries(DICTS).map(([code, dict]) => [
    code,
    Array.from({ length: 7 }, (_, i) => dict[`date_weekday_short_${i}`]),
  ]),
);

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The zoned calendar fields of one instant, in Latin digits. */
function zonedFields(d, locale, timeZone) {
  const parts = new Intl.DateTimeFormat(fieldsTag(locale), {
    timeZone: timeZone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const at = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: at.year,
    month: String(at.month).padStart(2, '0'),
    day: String(at.day).padStart(2, '0'),
    hour: at.hour === '24' ? '00' : at.hour,
    minute: at.minute,
  };
}

/** Sunday-first weekday index of an instant on the business clock. */
function zonedWeekday(d, timeZone) {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, weekday: 'short' }).format(d);
  return WEEKDAY_INDEX[short] ?? 0;
}

/** yyyy/mm/dd in the language's own digits and calendar. */
const numericDate = (locale, f) => fmtDigits(`${f.year}/${f.month}/${f.day}`, locale);

export function zoneFor(locale, businessTimeZone) {
  return locale === 'fa' ? 'Asia/Tehran' : businessTimeZone || 'Asia/Baghdad';
}

/** A calendar date as numbers only: `2026/10/31`, `۱۴۰۵/۰۸/۰۹`. */
export function fmtDate(value, locale, timeZone, { weekday = false } = {}) {
  const d = toDate(value);
  if (!d) return '—';
  const date = numericDate(locale, zonedFields(d, locale, timeZone));
  if (!weekday) return date;
  return `${fmtWeekday(d, locale, timeZone, { long: true })}${locale === 'en' ? ', ' : '، '}${date}`;
}

/** The same numeric date, kept as its own name for the thermal receipt. */
export const fmtDateNumeric = (value, locale, timeZone) => fmtDate(value, locale, timeZone);

/** Weekday in front of the numeric date: «شەممە، 2026/10/31». */
export function fmtWeekdayDate(value, locale, timeZone) {
  return fmtDate(value, locale, timeZone, { weekday: true });
}

/** 24-hour clock in the language's digits: `14:35`, `۱۴:۳۵`. */
export function fmtTime(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '—';
  const f = zonedFields(d, locale, timeZone);
  return fmtDigits(`${f.hour}:${f.minute}`, locale);
}

/** The dashboard clock — the same numeric time, defaulting to now. */
export function fmtClock(value, locale, timeZone) {
  return fmtTime(toDate(value) || new Date(), locale, timeZone);
}

export function fmtDateTime(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '—';
  return `${fmtDate(d, locale, timeZone)} · ${fmtTime(d, locale, timeZone)}`;
}

/** Weekday on its own — the only written name left in a date. */
export function fmtWeekday(value, locale, timeZone, { long = false } = {}) {
  const d = toDate(value);
  if (!d) return '';
  if (locale === 'ku') return KU_WEEKDAYS[zonedWeekday(d, timeZone)];
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : safeLocale(locale), {
    weekday: long ? 'long' : 'short',
    timeZone: timeZone || undefined,
  }).format(d);
}

/** The calendar header's own compact weekday marker — see WEEKDAY_SHORT. */
export function fmtWeekdayShort(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '';
  return WEEKDAY_SHORT[locale]?.[zonedWeekday(d, timeZone)] || fmtWeekday(d, locale, timeZone);
}

/** Month bucket of a chart, as numbers: `10`, `۱۰`. */
export function fmtMonth(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '';
  return fmtDigits(zonedFields(d, locale, timeZone).month, locale);
}

export function fmtNumber(value, locale) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fmtDigits('0', locale);
  return new Intl.NumberFormat(numberTag(locale)).format(n);
}

/** Currencies Intl does not know are formatted with the label the guest reads. */
const CURRENCY_LABEL = { TOMAN: { en: 'Toman', other: 'تومان' } };

export function localizedCurrencyLabel(currency, locale) {
  const label = CURRENCY_LABEL[currency];
  if (label) return locale === 'en' ? label.en : label.other;
  return currency || '';
}

/** Whole-number currencies of the region, plus every currency Intl cannot name. */
const ZERO_DECIMAL = ['IQD', 'IRR'];

export function fmtMoney(value, currency, locale) {
  const n = Number(value) || 0;
  if (CURRENCY_LABEL[currency]) {
    return `${fmtNumber(n, locale)} ${localizedCurrencyLabel(currency, locale)}`;
  }
  if (locale === 'en') {
    try {
      return new Intl.NumberFormat(numberTag(locale), {
        style: 'currency',
        currency: currency || 'IQD',
        maximumFractionDigits: ZERO_DECIMAL.includes(currency) ? 0 : 2,
        minimumFractionDigits: 0,
      }).format(n);
    } catch {
      /* falls through to the plain code form */
    }
  }
  // The amount in the language's digits, the code untouched beside it — a code
  // is machine-readable and is never mirrored or re-scripted.
  return `${fmtNumber(n, locale)} ${currency || ''}`.trim();
}

/**
 * The same money split into amount and label, for cards that show the amount
 * large and the currency small beside it.
 */
export function fmtMoneyParts(value, currency, locale) {
  const n = Number(value) || 0;
  if (CURRENCY_LABEL[currency]) {
    return { number: fmtNumber(n, locale), symbol: localizedCurrencyLabel(currency, locale) };
  }
  if (locale === 'en') {
    try {
      const parts = new Intl.NumberFormat(numberTag(locale), {
        style: 'currency',
        currency: currency || 'IQD',
        maximumFractionDigits: ZERO_DECIMAL.includes(currency) ? 0 : 2,
        minimumFractionDigits: 0,
      }).formatToParts(n);
      const number = parts
        .filter((p) => ['integer', 'group', 'decimal', 'fraction', 'minusSign'].includes(p.type))
        .map((p) => p.value)
        .join('');
      const symbol = (parts.find((p) => p.type === 'currency')?.value || currency || '').trim();
      return { number, symbol };
    } catch {
      /* falls through to the plain code form */
    }
  }
  return { number: fmtNumber(n, locale), symbol: currency || '' };
}

export function fmtBytes(bytes, locale) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${fmtNumber(n, locale)} B`;
  if (n < 1024 * 1024) return `${fmtNumber(Math.round(n / 1024), locale)} KB`;
  return `${fmtNumber((n / (1024 * 1024)).toFixed(1), locale)} MB`;
}

/** yyyy-mm-dd in the given zone, for date inputs and filters. */
export function isoDay(value, timeZone) {
  const d = toDate(value) || new Date();
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timeZone || 'UTC',
  }).format(d);
}

/** Midnight-free anchor for a `yyyy-mm-dd` calendar day (noon UTC keeps it stable). */
function dayToDate(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

/** A `yyyy-mm-dd` calendar day as numbers: `2026/10/31`, `۱۴۰۵/۰۸/۰۹`. */
export function fmtDay(ymd, locale, timeZone, { weekday = false } = {}) {
  const d = dayToDate(ymd);
  if (!d) return '—';
  return fmtDate(d, locale, timeZone, { weekday });
}

/** Steps a `yyyy-mm-dd` day by whole days — plain date maths, no zone shifts. */
export function addDaysToDay(ymd, days) {
  const d = dayToDate(ymd) || dayToDate(isoDay(new Date(), 'UTC'));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * An absolute instant as the `yyyy-mm-ddThh:mm` value a datetime-local input
 * needs, read on the business's own clock — so reopening an advertisement shows
 * the very time its owner set, not the server's UTC one.
 */
export function toZonedInput(value, timeZone) {
  const d = toDate(value);
  if (!d) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);
  const at = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${at.year}-${at.month}-${at.day}T${at.hour === '24' ? '00' : at.hour}:${at.minute}`;
}

/** The Intl tag used where a component needs locale data itself (calendar grids). */
export function safeLocale(locale) {
  const candidate = { en: 'en-GB', ku: 'ckb-IQ', fa: 'fa-IR', ar: 'ar-IQ' }[locale] || 'en-GB';
  try {
    new Intl.DateTimeFormat(candidate);
    return candidate;
  } catch {
    return 'en-GB';
  }
}
