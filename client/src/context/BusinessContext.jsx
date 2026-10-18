import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, put } from '../api';
import { applyTheme } from '../theme';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get('/business');
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
  useEffect(() => {
    if (business?.theme) applyTheme(business.theme);
  }, [business?.theme]);

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
