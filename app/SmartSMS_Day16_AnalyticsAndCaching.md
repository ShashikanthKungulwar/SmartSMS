# SmartSMS — Analytics Dashboard & Redis Caching (Day 16)

A per-user cleanup analytics dashboard backed by a MongoDB aggregation, fronted by a Redis cache-aside layer with a 5-minute TTL.

---

## What This Does

Every time a message gets cleaned (manual delete or the OTP auto-clean worker), the mobile app logs a `{category, action}` event. The dashboard reads back a summary — total messages cleaned, estimated time saved, and a per-category breakdown — computed from those logs.

```
Mobile: delete / auto-clean
        │  POST /api/analytics/log
        ▼
Backend: write CleanLog row → invalidate analytics:<userId> in Redis
        │
        ▼
Mobile: open Analytics screen
        │  GET /api/analytics/summary
        ▼
Backend: Redis hit? → return cached JSON (cached:true)
         Redis miss? → MongoDB aggregate → cache 300s → return (cached:false)
```

---

## Why Cache-Aside Here

Analytics summaries are read far more often than written — every dashboard open vs. only on cleanup events — and the aggregate counts don't need per-request precision. A total that's up to 5 minutes stale is invisible to the user. That's the profile of a good cache candidate: **read-heavy, write-light, and tolerant of staleness.**

Contrast with something like the SMS list or a JWT check, where serving stale data is a correctness bug, not a UX nicety — those must hit the source of truth every time.

The write path (`POST /log`) invalidates rather than updates the cache. Recomputing via aggregation on the next read is simpler than trying to keep a cached aggregate incrementally correct, and writes are infrequent enough that the extra recompute is cheap.

---

## Architecture

### 1. Backend — `CleanLog` Model (`models/CleanLog.js`)

```js
{ userId, category, action, cleanedAt }
```
Indexed on `{ userId: 1, cleanedAt: -1 }` — matches the query shape (per-user, recency-ordered) even though the current aggregation only filters by `userId`; this also supports a future "recent activity" list without a new index.

### 2. Backend — Analytics Routes (`routes/analytics.js`)

```
POST /api/analytics/log      (authenticated) → write CleanLog, del cache key
GET  /api/analytics/summary  (authenticated) → cache-aside read
```

```js
router.get('/summary', async (req, res, next) => {
  const cacheKey = `analytics:${req.user.id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ ...JSON.parse(cached), cached: true });

  const byCategory = await CleanLog.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  // ...build summary...

  await redis.setex(cacheKey, 300, JSON.stringify(summary));
  res.json({ ...summary, cached: false });
});
```

- `setex` sets value + TTL as **one atomic operation** — avoids a window where the key exists without an expiry (which `set` + `expire` as two calls would create).
- The `cached` flag is attached at response time, not stored in the cached blob — so the same cached JSON correctly reports `false` on the write that populated it and `true` on every subsequent hit.
- `req.user.id` is a plain string from the JWT payload; Mongoose auto-casts strings in `find()`/`create()` but **not** in raw aggregation pipelines, so `$match` needs an explicit `new mongoose.Types.ObjectId(...)` cast — a real gotcha, not boilerplate.
- Redis connection reuses the same `ioredis` construction pattern as `smsQueue.js` (`REDIS_HOST`/`REDIS_PORT` env vars, same defaults) but is its own instance — no BullMQ-specific `maxRetriesPerRequest: null` needed since there's no queue involved.

### 3. Mobile — API Client (`api/analytics.ts`)

```ts
getAnalytics(): Promise<AnalyticsSummary>       // GET /analytics/summary
logClean(category: string, action: string)      // POST /analytics/log
```

### 4. Mobile — Dashboard (`screens/DashboardScreen.tsx`)

Stat tiles (total cleaned, time saved) + horizontal bars per category, scaled to the max category count. Pull-to-refresh re-fetches. Wired into `App.tsx` as a new `dashboard` screen state, reachable via an "Analytics" button in the home header.

### 5. Mobile — Wiring Real Data (`App.tsx`)

Two places generate real events:

- **Manual delete** (the per-message Delete button): classifies the message on-device first (`classifySms`) so the logged category reflects an actual prediction, then deletes, then logs `(label, 'delete')`.
- **Auto-clean** ("Run Clean Now" → `SmsCleanWorker.kt`): the native worker only ever matches OTP patterns (`cleanOtpSms` — regex on 4-8 digit codes, "otp", "verification code", etc.), so the JS side logs `('OTP', 'auto-clean')` after the trigger resolves. This is a **best-effort approximation**, not an exact count — the Kotlin worker doesn't currently report back how many messages it actually deleted, since `triggerCleanNow()` only resolves a boolean.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Cache-aside, not write-through | Writes (cleanup events) are infrequent relative to reads (dashboard opens); recomputing on miss is simpler than keeping a cached aggregate incrementally consistent. |
| 5-minute TTL | Long enough to absorb repeated dashboard opens in a session, short enough that new activity shows up without feeling stale. |
| Invalidate (del) on write, not update-in-place | One line, no risk of the cached aggregate drifting from the DB; the next read just recomputes. |
| `cached` flag added at response time | Keeps the cached payload itself a pure snapshot of the data — the read/write path, not the data, determines the flag. |
| Explicit `ObjectId` cast in aggregation | Mongoose's auto-casting only applies to its query builder API, not raw `$match` stages — a common aggregation bug if missed. |
| Auto-clean logs a fixed `('OTP', 'auto-clean')` | Matches `SmsCleanWorker`'s actual (OTP-only) behavior without requiring a native→JS bridge change to report per-run counts. |

---

## How to Run & Test Manually

### Backend (curl)

```bash
# 1. Bring up the stack (rebuild backend — the analytics route needs a fresh image)
docker compose up -d --build backend mongo redis

