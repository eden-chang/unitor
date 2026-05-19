"""FastAPI application entrypoint.

Wires middleware, routers, lifespan, and observability. Keep this thin --
real logic lives under ``app/api/v1/``, ``app/services/``, and ``app/db/``.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth as auth_routes
from app.api.v1 import compatibility, discovery, health, profiles
from app.config import build_cors_origin_regex, get_settings
from app.middleware.request_id import RequestIDMiddleware
from app.observability import configure_logging, configure_sentry


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown hooks. Keep async-friendly resources here."""
    settings = get_settings()
    configure_logging(settings.LOG_LEVEL)
    configure_sentry()
    log = structlog.get_logger()
    log.info("unitor.startup", env=settings.APP_ENV)
    yield
    log.info("unitor.shutdown")


def create_app() -> FastAPI:
    """Application factory.

    Exists so tests can spin up fresh app instances with overridden settings.
    """
    settings = get_settings()
    app = FastAPI(
        title="Unitor API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs" if not settings.is_production else None,
        redoc_url=None,
        openapi_url="/api/v1/openapi.json",
    )

    # CORS: explicit origins for known callers + regex for Vercel preview
    # URLs (`https://*.vercel.app`). Starlette's `allow_origins` is exact-
    # string-only; the wildcard form belongs in `allow_origin_regex`.
    allow_origins, allow_origin_regex = build_cors_origin_regex(settings.cors_origins_list)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_origin_regex=allow_origin_regex,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Cron-Token",
            "X-Request-Id",
        ],
        expose_headers=["X-Request-Id"],
    )

    app.add_middleware(RequestIDMiddleware)

    app.include_router(health.router, prefix="/api/v1", tags=["health"])
    app.include_router(auth_routes.router, prefix="/api/v1")
    app.include_router(profiles.router, prefix="/api/v1")
    app.include_router(discovery.router, prefix="/api/v1")
    app.include_router(compatibility.router, prefix="/api/v1")

    return app


app = create_app()
