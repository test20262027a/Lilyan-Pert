import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { applyBrowserMetadata } from '../metadata';

/*
 * Keeps the browser tab in step with the app: the localized section name for
 * the current route, the localized business name from Business Profile, and the
 * business logo as the tab icon.
 *
 * `business` is whatever record the surrounding page already holds (the admin
 * business, the sign-in brand, the public menu business). Pass nothing where
 * none is loaded yet — the last known name from this session is used instead, so
 * the tab never flashes a different title on refresh.
 *
 * A layout effect writes before the browser paints, so navigating or switching
 * language never shows an outdated title.
 */
export default function useDocumentMetadata(business) {
  const { pathname } = useLocation();
  const { t, locale, languageSettings } = useI18n();
  const defaultLocale = languageSettings?.default_language;

  useLayoutEffect(() => {
    applyBrowserMetadata({ pathname, t, locale, defaultLocale, business });
  }, [pathname, t, locale, defaultLocale, business]);
}
