"""Route-wiring smoke tests for ``/api/v1/groups/*`` and ``/api/v1/applications/*``.

These confirm the routes exist, return the expected shape on the happy
path, and map service exceptions to the right ADR-0008 error codes.
Database access is stubbed by monkey-patching the ``admin_session()``
context manager that the route module imports.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import groups as groups_routes
from app.auth.jwt import CurrentUser, get_current_user
from app.main import create_app
from app.schemas.groups import (
    ApplicationAnswerRead,
    ApplicationRead,
    GroupApplicationQuestionRead,
    GroupDetailRead,
    GroupMemberDetail,
)
from app.services import groups as groups_service

_USER_ID = "019e3500-0000-7000-8000-000000000001"
_GROUP_ID = UUID("11111111-1111-1111-1111-111111111111")
_APPLICATION_ID = UUID("22222222-2222-2222-2222-222222222222")
_COURSE_ID = UUID("33333333-3333-3333-3333-333333333333")
_ENROLLMENT_ID = UUID("44444444-4444-4444-4444-444444444444")


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    @asynccontextmanager
    async def fake_admin_session() -> AsyncIterator[MagicMock]:
        yield MagicMock(name="fake_session")

    monkeypatch.setattr(groups_routes, "admin_session", fake_admin_session)
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=_USER_ID,
        email="alice@school.edu",
        jwt_claims_subset={"sub": _USER_ID},
    )
    return TestClient(app)


def _group_detail(state: str = "forming", recruiting: bool = True) -> GroupDetailRead:
    return GroupDetailRead(
        id=_GROUP_ID,
        course_id=_COURSE_ID,
        name="Team Cool",
        description=None,
        state=state,  # type: ignore[arg-type]
        recruiting=recruiting,
        members=[
            GroupMemberDetail(
                membership_id=UUID("55555555-5555-5555-5555-555555555555"),
                user_id=UUID(_USER_ID),
                display_name="Alice",
                role="leader",
                joined_at=datetime(2026, 5, 21, tzinfo=UTC),
                confirmed_at=None,
            ),
        ],
        application_questions=[
            GroupApplicationQuestionRead(
                id=UUID("66666666-6666-6666-6666-666666666666"),
                question_text="Why join?",
                display_order=0,
            ),
        ],
        confirmation_initiated_at=None,
        confirmation_deadline_at=None,
        confirmed_at=None,
        created_at=datetime(2026, 5, 21, tzinfo=UTC),
    )


def _application(
    status_: str = "pending",
    *,
    applicant_id: UUID | None = None,
) -> ApplicationRead:
    return ApplicationRead(
        id=_APPLICATION_ID,
        course_id=_COURSE_ID,
        group_id=_GROUP_ID,
        applicant_user_id=applicant_id or UUID(_USER_ID),
        applicant_display_name="Bob",
        status=status_,  # type: ignore[arg-type]
        created_at=datetime(2026, 5, 21, tzinfo=UTC),
        responded_at=None,
        responded_by_user_id=None,
        answers=[
            ApplicationAnswerRead(
                id=UUID("77777777-7777-7777-7777-777777777777"),
                question_id=UUID("66666666-6666-6666-6666-666666666666"),
                question_text_snapshot="Why join?",
                answer_text="I bring backend skills.",
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


def test_create_group_requires_auth() -> None:
    app = create_app()
    with TestClient(app) as anon:
        response = anon.post("/api/v1/groups", json={"enrollment_id": str(_ENROLLMENT_ID)})
    assert response.status_code == 401


def test_create_group_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(_session, _user, payload):  # type: ignore[no-untyped-def]
        assert payload.enrollment_id == _ENROLLMENT_ID
        return _group_detail()

    monkeypatch.setattr(groups_routes.groups_service, "create_group", fake)
    response = client.post(
        "/api/v1/groups",
        headers={"Authorization": "Bearer fake"},
        json={
            "enrollment_id": str(_ENROLLMENT_ID),
            "name": "Team Cool",
            "recruiting": True,
            "application_questions": [],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["state"] == "forming"
    assert body["members"][0]["role"] == "leader"


def test_create_group_already_in_group_returns_409(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.AlreadyInGroup(str(_COURSE_ID))

    monkeypatch.setattr(groups_routes.groups_service, "create_group", fake)
    response = client.post(
        "/api/v1/groups",
        headers={"Authorization": "Bearer fake"},
        json={"enrollment_id": str(_ENROLLMENT_ID)},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "ALREADY_IN_GROUP"


def test_create_group_enrollment_not_found_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.EnrollmentNotFound(str(_ENROLLMENT_ID))

    monkeypatch.setattr(groups_routes.groups_service, "create_group", fake)
    response = client.post(
        "/api/v1/groups",
        headers={"Authorization": "Bearer fake"},
        json={"enrollment_id": str(_ENROLLMENT_ID)},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "ENROLLMENT_NOT_FOUND"


# ---------------------------------------------------------------------------
# Get / patch
# ---------------------------------------------------------------------------


def test_get_group_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(_session, group_id):  # type: ignore[no-untyped-def]
        assert group_id == _GROUP_ID
        return _group_detail()

    monkeypatch.setattr(groups_routes.groups_service, "get_group", fake)
    response = client.get(
        f"/api/v1/groups/{_GROUP_ID}",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200


def test_get_group_not_found_returns_404(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.GroupNotFound(str(_GROUP_ID))

    monkeypatch.setattr(groups_routes.groups_service, "get_group", fake)
    response = client.get(
        f"/api/v1/groups/{_GROUP_ID}",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "GROUP_NOT_FOUND"


def test_update_group_not_a_leader_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.NotALeader(str(_GROUP_ID))

    monkeypatch.setattr(groups_routes.groups_service, "update_group", fake)
    response = client.patch(
        f"/api/v1/groups/{_GROUP_ID}",
        headers={"Authorization": "Bearer fake"},
        json={"recruiting": False},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "NOT_GROUP_LEADER"


# ---------------------------------------------------------------------------
# Apply
# ---------------------------------------------------------------------------


def test_apply_to_group_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return _application()

    monkeypatch.setattr(groups_routes.groups_service, "apply_to_group", fake)
    response = client.post(
        f"/api/v1/groups/{_GROUP_ID}/apply",
        headers={"Authorization": "Bearer fake"},
        json={
            "answers": [
                {
                    "question_id": "66666666-6666-6666-6666-666666666666",
                    "answer_text": "Hi",
                }
            ],
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"


def test_apply_to_group_not_recruiting_returns_409(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.GroupNotRecruiting(str(_GROUP_ID))

    monkeypatch.setattr(groups_routes.groups_service, "apply_to_group", fake)
    response = client.post(
        f"/api/v1/groups/{_GROUP_ID}/apply",
        headers={"Authorization": "Bearer fake"},
        json={"answers": []},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "GROUP_NOT_RECRUITING"


def test_apply_to_group_duplicate_returns_409(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.DuplicateApplication(str(_GROUP_ID))

    monkeypatch.setattr(groups_routes.groups_service, "apply_to_group", fake)
    response = client.post(
        f"/api/v1/groups/{_GROUP_ID}/apply",
        headers={"Authorization": "Bearer fake"},
        json={"answers": []},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "DUPLICATE_APPLICATION"


def test_apply_to_group_invalid_question_returns_400(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.InvalidQuestion("00000000-0000-0000-0000-000000000000")

    monkeypatch.setattr(groups_routes.groups_service, "apply_to_group", fake)
    response = client.post(
        f"/api/v1/groups/{_GROUP_ID}/apply",
        headers={"Authorization": "Bearer fake"},
        json={"answers": []},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVALID_QUESTION"


# ---------------------------------------------------------------------------
# List applications
# ---------------------------------------------------------------------------


def test_list_applications_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return [_application()]

    monkeypatch.setattr(groups_routes.groups_service, "list_applications", fake)
    response = client.get(
        f"/api/v1/groups/{_GROUP_ID}/applications",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1


def test_list_applications_not_leader_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.NotALeader(str(_GROUP_ID))

    monkeypatch.setattr(groups_routes.groups_service, "list_applications", fake)
    response = client.get(
        f"/api/v1/groups/{_GROUP_ID}/applications",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "NOT_GROUP_LEADER"


# ---------------------------------------------------------------------------
# Accept + decline
# ---------------------------------------------------------------------------


def test_accept_application_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return _application(status_="accepted")

    monkeypatch.setattr(groups_routes.groups_service, "accept_application", fake)
    response = client.post(
        f"/api/v1/applications/{_APPLICATION_ID}/accept",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


def test_accept_application_already_responded_returns_409(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.ApplicationAlreadyResponded("accepted")

    monkeypatch.setattr(groups_routes.groups_service, "accept_application", fake)
    response = client.post(
        f"/api/v1/applications/{_APPLICATION_ID}/accept",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "APPLICATION_ALREADY_RESPONDED"


def test_decline_application_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return _application(status_="declined")

    monkeypatch.setattr(groups_routes.groups_service, "decline_application", fake)
    response = client.post(
        f"/api/v1/applications/{_APPLICATION_ID}/decline",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "declined"


# ---------------------------------------------------------------------------
# Leave + confirm
# ---------------------------------------------------------------------------


def test_leave_group_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return _group_detail(state="disbanded", recruiting=False)

    monkeypatch.setattr(groups_routes.groups_service, "leave_group", fake)
    response = client.post(
        f"/api/v1/groups/{_GROUP_ID}/leave",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "disbanded"


def test_leave_group_not_a_member_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        raise groups_service.NotAMember(str(_GROUP_ID))

    monkeypatch.setattr(groups_routes.groups_service, "leave_group", fake)
    response = client.post(
        f"/api/v1/groups/{_GROUP_ID}/leave",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "NOT_GROUP_MEMBER"


def test_confirm_group_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return _group_detail(state="confirming", recruiting=False)

    monkeypatch.setattr(groups_routes.groups_service, "confirm_group", fake)
    response = client.post(
        f"/api/v1/groups/{_GROUP_ID}/confirm",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200
    assert response.json()["state"] == "confirming"
