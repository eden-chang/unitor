"""FastAPI application entrypoint.

Wires up middleware, routers, lifespan, and Sentry. Keep this file thin —
real logic lives under ``app/api/v1/``, ``app/services/``, and ``app/db/``.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth as auth_routes
from app.api.v1 import health, profiles
from app.config import get_settings


def _configure_logging(level: str) -> None:
    """Set up structlog to emit JSON in prod and pretty in dev."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(level=log_level, format="%(message)s")
    settings = get_settings()
    processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]
    if settings.is_production:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        cache_logger_on_first_use=True,
    )


def _configure_sentry() -> None:
    settings = get_settings()
    if not settings.SENTRY_DSN:
        return
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        send_default_pii=False,
        traces_sample_rate=0.1 if settings.is_production else 0.0,
    )


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown hooks. Keep async-friendly resources here."""
    settings = get_settings()
    _configure_logging(settings.LOG_LEVEL)
    _configure_sentry()
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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Cron-Token"],
    )

    app.include_router(health.router, prefix="/api/v1", tags=["health"])
    app.include_router(auth_routes.router, prefix="/api/v1")
    app.include_router(profiles.router, prefix="/api/v1")

    return app


app = create_app()
