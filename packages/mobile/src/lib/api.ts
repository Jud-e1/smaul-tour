import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';

const API_URL = process.env.API_URL || 'http://localhost:3000';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const credentials = await Keychain.getGenericPassword({ service: 'access_token' });
    if (credentials && config.headers) {
      config.headers.Authorization = `Bearer ${credentials.password}`;
    }
  } catch {
    // ignore keychain errors
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const creds = await Keychain.getGenericPassword({ service: 'refresh_token' });
        if (creds) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: creds.password,
          });
          await Keychain.setGenericPassword('token', data.accessToken, { service: 'access_token' });
          if (original.headers) {
            (original.headers as Record<string, string>).Authorization =
              `Bearer ${data.accessToken}`;
          }
          return api(original);
        }
      } catch {
        await Keychain.resetGenericPassword({ service: 'access_token' });
        await Keychain.resetGenericPassword({ service: 'refresh_token' });
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    role: 'traveler' | 'guide';
    firstName: string;
    lastName: string;
  }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  loginOAuth: (data: { provider: string; accessToken: string }) => api.post('/auth/oauth', data),
  resetPassword: (email: string) => api.post('/auth/reset-password', { email }),
  me: () => api.get('/auth/me'),
};

export const experiencesApi = {
  list: (params?: Record<string, unknown>) => api.get('/experiences', { params }),
  get: (id: string) => api.get(`/experiences/${id}`),
  getReviews: (id: string, params?: Record<string, unknown>) =>
    api.get(`/experiences/${id}/reviews`, { params }),
  getRecommendations: (id: string) => api.get(`/experiences/${id}/recommendations`),
};

export const bookingsApi = {
  create: (data: unknown) => api.post('/bookings', data),
  getUserBookings: (userId: string, params?: Record<string, unknown>) =>
    api.get(`/users/${userId}/bookings`, { params }),
  cancel: (id: string, reason: string) => api.post(`/bookings/${id}/cancel`, { reason }),
};

export const tripPlannerApi = {
  generate: (data: { naturalLanguageInput: string }) => api.post('/trip-planner/generate', data),
  modify: (id: string, modification: string) =>
    api.put(`/trip-planner/itineraries/${id}`, { modification }),
  getItineraries: () => api.get('/trip-planner/itineraries'),
  getItinerary: (id: string) => api.get(`/trip-planner/itineraries/${id}`),
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
};
