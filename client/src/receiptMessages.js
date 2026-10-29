/*
 * The fifteen closing messages of a receipt — one canonical list shared by the
 * Text Editor, the on-screen preview and the printed receipt.
 *
 * A receipt prints exactly ONE of them as its footer: pickReceiptFooter()
 * chooses it once per receipt (never repeating the previous one while another
 * is eligible), and the same pick is reused by the preview and the print, so
 * what the administrator sees is what is printed.
 *
 * A message may use the `{{businessName}}` placeholder. It is resolved at print
 * time from the business profile in the receipt's own language — falling back
 * to the business's default name — so renaming the business updates every
 * future receipt and the placeholder itself is never printed.
 *
 * The receipt's own labels (order number, table, totals …) are fixed layout
 * text and live in LABELS below; they print in their place and are not part of
 * the fifteen closing messages.
 *
 * A business never gets a copy of the defaults in the database: the stored
 * override lives in `businesses.editable_text.receipt_messages[key]` and only
 * holds values an administrator actually changed. Every reader resolves
 * override → default, and a disabled language keeps its saved text — it is
 * hidden from the editor, never deleted, and reappears when re-enabled.
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

/** The fixed labels of the receipt layout, printed in their own place. */
const LABELS = {
  order_no: { ku: 'داواکاری', fa: 'سفارش', ar: 'طلب', en: 'Order' },
  table: { ku: 'مێز', fa: 'میز', ar: 'طاولة', en: 'Table' },
  datetime: { ku: 'بەروار', fa: 'تاریخ', ar: 'التاريخ', en: 'Date' },
  customer: { ku: 'کڕیار', fa: 'مشتری', ar: 'العميل', en: 'Customer' },
  cashier: { ku: 'کاشێر', fa: 'صندوق‌دار', ar: 'أمين الصندوق', en: 'Cashier' },
  items: { ku: 'بڕگە', fa: 'قلم', ar: 'عنصر', en: 'Item' },
  qty: { ku: 'بڕ', fa: 'تعداد', ar: 'الكمية', en: 'Qty' },
  unit_price: { ku: 'نرخی یەکە', fa: 'قیمت واحد', ar: 'سعر الوحدة', en: 'Price' },
  total_column: { ku: 'کۆی گشتی', fa: 'مجموع', ar: 'الإجمالي', en: 'Total' },
  subtotal: { ku: 'کۆی بڕگەکان', fa: 'جمع اقلام', ar: 'المجموع الفرعي', en: 'Subtotal' },
  discount: { ku: 'داشکاندن', fa: 'تخفیف', ar: 'الخصم', en: 'Discount' },
  tax: { ku: 'باج', fa: 'مالیات', ar: 'الضريبة', en: 'Tax' },
  service_charge: { ku: 'خزمەتگوزاری', fa: 'حق سرویس', ar: 'خدمة', en: 'Service charge' },
  total: { ku: 'کۆی گشتی', fa: 'مجموع کل', ar: 'الإجمالي', en: 'Total' },
  notes: { ku: 'تێبینییەکان', fa: 'یادداشت‌ها', ar: 'الملاحظات', en: 'Notes' },
};

/** A layout label in one language (the fixed receipt structure). */
export function receiptLabel(key, locale) {
  return LABELS[key]?.[locale] || LABELS[key]?.en || '';
}

const message = (key, ku, fa, ar, en) => ({ key, default: { ku, fa, ar, en } });

