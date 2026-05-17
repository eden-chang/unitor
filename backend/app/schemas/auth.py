"""Auth-flow request/response models.

See ``../07-auth-flows.md`` for the end-to-end flow. Endpoints live under
``app/api/v1/auth/``; business logic in ``app/services/auth_bootstrap.py``.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Precheck
# ---------------------------------------------------------------------------


class PrecheckRequest(BaseModel):
    """Public request: 'is this email on any active roster?'

    Privacy: we return only a boolean + count, not the course names. That
    minimizes the information leak when an unauthenticated caller probes
    arbitrary emails. Course details are revealed after the user signs in
    via the bootstrap endpoint.
    """

    email: EmailStr


class PrecheckResponse(BaseModel):
    on_roster: bool = Field(
        description="True if at least one active roster entry matches the email."
    )
    course_count: int = Field(
        ge=0,
        description="Number of currently-active courses the email is enrolled in.",
    )


# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------


class UserRead(BaseModel):
    id: UUID
    primary_email: str
    display_name: str | None = None
    default_avatar_url: str | None = None


class CourseSummary(BaseModel):
    id: UUID
    code: str
    name: str
    semester: str
    timezone: str
    deadline_at: datetime


class EnrollmentRead(BaseModel):
    id: UUID
    course: CourseSummary
    section_id: UUID | None
    section_code: str | None
    role: str
    status: str
    joined_at: datetime


class BootstrapResponse(BaseModel):
    """Result of binding an authenticated user's identity to their roster.

    Idempotent. Calling twice returns the same shape — ``newly_enrolled``
    counts only the enrollments created by *this* call.
    """

    user: UserRead
    enrollments: list[EnrollmentRead]
    newly_enrolled_count: int = Field(
        ge=0,
        description="How many enrollments were created during this bootstrap call.",
    )
