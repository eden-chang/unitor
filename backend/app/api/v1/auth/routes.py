"""Auth-flow routes: precheck (public), bootstrap and join (authenticated).

See ``../../../07-auth-flows.md`` for the end-to-end flow.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.jwt import CurrentUser, get_current_user
from app.db.admin import admin_session
from app.schemas.auth import (
    BootstrapResponse,
    EnrollmentRead,
    JoinRequest,
    PrecheckRequest,
    PrecheckResponse,
)
from app.services import auth_bootstrap, auth_join

router = APIRouter(prefix="/auth", tags=["auth"])


def _err(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.post(
    "/precheck",
    response_model=PrecheckResponse,
    summary="Check whether an email is on any active course's roster",
    description=(
        "Public endpoint. Returns a boolean + count only — no course names "
        "— so unauthenticated probing leaks the minimum information needed "
        "for signup UX. Frontend uses this to decide whether to send the "
        "magic-link email or show 'contact your TA'."
    ),
)
async def precheck(body: PrecheckRequest) -> PrecheckResponse:
    async with admin_session() as session:
        return await auth_bootstrap.precheck(session, body.email)


@router.post(
    "/bootstrap",
    response_model=BootstrapResponse,
    summary="Confirm the authenticated user and return their enrollments",
    description=(
        "Called after Supabase Auth magic-link completion. Idempotent: "
        "ensures the public.users row exists, links any matching "
        "roster_entries (without enrolling), and returns the user's "
        "current course list. Safe to call on every login. New "
        "enrollments require POST /api/v1/auth/join."
    ),
)
async def bootstrap(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> BootstrapResponse:
    # admin_session owns the transaction; we don't commit explicitly.
    async with admin_session() as session:
        try:
            return await auth_bootstrap.bootstrap(session, current_user)
        except auth_bootstrap.MissingEmailClaim as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "AUTH_REQUIRED",
                    "message": "Token did not include an email claim.",
                },
            ) from exc


@router.post(
    "/join",
    response_model=EnrollmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Join a course using its invite code",
    description=(
        "Authenticated. Validates the invite code, confirms the caller's "
        "email is on that course's roster, and creates a single "
        "enrollment using the TA-assigned section. Errors: 404 "
        "INVITE_CODE_NOT_FOUND, 403 NOT_IN_ROSTER, 409 ALREADY_ENROLLED."
    ),
)
async def join(
    body: JoinRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> EnrollmentRead:
    async with admin_session() as session:
        try:
            return await auth_join.join(session, current_user, body.invite_code)
        except auth_join.InviteCodeNotFound as exc:
            raise _err(
                status.HTTP_404_NOT_FOUND,
                "INVITE_CODE_NOT_FOUND",
                "No active course matches that invite code.",
            ) from exc
        except auth_join.NotInRoster as exc:
            raise _err(
                status.HTTP_403_FORBIDDEN,
                "NOT_IN_ROSTER",
                "Your email is not on this course's roster. Contact your TA.",
            ) from exc
        except auth_join.AlreadyEnrolled as exc:
            raise _err(
                status.HTTP_409_CONFLICT,
                "ALREADY_ENROLLED",
                "You are already enrolled in this course.",
            ) from exc
