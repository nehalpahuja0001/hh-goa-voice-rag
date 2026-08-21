import os
from pydantic_settings import BaseSettings
from typing import Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DEFAULT_VECTOR_STORE_PATH = os.path.join(DATA_DIR, "vector_store.pkl")
DEFAULT_BENCHMARK_RESULTS_PATH = os.path.join(DATA_DIR, "benchmark_results.json")

class Settings(BaseSettings):
    PROJECT_NAME: str = "HH Goa 2026 Voice-Enabled RAG"
    API_V1_STR: str = "/api"
    
    # STT Settings
    STT_PROVIDER: str = "sarvam"  # sarvam | elevenlabs | whisper | auto
    SARVAM_API_KEY: Optional[str] = os.getenv("SARVAM_API_KEY", "")
    ELEVENLABS_API_KEY: Optional[str] = os.getenv("ELEVENLABS_API_KEY", "")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    
    # LLM Settings
    LLM_PROVIDER: str = "openai"  # openai | groq | gemini | fallback
    LLM_API_KEY: Optional[str] = os.getenv("LLM_API_KEY", os.getenv("OPENAI_API_KEY", ""))
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gpt-4o-mini")
    
    # Vector DB / Retrieval Settings
    VECTOR_STORE_PATH: str = os.getenv("VECTOR_STORE_PATH", DEFAULT_VECTOR_STORE_PATH)
    BENCHMARK_RESULTS_PATH: str = os.getenv("BENCHMARK_RESULTS_PATH", DEFAULT_BENCHMARK_RESULTS_PATH)
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    TOP_K: int = int(os.getenv("TOP_K", "4"))
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.15"))
    MAX_CONTEXT_LENGTH: int = int(os.getenv("MAX_CONTEXT_LENGTH", "2000"))
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
