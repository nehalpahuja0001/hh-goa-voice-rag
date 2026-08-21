import os
import sys

# Ensure backend directory is in Python path for Vercel serverless functions
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api.endpoints import router as api_router
from app.services.retrieval import vector_store

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fast non-blocking startup: Load vector store if present, or initialize fallback
    print("Initializing HH Goa 2026 Voice-Enabled RAG Backend...", flush=True)
    if not vector_store.load(settings.VECTOR_STORE_PATH):
        print(f"Vector store index file not found at {settings.VECTOR_STORE_PATH}. Initializing default fallback index...", flush=True)
        try:
            from scripts.ingest import load_msmarco_xi_dataset
            from app.services.chunker import MultiStrategyChunkerEngine
            docs = load_msmarco_xi_dataset()
            chunker = MultiStrategyChunkerEngine()
            chunks = []
            for doc in docs:
                chunks.extend(chunker.chunk_document(doc["id"], doc["text"], strategy="semantic", metadata=doc.get("metadata")))
            vector_store.add_chunks(chunks)
            vector_store.save(settings.VECTOR_STORE_PATH)
        except Exception as e:
            print(f"Warning initializing default vector store: {e}", flush=True)
    yield
    print("Shutting down RAG Backend service.", flush=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Setup for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "title": settings.PROJECT_NAME,
        "docs": "/docs",
        "api_health": f"{settings.API_V1_STR}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
