"""Course-join service.

See ``../07-auth-flows.md`` for the end-to-end flow. As of stage 1 step
C (2026-05-19), enrollment requires an invite code: bootstrap no longer
auto-enrolls anyone, even if their email is on a roster.

Flow:

1. Look up the course by ``invite_code``. If none, raise
   :class:`InviteCodeNotFound` (404).
2. Look up the caller's ``roster_entry`` for that course by lower(email).
   If none, raise :class:`NotInRoster` (403) — the invite code is per-
   course but the roster still gates who that course is for.
3. If the caller already has an active enrollment for that course, raise
   :class:`AlreadyEnrolled` (409).
4. Otherwise create an ``enrollments`` row using the section the TA
   assigned on the roster entry.

Per ADR 0002 + ADR 0009 §2, this service is one of the legal places
that may run inside an :func:`app.db.admin.admin_session`. We need it:
the caller's RLS context does not yet allow them to read roster rows on
this course (they're not enrolled yet), and they must be able to insert
into ``enrollments`` for themselves.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid_utils.compat import uuid7

from app.auth.jwt import CurrentUser
from app.db.models import Course, Enrollment, RosterEntry, Section
from app.schemas.auth import CourseSummary, EnrollmentRead


class InviteCodeNotFound(Exception):
    """No active course matches the given invite code."""


class NotInRoster(Exception):
    """The caller's email is not on this course's roster."""


class AlreadyEnrolled(Exception):
    """The caller already has an active enrollment for this course."""


async def join(
    session: AsyncSession,
    current_user: CurrentUser,
    invite_code: str,
) -> EnrollmentRead:
    """Create an enrollment for the caller in the course matching ``invite_code``.

    Idempotent only across distinct courses — calling twice with the same
    invite code raises :class:`AlreadyEnrolled` on the second call.
    """
    if not current_user.email:
        raise NotInRoster("token has no email claim")

    email = current_user.email.lower()
    user_id = UUID(current_user.id)
    now = datetime.now(UTC)

    course = await _find_active_course_by_invite(session, invite_code)
    if course is None:
        raise InviteCodeNotFound(invite_code)

    roster = await _find_roster_entry(session, course_id=course.id, email=email)
    if roster is None:
        raise NotInRoster(email)

    existing = await session.execute(
        select(Enrollment.id)
        .where(Enrollment.user_id == user_id)
        .where(Enrollment.course_id == course.id)
        .where(Enrollment.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none() is not None:
        raise AlreadyEnrolled(str(course.id))

    if roster.user_id is None:
        roster.user_id = user_id

    enrollment = Enrollment(
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
    session.add(enrollment)
    await session.flush()

    section_code: str | None = None
    if enrollment.section_id is not None:
        section_code = await session.scalar(
            select(Section.code).where(Section.id == enrollment.section_id)
        )

    return EnrollmentRead(
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


async def _find_active_course_by_invite(session: AsyncSession, invite_code: str) -> Course | None:
    stmt = (
        select(Course)
        .where(Course.invite_code == invite_code)
        .where(Course.state == "active")
        .where(Course.deleted_at.is_(None))
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def _find_roster_entry(
    session: AsyncSession, *, course_id: object, email: str
) -> RosterEntry | None:
    stmt = (
        select(RosterEntry)
        .where(RosterEntry.course_id == course_id)
        .where(func.lower(RosterEntry.email) == email)
        .where(RosterEntry.removed_at.is_(None))
    )
    return (await session.execute(stmt)).scalar_one_or_none()
