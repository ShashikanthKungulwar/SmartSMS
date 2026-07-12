from pydantic import BaseModel, Field
from typing import List, Dict

class ClassifyRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)

class ClassifyResponse(BaseModel):
    label: str
    confidence: float
    all_scores: Dict[str, float]

class BatchClassifyRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=100)

class BatchClassifyResponse(BaseModel):
    results: List[ClassifyResponse]