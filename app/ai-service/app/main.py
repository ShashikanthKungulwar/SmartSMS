import time
from fastapi import FastAPI, HTTPException,BackgroundTasks
from app.schemas import (
    ClassifyRequest, ClassifyResponse,
    BatchClassifyRequest, BatchClassifyResponse
)
from app.classifier import classifier
from app.retrain import run_retrain

app = FastAPI(title="SmartSMS AI Service", version="1.0.0")

RETRAIN_COOLDOWN_SECONDS = 5 * 60
_last_retrain_at = 0


@app.get("/health")
def health():
    return {"status": "ok", "model": "distilbert_v1"}



@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    try:
        return classifier.classify(req.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify/batch", response_model=BatchClassifyResponse)
def classify_batch(req: BatchClassifyRequest):
    try:
        return {"results": classifier.classify_batch(req.texts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    

@app.post("/retrain")
def retrain(background_tasks: BackgroundTasks):
    global _last_retrain_at
    now = time.time()
    if now - _last_retrain_at < RETRAIN_COOLDOWN_SECONDS:
        return {"status": "skipped", "reason": "cooldown"}
    _last_retrain_at = now

    # Run in background — retraining is slow, don't block the request
    background_tasks.add_task(run_retrain)
    return {"status": "retrain started"}

