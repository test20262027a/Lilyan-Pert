/*
 * The fifteen automatic receipt messages — one canonical list shared by the
 * Text Editor and the receipt renderer. Order-change audit is intentionally
 * absent: it is internal and only ever appears in the Order Details timeline.
 *
 * Messages 1–13 are the receipt's own labels (order number, totals, …) and are
 * printed in their place in the layout. Messages 14–15 are closing messages:
 * a receipt prints exactly ONE of them, picked by selectReceiptFooterMessage().
 *
 * A business never gets a copy of the defaults in the database: the stored
 * override lives in `businesses.editable_text.receipt_messages[key]` and only
 * holds values an administrator actually changed. Every reader resolves
 * override → default, so printing is byte-identical to what the receipt
 * printed before this editor existed until someone edits a line.
 *
 * Placeholders are plain `{token}` names. They are replaced as text (never as
 * HTML) by renderText() below, so a message can never inject markup into the
 * printed receipt.
 */

import { getDefaultEnabledLanguage, getEnabledLanguages } from './languages';

export const MESSAGE_LOCALES = ['ku', 'fa', 'ar', 'en'];

/** The only dynamic tokens a receipt message may use. */
export const SUPPORTED_PLACEHOLDERS = [
  'business_name',
  'order_number',
  'table',
  'customer_name',
  'date',
  'total',
  'currency',
];

const message = (key, ku, fa, ar, en) => ({ key, default: { ku, fa, ar, en } });

export const RECEIPT_MESSAGES = [
  // 01–05: the order identity block printed at the top of a receipt.
  message('order_no', 'داواکاری', 'سفارش', 'طلب', 'Order'),
  message('table', 'مێز', 'میز', 'طاولة', 'Table'),
  message('datetime', 'بەروار', 'تاریخ', 'التاريخ', 'Date'),
  message('customer', 'کڕیار', 'مشتری', 'العميل', 'Customer'),
  message('cashier', 'کاشێر', 'صندوق‌دار', 'أمين الصندوق', 'Cashier'),
  // 06–07: the two column headings above the item lines.
  message('items', 'بڕگە', 'قلم', 'عنصر', 'Item'),
  message('total_column', 'کۆی گشتی', 'مجموع', 'الإجمالي', 'Total'),
  // 08–12: the money block, printed in this order.
  message('subtotal', 'کۆی بڕگەکان', 'جمع اقلام', 'المجموع الفرعي', 'Subtotal'),
  message('discount', 'داشکاندن', 'تخفیف', 'الخصم', 'Discount'),
  message('tax', 'باج', 'مالیات', 'الضريبة', 'Tax'),
  message('service_charge', 'خزمەتگوزاری', 'حق سرویس', 'خدمة', 'Service charge'),
  message('total', 'کۆی گشتی', 'مجموع کل', 'الإجمالي', 'Total'),
  // 13–15: notes and the two closing messages. A receipt prints one of the
  // closing messages only — never both, never a label in their place.
  message('notes', 'تێبینییەکان', 'یادداشت‌ها', 'الملاحظات', 'Notes'),
  message('footer', '', '', '', ''),
  message('footer_2', '', '', '', ''),
];

/** The messages that may print as a receipt's closing footer. */
export const FOOTER_MESSAGE_KEYS = ['footer', 'footer_2'];

const BY_KEY = Object.fromEntries(RECEIPT_MESSAGES.map((m) => [m.key, m]));

/** The stored overrides of this business (never the defaults). */
export function storedMessages(business) {
  const stored = business?.editable_text?.receipt_messages;
  return stored && typeof stored === 'object' ? stored : {};
}

/** Replaces `{token}` with the matching value; unknown tokens stay visible. */
export function renderText(text, vars) {
  if (!text) return '';
  if (!vars) return String(text);
  return String(text).replace(/\{([a-z_]+)\}/gi, (whole, name) =>
    vars[name] === undefined || vars[name] === null ? whole : String(vars[name]),
  );
}

/** The text one message prints, resolved for one language. */
export function receiptMessageText(business, key, locale, vars) {
  const overrides = storedMessages(business);
  const own = overrides[key]?.[locale];
  if (typeof own === 'string' && own.trim()) return renderText(own, vars);
  const def = BY_KEY[key];
  return def ? renderText(def.default[locale] || '', vars) : '';
}

/*
 * Which closing message was printed last, per business and language, so two
 * receipts in a row never carry the same one while another is available. It is
 * module state on purpose: it survives the unmount that follows every print.
 */
const lastPrinted = new Map();

/** The closing messages a business has actually written in one language. */
function closingMessages(business, locale) {
  const overrides = storedMessages(business);
  return FOOTER_MESSAGE_KEYS.map((key) => {
    const own = overrides[key]?.[locale];
    return { key, text: typeof own === 'string' ? own.trim() : '' };
  }).filter((entry) => entry.text);
}

/**
 * The one closing message a receipt prints.
 *
 * Only languages the owner enabled are considered: the receipt prints in its
 * own selected language, falls back to the default enabled language when that
 * one has no closing message, and prints nothing at all when neither does.
 * The pick is random but never repeats the previous one while another message
 * is eligible, so repeated prints rotate through what the owner configured.
 */
export function selectReceiptFooterMessage(business, locale, vars) {
  const enabled = getEnabledLanguages();
  const language = enabled.includes(locale) ? locale : getDefaultEnabledLanguage();
  const fallback = getDefaultEnabledLanguage();
  let pool = closingMessages(business, language);
  if (!pool.length && language !== fallback) pool = closingMessages(business, fallback);
  if (!pool.length) return null;

  const memoryKey = `${business?.id || ''}:${language}`;
  const previous = lastPrinted.get(memoryKey);
  const choices = pool.length > 1 ? pool.filter((entry) => entry.key !== previous) : pool;
  const picked = choices[Math.floor(Math.random() * choices.length)] || pool[0];
  lastPrinted.set(memoryKey, picked.key);
  return { key: picked.key, text: renderText(picked.text, vars) };
}

/** All four values of one message, using the same resolution as printing. */
export function receiptMessageValues(business, key) {
  return Object.fromEntries(
    MESSAGE_LOCALES.map((code) => [code, receiptMessageText(business, key, code)]),
  );
}

/** True when this business has overridden the message at all. */
export function isCustomMessage(business, key) {
  const own = storedMessages(business)[key];
  if (!own || typeof own !== 'object') return false;
  return MESSAGE_LOCALES.some((code) => String(own[code] || '').trim() !== '');
}
