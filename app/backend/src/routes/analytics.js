import { Router } from 'express';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import CleanLog from '../models/CleanLog.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

const CACHE_TTL_SECONDS = 300;
const TIME_SAVED_PER_ITEM_MINUTES = 0.5; // rough estimate: manual triage time saved per cleaned SMS

router.use(authMiddleware);

router.post('/log', async (req, res, next) => {
  try {
    const { category, action } = req.body;
    if (!category || !action)
      return res.status(400).json({ error: 'category, action required' });

    await CleanLog.create({ userId: req.user.id, category, action });
    await redis.del(`analytics:${req.user.id}`);

    res.status(201).json({ message: 'logged' });
  } catch (e) { next(e); }
});

router.get('/summary', async (req, res, next) => {
  try {
    const cacheKey = `analytics:${req.user.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ ...JSON.parse(cached), cached: true });
    }

    const byCategory = await CleanLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const categoryCounts = {};
    let totalCleaned = 0;
    for (const { _id, count } of byCategory) {
      categoryCounts[_id] = count;
      totalCleaned += count;
    }

    const summary = {
      totalCleaned,
      timeSavedMinutes: Math.round(totalCleaned * TIME_SAVED_PER_ITEM_MINUTES * 10) / 10,
      byCategory: categoryCounts,
    };

    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(summary));

    res.json({ ...summary, cached: false });
  } catch (e) { next(e); }
});

export default router;
