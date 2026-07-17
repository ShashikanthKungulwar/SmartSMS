import { useState, useCallback } from 'react';
import { SmsRepository } from '../storage/SmsRepository';
import { SmsStorage } from '../storage/SmsStorage';
import { Sms, classifySms } from '../native/SmsNative';

function attachCachedLabels(list: Sms[]): Sms[] {
  return list.map(s => {
    const label = SmsStorage.getLabel(s.id);
    return label ? { ...s, predictedLabel: label } : s;
  });
}

export function useSms() {
  const [smsList, setSmsList]   = useState<Sms[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Classify only messages with no cached label yet, one at a time, updating
  // state as each result lands — never re-classifies a message once cached,
  // which bounds on-device inference to "new messages since last load" instead
  // of the whole inbox every time.
  const classifyUncached = useCallback(async (messages: Sms[]) => {
    for (const msg of messages) {
      let label: string;
      try {
        const result = await classifySms(msg.body);
        label = result.label;
      } catch {
        label = 'unknown';
      }
      SmsStorage.setLabel(msg.id, label);
      setSmsList(prev => prev.map(s => (s.id === msg.id ? { ...s, predictedLabel: label } : s)));
    }
  }, []);

  const load = useCallback(async () => {
    // Show cached immediately
    const cached = SmsRepository.getCached();
    if (cached.length) setSmsList(attachCachedLabels(cached));

    // Then refresh from device
    setLoading(true);
    try {
      const fresh = await SmsRepository.refresh(50);
      const withLabels = attachCachedLabels(fresh);
      setSmsList(withLabels);
      setError(null);

      // Render is already up — fill in labels for uncached messages in the background
      const uncached = withLabels.filter(s => s.predictedLabel === undefined);
      if (uncached.length) classifyUncached(uncached);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [classifyUncached]);

  const deleteSms = useCallback(async (id: string) => {
    await SmsRepository.delete(id);
    setSmsList(prev => prev.filter(s => s.id !== id));
  }, []);

  const search = useCallback((query: string) => {
    setSmsList(attachCachedLabels(SmsRepository.search(query)));
  }, []);

  return { smsList, loading, error, load, deleteSms, search };
}