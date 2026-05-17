"""Group, group_memberships, group_application_questions ORM models.

Mirrors migration 0004. Per ADR 0007 section 5 the leader is identified
by a row in ``group_memberships`` with ``role = 'leader'`` and
``left_at IS NULL``; the partial unique index in the migration enforces
at most one such row per group.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base

_GROUP_STATE = SAEnum(
    "forming",
    "confirming",
    "confirmed",
    "disbanded",
    name="group_state",
    create_type=False,
)
_GROUP_MEMBER_ROLE = SAEnum("leader", "member", name="group_member_role", create_type=False)


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    course_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[str] = mapped_column(_GROUP_STATE, nullable=False)
    recruiting: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    confirmation_initiated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    confirmation_deadline_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)


class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    group_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("groups.id"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    enrollment_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("enrollments.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(_GROUP_MEMBER_ROLE, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    left_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)


class GroupApplicationQuestion(Base):
    __tablename__ = "group_application_questions"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    group_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("groups.id"), nullable=False
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
