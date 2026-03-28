import axios from 'axios';
import * as Sentry from '@sentry/react';
import { auth } from '../firebase/firebaseConfig';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
});

// ─── Request interceptor: adjunta el Firebase ID token ───────────────────────
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: manejo global de errores ──────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 — Token expirado / inválido
    if (status === 401) {
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 402 — Suscripción vencida o suspendida
    if (status === 402) {
      window.location.href = '/subscription-required';
      return Promise.reject(error);
    }

    // 5xx — Error de servidor: reportar a Sentry con contexto
    if (status >= 500) {
      Sentry.captureException(error, {
        extra: {
          url:    error.config?.url,
          method: error.config?.method,
          status,
          data:   error.response?.data,
        },
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
