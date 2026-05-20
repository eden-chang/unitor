"""Route-wiring smoke tests for ``/api/v1/users/*``.

The ``user_session_dep`` + ``get_current_user`` dependencies are
overridden so each test drives the route through a controlled service
stub. The DB layer is never touched.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import users as users_routes
from app.auth.jwt import CurrentUser, get_current_user
from app.db.session import user_session_dep
from app.main import create_app
from app.schemas.auth import UserRead
from app.services import users as users_service

_USER_ID = "019e3500-0000-7000-8000-000000000001"


def _fake_user() -> CurrentUser:
    return CurrentUser(
        id=_USER_ID,
        email="alice@school.edu",
        jwt_claims_subset={"sub": _USER_ID},
    )


async def _fake_session() -> AsyncIterator[MagicMock]:
    yield MagicMock(name="fake_session")


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = _fake_user
    app.dependency_overrides[user_session_dep] = _fake_session
    return TestClient(app)


def test_patch_me_requires_auth() -> None:
    app = create_app()
    with TestClient(app) as anon:
        response = anon.patch("/api/v1/users/me", json={"display_name": "Alice"})
    assert response.status_code == 401


def test_patch_me_updates_display_name(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_update(_db, *, user_id, display_name):  # type: ignore[no-untyped-def]
        assert str(user_id) == _USER_ID
        return UserRead(
            id=user_id,
            primary_email="alice@school.edu",
            display_name=display_name,
            default_avatar_url=None,
        )

    monkeypatch.setattr(users_routes.users_service, "update_me", fake_update)

    response = client.patch(
        "/api/v1/users/me",
        json={"display_name": "Alice Liddell"},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Alice Liddell"
    assert body["primary_email"] == "alice@school.edu"


def test_patch_me_rejects_empty_name(client: TestClient) -> None:
    response = client.patch(
        "/api/v1/users/me",
        json={"display_name": ""},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 422


def test_patch_me_rejects_overlong_name(client: TestClient) -> None:
    response = client.patch(
        "/api/v1/users/me",
        json={"display_name": "x" * 121},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 422


def test_patch_me_user_not_found_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_update(_db, *, user_id, display_name):  # type: ignore[no-untyped-def]
        raise users_service.UserNotFound(str(user_id))

    monkeypatch.setattr(users_routes.users_service, "update_me", fake_update)

    response = client.patch(
        "/api/v1/users/me",
        json={"display_name": "Alice"},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "USER_NOT_FOUND"
