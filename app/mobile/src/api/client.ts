import axios from 'axios';
import { TokenStorage } from '../storage/TokenStorage';

// Use 10.0.2.2 for Android emulator to reach host machine's localhost
const BASE_URL = 'http://10.0.2.2:3000/api';

export const apiClient = axios.create({ baseURL: BASE_URL });

// Attach access token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await TokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let pendingRequests: ((token: string) => void)[] = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await TokenStorage.getRefreshToken();
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        await TokenStorage.save(data.accessToken, data.refreshToken);

        pendingRequests.forEach(cb => cb(data.accessToken));
        pendingRequests = [];

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        await TokenStorage.clear();
        // Navigate to login screen here (Day 9 will wire this to navigation)
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);