import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import { authApi } from '../lib/api';

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
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.login({ email, password });
      await Keychain.setGenericPassword('token', data.accessToken, { service: 'access_token' });
      await Keychain.setGenericPassword('token', data.refreshToken, { service: 'refresh_token' });
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  loginOAuth: async (provider, accessToken) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.loginOAuth({ provider, accessToken });
      await Keychain.setGenericPassword('token', data.accessToken, { service: 'access_token' });
      await Keychain.setGenericPassword('token', data.refreshToken, { service: 'refresh_token' });
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'OAuth login failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { data: res } = await authApi.register(data);
      await Keychain.setGenericPassword('token', res.accessToken, { service: 'access_token' });
      await Keychain.setGenericPassword('token', res.refreshToken, { service: 'refresh_token' });
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await Keychain.resetGenericPassword({ service: 'access_token' });
    await Keychain.resetGenericPassword({ service: 'refresh_token' });
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const creds = await Keychain.getGenericPassword({ service: 'access_token' }).catch(() => null);
    if (!creds) return;
    set({ isLoading: true });
    try {
      const { data } = await authApi.me();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
