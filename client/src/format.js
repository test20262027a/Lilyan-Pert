/* Date/time/number formatting. Persian uses the Solar Hijri calendar + Iran time. */

import ku from './i18n/ku';

const INTL_LOCALE = {
  en: 'en-GB',
  ku: 'ckb-IQ',
  fa: 'fa-IR-u-ca-persian',
  ar: 'ar-IQ',
};

/*
 * Kurdish (Sorani) calendar and digit data.
 *
 * Most browsers ship no `ckb` data at all: `new Intl.DateTimeFormat('ckb')`
 * does not throw, it silently answers in the browser's own language, so the
 * Kurdish interface would print "Thursday, 29 October 2026" and Latin digits.
 * The names therefore live in the translation dictionary, and the helpers below
 * format them directly whenever the browser cannot.
 */
const KU_MONTHS = Array.from({ length: 12 }, (_, i) => ku[`date_month_${i + 1}`]);
const KU_WEEKDAYS = Array.from({ length: 7 }, (_, i) => ku[`date_weekday_${i}`]);
const KU_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const inKurdishDigits = (value) =>
  String(value)
    .replace(/\d/g, (d) => KU_DIGITS[Number(d)])
    .replace(/,/g, '٬')
    .replace(/\./g, '٫');

/** Whether the browser really holds data for a tag, or only falls back to English. */
const PROBE = new Date(Date.UTC(2026, 9, 29, 12));
const EN_PROBE = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(PROBE);
const SUPPORT = new Map();
function hasIntlData(tag) {
  if (tag.startsWith('en')) return true;
  if (SUPPORT.has(tag)) return SUPPORT.get(tag);
  let ok = false;
  try {
    ok = new Intl.DateTimeFormat(tag, { month: 'long', timeZone: 'UTC' }).format(PROBE) !== EN_PROBE;
  } catch {
    ok = false;
  }
  SUPPORT.set(tag, ok);
  return ok;
}

/** True when a locale must be formatted from the app's own Kurdish data. */
const isKurdishOnly = (locale) => locale === 'ku' && !hasIntlData(INTL_LOCALE.ku);

/** The zoned calendar fields of one instant, in Latin digits, for manual formatting. */
function zonedFields(d, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(d);
  const at = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = at.hour === '24' ? '00' : at.hour;
  return {
    year: at.year,
    month: Number(at.month),
    day: Number(at.day),
    hour,
    minute: at.minute,
    // Sunday-first index, read from the same zoned calendar day.
    weekday: new Date(Date.UTC(Number(at.year), Number(at.month) - 1, Number(at.day))).getUTCDay(),
  };
}

function safeLocale(locale) {
  const candidate = INTL_LOCALE[locale] || 'en-GB';
  try {
    new Intl.DateTimeFormat(candidate);
    return candidate;
  } catch {
    return 'en-GB';
  }
}

/** Persian is displayed in Iran-local time; everything else uses the business timezone. */
export function zoneFor(locale, businessTimeZone) {
  return locale === 'fa' ? 'Asia/Tehran' : businessTimeZone || 'Asia/Baghdad';
}

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value, locale, timeZone, { weekday = false, short = false } = {}) {
  const d = toDate(value);
  if (!d) return '—';
  if (isKurdishOnly(locale)) {
    const f = zonedFields(d, timeZone);
    // Kurdish has no abbreviated month names, so `short` uses the same names.
    const day = `${inKurdishDigits(f.day)}ی ${KU_MONTHS[f.month - 1]}ی ${inKurdishDigits(f.year)}`;
    return weekday ? `${KU_WEEKDAYS[f.weekday]}، ${day}` : day;
  }
  const options = short
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  if (weekday) options.weekday = 'long';
  return new Intl.DateTimeFormat(safeLocale(locale), { ...options, timeZone }).format(d);
}

/**
 * A calendar date as plain numbers — «29/03/2024» — for the thermal receipt,
 * where a written month costs a line and prints unevenly. Kurdish digits, the
 * Persian calendar and the business timezone keep their own numbering.
 */
