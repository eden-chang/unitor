"""Application settings loaded from environment variables.

Single source of truth for all configuration. Anything that varies across
dev / staging / prod lives here and is type-checked at import time.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings.

    Values are loaded from `.env` in development and from the platform's
    secret manager (Railway / Fly / Vercel) in production. See `.env.example`
    for the canonical list of keys.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_ENV: Literal["dev", "staging", "prod"] = "dev"
    APP_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Postgres
    DATABASE_URL: str = Field(
        description="Supavisor transaction-mode pooler URL (port 6543) used at runtime.",
    )
    DATABASE_DIRECT_URL: str = Field(
        description="Direct Postgres URL (port 5432) used by Alembic migrations only.",
    )

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    SUPABASE_JWT_SECRET_PREVIOUS: str | None = None

    # Cron
    CRON_TOKEN: str

    # Cloudflare R2
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_PROFILES: str = "unitor-profiles-dev"
    R2_BUCKET_ROSTERS: str = "unitor-rosters-dev"
    R2_BUCKET_ARCHIVES: str = "unitor-archives-dev"
    R2_PUBLIC_BASE_URL: str = "https://cdn.example.dev"

    # Email
    RESEND_API_KEY: str | None = None
    RESEND_FROM_ADDRESS: str = "noreply@unitor.app"

    # Observability
    SENTRY_DSN: str | None = None

    # CORS
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse the comma-separated `CORS_ALLOWED_ORIGINS` into a list."""
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "prod"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached settings singleton.

    Use this rather than instantiating ``Settings()`` directly so that env
    parsing happens exactly once per process and tests can override via
    dependency injection.
    """
    return Settings()  # type: ignore[call-arg]
