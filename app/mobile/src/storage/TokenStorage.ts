import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  accessToken:  'auth.accessToken',
  refreshToken: 'auth.refreshToken',
};

export const TokenStorage = {
  async save(accessToken: string, refreshToken: string) {
    await AsyncStorage.setItem(KEYS.accessToken, accessToken);
    await AsyncStorage.setItem(KEYS.refreshToken, refreshToken);
  },

  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.accessToken);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.refreshToken);
  },

  async clear() {
    await AsyncStorage.removeItem(KEYS.accessToken);
    await AsyncStorage.removeItem(KEYS.refreshToken);
  },
};