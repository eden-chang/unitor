"""Service-role database session for admin / cron / bootstrap operations.

**Restricted import**: this module may only be imported by code under
``app/api/v1/admin/``, ``app/api/v1/auth/`` (for the bootstrap flow), and
``app/jobs/``. CI enforces this with a lint rule. See ADR 0002 and
ADR 0009 section 2.

Service role bypasses RLS. Any endpoint using this session must perform
its own authorization checks in application code.

## Transaction lifecycle

Owns one transaction; commits on normal exit, rolls back on exception.
Callers must NOT invoke ``session.commit()`` directly -- it would clear
the SET LOCAL role and risk poisoning subsequent queries on the same
session.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import _get_session_factory, _set_role


@asynccontextmanager
async def admin_session() -> AsyncIterator[AsyncSession]:
    """Yield a session that bypasses RLS by switching to ``service_role``
    for the transaction.
    """
    factory = _get_session_factory()
    async with factory() as session:
        async with session.begin():
            await _set_role(session, "service_role")
            yield session
