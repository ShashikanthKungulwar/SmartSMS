# SmartSMS — On-Device SMS Classifier

Privacy-first SMS manager. Incoming messages are classified **entirely on-device** — no message text ever leaves the phone — into six categories: `OTP`, `Bank`, `Promo`, `Delivery`, `Spam`, `Personal`. Classification drives rule-based actions (auto-clean expired OTPs, archive promos, surface bank alerts).

This document covers the ML pipeline: data, model selection, evaluation methodology, and on-device export.

---

## 1. Dataset

| Source | Rows | Classes covered |
|---|---|---|
| UCI SMS Spam Collection | ~5,570 | Spam, Personal (ham) |
| Synthetic generator (`scripts/generate_synthetic.py`) | ~8,500 | All six |
| — of which hard negatives | 1,500 | All six |

**Why synthetic data.** No public labeled dataset exists for Indian transactional SMS (OTP / bank alert / delivery / promo). UCI provides only a binary spam/ham split, and its ham is 2011-era UK personal texts. Four of the six target classes have **zero** representation in any public corpus, so they were generated from templates with:

- randomized entities (banks, merchants, couriers, amounts, order IDs, dates) via `faker`
- noise injection: case flips, SMS-speak substitutions (`your`→`ur`), punctuation stripping, currency variants (`Rs.`/`INR`/`₹`), trailing artifacts (`T&C apply`, `STOP to opt out`)
- OTP templates **without the literal token "OTP"** (`"Your Uber code: 7716"`), forcing the model past keyword matching

**Hard negatives (1,500 rows)** are adversarial by construction — messages whose bag-of-words is nearly identical to another class:

| Text pattern | True label | Naive rule would say |
|---|---|---|
| `Use code 4821 at checkout for 25% off` | Promo | OTP (digits + "code") |
| `Never share your OTP, PIN or CVV. HDFC never asks.` | Bank | OTP (contains "OTP") |
| `Bro send me Rs.500 on gpay` | Personal | Bank (contains amount) |
| `Dear customer ur HDFC account will be blocked! Update KYC: bit.ly/x` | Spam | Bank (contains bank name) |

Every synthetic row carries a `template_id` (e.g. `OTP_7`, `Hard_13`) identifying the template family that produced it. This enables template-holdout evaluation (§3). `is_hard` is derived at load time from `template_id.startswith("Hard_")`.

> **Generator constraint:** `template_id` is index-based, so templates must only ever be **appended** to their list. Inserting mid-list silently renames every downstream family and invalidates cross-version comparison.

---

## 2. Model and loss selection

### Why DistilBERT

Model choice was **constraint-driven, not leaderboard-driven**. The deployment target (on-device, offline, low-latency, bounded APK size) eliminated most of the space before accuracy was ever considered:

| Candidate | Verdict |
|---|---|
| LLM API call | Violates the project's premise (privacy, offline, latency) |
| BERT-base (110M params) | Too large for on-device deployment |
| TF-IDF + logistic regression | Bag-of-words: cannot represent word order. Fails hard negatives by construction — `"X is your OTP"` and `"never share your OTP"` have near-identical bags but opposite labels |
| LSTM from scratch | Would need to learn English from 12k SMS |
| **DistilBERT (66M params)** | **Retains ~97% of BERT's language understanding at 40% smaller / 60% faster; mature TFLite conversion path; pretrained, so 12k samples suffice to learn the decision boundary** |

Fallback ladder if size/latency targets are missed: MobileBERT (25M, factorized embedding) → TinyBERT. Same fine-tuning code, one config line.

### Why class-weighted cross-entropy

**Cross-entropy** is the negative log-likelihood of the true class under a softmax — the statistically principled loss for single-label multi-class output, not an arbitrary pick.

