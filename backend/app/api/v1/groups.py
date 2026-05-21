"""Group lifecycle routes.

Group writes flow through the service role (per migration 0004's
"no direct policy needed" comment) — RLS only has SELECT policies
for the groups family. The service layer enforces leader / member
checks against ``group_memberships`` in application code.

Reads under `/courses/{id}/groups` (the Discovery feed) stay in
`app/api/v1/discovery.py` and run under `user_session` — that
endpoint is read-only.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.jwt import CurrentUser, get_current_user
from app.db.admin import admin_session
from app.schemas.groups import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationRead,
    GroupCreate,
    GroupDetailRead,
    GroupUpdate,
)
from app.services import groups as groups_service

router = APIRouter(prefix="/groups", tags=["groups"])

# A separate router for the per-application response endpoints so the URL
# shape (`/applications/{id}/accept`) doesn't collide with `/groups/{id}`.
applications_router = APIRouter(prefix="/applications", tags=["groups"])


def _err(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.post(
    "",
    response_model=GroupDetailRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new forming group",
)
async def create_group(
    payload: GroupCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> GroupDetailRead:
    async with admin_session() as session:
        try:
            return await groups_service.create_group(session, current_user, payload)
        except groups_service.EnrollmentNotFound as exc:
            raise _err(
                status.HTTP_403_FORBIDDEN,
                "ENROLLMENT_NOT_FOUND",
                "Enrollment not found or not active.",
            ) from exc
        except groups_service.AlreadyInGroup as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "ALREADY_IN_GROUP",
                "You're already in another group for this course.",
            ) from exc


@router.get(
    "/{group_id}",
    response_model=GroupDetailRead,
    summary="Get a group's full detail",
)
async def get_group(
    group_id: UUID,
    _current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> GroupDetailRead:
    async with admin_session() as session:
        try:
            return await groups_service.get_group(session, group_id)
        except groups_service.GroupNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "GROUP_NOT_FOUND",
                "Group not found.",
            ) from exc


@router.patch(
    "/{group_id}",
    response_model=GroupDetailRead,
    summary="Update group metadata + optionally replace application questions",
)
async def update_group(
    group_id: UUID,
    payload: GroupUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> GroupDetailRead:
    async with admin_session() as session:
        try:
            return await groups_service.update_group(session, current_user, group_id, payload)
        except groups_service.GroupNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "GROUP_NOT_FOUND",
                "Group not found.",
            ) from exc
        except groups_service.NotALeader as exc:
            raise _err(
                status.HTTP_403_FORBIDDEN,
                "NOT_GROUP_LEADER",
                "Only the group leader can update this group.",
            ) from exc


@router.post(
    "/{group_id}/apply",
    response_model=ApplicationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Apply to join a forming group",
)
async def apply_to_group(
    group_id: UUID,
    payload: ApplicationCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ApplicationRead:
    async with admin_session() as session:
        try:
            return await groups_service.apply_to_group(session, current_user, group_id, payload)
        except groups_service.GroupNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "GROUP_NOT_FOUND",
                "Group not found.",
            ) from exc
        except groups_service.GroupNotRecruiting as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "GROUP_NOT_RECRUITING",
                "This group is not currently accepting applications.",
            ) from exc
        except groups_service.GroupAlreadyConfirmed as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "GROUP_ALREADY_CONFIRMED",
                "This group is past the recruiting stage.",
            ) from exc
        except groups_service.AlreadyInGroup as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "ALREADY_IN_GROUP",
                "You're already a member of this group.",
            ) from exc
        except groups_service.DuplicateApplication as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "DUPLICATE_APPLICATION",
                "You already have a pending application for this group.",
            ) from exc
        except groups_service.InvalidQuestion as exc:
            raise _err(
                status.HTTP_400_BAD_REQUEST,
                "INVALID_QUESTION",
                f"Unknown question id for this group: {exc}",
            ) from exc


@router.get(
    "/{group_id}/applications",
    response_model=ApplicationListResponse,
    summary="List pending + responded applications (leader-only)",
)
async def list_applications(
    group_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ApplicationListResponse:
    async with admin_session() as session:
        try:
            items = await groups_service.list_applications(session, current_user, group_id)
            return ApplicationListResponse(items=items)
        except groups_service.GroupNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "GROUP_NOT_FOUND",
                "Group not found.",
            ) from exc
        except groups_service.NotALeader as exc:
            raise _err(
                status.HTTP_403_FORBIDDEN,
                "NOT_GROUP_LEADER",
                "Only the group leader can list applications.",
            ) from exc


@router.post(
    "/{group_id}/leave",
    response_model=GroupDetailRead,
    summary="Leave the group; transfers leadership or disbands if last leader",
)
async def leave_group(
    group_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> GroupDetailRead:
    async with admin_session() as session:
        try:
            return await groups_service.leave_group(session, current_user, group_id)
        except groups_service.GroupNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "GROUP_NOT_FOUND",
                "Group not found.",
            ) from exc
        except groups_service.NotAMember as exc:
            raise _err(
                status.HTTP_403_FORBIDDEN,
                "NOT_GROUP_MEMBER",
                "You're not a member of this group.",
            ) from exc


@router.post(
    "/{group_id}/confirm",
    response_model=GroupDetailRead,
    summary="Initiate or finalise group confirmation (leader-only)",
)
async def confirm_group(
    group_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> GroupDetailRead:
    async with admin_session() as session:
        try:
            return await groups_service.confirm_group(session, current_user, group_id)
        except groups_service.GroupNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "GROUP_NOT_FOUND",
                "Group not found.",
            ) from exc
        except groups_service.NotALeader as exc:
            raise _err(
                status.HTTP_403_FORBIDDEN,
                "NOT_GROUP_LEADER",
                "Only the group leader can confirm this group.",
            ) from exc


# ---------------------------------------------------------------------------
# Per-application routes (separate prefix so URLs are
# /applications/{id}/accept rather than nested under /groups/{group_id}/...)
# ---------------------------------------------------------------------------


@applications_router.post(
    "/{application_id}/accept",
    response_model=ApplicationRead,
    summary="Accept a pending application (leader-only)",
)
async def accept_application(
    application_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ApplicationRead:
    async with admin_session() as session:
        try:
            return await groups_service.accept_application(session, current_user, application_id)
        except groups_service.ApplicationNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "APPLICATION_NOT_FOUND",
                "Application not found.",
            ) from exc
        except groups_service.GroupNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "GROUP_NOT_FOUND",
                "Group not found.",
            ) from exc
        except groups_service.NotALeader as exc:
            raise _err(
                status.HTTP_403_FORBIDDEN,
                "NOT_GROUP_LEADER",
                "Only the group leader can accept applications.",
            ) from exc
        except groups_service.ApplicationAlreadyResponded as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "APPLICATION_ALREADY_RESPONDED",
                f"Application already {exc!s}.",
            ) from exc
        except groups_service.EnrollmentNotFound as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "APPLICANT_NOT_ENROLLED",
                "The applicant is no longer enrolled in this course.",
            ) from exc


@applications_router.post(
    "/{application_id}/decline",
    response_model=ApplicationRead,
    summary="Decline a pending application (leader-only)",
)
async def decline_application(
    application_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ApplicationRead:
    async with admin_session() as session:
        try:
            return await groups_service.decline_application(session, current_user, application_id)
        except groups_service.ApplicationNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "APPLICATION_NOT_FOUND",
                "Application not found.",
            ) from exc
        except groups_service.GroupNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "GROUP_NOT_FOUND",
                "Group not found.",
            ) from exc
        except groups_service.NotALeader as exc:
            raise _err(
                status.HTTP_403_FORBIDDEN,
                "NOT_GROUP_LEADER",
                "Only the group leader can decline applications.",
            ) from exc
        except groups_service.ApplicationAlreadyResponded as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "APPLICATION_ALREADY_RESPONDED",
                f"Application already {exc!s}.",
            ) from exc
