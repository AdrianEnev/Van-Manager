"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, me as apiMe, type AuthUser, tokens, meCookie, logoutCookie } from '../lib/api';

export type AuthContextValue = {
  user: AuthUser | null;
  authed: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; role?: 'admin' | 'user' }) => Promise<void>;
  logout: () => Promise<void>;
  authenticateFromCookie: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const authed = !!(typeof window !== 'undefined' && tokens.access);

  const refresh = useCallback(async () => {
    if (!tokens.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const u = await apiMe();
      setUser(u);
    } catch {
      // token invalid
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use cookie-based session (e.g., after Google login)
  const authenticateFromCookie = useCallback(async () => {
    setLoading(true);
    try {
      const u = await meCookie();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (payload: { name: string; email: string; password: string; role?: 'admin' | 'user' }) => {
    await apiRegister(payload);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    apiLogout();
    try {
      await logoutCookie();
    } catch {
      // ignore cookie logout failure
    }
    setUser(null);
  }, []);

  // Initialize from token on mount and when tokens change (cross-tab sync)
  useEffect(() => {
    if (tokens.access) {
      refresh();
    } else {
      // Try cookie-based session
      authenticateFromCookie();
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'refreshToken') {
        refresh();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({ user, authed: !!user, loading, refresh, login, register, logout, authenticateFromCookie }), [user, loading, refresh, login, register, logout, authenticateFromCookie]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
