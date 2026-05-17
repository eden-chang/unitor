"""groups tree - groups, group_memberships, group_application_questions

ERD sections 12-14. Per ADR 0007 section 5, leader is identified by
group_memberships.role, not groups.leader_id, with a partial unique index
enforcing at most one active leader per group.

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | Sequence[str] | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamp_columns(*, with_deleted: bool = False) -> list[sa.Column]:
    cols: list[sa.Column] = [
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    ]
    if with_deleted:
        cols.append(sa.Column("deleted_at", postgresql.TIMESTAMP(timezone=True), nullable=True))
    return cols


def _updated_at_trigger(table: str) -> None:
    op.execute(
        sa.text(
            f"""
            CREATE TRIGGER {table}_set_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION public.tg_set_updated_at();
            """
        )
    )


def upgrade() -> None:
    # groups ---------------------------------------------------------------
    op.create_table(
        "groups",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "state",
            postgresql.ENUM(name="group_state", create_type=False),
            nullable=False,
            server_default="forming",
        ),
        sa.Column("recruiting", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "confirmation_initiated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "confirmation_deadline_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column("confirmed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        *_timestamp_columns(with_deleted=True),
    )
    op.create_index("ix_groups_course_state", "groups", ["course_id", "state"])
    op.create_index(
        "ix_groups_recruiting",
        "groups",
        ["course_id"],
        postgresql_where=sa.text("recruiting AND state = 'forming' AND deleted_at IS NULL"),
    )

    # group_memberships ----------------------------------------------------
    op.create_table(
        "group_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "enrollment_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("enrollments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role",
            postgresql.ENUM(name="group_member_role", create_type=False),
            nullable=False,
            server_default="member",
        ),
        sa.Column(
            "joined_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("confirmed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("left_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    # A user can only be in a group once at a time (per ADR 0007 sec 5).
    op.create_index(
        "uq_group_memberships_active",
        "group_memberships",
        ["group_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("left_at IS NULL"),
    )
    # At most one active leader per group.
    op.create_index(
        "uq_group_memberships_leader",
        "group_memberships",
        ["group_id"],
        unique=True,
        postgresql_where=sa.text("role = 'leader' AND left_at IS NULL"),
    )
    op.create_index(
        "ix_group_memberships_user_active",
        "group_memberships",
        ["user_id"],
        postgresql_where=sa.text("left_at IS NULL"),
    )

    # group_application_questions -----------------------------------------
    op.create_table(
        "group_application_questions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("archived_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_group_application_questions_active",
        "group_application_questions",
        ["group_id", "display_order"],
        postgresql_where=sa.text("is_archived = false"),
    )

    # triggers -------------------------------------------------------------
    _updated_at_trigger("groups")

    # enable RLS -----------------------------------------------------------
    for tbl in ("groups", "group_memberships", "group_application_questions"):
        op.execute(sa.text(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY"))

    # policies -------------------------------------------------------------
    # groups: any course member can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY groups_read ON groups FOR SELECT
              USING (
                deleted_at IS NULL
                AND course_id IN (
                  SELECT course_id FROM enrollments
                  WHERE user_id = auth.uid() AND deleted_at IS NULL
                )
              );
            """
        )
    )
    # group writes go through FastAPI service role; no direct policy needed.

    # group_memberships: any course member can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY group_memberships_read ON group_memberships FOR SELECT
              USING (
                group_id IN (
                  SELECT g.id FROM groups g
                  WHERE g.deleted_at IS NULL
                    AND g.course_id IN (
                      SELECT course_id FROM enrollments
                      WHERE user_id = auth.uid() AND deleted_at IS NULL
                    )
                )
              );
            """
        )
    )

    # group_application_questions: course members can read active questions;
    # archived ones still readable for old answers.
    op.execute(
        sa.text(
            """
            CREATE POLICY group_application_questions_read ON group_application_questions FOR SELECT
              USING (
                group_id IN (
                  SELECT g.id FROM groups g
                  WHERE g.deleted_at IS NULL
                    AND g.course_id IN (
                      SELECT course_id FROM enrollments
                      WHERE user_id = auth.uid() AND deleted_at IS NULL
                    )
                )
              );
            """
        )
    )


def downgrade() -> None:
    op.drop_table("group_application_questions")
    op.drop_table("group_memberships")
    op.drop_table("groups")
