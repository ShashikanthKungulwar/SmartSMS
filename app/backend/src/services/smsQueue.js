import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import RuleEngine from './RuleEngine.js';
import Rule from '../models/Rule.js';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,  // required by BullMQ
});

// Queue: anything can push SMS events here
export const smsQueue = new Queue('sms.received', { connection });

// Worker: processes each SMS event
const worker = new Worker('sms.received', async (job) => {
  const { userId, smsBody, sender, receivedAt } = job.data;

  // Fetch user's active rules
  const rules = await Rule.find({ userId, isActive: true }).sort({ priority: -1 });

  const result = RuleEngine.match(smsBody, rules);

  if (!result) {
    console.log(`[SMS] No rule matched for user ${userId}`);
    return { action: 'none' };
  }

  // Action handlers
  switch (result.action) {
    case 'delete':
      console.log(`[SMS] DELETE scheduled — type:${result.type} ttl:${result.ttl}min`);
      // Android handles actual deletion — backend just confirms the decision
      break;
    case 'archive':
      console.log(`[SMS] ARCHIVE — type:${result.type}`);
      break;
    case 'notify':
      console.log(`[SMS] NOTIFY — type:${result.type}`);
      break;
  }

  return { action: result.action, type: result.type, ruleId: result.ruleId };
}, { connection });

worker.on('completed', (job, result) => {
  console.log(`[Queue] Job ${job.id} done:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job.id} failed:`, err.message);
});