"""extensions and enums

Bootstrap migration. Enables required Postgres extensions and creates
every enum type used by later migrations. Idempotent: re-running is safe.

Extension availability by Supabase tier (per ADR 0009 V1):
  * pgcrypto              — All tiers. Required.
  * pg_uuidv7             — Pro+ (preferred for server-side UUIDv7). Optional;
                            we generate UUIDv7 app-side, so this is just a
                            backup convenience.
  * pg_partman            — Pro+. Required for messages partitioning. Skipped
                            on Free; partitioning code paths must check
                            availability before use.
  * pg_cron               — All tiers. Required for scheduled jobs.

We attempt each extension with IF NOT EXISTS. Failures on optional
extensions are caught and logged; required extensions raise.

Revision ID: 0001
Revises:
Create Date: 2026-05-17

"""

from __future__ import annotations

import sys
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Required extensions — fail loudly if not available.
REQUIRED_EXTENSIONS: tuple[str, ...] = ("pgcrypto",)

# Optional extensions — try, but tolerate absence (Free tier).
OPTIONAL_EXTENSIONS: tuple[str, ...] = (
    "pg_uuidv7",  # server-side UUIDv7; Pro+ only
    "pg_partman",  # messages partitioning; Pro+ only
    "pg_cron",  # scheduled jobs; should be on all tiers but treat as optional
)


# All enum types used by the schema. Defined in one place so future tables
# can reference them by name. Adding a new enum: append to this list AND
# add the CREATE TYPE statement to upgrade().
ENUM_TYPES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("course_state", ("draft", "active", "archived")),
    ("enrollment_role", ("student", "ta", "instructor")),
    ("enrollment_status", ("active", "dropped", "completed")),
    ("proficiency_level", ("beginner", "intermediate", "proficient", "expert")),
    ("group_state", ("forming", "confirming", "confirmed", "disbanded")),
    ("group_member_role", ("leader", "member")),
    (
        "request_status",
        ("pending", "replied", "accepted", "declined", "withdrawn", "expired"),
    ),
    ("application_status", ("pending", "accepted", "declined", "withdrawn")),
    ("vote_value", ("up", "down")),
    ("conversation_type", ("direct", "group")),
    ("reaction_type", ("check", "thumb_up", "heart", "sad")),
    (
        "notification_type",
        (
            "group_request_received",
            "group_application_received",
            "request_accepted",
            "request_declined",
            "application_accepted",
            "application_declined",
            "member_left",
            "confirm_requested",
            "urgent_mode",
        ),
    ),
    ("actor_kind", ("user", "cron", "system")),
)


def _create_extension(name: str, *, required: bool) -> None:
    """Create an extension, tolerating failure when not required.

    Wrapped in a SAVEPOINT so that a failed optional extension does not
    poison the surrounding migration transaction. Pro-only extensions on
    Free tier raise during CREATE EXTENSION; we roll the savepoint back
    and continue.
    """
    bind = op.get_bind()
    savepoint = bind.begin_nested()
    try:
        bind.exec_driver_sql(f'CREATE EXTENSION IF NOT EXISTS "{name}"')
    except Exception as exc:
        savepoint.rollback()
        if required:
            raise
        sys.stderr.write(
            f"[migration 0001] optional extension '{name}' not available "
            f"on this Supabase tier; continuing. ({exc.__class__.__name__})\n"
        )
        return
    savepoint.commit()


def _create_enum(name: str, values: tuple[str, ...]) -> None:
    """Idempotent enum creation. Postgres has no native IF NOT EXISTS for
    CREATE TYPE, so we wrap in a DO block that checks pg_type.

    Inputs are hardcoded constants in this file (`ENUM_TYPES`); no user
    input flows here, so the SQL composition is safe.
    """
    value_list = ", ".join(f"'{v}'" for v in values)
    # Identifiers come from the hardcoded ENUM_TYPES constant in this file;
    # no user input flows here, so the dynamic SQL is safe.
    stmt = f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN
                CREATE TYPE {name} AS ENUM ({value_list});
            END IF;
        END
        $$;
    """  # noqa: S608
    op.execute(sa.text(stmt))


def upgrade() -> None:
    # 1. Required extensions.
    for ext in REQUIRED_EXTENSIONS:
        _create_extension(ext, required=True)

    # 2. Optional extensions — tolerate failure on Free tier.
    for ext in OPTIONAL_EXTENSIONS:
        _create_extension(ext, required=False)

    # 3. All enum types.
    for enum_name, values in ENUM_TYPES:
        _create_enum(enum_name, values)


def downgrade() -> None:
    # Drop enums in reverse order. Extensions are kept (they're harmless
    # and may be used by other applications on the same database).
    for enum_name, _ in reversed(ENUM_TYPES):
        op.execute(sa.text(f"DROP TYPE IF EXISTS {enum_name}"))
