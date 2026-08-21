from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.services.harness import RAGPipelineResponse

class TextQueryRequest(BaseModel):
    query: str
    strategy: Optional[str] = "semantic"  # "semantic" | "fixed_overlap" | "metadata_adaptive"

class TTSRequest(BaseModel):
    text: str

class BenchmarkRunResponse(BaseModel):
    status: str
    message: str
    results: Optional[Dict[str, Any]] = None
