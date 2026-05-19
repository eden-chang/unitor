"""Compatibility scoring route.

Single endpoint: ``POST /api/v1/compatibility/batch``. The frontend calls
this with a list of classmate user-ids visible on the Discovery board;
the response is keyed by ``target_user_id``. The matcher reads/writes
``compatibility_cache`` under ``user_session`` (viewer-own RLS policy).

See ``.docs/08-matching-spec.md`` for the algorithm and
``app/services/compatibility.py`` for the implementation.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.db.session import CurrentUserDep, UserSessionDep
from app.schemas.compatibility import (
    CompatibilityBatchRequest,
    CompatibilityBatchResponse,
)
from app.services import compatibility as compatibility_service

router = APIRouter(prefix="/compatibility", tags=["compatibility"])


def _err(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.post(
    "/batch",
    response_model=CompatibilityBatchResponse,
    summary="Score compatibility for a batch of classmates",
    description=(
        "Returns one ``CompatibilityResult`` per ``target_user_id`` whose "
        "profile is complete; targets without a usable profile are listed "
        "in ``skipped``. Results are cached in ``compatibility_cache`` and "
        "served from there until the underlying profile / schedule / "
        "skills change (see migration 0010 triggers)."
    ),
)
async def compatibility_batch(
    payload: CompatibilityBatchRequest,
    db: UserSessionDep,
    user: CurrentUserDep,
) -> CompatibilityBatchResponse:
    try:
        return await compatibility_service.batch_compatibility(
            db,
            viewer_user_id=UUID(user.id),
            course_id=payload.course_id,
            target_user_ids=payload.target_user_ids,
        )
    except compatibility_service.ViewerProfileIncomplete as exc:
        raise _err(
            status.HTTP_400_BAD_REQUEST,
            "PROFILE_INCOMPLETE",
            "Complete your profile (bio + at least 2 skills) before viewing matches.",
        ) from exc
