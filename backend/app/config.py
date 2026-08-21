import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DEFAULT_VECTOR_STORE_PATH = os.path.join(DATA_DIR, "vector_store.pkl")
DEFAULT_BENCHMARK_RESULTS_PATH = os.path.join(DATA_DIR, "benchmark_results.json")

class Settings(BaseSettings):
    PROJECT_NAME: str = "HH Goa 2026 Voice-Enabled RAG"
    API_V1_STR: str = "/api"
    
    # STT Settings
    STT_PROVIDER: str = "sarvam"  # sarvam | elevenlabs | whisper | auto
    SARVAM_API_KEY: Optional[str] = ""
    ELEVENLABS_API_KEY: Optional[str] = ""
    OPENAI_API_KEY: Optional[str] = ""
    
    # LLM Settings
    LLM_PROVIDER: str = "openai"  # openai | groq | gemini | fallback
    LLM_API_KEY: Optional[str] = ""
    MODEL_NAME: str = "gpt-4o-mini"
    
    # Vector DB / Retrieval Settings
    VECTOR_STORE_PATH: str = DEFAULT_VECTOR_STORE_PATH
    BENCHMARK_RESULTS_PATH: str = DEFAULT_BENCHMARK_RESULTS_PATH
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    TOP_K: int = 4
    SIMILARITY_THRESHOLD: float = 0.15
    MAX_CONTEXT_LENGTH: int = 2000

    @field_validator("TOP_K", mode="before")
    def parse_top_k(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return 4
        try:
            return int(v)
        except ValueError:
            return 4

    @field_validator("SIMILARITY_THRESHOLD", mode="before")
    def parse_similarity(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return 0.15
        try:
            return float(v)
        except ValueError:
            return 0.15

    @field_validator("MAX_CONTEXT_LENGTH", mode="before")
    def parse_max_context(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return 2000
        try:
            return int(v)
        except ValueError:
            return 2000

    @field_validator("STT_PROVIDER", mode="before")
    def parse_stt_provider(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return "sarvam"
        return str(v)

    @field_validator("LLM_PROVIDER", mode="before")
    def parse_llm_provider(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return "openai"
        return str(v)

    @field_validator("MODEL_NAME", mode="before")
    def parse_model_name(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return "gpt-4o-mini"
        return str(v)

    @field_validator("VECTOR_STORE_PATH", mode="before")
    def parse_vector_path(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return DEFAULT_VECTOR_STORE_PATH
        return str(v)

    @field_validator("BENCHMARK_RESULTS_PATH", mode="before")
    def parse_benchmark_path(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return DEFAULT_BENCHMARK_RESULTS_PATH
        return str(v)

    @field_validator("EMBEDDING_MODEL_NAME", mode="before")
    def parse_embedding_model(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return "all-MiniLM-L6-v2"
        return str(v)

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
