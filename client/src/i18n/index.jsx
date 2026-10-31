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
const STORAGE_KEY = 'lilyan.locale';

export const isRtl = (locale) => ['ku', 'fa', 'ar'].includes(locale);

const I18nContext = createContext(null);

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : String(vars[k])));
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
   * The first paint is already restricted to an allowed language: a preference
   * stored before the owner switched that language off (or a value passed in by
   * a link) is dropped in favour of the configured default enabled one, so a
   * disabled language is never shown, even for a frame.
   */
  const [locale, setLocaleState] = useState(() => {
    const preferred = overrideLocale || localStorage.getItem(STORAGE_KEY);
    if (preferred && enabled.includes(preferred)) return preferred;
    return settings.default_language || 'ku';
  });

  useEffect(() => {
    if (overrideLocale) setLocaleState(overrideLocale);
  }, [overrideLocale]);

  /*
   * A language the owner disables — or a stored choice that is no longer
   * offered — falls back to the business's default enabled language, so the
   * interface never stays on a language it is not allowed to show.
   */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!enabled.includes(locale)) {
      localStorage.setItem(STORAGE_KEY, settings.default_language);
      setLocaleState(settings.default_language);
    } else if (!stored) {
      setLocaleState(settings.default_language);
    }
  }, [enabledKey, enabled, locale, settings.default_language]);

  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    applyDirection(locale, dir === 'rtl');
  }, [locale, dir]);

  const setLocale = useCallback(
    (next) => {
      if (!DICTS[next]) return;
      // A disabled language can never be selected, whatever called this.
      if (!getEnabledLanguages().includes(next)) return;
      localStorage.setItem(STORAGE_KEY, next);
      setLocaleState(next);
    },
    [],
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
 * Picks a localized field with a graceful fallback chain.
 *
 * The chain prefers the active language, then the languages the owner left
 * enabled, then the remaining ones — so a disabled language's old translation is
 * never shown in its place.
 */
export function localized(row, field, locale) {
  if (!row) return '';
  const enabled = getEnabledLanguages();
  const order = [...new Set([locale, ...enabled.filter((code) => code !== locale), 'en', 'ku', 'fa', 'ar'])];
  for (const code of order) {
    const v = row[`${field}_${code}`];
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }
  return '';
}
