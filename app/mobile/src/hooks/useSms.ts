import { useState, useCallback } from 'react';
import { SmsRepository } from '../storage/SmsRepository';
import { Sms } from '../native/SmsNative';

export function useSms() {
  const [smsList, setSmsList]   = useState<Sms[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    // Show cached immediately
    const cached = SmsRepository.getCached();
    if (cached.length) setSmsList(cached);

    // Then refresh from device
    setLoading(true);
    try {
      const fresh = await SmsRepository.refresh(50);
      setSmsList(fresh);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSms = useCallback(async (id: string) => {
    await SmsRepository.delete(id);
    setSmsList(prev => prev.filter(s => s.id !== id));
  }, []);

  const search = useCallback((query: string) => {
    setSmsList(SmsRepository.search(query));
  }, []);

  return { smsList, loading, error, load, deleteSms, search };
}