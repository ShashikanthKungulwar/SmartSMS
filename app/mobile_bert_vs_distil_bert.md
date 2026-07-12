# SmartSMS — Privacy-First On-Device Intelligent SMS Manager

An Android app that classifies incoming SMS into six categories entirely on-device and auto-cleans OTP messages after they expire — no SMS ever leaves the phone. Built as a full-stack + ML systems project spanning a Node.js backend, a React Native app with custom native modules, and a fine-tuned DistilBERT model deployed to on-device TensorFlow Lite.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Architecture](#architecture)
- [Tech Stack & Why](#tech-stack--why)
- [How It Works](#how-it-works)
- [The ML Story](#the-ml-story)
- [Build Journey (Days 1–13)](#build-journey)
- [Notable Engineering Problems Solved](#notable-engineering-problems-solved)
- [Key Design Decisions](#key-design-decisions)
- [Running Locally](#running-locally)
- [Roadmap](#roadmap)

---

## The Problem

SMS inboxes accumulate noise. OTPs, bank alerts, delivery updates, promotional spam, and personal messages all pile up together. OTP messages in particular are single-use — the moment they expire they are pure clutter, yet they linger indefinitely.

A naive fix ("delete anything with a 4–8 digit number") is brittle: it misses OTPs phrased without the word "OTP", and it wrongly deletes promo codes, delivery PINs, and personal messages that also contain numbers.

## The Solution

SmartSMS treats the inbox as an unstructured classification problem:

1. **On-device ML** classifies every SMS into one of six categories: `OTP`, `Bank`, `Promo`, `Delivery`, `Spam`, `Personal`.
2. **A rule engine** decides what action to take per category (delete, archive, notify) with a configurable time-to-live.
3. **A background scheduler** auto-cleans expired OTPs without user intervention.
4. **A backend** handles auth, cross-device rule sync, and (planned) a retraining pipeline driven by user feedback.

The defining constraint: **privacy by architecture**. Classification runs on-device via TensorFlow Lite, so message content never touches a server.

---

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│   Android App           │        │   Backend (Docker Compose)   │
│   React Native 0.86 CLI │        │                              │
│                         │        │  ┌────────────────────────┐  │
│  ┌───────────────────┐  │  REST  │  │ Node.js + Express (ESM)│  │
│  │ TypeScript / JS   │  │◄──────►│  │ - JWT auth + refresh   │  │
│  └───────────────────┘  │  +JWT  │  │ - Rule CRUD + sync     │  │
│  ┌───────────────────┐  │        │  │ - Device registration │  │
│  │ Kotlin native     │  │        │  │ - BullMQ SMS queue     │  │
│  │ - SmsModule       │  │        │  └────────────────────────┘  │
│  │ - SmsReceiver     │  │        │  ┌──────────┐  ┌──────────┐  │
│  │ - TFLite inference│  │        │  │ MongoDB  │  │  Redis   │  │
│  │ - WorkManager     │  │        │  └──────────┘  └──────────┘  │
│  └───────────────────┘  │        │  ┌────────────────────────┐  │
│                         │        │  │ FastAPI ai-service     │  │
│  On-device DistilBERT   │        │  │ - /classify            │  │
│  (SMS never leaves)     │        │  │ - retrain pipeline     │  │
└─────────────────────────┘        │  └────────────────────────┘  │
                                   └──────────────────────────────┘

Google Sign-In: app gets idToken from Google SDK → POST /api/auth/google
                → backend verifies with google-auth-library → issues own JWT
```

**Monorepo layout:**

```
app/
├── backend/      Node.js + Express + ESM
├── ai-service/   FastAPI (Python) — model serving + retraining
└── mobile/       React Native 0.86 CLI (not Expo)
```

Infrastructure runs via Docker Compose: `mongo:7`, `redis:7`, `backend`, `ai-service`.

---

## Tech Stack & Why

| Layer | Technology | Why this choice |
|---|---|---|
| Mobile | React Native 0.86 CLI | Expo cannot access native SMS APIs — CLI required for `content://sms` access |
| Native bridge | Custom Kotlin `@ReactMethod` module | Popular SMS libraries are deprecated/unmaintained; a custom module shows bridge knowledge and avoids third-party bugs |
| Backend | Node.js + Express (ESM) | Familiar stack, modern ES module syntax |
| Auth | JWT + `google-auth-library` | Stateless for mobile; Google uses the **idToken** flow, not the web OAuth redirect dance |
| Queue | BullMQ + Redis | Decouples SMS ingestion from processing; automatic retries |
| Database | MongoDB + Mongoose | Flexible schema for user-defined rules |
| ML model | Fine-tuned DistilBERT → TFLite fp32 | Fine-tunable, small enough for on-device, generalizes on the critical class |
| ML serving | FastAPI (Python) | Async, Pydantic validation, auto OpenAPI docs; ML-native ecosystem |
| Infra | Docker Compose | One-command reproducible multi-service environment |

---

## How It Works

### Incoming SMS flow (on-device, privacy-preserving)

1. `SmsReceiver` (Kotlin `BroadcastReceiver`) catches the incoming message. As the default SMS app, SmartSMS also writes it to the inbox itself.
2. The message is surfaced to the React Native UI in real time via `DeviceEventEmitter`.
3. When the user opens the list, each uncached message is classified on-device by DistilBERT (TFLite) and the predicted category is cached (classify-once).
4. A background `WorkManager` job periodically deletes expired OTPs using lightweight regex — kept off the ML path to preserve battery.

### The dual-layer intelligence design

```
SMS → ML classifies category (with confidence) → Rule Engine decides action per category
```

- **ML handles perception** — *what kind of message is this?*
- **Rules handle policy** — *what should happen to this category, and after how long?*
- Users can add explicit override rules that beat the model.

This mirrors how production spam filters work: a learned classifier with user-defined rules layered on top.

---

## The ML Story

### Dataset (~13,500 samples, 6 classes)

- **Real data:** UCI SMS Spam Collection (`spam → Spam`, `ham → Personal`).
- **Synthetic data (~8,500):** a template-based generator for `OTP`, `Bank`, `Promo`, `Delivery`, since no public dataset of Indian transactional SMS exists (privacy). These messages are highly templated in reality, so template + randomization closely mirrors the true distribution.

The synthetic generator was deliberately hardened to force **concept learning over template memorization**:

- **Noise injection** — random case changes, SMS-speak (`your → ur`), stripped punctuation, currency variants (`Rs./INR/₹`), trailing junk.
- **Keyword-free OTP templates** — e.g. *"Your Uber code: 4521"*, *"G-123456 is your verification code"* — so the model cannot rely on the literal word "OTP".
- **Hard negatives (~1,500)** — cases designed to break keyword rules: promo codes containing digits, bank alerts that mention "OTP", personal messages with phone numbers, spam mimicking banks.
- **Template tracking** — every synthetic row records a `template_id`, enabling template-holdout evaluation.

### Why ML over regex

Regex handles the templated majority, but fails on: OTPs phrased without the keyword, ambiguous digit-containing messages (promo codes vs OTPs vs phone numbers), and requires perpetual human authoring for every new bank/merchant format. ML learns the *concept* and improves from feedback. The two are combined — ML for perception, rules for policy — not chosen exclusively.

### Evaluation methodology (the rigorous part)

Two-level evaluation:

1. **Standard stratified 70/15/15 split** — train/val/test, stratified by label.
2. **Template-holdout split** — entire template families held out of training, then evaluated. With slot-filled synthetic data, a random row-level split *leaks templates* (same skeleton, different slot values, appears in both train and test), inflating metrics. Holding out whole template families tests whether the model learned the concept or memorized the skeleton.

### The model decision: DistilBERT over MobileBERT

MobileBERT was benchmarked as a candidate for its ~4× latency advantage. Both models were validated with template-holdout:

| Metric | DistilBERT | MobileBERT |
|---|---|---|
| Test OTP recall | 100% | 100% |
| **Holdout OTP recall** | **100%** | **67%** (309/461) |
| Holdout macro-F1 | 0.9021 | ~0.72 |
| On-device latency (emulator) | 138 ms p50 | ~50 ms |

MobileBERT was 4× faster but **missed 1 in 3 OTPs on unseen templates** — it memorized rather than generalized. For an OTP-cleaning app, a false negative means a stale OTP left in the inbox: the core failure mode. DistilBERT held **100% OTP recall even on templates it had never seen**.

**Decision: ship DistilBERT.** The extra ~88 ms of latency is imperceptible for background classification; the generalization gap was disqualifying. *Speed you don't need does not outweigh accuracy you cannot afford to lose.*

> This decision was driven by holdout metrics on the business-critical class — not aggregate accuracy, and not raw speed.

Even DistilBERT drops ~9 F1 points on holdout, quantifying the synthetic-template gap that the planned active-learning loop (real user corrections) is designed to close.

### Quantization note

int8 quantization was attempted but blocked: TFLite's `EMBEDDING_LOOKUP` kernel requires `zero_point == 0`, which symmetric int8 quantization violates, and the current `litert-torch` API does not cleanly exclude the embedding layer from quantization. fp32 was shipped after confirming 6/6 bit-exact parity with the PyTorch model. The correct path for int8 would be quantization-aware training with the embedding layer kept in float.

---

## Build Journey

### Phase 1 — Backend (Days 1–4)
- **Day 1:** Monorepo + Docker Compose + JWT auth (register/login/refresh with rotation) + Google OAuth via mobile idToken pattern.
- **Day 2:** SMS Rule schema + full CRUD + pagination + delta sync (`?updatedAfter=`).
- **Day 3:** Rule Engine + BullMQ + Redis event-driven SMS processing.
- **Day 4:** Device registration + delta-sync API (server-side `lastSyncAt` as source of truth) + centralized error handling.

### Phase 2 — Android app (Days 5–8)
- **Day 5:** Custom Kotlin native SMS module (`SmsModule`, `SmsPackage`, `SmsReceiver`) + React Native bridge — replacing deprecated SMS libraries.
- **Day 6:** Local SMS caching (MMKV) + Repository pattern + offline-safe reads.
- **Day 7:** Axios client + JWT interceptor + 401 auto-refresh with request queuing + login/register screens.
- **Day 8:** WorkManager auto-clean scheduler + **default SMS app** implementation (the hard part — see below) + real-time updates via `DeviceEventEmitter`.

### Phase 3 — ML (Days 9–13)
- **Day 9:** Dataset prep + EDA — UCI + synthetic generator with noise injection, hard negatives, and `template_id` tracking.
- **Day 10:** Fine-tune DistilBERT with class-weighted loss, stratified split, overfit sanity check.
- **Day 11:** TFLite export via `litert-torch` (fp32, bit-exact parity); int8 blocked by embedding kernel.
- **Day 12:** FastAPI `ai-service` — `/classify` endpoint, singleton model load, batch inference, Dockerized.
- **Day 13:** On-device TFLite inference in Kotlin — hand-written WordPiece tokenizer, `SmsClassifier`, on-device benchmark, and the DistilBERT-vs-MobileBERT decision.

---

## Notable Engineering Problems Solved

### Making the app a default SMS handler (Day 8)

Deleting SMS on Android requires being the **default SMS app** — Google locked this down in KitKat. Qualifying requires four components: a `SMS_DELIVER` receiver, a `WAP_PUSH_DELIVER` receiver, a `RESPOND_VIA_MESSAGE` service, and `SENDTO` activity intent filters.

All four were declared and confirmed present via `adb shell dumpsys package`, yet the app still would not appear in the SMS-app picker. The root cause: the `SENDTO` intent filters were **missing `<category android:name="android.intent.category.DEFAULT"/>`**. Android's role-qualification check resolves that activity like an implicit intent — which requires `CATEGORY_DEFAULT` — but `dumpsys package` lists the filter regardless of that category, so the manifest *looked* complete. Diagnosed by forcing a role assignment (`adb shell cmd role add-role-holder`) and reading the exact rejection in logcat.

### int64 vs int32 TFLite inputs (Day 13)

On-device inference threw `Cannot copy … 512 bytes from a Java Buffer with 256 bytes`. The exported DistilBERT expects **int64** input tensors (64 × 8 bytes = 512), but the Kotlin buffer was writing int32 (64 × 4 = 256). Fixed by writing 8-byte longs into the input buffer.

### Tokenizer parity (Day 13)

The on-device WordPiece tokenizer is hand-written in Kotlin (reading `vocab.txt`), separate from the Python `transformers` tokenizer. Verified parity by comparing token IDs for the same string on both sides — identical output confirmed the on-device pipeline is correct.

### ESM + dotenv hoisting (Day 1)

`process.env` values were `undefined` in routes because ES module `import` statements are hoisted above `dotenv.config()`. Resolved by relying on Docker's `env_file` to inject environment variables before Node starts, rather than loading dotenv at runtime.

---

## Key Design Decisions

- **On-device inference for privacy** — SMS never leaves the phone; privacy is architectural, not a policy promise.
- **Regex for background auto-clean, ML for foreground categorization** — the battery-sensitive background path stays on cheap regex; the transformer runs only on foreground, user-initiated categorization, with results cached (classify-once).
- **Delta sync with server as source of truth** — devices send their last-sync timestamp and receive only changed rules; the server owns `lastSyncAt`.
- **Refresh-token rotation** — a reused refresh token is detected (stored ≠ received) and the session invalidated, mitigating token theft.
- **Google OAuth via idToken, not web redirect** — native apps get a verified idToken directly from Google's SDK and hand it to the backend; no server-mediated redirect or session needed.

---

## Running Locally

**Backend + services:**

```bash
docker-compose up --build
# backend  → localhost:3000
# ai-service → localhost:5000
# mongo    → localhost:27017
# redis    → localhost:6379
```

**Mobile (from `app/mobile`):**

```bash
# Terminal 1
npx react-native start

# Terminal 2
npx react-native run-android
```

> All React Native / adb commands run from the host shell (not WSL) so they can reach the emulator. Environment values in `.env` must have no spaces around `=` and no quotes.

---

## Roadmap

- **Day 14 — Active learning:** user corrects a wrong label → `POST /feedback` (SMS hashed for privacy) → retrain triggered at a feedback threshold. Directly addresses the ~9-point holdout gap with real-world data.
- **Day 15 — OTA model updates:** push a new TFLite model to devices with checksum verification, no app reinstall.
- **Day 16 — Analytics:** MongoDB aggregation + Redis caching for a per-user dashboard.
- **Day 17 — Material Design 3 UI polish.**
- **Day 18 — Security hardening:** rate limiting, security headers, certificate pinning.
- **Day 19 — Testing:** Jest + Supertest, Espresso, load testing.
- **Day 20 — Deploy + demo:** backend on a PaaS, README, demo video.

**Post-build optimization revisit:** quantization-aware training for int8, or a re-examination of smaller architectures once accuracy floors are established from real feedback data.

---

*Built as a production-grade portfolio project demonstrating full-stack engineering, mobile native development, and applied ML systems — from dataset design through on-device deployment.*
