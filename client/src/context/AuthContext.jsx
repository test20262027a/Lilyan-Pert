import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, setBusinessId, patch } from '../api';
import { beginLoading, endLoading } from '../loading';
import { ALL_PERMISSION_KEYS } from '../permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    user: null,
    memberships: [],
    businessId: null,
  });

  /*
   * Only the server's own verdict ends a session.
   *
   * `401`/`403` mean the cookie is gone or the account lost access — that is a
   * real sign-out. Anything else (a dropped connection, the API restarting, a
   * 5xx, a proxy hiccup) is ordinary background failure: the session is still
   * valid, so it is kept exactly as it is. Treating those as a sign-out is what
   * made the panel suddenly land on the login screen and come back, which reads
   * as a full page refresh and loses every unsaved field with it.
   */
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
    } catch (err) {
      const signedOut = err?.status === 401 || err?.status === 403;
      if (!signedOut) {
        // Nothing to clear: keep the session and whatever the page is showing.
        setState((current) => ({ ...current, loading: false }));
        return null;
      }
      setBusinessId(null);
      setState({ loading: false, user: null, memberships: [], businessId: null });
      return null;
    }
  }, []);

  /* Only the session bootstrap raises the global overlay. A later refresh (a
     saved profile, a business switch) is ordinary background work and must not
     take over the screen. */
  useEffect(() => {
    beginLoading('session');
    refresh().finally(() => endLoading('session'));
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

  const value = useMemo(() => {
    const activeMembership = state.memberships.find((m) => m.business_id === state.businessId);
    // The server sends each membership's *effective* permission list; the client
    // only ever reflects it. A super admin holds everything.
    const permissions = state.user?.is_super_admin
      ? ALL_PERMISSION_KEYS
      : activeMembership?.permissions || [];
    return {
      ...state,
      role: activeMembership?.role || null,
      permissions,
      can: (key) => permissions.includes(key),
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
    };
  }, [state, login, register, logout, refresh, switchBusiness, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
