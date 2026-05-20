"""Course metadata reads.

Three tiny read endpoints share this module. Each one is a single
SELECT under ``user_session`` so RLS already enforces "course you're
enrolled in" — there's no application-layer authorization to add.

Errors:

* :class:`CourseNotFound` — id doesn't exist OR RLS filtered it out
  (the caller isn't in the course). We don't distinguish; surfacing 404
  in both cases avoids leaking which course ids exist.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Course, CourseSkill, Section
from app.schemas.courses import CourseSkillRead, CourseSummary, SectionRead


class CourseNotFound(Exception):
    """No course with this id is visible to the caller."""


async def get_course(session: AsyncSession, course_id: UUID) -> CourseSummary:
    stmt = select(Course).where(Course.id == course_id).where(Course.deleted_at.is_(None))
    course = (await session.execute(stmt)).scalar_one_or_none()
    if course is None:
        raise CourseNotFound(str(course_id))
    return CourseSummary(
        id=course.id,
        code=course.code,
        name=course.name,
        semester=course.semester,
        timezone=course.timezone,
        deadline_at=course.deadline_at,
    )


async def list_sections(session: AsyncSession, course_id: UUID) -> list[SectionRead]:
    """Return non-deleted sections, ordered by code."""
    # Confirm the course exists for the caller; surfaces 404 (RLS) cleanly
    # instead of returning an empty list when the course is invisible.
    await get_course(session, course_id)

    stmt = (
        select(Section)
        .where(Section.course_id == course_id)
        .where(Section.deleted_at.is_(None))
        .order_by(Section.code.asc())
    )
    return [
        SectionRead(id=row.id, code=row.code) for row in (await session.execute(stmt)).scalars()
    ]


async def list_skills(session: AsyncSession, course_id: UUID) -> list[CourseSkillRead]:
    """Return the course's skill catalog ordered by display_order."""
    await get_course(session, course_id)

    stmt = (
        select(CourseSkill)
        .where(CourseSkill.course_id == course_id)
        .order_by(CourseSkill.display_order.asc(), CourseSkill.skill_name.asc())
    )
    return [
        CourseSkillRead(
            id=row.id,
            skill_name=row.skill_name,
            display_order=row.display_order,
        )
        for row in (await session.execute(stmt)).scalars()
    ]
