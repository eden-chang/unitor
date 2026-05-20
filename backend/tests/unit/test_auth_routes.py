"""Route-wiring smoke tests for ``/api/v1/auth/*``.

These confirm the routes exist, return the right shape on edge cases,
and reject unauthenticated calls. They do NOT hit the database — the
``admin_session`` dependency is monkey-patched to a stub that yields a
``MagicMock`` session.

Real DB integration is covered by manual curl against seeded data and
will be promoted to ``tests/integration/`` when the local Supabase CLI
stack is wired up.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.v1.auth import routes as auth_routes
from app.main import create_app
from app.services import auth_bootstrap as auth_bootstrap_service
from app.services import auth_join as auth_join_service


@pytest.fixture
def client_with_stub_admin_session(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Stub admin_session() so routes never touch a real DB."""

    @asynccontextmanager
    async def fake_admin_session() -> AsyncIterator[MagicMock]:
        yield MagicMock(name="fake_session")

    monkeypatch.setattr(auth_routes, "admin_session", fake_admin_session)
    return TestClient(create_app())


def _override_user(client: TestClient, *, email: str | None = "alice@school.edu") -> None:
    from app.auth.jwt import CurrentUser, get_current_user

    fake_user = CurrentUser(
        id="00000000-0000-0000-0000-000000000001",
        email=email,
        jwt_claims_subset={"sub": "00000000-0000-0000-0000-000000000001"},
    )
    client.app.dependency_overrides[get_current_user] = lambda: fake_user


# ---------------------------------------------------------------------------
# Precheck
# ---------------------------------------------------------------------------


def test_precheck_returns_response_shape(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_precheck(session, email):  # type: ignore[no-untyped-def]
        from app.schemas.auth import PrecheckResponse

        return PrecheckResponse(on_roster=True, course_count=2)

    monkeypatch.setattr(auth_routes.auth_bootstrap, "precheck", fake_precheck)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/precheck", json={"email": "alice@school.edu"}
    )
    assert response.status_code == 200
    assert response.json() == {"on_roster": True, "course_count": 2}


def test_precheck_validates_email(client_with_stub_admin_session: TestClient) -> None:
    response = client_with_stub_admin_session.post(
        "/api/v1/auth/precheck", json={"email": "not-an-email"}
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------


def test_bootstrap_requires_auth(client_with_stub_admin_session: TestClient) -> None:
    response = client_with_stub_admin_session.post("/api/v1/auth/bootstrap")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTH_REQUIRED"


def test_bootstrap_returns_user_and_enrollments(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Bootstrap now just returns the user + their existing enrollments; it
    no longer auto-enrolls from the roster."""
    from app.schemas.auth import BootstrapResponse, UserRead

    _override_user(client_with_stub_admin_session)

    async def fake_bootstrap(session, current_user):  # type: ignore[no-untyped-def]
        return BootstrapResponse(
            user=UserRead(
                id=UUID(current_user.id),
                primary_email=current_user.email,
                display_name="Alice",
                default_avatar_url=None,
            ),
            enrollments=[],
        )

    monkeypatch.setattr(auth_routes.auth_bootstrap, "bootstrap", fake_bootstrap)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/bootstrap", headers={"Authorization": "Bearer fake-token"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["display_name"] == "Alice"
    assert body["enrollments"] == []
    assert "newly_enrolled_count" not in body  # removed in stage 1 step C
    client_with_stub_admin_session.app.dependency_overrides.clear()


def test_bootstrap_missing_email_claim_returns_401(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _override_user(client_with_stub_admin_session, email=None)

    async def fake_bootstrap(session, current_user):  # type: ignore[no-untyped-def]
        raise auth_bootstrap_service.MissingEmailClaim("no email")

    monkeypatch.setattr(auth_routes.auth_bootstrap, "bootstrap", fake_bootstrap)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/bootstrap", headers={"Authorization": "Bearer fake-token"}
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTH_REQUIRED"
    client_with_stub_admin_session.app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Join
# ---------------------------------------------------------------------------


def _enrollment_read(course_id: str = "11111111-1111-1111-1111-111111111111"):  # type: ignore[no-untyped-def]
    from app.schemas.auth import CourseSummary, EnrollmentRead

    return EnrollmentRead(
        id=UUID("22222222-2222-2222-2222-222222222222"),
        course=CourseSummary(
            id=UUID(course_id),
            code="CSC318",
            name="Design",
            semester="2026 Fall",
            timezone="America/Toronto",
            deadline_at=datetime(2026, 9, 30, tzinfo=UTC),
        ),
        section_id=UUID("33333333-3333-3333-3333-333333333333"),
        section_code="L0101",
        role="student",
        status="active",
        joined_at=datetime(2026, 5, 19, tzinfo=UTC),
    )


def test_join_requires_auth(client_with_stub_admin_session: TestClient) -> None:
    response = client_with_stub_admin_session.post(
        "/api/v1/auth/join", json={"invite_code": "ABC123"}
    )
    assert response.status_code == 401


def test_join_success(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _override_user(client_with_stub_admin_session)

    async def fake_join(session, current_user, invite_code):  # type: ignore[no-untyped-def]
        assert invite_code == "ABC123"
        return _enrollment_read()

    monkeypatch.setattr(auth_routes.auth_join, "join", fake_join)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/join",
        json={"invite_code": "ABC123"},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["course"]["code"] == "CSC318"
    assert body["role"] == "student"
    client_with_stub_admin_session.app.dependency_overrides.clear()


def test_join_invalid_invite_code_returns_404(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _override_user(client_with_stub_admin_session)

    async def fake_join(session, current_user, invite_code):  # type: ignore[no-untyped-def]
        raise auth_join_service.InviteCodeNotFound(invite_code)

    monkeypatch.setattr(auth_routes.auth_join, "join", fake_join)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/join",
        json={"invite_code": "BOGUS"},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "INVITE_CODE_NOT_FOUND"
    client_with_stub_admin_session.app.dependency_overrides.clear()


def test_join_not_in_roster_returns_403(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _override_user(client_with_stub_admin_session)

    async def fake_join(session, current_user, invite_code):  # type: ignore[no-untyped-def]
        raise auth_join_service.NotInRoster(current_user.email)

    monkeypatch.setattr(auth_routes.auth_join, "join", fake_join)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/join",
        json={"invite_code": "ABC123"},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "NOT_IN_ROSTER"
    client_with_stub_admin_session.app.dependency_overrides.clear()


def test_join_already_enrolled_returns_409(
    client_with_stub_admin_session: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _override_user(client_with_stub_admin_session)

    async def fake_join(session, current_user, invite_code):  # type: ignore[no-untyped-def]
        raise auth_join_service.AlreadyEnrolled("course-id")

    monkeypatch.setattr(auth_routes.auth_join, "join", fake_join)

    response = client_with_stub_admin_session.post(
        "/api/v1/auth/join",
        json={"invite_code": "ABC123"},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "ALREADY_ENROLLED"
    client_with_stub_admin_session.app.dependency_overrides.clear()


def test_join_rejects_empty_invite_code(client_with_stub_admin_session: TestClient) -> None:
    _override_user(client_with_stub_admin_session)
    response = client_with_stub_admin_session.post(
        "/api/v1/auth/join",
        json={"invite_code": ""},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 422
    client_with_stub_admin_session.app.dependency_overrides.clear()