export function fmtDateNumeric(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '—';
  if (isKurdishOnly(locale)) {
    const f = zonedFields(d, timeZone);
    return inKurdishDigits(
      `${String(f.day).padStart(2, '0')}/${String(f.month).padStart(2, '0')}/${f.year}`,
    );
  }
  return new Intl.DateTimeFormat(safeLocale(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(d);
}

/**
 * Full calendar date with the weekday in front: «پنجشنبه، ۳۰ مهر ۱۴۰۵» /
 * «Thursday, 22 October 2026». Built from two formatters because the CLDR
 * Persian order puts the weekday last, which reads backwards in this card.
 */
export function fmtWeekdayDate(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '—';
  const weekday = fmtWeekday(d, locale, timeZone, { long: true });
  return `${weekday}${locale === 'en' ? ',' : '،'} ${fmtDate(d, locale, timeZone)}`;
}

export function fmtTime(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '—';
  if (isKurdishOnly(locale)) {
    const f = zonedFields(d, timeZone);
    return inKurdishDigits(`${f.hour}:${f.minute}`);
  }
  return new Intl.DateTimeFormat(safeLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(d);
}

/**
 * Wall-clock time for the dashboard clock: 24-hour, in the business timezone,
 * with the digits of the active language (۰۹:۴۷ / ٠٩:٤٧ / 09:47).
 */
export function fmtClock(value, locale, timeZone) {
  const d = toDate(value) || new Date();
  if (isKurdishOnly(locale)) {
    const f = zonedFields(d, timeZone);
    return inKurdishDigits(`${f.hour}:${f.minute}`);
  }
  return new Intl.DateTimeFormat(safeLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(d);
}

export function fmtDateTime(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '—';
  return `${fmtDate(d, locale, timeZone, { short: true })} · ${fmtTime(d, locale, timeZone)}`;
}

/**
 * Weekday label: short for the dashboard charts, `long` for the working-hours
 * card and anything else that shows the day on its own.
 */
export function fmtWeekday(value, locale, timeZone, { long = false } = {}) {
  const d = toDate(value);
  if (!d) return '';
  if (isKurdishOnly(locale)) return KU_WEEKDAYS[zonedFields(d, timeZone).weekday];
  return new Intl.DateTimeFormat(safeLocale(locale), {
    weekday: long ? 'long' : 'short',
    timeZone,
  }).format(d);
}

/** Short month label for month-bucketed charts. */
export function fmtMonth(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '';
  if (isKurdishOnly(locale)) return KU_MONTHS[zonedFields(d, timeZone).month - 1];
  return new Intl.DateTimeFormat(safeLocale(locale), { month: 'short', timeZone }).format(d);
}

export function fmtNumber(value, locale) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (isKurdishOnly(locale)) return inKurdishDigits(new Intl.NumberFormat('en-US').format(n));
  return new Intl.NumberFormat(safeLocale(locale)).format(n);
}

/** Currencies Intl does not know are formatted with the label the guest reads. */
const CURRENCY_LABEL = { TOMAN: { en: 'Toman', other: 'تومان' } };

export function localizedCurrencyLabel(currency, locale) {
  const label = CURRENCY_LABEL[currency];
  if (label) return locale === 'en' ? label.en : label.other;
  return currency || '';
}

export function fmtMoney(value, currency, locale) {
  const n = Number(value) || 0;
  const label = CURRENCY_LABEL[currency];
  if (label) {
    // Toman is a whole-number currency in every language; the label is written
    // in the guest's own script, never as IRR/ریال.
    return `${fmtNumber(n, locale)} ${localizedCurrencyLabel(currency, locale)}`;
  }
  const zeroDecimal = ['IQD', 'IRR'].includes(currency);
  if (isKurdishOnly(locale)) return `${fmtNumber(n, locale)} ${currency || ''}`.trim();
  try {
    return new Intl.NumberFormat(safeLocale(locale), {
      style: 'currency',
      currency: currency || 'IQD',
      maximumFractionDigits: zeroDecimal ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${fmtNumber(n, locale)} ${currency || ''}`.trim();
  }
}

/**
 * The same money formatting as `fmtMoney`, split into its number and its
 * localized currency label — the product cards show the amount large and the
 * currency small beside it without changing how either is formatted.
 */
export function fmtMoneyParts(value, currency, locale) {
  const n = Number(value) || 0;
  if (CURRENCY_LABEL[currency]) {
    return { number: fmtNumber(n, locale), symbol: localizedCurrencyLabel(currency, locale) };
  }
  const zeroDecimal = ['IQD', 'IRR'].includes(currency);
  if (isKurdishOnly(locale)) return { number: fmtNumber(n, locale), symbol: currency || '' };
  try {
    const parts = new Intl.NumberFormat(safeLocale(locale), {
      style: 'currency',
      currency: currency || 'IQD',
      maximumFractionDigits: zeroDecimal ? 0 : 2,
      minimumFractionDigits: 0,
    }).formatToParts(n);
    const number = parts
      .filter((p) => ['integer', 'group', 'decimal', 'fraction', 'minusSign'].includes(p.type))
      .map((p) => p.value)
      .join('');
    const symbol = (parts.find((p) => p.type === 'currency')?.value || currency || '').trim();
    return { number, symbol };
  } catch {
    return { number: fmtNumber(n, locale), symbol: currency || '' };
  }
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
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timeZone || 'UTC',
  }).format(d);
  return parts;
}

/** Midnight-free anchor for a `yyyy-mm-dd` calendar day (noon UTC keeps it stable). */
function dayToDate(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

/**
 * A calendar day (`yyyy-mm-dd`) in the active language: `numeric` gives the
 * compact pill form (09/27/2026, ۲۷/۰۹/۲۰۲۶ …), the default the long one.
 */
export function fmtDay(ymd, locale, timeZone, { weekday = false, numeric = false } = {}) {
  const d = dayToDate(ymd);
  if (!d) return '—';
  if (isKurdishOnly(locale)) {
    const f = zonedFields(d, timeZone);
    const body = numeric
      ? `${inKurdishDigits(f.day)}/${inKurdishDigits(String(f.month).padStart(2, '0'))}/${inKurdishDigits(f.year)}`
      : `${inKurdishDigits(f.day)}ی ${KU_MONTHS[f.month - 1]}ی ${inKurdishDigits(f.year)}`;
    return weekday ? `${KU_WEEKDAYS[f.weekday]}، ${body}` : body;
  }
  const options = numeric
    ? { year: 'numeric', month: '2-digit', day: '2-digit' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  if (weekday) options.weekday = 'long';
  return new Intl.DateTimeFormat(safeLocale(locale), { ...options, timeZone }).format(d);
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
