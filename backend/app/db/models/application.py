"""Application + answer + vote ORM models.

Mirrors migration 0005. An ``application`` is a student's request to
join a forming group, optionally with one ``application_answer`` per
``group_application_question``. Group leaders accept / decline via the
``status`` column.

``request`` covers the orthogonal "student → student" group request
flow (one student inviting another to start a group). It shares
``request_status`` enum semantics but is a separate table.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base

_REQUEST_STATUS = SAEnum(
    "pending",
    "replied",
    "accepted",
    "declined",
    "withdrawn",
    "expired",
    name="request_status",
    create_type=False,
)
_APPLICATION_STATUS = SAEnum(
    "pending",
    "accepted",
    "declined",
    "withdrawn",
    name="application_status",
    create_type=False,
)
_VOTE_VALUE = SAEnum("up", "down", name="vote_value", create_type=False)


class Request(Base):
    """Student-to-student "join my (potential) group" invitation."""

    __tablename__ = "requests"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    course_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    sender_user_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    receiver_user_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    why: Mapped[str] = mapped_column(Text, nullable=False)
    question: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(_REQUEST_STATUS, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    decline_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decline_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)


class Application(Base):
    """A student's request to join an existing forming group."""

    __tablename__ = "applications"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    course_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    group_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("groups.id"), nullable=False
    )
    applicant_user_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(_APPLICATION_STATUS, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    responded_by_user_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class ApplicationAnswer(Base):
    """One answer per (application, group_application_question).

    Carries a ``question_text_snapshot`` so leader edits to the parent
    question don't relocate or break a past answer (ADR 0009 §3).
    """

    __tablename__ = "application_answers"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    application_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("applications.id"), nullable=False
    )
    question_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("group_application_questions.id"),
        nullable=True,
    )
    question_text_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)


class ApplicationVote(Base):
    """Group member's vote on a pending application."""

    __tablename__ = "application_votes"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    application_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("applications.id"), nullable=False
    )
    voter_user_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    vote: Mapped[str] = mapped_column(_VOTE_VALUE, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
