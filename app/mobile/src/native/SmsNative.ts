import { NativeModules, DeviceEventEmitter } from 'react-native';

const { SmsModule } = NativeModules;

export interface Sms {
  id: string;
  address: string;
  body: string;
  date: string;
  read: number;
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