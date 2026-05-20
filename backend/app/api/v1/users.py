"""User self-service routes.

Today only ``PATCH /me`` is exposed — it updates ``display_name`` so the
profile wizard's "step 0 / name" page can persist edits to the value
that came in from Supabase signup. Other identity fields stay
read-only.

Runs under ``user_session`` so RLS (migration 0011, ``users_update_self``)
enforces the "own row only" check at the database.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.db.session import CurrentUserDep, UserSessionDep
from app.schemas.auth import UserRead, UserUpdateRequest
from app.services import users as users_service

router = APIRouter(prefix="/users", tags=["users"])


def _err(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.patch(
    "/me",
    response_model=UserRead,
    summary="Update my user record",
    description=(
        "Authenticated. Updates ``display_name`` on the caller's "
        "public.users row. RLS enforces own-row write."
    ),
)
async def update_me(
    payload: UserUpdateRequest,
    db: UserSessionDep,
    user: CurrentUserDep,
) -> UserRead:
    try:
        return await users_service.update_me(
            db,
            user_id=UUID(user.id),
            display_name=payload.display_name,
        )
    except users_service.UserNotFound as exc:
        raise _err(
            status.HTTP_404_NOT_FOUND,
            "USER_NOT_FOUND",
            "Your user record was not found. Try signing out and back in.",
        ) from exc
