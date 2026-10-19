/*
 * Reporting windows for the dashboard. Every boundary is computed in the
 * business timezone — never in the server's or the browser's zone — so "today"
 * means the same day for the restaurant and for the report it reads.
 */

const DAY_MS = 86400000;

/** Validates an IANA zone name and falls back to UTC so SQL can never blow up. */
export function safeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/** `YYYY-MM-DD` of the wall-clock day inside `timeZone`. */
export function localDay(timeZone, at = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

const toUTC = (day) => new Date(`${day}T00:00:00.000Z`);
const fromUTC = (d) => d.toISOString().slice(0, 10);
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));

export const addDays = (day, n) => fromUTC(new Date(toUTC(day).getTime() + n * DAY_MS));

export const addMonths = (day, n) => {
  const d = toUTC(day);
  d.setUTCMonth(d.getUTCMonth() + n);
  return fromUTC(d);
};

export const addYears = (day, n) => addMonths(day, n * 12);

/** Inclusive day count between two `YYYY-MM-DD` values. */
export const dayCount = (from, to) => Math.round((toUTC(to) - toUTC(from)) / DAY_MS) + 1;

/** Monday-based week start, so "This Week" reads the same in every locale. */
const weekStart = (day) => addDays(day, -(((toUTC(day).getUTCDay() + 6) % 7)));
const monthStart = (day) => `${day.slice(0, 7)}-01`;
const yearStart = (day) => `${day.slice(0, 4)}-01-01`;

/** Resolves a requested range into a concrete inclusive window. */
export function rangeWindow(range, timeZone, { from, to } = {}) {
  const today = localDay(timeZone);
  switch (range) {
    case 'today':
      return { key: 'today', from: today, to: today };
    case 'week':
      return { key: 'week', from: weekStart(today), to: today };
    case 'month':
      return { key: 'month', from: monthStart(today), to: today };
    case 'year':
      return { key: 'year', from: yearStart(today), to: today };
    case 'custom': {
      const a = isDay(from) ? from : today;
      const b = isDay(to) ? to : a;
      // A reversed pick is normalised instead of being rejected outright.
      return a <= b ? { key: 'custom', from: a, to: b } : { key: 'custom', from: b, to: a };
    }
    default:
      return { key: 'all', from: null, to: null };
  }
}

/** The same-length window immediately before `win` — null for "all time". */
export function previousWindow(win) {
  if (!win.from) return null;
  const len = dayCount(win.from, win.to);
  const to = addDays(win.from, -1);
  return { from: addDays(to, -(len - 1)), to };
}

/** Bucket unit for the order-flow series, chosen so the axis stays readable. */
export function seriesUnit(win, spanDays) {
  if (win.key === 'today') return 'hour';
  if (win.key === 'year') return 'month';
  if (win.key === 'all') return spanDays > 730 ? 'year' : 'month';
  if (win.key === 'custom') return spanDays <= 31 ? 'day' : spanDays <= 400 ? 'month' : 'year';
  return 'day';
}

/** Every bucket label of a unit between two days — empty buckets included. */
export function buckets(unit, from, to) {
  const out = [];
  if (!from || !to || from > to) return out;
  if (unit === 'hour') {
    for (let h = 0; h < 24; h += 1) out.push(String(h).padStart(2, '0'));
    return out;
  }
  if (unit === 'day') {
    for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
    return out;
  }
  if (unit === 'month') {
    for (let m = monthStart(from); m <= to; m = addMonths(m, 1)) out.push(m);
    return out;
  }
  for (let y = yearStart(from); y <= to; y = addYears(y, 1)) out.push(y);
  return out;
}

/** Percentage change against the previous period; null when there is no base. */
export function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous);
  if (!Number.isFinite(p) || p === 0) return null;
  return Math.round(((c - p) / p) * 100);
}
