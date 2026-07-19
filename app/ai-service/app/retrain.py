import os, json, requests, torch
from datetime import datetime
from transformers import (DistilBertForSequenceClassification,
                          DistilBertTokenizerFast, Trainer, TrainingArguments)
from datasets import Dataset

MODEL_DIR = "models/distilbert_v1"
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:3000")
INTERNAL_HEADERS = {"X-Internal-Token": os.getenv("INTERNAL_SERVICE_TOKEN", "")}

def run_retrain():
    # 1. Pull feedback from backend
    try:
        resp = requests.get(f"{BACKEND_URL}/api/feedback/pending", headers=INTERNAL_HEADERS)
        print(f"[retrain] Fetched feedback: {resp.status_code}", flush=True)
        items = resp.json().get("items", [])
        print(f"[retrain] {len(items)} feedback items", flush=True)
        if len(items) < 10:
            print("[retrain] Skipped — insufficient feedback", flush=True)
            return {"status": "skipped", "reason": "insufficient feedback"}
        
        with open(f"{MODEL_DIR}/labels.json") as f:
            labels = json.load(f)["labels"]
        label2id = {l: i for i, l in enumerate(labels)}

        tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
        model = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)

        texts = [it["text"] for it in items]
        y     = [label2id[it["correct"]] for it in items]
        ds = Dataset.from_dict({"text": texts, "labels": y}).map(
            lambda b: tokenizer(b["text"], truncation=True, max_length=64,
                                padding="max_length"), batched=True)

        out_dir = f"models/distilbert_v{datetime.now():%Y%m%d_%H%M%S}"
        args = TrainingArguments(output_dir=out_dir, num_train_epochs=2,
                                per_device_train_batch_size=16,
                                learning_rate=1e-5, logging_steps=10,
                                save_strategy="no", report_to="none")
        Trainer(model=model, args=args, train_dataset=ds).train()

        model.save_pretrained(out_dir)
        tokenizer.save_pretrained(out_dir)
        requests.post(f"{BACKEND_URL}/api/feedback/mark-used", headers=INTERNAL_HEADERS)
        print("[retrain] marked feedback as used", flush=True)
        return {"status": "done", "model": out_dir, "samples": len(items)}
    except Exception as e:
        print(f"[retrain] ERROR: {e}", flush=True)
        raise