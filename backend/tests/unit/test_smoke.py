"""Smoke test — confirms the app boots and /api/v1/health responds."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok() -> None:
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_version_endpoint_exists() -> None:
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/version")
    assert response.status_code == 200
    body = response.json()
    assert "commit" in body
