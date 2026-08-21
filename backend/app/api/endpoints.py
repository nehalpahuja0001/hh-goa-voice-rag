import os
import json
import time
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Response
from typing import Optional

from app.config import settings
from app.api.models import TextQueryRequest, TTSRequest, BenchmarkRunResponse
from app.services.retrieval import vector_store
from app.services.stt import stt_service
from app.services.tts import tts_service
from app.services.harness import orchestration_harness, RAGPipelineResponse
from scripts.benchmark import run_benchmark_suite

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "vector_store_loaded": vector_store.is_loaded,
        "indexed_chunks_count": len(vector_store.chunks),
        "stt_provider": settings.STT_PROVIDER,
        "stt_configured": True,
        "llm_provider": settings.LLM_PROVIDER,
        "model_name": settings.MODEL_NAME
    }

@router.post("/query", response_model=RAGPipelineResponse)
async def process_text_query(req: TextQueryRequest):
    """
    Process text query through RAG Orchestration Harness
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    return await orchestration_harness.execute_pipeline(
        query=req.query.strip(),
        stt_latency_ms=0.0,
        strategy=req.strategy or "semantic"
    )

@router.post("/voice-query", response_model=RAGPipelineResponse)
async def process_voice_query(
    file: UploadFile = File(...),
    strategy: Optional[str] = Form("semantic"),
    interim_transcript: Optional[str] = Form(None)
):
    """
    Process raw voice recording: STT Transcription -> RAG Retrieval -> Grounded Generation
    """
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty audio payload.")
        
        # 1. Speech-To-Text
        transcript, stt_latency = await stt_service.transcribe(
            audio_bytes=contents,
            content_type=file.content_type or "audio/wav",
            interim_transcript=interim_transcript
        )
        
        if not transcript or not transcript.strip():
            raise HTTPException(status_code=400, detail="Speech-To-Text yielded empty transcript.")

        # 2. Execute RAG Pipeline with transcribed query
        response = await orchestration_harness.execute_pipeline(
            query=transcript.strip(),
            stt_latency_ms=stt_latency,
            strategy=strategy or "semantic"
        )
        return response

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice processing error: {str(e)}")

@router.post("/tts")
async def generate_speech_response(req: TTSRequest):
    """
    Synthesize audio response for grounded answer
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text required for TTS.")
    
    audio_bytes = await tts_service.synthesize(req.text)
    if not audio_bytes:
        raise HTTPException(status_code=501, detail="TTS service not configured or unavailable.")
    
    return Response(content=audio_bytes, media_type="audio/mpeg")

@router.get("/analytics")
async def get_analytics():
    """
    Return P50, P70, P100 latency analytics from benchmark results
    """
    path = settings.BENCHMARK_RESULTS_PATH
    if not os.path.exists(path):
        return {
            "status": "NO_BENCHMARK_RUN",
            "message": "Benchmark not run yet. Click 'Run Benchmark' in Developer Analytics to execute test suite.",
            "metrics": None
        }
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return {
            "status": "SUCCESS",
            "benchmark": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read benchmark results: {e}")

@router.post("/benchmark/run", response_model=BenchmarkRunResponse)
async def trigger_benchmark_run():
    """
    Triggers server-side benchmark execution across test queries and recalculates metrics
    """
    try:
        results = await run_benchmark_suite()
        return BenchmarkRunResponse(
            status="SUCCESS",
            message="Benchmark executed successfully.",
            results=results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Benchmark run error: {e}")
