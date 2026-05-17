"""Supabase JWT verification.

This is the *only* module that parses bearer tokens. Every endpoint that
needs the current user takes the ``get_current_user`` dependency.

Per ADR 0009 §14, we support a 24-hour rotation window: ``SUPABASE_JWT_SECRET``
holds the active secret, and ``SUPABASE_JWT_SECRET_PREVIOUS`` (optional)
holds the prior secret. Tokens signed with either will verify during the
window. Once rotation is complete the previous env var is removed.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Header, HTTPException, status

from app.config import get_settings


@dataclass(frozen=True)
class CurrentUser:
    """Authenticated user identity derived from the verified JWT.

    Carries only what's safe to pass around: the user id, the email claim,
    and the raw claim subset we'll forward into Postgres for RLS via
    ``set_config('request.jwt.claims', …, true)``.
    """

    id: str
    email: str | None
    jwt_claims_subset: dict[str, Any]


def _decode_with(secret: str, token: str) -> dict[str, Any]:
    return jwt.decode(  # type: ignore[no-any-return]
        token,
        secret,
        algorithms=["HS256"],
        audience="authenticated",
    )


def _verify_token(token: str) -> dict[str, Any]:
    """Verify against current secret, falling back to previous if rotating."""
    settings = get_settings()
    try:
        return _decode_with(settings.SUPABASE_JWT_SECRET, token)
    except jwt.PyJWTError as primary_error:
        if not settings.SUPABASE_JWT_SECRET_PREVIOUS:
            raise primary_error
        try:
            return _decode_with(settings.SUPABASE_JWT_SECRET_PREVIOUS, token)
        except jwt.PyJWTError:
            # Both failed; raise the *current* error for clearer messaging.
            raise primary_error from None


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> CurrentUser:
    """FastAPI dependency that resolves the authenticated user.

    Raises 401 ``AUTH_REQUIRED`` if the header is missing or malformed.
    Raises 401 ``AUTH_REQUIRED`` if the token doesn't verify against any
    accepted signing secret.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED", "message": "Missing bearer token."},
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = _verify_token(token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED", "message": "Invalid or expired token."},
        ) from None

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED", "message": "Token has no subject."},
        )

    return CurrentUser(
        id=str(user_id),
        email=payload.get("email"),
        # Subset we re-attach to the Postgres session for RLS. Keep tiny.
        jwt_claims_subset={
            "sub": user_id,
            "role": payload.get("role", "authenticated"),
            "email": payload.get("email"),
        },
    )


async def verify_cron_token(
    x_cron_token: str | None = Header(default=None, alias="X-Cron-Token"),
) -> None:
    """Dependency for cron-triggered endpoints.

    Cron callers (pg_cron, GitHub Actions) authenticate with a shared secret
    instead of a user JWT.
    """
    settings = get_settings()
    if not x_cron_token or x_cron_token != settings.CRON_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED", "message": "Invalid cron token."},
        )
