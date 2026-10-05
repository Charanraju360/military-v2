"""Application configuration loaded from the documented environment variables."""

from dataclasses import dataclass
import os

try:
    from dotenv import load_dotenv
    from pathlib import Path

    backend_env = Path(__file__).resolve().parent.parent / ".env"
    if backend_env.exists():
        load_dotenv(backend_env)
    root_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if root_env.exists():
        load_dotenv(root_env)
    load_dotenv()
except ImportError:
    pass


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime settings; connection use is intentionally deferred to Phase 1."""

    mongodb_uri: str | None
    chromadb_path: str
    qwen_api_key: str | None
    qwen_base_url: str | None
    qwen_model: str
    qwen_timeout_seconds: int
    openrouter_api_key: str | None
    openrouter_base_url: str
    openrouter_model: str | None
    openrouter_timeout_seconds: int
    hybrid_semantic_weight: float
    hybrid_entity_weight: float
    hybrid_location_weight: float
    hybrid_time_weight: float
    hybrid_metadata_weight: float
    hybrid_match_threshold: float
    source_request_timeout_seconds: int = 15


def get_settings() -> Settings:
    """Load the environment variables documented in README.md."""

    return Settings(
        mongodb_uri=os.getenv("MONGODB_URI"),
        chromadb_path=os.getenv("CHROMADB_PATH", "./chroma_data"),
        qwen_api_key=os.getenv("QWEN_API_KEY") or os.getenv("OMNIROUTE_API_KEY"),
        qwen_base_url=os.getenv("QWEN_BASE_URL") or os.getenv("OMNIROUTE_BASE_URL"),
        qwen_model=os.getenv("QWEN_MODEL", "qwen3:14b"),
        qwen_timeout_seconds=int(
            os.getenv("QWEN_TIMEOUT_SECONDS")
            or os.getenv("OMNIROUTE_TIMEOUT_SECONDS")
            or "30"
        ),
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
        openrouter_base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        openrouter_model=os.getenv("OPENROUTER_MODEL"),
        openrouter_timeout_seconds=int(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "10")),
        hybrid_semantic_weight=float(os.getenv("HYBRID_SEMANTIC_WEIGHT", "0.55")),
        hybrid_entity_weight=float(os.getenv("HYBRID_ENTITY_WEIGHT", "0.18")),
        hybrid_location_weight=float(os.getenv("HYBRID_LOCATION_WEIGHT", "0.12")),
        hybrid_time_weight=float(os.getenv("HYBRID_TIME_WEIGHT", "0.10")),
        hybrid_metadata_weight=float(os.getenv("HYBRID_METADATA_WEIGHT", "0.05")),
        hybrid_match_threshold=float(os.getenv("HYBRID_MATCH_THRESHOLD", "0.62")),
        source_request_timeout_seconds=int(os.getenv("SOURCE_REQUEST_TIMEOUT_SECONDS", "15")),
    )


settings = get_settings()

