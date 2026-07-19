import { Router } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import Feedback from '../models/Feedback.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:5000';
const RETRAIN_THRESHOLD = 500;
// const RETRAIN_THRESHOLD = 2;

const LABELS = ['OTP', 'Bank', 'Promo', 'Delivery', 'Spam', 'Personal'];

// These two routes are public (above authMiddleware) because ai-service calls them
// without a user session — gate them with a shared secret instead so feedback text
// isn't readable by anyone who can reach the backend.
const requireInternalToken = (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Feedback the ai-service pulls for retraining
router.get('/pending', requireInternalToken, async (req, res, next) => {
  try {
    const items = await Feedback.find({ used: false }).select('text correct -_id');
    res.json({ count: items.length, items });
  } catch (e) { next(e); }
});
router.post('/mark-used', requireInternalToken, async (req, res, next) => {
  try {
    await Feedback.updateMany({ used: false }, { used: true });
    res.json({ message: 'marked used' });
  } catch (e) { next(e); }
});
router.use(authMiddleware);

router.post('/', async (req, res, next) => {
  try {
    const { text, predicted, correct } = req.body;
    if (!text || !predicted || !correct)
      return res.status(400).json({ error: 'text, predicted, correct required' });
    if (!LABELS.includes(correct))
      return res.status(400).json({ error: 'invalid label' });

    const smsHash = crypto.createHash('sha256').update(text).digest('hex');

    await Feedback.create({ userId: req.user.id, smsHash, text, predicted, correct });

    // Count unused feedback → trigger retrain at threshold
    const pending = await Feedback.countDocuments({ used: false });
    let retrainTriggered = false;
    if (pending >= RETRAIN_THRESHOLD) {
      axios.post(`${AI_SERVICE_URL}/retrain`, {}).catch(e =>
        console.error('Retrain trigger failed:', e.message));
      retrainTriggered = true;
    }

    res.status(201).json({ message: 'Feedback recorded', pending, retrainTriggered });
  } catch (e) { next(e); }
});


export default router;