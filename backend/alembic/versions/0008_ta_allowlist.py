"""ta_allowlist

Small operator-curated table of emails that are allowed to sign up via
the TA route (separate from the student roster gate). Per ADR 0007
section 5 follow-up and ADR 0009 + 07-auth-flows.md section 3.

Read/write goes through FastAPI service role; no user-role policy is
created, so RLS effectively denies everything from authenticated callers.

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008"
down_revision: str | Sequence[str] | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ta_allowlist",
        sa.Column("email", sa.Text(), primary_key=True),  # stored lowercase
        sa.Column("added_by", sa.Text(), nullable=False),
        sa.Column(
            "added_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.CheckConstraint("email = lower(email)", name="ck_ta_allowlist_lower_email"),
    )

    # RLS on but no policies = service role only.
    op.execute(sa.text("ALTER TABLE ta_allowlist ENABLE ROW LEVEL SECURITY"))


def downgrade() -> None:
    op.drop_table("ta_allowlist")
