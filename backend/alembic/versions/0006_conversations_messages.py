"""conversations + conversation_participants + messages (partitioned) + message_reactions (co-partitioned)

ERD sections 19-22. Messages are RANGE-partitioned monthly by created_at via
pg_partman; message_reactions are co-partitioned by the same monthly key so
partition drops are atomic across both tables (ADR 0009 section 4).

direct_conversation_pairs auxiliary table is gone per ADR 0009 section 12 -
uniqueness for direct chats is enforced inline via (participant_a_id,
participant_b_id) + a partial unique index.

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006"
down_revision: str | Sequence[str] | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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
    # ------------------------------------------------------------------
    # conversations  (not partitioned; one row per chat)
    # ------------------------------------------------------------------
    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "type",
            postgresql.ENUM(name="conversation_type", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "participant_a_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "participant_b_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("last_message_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
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
        sa.CheckConstraint(
            "(type = 'direct' AND group_id IS NULL"
            " AND participant_a_id IS NOT NULL"
            " AND participant_b_id IS NOT NULL"
            " AND participant_a_id < participant_b_id)"
            " OR (type = 'group' AND group_id IS NOT NULL"
            " AND participant_a_id IS NULL"
            " AND participant_b_id IS NULL)",
            name="ck_conversations_type_shape",
        ),
    )
    op.create_index("ix_conversations_course_type", "conversations", ["course_id", "type"])
    op.create_index(
        "ix_conversations_group",
        "conversations",
        ["group_id"],
        postgresql_where=sa.text("group_id IS NOT NULL"),
    )
    op.create_index(
        "uq_conversations_direct_pair",
        "conversations",
        ["course_id", "participant_a_id", "participant_b_id"],
        unique=True,
        postgresql_where=sa.text("type = 'direct'"),
    )
    _updated_at_trigger("conversations")

    # ------------------------------------------------------------------
    # conversation_participants  (composite PK; tracks unread + left)
    # ------------------------------------------------------------------
    op.create_table(
        "conversation_participants",
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "joined_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_read_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("unread_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("left_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("conversation_id", "user_id", name="pk_conversation_participants"),
    )
    op.create_index(
        "ix_conversation_participants_active",
        "conversation_participants",
        ["user_id"],
        postgresql_where=sa.text("left_at IS NULL"),
    )

    # ------------------------------------------------------------------
    # messages  (PARTITIONED by created_at, monthly via pg_partman)
    # ------------------------------------------------------------------
    # Composite PK (id, created_at) is required by Postgres for the FK
    # target from message_reactions and for native partitioning to allow
    # both keys to participate in routing.
    op.execute(
        sa.text(
            """
            CREATE TABLE messages (
                id uuid NOT NULL,
                conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                body text NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                edited_at timestamptz,
                deleted_at timestamptz,
                PRIMARY KEY (id, created_at),
                CONSTRAINT ck_messages_body_len CHECK (char_length(body) <= 4000)
            ) PARTITION BY RANGE (created_at);
            """
        )
    )
    op.create_index(
        "ix_messages_conv_created",
        "messages",
        ["conversation_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_messages_sender_created",
        "messages",
        ["sender_user_id", sa.text("created_at DESC")],
    )

    # ------------------------------------------------------------------
    # message_reactions  (CO-PARTITIONED by message_created_at, monthly)
    # ------------------------------------------------------------------
    op.execute(
        sa.text(
            """
            CREATE TABLE message_reactions (
                id uuid NOT NULL,
                message_id uuid NOT NULL,
                message_created_at timestamptz NOT NULL,
                user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reaction_type reaction_type NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                PRIMARY KEY (id, message_created_at),
                FOREIGN KEY (message_id, message_created_at)
                  REFERENCES messages(id, created_at) ON DELETE CASCADE
            ) PARTITION BY RANGE (message_created_at);
            """
        )
    )
    # Postgres requires partition-key columns in unique indexes on
    # partitioned tables. message_created_at is functionally determined
    # by message_id (a message never moves partitions), so the index is
    # still effectively "one reaction per (message, user)".
    op.create_index(
        "uq_message_reactions_per_user",
        "message_reactions",
        ["message_id", "user_id", "message_created_at"],
        unique=True,
    )

    # ------------------------------------------------------------------
    # pg_partman: enroll messages + reactions for monthly auto-management
    # ------------------------------------------------------------------
    # On Supabase, pg_partman lives in the public schema (verified by
    # querying pg_extension). create_parent has many positional args; we
    # call only the first three plus p_premake.
    op.execute(
        sa.text(
            """
            SELECT public.create_parent(
                p_parent_table := 'public.messages',
                p_control := 'created_at',
                p_interval := '1 month',
                p_premake := 4
            );
            """
        )
    )
    op.execute(
        sa.text(
            """
            SELECT public.create_parent(
                p_parent_table := 'public.message_reactions',
                p_control := 'message_created_at',
                p_interval := '1 month',
                p_premake := 4
            );
            """
        )
    )

    # ------------------------------------------------------------------
    # RLS (applies through partition hierarchy in PG14+)
    # ------------------------------------------------------------------
    for tbl in (
        "conversations",
        "conversation_participants",
        "messages",
        "message_reactions",
    ):
        op.execute(sa.text(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY"))

    # conversations: a current participant can read.
    op.execute(
        sa.text(
            """
            CREATE POLICY conversations_read ON conversations FOR SELECT
              USING (
                id IN (
                  SELECT conversation_id FROM conversation_participants
                  WHERE user_id = auth.uid() AND left_at IS NULL
                )
              );
            """
        )
    )

    # conversation_participants: own rows.
    op.execute(
        sa.text(
            """
            CREATE POLICY conversation_participants_read_own ON conversation_participants FOR SELECT
              USING (user_id = auth.uid());
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY conversation_participants_write_own ON conversation_participants
              FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
            """
        )
    )

    # messages: a current (non-left) participant of the conversation.
    op.execute(
        sa.text(
            """
            CREATE POLICY messages_read ON messages FOR SELECT
              USING (
                conversation_id IN (
                  SELECT conversation_id FROM conversation_participants
                  WHERE user_id = auth.uid() AND left_at IS NULL
                )
              );
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY messages_insert ON messages FOR INSERT
              WITH CHECK (
                sender_user_id = auth.uid()
                AND conversation_id IN (
                  SELECT conversation_id FROM conversation_participants
                  WHERE user_id = auth.uid() AND left_at IS NULL
                )
              );
            """
        )
    )

    # message_reactions: read = conversation participant; write = own only.
    op.execute(
        sa.text(
            """
            CREATE POLICY message_reactions_read ON message_reactions FOR SELECT
              USING (
                message_id IN (
                  SELECT m.id FROM messages m
                  WHERE m.conversation_id IN (
                    SELECT conversation_id FROM conversation_participants
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
            CREATE POLICY message_reactions_write_own ON message_reactions FOR ALL
              USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());
            """
        )
    )


def downgrade() -> None:
    # Unregister pg_partman tracking first; otherwise create_parent's part_config
    # rows linger.
    op.execute(
        sa.text(
            "DELETE FROM partman.part_config WHERE parent_table IN ('public.messages', 'public.message_reactions');"
        )
    )
    op.execute(sa.text("DROP TABLE IF EXISTS message_reactions CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS messages CASCADE"))
    op.drop_table("conversation_participants")
    op.drop_table("conversations")
