"""Observability wiring -- structlog + Sentry.

Kept out of ``main.py`` so it's easier to test and reason about. Two
public entry points:

* :func:`configure_logging` -- structlog setup; JSON in prod, pretty in dev.
* :func:`configure_sentry` -- Sentry init with a PII-stripping
  ``before_send`` hook.

Per ADR 0003 ("PII") and ADR 0006 (logging), we make sure email addresses
and JWTs never leave the process through Sentry.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import sentry_sdk
import structlog
from sentry_sdk.types import Event, Hint

from app.config import get_settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------


def configure_logging(level: str) -> None:
    """Set up structlog. JSON renderer in prod, console renderer in dev."""
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


# ---------------------------------------------------------------------------
# Sentry
# ---------------------------------------------------------------------------


_EMAIL_RE = re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b")
_JWT_RE = re.compile(r"\beyJ[a-zA-Z0-9\-_.]+\b")

_REDACT_KEYS = {
    "email",
    "primary_email",
    "password",
    "authorization",
    "token",
    "secret",
    "supabase_jwt_secret",
    "supabase_service_role_key",
    "cron_token",
    "bio",
    "comm_handle",
}


def _scrub_value(value: Any) -> Any:
    """Recursively redact PII patterns from a Sentry event payload."""
    if isinstance(value, str):
        v = _EMAIL_RE.sub("<email>", value)
        v = _JWT_RE.sub("<jwt>", v)
        return v
    if isinstance(value, list):
        return [_scrub_value(v) for v in value]
    if isinstance(value, dict):
        return {
            k: ("<redacted>" if k.lower() in _REDACT_KEYS else _scrub_value(v))
            for k, v in value.items()
        }
    return value


def _sentry_before_send(event: Event, _hint: Hint) -> Event | None:
    """Strip PII before any event leaves the process.

    Belt-and-suspenders on top of ``send_default_pii=False``. User-
    controlled strings (bio, chat body) can land in exception messages
    or breadcrumbs, and we don't want them in Sentry.
    """
    scrubbed: Any = _scrub_value(event)
    return scrubbed  # type: ignore[no-any-return]


def configure_sentry() -> None:
    settings = get_settings()
    dsn = settings.SENTRY_DSN
    if dsn is None:
        return
    sentry_sdk.init(
        dsn=dsn.get_secret_value(),
        environment=settings.APP_ENV,
        send_default_pii=False,
        traces_sample_rate=0.1 if settings.is_production else 0.0,
        before_send=_sentry_before_send,
    )
