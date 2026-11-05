import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import en from './en';
import ku from './ku';
import fa from './fa';
import ar from './ar';
import { useLocation } from 'react-router-dom';
import { applyDirection } from '../theme';
import {
  LANGUAGE_CODES,
  getEnabledLanguages,
  getLanguageSettings,
  subscribeLanguageSettings,
} from '../languages';

/* Every language the platform knows, with its label and flag. The enabled
   subset — what a selector may actually offer — comes from the shared language
   store below, never from a second list. */
export const LOCALES = [
  { code: 'ku', label: 'کوردی', rtl: true },
  { code: 'fa', label: 'فارسی', rtl: true },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'en', label: 'English', rtl: false },
];

const DICTS = { en, ku, fa, ar };

/*
 * Two preferences, two storage keys.
 *
 * The administration panel and the customer ordering screens are separate
 * audiences sharing one browser, so they must be able to read in different
 * languages at the same time: the admin's choice is stored under
 * `lilyan.locale.admin`, the guest's under `lilyan.locale.customer`. Neither
 * ever writes the other's key, so changing the language in the customer menu
 * cannot move the admin panel (or the reverse), and both survive a refresh.
 *
 * `lilyan.locale` is the single key older builds wrote; it seeds the admin
 * panel once so an administrator keeps the language they had already chosen.
 */
const STORAGE_KEYS = { admin: 'lilyan.locale.admin', customer: 'lilyan.locale.customer' };
const LEGACY_KEY = 'lilyan.locale';

/* The public ordering screens: shared menu, short QR menu and table QR menu. */
const CUSTOMER_PATHS = [/^\/m\//, /^\/menu\//, /^\/t\//];

const isCustomerPath = (pathname) => CUSTOMER_PATHS.some((re) => re.test(pathname || ''));

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private windows): the choice lives in this tab only.
  }
}

export const isRtl = (locale) => ['ku', 'fa', 'ar'].includes(locale);

const I18nContext = createContext(null);

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : String(vars[k])));
}

/** The language this audience last chose, or null when it never chose one. */
function storedFor(scope) {
  const own = readStored(STORAGE_KEYS[scope]);
  if (own) return own;
  return scope === 'admin' ? readStored(LEGACY_KEY) : null;
}

export function I18nProvider({ children, overrideLocale }) {
  const settings = useSyncExternalStore(
    subscribeLanguageSettings,
    getLanguageSettings,
    getLanguageSettings,
  );
  const enabled = LANGUAGE_CODES.filter((code) => settings.languages[code].enabled);
  const enabledKey = enabled.join(',');

  /*
   * Which of the two independent audiences is on screen. The admin panel and
   * the public ordering screens each own a preference, so the route decides
   * whose language is being shown — and whose key is being written.
   */
  const { pathname } = useLocation();
  const scope = isCustomerPath(pathname) ? 'customer' : 'admin';
  const storageKey = STORAGE_KEYS[scope];

  /*
   * The first paint is already restricted to an allowed language: a preference
   * stored before the owner switched that language off (or a value passed in by
   * a link) is dropped in favour of the configured default enabled one, so a
   * disabled language is never shown, even for a frame.
   */
  const [locale, setLocaleState] = useState(() => {
    const preferred = overrideLocale || storedFor(scope);
    if (preferred && enabled.includes(preferred)) return preferred;
    return settings.default_language || 'ku';
  });

  useEffect(() => {
    if (overrideLocale) setLocaleState(overrideLocale);
  }, [overrideLocale]);

  /* Moving between the admin shell and a public menu switches to that panel's
     own stored preference — the other panel's choice is never touched. */
  useEffect(() => {
    const stored = storedFor(scope);
    setLocaleState(stored && enabled.includes(stored) ? stored : settings.default_language || 'ku');
    // Deliberately keyed on the audience only: the enabled set is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  /*
   * A language the owner disables — or a stored choice that is no longer
   * offered — falls back to the business's default enabled language, so the
   * interface never stays on a language it is not allowed to show.
   */
  useEffect(() => {
    const stored = storedFor(scope);
    if (!enabled.includes(locale)) {
      writeStored(storageKey, settings.default_language);
      setLocaleState(settings.default_language);
    } else if (!stored) {
      setLocaleState(settings.default_language);
    }
  }, [enabledKey, enabled, locale, settings.default_language, scope, storageKey]);

  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    applyDirection(locale, dir === 'rtl');
  }, [locale, dir]);

  const setLocale = useCallback(
    (next) => {
      if (!DICTS[next]) return;
      // A disabled language can never be selected, whatever called this.
      if (!getEnabledLanguages().includes(next)) return;
      // Only the current audience's own key: the customer menu can never move
      // the admin panel's language, and the reverse.
      writeStored(storageKey, next);
      setLocaleState(next);
    },
    [storageKey],
  );

  /** Never returns a raw internal key: unknown keys fall back to English, then humanized. */
  const t = useCallback(
    (key, vars) => {
      const dict = DICTS[locale] || en;
      const value = dict[key] ?? en[key];
      if (value === undefined) {
        return key.replace(/_/g, ' ');
      }
      return interpolate(value, vars);
    },
    [locale],
  );

  /* The selectors only ever offer the enabled languages, in platform order. */
  const locales = useMemo(
    () => LOCALES.filter((item) => enabled.includes(item.code)),
    // `enabled` is a fresh array each render; its contents are the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabledKey],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      dir,
      rtl: dir === 'rtl',
      LOCALES,
      locales,
      languageSettings: settings,
      enabledLanguages: enabled,
    }),
    [locale, setLocale, t, dir, locales, settings, enabled],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

/**
 * One record's stored translation in the given language — and nothing else.
 *
 * Owner-managed content (product and category names, descriptions, promotion
 * and advertisement copy) is never borrowed from another language: an empty
 * translation in the selected language stays empty, even when a disabled or
 * different language still holds text. Callers decide how to present a missing
 * translation; this helper only reports it.
 */
export function localized(row, field, locale) {
  if (!row || !locale) return '';
  const v = row[`${field}_${locale}`];
  return v === null || v === undefined ? '' : String(v);
}

/**
 * The interface's own graceful chain, for records that carry a single plain
 * fallback column (a business or table name, which always has one). Only use it
 * where such a neutral value genuinely exists — never to borrow a translation
 * from another language.
 */
export function localizedFallback(row, field, locale) {
  if (!row) return '';
  const enabled = getEnabledLanguages();
  const order = [...new Set([locale, ...enabled.filter((code) => code !== locale), 'en', 'ku', 'fa', 'ar'])];
  for (const code of order) {
    const v = row[`${field}_${code}`];
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }
  return '';
}
