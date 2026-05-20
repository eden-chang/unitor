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
    """Result of confirming an authenticated user's identity.

    Idempotent. Calling twice returns the same shape. Bootstrap does NOT
    create enrollments — :func:`app.services.auth_join.join` is the only
    way to enter a course (as of stage 1 step C, 2026-05-19).
    """

    user: UserRead
    enrollments: list[EnrollmentRead]


class JoinRequest(BaseModel):
    """Body of ``POST /api/v1/auth/join``.

    The invite code is the per-course shared secret printed on the TA's
    course-management screen and handed to students out-of-band.
    """

    invite_code: str = Field(min_length=1, max_length=64)


class UserUpdateRequest(BaseModel):
    """Body of ``PATCH /api/v1/users/me``.

    Today the only editable field on ``public.users`` is ``display_name``;
    other identity-bearing fields come from Supabase Auth and are not
    user-editable here.
    """

    display_name: str = Field(min_length=1, max_length=120)
