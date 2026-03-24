import axios from 'axios';
import { auth } from '../firebase/firebaseConfig';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
});

// Interceptor: adjunta el Firebase ID token en cada request
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: manejo global de errores de respuesta
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — Firebase lo refresca automáticamente
      // Si persiste, redirigir al login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
