"""Profile CRUD routes.

All routes use ``user_session`` so RLS enforces "own profile only" at
the database layer. The session context manager owns the transaction --
**do not call ``await db.commit()`` here** (see ``app/db/session.py``
for why). The route only maps domain exceptions to API error codes
per ADR 0008 section 3.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.db.session import CurrentUserDep, UserSessionDep
from app.schemas.profile import (
    CompletionResponse,
    ProfileCreate,
    ProfileRead,
    ProfileUpdate,
    ScheduleReplace,
    ScheduleSlot,
    SkillRead,
    SkillsReplace,
)
from app.services import profile as profile_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _err(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.post(
    "",
    response_model=ProfileRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create my profile for an enrollment",
    description=(
        "Called once at the end of the onboarding wizard (Prof0..Prof3). "
        "Use PATCH /profiles/{id} for subsequent edits."
    ),
)
async def create_profile(
    payload: ProfileCreate,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> ProfileRead:
    try:
        return await profile_service.create_profile(db, payload)
    except profile_service.ProfileAlreadyExists as exc:
        raise _err(status.HTTP_409_CONFLICT, "PROFILE_ALREADY_EXISTS", str(exc)) from exc
    except profile_service.EnrollmentNotFound as exc:
        raise _err(status.HTTP_403_FORBIDDEN, "ENROLLMENT_NOT_FOUND", str(exc)) from exc
    except profile_service.InvalidSkill as exc:
        raise _err(
            status.HTTP_400_BAD_REQUEST,
            "INVALID_SKILL_FOR_COURSE",
            f"skill id(s) not in this course's catalog: {exc}",
        ) from exc


@router.get(
    "/me/{course_id}",
    response_model=ProfileRead,
    summary="Get my profile for this course",
)
async def get_my_profile_for_course(
    course_id: UUID,
    db: UserSessionDep,
    user: CurrentUserDep,
) -> ProfileRead:
    profile = await profile_service.get_my_profile_for_course(
        db, user_id=UUID(user.id), course_id=course_id
    )
    if profile is None:
        raise _err(
            status.HTTP_404_NOT_FOUND,
            "PROFILE_NOT_FOUND",
            "No profile yet for this course.",
        )
    return profile


@router.get(
    "/{profile_id}",
    response_model=ProfileRead,
    summary="Get a profile by id",
    description=(
        "Readable by anyone enrolled in the same course (RLS-enforced). "
        "Use the /me/{course_id} variant when fetching your own."
    ),
)
async def get_profile(
    profile_id: UUID,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> ProfileRead:
    try:
        return await profile_service.get_profile_by_id(db, profile_id)
    except profile_service.ProfileNotFound as exc:
        raise _err(status.HTTP_404_NOT_FOUND, "PROFILE_NOT_FOUND", str(exc)) from exc


@router.patch(
    "/{profile_id}",
    response_model=ProfileRead,
    summary="Update profile scalar fields",
    description=(
        "Partial update of the profile row's own columns. For skills, "
        "schedule, or links use the dedicated /skills, /schedule, /links "
        "endpoints -- each replaces the full set atomically."
    ),
)
async def update_profile(
    profile_id: UUID,
    payload: ProfileUpdate,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> ProfileRead:
    try:
        return await profile_service.update_profile(db, profile_id, payload)
    except profile_service.ProfileNotFound as exc:
        raise _err(status.HTTP_404_NOT_FOUND, "PROFILE_NOT_FOUND", str(exc)) from exc


@router.put(
    "/{profile_id}/skills",
    response_model=list[SkillRead],
    summary="Replace the profile's skill list",
)
async def replace_skills(
    profile_id: UUID,
    payload: SkillsReplace,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> list[SkillRead]:
    try:
        return await profile_service.replace_skills(db, profile_id, payload)
    except profile_service.ProfileNotFound as exc:
        raise _err(status.HTTP_404_NOT_FOUND, "PROFILE_NOT_FOUND", str(exc)) from exc
    except profile_service.InvalidSkill as exc:
        raise _err(
            status.HTTP_400_BAD_REQUEST,
            "INVALID_SKILL_FOR_COURSE",
            f"skill id(s) not in this course's catalog: {exc}",
        ) from exc


@router.put(
    "/{profile_id}/schedule",
    response_model=list[ScheduleSlot],
    summary="Replace the profile's schedule slots",
)
async def replace_schedule(
    profile_id: UUID,
    payload: ScheduleReplace,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> list[ScheduleSlot]:
    try:
        return await profile_service.replace_schedule(db, profile_id, payload)
    except profile_service.ProfileNotFound as exc:
        raise _err(status.HTTP_404_NOT_FOUND, "PROFILE_NOT_FOUND", str(exc)) from exc


@router.post(
    "/{profile_id}/complete",
    response_model=CompletionResponse,
    summary="Check whether the profile is ready for matching",
    description=(
        "Doesn't change the profile structurally -- it just reports which "
        "completion criteria still need attention and bumps last_active_at."
    ),
)
async def check_completion(
    profile_id: UUID,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> CompletionResponse:
    try:
        return await profile_service.check_completion(db, profile_id)
    except profile_service.ProfileNotFound as exc:
        raise _err(status.HTTP_404_NOT_FOUND, "PROFILE_NOT_FOUND", str(exc)) from exc


@router.delete(
    "/{profile_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete my profile",
    description=(
        "Hard-deletes the profile and cascades to skills, schedule slots, "
        "and links. The enrollment remains (use the dedicated leave-course "
        "endpoint for that). RLS limits this to the owner."
    ),
)
async def delete_profile(
    profile_id: UUID,
    db: UserSessionDep,
    _user: CurrentUserDep,
) -> None:
    try:
        await profile_service.delete_profile(db, profile_id)
    except profile_service.ProfileNotFound as exc:
        raise _err(status.HTTP_404_NOT_FOUND, "PROFILE_NOT_FOUND", str(exc)) from exc
