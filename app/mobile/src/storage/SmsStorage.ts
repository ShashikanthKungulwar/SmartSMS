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
  labels:    'sms:labels',
};

function readLabels(): Record<string, string> {
  const raw = storage.getString(KEYS.labels);
  return raw ? JSON.parse(raw) : {};
}

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

  // Classification cache — single JSON map {id: label}, not per-id keys.
  // A ~50-message inbox means each write serializes a small map (cheap);
  // in exchange we get trivial bulk read/clear and no key sprawl to garbage-collect.
  // Per-id keys ("label:<id>") would give O(1) point writes instead of O(n) map
  // serialization, which would matter for a much larger cached set.
  getLabel(id: string): string | null {
    return readLabels()[id] ?? null;
  },

  setLabel(id: string, label: string) {
    const labels = readLabels();
    labels[id] = label;
    storage.set(KEYS.labels, JSON.stringify(labels));
  },

  removeLabel(id: string) {
    const labels = readLabels();
    delete labels[id];
    storage.set(KEYS.labels, JSON.stringify(labels));
  },
};