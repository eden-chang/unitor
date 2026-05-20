"""public.users: viewer-own UPDATE policy

Stage 1 step C needs ``PATCH /api/v1/users/me`` (display name edit at
the top of the profile wizard). Migration 0002 enabled RLS on
``public.users`` and added a SELECT policy ("read self or classmates")
but no UPDATE policy, so the route would otherwise be forced through
``admin_session`` for what is logically a self-service write.

Adding ``UPDATE`` for ``id = auth.uid()`` lets the route run under
``user_session`` and keeps the authorization check in one place (the
database) instead of duplicating it in application code.

The ``WITH CHECK`` clause prevents a row from being re-targeted at
another user mid-update.

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-19

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011"
down_revision: str | Sequence[str] | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            CREATE POLICY users_update_self ON users FOR UPDATE
              USING (id = auth.uid() AND deleted_at IS NULL)
              WITH CHECK (id = auth.uid() AND deleted_at IS NULL);
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP POLICY IF EXISTS users_update_self ON users"))
