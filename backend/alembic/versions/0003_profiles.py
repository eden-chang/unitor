"""profiles tree - profiles, profile_skills, profile_schedule_slots, profile_links

ERD sections 8-11. Per ADR 0007 section 1, profiles are scoped per
enrollment (one profile per user per course), not per user.

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# upgrade
# ---------------------------------------------------------------------------


def upgrade() -> None:
    # profiles -------------------------------------------------------------
    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "enrollment_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("enrollments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("meeting_frequency", sa.Text(), nullable=True),
        sa.Column("meeting_style", sa.Text(), nullable=True),
        sa.Column("comm_tool", sa.Text(), nullable=True),
        sa.Column("comm_handle", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column(
            "schedule_flexible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "last_active_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        *_timestamp_columns(),
        sa.UniqueConstraint("enrollment_id", name="uq_profiles_enrollment"),
        sa.CheckConstraint("char_length(bio) <= 300", name="ck_profiles_bio_len"),
    )
    op.create_index("ix_profiles_last_active", "profiles", [sa.text("last_active_at DESC")])

    # profile_skills -------------------------------------------------------
    op.create_table(
        "profile_skills",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "profile_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "course_skill_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("course_skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "proficiency",
            postgresql.ENUM(name="proficiency_level", create_type=False),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "profile_id", "course_skill_id", name="uq_profile_skills_profile_skill"
        ),
    )
    op.create_index("ix_profile_skills_skill", "profile_skills", ["course_skill_id"])

    # profile_schedule_slots -----------------------------------------------
    op.create_table(
        "profile_schedule_slots",
        sa.Column(
            "profile_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=False),
        sa.Column("time_band", sa.SmallInteger(), nullable=False),
        sa.PrimaryKeyConstraint(
            "profile_id", "day_of_week", "time_band", name="pk_profile_schedule_slots"
        ),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 4", name="ck_profile_schedule_slots_day"),
        sa.CheckConstraint("time_band BETWEEN 0 AND 3", name="ck_profile_schedule_slots_time"),
    )
    op.create_index(
        "ix_profile_schedule_slots_slot",
        "profile_schedule_slots",
        ["day_of_week", "time_band"],
    )

    # profile_links --------------------------------------------------------
    op.create_table(
        "profile_links",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "profile_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint(
            "url LIKE 'https://%' OR url LIKE 'http://%'",
            name="ck_profile_links_url_scheme",
        ),
    )
    op.create_index("ix_profile_links_profile", "profile_links", ["profile_id"])

    # triggers -------------------------------------------------------------
    _updated_at_trigger("profiles")

    # enable RLS -----------------------------------------------------------
    for tbl in ("profiles", "profile_skills", "profile_schedule_slots", "profile_links"):
        op.execute(sa.text(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY"))

    # policies -------------------------------------------------------------
    # profiles: readable by classmates in the same course (via enrollment),
    # writable only by the profile owner.
    op.execute(
        sa.text(
            """
            CREATE POLICY profiles_read ON profiles FOR SELECT
              USING (
                enrollment_id IN (
                  SELECT e1.id FROM enrollments e1
                  JOIN enrollments e2 ON e1.course_id = e2.course_id
                  WHERE e2.user_id = auth.uid()
                    AND e1.deleted_at IS NULL
                    AND e2.deleted_at IS NULL
                )
              );
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY profiles_write_own ON profiles FOR ALL
              USING (
                enrollment_id IN (
                  SELECT id FROM enrollments
                  WHERE user_id = auth.uid() AND deleted_at IS NULL
                )
              )
              WITH CHECK (
                enrollment_id IN (
                  SELECT id FROM enrollments
                  WHERE user_id = auth.uid() AND deleted_at IS NULL
                )
              );
            """
        )
    )

    # profile_skills: read = same as parent profile; write = own only.
    op.execute(
        sa.text(
            """
            CREATE POLICY profile_skills_read ON profile_skills FOR SELECT
              USING (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e1 ON p.enrollment_id = e1.id
                  JOIN enrollments e2 ON e1.course_id = e2.course_id
                  WHERE e2.user_id = auth.uid()
                    AND e1.deleted_at IS NULL
                    AND e2.deleted_at IS NULL
                )
              );
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY profile_skills_write_own ON profile_skills FOR ALL
              USING (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e ON p.enrollment_id = e.id
                  WHERE e.user_id = auth.uid() AND e.deleted_at IS NULL
                )
              )
              WITH CHECK (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e ON p.enrollment_id = e.id
                  WHERE e.user_id = auth.uid() AND e.deleted_at IS NULL
                )
              );
            """
        )
    )

    # profile_schedule_slots: same read/write pattern.
    op.execute(
        sa.text(
            """
            CREATE POLICY profile_schedule_slots_read ON profile_schedule_slots FOR SELECT
              USING (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e1 ON p.enrollment_id = e1.id
                  JOIN enrollments e2 ON e1.course_id = e2.course_id
                  WHERE e2.user_id = auth.uid()
                    AND e1.deleted_at IS NULL
                    AND e2.deleted_at IS NULL
                )
              );
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY profile_schedule_slots_write_own ON profile_schedule_slots FOR ALL
              USING (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e ON p.enrollment_id = e.id
                  WHERE e.user_id = auth.uid() AND e.deleted_at IS NULL
                )
              )
              WITH CHECK (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e ON p.enrollment_id = e.id
                  WHERE e.user_id = auth.uid() AND e.deleted_at IS NULL
                )
              );
            """
        )
    )

    # profile_links: same.
    op.execute(
        sa.text(
            """
            CREATE POLICY profile_links_read ON profile_links FOR SELECT
              USING (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e1 ON p.enrollment_id = e1.id
                  JOIN enrollments e2 ON e1.course_id = e2.course_id
                  WHERE e2.user_id = auth.uid()
                    AND e1.deleted_at IS NULL
                    AND e2.deleted_at IS NULL
                )
              );
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY profile_links_write_own ON profile_links FOR ALL
              USING (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e ON p.enrollment_id = e.id
                  WHERE e.user_id = auth.uid() AND e.deleted_at IS NULL
                )
              )
              WITH CHECK (
                profile_id IN (
                  SELECT p.id FROM profiles p
                  JOIN enrollments e ON p.enrollment_id = e.id
                  WHERE e.user_id = auth.uid() AND e.deleted_at IS NULL
                )
              );
            """
        )
    )


def downgrade() -> None:
    op.drop_table("profile_links")
    op.drop_table("profile_schedule_slots")
    op.drop_table("profile_skills")
    op.drop_table("profiles")
