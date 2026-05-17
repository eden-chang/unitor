"""Route-wiring smoke tests for /api/v1/auth/*.

These confirm the routes exist, return the right shape on edge cases,
and reject unauthenticated bootstrap. They do NOT hit the database — the
admin_session dependency is dependency-overridden to a stub.

Real DB integration is covered by manual curl against seeded data and
will be promoted to ``tests/integration/`` when the local Supabase CLI
stack is wired up.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.v1.auth import routes as auth_routes
from app.main import create_app
from app.services import auth_bootstrap as auth_service


@pytest.fixture
def client_with_stub_admin_session(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Stub admin_session() so routes never touch a real DB."""

    @asynccontextmanager
    async def fake_admin_session() -> AsyncIterator[MagicMock]:
        yield MagicMock(name="fake_session")

    monkeypatch.setattr(auth_routes, "admin_session", fake_admin_session)
    return TestClient(create_app())


def test_precheck_returns_response_shape(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_precheck(session, email):  # type: ignore[no-untyped-def]
        from app.schemas.auth import PrecheckResponse

        return PrecheckResponse(on_roster=True, course_count=2)

    monkeypatch.setattr(auth_service, "precheck", fake_precheck)
    monkeypatch.setattr(auth_routes.auth_bootstrap, "precheck", fake_precheck)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/precheck", json={"email": "alice@school.edu"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body == {"on_roster": True, "course_count": 2}


def test_precheck_validates_email(client_with_stub_admin_session: TestClient) -> None:
    response = client_with_stub_admin_session.post(
        "/api/v1/auth/precheck", json={"email": "not-an-email"}
    )
    assert response.status_code == 422


def test_bootstrap_requires_auth(client_with_stub_admin_session: TestClient) -> None:
    response = client_with_stub_admin_session.post("/api/v1/auth/bootstrap")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTH_REQUIRED"


def test_bootstrap_propagates_roster_not_found(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.auth.jwt import CurrentUser, get_current_user

    fake_user = CurrentUser(
        id="00000000-0000-0000-0000-000000000001",
        email="ghost@school.edu",
        jwt_claims_subset={"sub": "00000000-0000-0000-0000-000000000001"},
    )

    async def fake_bootstrap(session, current_user):  # type: ignore[no-untyped-def]
        raise auth_service.RosterEmailNotFound(current_user.email)

    # The route imports the dependency via Depends(get_current_user); override it.
    app = client_with_stub_admin_session.app
    app.dependency_overrides[get_current_user] = lambda: fake_user
    monkeypatch.setattr(auth_routes.auth_bootstrap, "bootstrap", fake_bootstrap)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/bootstrap", headers={"Authorization": "Bearer fake-token"}
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "ROSTER_EMAIL_NOT_FOUND"

    app.dependency_overrides.clear()


# Silence ruff: AsyncMock import is currently unused but kept for future tests.
_ = AsyncMock
