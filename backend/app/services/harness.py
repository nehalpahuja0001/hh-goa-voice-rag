import time
import uuid
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.config import settings
from app.services.chunker import MultiStrategyChunkerEngine
from app.services.retrieval import vector_store, SearchResult
from app.services.guardrails import guardrails, GuardrailResult
from app.services.llm import llm_service, StructuredLLMResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag_harness")

OUT_OF_BOUNDS_MESSAGE = "This topic is outside my knowledge base. I am specifically trained on the HH Goa 2026 & MS MARCO dataset. Please ask a question related to MS MARCO, AI4Bharat, vector retrieval, or HH Goa 2026."

class LatencyBreakdown(BaseModel):
    stt_ms: float = 0.0
    retrieval_ms: float = 0.0
    guardrails_ms: float = 0.0
    generation_ms: float = 0.0
    total_e2e_ms: float = 0.0

class RAGPipelineResponse(BaseModel):
    request_id: str
    query: str
    answer: str
    grounded: bool
    confidence: float
    citations: List[str] = []
    reason: str
    status: str  # "SUCCESS" | "GUARDRAIL_BLOCKED" | "NO_CONTEXT" | "ERROR"
    retrieved_chunks: List[SearchResult] = []
    latency: LatencyBreakdown
    guardrail_traces: List[GuardrailResult] = []
    metadata: Dict[str, Any] = {}

class RAGOrchestrationHarness:
    """
    Robust Production Model Harness & Pipeline Orchestration Layer.
    Executes end-to-end RAG with structured input/output, retrieval function,
    multi-stage guardrail evaluation, validation retries, error recovery, and high-precision timing.
    """
    def __init__(self):
        self.max_retries = 2

    async def execute_pipeline(
        self,
        query: str,
        stt_latency_ms: float = 0.0,
        strategy: str = "semantic"
    ) -> RAGPipelineResponse:
        request_id = f"req_{uuid.uuid4().hex[:8]}"
        t_start = time.perf_counter()
        traces: List[GuardrailResult] = []
        
        logger.info(f"[{request_id}] Initiating pipeline for query: '{query}'")

        # 1. INPUT GUARDRAIL
        t_g0 = time.perf_counter()
        input_guard = guardrails.validate_input_query(query)
        traces.append(input_guard)
        guardrail_time_ms = (time.perf_counter() - t_g0) * 1000.0

        if not input_guard.passed:
            t_end = (time.perf_counter() - t_start) * 1000.0
            return RAGPipelineResponse(
                request_id=request_id,
                query=query,
                answer=f"Guardrail Alert: {input_guard.reason}",
                grounded=False,
                confidence=0.0,
                citations=[],
                reason=input_guard.action_taken,
                status="GUARDRAIL_BLOCKED",
                retrieved_chunks=[],
                latency=LatencyBreakdown(
                    stt_ms=stt_latency_ms,
                    guardrails_ms=round(guardrail_time_ms, 2),
                    total_e2e_ms=round(t_end, 2)
                ),
                guardrail_traces=traces
            )

        # 2. RETRIEVAL TOOL EXECUTION
        search_results, retrieval_ms = vector_store.search(
            query=query,
            top_k=settings.TOP_K,
            similarity_threshold=settings.SIMILARITY_THRESHOLD
        )
        logger.info(f"[{request_id}] Retrieval completed in {retrieval_ms}ms with {len(search_results)} results.")

        # 3. RETRIEVAL & CONTEXT GUARDRAIL
        t_g1 = time.perf_counter()
        context_guard = guardrails.validate_retrieval_context(query, search_results)
        traces.append(context_guard)
        guardrail_time_ms += (time.perf_counter() - t_g1) * 1000.0

        if not context_guard.passed:
            t_end = (time.perf_counter() - t_start) * 1000.0
            return RAGPipelineResponse(
                request_id=request_id,
                query=query,
                answer=OUT_OF_BOUNDS_MESSAGE,
                grounded=False,
                confidence=0.0,
                citations=[],
                reason=context_guard.reason,
                status="NO_CONTEXT",
                retrieved_chunks=search_results,
                latency=LatencyBreakdown(
                    stt_ms=stt_latency_ms,
                    retrieval_ms=retrieval_ms,
                    guardrails_ms=round(guardrail_time_ms, 2),
                    total_e2e_ms=round(t_end, 2)
                ),
                guardrail_traces=traces
            )

        # 4. GENERATION WITH RETRY HARNESS
        llm_response: Optional[StructuredLLMResponse] = None
        gen_ms = 0.0
        
        for attempt in range(self.max_retries + 1):
            try:
                llm_response, gen_ms = await llm_service.generate_grounded_answer(query, search_results)
                if llm_response and isinstance(llm_response.answer, str) and len(llm_response.answer) > 0:
                    break
            except Exception as e:
                logger.warning(f"[{request_id}] Generation attempt {attempt+1} failed: {e}")
                if attempt == self.max_retries:
                    llm_response = StructuredLLMResponse(
                        answer=OUT_OF_BOUNDS_MESSAGE,
                        grounded=False,
                        confidence=0.0,
                        citations=[],
                        reason=f"Model generation error: {str(e)}"
                    )

        # 5. GROUNDING GUARDRAIL
        t_g2 = time.perf_counter()
        grounding_guard = guardrails.validate_grounding(llm_response.answer, search_results)
        traces.append(grounding_guard)
        guardrail_time_ms += (time.perf_counter() - t_g2) * 1000.0

        if not grounding_guard.passed:
            llm_response.grounded = False
            llm_response.answer = OUT_OF_BOUNDS_MESSAGE
            llm_response.reason = f"Grounding check alert: {grounding_guard.reason}"

        t_end = (time.perf_counter() - t_start) * 1000.0

        return RAGPipelineResponse(
            request_id=request_id,
            query=query,
            answer=llm_response.answer,
            grounded=llm_response.grounded,
            confidence=llm_response.confidence,
            citations=llm_response.citations,
            reason=llm_response.reason,
            status="SUCCESS",
            retrieved_chunks=search_results,
            latency=LatencyBreakdown(
                stt_ms=stt_latency_ms,
                retrieval_ms=retrieval_ms,
                guardrails_ms=round(guardrail_time_ms, 2),
                generation_ms=gen_ms,
                total_e2e_ms=round(t_end, 2)
            ),
            guardrail_traces=traces,
            metadata={"chunking_strategy": strategy}
        )

orchestration_harness = RAGOrchestrationHarness()
