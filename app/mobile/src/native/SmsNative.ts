import { NativeModules, DeviceEventEmitter } from 'react-native';
import { apiClient } from '../api/client';
const { SmsModule } = NativeModules;

export interface Sms {
  id: string;
  address: string;
  body: string;
  date: string;
  read: number;
  predictedLabel?: string;
}

export interface IncomingSms {
  sender: string;
  body: string;
}

export interface Classification {
  label: string;
  confidence: number;
  latencyMs: number;
}

export function classifySms(text: string): Promise<Classification> {
  return SmsModule.classifySms(text);
}


export function getSmsFromInbox(maxCount = 20): Promise<Sms[]> {
  return SmsModule.getSmsFromInbox(maxCount);
}

export function deleteSms(smsId: string): Promise<boolean> {
  return SmsModule.deleteSms(smsId);
}

export function triggerCleanNow(): Promise<boolean> {
  return SmsModule.triggerCleanNow();
}

export function onSmsReceived(callback: (sms: IncomingSms) => void): () => void {
  const subscription = DeviceEventEmitter.addListener('onSmsReceived', callback);
  return () => subscription.remove();
}


export async function submitFeedback(text: string, predicted: string, correct: string) {
  await apiClient.post('/feedback', { text, predicted, correct });
}