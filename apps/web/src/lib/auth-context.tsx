'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import type { PublicUser } from './api-types';

const TOKEN_KEY = 'ajai_token';
const REFRESH_KEY = 'ajai_refresh';

interface AuthContextValue {
  user: PublicUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!stored) {
      setLoading(false);
      return;
    }
    api
      .me(stored)
      .then((me) => {
        setUser(me);
        setToken(stored);
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = (result: Awaited<ReturnType<typeof api.login>>) => {
    window.localStorage.setItem(TOKEN_KEY, result.tokens.accessToken);
    window.localStorage.setItem(REFRESH_KEY, result.tokens.refreshToken);
    setToken(result.tokens.accessToken);
    setUser(result.user);
  };

  const login = async (email: string, password: string) => {
    persist(await api.login({ email, password }));
  };

  const register = async (email: string, password: string, displayName?: string) => {
    persist(await api.register({ email, password, displayName }));
  };

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
