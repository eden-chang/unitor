"""Database session factories.

Two modes per ADR 0002 + ADR 0009 section 2:

* ``user_session(user)`` -- RLS-respecting. Opens a Postgres transaction
  as the ``authenticated`` role and pushes the user's JWT claims into
  the transaction via ``set_config('request.jwt.claims', ..., true)`` so
  ``auth.uid()`` returns the right value inside the database. Use for
  all user-facing endpoints.

* ``admin_session()`` -- bypasses RLS by setting the ``service_role``
  Postgres role for the transaction. Only legal to import from
  ``app/api/v1/admin/``, ``app/api/v1/auth/``, and ``app/jobs/``. CI
  enforces this with a lint rule.

Both use the Supavisor transaction-mode pooler (port 6543) per ADR 0009
section 6, configured with ``prepared_statement_cache_size=0`` to avoid
the well-known asyncpg + transaction-mode pooling conflict.

## Transaction lifecycle

Both context managers OWN the transaction. The body of the ``async with``
runs inside one transaction. On normal exit the transaction commits.
On exception it rolls back. **Routes should NOT call ``session.commit()``
or ``session.rollback()`` directly**, otherwise the SET LOCAL settings
(role + JWT claims) reset on commit and subsequent queries in the same
session lose their RLS context.

If you genuinely need to commit mid-route (rare), open a new context.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.auth.jwt import CurrentUser, get_current_user
from app.config import get_settings

# ---------------------------------------------------------------------------
# Engine wiring
# ---------------------------------------------------------------------------
# Single engine for the process. The pool grows/shrinks under it; each
# request acquires and returns a connection.


def _build_engine(url: str) -> AsyncEngine:
    return create_async_engine(
        url,
        connect_args={
            # Transaction-mode pooling + asyncpg: disable prepared statement
            # caching to avoid "prepared statement X already exists" errors.
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
            # Helps DB-side monitoring identify our app. Visible in
            # pg_stat_activity / Supabase observability.
            "server_settings": {"application_name": "unitor-backend"},
        },
        pool_size=10,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=1800,  # 30 min -- drop connections that the pooler rotated out
    )


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    """Return the singleton runtime engine.

    Uses ``DATABASE_URL`` (the pooler). Migrations use a separate engine
    against ``DATABASE_DIRECT_URL`` -- see ``alembic/env.py``.
    """
    return _build_engine(get_settings().DATABASE_URL.get_secret_value())


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
# Shared helpers
# ---------------------------------------------------------------------------


async def _set_role(session: AsyncSession, role: str) -> None:
    """Set the Postgres session role for the current transaction.

    Caller must already be inside a transaction (``session.begin()`` or
    auto-begin). The setting is reverted on commit / rollback.
    """
    # SET LOCAL is the only safe option under transaction-mode pooling.
    # We can't use parameterized bind here because Postgres rejects
    # bind parameters in SET statements; we restrict the input to a
    # known whitelist instead.
    if role not in {"authenticated", "service_role", "anon"}:
        raise ValueError(f"Refusing to SET LOCAL ROLE to untrusted value: {role!r}")
    await session.execute(text(f"SET LOCAL ROLE {role}"))


async def _set_jwt_claims(session: AsyncSession, claims: dict[str, object]) -> None:
    await session.execute(
        text("SELECT set_config('request.jwt.claims', :claims, true)"),
        {"claims": json.dumps(claims)},
    )


# ---------------------------------------------------------------------------
# user_session -- RLS-respecting (default for user-facing endpoints)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def user_session(user: CurrentUser) -> AsyncIterator[AsyncSession]:
    """Yield a session that respects RLS for ``user``.

    Owns one transaction. Commits on normal exit, rolls back on exception.
    """
    factory = _get_session_factory()
    async with factory() as session:
        # session.begin() context: commits on success, rolls back on raise.
        async with session.begin():
            await _set_role(session, "authenticated")
            await _set_jwt_claims(session, user.jwt_claims_subset)
            yield session


# FastAPI-friendly wrapper. Endpoints take ``UserSessionDep`` directly.
async def user_session_dep(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> AsyncIterator[AsyncSession]:
    async with user_session(user) as session:
        yield session


# Convenience aliases -- short, type-safe, work everywhere.
CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
UserSessionDep = Annotated[AsyncSession, Depends(user_session_dep)]
