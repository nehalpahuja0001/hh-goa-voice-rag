import os
import sys
import json
import time
import asyncio
import numpy as np
from typing import List, Dict, Any

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.services.retrieval import vector_store
from app.services.harness import orchestration_harness

TEST_BENCHMARK_QUERIES = [
    "What is the MS MARCO dataset?",
    "How does retrieval-augmented generation work?",
    "What is Sarvam AI and what model does it use for speech-to-text?",
    "What vector embedding model is used for dense vector search?",
    "What is HH Goa 2026?",
    "How does multi-strategy chunking differ from fixed splitting?",
    "What guardrails prevent hallucinations in RAG pipelines?",
    "What is the latency target for HH Goa 2026 Voice RAG?",
    "Explain how semantic chunking works.",
    "What is Bing user queries dataset?",
    "How fast is vector retrieval with MiniLM embeddings?",
    "What happens when no relevant context is found in vector store?",
    "How are Indian languages supported in MSMARCO-XI?",
    "What is fixed-size chunking with overlap?",
    "Why are guardrails necessary for LLM outputs?",
    "How to make pizza dough at home?",  # Intentionally off-topic query
    "Who won the 1998 World Cup?",      # Intentionally off-topic query
    "What is P50 P70 P100 latency?",
    "What is Sarvam 2.0 speech model?",
    "How is end-to-end request latency measured?"
]

async def run_benchmark_suite():
    print("=== Starting RAG Latency Benchmark Suite ===")
    
    # Ensure vector store is loaded
    if not vector_store.is_loaded:
        if not vector_store.load(settings.VECTOR_STORE_PATH):
            print("Vector store not found. Running ingestion first...")
            from scripts.ingest import run_ingestion
            run_ingestion()
            vector_store.load(settings.VECTOR_STORE_PATH)

    retrieval_latencies = []
    guardrail_latencies = []
    generation_latencies = []
    e2e_latencies = []
    query_results = []

    print(f"Running benchmark across {len(TEST_BENCHMARK_QUERIES)} test queries...")
    start_suite_time = time.perf_counter()

    for idx, query in enumerate(TEST_BENCHMARK_QUERIES, 1):
        print(f"[{idx}/{len(TEST_BENCHMARK_QUERIES)}] Query: '{query}'")
        res = await orchestration_harness.execute_pipeline(query, stt_latency_ms=12.5)
        
        lat = res.latency
        retrieval_latencies.append(lat.retrieval_ms)
        guardrail_latencies.append(lat.guardrails_ms)
        generation_latencies.append(lat.generation_ms)
        e2e_latencies.append(lat.total_e2e_ms)

        query_results.append({
            "query": query,
            "status": res.status,
            "grounded": res.grounded,
            "retrieval_ms": lat.retrieval_ms,
            "guardrails_ms": lat.guardrails_ms,
            "generation_ms": lat.generation_ms,
            "total_e2e_ms": lat.total_e2e_ms
        })

    total_suite_time = time.perf_counter() - start_suite_time

    # Calculate P50, P70, P100 metrics
    def get_percentiles(data: List[float]):
        arr = np.array(data)
        return {
            "p50": round(float(np.percentile(arr, 50)), 2),
            "p70": round(float(np.percentile(arr, 70)), 2),
            "p100": round(float(np.percentile(arr, 100)), 2),
            "avg": round(float(np.mean(arr)), 2),
            "min": round(float(np.min(arr)), 2),
            "max": round(float(np.max(arr)), 2)
        }

    retrieval_stats = get_percentiles(retrieval_latencies)
    guardrail_stats = get_percentiles(guardrail_latencies)
    generation_stats = get_percentiles(generation_latencies)
    e2e_stats = get_percentiles(e2e_latencies)

    benchmark_summary = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_queries_tested": len(TEST_BENCHMARK_QUERIES),
        "total_suite_duration_sec": round(total_suite_duration_sec := total_suite_time, 2),
        "metrics": {
            "e2e": e2e_stats,
            "retrieval": retrieval_stats,
            "guardrails": guardrail_stats,
            "generation": generation_stats
        },
        "query_details": query_results
    }

    print("\n" + "="*50)
    print("           BENCHMARK RESULTS (LATENCY IN MS)")
    print("="*50)
    print(f"E2E Total Latency    : P50 = {e2e_stats['p50']}ms | P70 = {e2e_stats['p70']}ms | P100 = {e2e_stats['p100']}ms")
    print(f"Retrieval Latency    : P50 = {retrieval_stats['p50']}ms | P70 = {retrieval_stats['p70']}ms | P100 = {retrieval_stats['p100']}ms")
    print(f"Guardrails Latency   : P50 = {guardrail_stats['p50']}ms | P70 = {guardrail_stats['p70']}ms | P100 = {guardrail_stats['p100']}ms")
    print(f"Generation Latency   : P50 = {generation_stats['p50']}ms | P70 = {generation_stats['p70']}ms | P100 = {generation_stats['p100']}ms")
    print("="*50)

    # Save benchmark results
    os.makedirs(os.path.dirname(settings.BENCHMARK_RESULTS_PATH), exist_ok=True)
    with open(settings.BENCHMARK_RESULTS_PATH, "w") as f:
        json.dump(benchmark_summary, f, indent=2)

    print(f"Saved detailed benchmark output to '{settings.BENCHMARK_RESULTS_PATH}'")
    return benchmark_summary

if __name__ == "__main__":
    asyncio.run(run_benchmark_suite())
