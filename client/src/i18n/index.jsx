import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import ku from './ku';
import fa from './fa';
import ar from './ar';
import { applyDirection } from '../theme';

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
  const [locale, setLocaleState] = useState(
    () => overrideLocale || localStorage.getItem(STORAGE_KEY) || 'ku',
  );

  useEffect(() => {
    if (overrideLocale) setLocaleState(overrideLocale);
  }, [overrideLocale]);

  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    applyDirection(locale, dir === 'rtl');
  }, [locale, dir]);

  const setLocale = useCallback((next) => {
    if (!DICTS[next]) return;
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

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

  const value = useMemo(
    () => ({ locale, setLocale, t, dir, rtl: dir === 'rtl', LOCALES }),
    [locale, setLocale, t, dir],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

/** Picks a localized field with a graceful fallback chain. */
export function localized(row, field, locale) {
  if (!row) return '';
  const order = [locale, 'en', 'ku', 'fa', 'ar'];
  for (const code of order) {
    const v = row[`${field}_${code}`];
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }
  return '';
}
