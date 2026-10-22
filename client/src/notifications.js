/*
 * Notification priorities.
 *
 * One place decides both the badge colour and the number on it, so the header
 * bell can never disagree with the panel:
 *   unread orders   → purple  (highest)
 *   unread reviews  → gold
 *   unread activity → red
 *   nothing unread  → no badge
 * The count is always the total unread across all three categories; only the
 * colour follows the highest-priority category that still has unread rows.
 */

/** Category of a stored notification type. */
export function categoryOf(type) {
  if (type === 'review') return 'reviews';
  if (type === 'activity') return 'activities';
  return 'orders'; // new_order + status_change
}

export const CATEGORY_TABS = ['all', 'orders', 'reviews', 'activities'];

/** Highest-priority unread category wins; the number is the full total. */
export function priorityOf(unread) {
  const orders = Number(unread?.orders) || 0;
  const reviews = Number(unread?.reviews) || 0;
  const activities = Number(unread?.activities) || 0;
  const total = orders + reviews + activities;
  const tone = orders > 0 ? 'purple' : reviews > 0 ? 'gold' : activities > 0 ? 'red' : 'none';
  return { total, tone };
}

/** Compact readable count for the badge. */
export function compactCount(total) {
  return total > 99 ? '99+' : String(total);
}

const INTL_LOCALE = { en: 'en-GB', ku: 'ckb', fa: 'fa', ar: 'ar' };

/**
 * Localized relative time ("5 minutes ago"). Falls back to an absolute date if
 * the browser has no relative formatting for the language.
 */
export function relativeTime(value, locale, formatter) {
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
  if (!pick) return formatter ? formatter(date) : date.toLocaleDateString();
  try {
    return new Intl.RelativeTimeFormat(INTL_LOCALE[locale] || 'en-GB', { numeric: 'auto' }).format(
      pick[0],
      pick[1],
    );
  } catch {
    return formatter ? formatter(date) : date.toLocaleString();
  }
}
