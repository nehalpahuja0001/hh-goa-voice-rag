import re
from typing import List, Dict, Any, Tuple
from pydantic import BaseModel
from app.config import settings
from app.services.retrieval import SearchResult

class GuardrailResult(BaseModel):
    passed: bool
    status_code: str  # "OK" | "EMPTY_QUERY" | "UNSAFE_QUERY" | "OFF_TOPIC" | "INSUFFICIENT_CONTEXT" | "UNGROUNDED_ANSWER"
    reason: str
    action_taken: str

class GuardrailsEngine:
    """
    Multi-layer RAG Safety & Quality Guardrail Engine.
    Implements input validation, off-topic detection, context sufficiency checks,
    and hallucination grounding verification.
    """
    def __init__(self):
        self.unsafe_keywords = [
            "drop database", "sudo rm", "<script>", "exec(", "eval(", "prompt injection",
            "ignore previous instructions", "jailbreak", "exploit"
        ]
        self.min_similarity_threshold = 0.20  # Optimized threshold for MS MARCO & HH Goa 2026 dataset queries

    def validate_input_query(self, query: str) -> GuardrailResult:
        """Input Safety Guardrail"""
        clean_query = query.strip()
        if not clean_query:
            return GuardrailResult(
                passed=False,
                status_code="EMPTY_QUERY",
                reason="The query was empty or contained only whitespace.",
                action_taken="Reject request immediately."
            )
        
        lower_q = clean_query.lower()
        for kw in self.unsafe_keywords:
            if kw in lower_q:
                return GuardrailResult(
                    passed=False,
                    status_code="UNSAFE_QUERY",
                    reason=f"Query contained potentially unsafe pattern: '{kw}'",
                    action_taken="Blocked query execution for system safety."
                )
                
        return GuardrailResult(
            passed=True,
            status_code="OK",
            reason="Input query passed safety checks.",
            action_taken="Proceed to retrieval."
        )

    def validate_retrieval_context(self, query: str, search_results: List[SearchResult]) -> GuardrailResult:
        """Context Sufficiency & Relevance Guardrail"""
        if not search_results:
            return GuardrailResult(
                passed=False,
                status_code="INSUFFICIENT_CONTEXT",
                reason="No documents matched the query in vector space.",
                action_taken="Return explicit 'Unable to answer' response."
            )

        top_score = search_results[0].score
        if top_score < self.min_similarity_threshold:
            return GuardrailResult(
                passed=False,
                status_code="OFF_TOPIC",
                reason=f"Top document similarity score ({top_score:.3f}) is below threshold ({self.min_similarity_threshold:.3f}).",
                action_taken="Reject off-topic query and prevent hallucination."
            )

        return GuardrailResult(
            passed=True,
            status_code="OK",
            reason=f"Retrieved {len(search_results)} relevant chunks (Top score: {top_score:.3f}).",
            action_taken="Proceed to generation."
        )

    def validate_grounding(self, answer: str, search_results: List[SearchResult]) -> GuardrailResult:
        """Output Hallucination & Grounding Verification Guardrail"""
        if not answer or "unable to answer" in answer.lower() or "cannot be determined" in answer.lower() or "outside my knowledge base" in answer.lower():
            return GuardrailResult(
                passed=True,
                status_code="OK",
                reason="Model correctly asserted inability to answer from context.",
                action_taken="Deliver safe fallback response."
            )

        # Check if key words in answer appear in retrieved chunks
        context_text = " ".join([r.text.lower() for r in search_results])
        answer_words = [w.lower() for w in re.findall(r'\b\w{4,}\b', answer) if w.lower() not in {"this", "that", "with", "from", "have", "were", "been", "which", "there", "their"}]
        
        if not answer_words:
            return GuardrailResult(passed=True, status_code="OK", reason="Short answer validated.", action_taken="Approve.")

        matched_words = [w for w in answer_words if w in context_text]
        grounding_ratio = len(matched_words) / len(answer_words) if answer_words else 1.0

        if grounding_ratio < 0.35:
            return GuardrailResult(
                passed=False,
                status_code="UNGROUNDED_ANSWER",
                reason=f"Answer grounding ratio ({grounding_ratio:.2f}) failed factual verification threshold (0.35). Potential hallucination detected.",
                action_taken="Override response with context-constrained warning."
            )

        return GuardrailResult(
            passed=True,
            status_code="OK",
            reason=f"Answer validated against context with {grounding_ratio*100:.1f}% word overlap.",
            action_taken="Approve response for UI rendering."
        )

guardrails = GuardrailsEngine()
