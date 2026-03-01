/**
 * AuthContext -- provides login / register / logout functionality and
 * persists the session in localStorage so it survives page reloads.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import * as api from '../api';
import type { AppUser } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true, // true while we check localStorage
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('rajutechie-streamkit_user');
      const storedToken = localStorage.getItem('rajutechie-streamkit_token');
      if (storedUser && storedToken) {
        setState({
          user: JSON.parse(storedUser) as AppUser,
          token: storedToken,
          loading: false,
        });
        return;
      }
    } catch {
      // corrupt data -- clear it
      localStorage.removeItem('rajutechie-streamkit_user');
      localStorage.removeItem('rajutechie-streamkit_token');
    }
    setState((prev) => ({ ...prev, loading: false }));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { user, token } = await api.login(username, password);
    localStorage.setItem('rajutechie-streamkit_user', JSON.stringify(user));
    localStorage.setItem('rajutechie-streamkit_token', token);
    setState({ user, token, loading: false });
  }, []);

  const register = useCallback(
    async (username: string, password: string, displayName?: string) => {
      const { user, token } = await api.register(username, password, displayName);
      localStorage.setItem('rajutechie-streamkit_user', JSON.stringify(user));
      localStorage.setItem('rajutechie-streamkit_token', token);
      setState({ user, token, loading: false });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('rajutechie-streamkit_user');
    localStorage.removeItem('rajutechie-streamkit_token');
    setState({ user: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
