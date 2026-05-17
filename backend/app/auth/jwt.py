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


def _expected_issuer() -> str:
    """Supabase signs JWTs with ``iss = {SUPABASE_URL}/auth/v1``."""
    return f"{get_settings().SUPABASE_URL.rstrip('/')}/auth/v1"


def _decode_with(secret: str, token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience="authenticated",
        issuer=_expected_issuer(),
        options={
            # Belt-and-suspenders: refuse a token missing any of these.
            # PyJWT verifies `exp` by default but doesn't require it to
            # exist; we make existence mandatory.
            "require": ["sub", "exp", "iat", "iss", "aud"],
            "verify_signature": True,
            "verify_exp": True,
            "verify_iat": True,
            "verify_aud": True,
            "verify_iss": True,
        },
    )


def _verify_token(token: str) -> dict[str, Any]:
    """Verify against current secret, falling back to previous if rotating."""
    settings = get_settings()
    try:
        return _decode_with(settings.SUPABASE_JWT_SECRET.get_secret_value(), token)
    except jwt.PyJWTError as primary_error:
        previous = settings.SUPABASE_JWT_SECRET_PREVIOUS
        if previous is None:
            raise primary_error
        try:
            return _decode_with(previous.get_secret_value(), token)
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
    expected = settings.CRON_TOKEN.get_secret_value()
    # secrets.compare_digest is constant-time -- defends against timing
    # analysis attempting to brute-force the shared secret one byte at a time.
    import secrets

    if not x_cron_token or not secrets.compare_digest(x_cron_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED", "message": "Invalid cron token."},
        )
