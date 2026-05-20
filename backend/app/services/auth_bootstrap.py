"""Auth bootstrap service.

See `../07-auth-flows.md` for the end-to-end flow. This module owns:

* :func:`precheck` — public lookup: "is this email on any active roster?"
* :func:`bootstrap` — authenticated: ensure the ``public.users`` row
  exists and return the caller's current enrollments. Idempotent.

Bootstrap **no longer** creates enrollments from ``roster_entries``. As
of 2026-05-19 (stage 1 step C), enrollment requires an invite code; see
:mod:`app.services.auth_join`. Rationale: TAs upload the roster (and pick
the section) but the invite code is the gate that decides which course a
logged-in student is allowed to join.

Both functions take an :class:`AsyncSession` so callers control the
session lifecycle (and we can test with an arbitrary session). Per ADR
0002 + ADR 0009 §2, this service is one of the legal places where the
session can be an ``admin_session`` (RLS-bypassing) — bootstrap creates
the ``public.users`` row that *makes* RLS visibility possible elsewhere.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import CurrentUser
from app.db.models import Course, Enrollment, RosterEntry, Section, User
from app.schemas.auth import (
    BootstrapResponse,
    CourseSummary,
    EnrollmentRead,
    PrecheckResponse,
    UserRead,
)

# ---------------------------------------------------------------------------
# Precheck
# ---------------------------------------------------------------------------


async def precheck(session: AsyncSession, email: str) -> PrecheckResponse:
    """Return whether the email matches any active roster.

    Public surface — does NOT reveal course names. Privacy rationale lives
    in ``schemas/auth.py``.
    """
    stmt = (
        select(func.count())
        .select_from(RosterEntry)
        .join(Course, Course.id == RosterEntry.course_id)
        .where(func.lower(RosterEntry.email) == email.lower())
        .where(RosterEntry.removed_at.is_(None))
        .where(Course.state == "active")
        .where(Course.deleted_at.is_(None))
    )
    result = await session.execute(stmt)
    count = int(result.scalar_one())
    return PrecheckResponse(on_roster=count > 0, course_count=count)


# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------


class MissingEmailClaim(Exception):
    """The verified JWT did not include an email claim."""


async def bootstrap(
    session: AsyncSession,
    current_user: CurrentUser,
) -> BootstrapResponse:
    """Ensure the caller's ``public.users`` row exists and return their state.

    Idempotent. Safe to call on every login. On first call, defensively
    creates the ``public.users`` row (the ``tg_mirror_auth_user`` trigger
    usually does this already). It does **not** create enrollments —
    new enrollments now require :func:`app.services.auth_join.join`.
    """
    if not current_user.email:
        # Supabase JWTs from magic link include email; this is defensive.
        raise MissingEmailClaim("token has no email claim")

    email = current_user.email.lower()
    user_id = UUID(current_user.id)
    now = datetime.now(UTC)

    user = await _upsert_user(session, user_id=user_id, primary_email=email, now=now)

    # Best-effort backfill: if a roster_entry exists for this email but
    # isn't linked yet, claim it. This is a convenience for the TA-side
    # roster view; it does NOT create enrollments. Bound to active courses
    # so a stale roster row on an archived course is left alone.
    link_stmt = (
        select(RosterEntry)
        .join(Course, Course.id == RosterEntry.course_id)
        .where(func.lower(RosterEntry.email) == email)
        .where(RosterEntry.user_id.is_(None))
        .where(RosterEntry.removed_at.is_(None))
        .where(Course.state == "active")
        .where(Course.deleted_at.is_(None))
    )
    for roster in (await session.execute(link_stmt)).scalars():
        roster.user_id = user_id

    enrollments_stmt = (
        select(Enrollment, Course, Section.code)
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Section, Section.id == Enrollment.section_id)
        .where(Enrollment.user_id == user_id)
        .where(Enrollment.deleted_at.is_(None))
        .order_by(Enrollment.joined_at.desc())
    )
    enrollment_rows = (await session.execute(enrollments_stmt)).all()

    return BootstrapResponse(
        user=UserRead(
            id=user.id,
            primary_email=user.primary_email,
            display_name=user.display_name,
            default_avatar_url=user.default_avatar_url,
        ),
        enrollments=[
            EnrollmentRead(
                id=enrollment.id,
                course=CourseSummary(
                    id=course.id,
                    code=course.code,
                    name=course.name,
                    semester=course.semester,
                    timezone=course.timezone,
                    deadline_at=course.deadline_at,
                ),
                section_id=enrollment.section_id,
                section_code=section_code,
                role=enrollment.role,
                status=enrollment.status,
                joined_at=enrollment.joined_at,
            )
            for enrollment, course, section_code in enrollment_rows
        ],
    )


async def _upsert_user(
    session: AsyncSession,
    *,
    user_id: UUID,
    primary_email: str,
    now: datetime,
) -> User:
    """Fetch ``public.users[user_id]``, creating it if missing.

    Normally the ``tg_mirror_auth_user`` trigger handles creation. We do
    it here defensively so bootstrap is robust even if the trigger is
    delayed or missing.
    """
    existing = await session.execute(select(User).where(User.id == user_id))
    user = existing.scalar_one_or_none()
    if user is not None:
        if user.primary_email != primary_email:
            user.primary_email = primary_email
            user.updated_at = now
            await session.flush()
        return user

    user = User(
        id=user_id,
        primary_email=primary_email,
        display_name=None,
        default_avatar_url=None,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    await session.flush()
    return user
