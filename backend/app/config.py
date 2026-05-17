"""Application settings loaded from environment variables.

Single source of truth for all configuration. Anything that varies across
dev / staging / prod lives here and is type-checked at import time.

Secret fields are wrapped in ``pydantic.SecretStr`` so they don't appear
in ``repr(settings)`` or in ``settings.model_dump()`` by default. Read
their values via ``.get_secret_value()`` exactly at the point of use.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings.

    Values are loaded from `.env` in development and from the platform's
    secret manager (Railway / Fly / Vercel) in production. See
    `.env.example` for the canonical list of keys.
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
    DATABASE_URL: SecretStr = Field(
        description="Supavisor transaction-mode pooler URL (port 6543) used at runtime.",
    )
    DATABASE_DIRECT_URL: SecretStr = Field(
        description="Direct Postgres URL (port 5432) used by Alembic migrations only.",
    )

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: SecretStr
    SUPABASE_SERVICE_ROLE_KEY: SecretStr
    SUPABASE_JWT_SECRET: SecretStr
    SUPABASE_JWT_SECRET_PREVIOUS: SecretStr | None = None

    # Cron
    CRON_TOKEN: SecretStr

    # Cloudflare R2
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: SecretStr | None = None
    R2_BUCKET_PROFILES: str = "unitor-profiles-dev"
    R2_BUCKET_ROSTERS: str = "unitor-rosters-dev"
    R2_BUCKET_ARCHIVES: str = "unitor-archives-dev"
    R2_PUBLIC_BASE_URL: str = "https://cdn.example.dev"

    # Email
    RESEND_API_KEY: SecretStr | None = None
    RESEND_FROM_ADDRESS: str = "noreply@unitor.app"

    # Observability
    SENTRY_DSN: SecretStr | None = None

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
    return Settings()


def build_cors_origin_regex(origins: Iterable[str]) -> tuple[list[str], str | None]:
    """Split a CORS origin list into ``(exact_origins, regex)``.

    ``CORS_ALLOWED_ORIGINS`` can mix exact origins (``http://localhost:5173``)
    with one wildcard form (``https://*.vercel.app``). Starlette's
    ``allow_origins`` is exact-match only, so we sift the wildcard entries
    out and translate them into a single regex.

    Returns:
        A pair ``(exact_list, regex_or_None)`` where the regex includes
        the start/end anchors and matches any of the wildcard origins.
    """
    exact: list[str] = []
    wildcard_patterns: list[str] = []
    for origin in origins:
        if "*" in origin:
            # Build a regex piece: escape, then turn `\*` into `[^.]+`
            # so `https://*.vercel.app` matches `https://my-pr.vercel.app`
            # but NOT `https://evil.vercel.app.attacker.com`.
            literal = re.escape(origin).replace(r"\*", r"[^.]+")
            wildcard_patterns.append(literal)
        else:
            exact.append(origin)

    regex = f"^(?:{'|'.join(wildcard_patterns)})$" if wildcard_patterns else None
    return exact, regex
