import { apiClient } from './client';

export interface AnalyticsSummary {
  totalCleaned: number;
  timeSavedMinutes: number;
  byCategory: Record<string, number>;
  cached: boolean;
}

export async function getAnalytics(): Promise<AnalyticsSummary> {
  const { data } = await apiClient.get('/analytics/summary');
  return data;
}

export async function logClean(category: string, action: string): Promise<void> {
  await apiClient.post('/analytics/log', { category, action });
}
