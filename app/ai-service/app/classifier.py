import torch
import torch.nn.functional as F
from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast
import json
MODEL_DIR = "models/distilbert_v1"
MAX_LEN = 64

# MUST match training order: ["OTP","Bank","Promo","Delivery","Spam","Personal"]
# LABELS = ["OTP", "Bank", "Promo", "Delivery", "Spam", "Personal"]


with open(f"{MODEL_DIR}/labels.json") as f:
    LABELS = json.load(f)["labels"]   # ["OTP","Bank","Promo","Delivery","Spam","Personal"]


class SmsClassifier:
    """Singleton — model loaded once at startup, reused across requests."""

    def __init__(self):
        self.device = torch.device("cpu")
        self.tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
        self.model = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
        self.model.to(self.device).eval()
        print(f"Model loaded. Labels: {LABELS}")

    @torch.no_grad()
    def classify(self, text: str) -> dict:
        enc = self.tokenizer(
            text, max_length=MAX_LEN, padding="max_length",
            truncation=True, return_tensors="pt"
        ).to(self.device)

        logits = self.model(**enc).logits
        probs = F.softmax(logits, dim=-1)[0]

        idx = int(torch.argmax(probs))
        return {
            "label": LABELS[idx],
            "confidence": round(float(probs[idx]), 4),
            "all_scores": {LABELS[i]: round(float(probs[i]), 4) for i in range(len(LABELS))},
        }

    @torch.no_grad()
    def classify_batch(self, texts: list) -> list:
        enc = self.tokenizer(
            texts, max_length=MAX_LEN, padding="max_length",
            truncation=True, return_tensors="pt"
        ).to(self.device)

        logits = self.model(**enc).logits
        probs = F.softmax(logits, dim=-1)

        results = []
        for row in probs:
            idx = int(torch.argmax(row))
            results.append({
                "label": LABELS[idx],
                "confidence": round(float(row[idx]), 4),
                "all_scores": {LABELS[i]: round(float(row[i]), 4) for i in range(len(LABELS))},
            })
        return results


classifier = SmsClassifier()