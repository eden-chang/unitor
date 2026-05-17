"""Service-role database session for admin / cron / bootstrap operations.

**Restricted import**: this module may only be imported by code under
``app/api/v1/admin/``, ``app/api/v1/auth/`` (for the bootstrap flow), and
``app/jobs/``. CI enforces this with a lint rule. See [ADR 0002] and
[ADR 0009] §2.

Service role bypasses RLS. Any endpoint using this session must perform
its own authorization checks in application code.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import _get_session_factory


@asynccontextmanager
async def admin_session() -> AsyncIterator[AsyncSession]:
    """Yield a session that bypasses RLS by connecting as service role.

    The underlying engine is shared with ``user_session`` (same pool, same
    connection string), but we set the Postgres role to ``service_role``
    on the current transaction so RLS policies don't apply.
    """
    factory = _get_session_factory()
    async with factory() as session:
        await session.execute(text("SET LOCAL ROLE service_role"))
        yield session