# 2. Register a test user, grab the accessToken
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","name":"Test"}'

TOKEN="<accessToken from response>"

# 3. Log a few cleanup events
curl -X POST http://localhost:3000/api/analytics/log \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category":"OTP","action":"delete"}'

curl -X POST http://localhost:3000/api/analytics/log \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category":"Promo","action":"delete"}'

# 4. Read the summary twice — first is a miss, second is a hit
curl http://localhost:3000/api/analytics/summary -H "Authorization: Bearer $TOKEN"
#   → {"totalCleaned":2,...,"cached":false}
curl http://localhost:3000/api/analytics/summary -H "Authorization: Bearer $TOKEN"
#   → same numbers, "cached":true

# 5. Inspect the cache directly
docker compose exec redis redis-cli TTL "analytics:<userId>"     # ~300, counting down
docker compose exec redis redis-cli GET "analytics:<userId>"     # the cached JSON

# 6. Log one more event and confirm the cache was invalidated
curl -X POST http://localhost:3000/api/analytics/log \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category":"Spam","action":"delete"}'
docker compose exec redis redis-cli EXISTS "analytics:<userId>"  # → 0
curl http://localhost:3000/api/analytics/summary -H "Authorization: Bearer $TOKEN"
#   → totalCleaned now 3, "cached":false again
```

You can also open **RedisInsight** at `http://localhost:5540`, connect to the `redis` container, and watch the `analytics:<userId>` key appear/disappear/expire live instead of using `redis-cli`.

### Mobile (Android emulator)

```bash
cd app/mobile
npx react-native run-android
```

1. Log in (or register) in the app — this is the same backend, so the emulator reaches it via `10.0.2.2:3000`.
2. Grant SMS permissions when prompted so the inbox list populates.
3. Tap **Delete** on any message → it's classified on-device, deleted, and logged.
4. Tap **Run Clean Now** → triggers the OTP auto-clean worker and logs an `OTP`/`auto-clean` event.
5. Tap **Analytics** in the header → opens `DashboardScreen`, showing total cleaned, time saved, and the per-category bars. Note the small "freshly computed" / "served from cache" label under the stat tiles — leave the screen and come back within 5 minutes to see it flip to cached, or wait 5+ minutes for it to recompute.
6. Pull down to refresh the dashboard — this re-fetches `/summary` (still subject to the cache TTL).

---

## Verified End-to-End

Tested directly against the Docker Compose stack (`mongo`, `redis`, `backend`) with curl:

```
POST /api/analytics/log {OTP, delete}       → {"message":"logged"}
POST /api/analytics/log {Promo, delete}     → {"message":"logged"}
POST /api/analytics/log {OTP, auto-clean}   → {"message":"logged"}

GET /api/analytics/summary  (1st call)
→ {"totalCleaned":3,"timeSavedMinutes":1.5,"byCategory":{"OTP":2,"Promo":1},"cached":false}

GET /api/analytics/summary  (2nd call)
→ {"totalCleaned":3,"timeSavedMinutes":1.5,"byCategory":{"OTP":2,"Promo":1},"cached":true}

redis-cli TTL analytics:<userId>   → 296   (just under the 300s setex)

POST /api/analytics/log {Spam, delete}      → invalidates cache
redis-cli EXISTS analytics:<userId>          → 0
GET /api/analytics/summary
→ {"totalCleaned":4,"timeSavedMinutes":2,"byCategory":{"Promo":1,"Spam":1,"OTP":2},"cached":false}
```

Confirms: cache miss computes + populates correctly, cache hit skips MongoDB, write invalidates, and TTL is set atomically.

Mobile side: `npx tsc --noEmit` passes clean on the new files and the modified `App.tsx`.

---

## Known Limitations (Roadmap)

- **Auto-clean count is approximate** — `triggerCleanNow()` only returns a boolean, so every worker run logs a single fixed event rather than the real count of deleted messages. Fixing this needs `SmsCleanWorker` to return `deletedCount` up through `SmsModule` to JS.
- **`timeSavedMinutes` is a rough constant** (`0.5 min/message`), not measured — a reasonable placeholder for a resume demo, not a real UX metric.
- **No cache stampede protection** — if many requests race on a cold cache for the same user, they'll all miss and hit MongoDB simultaneously. Not a concern at this scale (single user per key, low concurrency), but a production version might use a short-lived lock or request coalescing.
- **`POST /log` category isn't validated** against the known label set (unlike `/feedback`, which checks `LABELS.includes(correct)`) — acceptable since it's app-generated, not user-typed, but worth tightening if the endpoint is ever exposed more broadly.

---

## Interview Framing

> "I added a per-user analytics dashboard with a Redis cache-aside layer in front of a MongoDB aggregation. The key judgment call was recognizing analytics as a good caching candidate in the first place — read-heavy, write-light, and tolerant of a few minutes of staleness — versus data like the SMS list or auth checks where staleness would be a correctness bug. I used `setex` specifically for atomicity, invalidate-on-write instead of trying to keep a cached aggregate incrementally correct, and hit a real Mongoose gotcha where auto-casting doesn't extend to raw aggregation pipelines. I verified the whole cache lifecycle — miss, hit, invalidation, TTL — against the live Docker stack rather than just trusting the code path."

This demonstrates: cache strategy judgment (not just "add Redis"), MongoDB aggregation, atomic Redis operations, and end-to-end verification discipline.
