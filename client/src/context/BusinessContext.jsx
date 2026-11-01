import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, put } from '../api';
import { applyTheme } from '../theme';
import { setLanguageSettings } from '../languages';
import { rememberBrandLogo } from '../brandLogo';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get('/business');
      /* The theme is written to the document *before* the record is handed to
         React: the shell is gated on `business`, so its first visible frame is
         already the saved appearance — never a frame of the previous one. */
      if (data.business?.theme) applyTheme(data.business.theme, data.business.id);
      setBusiness(data.business);
      setError(null);
    } catch (err) {
      setError(err.code || 'ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The business theme is the single source of truth for light/dark/primary.
  // First arrival is applied in `load` above; this keeps later saves (theme
  // switching, Appearance settings) in step without remounting anything.
  useEffect(() => {
    if (business?.theme) applyTheme(business.theme, business.id);
  }, [business?.theme, business?.id]);

  /* The loader draws this saved logo on every boot, so the URL is remembered
     the moment the business is read — before the next refresh, not after it. */
  useEffect(() => {
    if (business) rememberBrandLogo(business.logo_url);
  }, [business]);

  // The enabled languages come from the same saved settings record, so every
  // selector and multilingual form follows Menu Settings without a second copy.
  useEffect(() => {
    if (business) setLanguageSettings(business.menu_settings?.language_settings);
  }, [business]);

  const save = useCallback(async (patchBody) => {
    const data = await put('/business', patchBody);
    if (data?.business) setBusiness(data.business);
    return data?.business;
  }, []);

  const value = useMemo(
    () => ({ business, loading, error, reload: load, save, setBusiness }),
    [business, loading, error, load, save],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used inside BusinessProvider');
  return ctx;
}
