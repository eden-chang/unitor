"""Request-ID middleware + structlog binding.

Every incoming request gets an ``X-Request-Id`` header (taken from the
client when present, generated otherwise). The id is:

* Bound to ``structlog.contextvars`` so every log line inside the request
  carries it.
* Echoed back to the client in the response so they can correlate.
* Tagged on Sentry events for cross-system correlation.

Keep this thin: a single hop into structlog/contextvars + a header copy.
Don't put business logic here.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from uuid import uuid4

import sentry_sdk
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_HEADER = "X-Request-Id"


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        # Use client-provided id if it's a sane shape; otherwise mint a fresh
        # UUIDv4. We intentionally don't echo arbitrary user-provided strings
        # without bounds -- truncate to 64 chars and strip non-printable.
        raw = request.headers.get(_HEADER, "")
        request_id = _sanitize(raw) or uuid4().hex

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        sentry_sdk.set_tag("request_id", request_id)

        response = await call_next(request)
        response.headers[_HEADER] = request_id
        return response


def _sanitize(raw: str) -> str:
    s = "".join(c for c in raw if c.isprintable() and c not in " ;,")
    return s[:64]
