"""core tables - universities, courses, sections, course_skills, roster_entries, users, enrollments

First batch of domain tables per ERD sections 1-7. Each table is created with its
indexes; RLS policies are added at the end of the migration so cross-table
policy bodies (e.g. users referencing enrollments) don't fail with
"relation does not exist".

RLS template per ADR 0001 + ADR 0009 section 1: every soft-delete table filters
`deleted_at IS NULL` in both the row scope and the enrollments lookup.

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _timestamp_columns(*, with_deleted: bool = False) -> list[sa.Column]:
    """Standard timestamp columns. Most tables have created_at + updated_at;
    soft-delete tables also have deleted_at."""
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
    """Attach a trigger that bumps updated_at on every UPDATE."""
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


def _create_tables() -> None:
    # universities ---------------------------------------------------------
    op.create_table(
        "universities",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("short_name", sa.Text(), nullable=False),
        sa.Column("email_domain", sa.Text(), nullable=True),
        sa.Column("timezone", sa.Text(), nullable=False),
        *_timestamp_columns(),
        sa.UniqueConstraint("short_name", name="uq_universities_short_name"),
    )

    # users ----------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("primary_email", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("default_avatar_url", sa.Text(), nullable=True),
        *_timestamp_columns(with_deleted=True),
    )
    op.create_index(
        "ix_users_primary_email_lower",
        "users",
        [sa.text("lower(primary_email)")],
        unique=True,
    )

    # courses --------------------------------------------------------------
    op.create_table(
        "courses",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "university_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("universities.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("department", sa.Text(), nullable=True),
        sa.Column("semester", sa.Text(), nullable=False),
        sa.Column("invite_code", sa.Text(), nullable=False),
        sa.Column("min_group_size", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("max_group_size", sa.Integer(), nullable=False, server_default="6"),
        sa.Column("deadline_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("timezone", sa.Text(), nullable=False),
        sa.Column(
            "state",
            postgresql.ENUM(name="course_state", create_type=False),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        *_timestamp_columns(with_deleted=True),
        sa.Column("archived_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "university_id", "code", "semester", name="uq_courses_university_code_sem"
        ),
        sa.UniqueConstraint("invite_code", name="uq_courses_invite_code"),
        sa.CheckConstraint(
            "min_group_size >= 2 AND max_group_size >= min_group_size",
            name="ck_courses_group_size",
        ),
    )
    op.create_index("ix_courses_university_state", "courses", ["university_id", "state"])

    # sections -------------------------------------------------------------
    op.create_table(
        "sections",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.Text(), nullable=False),
        *_timestamp_columns(with_deleted=True),
        sa.UniqueConstraint("course_id", "code", name="uq_sections_course_code"),
    )

    # course_skills --------------------------------------------------------
    op.create_table(
        "course_skills",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("skill_name", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "uq_course_skills_course_lower_name",
        "course_skills",
        ["course_id", sa.text("lower(skill_name)")],
        unique=True,
    )

    # roster_entries -------------------------------------------------------
    op.create_table(
        "roster_entries",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "section_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("sections.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "imported_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "imported_by_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("removed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index(
        "uq_roster_entries_course_email_active",
        "roster_entries",
        ["course_id", sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("removed_at IS NULL"),
    )
    op.create_index(
        "ix_roster_entries_unlinked",
        "roster_entries",
        ["course_id"],
        postgresql_where=sa.text("user_id IS NULL AND removed_at IS NULL"),
    )

    # enrollments ----------------------------------------------------------
    op.create_table(
        "enrollments",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
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
            "section_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("sections.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "role",
            postgresql.ENUM(name="enrollment_role", create_type=False),
            nullable=False,
            server_default="student",
        ),
        sa.Column(
            "status",
            postgresql.ENUM(name="enrollment_status", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "joined_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        *_timestamp_columns(with_deleted=True),
    )
    op.create_index(
        "uq_enrollments_user_course_active",
        "enrollments",
        ["user_id", "course_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_enrollments_course_role_status",
        "enrollments",
        ["course_id", "role", "status"],
    )


def _create_triggers() -> None:
    for tbl in ("universities", "users", "courses", "sections", "enrollments"):
        _updated_at_trigger(tbl)

    # Auto-mirror auth.users -> public.users on insert/update.
    # asyncpg doesn't allow multi-statement text() through prepared statements,
    # so each DDL goes in its own op.execute().
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION public.tg_mirror_auth_user()
            RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
            BEGIN
                INSERT INTO public.users (id, primary_email)
                VALUES (NEW.id, NEW.email)
                ON CONFLICT (id) DO UPDATE
                    SET primary_email = EXCLUDED.primary_email,
                        updated_at = now();
                RETURN NEW;
            END;
            $$;
            """
        )
    )
    op.execute(sa.text("DROP TRIGGER IF EXISTS mirror_auth_users ON auth.users"))
    op.execute(
        sa.text(
            """
            CREATE TRIGGER mirror_auth_users
                AFTER INSERT OR UPDATE OF email ON auth.users
                FOR EACH ROW EXECUTE FUNCTION public.tg_mirror_auth_user();
            """
        )
    )


