/*
 * Notification priorities.
 *
 * One place decides the badge's colour, its three-colour proportions and the
 * number on it, so the header bell can never disagree with the panel:
 *   unread orders   → green (highest)
 *   unread reviews  → gold
 *   unread activity → red
 *   nothing unread  → no badge
 * The count is always the total unread across all three categories. The bell's
 * plate splits itself into those three colours by each category's share of
 * that total, and the bell button behind it follows the highest-priority
 * category that still has unread rows.
 */

import { fmtDateTime, fmtDigits } from './format';

/**
 * Category of a stored notification type. Read from the event type itself, so
 * a translation or a title can never move a row between tabs:
 *   new_order     → orders      (an order was created)
 *   status_change → activities  (an existing order moved status)
 *   activity      → activities  (any other system event)
 *   review        → reviews
 */
export function categoryOf(type) {
  if (type === 'review') return 'reviews';
  if (type === 'activity' || type === 'status_change') return 'activities';
  return 'orders';
}

export const CATEGORY_TABS = ['all', 'orders', 'reviews', 'activities', 'unread'];

/** Highest-priority unread category wins; the number is the full total. */
export function priorityOf(unread) {
  const orders = Number(unread?.orders) || 0;
  const reviews = Number(unread?.reviews) || 0;
  const activities = Number(unread?.activities) || 0;
  const total = orders + reviews + activities;
  const tone = orders > 0 ? 'green' : reviews > 0 ? 'gold' : activities > 0 ? 'red' : 'none';
  return { total, tone };
}

/**
 * Proportions of the summary badge's three colours, as the two boundaries a
 * single linear-gradient needs: green (orders) owns everything before `s1`,
 * gold (reviews) everything up to `s2`, coral (activity) the rest. Each slice
 * is its category's share of the unread total, so a category with nothing
 * unread collapses to zero width and one busy category fills the plate alone.
 * With nothing unread the plate is one solid green — the badge itself is not
 * shown in that state.
 */
export function unreadSlices(unread) {
  const orders = Number(unread?.orders) || 0;
  const reviews = Number(unread?.reviews) || 0;
  const activities = Number(unread?.activities) || 0;
  const total = orders + reviews + activities;
  if (total <= 0) return { s1: '100%', s2: '100%' };
  const pct = (n) => `${Math.round((n / total) * 10000) / 100}%`;
  return { s1: pct(orders), s2: pct(orders + reviews) };
}

/** Compact readable count for the badge. */
export function compactCount(total) {
  return total > 99 ? '99+' : String(total);
}

/* The numbering system is part of the tag, so a relative time is printed in the
   digits of the language that is showing it (Latin everywhere but Persian). */
const INTL_LOCALE = {
  en: 'en-GB',
  ku: 'ckb',
  fa: 'fa-IR-u-nu-arabext',
  ar: 'ar-IQ-u-nu-latn',
};

/** The translation key for one relative-time unit. */
const RELATIVE_KEYS = {
  second: 'rel_seconds_ago',
  minute: 'rel_minutes_ago',
  hour: 'rel_hours_ago',
  day: 'rel_days_ago',
};

/**
 * Localized relative time ("5 minutes ago"). Falls back to an absolute date if
 * the browser has no relative formatting for the language.
 *
 * Some browsers ship no Kurdish relative-time data and answer with a Latin unit
 * ("‑٥ d"), so a Latin unit in a non-English locale is treated as missing data
 * and rendered from the app's own translation keys instead.
 */
export function relativeTime(value, locale, formatter, t) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const pick =
    abs < 60
      ? [seconds, 'second']
      : abs < 3600
        ? [Math.round(seconds / 60), 'minute']
        : abs < 86400
          ? [Math.round(seconds / 3600), 'hour']
          : abs < 604800
            ? [Math.round(seconds / 86400), 'day']
            : null;
  if (!pick) return formatter ? formatter(date) : fmtDateTime(date, locale);
  let text = '';
  try {
    text = new Intl.RelativeTimeFormat(INTL_LOCALE[locale] || 'en-GB', { numeric: 'auto' }).format(
      pick[0],
      pick[1],
    );
  } catch {
    text = '';
  }
  const missingData = !text || (locale !== 'en' && /[A-Za-z]/.test(text));
  if (missingData) {
    if (t) return t(RELATIVE_KEYS[pick[1]], { count: fmtDigits(Math.abs(pick[0]), locale) });
    return formatter ? formatter(date) : fmtDateTime(date, locale);
  }
  return text;
}
