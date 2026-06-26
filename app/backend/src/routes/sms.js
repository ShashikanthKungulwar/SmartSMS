import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { smsQueue } from '../services/smsQueue.js';

const router = Router();
router.use(authMiddleware);
// console.log(process.env)
// Android will call this when SMS is received
router.post('/process', async (req, res) => {
  try {
    const { smsBody, sender } = req.body;
    if (!smsBody) return res.status(400).json({ error: 'smsBody required' });

    const job = await smsQueue.add('classify', {
      userId: req.user.id,
      smsBody,
      sender,
      receivedAt: new Date().toISOString(),
    });

    res.json({ jobId: job.id, message: 'SMS queued for processing' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;