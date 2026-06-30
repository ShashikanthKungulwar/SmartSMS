import { getSmsFromInbox, Sms,deleteSms} from '../native/SmsNative';
import { SmsStorage } from './SmsStorage';

export const SmsRepository = {
  // Fetch from device + persist locally
  async refresh(maxCount = 50): Promise<Sms[]> {
    const messages = await getSmsFromInbox(maxCount);
    SmsStorage.save(messages);
    return messages;
  },

  // Read from local cache (offline-safe)
  getCached(): Sms[] {
    return SmsStorage.getAll();
  },

  // Delete SMS + remove from cache
  async delete(smsId: string): Promise<void> {
    // const { deleteSms } = require('../native/SmsNative');
    console.log("Deleting SMS id:", smsId);
    await deleteSms(smsId);
    const updated = SmsStorage.getAll().filter(s => s.id !== smsId);
    SmsStorage.save(updated);
  },
 

  // Filter by keyword
  search(query: string): Sms[] {
    const all = SmsStorage.getAll();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(s =>
      s.body.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  },
};