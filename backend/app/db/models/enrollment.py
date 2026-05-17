"""Roster and enrollment ORM models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base

_ENROLLMENT_ROLE = SAEnum("student", "ta", "instructor", name="enrollment_role", create_type=False)
_ENROLLMENT_STATUS = SAEnum(
    "active", "dropped", "completed", name="enrollment_status", create_type=False
)


class RosterEntry(Base):
    """The TA's claim that a given email belongs in this course.

    Bound to a real ``users`` row when the student signs up.
    """

    __tablename__ = "roster_entries"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    course_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    section_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("sections.id"), nullable=True
    )
    email: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    imported_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    removed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)


class Enrollment(Base):
    """A user's participation in a course."""

    __tablename__ = "enrollments"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    course_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    section_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("sections.id"), nullable=True
    )
    role: Mapped[str] = mapped_column(_ENROLLMENT_ROLE, nullable=False)
    status: Mapped[str] = mapped_column(_ENROLLMENT_STATUS, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
