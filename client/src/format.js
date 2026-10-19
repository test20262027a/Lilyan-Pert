/* Date/time/number formatting. Persian uses the Solar Hijri calendar + Iran time. */

const INTL_LOCALE = {
  en: 'en-GB',
  ku: 'ckb-IQ',
  fa: 'fa-IR-u-ca-persian',
  ar: 'ar-IQ',
};

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
  const options = short
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  if (weekday) options.weekday = 'long';
  return new Intl.DateTimeFormat(safeLocale(locale), { ...options, timeZone }).format(d);
}

export function fmtTime(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '—';
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

/** Short weekday label used by the dashboard charts. */
export function fmtWeekday(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(safeLocale(locale), { weekday: 'short', timeZone }).format(d);
}

/** Short month label for month-bucketed charts. */
export function fmtMonth(value, locale, timeZone) {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(safeLocale(locale), { month: 'short', timeZone }).format(d);
}

export function fmtNumber(value, locale) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat(safeLocale(locale)).format(n);
}

export function fmtMoney(value, currency, locale) {
  const n = Number(value) || 0;
  const zeroDecimal = ['IQD', 'IRR'].includes(currency);
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
  const zeroDecimal = ['IQD', 'IRR'].includes(currency);
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
