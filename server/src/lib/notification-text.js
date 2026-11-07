/**
 * The words a system notification shows, in the language of the device it
 * lands on.
 *
 * A push payload is rendered by the service worker — there is no page, no i18n
 * provider and no session behind it — so the text is composed here, on the
 * server, per subscription. Every number in it is converted to that language's
 * digits: Latin for Kurdish, Arabic and English, Persian for Persian.
 *
 * Only labels are translated. The business name, table name, currency code and
 * any product text are the owner's own data and are printed exactly as stored.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Digits as the language writes them. Persian is the only non-Latin one here. */
export function localizeDigits(value, locale) {
  const text = String(value ?? '');
  if (locale !== 'fa') return text;
  return text.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

const TEXT = {
  ku: {
    new_order: 'داواکارییەکی نوێ',
    test: 'ئاگادارکردنەوەی تاقیکاری',
    order: (n) => `داواکاری #${n}`,
    table: (v) => `مێز: ${v}`,
    time: (v) => `کات: ${v}`,
    items: (n) => `${n} بەرهەم`,
  },
  fa: {
    new_order: 'سفارش جدید',
    test: 'اعلان آزمایشی',
    order: (n) => `سفارش #${n}`,
    table: (v) => `میز: ${v}`,
    time: (v) => `زمان: ${v}`,
    items: (n) => `${n} آیتم`,
  },
  ar: {
    new_order: 'طلب جديد',
    test: 'إشعار تجريبي',
    order: (n) => `طلب #${n}`,
    table: (v) => `طاولة: ${v}`,
    time: (v) => `الوقت: ${v}`,
    items: (n) => `${n} عنصر`,
  },
  en: {
    new_order: 'New order',
    test: 'Test notification',
    order: (n) => `Order #${n}`,
    table: (v) => `Table: ${v}`,
    time: (v) => `Time: ${v}`,
    items: (n) => `${n} ${Number(n) === 1 ? 'item' : 'items'}`,
  },
};

/** The vocabulary of one language; an unknown code reads as English. */
export function notificationWords(locale) {
  return TEXT[locale] || TEXT.en;
}

export const newOrderTitle = (locale) => notificationWords(locale).new_order;

export const testTitle = (locale) => notificationWords(locale).test;

/**
 * One new order, the way the example reads: the brand first (the line staff
 * recognise on a locked phone), then the order number, the table, the time and
 * a one-line summary of quantity and total.
 */
export function newOrderMessage(locale, order) {
  const w = notificationWords(locale);
  const d = (value) => localizeDigits(value, locale);
  const lines = [order.businessName || ''];

  if (order.orderNumber) lines.push(w.order(d(order.orderNumber)));
  if (order.tableName) lines.push(w.table(d(order.tableName)));
  if (order.time) lines.push(w.time(d(order.time)));

  const summary = [order.itemCount === null || order.itemCount === undefined
    ? ''
    : w.items(d(order.itemCount)), d(order.total)].filter(Boolean).join(' · ');
  if (summary) lines.push(summary);

  return { title: w.new_order, body: lines.filter(Boolean).join('\n') };
}

/** The test push says which language the device is now subscribed to. */
export function testMessage(locale, businessName) {
  const w = notificationWords(locale);
  return { title: businessName || 'Lilyan Pert', body: w.test };
}
