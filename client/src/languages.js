/*
 * The one enabled-language model of the interface.
 *
 * The business's saved `menu_settings.language_settings` is fed into this store
 * by whoever has it (the admin business record, the public menu payload or the
 * sign-in brand endpoint). Every language selector and every multilingual form
 * reads the same store, so switching Persian off in Menu Settings removes it
 * everywhere — and its stored translations and prices are never touched.
 *
 * Nothing here converts money: each language owns its own price and currency.
 */

export const LANGUAGE_CODES = ['ku', 'fa', 'ar', 'en'];

export const LANGUAGE_META = {
  ku: { label: 'کوردی', rtl: true },
  fa: { label: 'فارسی', rtl: true },
  ar: { label: 'العربية', rtl: true },
  en: { label: 'English', rtl: false },
};

/** The currency a price entered in that language is expressed in. */
export const LANGUAGE_CURRENCY = { ku: 'IQD', fa: 'TOMAN', ar: 'IQD', en: 'USD' };

/** The product field that holds that language's price. */
export const PRICE_FIELD = { ku: 'price', fa: 'price_fa', ar: 'price_ar', en: 'price_en' };

const allEnabled = () => Object.fromEntries(LANGUAGE_CODES.map((code) => [code, { enabled: true }]));

/** Canonical shape, mirroring the server's normalizer (at least one enabled). */
export function normalizeLanguageSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const stored = source.languages && typeof source.languages === 'object' ? source.languages : {};
  const languages = {};
  for (const code of LANGUAGE_CODES) {
    languages[code] = { enabled: typeof stored[code]?.enabled === 'boolean' ? stored[code].enabled : true };
  }
  if (!LANGUAGE_CODES.some((code) => languages[code].enabled)) {
    for (const code of LANGUAGE_CODES) languages[code] = { enabled: true };
  }
  let fallback = LANGUAGE_CODES.includes(source.default_language) ? source.default_language : 'ku';
  if (!languages[fallback].enabled) {
    fallback = LANGUAGE_CODES.find((code) => languages[code].enabled) || 'ku';
  }
  return { default_language: fallback, languages };
}

let current = normalizeLanguageSettings(allEnabled());
const listeners = new Set();

export function setLanguageSettings(raw) {
  const next = normalizeLanguageSettings(raw);
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  listeners.forEach((listener) => listener());
}

export function subscribeLanguageSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLanguageSettings() {
  return current;
}

export function getEnabledLanguages() {
  return LANGUAGE_CODES.filter((code) => current.languages[code].enabled);
}

export function isLanguageEnabled(code) {
  return getEnabledLanguages().includes(code);
}

export function getDefaultEnabledLanguage() {
  return current.default_language;
}

/** A language that may safely be shown right now — the default when it may not. */
export function getCurrentValidLanguage(preferred) {
  const enabled = getEnabledLanguages();
  if (enabled.includes(preferred)) return preferred;
  return current.default_language;
}

/** The locales an Add / Edit form renders, in the interface's own order. */
export function getEnabledLanguageFields() {
  return getEnabledLanguages();
}

export function currencyForLanguage(code, businessCurrency = 'IQD') {
  if (code === 'ku' || code === 'ar') return businessCurrency || 'IQD';
  return LANGUAGE_CURRENCY[code] || businessCurrency || 'IQD';
}

/**
 * One product's price in one language, exactly as the public API sends it.
 *
 * `valid` is the ordering rule (a real, positive amount in that language's own
 * currency); a language without one is unavailable for this product only.
 */
export function productPrice(product, code, businessCurrency = 'IQD') {
  const fromServer = product?.prices?.[code];
  if (fromServer) {
    return {
      amount: fromServer.amount === null || fromServer.amount === undefined ? null : Number(fromServer.amount),
      base: fromServer.base === null || fromServer.base === undefined ? null : Number(fromServer.base),
      currency: fromServer.currency || currencyForLanguage(code, businessCurrency),
      valid: Boolean(fromServer.valid),
    };
  }
  // Fallback for a payload from an older API: same rule, no conversion.
  const field = PRICE_FIELD[code];
  const raw = field ? product?.[field] : null;
  const amount = raw === null || raw === undefined || raw === '' ? null : Number(raw);
  const valid = Number.isFinite(amount) && amount > 0;
  return { amount: valid ? amount : null, base: valid ? amount : null, currency: currencyForLanguage(code, businessCurrency), valid };
}
