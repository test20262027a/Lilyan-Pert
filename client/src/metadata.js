/*
 * The single place that decides what the browser tab says and shows.
 *
 * Title: "[section] | [business]", both localized — the section comes from the
 * translation dictionary through the active language (falling back to English,
 * then to a humanized key, never a raw identifier), and the business name comes
 * from Business Profile, preferring the active language and then the business's
 * own default language.
 *
 * Icon: the business logo, through the favicon module.
 */
import { NAV } from './components/nav/navConfig';
import { getDefaultEnabledLanguage, getEnabledLanguages } from './languages';
import { applyBrandFavicon } from './favicon';

const APP_NAME = 'Lilyan Pert';
const NAME_CACHE_KEY = 'lilyan.brand.names';

/*
 * Every route's section label key. Admin sections are taken from the navigation
 * tree itself, so a tab can never disagree with the menu entry that opened it;
 * the few pages outside the menu are declared below.
 */
const ROUTES = new Map();
for (const item of NAV) {
  if (item.to) ROUTES.set(item.to, item.key);
  for (const child of item.children || []) ROUTES.set(child.to, child.key);
}
ROUTES.set('/order-menu', 'nav_order_menu');
ROUTES.set('/login', 'auth_login');
ROUTES.set('/register', 'auth_register');
ROUTES.set('/m', 'nav_customer_menu');

/* Longest path first, so /menu-settings wins over /menu. */
const ROUTE_MATCHES = [...ROUTES.entries()].sort((a, b) => b[0].length - a[0].length);

/** The translation key of the section a route belongs to. */
export function sectionKeyForPath(pathname) {
  if (!pathname) return null;
  const match = ROUTE_MATCHES.find(([route]) =>
    route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`),
  );
  return match ? match[1] : null;
}

/**
 * The business name in the reader's language: the active language first, then
 * the business's configured default language, then any enabled language, then
 * the untranslated profile name.
 */
export function brandNameFor(business, locale, defaultLocale) {
  if (!business) return '';
  const order = [...new Set([
    locale,
    defaultLocale || getDefaultEnabledLanguage(),
    ...getEnabledLanguages(),
    'en',
    'ku',
    'fa',
    'ar',
  ])];
  for (const code of order) {
    const value = code ? String(business[`name_${code}`] ?? '').trim() : '';
    if (value) return value;
  }
  return String(business.name ?? '').trim();
}

function readNames() {
  try {
    const raw = sessionStorage.getItem(NAME_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Keeps the last known name per language. A refresh then paints the right title
 * immediately instead of showing the untranslated fallback while the business
 * record loads.
 */
export function rememberBrandName(locale, name) {
  if (!locale || !name) return;
  try {
    const names = readNames();
    if (names[locale] === name) return;
    sessionStorage.setItem(NAME_CACHE_KEY, JSON.stringify({ ...names, [locale]: name }));
  } catch {
    /* No session storage: the title still updates once the business loads. */
  }
}

function cachedBrandName(locale) {
  if (!locale) return '';
  return String(readNames()[locale] || '');
}

/**
 * Writes the tab title and icon for the current route, language and business.
 * Called on every navigation and language change — never with a raw route, an
 * identifier or a translation key as the visible text.
 */
export function applyBrowserMetadata({ pathname, t, locale, defaultLocale, business }) {
  const sectionKey = sectionKeyForPath(pathname);
  const section = sectionKey ? t(sectionKey) : '';

  let brand = brandNameFor(business, locale, defaultLocale);
  if (brand) rememberBrandName(locale, brand);
  else if (!business) brand = cachedBrandName(locale);

  // "[section] | [business]" — never the same words twice on one tab.
  const title = section && brand && section !== brand ? `${section} | ${brand}` : section || brand || APP_NAME;
  if (document.title !== title) document.title = title;

  applyBrandFavicon(business ? business.logo_url || null : undefined);
}
