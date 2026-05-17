"""Alembic environment.

Migrations run against the session-mode Supavisor pooler (port 5432), not
the transaction-mode pooler (port 6543). Migrations need session-level
features (advisory locks, ``CREATE INDEX CONCURRENTLY``, etc.) that
transaction-mode pooling breaks. See ADR 0006 "Connection topology" and
ADR 0009 §6.

We bypass ``config.set_main_option("sqlalchemy.url", …)`` because the URL
contains percent-encoded characters (``%40`` for ``@``) which Python's
``configparser`` interprets as interpolation tokens. Instead we build the
async engine directly from settings.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from app.config import get_settings
from app.db.models.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    """Resolve at call time; avoids env-load side effects at import."""
    return get_settings().DATABASE_DIRECT_URL


def run_migrations_offline() -> None:
    """Emit SQL to stdout instead of applying.

    Used as ``alembic upgrade head --sql``. Reads URL from settings, never
    from alembic.ini, so percent-encoded passwords don't trip configparser.
    """
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    engine = create_async_engine(_database_url(), poolclass=pool.NullPool)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
