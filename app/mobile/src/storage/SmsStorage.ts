// import { MMKV } from 'react-native-mmkv';
import { Sms } from '../native/SmsNative';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({
  id: 'sms-storage',
});

// const storage = new MMKV({ id: 'sms-storage' });

const KEYS = {
  smsList:   'sms:list',
  lastSync:  'sms:lastSync',
};

export const SmsStorage = {
  save(smsList: Sms[]) {
    storage.set(KEYS.smsList, JSON.stringify(smsList));
    storage.set(KEYS.lastSync, Date.now().toString());
  },

  getAll(): Sms[] {
    const raw = storage.getString(KEYS.smsList);
    return raw ? JSON.parse(raw) : [];
  },

  getLastSync(): number {
    const raw = storage.getString(KEYS.lastSync);
    return raw ? parseInt(raw) : 0;
  },

  clear() {
    storage.remove(KEYS.smsList);
    storage.remove(KEYS.lastSync);
  },
};