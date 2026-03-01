import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { AppUser, AuthState } from '../types';
import * as api from '../api';

// ── Context shape ───────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Storage key ─────────────────────────────────────────────────

const STORAGE_KEY = 'rajutechie_streamkit_auth';

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted storage — ignore
  }
  return { user: null, authToken: null, rajutechieStreamKitToken: null };
}

function saveToStorage(state: AuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Provider ────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  // Keep the axios interceptor token in sync
  useEffect(() => {
    api.setAuthToken(state.authToken);
  }, [state.authToken]);

  const loginFn = useCallback(async (username: string, password: string) => {
    const result = await api.login(username, password);
    const newState: AuthState = {
      user: result.user,
      authToken: result.authToken,
      rajutechieStreamKitToken: result.rajutechieStreamKitToken,
    };
    setState(newState);
    saveToStorage(newState);
  }, []);

  const registerFn = useCallback(
    async (username: string, password: string, displayName?: string) => {
      const result = await api.register(username, password, displayName);
      const newState: AuthState = {
        user: result.user,
        authToken: result.authToken,
        rajutechieStreamKitToken: result.rajutechieStreamKitToken,
      };
      setState(newState);
      saveToStorage(newState);
    },
    []
  );

  const logoutFn = useCallback(() => {
    setState({ user: null, authToken: null, rajutechieStreamKitToken: null });
    api.setAuthToken(null);
    clearStorage();
  }, []);

  const value: AuthContextValue = {
    ...state,
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
    isAuthenticated: state.user !== null && state.authToken !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
