"""requests + applications tree

ERD sections 15-18: requests, applications, application_answers,
application_votes.

application_answers carries question_text_snapshot per ADR 0009 section 3
so leaders can edit/archive questions without breaking past answers.

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005"
down_revision: str | Sequence[str] | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # requests -------------------------------------------------------------
    op.create_table(
        "requests",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sender_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "receiver_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("why", sa.Text(), nullable=False),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="request_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("responded_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("decline_reason", sa.Text(), nullable=True),
        sa.Column("decline_note", sa.Text(), nullable=True),
        sa.Column("expires_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.CheckConstraint("sender_user_id <> receiver_user_id", name="ck_requests_self_request"),
    )
    op.create_index(
        "ix_requests_inbox",
        "requests",
        ["receiver_user_id", "status", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_requests_sent",
        "requests",
        ["sender_user_id", "status", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_requests_expire_sweep",
        "requests",
        ["course_id", "status", "expires_at"],
    )
    # Prevent duplicate active requests for the same pair in the same course.
    op.create_index(
        "uq_requests_active_pair",
        "requests",
        ["course_id", "sender_user_id", "receiver_user_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('pending', 'replied')"),
    )

    # applications ---------------------------------------------------------
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "applicant_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(name="application_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("responded_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "responded_by_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_applications_group",
        "applications",
        ["group_id", "status", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_applications_applicant",
        "applications",
        ["applicant_user_id", "status", sa.text("created_at DESC")],
    )
    op.create_index(
        "uq_applications_active",
        "applications",
        ["group_id", "applicant_user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )

    # application_answers --------------------------------------------------
    # Snapshots the question text per ADR 0009 section 3 so leader edits to
    # group_application_questions don't break or relocate prior answers.
    op.create_table(
        "application_answers",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "application_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "question_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("group_application_questions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("question_text_snapshot", sa.Text(), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "uq_application_answers_question",
        "application_answers",
        ["application_id", "question_id"],
        unique=True,
        postgresql_where=sa.text("question_id IS NOT NULL"),
    )

    # application_votes ----------------------------------------------------
    op.create_table(
        "application_votes",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "application_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "voter_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "vote",
            postgresql.ENUM(name="vote_value", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("application_id", "voter_user_id", name="uq_application_votes"),
    )

    # enable RLS -----------------------------------------------------------
    for tbl in ("requests", "applications", "application_answers", "application_votes"):
        op.execute(sa.text(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY"))

    # policies -------------------------------------------------------------

    # requests: sender or receiver can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY requests_read ON requests FOR SELECT
              USING (sender_user_id = auth.uid() OR receiver_user_id = auth.uid());
            """
        )
    )

    # applications: applicant + current members of the group can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY applications_read ON applications FOR SELECT
              USING (
                applicant_user_id = auth.uid()
                OR group_id IN (
                  SELECT group_id FROM group_memberships
                  WHERE user_id = auth.uid() AND left_at IS NULL
                )
              );
            """
        )
    )

    # application_answers: read = same scope as parent application.
    op.execute(
        sa.text(
            """
            CREATE POLICY application_answers_read ON application_answers FOR SELECT
              USING (
                application_id IN (
                  SELECT id FROM applications
                  WHERE applicant_user_id = auth.uid()
                     OR group_id IN (
                       SELECT group_id FROM group_memberships
                       WHERE user_id = auth.uid() AND left_at IS NULL
                     )
                )
              );
            """
        )
    )

    # application_votes: group members read all; users write own only.
    op.execute(
        sa.text(
            """
            CREATE POLICY application_votes_read ON application_votes FOR SELECT
              USING (
                application_id IN (
                  SELECT a.id FROM applications a
                  WHERE a.group_id IN (
                    SELECT group_id FROM group_memberships
                    WHERE user_id = auth.uid() AND left_at IS NULL
                  )
                )
              );
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY application_votes_write_own ON application_votes FOR ALL
              USING (voter_user_id = auth.uid())
              WITH CHECK (voter_user_id = auth.uid());
            """
        )
    )


def downgrade() -> None:
    op.drop_table("application_votes")
    op.drop_table("application_answers")
    op.drop_table("applications")
    op.drop_table("requests")
