"""Database session factories.

Two modes per ADR 0002 + ADR 0009 §2:

* ``user_session(user)`` — RLS-respecting. Opens a Postgres connection as
  the ``authenticated`` role and pushes the user's JWT claims into the
  session via ``set_config('request.jwt.claims', …, true)``. Use for all
  user-facing endpoints.

* ``admin_session()`` — bypasses RLS by connecting as service role. Only
  legal to import from ``app/api/v1/admin/``, ``app/api/v1/auth/``, and
  ``app/jobs/``. CI enforces this with a lint rule.

Both use the Supavisor transaction-mode pooler (port 6543) per ADR 0009 §6,
configured with ``prepared_statement_cache_size=0`` to avoid the well-known
asyncpg + transaction-mode pooling conflict.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import lru_cache

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.auth.jwt import CurrentUser
from app.config import get_settings

# ---------------------------------------------------------------------------
# Engine wiring
# ---------------------------------------------------------------------------
# We keep a single engine for the application lifetime. The engine pools
# connections internally; each request acquires/returns a connection.


def _build_engine(url: str) -> AsyncEngine:
    return create_async_engine(
        url,
        connect_args={
            # Transaction-mode pooling + asyncpg: disable prepared statement
            # caching to avoid "prepared statement X already exists" errors.
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        },
        pool_size=10,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=1800,  # 30 min — drop connections that the pooler rotated out
    )


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    """Return the singleton runtime engine.

    Uses ``DATABASE_URL`` (the pooler). Migrations use a separate engine
    against ``DATABASE_DIRECT_URL`` — see ``alembic/env.py``.
    """
    return _build_engine(get_settings().DATABASE_URL)


_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _session_factory


# ---------------------------------------------------------------------------
# user_session — RLS-respecting (default for user-facing endpoints)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def user_session(user: CurrentUser) -> AsyncIterator[AsyncSession]:
    """Yield a session that respects RLS for ``user``.

    The connection is set to the ``authenticated`` role and the user's
    JWT claims are pushed into ``request.jwt.claims`` so ``auth.uid()``
    returns the right value inside the database.

    Use as a FastAPI dependency:

        async def my_endpoint(
            user: Annotated[CurrentUser, Depends(get_current_user)],
            db: Annotated[AsyncSession, Depends(user_session_dep)],
        ): ...
    """
    factory = _get_session_factory()
    async with factory() as session:
        # SET LOCAL: applies only for the current transaction, so it's
        # safe with transaction-mode pooling.
        await session.execute(text("SET LOCAL ROLE authenticated"))
        await session.execute(
            text("SELECT set_config('request.jwt.claims', :claims, true)"),
            {"claims": json.dumps(user.jwt_claims_subset)},
        )
        yield session


# FastAPI-friendly wrapper. Endpoints use this with ``Depends``.
async def user_session_dep(
    user: CurrentUser,
) -> AsyncIterator[AsyncSession]:
    async with user_session(user) as session:
        yield session
