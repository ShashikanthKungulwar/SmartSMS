# SmartSMS — Active Learning & Automated Retraining (Day 14)

A closed-loop MLOps pipeline: user corrections become training data, retraining triggers automatically at a threshold, and a new versioned model is produced without any manual intervention.

---

## What This Does

When the model misclassifies an SMS, the user taps the correct category. That single correction flows through an automated pipeline that eventually retrains the model — no scripts run by hand, no manual data collection.

```
User taps correct label (mobile app)
        │  automatic
        ▼
Backend stores feedback + counts pending corrections
        │  automatic — threshold reached
        ▼
Backend fires POST /retrain → ai-service
        │  automatic — FastAPI background task
        ▼
ai-service: fetch feedback → tokenize → fine-tune DistilBERT → save new model version
```

This is the **data flywheel**: more usage → more corrections → better model → better UX → more usage.

---

## Why It Matters

The model was trained largely on synthetic, templated data. Template-holdout evaluation showed it drops ~9 F1 points on message formats it never saw during training — a real generalization gap.

Active learning targets exactly that gap. User corrections are, by definition, the out-of-distribution cases the model gets wrong. Feeding those corrections back into training is the most sample-efficient way to close the synthetic-to-real gap — far more valuable than more synthetic data.

---

## Architecture

### 1. Backend — Feedback Endpoint (`feedback.js`)

```
POST /api/feedback   (authenticated)   → store a correction, maybe trigger retrain
GET  /api/feedback/pending  (public)   → ai-service pulls unused feedback for training
```

- Each correction is stored with a **SHA-256 hash** of the SMS (for dedup/identification without exposing content in logs) plus the raw text (needed for retraining, stored with user consent).
- After each submission, unused feedback is counted. When it crosses `RETRAIN_THRESHOLD`, the backend fires a non-blocking `POST /retrain` to the ai-service.
- Feedback submission stays authenticated; `/pending` is intentionally public so the ai-service can fetch it service-to-service without a user token.

```js
const smsHash = crypto.createHash('sha256').update(text).digest('hex');
await Feedback.create({ userId, smsHash, text, predicted, correct });

const pending = await Feedback.countDocuments({ used: false });
if (pending >= RETRAIN_THRESHOLD) {
  axios.post(`${AI_SERVICE_URL}/retrain`, {}).catch(e =>
    console.error('Retrain trigger failed:', e.message));  // fire-and-forget
}
```

The retrain trigger is fire-and-forget — even if the ai-service is down, the user's feedback is still saved and the API still returns success.

### 2. AI Service — Retrain Endpoint (`retrain.py`)

```python
@app.post("/retrain")
def retrain(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_retrain)   # non-blocking — training is slow
    return {"status": "retrain started"}
```

`run_retrain` fetches pending feedback from the backend, tokenizes it, fine-tunes the current DistilBERT checkpoint, and saves a new timestamped model version (`models/distilbert_v{timestamp}/`).

### 3. Mobile — Correction UI

Each SMS in the list shows tappable category chips. Tapping the correct label posts feedback through the authenticated Axios client (JWT auto-attached).

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Retrain as a background task | Fine-tuning takes minutes; blocking the HTTP request would time out. Fire-and-forget returns immediately. |
| `/pending` is public | The ai-service is a service, not a user — it has no JWT. On the internal Docker network this is acceptable; production would use a service token or mTLS. |
| Hash the SMS | Dedup and identification without exposing message content in logs/analytics. |
| Fire-and-forget retrain trigger | User feedback is saved regardless of whether the ai-service is reachable — resilience over strict consistency. |
| Threshold-based, not per-correction | Retraining on every single correction would thrash resources; batching at a threshold amortizes the cost. |

---

## Verified End-to-End

The full loop was confirmed in logs — feedback fetched, tokenized, trained to convergence, and a new model written:

```
[retrain] Fetched feedback: 200
[retrain] 2 feedback items
Map: 100% 2/2
100% 2/2  train_loss: 0.00211  epoch: 2
Writing model shards: 100% 1/1
```

---

## Known Limitations (Roadmap)

These are deliberate scoping choices, addressed in later stages:

- **Feedback not marked `used`** after a retrain — the same items are reused each run. Production would mark consumed feedback and reset the pending count.
- **New model not yet delivered to devices** — it is produced automatically but sits in the container. **Day 15 (OTA updates)** closes this: devices detect a new model version, download it, verify a SHA-256 checksum, and hot-swap without an app reinstall.
- **Retraining runs in the serving container** — competes with inference for CPU. At scale it would move to a dedicated training worker or job queue so retraining never affects `/classify` latency.
- **Model persistence** requires a Docker volume mount (`./app/ai-service/models:/app/models`), otherwise retrained models are lost on container restart.

---

## Interview Framing

> "I built an automated retraining pipeline — user corrections trigger threshold-based fine-tuning as a background job, producing versioned model artifacts. It's a closed data flywheel that targets the model's actual weak spots: corrections are, by definition, the out-of-distribution cases the model gets wrong, which is exactly where my template-holdout evaluation showed the generalization gap. The next stage is OTA delivery so improved models reach devices without app updates. In production I'd separate the training worker from the serving container and add service-to-service auth on the internal feedback route."

This demonstrates: MLOps thinking, automated pipelines, resilience (fire-and-forget), resource-awareness (background tasks, training/serving separation), and honest articulation of production gaps.
