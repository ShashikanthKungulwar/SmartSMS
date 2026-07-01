import { apiClient } from './client';
import { TokenStorage } from '../storage/TokenStorage';

export const AuthApi = {
  async register(email: string, password: string, name: string) {
    const { data } = await apiClient.post('/auth/register', { email, password, name });
    await TokenStorage.save(data.accessToken, data.refreshToken);
    return data;
  },
// refreshToken
  async login(email: string, password: string) {
    console.log('Attempting login with email:', email); // Debugging line
    const { data } = await apiClient.post('/auth/login', { email, password });
    // console.log('Login response data:', data); // Debugging line
    await TokenStorage.save(data.accessToken, data.refreshToken);
    return data;
  },

  async logout() {
    const refreshToken = await TokenStorage.getRefreshToken();
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      await TokenStorage.clear();
    }
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await TokenStorage.getAccessToken();
    return !!token;
  },
};