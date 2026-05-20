"""Course metadata routes.

Sibling to ``discovery.py`` — both share the ``/courses`` prefix.
Discovery owns the People + Groups feeds; this module owns the three
header lookups (course detail, sections list, skill catalog) the
profile wizard and Discovery filter bar both consume.

All routes use ``user_session`` so RLS automatically scopes results to
"courses I'm enrolled in". 404 covers both "doesn't exist" and
"filtered by RLS" so we don't leak the existence of other courses.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.db.session import CurrentUserDep, UserSessionDep
from app.schemas.courses import CourseSkillRead, CourseSummary, SectionRead
from app.services import courses as courses_service

router = APIRouter(prefix="/courses", tags=["courses"])


def _err(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.get(
    "/{course_id}",
    response_model=CourseSummary,
    summary="Course header (code, name, deadline, timezone)",
)
async def get_course(
    course_id: UUID,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> CourseSummary:
    try:
        return await courses_service.get_course(db, course_id)
    except courses_service.CourseNotFound as exc:
        raise _err(
            status.HTTP_404_NOT_FOUND,
            "COURSE_NOT_FOUND",
            "Course not found or not visible to you.",
        ) from exc


@router.get(
    "/{course_id}/sections",
    response_model=list[SectionRead],
    summary="List sections in the course",
)
async def list_sections(
    course_id: UUID,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> list[SectionRead]:
    try:
        return await courses_service.list_sections(db, course_id)
    except courses_service.CourseNotFound as exc:
        raise _err(
            status.HTTP_404_NOT_FOUND,
            "COURSE_NOT_FOUND",
            "Course not found or not visible to you.",
        ) from exc


@router.get(
    "/{course_id}/skills",
    response_model=list[CourseSkillRead],
    summary="Course skill catalog (used by profile wizard + Discovery filter)",
)
async def list_skills(
    course_id: UUID,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> list[CourseSkillRead]:
    try:
        return await courses_service.list_skills(db, course_id)
    except courses_service.CourseNotFound as exc:
        raise _err(
            status.HTTP_404_NOT_FOUND,
            "COURSE_NOT_FOUND",
            "Course not found or not visible to you.",
        ) from exc
