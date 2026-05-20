"""Route-wiring smoke tests for ``/api/v1/courses/{id}/*``.

The course detail / sections / skill-catalog endpoints share a
``user_session`` dep and a service module. We override both and drive
each route through a controlled service stub, mirroring the pattern
used by the auth and profile route tests.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import courses as courses_routes
from app.auth.jwt import CurrentUser, get_current_user
from app.db.session import user_session_dep
from app.main import create_app
from app.schemas.courses import CourseSkillRead, CourseSummary, SectionRead
from app.services import courses as courses_service

_USER_ID = "019e3500-0000-7000-8000-000000000001"
_COURSE_ID = UUID("11111111-1111-1111-1111-111111111111")


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


def _course_summary() -> CourseSummary:
    return CourseSummary(
        id=_COURSE_ID,
        code="CSC318",
        name="Design of Interactive Computational Media",
        semester="2026 Fall",
        timezone="America/Toronto",
        deadline_at=datetime(2026, 9, 30, tzinfo=UTC),
    )


def test_get_course_requires_auth() -> None:
    app = create_app()
    with TestClient(app) as anon:
        response = anon.get(f"/api/v1/courses/{_COURSE_ID}")
    assert response.status_code == 401


def test_get_course_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(_db, course_id):  # type: ignore[no-untyped-def]
        assert course_id == _COURSE_ID
        return _course_summary()

    monkeypatch.setattr(courses_routes.courses_service, "get_course", fake)

    response = client.get(
        f"/api/v1/courses/{_COURSE_ID}",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200
    assert response.json()["code"] == "CSC318"


def test_get_course_not_found_returns_404(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(_db, course_id):  # type: ignore[no-untyped-def]
        raise courses_service.CourseNotFound(str(course_id))

    monkeypatch.setattr(courses_routes.courses_service, "get_course", fake)

    response = client.get(
        f"/api/v1/courses/{_COURSE_ID}",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "COURSE_NOT_FOUND"


def test_list_sections_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    sections = [
        SectionRead(id=UUID("22222222-0000-0000-0000-000000000001"), code="L0101"),
        SectionRead(id=UUID("22222222-0000-0000-0000-000000000002"), code="L0201"),
    ]

    async def fake(_db, course_id):  # type: ignore[no-untyped-def]
        return sections

    monkeypatch.setattr(courses_routes.courses_service, "list_sections", fake)

    response = client.get(
        f"/api/v1/courses/{_COURSE_ID}/sections",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200
    body = response.json()
    assert [s["code"] for s in body] == ["L0101", "L0201"]


def test_list_skills_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    skills = [
        CourseSkillRead(
            id=UUID("33333333-0000-0000-0000-000000000001"),
            skill_name="Frontend",
            display_order=0,
        ),
        CourseSkillRead(
            id=UUID("33333333-0000-0000-0000-000000000002"),
            skill_name="Backend",
            display_order=1,
        ),
    ]

    async def fake(_db, course_id):  # type: ignore[no-untyped-def]
        return skills

    monkeypatch.setattr(courses_routes.courses_service, "list_skills", fake)

    response = client.get(
        f"/api/v1/courses/{_COURSE_ID}/skills",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 200
    assert [s["skill_name"] for s in response.json()] == ["Frontend", "Backend"]


def test_list_skills_course_not_found_returns_404(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(_db, course_id):  # type: ignore[no-untyped-def]
        raise courses_service.CourseNotFound(str(course_id))

    monkeypatch.setattr(courses_routes.courses_service, "list_skills", fake)

    response = client.get(
        f"/api/v1/courses/{_COURSE_ID}/skills",
        headers={"Authorization": "Bearer fake"},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "COURSE_NOT_FOUND"
