"""Route-wiring smoke tests for /api/v1/courses/{id}/...

Same shape as the auth / profile route tests: the user_session_dep and
get_current_user dependencies are overridden, and the service layer is
monkeypatched per-test so the route exercises wiring + Pydantic coercion
without touching a database.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import discovery as discovery_routes
from app.auth.jwt import CurrentUser, get_current_user
from app.db.session import user_session_dep
from app.main import create_app
from app.schemas.discovery import (
    GroupListResponse,
    StudentListResponse,
)
from app.services import discovery as discovery_service

_USER_ID = "019e3500-0000-7000-8000-000000000001"
_COURSE_ID = uuid4()


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


def test_list_students_returns_empty(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(*args, **kwargs):  # type: ignore[no-untyped-def]
        return StudentListResponse(items=[], next_cursor=None)

    monkeypatch.setattr(discovery_routes.discovery_service, "list_students", fake)
    response = client.get(f"/api/v1/courses/{_COURSE_ID}/students")
    assert response.status_code == 200
    assert response.json() == {"items": [], "next_cursor": None}


def test_list_students_passes_filters_through(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict[str, object] = {}

    async def fake(_db, **kwargs):  # type: ignore[no-untyped-def]
        captured.update(kwargs)
        return StudentListResponse(items=[], next_cursor=None)

    monkeypatch.setattr(discovery_routes.discovery_service, "list_students", fake)
    section_id = uuid4()
    skill_id = uuid4()
    response = client.get(
        f"/api/v1/courses/{_COURSE_ID}/students",
        params={
            "section_id": str(section_id),
            "skill_id": str(skill_id),
            "search": "alice",
            "limit": 25,
        },
    )
    assert response.status_code == 200
    assert captured["course_id"] == _COURSE_ID
    assert captured["section_id"] == section_id
    assert captured["skill_id"] == skill_id
    assert captured["search"] == "alice"
    assert captured["limit"] == 25


def test_list_students_validates_limit_range(client: TestClient) -> None:
    response = client.get(f"/api/v1/courses/{_COURSE_ID}/students", params={"limit": 0})
    assert response.status_code == 422
    response = client.get(f"/api/v1/courses/{_COURSE_ID}/students", params={"limit": 200})
    assert response.status_code == 422


def test_list_students_requires_auth(client: TestClient) -> None:
    client.app.dependency_overrides.pop(get_current_user, None)
    response = client.get(f"/api/v1/courses/{_COURSE_ID}/students")
    assert response.status_code == 401


def test_list_groups_returns_empty(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(*args, **kwargs):  # type: ignore[no-untyped-def]
        return GroupListResponse(items=[], next_cursor=None)

    monkeypatch.setattr(discovery_routes.discovery_service, "list_groups", fake)
    response = client.get(f"/api/v1/courses/{_COURSE_ID}/groups")
    assert response.status_code == 200
    assert response.json() == {"items": [], "next_cursor": None}


def test_list_groups_recruiting_filter(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    async def fake(_db, **kwargs):  # type: ignore[no-untyped-def]
        captured.update(kwargs)
        return GroupListResponse(items=[], next_cursor=None)

    monkeypatch.setattr(discovery_routes.discovery_service, "list_groups", fake)
    response = client.get(
        f"/api/v1/courses/{_COURSE_ID}/groups",
        params={"recruiting_only": "true", "state": ["forming", "confirming"]},
    )
    assert response.status_code == 200
    assert captured["recruiting_only"] is True
    assert captured["states"] == ["forming", "confirming"]


def test_cursor_round_trip() -> None:
    encoded = discovery_service._encode_cursor({"enrollment_id": "some-uuid"})
    assert discovery_service._decode_cursor(encoded) == {"enrollment_id": "some-uuid"}


def test_decode_cursor_rejects_garbage() -> None:
    assert discovery_service._decode_cursor("not~base64!") is None
    assert discovery_service._decode_cursor("") is None
    assert discovery_service._decode_cursor(None) is None


def test_decode_cursor_rejects_non_dict() -> None:
    import base64
    import json

    payload = (
        base64.urlsafe_b64encode(json.dumps(["not", "a", "dict"]).encode()).decode().rstrip("=")
    )
    assert discovery_service._decode_cursor(payload) is None
