import axios from 'axios';
import { clearAuth } from '../utils/auth';

/** Dev: dùng URL tương đối để Vite proxy /api → backend (hoạt động khi mở app từ điện thoại qua LAN). */
const resolveBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return '';
  return 'https://backend-chamcong.onrender.com';
};

const axiosClient = axios.create({
  baseURL: resolveBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthPage = ['/login', '/register', '/forgot-password'].some((p) =>
        window.location.pathname.startsWith(p)
      );
      const isFaceBusinessError = Boolean(error.response?.data?.faceMatchError);
      const requestUrl = String(error.config?.url || '');
      const isCheckinRequest = requestUrl.includes('/attendances/checkin');
      if (!isAuthPage && !isFaceBusinessError && !isCheckinRequest) {
        clearAuth();
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 403 && error.response?.data?.isRestricted) {
      if (!window.location.pathname.startsWith('/profile')) {
        window.location.href = '/profile';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