def _enable_rls() -> None:
    for tbl in (
        "universities",
        "users",
        "courses",
        "sections",
        "course_skills",
        "roster_entries",
        "enrollments",
    ):
        op.execute(sa.text(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY"))


def _create_policies() -> None:
    # universities: any authenticated user can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY universities_read ON universities FOR SELECT
              USING (auth.uid() IS NOT NULL);
            """
        )
    )

    # users: read self or classmates in shared (non-deleted) courses.
    op.execute(
        sa.text(
            """
            CREATE POLICY users_read_self_or_classmate ON users FOR SELECT
              USING (
                deleted_at IS NULL
                AND (
                  id = auth.uid()
                  OR id IN (
                    SELECT e2.user_id FROM enrollments e1
                    JOIN enrollments e2 ON e1.course_id = e2.course_id
                    WHERE e1.user_id = auth.uid()
                      AND e1.deleted_at IS NULL
                      AND e2.deleted_at IS NULL
                  )
                )
              );
            """
        )
    )

    # courses: members of the course can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY courses_read ON courses FOR SELECT
              USING (
                deleted_at IS NULL
                AND id IN (
                  SELECT course_id FROM enrollments
                  WHERE user_id = auth.uid() AND deleted_at IS NULL
                )
              );
            """
        )
    )

    # sections: course members can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY sections_read ON sections FOR SELECT
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

    # course_skills: course members can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY course_skills_read ON course_skills FOR SELECT
              USING (
                course_id IN (
                  SELECT course_id FROM enrollments
                  WHERE user_id = auth.uid() AND deleted_at IS NULL
                )
              );
            """
        )
    )

    # roster_entries: TAs / instructors of the course only.
    op.execute(
        sa.text(
            """
            CREATE POLICY roster_entries_read_ta ON roster_entries FOR SELECT
              USING (
                course_id IN (
                  SELECT course_id FROM enrollments
                  WHERE user_id = auth.uid()
                    AND role IN ('ta', 'instructor')
                    AND deleted_at IS NULL
                )
              );
            """
        )
    )

    # enrollments: read own, plus classmates in shared courses.
    op.execute(
        sa.text(
            """
            CREATE POLICY enrollments_read ON enrollments FOR SELECT
              USING (
                deleted_at IS NULL
                AND (
                  user_id = auth.uid()
                  OR course_id IN (
                    SELECT course_id FROM enrollments
                    WHERE user_id = auth.uid() AND deleted_at IS NULL
                  )
                )
              );
            """
        )
    )


def upgrade() -> None:
    # Shared trigger function used by every table's updated_at column.
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
            RETURNS TRIGGER LANGUAGE plpgsql AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$;
            """
        )
    )
    _create_tables()
    _create_triggers()
    _enable_rls()
    _create_policies()


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS mirror_auth_users ON auth.users")
    op.execute("DROP FUNCTION IF EXISTS public.tg_mirror_auth_user()")
    op.drop_table("enrollments")
    op.drop_table("roster_entries")
    op.drop_table("course_skills")
    op.drop_table("sections")
    op.drop_table("courses")
    op.drop_table("users")
    op.drop_table("universities")
    op.execute("DROP FUNCTION IF EXISTS public.tg_set_updated_at()")
