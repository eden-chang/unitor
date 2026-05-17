"""Discovery board read endpoints.

Two endpoints, both course-scoped, both authenticated:

* ``GET /api/v1/courses/{course_id}/students`` -- the People view feed.
* ``GET /api/v1/courses/{course_id}/groups``   -- the Groups view feed.

Both use ``user_session`` so RLS already filters down to "rows in
courses I'm enrolled in". The route layer adds the business filters
(section, skill, search, recruiting, state) on top of that.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.db.session import CurrentUserDep, UserSessionDep
from app.schemas.discovery import (
    GroupListResponse,
    StudentListResponse,
)
from app.services import discovery as discovery_service

router = APIRouter(prefix="/courses", tags=["discovery"])


@router.get(
    "/{course_id}/students",
    response_model=StudentListResponse,
    summary="List students for the Discovery board (People view)",
    description=(
        "Returns classmates in this course, with their public profile "
        "summary if they've completed onboarding. Excludes the caller. "
        "Compatibility scoring is a separate concern -- see the matching "
        "endpoint (task F) for Best-Match sort."
    ),
)
async def list_students(
    course_id: UUID,
    db: UserSessionDep,
    user: CurrentUserDep,
    section_id: UUID | None = Query(default=None),
    skill_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None, max_length=80),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> StudentListResponse:
    return await discovery_service.list_students(
        db,
        course_id=course_id,
        me_user_id=UUID(user.id),
        section_id=section_id,
        skill_id=skill_id,
        search=search,
        cursor=cursor,
        limit=limit,
    )


@router.get(
    "/{course_id}/groups",
    response_model=GroupListResponse,
    summary="List groups for the Discovery board (Groups view)",
    description=(
        "Returns groups in this course with their members and application "
        "questions. By default returns all non-disbanded groups; use "
        "``recruiting_only=true`` to limit to groups listed as recruiting."
    ),
)
async def list_groups(
    course_id: UUID,
    db: UserSessionDep,
    _user: CurrentUserDep,
    section_id: UUID | None = Query(default=None),
    recruiting_only: bool = Query(default=False),
    state: list[str] | None = Query(default=None, description="Filter by group state."),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> GroupListResponse:
    return await discovery_service.list_groups(
        db,
        course_id=course_id,
        section_id=section_id,
        recruiting_only=recruiting_only,
        states=state,
        cursor=cursor,
        limit=limit,
    )
