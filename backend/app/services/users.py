"""User CRUD for the authenticated caller.

Today the only mutable surface on ``public.users`` is ``display_name``.
Identity-bearing fields (``primary_email``) come from Supabase Auth and
are not editable here.

RLS handles the "you can only update your own row" check (see migration
0011). The service just performs the UPDATE and returns the fresh row.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.schemas.auth import UserRead


class UserNotFound(Exception):
    """Caller's ``public.users`` row was not found.

    Should never happen in practice: the row is mirrored from
    ``auth.users`` by trigger and re-created defensively by
    :func:`app.services.auth_bootstrap.bootstrap`. Surfaced as 404 only
    so the route doesn't return a Pydantic-validation 500.
    """


async def update_me(
    session: AsyncSession,
    *,
    user_id: UUID,
    display_name: str,
) -> UserRead:
    """Update the caller's ``display_name`` and return the fresh row."""
    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or user.deleted_at is not None:
        raise UserNotFound(str(user_id))

    user.display_name = display_name
    user.updated_at = datetime.now(UTC)
    await session.flush()

    return UserRead(
        id=user.id,
        primary_email=user.primary_email,
        display_name=user.display_name,
        default_avatar_url=user.default_avatar_url,
    )
