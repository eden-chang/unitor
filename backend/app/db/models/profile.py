"""Profile ORM models.

Per ADR 0007 section 1, profiles are scoped per enrollment (one profile
per user per course). Skills come from the per-course ``course_skills``
catalog with a per-skill proficiency level. Schedule is a sparse set of
(weekday, time-band) cells. Links are optional bio additions.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, SmallInteger, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base

_PROFICIENCY = SAEnum(
    "beginner",
    "intermediate",
    "proficient",
    "expert",
    name="proficiency_level",
    create_type=False,
)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    enrollment_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_frequency: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_style: Mapped[str | None] = mapped_column(Text, nullable=True)
    comm_tool: Mapped[str | None] = mapped_column(Text, nullable=True)
    comm_handle: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    schedule_flexible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_active_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)


class ProfileSkill(Base):
    __tablename__ = "profile_skills"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    profile_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_skill_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("course_skills.id", ondelete="CASCADE"),
        nullable=False,
    )
    proficiency: Mapped[str] = mapped_column(_PROFICIENCY, nullable=False)


class ProfileScheduleSlot(Base):
    """Composite PK ``(profile_id, day_of_week, time_band)``.

    A row's presence means the user is available at that slot. Absence
    means unavailable.
    """

    __tablename__ = "profile_schedule_slots"

    profile_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    day_of_week: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    time_band: Mapped[int] = mapped_column(SmallInteger, primary_key=True)


class ProfileLink(Base):
    __tablename__ = "profile_links"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    profile_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