**Class weights** (`sklearn`'s `"balanced"`: `n_samples / (n_classes × class_count)`) equalize gradient pressure across classes. Without them, the ~4,800 UCI ham rows dominate and the model can minimize loss while being sloppy on minority classes.

Rejected alternatives:
- **SMOTE** — interpolates in feature space. Meaningless for text: the "average" of two token sequences is not a sentence.
- **Naive oversampling** — mathematically near-equivalent to weighting, but duplicates rows and invites memorization.
- **Focal loss** — designed for extreme imbalance (1:1000). Overkill at this scale (~5:1).

### Metrics ≠ loss

Loss must be differentiable; the metric should reflect what a mistake **costs**. The destructive action in this app is auto-deletion, gated by the classifier. Therefore:

- **OTP recall** — catch every OTP for cleaning
- **OTP precision** — never delete a non-OTP. A `Bank → OTP` error destroys a message the user needed; a `Promo → Delivery` error misfiles an advertisement.

Reported per-class F1, never bare accuracy. `metric_for_best_model = macro_f1`.

### Hyperparameters

`lr=2e-5` (fine-tuning standard — a from-scratch LR of 1e-3 would bulldoze the pretrained weights: catastrophic forgetting). `warmup_ratio=0.1` protects the pretrained body from the randomly-initialized head's early gradients. `max_length=64` (SMS cap at 160 chars ≈ 40–50 tokens; measured p99 = well under 64, truncation rate ≈ 0%). Early stopping on macro F1, patience 2.

---

## 3. Evaluation methodology

### Two-level split (leakage-controlled)

```
full dataset
├── holdout families (~15% of template families, sampled per class)  → holdout.csv   [evaluated once, never seen]
└── pool = remaining templates + all UCI rows
        ├── 70% → train.csv
        ├── 15% → val.csv     (early stopping / model selection)
        └── 15% → test.csv    (standard metrics)
```

- **Standard test set** answers *"how good is the model overall?"*
- **Template holdout** answers *"does it generalize to message formats it has never seen, or did it memorize the generator's skeletons?"*

The holdout influences **no** decision — not early stopping, not checkpoint choice. The moment a holdout slice steers a decision it stops measuring generalization. Splits are written to disk once and reused verbatim by every ablation run, so differences between runs are signal, not split noise.

### Pre-training sanity checks

Run before any GPU time is spent (`notebooks/02_train.ipynb`, §5–7):

1. **Tokenizer round-trip** — `[UNK]` rate ≈ 0%, truncation rate ≈ 0%, inspect how numbers/SMS-speak fragment
2. **Label spot-check** — read 10 `(text, label_id)` pairs post-transformation; catches off-by-one label mapping, which trains "fine" but learns permuted classes
3. **Overfit one batch** — 32 samples, 60 steps, loss must reach ~0. Verifies plumbing, says nothing about generalization. Initial loss should equal `ln(6) ≈ 1.79` (measured: 1.81) — confirming a truly random head, correctly wired loss, and exactly 6 classes.

---

## 4. Ablation study

Four runs. Identical splits, seed, architecture, hyperparameters. **One variable changes per run.**

| run | train data | loss | macro F1 | OTP F1 | OTP recall | Bank F1 | hard-neg acc | holdout F1 |
|---|---|---|---|---|---|---|---|---|
| **full_weighted** | full | weighted CE | **0.9958** | **1.0000** | **1.0000** | **1.0000** | **1.0000** | **0.9021** |
| full_plain_CE | full | plain CE | 0.9930 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.8822 |
| no_hard_neg | UCI + synth, hard negatives removed | weighted CE | 0.9320 | 0.9529 | 0.9965 | 0.9713 | **0.4676** | 0.8330 |
| uci_only | UCI only | weighted CE | 0.1979 | **0.0000** | 0.0000 | 0.0000 | 0.3669 | 0.1640 |

**Findings.**

**Synthetic data is load-bearing.** `uci_only` scores **0.000 OTP F1** — without the generator the model cannot detect an OTP at all, because four of six classes have no training examples. (Its small holdout gap is an artifact: a uniformly broken model has nothing to gap.)

**Hard negatives are the single highest-leverage data decision.** Removing 1,500 rows collapses hard-case accuracy from **100% → 46.8%** — a coin flip on adversarial messages. They also sharpen boundaries in-distribution: OTP F1 drops to 0.953 and Bank F1 to 0.971 on the *standard* test set.

**Class weighting bought generalization, not in-distribution accuracy.** On the standard test the gain is marginal (0.9958 vs 0.9930 — imbalance here is mild). On the **holdout** it is 0.9021 vs 0.8822. Upweighting thinner classes appears to force more robust feature learning rather than coasting on frequency.

**The generalization gap is a property of the data, not the training.** All three working models gap in the same 0.09–0.11 band. If the gap tracked loss choice or training luck it would vary; it doesn't, because all three trained on the same ten Promo template families.

---

## 5. Error analysis and data iteration (v1 → v2 → v3)

The holdout localized v1's weakness precisely — two confusion cells, everything else clean:

- **Promo → Delivery (100 rows):** Promo recall 0.61 on unseen formats. Root cause: only **10 Promo template families** existed; several use order/cart vocabulary that collides with Delivery.
- **Bank → Spam (28 rows):** the one Bank template lacking a `-{bank}` signature, in a corpus where Spam hard negatives deliberately mimic bank warnings.

**v2** added 15 Promo families (telecom, food delivery, card offers, travel, OTT, loyalty, insurance — including deliberately low-urgency ones) and 6 Bank families. Result: Promo recall **0.61 → 0.94**, Bank→Spam cleared to **0**. But Spam and Personal — now the classes with the *fewest* template families — collapsed into Promo on unseen skeletons.

**v3** gave Spam and Personal their own generators. Result: those recovered; a different thin family (an OTP template shaped like a bank alert) failed instead.

**The generalizable finding:** *the holdout gap always concentrates on whichever class has the least template diversity.* Observed three times, on three different classes.

> ### Methodological caveat (important)
> Holdout families are **resampled whenever splits are regenerated**. v1, v2, and v3 were therefore each examined on different unseen families of different difficulty. **Cross-version gap numbers are not directly comparable.** Honest adjudication requires a fixed, version-independent benchmark. A hand-written golden set (~60 messages, 10 per class, never generated, never split) is the correct instrument and is planned; it doubles as the Android parity fixture and the OTA regression suite.

**Shipped: v1.** Its failure mode (`Promo → Delivery`) is the cheapest cell in the cost matrix, and `Bank → OTP = 0` holds across all versions — nothing the user needs is ever auto-deleted. v2 and v3 checkpoints are retained for the OTA update demo.

---

## 6. On-device export (PyTorch → TFLite)

Converted with `litert-torch` (formerly `ai-edge-torch`) on a Linux runtime — the toolchain requires `torch_xla` and has no Windows build.

**Validated:** `model_fp32.tflite`, 255 MB, **16/16 argmax parity with PyTorch, max logit diff = 0.00000** (bit-exact).

Parity is checked with **no ground-truth labels** — it compares PyTorch's prediction against TFLite's prediction, answering *"is the converted model the same function?"*, not *"is it correct?"* A conversion that faithfully preserves every mistake is a perfect conversion. Correctness was established separately, against labels, in §3–4.

> **Conversion gotcha:** the converted graph names its inputs `serving_default_args_0` / `args_1`, not `input_ids` / `attention_mask`. Binding by name silently feeds the attention mask into both slots — producing a **constant prediction for every input**. Bind by tensor index, sorted. This surfaced only because the parity check exists: the conversion "succeeded," produced a correctly-sized file, and threw no errors.

### Quantization: blocked, diagnosed

int8 quantization is a **release requirement**, not an optimization — at 255 MB the model exceeds the 200 MB Play Store base-APK limit, and fp32 inference will not meet the <100 ms on-device target. Five routes attempted, all blocked:

| Route | Outcome |
|---|---|
| `litert-torch` PT2E dynamic int8 | Produces 65 MB artifact. **Fails at `allocate_tensors()`**: `EMBEDDING_LOOKUP` requires symmetric quantization (`zero_point == 0`); PT2E's dynamic config does not guarantee it. Reproduced on both `tf.lite.Interpreter` and the modern `ai_edge_litert` runtime — a kernel invariant, not legacy-runtime baggage |
| PT2E + `set_module_type(nn.Embedding, None)` | No effect: `torch.export` flattens modules before the quantizer sees them. Output size unchanged (65 MB), same failure |
| `onnx2tf -oiqt` | Attempts **full** integer quantization (weights + activations), demands calibration data. Wrong variant — dynamic-range needs none |
| `tf.lite.Optimize.DEFAULT` (the correct symmetric-weight path) | Unreachable: requires a SavedModel, and `onnx2tf`'s flatbuffer-direct fast path emits `.tflite` only. No flag exposed to disable it |
| `onnx2tf` fp16 (127 MB) | Allocates, then **fails at `invoke()`**: `Type FLOAT16 is unsupported by op Add`. fp16 TFLite is a *storage* format; CPU execution needs dequantize ops the graph lacks |

**Root cause.** DistilBERT's word-embedding table is 23.4M of its 66M parameters (~35%) and is precisely the tensor with the strictest kernel constraint.

**Candidate fixes, in order:** (1) **MobileBERT** — its embedding is factorized (128-dim, projected up), so the table is ~4M params and the constraint dissolves; one config line plus a retrain. (2) A SavedModel path via a different converter version, enabling `Optimize.DEFAULT`. (3) `set_module_name` targeting `distilbert.embeddings.word_embeddings` *before* `torch.export`.

**Current state:** fp32 model integrated on-device for end-to-end validation. Debugging the Kotlin tokenizer against a bit-exact model isolates one variable at a time; quantization swaps in afterwards through the same OTA pipeline built in Day 16.

---

## 7. Reproducing

```bash
conda activate smartsms                     # python 3.10, PyTorch cu128
python scripts/generate_synthetic.py        # writes data/processed/synthetic_sms.csv

# splits are created once and frozen; delete data/processed/splits/ to regenerate
python scripts/train.py --run-name full_weighted
python scripts/train.py --run-name full_plain_CE --no-class-weights
python scripts/train.py --run-name uci_only      --data uci
python scripts/train.py --run-name no_hard_neg   --data uci+synth
```

Each run writes `results/{run_name}.json` (metrics + the exact config that produced them) and `results/logs/{run_name}.jsonl` (per-step loss, per-epoch eval). The comparison table in `notebooks/02_train.ipynb` §14 reads every saved run.

TFLite export: `notebooks/03_tflite_export.ipynb` (Colab — Linux required). Failed quantization cells are retained deliberately; they document the maze.

### Practical notes

- **Scripts, not notebooks, for training.** Notebook kernels retain model objects in VRAM; on an 8 GB card the NVIDIA driver silently spills into shared system memory over PCIe rather than raising OOM, making training 5–10× slower with no error. A fresh process starts at 0 MB.
- **Verify file sizes at every transfer hop.** A truncated 255 MB upload fails three steps later as `SafetensorError: incomplete metadata` or `End-of-central-directory signature not found`. (This is also why the OTA pipeline SHA256-verifies before use.)
- **Identical results across runs are an alarm, not a success.** Two models trained on different data cannot match to four decimal places. When v2 reproduced v1 exactly, the cause was a stale `splits/` folder — the split cell's "load if exists" branch had silently reused v1's data.
