"""JWT verification tests.

Confirm the audience / issuer / expiry / signature checks all reject the
wrong shape of token. We mint tokens locally with the same secret the
app uses (from conftest's env var) so signature is always valid; we
mutate the payload to test the negative paths.
"""

from __future__ import annotations

import time
from typing import Any

import jwt as pyjwt
import pytest
from fastapi import HTTPException

from app.auth import jwt as auth_jwt
from app.config import get_settings


def _mint(**overrides: Any) -> str:
    settings = get_settings()
    secret = settings.SUPABASE_JWT_SECRET.get_secret_value()
    payload: dict[str, Any] = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "aud": "authenticated",
        "role": "authenticated",
        "iss": f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
        "email": "alice@school.edu",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    payload.update(overrides)
    return pyjwt.encode(payload, secret, algorithm="HS256")


def test_well_formed_token_verifies() -> None:
    claims = auth_jwt._verify_token(_mint())
    assert claims["sub"] == "00000000-0000-0000-0000-000000000001"


def test_wrong_audience_rejected() -> None:
    with pytest.raises(pyjwt.PyJWTError):
        auth_jwt._verify_token(_mint(aud="anon"))


def test_wrong_issuer_rejected() -> None:
    with pytest.raises(pyjwt.PyJWTError):
        auth_jwt._verify_token(_mint(iss="https://attacker.example.com/auth/v1"))


def test_expired_token_rejected() -> None:
    with pytest.raises(pyjwt.PyJWTError):
        auth_jwt._verify_token(_mint(exp=int(time.time()) - 60))


def test_token_missing_sub_rejected() -> None:
    # The `require` option enforces presence of `sub`.
    settings = get_settings()
    payload = {
        "aud": "authenticated",
        "iss": f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    token = pyjwt.encode(
        payload, settings.SUPABASE_JWT_SECRET.get_secret_value(), algorithm="HS256"
    )
    with pytest.raises(pyjwt.PyJWTError):
        auth_jwt._verify_token(token)


def test_wrong_signature_rejected() -> None:
    token = pyjwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000001",
            "aud": "authenticated",
            "iss": f"{get_settings().SUPABASE_URL.rstrip('/')}/auth/v1",
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        },
        "different-secret",
        algorithm="HS256",
    )
    with pytest.raises(pyjwt.PyJWTError):
        auth_jwt._verify_token(token)


@pytest.mark.asyncio
async def test_get_current_user_returns_subject() -> None:
    user = await auth_jwt.get_current_user(authorization=f"Bearer {_mint()}")
    assert user.id == "00000000-0000-0000-0000-000000000001"
    assert user.email == "alice@school.edu"
    assert user.jwt_claims_subset["sub"] == user.id


@pytest.mark.asyncio
async def test_get_current_user_missing_header_raises_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await auth_jwt.get_current_user(authorization=None)
    assert exc_info.value.status_code == 401
