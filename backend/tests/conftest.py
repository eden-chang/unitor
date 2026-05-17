"""Shared pytest fixtures.

Unit tests don't need a real DB; the smoke tests in ``tests/unit/`` use
``TestClient`` with a fresh ``create_app()``. Integration tests under
``tests/integration/`` require a running local Supabase stack — see
``../README.md`` "Running tests".
"""

from __future__ import annotations

import os

# Make sure tests don't accidentally hit a real Supabase project even if a
# developer leaves SUPABASE_* values in their environment.
os.environ.setdefault("APP_ENV", "dev")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:6543/postgres")
os.environ.setdefault(
    "DATABASE_DIRECT_URL",
    "postgresql+asyncpg://test:test@localhost:5432/postgres",
)
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret-do-not-use-in-prod")
os.environ.setdefault("CRON_TOKEN", "test-cron-token")
