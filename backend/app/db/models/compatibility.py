"""Compatibility cache ORM model.

Mirrors migration 0007 ``compatibility_cache``. Composite PK is
``(viewer_user_id, target_user_id, course_id)``.

The cache is populated lazily by ``app/services/compatibility.py``. Rows
whose ``computed_at IS NULL`` or whose ``algorithm_version`` doesn't
match the current code constant are treated as stale on read and
recomputed in place. Invalidation on profile / schedule / skill changes
runs as Postgres triggers (migration 0010).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, SmallInteger
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TEXT, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base


class CompatibilityCache(Base):
    __tablename__ = "compatibility_cache"

    viewer_user_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    target_user_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    course_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        primary_key=True,
    )
    algorithm_version: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    schedule_score: Mapped[int] = mapped_column(Integer, nullable=False)
    skill_score: Mapped[int] = mapped_column(Integer, nullable=False)
    work_style_score: Mapped[int] = mapped_column(Integer, nullable=False)
    schedule_overlap_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    reasons: Mapped[list[str]] = mapped_column(ARRAY(TEXT()), nullable=False)
    warnings: Mapped[list[str]] = mapped_column(ARRAY(TEXT()), nullable=False)
    skill_complementarity: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    computed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
