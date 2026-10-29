/*
 * The fourteen automatic receipt messages — one canonical list shared by the
 * Text Editor and the receipt renderer. Order-change audit is intentionally
 * absent: it is internal and only ever appears in the Order Details timeline.
 *
 * A business never gets a copy of the defaults in the database: the stored
 * override lives in `businesses.editable_text.receipt_messages[key]` and only
 * holds values an administrator actually changed. Every reader resolves
 * override → legacy value → default, so printing is byte-identical to what the
 * receipt printed before this editor existed until someone edits a line.
 *
 * Placeholders are plain `{token}` names. They are replaced as text (never as
 * HTML) by renderText() below, so a message can never inject markup into the
 * printed receipt.
 */

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
  // 13–14: notes and the closing message.
  message('notes', 'تێبینییەکان', 'یادداشت‌ها', 'الملاحظات', 'Notes'),
  message('footer', '', '', '', ''),
];

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
  /*
   * The closing message keeps its historical single-language value as the
   * fallback, so an existing footer keeps printing until it is translated.
   */
  if (key === 'footer') {
    const legacy = business?.receipt_settings?.footer_text;
    if (typeof legacy === 'string' && legacy.trim()) return renderText(legacy, vars);
  }
  const def = BY_KEY[key];
  return def ? renderText(def.default[locale] || '', vars) : '';
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
