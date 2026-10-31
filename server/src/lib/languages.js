import { bad } from './http.js';

/*
 * The one language model of the platform.
 *
 * `businesses.menu_settings.language_settings` stores which languages the owner
 * allows — nothing else in the app keeps its own copy. Disabling a language is a
 * presentation decision: every translation, price and historical order stays in
 * the database untouched.
 *
 * Each language also owns its currency, and each product owns one independently
 * entered price per language. Nothing is ever converted: no exchange rate is
 * invented anywhere in this file.
 */

export const LANGUAGE_CODES = ['ku', 'fa', 'ar', 'en'];

/** The currency a price entered in that language is expressed in. */
export const LANGUAGE_CURRENCY = { ku: 'IQD', fa: 'TOMAN', ar: 'IQD', en: 'USD' };

/** The product column that holds that language's price. */
export const PRICE_COLUMN = { ku: 'price', fa: 'price_fa', ar: 'price_ar', en: 'price_en' };

const isCode = (value) => LANGUAGE_CODES.includes(value);

export function defaultLanguageSettings() {
  return {
    default_language: 'ku',
    languages: Object.fromEntries(LANGUAGE_CODES.map((code) => [code, { enabled: true }])),
  };
}

/**
 * Canonical shape of the stored language settings.
 *
 * Rules, in order: an unknown shape means "everything enabled"; at least one
 * language always stays enabled; and the default language is always enabled, so
 * the interface can never fall back to a language it is not allowed to show.
 */
export function normalizeLanguageSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const stored = source.languages && typeof source.languages === 'object' ? source.languages : {};

  const languages = {};
  for (const code of LANGUAGE_CODES) {
    const entry = stored[code];
    languages[code] = { enabled: typeof entry?.enabled === 'boolean' ? entry.enabled : true };
  }

  if (!LANGUAGE_CODES.some((code) => languages[code].enabled)) {
    for (const code of LANGUAGE_CODES) languages[code].enabled = true;
  }

  let fallback = isCode(source.default_language) ? source.default_language : 'ku';
  if (!languages[fallback].enabled) {
    fallback = LANGUAGE_CODES.find((code) => languages[code].enabled) || 'ku';
  }

  return { default_language: fallback, languages };
}

export function enabledLanguageCodes(settings) {
  const normalized = normalizeLanguageSettings(settings);
  return LANGUAGE_CODES.filter((code) => normalized.languages[code].enabled);
}

export function isLanguageEnabled(settings, code) {
  return enabledLanguageCodes(settings).includes(code);
}

export function defaultEnabledLanguage(settings) {
  return normalizeLanguageSettings(settings).default_language;
}

/**
 * A requested language, or the default enabled one. A session left on a
 * language the owner has since disabled falls back instead of breaking.
 */
export function resolveLanguage(settings, requested) {
  const enabled = enabledLanguageCodes(settings);
  if (isCode(requested) && enabled.includes(requested)) return requested;
  return normalizeLanguageSettings(settings).default_language;
}

/** The currency an order placed in this language is expressed in. */
export function currencyForLanguage(code, businessCurrency = 'IQD') {
  if (code === 'ku' || code === 'ar') return businessCurrency || 'IQD';
  return LANGUAGE_CURRENCY[code] || businessCurrency || 'IQD';
}

/**
 * One product's price in one language.
 *
 * `valid` is the ordering rule: the price must really exist, be a finite amount
 * greater than zero, and have a known unit. A Persian price stored before the
 * unit was recorded is deliberately NOT orderable until the owner confirms it —
 * guessing Rial or Toman would silently change what a guest is charged.
 *
 * Another language's price is never used as a fallback here.
 */
export function languagePrice(product, code, businessCurrency = 'IQD') {
  const column = PRICE_COLUMN[code];
  const currency = currencyForLanguage(code, businessCurrency);
  const raw = column ? product?.[column] : null;
  const amount = raw === null || raw === undefined || raw === '' ? null : Number(raw);
  const review = code === 'fa' && product?.price_fa_review === true;
  const valid = Number.isFinite(amount) && amount > 0 && !review;
  return { amount: valid ? amount : null, stored: Number.isFinite(amount) ? amount : null, currency, valid, review };
}

/** The product's name in the ordering language, with the existing fallback chain. */
export function localizedName(product, code) {
  return (
    product?.[`name_${code}`]
    || product?.name_en
    || product?.name_ku
    || product?.name_fa
    || product?.name_ar
    || product?.name
    || ''
  );
}

/**
 * A per-currency amount (fixed discount, minimum order) for the order's currency.
 *
 * `map` is stored as `{ IQD: { discount, min_order }, TOMAN: { … }, USD: { … } }`.
 * The legacy single amount is only ever read in the business's own currency, so
 * a 5,000 IQD offer can never turn into a 5,000 Toman or 5,000 USD one.
 */
export function currencyAmount(map, currency, legacy, legacyCurrency, field = 'discount') {
  const source = map && typeof map === 'object' ? map : {};
  const entry = source[currency];
  const raw = entry && typeof entry === 'object' ? entry[field] : field === 'discount' ? entry : undefined;
  if (raw !== undefined && raw !== null && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (legacy !== null && legacy !== undefined && currency === legacyCurrency) {
    const n = Number(legacy);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** A promotion that cannot be expressed in the order's currency is not applied. */
export function promotionUnavailable(promotion, currency, businessCurrency) {
  if (promotion?.discount_type !== 'fixed') return false;
  return currencyAmount(promotion.currency_amounts, currency, promotion.discount_value, businessCurrency) === null;
}

/** Throws when a requested language may not be used for an order. */
export function assertLanguageOrderable(settings, requested) {
  if (!isCode(requested)) throw bad('LANGUAGE_UNAVAILABLE');
  if (!isLanguageEnabled(settings, requested)) throw bad('LANGUAGE_UNAVAILABLE');
}
