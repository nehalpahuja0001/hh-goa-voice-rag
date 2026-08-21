import json
import time
import httpx
import re
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
from app.config import settings
from app.services.retrieval import SearchResult

OUT_OF_BOUNDS_MESSAGE = "This topic is outside my knowledge base. I am specifically trained on the HH Goa 2026 & MS MARCO dataset. Please ask a question related to MS MARCO, AI4Bharat, vector retrieval, or HH Goa 2026."

class StructuredLLMResponse(BaseModel):
    answer: str
    grounded: bool
    confidence: float = Field(ge=0.0, le=1.0)
    citations: List[str] = []
    reason: str = ""

class LLMService:
    """
    LLM Client supporting OpenAI, Groq, Gemini, and intelligent local extraction fallback.
    Enforces strict grounding prompts, out-of-database relevance guardrails, and structured JSON outputs.
    """
    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.provider = settings.LLM_PROVIDER
        self.model_name = settings.MODEL_NAME

    async def generate_grounded_answer(
        self,
        query: str,
        retrieved_contexts: List[SearchResult]
    ) -> Tuple[StructuredLLMResponse, float]:
        """
        Generates a grounded answer from retrieved context.
        Returns: (StructuredLLMResponse, generation_latency_ms)
        """
        t0 = time.perf_counter()

        context_str = "\n\n".join([
            f"[Doc: {c.doc_id} | Rank: {c.rank} | Strategy: {c.strategy}]\n{c.text}"
            for c in retrieved_contexts
        ])

        system_prompt = (
            "You are an expert RAG question-answering assistant for HH Goa 2026.\n"
            "STRICT RULES:\n"
            "1. Answer ONLY using facts explicitly present in the RETRIEVED CONTEXT below.\n"
            "2. If the user question asks about a specific topic (e.g. weather, recipes, sports, general knowledge) "
            "that is NOT explicitly answered in the retrieved context, do NOT substitute unrelated context or invent facts.\n"
            f"3. Set grounded=false, confidence=0.0, citations=[], and set answer equal to: '{OUT_OF_BOUNDS_MESSAGE}'\n"
            "4. Return strictly valid JSON adhering to this structure:\n"
            "{\n"
            '  "answer": "Grounded answer text or refusal message",\n'
            '  "grounded": true,\n'
            '  "confidence": 0.95,\n'
            '  "citations": ["Doc ID 1"],\n'
            '  "reason": "Brief summary of factual evidence used"\n'
            "}"
        )

        user_prompt = f"USER QUESTION:\n{query}\n\nRETRIEVED CONTEXT:\n{context_str}"

        # 1. Try OpenAI API if key available
        if self.api_key and (self.provider == "openai" or self.api_key.startswith("sk-")) and not self.api_key.startswith("api_key_"):
            try:
                res = await self._call_openai(system_prompt, user_prompt)
                latency = (time.perf_counter() - t0) * 1000.0
                return res, round(latency, 2)
            except Exception as e:
                print(f"OpenAI call failed: {e}. Falling back to smart local extraction.")

        # 2. Try Groq API if configured
        if self.api_key and self.provider == "groq" and not self.api_key.startswith("api_key_"):
            try:
                res = await self._call_groq(system_prompt, user_prompt)
                latency = (time.perf_counter() - t0) * 1000.0
                return res, round(latency, 2)
            except Exception as e:
                print(f"Groq call failed: {e}. Falling back...")

        # 3. Intelligent Local Fallback Extractor with strict intent matching
        res = self._local_heuristic_extractor(query, retrieved_contexts)
        latency = (time.perf_counter() - t0) * 1000.0
        return res, round(latency, 2)

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> StructuredLLMResponse:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_name if "gpt" in self.model_name else "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 500
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            res_data = resp.json()
            content = res_data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return StructuredLLMResponse(**parsed)

    async def _call_groq(self, system_prompt: str, user_prompt: str) -> StructuredLLMResponse:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "mixtral-8x7b-32768",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            res_data = resp.json()
            content = res_data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return StructuredLLMResponse(**parsed)

    def _local_heuristic_extractor(
        self,
        query: str,
        retrieved_contexts: List[SearchResult]
    ) -> StructuredLLMResponse:
        if not retrieved_contexts:
            return StructuredLLMResponse(
                answer=OUT_OF_BOUNDS_MESSAGE,
                grounded=False,
                confidence=0.0,
                citations=[],
                reason="No matching document chunks found."
            )

        top_chunk = retrieved_contexts[0]

        stop_words = {
            'what', 'is', 'the', 'a', 'an', 'how', 'does', 'tell', 'me', 'about',
            'who', 'where', 'of', 'in', 'to', 'for', 'on', 'with', 'at', 'by',
            'from', 'are', 'was', 'were', 'can', 'you', 'give', 'show', 'list'
        }
        query_words = [w.lower() for w in re.findall(r'\w+', query) if w.lower() not in stop_words and len(w) > 2]
        query_terms = set(query_words)

        if not query_terms:
            return StructuredLLMResponse(
                answer=OUT_OF_BOUNDS_MESSAGE,
                grounded=False,
                confidence=0.0,
                citations=[],
                reason="Query contained no specific key terms."
            )

        chunk_text_lower = top_chunk.text.lower()
        matched_terms = {t for t in query_terms if t in chunk_text_lower}

        # Strict Relevance & Intent Guardrail:
        # At least 50% of distinct query key terms must be present in top document,
        # AND if query has 2+ distinct terms, at least 2 key terms must match!
        match_ratio = len(matched_terms) / len(query_terms)

        if match_ratio < 0.5 or (len(query_terms) >= 2 and len(matched_terms) < 2):
            return StructuredLLMResponse(
                answer=OUT_OF_BOUNDS_MESSAGE,
                grounded=False,
                confidence=0.0,
                citations=[],
                reason=f"Query intent is outside the document context (matched {len(matched_terms)}/{len(query_terms)} key terms)."
            )

        sentences = [s.strip() for s in top_chunk.text.split(".") if len(s.strip()) > 10]
        best_sentence = sentences[0] if sentences else top_chunk.text[:200]
        best_score = 0

        for s in sentences:
            s_terms = set(re.findall(r'\w+', s.lower()))
            overlap = len(query_terms.intersection(s_terms))
            if overlap > best_score:
                best_score = overlap
                best_sentence = s

        answer_text = f"Based on retrieved context (Document {top_chunk.doc_id}): {best_sentence}."

        return StructuredLLMResponse(
            answer=answer_text,
            grounded=True,
            confidence=round(min(0.98, float(top_chunk.score) + 0.2), 2),
            citations=[top_chunk.doc_id],
            reason=f"Extracted directly from chunk '{top_chunk.chunk_id}' with similarity score {top_chunk.score:.3f}."
        )

llm_service = LLMService()
