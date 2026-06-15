'use client';

import { create } from 'zustand';
import { isAxiosError } from 'axios';
import { authApi } from '@/lib/api';

const NETWORK_HINT =
  "Can't connect to the API. Start the backend (e.g. npm run dev:backend on port 3000) or set NEXT_PUBLIC_API_URL.";

function normalizeApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && !err.response) {
    return NETWORK_HINT;
  }
  const raw = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const parts = raw.filter((m): m is string => typeof m === 'string' && m.trim());
    if (parts.length) return parts.join(' ');
  }
  return fallback;
}

export interface User {
  id: string;
  email: string;
  role: 'traveler' | 'guide' | 'admin';
  verified: boolean;
  profile: {
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string;
    bio?: string;
    preferredCurrency: string;
    guideVerificationStatus?: 'pending' | 'approved' | 'rejected';
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginOAuth: (provider: string, accessToken: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    role: 'traveler' | 'guide';
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>(
  (set: (state: Partial<AuthState> | ((s: AuthState) => Partial<AuthState>)) => void) => ({
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data } = await authApi.login({ email, password });
        // Backend returns { user, token: { accessToken, refreshToken } }
        const accessToken = data.accessToken ?? data.token?.accessToken;
        const refreshToken = data.refreshToken ?? data.token?.refreshToken;
        if (accessToken) localStorage.setItem('access_token', accessToken);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        // #region agent log
        fetch('http://127.0.0.1:7530/ingest/996782cf-3a56-4e12-b167-d1376a9b8cab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a4fced' },
          body: JSON.stringify({
            sessionId: 'a4fced',
            hypothesisId: 'H4',
            location: 'auth.ts:login:success',
            message: 'login ok',
            data: { role: data.user?.role },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      } catch (err: unknown) {
        const msg = normalizeApiErrorMessage(err, 'Login failed');
        // #region agent log
        fetch('http://127.0.0.1:7530/ingest/996782cf-3a56-4e12-b167-d1376a9b8cab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a4fced' },
          body: JSON.stringify({
            sessionId: 'a4fced',
            hypothesisId: 'H1',
            location: 'auth.ts:login:catch',
            message: 'login err',
            data: {
              status: (err as { response?: { status?: number } }).response?.status,
              hasResponse: !!(err as { response?: unknown }).response,
              isNetwork: isAxiosError(err) && !(err as { response?: unknown }).response,
              normalizedLen: msg.length,
              usedNetworkHint: msg === NETWORK_HINT,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        set({ error: msg, isLoading: false });
        throw err;
      }
    },

    loginOAuth: async (provider: string, accessToken: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data } = await authApi.loginOAuth({ provider, accessToken });
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
      } catch (err: unknown) {
        const msg = normalizeApiErrorMessage(err, 'OAuth login failed');
        set({ error: msg, isLoading: false });
        throw err;
      }
    },

    register: async (data: {
      email: string;
      password: string;
      role: 'traveler' | 'guide';
      firstName: string;
      lastName: string;
    }) => {
      set({ isLoading: true, error: null });
      try {
        const { data: res } = await authApi.register(data);
        // Backend returns { user, token: { accessToken, refreshToken } } or flat { user, accessToken, refreshToken }
        const accessToken = res.accessToken ?? res.token?.accessToken;
        const refreshToken = res.refreshToken ?? res.token?.refreshToken;
        if (accessToken) localStorage.setItem('access_token', accessToken);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        set({ user: res.user, isAuthenticated: true, isLoading: false });
        // #region agent log
        fetch('http://127.0.0.1:7530/ingest/996782cf-3a56-4e12-b167-d1376a9b8cab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a4fced' },
          body: JSON.stringify({
            sessionId: 'a4fced',
            hypothesisId: 'H3',
            location: 'auth.ts:register:success',
            message: 'register ok',
            data: { role: res.user?.role, hasUser: !!res.user },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      } catch (err: unknown) {
        const msg = normalizeApiErrorMessage(err, 'Registration failed');
        // #region agent log
        fetch('http://127.0.0.1:7530/ingest/996782cf-3a56-4e12-b167-d1376a9b8cab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a4fced' },
          body: JSON.stringify({
            sessionId: 'a4fced',
            hypothesisId: 'H1',
            location: 'auth.ts:register:catch',
            message: 'register err',
            data: {
              status: (err as { response?: { status?: number } }).response?.status,
              hasResponse: !!(err as { response?: unknown }).response,
              isNetwork: isAxiosError(err) && !(err as { response?: unknown }).response,
              normalizedLen: msg.length,
              usedNetworkHint: msg === NETWORK_HINT,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        set({ error: msg, isLoading: false });
        throw err;
      }
    },

    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false });
    },

    fetchMe: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) return;
      set({ isLoading: true });
      try {
        const { data } = await authApi.me();
        set({ user: data, isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  })
);
