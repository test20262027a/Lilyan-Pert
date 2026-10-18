import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, setBusinessId, patch } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    user: null,
    memberships: [],
    businessId: null,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await get('/auth/me');
      setBusinessId(data.active_business_id);
      setState({
        loading: false,
        user: data.user,
        memberships: data.memberships || [],
        businessId: data.active_business_id,
      });
      return data;
    } catch {
      setBusinessId(null);
      setState({ loading: false, user: null, memberships: [], businessId: null });
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      await post('/auth/login', { email, password });
      return refresh();
    },
    [refresh],
  );

  const register = useCallback(
    async (payload) => {
      await post('/auth/register', payload);
      return refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await post('/auth/logout');
    } finally {
      setBusinessId(null);
      setState({ loading: false, user: null, memberships: [], businessId: null });
    }
  }, []);

  const switchBusiness = useCallback(async (businessId) => {
    setBusinessId(businessId);
    setState((s) => ({ ...s, businessId }));
    const data = await get('/auth/me');
    setState({
      loading: false,
      user: data.user,
      memberships: data.memberships || [],
      businessId: data.active_business_id,
    });
  }, []);

  const updateProfile = useCallback(async (payload) => {
    await patch('/auth/me', payload);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ...state,
      role: state.memberships.find((m) => m.business_id === state.businessId)?.role || null,
      isSuperAdmin: Boolean(state.user?.is_super_admin),
      isOwner: state.user?.is_super_admin
        || state.memberships.some((m) => m.business_id === state.businessId && m.role === 'owner'),
      isManager: state.user?.is_super_admin
        || state.memberships.some(
          (m) => m.business_id === state.businessId && ['owner', 'manager'].includes(m.role),
        ),
      login,
      register,
      logout,
      refresh,
      switchBusiness,
      updateProfile,
    }),
    [state, login, register, logout, refresh, switchBusiness, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