/** The fifteen closing messages, in their printed order. */
export const RECEIPT_MESSAGES = [
  message(
    'footer_1',
    'سوپاس بۆ هەڵبژاردنی {{businessName}}. هیوادارین ساتەکانتان شیرین و پڕ لە بیرەوەریی خۆش بن!',
    'از اینکه {{businessName}} را انتخاب کردید، سپاسگزاریم. لحظاتتان شیرین و خاطره‌انگیز!',
    'شكرًا لاختياركم {{businessName}}. نتمنى لكم لحظات حلوة لا تُنسى!',
    'Thank you for choosing {{businessName}}. Wishing you sweet and memorable moments!',
  ),
  message(
    'footer_2',
    'پێکەنینتان شیرینترین بەشی ڕۆژی ئێمەیە. بە هیوای دیدارێکی دیکە!',
    'لبخند شما، شیرین‌ترین بخش روز ماست. به امید دیدار دوباره!',
    'ابتسامتكم أحلى ما في يومنا. إلى لقاء قريب!',
    'Your smile is the sweetest part of our day. See you again soon!',
  ),
  message(
    'footer_3',
    'هەر داواکارییەکتان لای ئێمە بەنرخە. سوپاس بۆ متمانە و هاوڕێیەتیتان.',
    'هر سفارش شما برای ما ارزشمند است. از اعتماد و همراهی‌تان متشکریم.',
    'كل طلب منكم يعني لنا الكثير. شكرًا لثقتكم ودعمكم.',
    'Every order means a lot to us. Thank you for your trust and support.',
  ),
  message(
    'footer_4',
    'ژیان بە ساتە شیرینەکان جوانتر دەبێت. نوشی گیانتان!',
    'زندگی با لحظه‌های شیرین زیباتر می‌شود. نوش جانتان!',
    'الحياة أجمل باللحظات الحلوة. بالهناء والشفاء!',
    'Life is sweeter with beautiful moments. Enjoy every bite!',
  ),
  message(
    'footer_5',
    'تامێکی خۆش، بیرەوەرییەکی نەمر! سوپاس بۆ ئەوەی میوانمان بوون.',
    'یک طعم خوش، یک خاطره ماندگار! ممنون که مهمان ما بودید.',
    'مذاق رائع وذكرى لا تُنسى! شكرًا لزيارتكم.',
    'A delicious taste, an unforgettable memory! Thank you for visiting us.',
  ),
  message(
    'footer_6',
    'دڵخۆشیی ئێوە هاندەری هەموو ڕۆژێکی ئێمەیە. هەمیشە دڵخۆش و تەندروست بن.',
    'حال خوب شما، انگیزه هر روز ماست. همیشه شاد و سلامت باشید.',
    'سعادتكم دافعنا كل يوم. نتمنى لكم السعادة والصحة دائمًا.',
    'Your happiness inspires us every day. Stay happy and healthy!',
  ),
  message(
    'footer_7',
    'لە {{businessName}}، هەر تامێک بە خۆشەویستی ئامادە دەکرێت. نوشی گیانتان!',
    'در {{businessName}}، هر طعم با عشق آماده می‌شود. نوش جان!',
    'في {{businessName}}، نُحضّر كل مذاق بكل حب. بالهناء والشفاء!',
    'At {{businessName}}, every treat is prepared with love. Enjoy!',
  ),
  message(
    'footer_8',
    'هیوادارین تامی ئەمڕۆ ببێتە هۆی دیدارێکی دیکە.',
    'امیدواریم طعم امروز، بهانه‌ای برای دیدار دوباره باشد.',
    'نأمل أن يكون مذاق اليوم سببًا للقاء جديد.',
    "We hope today's delicious taste brings you back again!",
  ),
  message(
    'footer_9',
    'ساتە بچووکەکان بیرەوەریی گەورە دروست دەکەن. سوپاس بۆ ئامادەبوونتان.',
    'لحظه‌های کوچک، خاطره‌های بزرگ می‌سازند. از حضورتان سپاسگزاریم.',
    'اللحظات الصغيرة تصنع ذكريات كبيرة. شكرًا لوجودكم معنا.',
    'Little moments create great memories. Thank you for being here!',
  ),
  message(
    'footer_10',
    'هەر ڕۆژێک دەرفەتێکی نوێیە بۆ چێژوەرگرتن لە تامە خۆشەویستەکان.',
    'هر روز فرصتی تازه برای لذت بردن از طعم‌های دوست‌داشتنی است.',
    'كل يوم فرصة جديدة للاستمتاع بالنكهات المحببة.',
    'Every day is a new chance to enjoy the flavors you love.',
  ),
  message(
    'footer_11',
    'دڵخۆشین کە بەشێکین لە ساتە خۆشەکانتان.',
    'از اینکه بخشی از لحظه‌های خوش شما هستیم، خوشحالیم.',
    'يسعدنا أن نكون جزءًا من لحظاتكم الجميلة.',
    "We're delighted to be part of your happy moments.",
  ),
  message(
    'footer_12',
    'تامی خۆش کۆتایی دێت، بەڵام بیرەوەریی شیرینی دەمێنێتەوە.',
    'طعم خوب تمام می‌شود، اما خاطره شیرین آن باقی می‌ماند.',
    'ينتهي المذاق اللذيذ، لكن ذكراه الحلوة تبقى.',
    'A delicious treat may end, but its sweet memory remains.',
  ),
  message(
    'footer_13',
    'ڕەزامەندیی ئێوە گەورەترین شانازیی ئێمەیە. سوپاس بۆ هەڵبژاردنتان.',
    'رضایت شما بزرگ‌ترین افتخار ماست. از انتخابتان سپاسگزاریم.',
    'رضاكم أكبر فخر لنا. شكرًا لاختياركم.',
    'Your satisfaction is our greatest pride. Thank you for choosing us!',
  ),
  message(
    'footer_14',
    'پەرداخێک ئارامی، تامێکی دڵخۆشکەر و هەزاران ساتی جوانتان بۆ دەخوازین!',
    'یک فنجان آرامش، یک طعم دل‌نشین و هزاران لحظه زیبا برای شما!',
    'فنجان من الراحة، ومذاق شهي، وآلاف اللحظات الجميلة لكم!',
    'A cup of comfort, a delightful taste, and countless beautiful moments!',
  ),
  message(
    'footer_15',
    'تا دیدارێکی دیکە، با پێکەنین لەسەر لێوتان و شیرینی لە دەمەکانتان بمێنێتەوە!',
    'تا دیداری دیگر، لبخند بر لب و شیرینی در کامتان ماندگار باد!',
    'حتى نلتقي مجددًا، نتمنى أن تبقى البسمة على شفاهكم والحلاوة في أيامكم!',
    'Until we meet again, may your days be filled with smiles and sweetness!',
  ),
];

