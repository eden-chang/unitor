"""Tenancy ORM models: University, Course, Section, CourseSkill."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base

# Postgres-side enum (created in migration 0001). create_type=False tells
# SQLAlchemy not to issue CREATE TYPE; it only attaches the type info so
# WHERE clauses cast literals correctly.
_COURSE_STATE = SAEnum("draft", "active", "archived", name="course_state", create_type=False)


class University(Base):
    __tablename__ = "universities"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    short_name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    email_domain: Mapped[str | None] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    university_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("universities.id"), nullable=False
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    department: Mapped[str | None] = mapped_column(Text, nullable=True)
    semester: Mapped[str] = mapped_column(Text, nullable=False)
    invite_code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    min_group_size: Mapped[int] = mapped_column(Integer, nullable=False)
    max_group_size: Mapped[int] = mapped_column(Integer, nullable=False)
    deadline_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(_COURSE_STATE, nullable=False)
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    course_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)


class CourseSkill(Base):
    __tablename__ = "course_skills"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    course_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    skill_name: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
