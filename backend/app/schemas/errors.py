"""Error response model.

Per ADR 0008 §3, every API error follows the same shape::

    { "code": "GROUP_FULL", "message": "...", "details"?: { ... } }

The ``code`` is stable and machine-readable. The ``message`` is for humans.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    """Top-level error envelope returned by FastAPI exception handlers."""

    error: ErrorDetail
