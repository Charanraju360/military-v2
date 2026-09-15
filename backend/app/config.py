"""Application configuration loaded from the documented environment variables."""

from dataclasses import dataclass
import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime settings; connection use is intentionally deferred to Phase 1."""

    mongodb_uri: str | None
    chromadb_path: str
    omniroute_api_key: str | None
    omniroute_base_url: str
    omniroute_timeout_seconds: int
    source_request_timeout_seconds: int = 15


def get_settings() -> Settings:
    """Load the environment variables documented in README.md."""

    return Settings(
        mongodb_uri=os.getenv("MONGODB_URI"),
        chromadb_path=os.getenv("CHROMADB_PATH", "./chroma_data"),
        omniroute_api_key=os.getenv("OMNIROUTE_API_KEY"),
        omniroute_base_url=os.getenv("OMNIROUTE_BASE_URL", "https://api.omniroute.example/v1"),
        omniroute_timeout_seconds=int(os.getenv("OMNIROUTE_TIMEOUT_SECONDS", "7")),
        source_request_timeout_seconds=int(os.getenv("SOURCE_REQUEST_TIMEOUT_SECONDS", "15")),
    )


settings = get_settings()