/** Every message is a candidate, so a receipt always has one to print. */
export const FOOTER_MESSAGE_KEYS = RECEIPT_MESSAGES.map((m) => m.key);

const BY_KEY = Object.fromEntries(RECEIPT_MESSAGES.map((m) => [m.key, m]));

/** The stored overrides of this business (never the defaults). */
export function storedMessages(business) {
  const stored = business?.editable_text?.receipt_messages;
  return stored && typeof stored === 'object' ? stored : {};
}

/** `businessName` and `business_name` name the same value. */
const tokenKey = (name) => String(name).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/**
 * Replaces `{{token}}` / `{token}` with the matching value; a token with no
 * value stays visible instead of silently vanishing. Replacement is plain text
 * (never HTML), so a message can never inject markup into the receipt.
 */
export function renderText(text, vars) {
  if (!text) return '';
  if (!vars) return String(text);
  const fill = (whole, name) => {
    const key = tokenKey(name);
    return vars[key] === undefined || vars[key] === null ? whole : String(vars[key]);
  };
  return String(text)
    .replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, fill)
    .replace(/\{([A-Za-z0-9_]+)\}/g, fill);
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
 * Which message was printed last, per business and language, so two receipts in
 * a row never carry the same one while another is available. It is module state
 * on purpose: it survives the unmount that follows every print.
 */
const lastPrinted = new Map();

/** The messages that really have text in one language. */
function footerPool(business, locale) {
  return RECEIPT_MESSAGES.filter((m) => receiptMessageText(business, m.key, locale).trim());
}

/**
 * The message identity a receipt prints, chosen once and then reused.
 *
 * Only languages the owner enabled are considered: a receipt prints in its own
 * language, falls back to the default enabled language when that one has no
 * message, and prints nothing when neither does. The pick is random but never
 * repeats the previous one while another message is eligible.
 */
export function pickReceiptFooter(business, locale) {
  const enabled = getEnabledLanguages();
  const fallback = getDefaultEnabledLanguage();
  let language = enabled.includes(locale) ? locale : fallback;
  let pool = footerPool(business, language);
  if (!pool.length && language !== fallback) {
    language = fallback;
    pool = footerPool(business, language);
  }
  if (!pool.length) return null;

  const memoryKey = `${business?.id || ''}:${language}`;
  const previous = lastPrinted.get(memoryKey);
  const choices = pool.length > 1 ? pool.filter((entry) => entry.key !== previous) : pool;
  const picked = choices[Math.floor(Math.random() * choices.length)] || pool[0];
  lastPrinted.set(memoryKey, picked.key);
  return { key: picked.key, language };
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
