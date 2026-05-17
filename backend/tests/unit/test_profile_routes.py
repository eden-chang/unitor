"""Route-wiring smoke tests for /api/v1/profiles/*.

Like the auth route tests, these don't hit the database — the
user_session_dep and get_current_user dependencies are overridden so
each test can drive the route through a controlled service stub.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import profiles as profiles_routes
from app.auth.jwt import CurrentUser, get_current_user
from app.db.session import user_session_dep
from app.main import create_app
from app.services import profile as profile_service

_USER_ID = "019e3500-0000-7000-8000-000000000001"
_ENROLLMENT_ID = uuid4()
_PROFILE_ID = uuid4()
_COURSE_ID = uuid4()


def _fake_user() -> CurrentUser:
    return CurrentUser(
        id=_USER_ID,
        email="jesse.nguyen.demo@mail.utoronto.ca",
        jwt_claims_subset={"sub": _USER_ID},
    )


async def _fake_session() -> AsyncIterator[MagicMock]:
    s = MagicMock(name="fake_session")
    s.commit = MagicMock()

    async def _commit() -> None:
        return None

    s.commit = _commit  # type: ignore[assignment]
    yield s


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = _fake_user
    app.dependency_overrides[user_session_dep] = _fake_session
    return TestClient(app)


def _profile_read_dict() -> dict:
    return {
        "id": str(_PROFILE_ID),
        "enrollment_id": str(_ENROLLMENT_ID),
        "bio": "Hello.",
        "meeting_frequency": "2x/wk",
        "meeting_style": "in-person",
        "comm_tool": "Discord",
        "comm_handle": "jesse#1234",
        "avatar_url": None,
        "schedule_flexible": False,
        "last_active_at": "2026-05-17T05:00:00Z",
        "created_at": "2026-05-17T05:00:00Z",
        "updated_at": "2026-05-17T05:00:00Z",
        "skills": [],
        "schedule_slots": [],
        "links": [],
    }


def test_create_profile_201(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_create(_db, _payload):  # type: ignore[no-untyped-def]
        from app.schemas.profile import ProfileRead

        return ProfileRead(**_profile_read_dict())

    monkeypatch.setattr(profile_service, "create_profile", fake_create)
    monkeypatch.setattr(profiles_routes.profile_service, "create_profile", fake_create)

    response = client.post(
        "/api/v1/profiles",
        json={
            "enrollment_id": str(_ENROLLMENT_ID),
            "bio": "Hello.",
            "schedule_flexible": False,
            "skills": [],
            "schedule_slots": [],
            "links": [],
        },
    )
    assert response.status_code == 201
    assert response.json()["id"] == str(_PROFILE_ID)


def test_create_profile_conflict_when_exists(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_create(_db, _payload):  # type: ignore[no-untyped-def]
        raise profile_service.ProfileAlreadyExists(str(_ENROLLMENT_ID))

    monkeypatch.setattr(profiles_routes.profile_service, "create_profile", fake_create)

    response = client.post(
        "/api/v1/profiles",
        json={"enrollment_id": str(_ENROLLMENT_ID)},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PROFILE_ALREADY_EXISTS"


def test_create_profile_invalid_skill(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_create(_db, _payload):  # type: ignore[no-untyped-def]
        raise profile_service.InvalidSkill(str(uuid4()))

    monkeypatch.setattr(profiles_routes.profile_service, "create_profile", fake_create)

    response = client.post(
        "/api/v1/profiles",
        json={
            "enrollment_id": str(_ENROLLMENT_ID),
            "skills": [{"course_skill_id": str(uuid4()), "proficiency": "expert"}],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVALID_SKILL_FOR_COURSE"


def test_get_my_profile_404_when_absent(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_get(_db, *, user_id, course_id):  # type: ignore[no-untyped-def]
        assert isinstance(user_id, UUID)
        assert isinstance(course_id, UUID)
        return None

    monkeypatch.setattr(profiles_routes.profile_service, "get_my_profile_for_course", fake_get)

    response = client.get(f"/api/v1/profiles/me/{_COURSE_ID}")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "PROFILE_NOT_FOUND"


def test_update_profile_404_when_missing(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_update(_db, _pid, _payload):  # type: ignore[no-untyped-def]
        raise profile_service.ProfileNotFound(str(_PROFILE_ID))

    monkeypatch.setattr(profiles_routes.profile_service, "update_profile", fake_update)

    response = client.patch(
        f"/api/v1/profiles/{_PROFILE_ID}",
        json={"bio": "hi"},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "PROFILE_NOT_FOUND"


def test_replace_skills_returns_array(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_replace(_db, _pid, _payload):  # type: ignore[no-untyped-def]
        from app.schemas.profile import SkillRead

        return [SkillRead(id=uuid4(), course_skill_id=uuid4(), proficiency="expert")]

    monkeypatch.setattr(profiles_routes.profile_service, "replace_skills", fake_replace)

    response = client.put(
        f"/api/v1/profiles/{_PROFILE_ID}/skills",
        json={"skills": [{"course_skill_id": str(uuid4()), "proficiency": "expert"}]},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert response.json()[0]["proficiency"] == "expert"


def test_replace_schedule_validates_day_range(client: TestClient) -> None:
    response = client.put(
        f"/api/v1/profiles/{_PROFILE_ID}/schedule",
        json={
            "schedule_flexible": False,
            "slots": [{"day_of_week": 7, "time_band": 0}],  # 7 is invalid
        },
    )
    assert response.status_code == 422


def test_check_completion_returns_missing_list(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_check(_db, _pid):  # type: ignore[no-untyped-def]
        from app.schemas.profile import CompletionResponse

        return CompletionResponse(is_complete=False, missing=["bio", "at_least_two_skills"])

    monkeypatch.setattr(profiles_routes.profile_service, "check_completion", fake_check)

    response = client.post(f"/api/v1/profiles/{_PROFILE_ID}/complete")
    assert response.status_code == 200
    body = response.json()
    assert body["is_complete"] is False
    assert "bio" in body["missing"]


def test_requires_auth_for_create(client: TestClient) -> None:
    """Removing the auth override should make the route 401."""
    client.app.dependency_overrides.pop(get_current_user, None)
    response = client.post(
        "/api/v1/profiles",
        json={"enrollment_id": str(_ENROLLMENT_ID)},
    )
    assert response.status_code == 401


def test_delete_profile_204(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_delete(_db, _pid):  # type: ignore[no-untyped-def]
        return None

    monkeypatch.setattr(profiles_routes.profile_service, "delete_profile", fake_delete)
    response = client.delete(f"/api/v1/profiles/{_PROFILE_ID}")
    assert response.status_code == 204
    # FastAPI returns no body on 204.
    assert response.content == b""


def test_delete_profile_404_when_missing(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_delete(_db, _pid):  # type: ignore[no-untyped-def]
        raise profile_service.ProfileNotFound(str(_PROFILE_ID))

    monkeypatch.setattr(profiles_routes.profile_service, "delete_profile", fake_delete)
    response = client.delete(f"/api/v1/profiles/{_PROFILE_ID}")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "PROFILE_NOT_FOUND"
