"""Auth-flow routes: precheck (public) and bootstrap (authenticated).

See ``../../../07-auth-flows.md`` for the end-to-end flow.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.jwt import CurrentUser, get_current_user
from app.db.admin import admin_session
from app.schemas.auth import BootstrapResponse, PrecheckRequest, PrecheckResponse
from app.services import auth_bootstrap

router = APIRouter(prefix="/auth", tags=["auth"])


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
    summary="Bind the authenticated user to their roster entries",
    description=(
        "Called after Supabase Auth magic-link completion. Idempotent: links "
        "roster_entries to the user, creates any missing enrollments, and "
        "returns the user's current course list. Must be called once on first "
        "login; safe to call on every login."
    ),
)
async def bootstrap(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> BootstrapResponse:
    # admin_session owns the transaction; we don't commit explicitly.
    async with admin_session() as session:
        try:
            return await auth_bootstrap.bootstrap(session, current_user)
        except auth_bootstrap.RosterEmailNotFound as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "ROSTER_EMAIL_NOT_FOUND",
                    "message": (
                        "Your email was not found in any active course's roster. "
                        "Contact your TA to be added."
                    ),
                    "details": {"email": str(exc)},
                },
            ) from exc
