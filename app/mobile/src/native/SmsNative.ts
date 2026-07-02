import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export interface Sms {
  id: string;
  address: string;
  body: string;
  date: string;
  read: number;
}

export function getSmsFromInbox(maxCount = 20): Promise<Sms[]> {
  return SmsModule.getSmsFromInbox(maxCount);
}

export function deleteSms(smsId: string): Promise<boolean> {
  return SmsModule.deleteSms(smsId);
}

export function triggerCleanNow(): void {
  console.log(SmsModule);
  SmsModule.triggerCleanNow();
}