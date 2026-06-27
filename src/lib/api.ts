import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ─── Request interceptor: attach JWT ───────────────────────────────────────
// Public endpoints không cần auth token (chỉ GET requests)
const PUBLIC_ENDPOINTS = ['/trips/invite/', '/trips/share/', '/community', '/health'];

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((ep) =>
    config.url?.includes(ep)
  );

  // Chỉ bỏ qua auth token cho GET requests đến public endpoints
  const shouldSkipAuth = isPublicEndpoint && config.method === 'get';

  if (typeof window !== 'undefined' && !shouldSkipAuth) {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response interceptor: handle 401 ─────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

// Auth endpoints không cần refresh — bỏ qua interceptor
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/trips/invite/'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu là auth endpoint hoặc đã retry rồi → reject ngay, không refresh
    const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) =>
      originalRequest?.url?.includes(ep)
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('jwt_token');
        if (!refreshToken) throw new Error('No token');

        const { data } = await api.post('/auth/refresh');
        const newToken = data.token;
        localStorage.setItem('jwt_token', newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('jwt_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
