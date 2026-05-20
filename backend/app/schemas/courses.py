"""Course metadata response shapes.

Endpoints under ``/api/v1/courses/{id}/*`` need three small read shapes:

* the course header card (CourseSummary lives in ``schemas/auth.py``;
  we re-export so this module is the one-stop import).
* the section list (just code + id — schedule grid + roster picker UX).
* the skill catalog (course-scoped skill picker on profile wizard +
  Discovery filter).

All shapes are read-only.
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel

from app.schemas.auth import CourseSummary

__all__ = ["CourseSkillRead", "CourseSummary", "SectionRead"]


class SectionRead(BaseModel):
    id: UUID
    code: str


class CourseSkillRead(BaseModel):
    id: UUID
    skill_name: str
    display_order: int
