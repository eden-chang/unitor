"""notifications + compatibility_cache + audit_log

ERD sections 23-25.

* notifications: per-recipient feed; transient (cron deletes >30 days).
* compatibility_cache: lazy-computed matching results. algorithm_version
  column per ADR 0009 section 5 makes weight changes a code-side bump
  with no migration.
* audit_log: append-only; hot 1y then archive (cron, later).

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007"
down_revision: str | Sequence[str] | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # notifications
    # ------------------------------------------------------------------
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "recipient_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "type",
            postgresql.ENUM(name="notification_type", create_type=False),
            nullable=False,
        ),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("action_target_type", sa.Text(), nullable=True),
        sa.Column("action_target_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("read_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_notifications_feed",
        "notifications",
        ["recipient_user_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_notifications_unread",
        "notifications",
        ["recipient_user_id"],
        postgresql_where=sa.text("read_at IS NULL"),
    )

    # ------------------------------------------------------------------
    # compatibility_cache
    # ------------------------------------------------------------------
    op.create_table(
        "compatibility_cache",
        sa.Column(
            "viewer_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("algorithm_version", sa.SmallInteger(), nullable=False),
        sa.Column("overall_score", sa.Integer(), nullable=False),
        sa.Column("schedule_score", sa.Integer(), nullable=False),
        sa.Column("skill_score", sa.Integer(), nullable=False),
        sa.Column("work_style_score", sa.Integer(), nullable=False),
        sa.Column("schedule_overlap_hours", sa.Integer(), nullable=False),
        sa.Column(
            "reasons",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("ARRAY[]::text[]"),
        ),
        sa.Column(
            "warnings",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("ARRAY[]::text[]"),
        ),
        sa.Column(
            "skill_complementarity",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("computed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint(
            "viewer_user_id", "target_user_id", "course_id", name="pk_compatibility_cache"
        ),
        sa.CheckConstraint(
            "overall_score BETWEEN 0 AND 100"
            " AND schedule_score BETWEEN 0 AND 100"
            " AND skill_score BETWEEN 0 AND 100"
            " AND work_style_score BETWEEN 0 AND 100",
            name="ck_compatibility_cache_scores",
        ),
    )
    # Discovery sort path: per-viewer top targets, current version, non-stale.
    op.create_index(
        "ix_compatibility_cache_discovery",
        "compatibility_cache",
        ["course_id", "viewer_user_id", sa.text("overall_score DESC")],
        postgresql_where=sa.text("computed_at IS NOT NULL"),
    )

    # ------------------------------------------------------------------
    # audit_log
    # ------------------------------------------------------------------
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "actor_kind",
            postgresql.ENUM(name="actor_kind", create_type=False),
            nullable=False,
            server_default="user",
        ),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("target_type", sa.Text(), nullable=True),
        sa.Column("target_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column(
            "payload",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_audit_log_course_created",
        "audit_log",
        ["course_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_audit_log_action_created",
        "audit_log",
        ["action", sa.text("created_at DESC")],
    )

    # ------------------------------------------------------------------
    # RLS
    # ------------------------------------------------------------------
    for tbl in ("notifications", "compatibility_cache", "audit_log"):
        op.execute(sa.text(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY"))

    # notifications: own only (read + mark-read).
    op.execute(
        sa.text(
            """
            CREATE POLICY notifications_read_own ON notifications FOR SELECT
              USING (recipient_user_id = auth.uid());
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY notifications_update_own ON notifications FOR UPDATE
              USING (recipient_user_id = auth.uid())
              WITH CHECK (recipient_user_id = auth.uid());
            """
        )
    )

    # compatibility_cache: viewer reads own rows. Writes go via service role.
    op.execute(
        sa.text(
            """
            CREATE POLICY compatibility_cache_read_own ON compatibility_cache FOR SELECT
              USING (viewer_user_id = auth.uid());
            """
        )
    )

    # audit_log: TA / instructor of the course can read; writes via service role.
    op.execute(
        sa.text(
            """
            CREATE POLICY audit_log_read_ta ON audit_log FOR SELECT
              USING (
                course_id IS NOT NULL
                AND course_id IN (
                  SELECT course_id FROM enrollments
                  WHERE user_id = auth.uid()
                    AND role IN ('ta', 'instructor')
                    AND deleted_at IS NULL
                )
              );
            """
        )
    )


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("compatibility_cache")
    op.drop_table("notifications")
