"""Auth bootstrap service.

See `../07-auth-flows.md` for the end-to-end flow. This module owns:

* :func:`precheck` — public lookup: "is this email on an active roster?"
* :func:`bootstrap` — authenticated: link auth.users -> roster_entries +
  create enrollments. Idempotent.

Both functions take an :class:`AsyncSession` so callers control the
session lifecycle (and we can test with an arbitrary session). Per ADR
0002 + ADR 0009 §2, this service is one of the legal places where the
session can be an ``admin_session`` (RLS-bypassing) — bootstrap creates
the rows that *make* RLS visibility possible.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid_utils.compat import uuid7

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


class RosterEmailNotFound(Exception):
    """The signed-in user's email is not on any active roster."""


async def bootstrap(
    session: AsyncSession,
    current_user: CurrentUser,
) -> BootstrapResponse:
    """Link the authenticated user to their roster entries and create missing
    enrollments.

    Idempotent. Safe to call on every login. On first call, it creates the
    public.users row defensively (the auth.users trigger usually does this
    already), links roster_entries.user_id, and inserts enrollments. On
    subsequent calls, it returns the existing state with ``newly_enrolled_count = 0``.
    """
    if not current_user.email:
        # Supabase JWTs from magic link include email; this is defensive.
        raise RosterEmailNotFound("token has no email claim")

    email = current_user.email.lower()
    user_id = current_user.id
    now = datetime.now(UTC)

    # 1. Make sure public.users row exists (the trigger usually does this,
    #    but be defensive — e.g., if the trigger was disabled or this is
    #    a re-bootstrap after manual cleanup).
    user = await _upsert_user(session, user_id=user_id, primary_email=email, now=now)

    # 2. Find roster entries that match this user's email and aren't already
    #    linked to a different user. Active rosters only (course not deleted,
    #    roster row not removed).
    match_stmt = (
        select(RosterEntry, Course)
        .join(Course, Course.id == RosterEntry.course_id)
        .where(func.lower(RosterEntry.email) == email)
        .where(RosterEntry.removed_at.is_(None))
        .where(Course.state == "active")
        .where(Course.deleted_at.is_(None))
        .where((RosterEntry.user_id.is_(None)) | (RosterEntry.user_id == user_id))
    )
    rows = (await session.execute(match_stmt)).all()
    if not rows:
        raise RosterEmailNotFound(email)

    newly_enrolled = 0
    for roster, course in rows:
        # 3a. Link the roster entry if it isn't yet.
        if roster.user_id is None:
            roster.user_id = user_id

        # 3b. Create an active enrollment if one doesn't already exist.
        existing_enrollment = await session.execute(
            select(Enrollment.id)
            .where(Enrollment.user_id == user_id)
            .where(Enrollment.course_id == course.id)
            .where(Enrollment.deleted_at.is_(None))
        )
        if existing_enrollment.scalar_one_or_none() is None:
            session.add(
                Enrollment(
                    id=uuid7(),
                    user_id=user_id,
                    course_id=course.id,
                    section_id=roster.section_id,
                    role="student",
                    status="active",
                    joined_at=now,
                    created_at=now,
                    updated_at=now,
                )
            )
            newly_enrolled += 1

    await session.flush()

    # 4. Build the response from the current state (covers both newly-created
    #    and pre-existing enrollments).
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
        newly_enrolled_count=newly_enrolled,
    )


async def _upsert_user(
    session: AsyncSession,
    *,
    user_id: str,
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
