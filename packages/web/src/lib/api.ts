import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res: import('axios').AxiosResponse) => res,
  async (error: { config: AxiosRequestConfig & { _retry?: boolean }; response?: { status: number } }) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('access_token', data.accessToken);
          if (original.headers) {
            (original.headers as Record<string, string>).Authorization = `Bearer ${data.accessToken}`;
          }
          return api(original);
        }
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: { email: string; password: string; role: 'traveler' | 'guide'; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  loginOAuth: (data: { provider: string; accessToken: string }) => api.post('/auth/oauth', data),
  resetPassword: (email: string) => api.post('/auth/reset-password', { email }),
  changePassword: (data: { token: string; password: string }) => api.post('/auth/change-password', data),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// Experiences
export const experiencesApi = {
  list: (params?: Record<string, unknown>) => api.get('/experiences', { params }),
  get: (id: string) => api.get(`/experiences/${id}`),
  create: (data: FormData) => api.post('/experiences', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: unknown) => api.put(`/experiences/${id}`, data),
  delete: (id: string) => api.delete(`/experiences/${id}`),
  getReviews: (id: string, params?: Record<string, unknown>) => api.get(`/experiences/${id}/reviews`, { params }),
  getRecommendations: (id: string) => api.get(`/experiences/${id}/recommendations`),
  uploadImage: (id: string, formData: FormData) =>
    api.post(`/experiences/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateAvailability: (id: string, slots: unknown[]) => api.put(`/experiences/${id}/availability`, { slots }),
};

// Bookings
export const bookingsApi = {
  create: (data: unknown) => api.post('/bookings', data),
  get: (id: string) => api.get(`/bookings/${id}`),
  getUserBookings: (userId: string, params?: Record<string, unknown>) => api.get(`/users/${userId}/bookings`, { params }),
  getGuideBookings: (guideId: string, params?: Record<string, unknown>) => api.get(`/guides/${guideId}/bookings`, { params }),
  cancel: (id: string, reason: string) => api.post(`/bookings/${id}/cancel`, { reason }),
  complete: (id: string) => api.post(`/bookings/${id}/complete`),
};

// Payments
export const paymentsApi = {
  process: (data: unknown) => api.post('/payments', data),
  get: (id: string) => api.get(`/payments/${id}`),
  getReceipt: (id: string) => api.get(`/payments/${id}/receipt`),
  refund: (id: string, data: unknown) => api.post(`/payments/${id}/refund`, data),
};

// Trip Planner
export const tripPlannerApi = {
  generate: (data: { naturalLanguageInput: string }) => api.post('/trip-planner/generate', data),
  modify: (id: string, modification: string) => api.put(`/trip-planner/itineraries/${id}`, { modification }),
  getItineraries: () => api.get('/trip-planner/itineraries'),
  getItinerary: (id: string) => api.get(`/trip-planner/itineraries/${id}`),
  exportPdf: (id: string) => api.get(`/trip-planner/itineraries/${id}/export`, { responseType: 'blob' }),
  shareLink: (id: string) => api.post(`/trip-planner/itineraries/${id}/share`),
  sendEmail: (id: string, email: string) => api.post(`/trip-planner/itineraries/${id}/email`, { email }),
  addNote: (id: string, note: string) => api.patch(`/trip-planner/itineraries/${id}/notes`, { note }),
};

// Reviews
export const reviewsApi = {
  create: (data: unknown) => api.post('/reviews', data),
  flag: (id: string, reason: string) => api.post(`/reviews/${id}/flag`, { reason }),
  getGuideReviews: (guideId: string) => api.get(`/guides/${guideId}/reviews`),
};

// Notifications
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  getPreferences: (userId: string) => api.get(`/users/${userId}/notification-preferences`),
  updatePreferences: (userId: string, data: unknown) => api.put(`/users/${userId}/notification-preferences`, data),
};

// Admin
export const adminApi = {
  getVerificationRequests: (status?: string) => api.get('/admin/verification-requests', { params: { status } }),
  approveVerification: (id: string) => api.post(`/admin/verification-requests/${id}/approve`),
  rejectVerification: (id: string, reason: string) => api.post(`/admin/verification-requests/${id}/reject`, { reason }),
  getFlaggedReviews: () => api.get('/admin/reviews/flagged'),
  removeReview: (id: string) => api.delete(`/reviews/${id}`),
  suspendUser: (id: string, reason: string) => api.post(`/admin/users/${id}/suspend`, { reason }),
  unsuspendUser: (id: string) => api.post(`/admin/users/${id}/unsuspend`),
  approveExperience: (id: string) => api.post(`/admin/experiences/${id}/approve`),
  rejectExperience: (id: string, reason: string) => api.post(`/admin/experiences/${id}/reject`, { reason }),
  getMetrics: (params?: Record<string, unknown>) => api.get('/admin/metrics', { params }),
  getAuditLogs: (params?: Record<string, unknown>) => api.get('/admin/audit-logs', { params }),
  issueRefund: (paymentId: string, reason: string) => api.post('/admin/refunds', { paymentId, reason }),
};

// User profile
export const userApi = {
  getProfile: (id: string) => api.get(`/users/${id}/profile`),
  updateProfile: (id: string, data: unknown) => api.put(`/users/${id}/profile`, data),
  getWishlist: (id: string) => api.get(`/users/${id}/wishlist`),
  addToWishlist: (id: string, experienceId: string) => api.post(`/users/${id}/wishlist`, { experienceId }),
  removeFromWishlist: (id: string, experienceId: string) => api.delete(`/users/${id}/wishlist/${experienceId}`),
};
