"""Liveness, readiness, version endpoints.

All public. No auth. Used by the platform's healthcheck and the deploy
pipeline. Keep these minimal so they don't touch resources that themselves
might be down.
"""

from __future__ import annotations

import os

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.db.session import get_engine

router = APIRouter()


class HealthResponse(BaseModel):
    status: str


class VersionResponse(BaseModel):
    commit: str
    build_time: str | None


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness — returns instantly without external calls."""
    return HealthResponse(status="ok")


@router.get("/health/ready", response_model=HealthResponse)
async def ready() -> HealthResponse:
    """Readiness — confirms we can talk to Postgres.

    Used by the platform to gate traffic until the app is fully wired up.
    """
    engine = get_engine()
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return HealthResponse(status="ready")


@router.get("/version", response_model=VersionResponse)
async def version() -> VersionResponse:
    return VersionResponse(
        commit=os.environ.get("GIT_COMMIT", "unknown"),
        build_time=os.environ.get("BUILD_TIME"),
    )
