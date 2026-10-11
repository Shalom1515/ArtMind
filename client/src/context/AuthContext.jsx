import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const refresh = useCallback(async () => {
    try {
      const { user: current } = await authApi.me();
      setUser(current);
      return current;
    } catch {
      setUser(null);
      return null;
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async ({ email, password, remember = false }) => {
    const { user: loggedIn } = await authApi.login({ email, password, remember });
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback((details) => authApi.register(details), []);

  const verify = useCallback(async ({ email, code }) => {
    const { user: verified } = await authApi.verify({ email, code });
    setUser(verified);
    return verified;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isLoggedIn: Boolean(user),
      isAdmin: user?.role === 'admin',
      role: user?.role || null,
      login,
      logout,
      register,
      verify,
      refresh,
      setUser,
    }),
    [user, status, login, logout, register, verify, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
