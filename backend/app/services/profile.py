"""Profile service.

Owns the create / update / read flow for ``profiles`` and its three
child tables (``profile_skills``, ``profile_schedule_slots``,
``profile_links``). Uses ``user_session`` so RLS enforces "own profile
only" at the database layer.

Completion criteria (per the prototype's UX gates):

* >= 2 skills selected
* bio is non-empty
* at least 1 schedule slot OR ``schedule_flexible = True``
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid_utils.compat import uuid7

from app.db.models import (
    CourseSkill,
    Enrollment,
    Profile,
    ProfileLink,
    ProfileScheduleSlot,
    ProfileSkill,
)
from app.schemas.profile import (
    CompletionResponse,
    LinkEntry,
    LinkRead,
    ProfileCreate,
    ProfileRead,
    ProfileUpdate,
    ScheduleReplace,
    ScheduleSlot,
    SkillEntry,
    SkillRead,
    SkillsReplace,
)

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class ProfileAlreadyExists(Exception):
    """A profile already exists for this enrollment."""


class ProfileNotFound(Exception):
    """No profile with this id (or RLS filtered it out)."""


class EnrollmentNotFound(Exception):
    """Enrollment id doesn't exist, isn't visible, or isn't active."""


class InvalidSkill(Exception):
    """Skill id doesn't belong to the same course as the enrollment."""


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def create_profile(
    session: AsyncSession,
    payload: ProfileCreate,
) -> ProfileRead:
    """Create a profile + all child rows in a single transaction.

    RLS will reject the INSERT if ``payload.enrollment_id`` doesn't
    belong to the current user. We additionally validate that referenced
    ``course_skill_id`` values are in the same course's catalog.
    """
    # Reject if a profile already exists.
    existing = await session.execute(
        select(Profile.id).where(Profile.enrollment_id == payload.enrollment_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise ProfileAlreadyExists(str(payload.enrollment_id))

    # Look up the enrollment so we know the course_id for skill validation.
    enrollment = await _load_enrollment(session, payload.enrollment_id)

    if payload.skills:
        await _validate_skill_ids(
            session, enrollment_course_id=enrollment.course_id, skills=payload.skills
        )

    now = datetime.now(UTC)
    profile = Profile(
        id=uuid7(),
        enrollment_id=payload.enrollment_id,
        bio=payload.bio,
        meeting_frequency=payload.meeting_frequency,
        meeting_style=payload.meeting_style,
        comm_tool=payload.comm_tool,
        comm_handle=payload.comm_handle,
        avatar_url=None,
        schedule_flexible=payload.schedule_flexible,
        last_active_at=now,
        created_at=now,
        updated_at=now,
    )
    session.add(profile)
    await session.flush()

    for skill in payload.skills:
        session.add(
            ProfileSkill(
                id=uuid7(),
                profile_id=profile.id,
                course_skill_id=skill.course_skill_id,
                proficiency=skill.proficiency,
            )
        )

    for slot in payload.schedule_slots:
        session.add(
            ProfileScheduleSlot(
                profile_id=profile.id,
                day_of_week=slot.day_of_week,
                time_band=slot.time_band,
            )
        )

    for link in payload.links:
        session.add(
            ProfileLink(
                id=uuid7(),
                profile_id=profile.id,
                label=link.label,
                url=str(link.url),
                display_order=link.display_order,
            )
        )

    await session.flush()
    return await _hydrate(session, profile)


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


async def get_profile_by_id(
    session: AsyncSession,
    profile_id: UUID,
) -> ProfileRead:
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise ProfileNotFound(str(profile_id))
    return await _hydrate(session, profile)


async def get_my_profile_for_course(
    session: AsyncSession,
    *,
    user_id: UUID,
    course_id: UUID,
) -> ProfileRead | None:
    """Return the current user's profile in this course, or None."""
    stmt = (
        select(Profile)
        .join(Enrollment, Enrollment.id == Profile.enrollment_id)
        .where(Enrollment.user_id == user_id)
        .where(Enrollment.course_id == course_id)
        .where(Enrollment.deleted_at.is_(None))
    )
    profile = (await session.execute(stmt)).scalar_one_or_none()
    if profile is None:
        return None
    return await _hydrate(session, profile)


# ---------------------------------------------------------------------------
# Update (scalar fields)
# ---------------------------------------------------------------------------


async def update_profile(
    session: AsyncSession,
    profile_id: UUID,
    payload: ProfileUpdate,
) -> ProfileRead:
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise ProfileNotFound(str(profile_id))

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(profile, field, value)

    if changes:
        profile.updated_at = datetime.now(UTC)
        await session.flush()

    return await _hydrate(session, profile)


# ---------------------------------------------------------------------------
# Skills replace
# ---------------------------------------------------------------------------


async def replace_skills(
    session: AsyncSession,
    profile_id: UUID,
    payload: SkillsReplace,
) -> list[SkillRead]:
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise ProfileNotFound(str(profile_id))

    enrollment = await _load_enrollment(session, profile.enrollment_id)
    if payload.skills:
        await _validate_skill_ids(
            session, enrollment_course_id=enrollment.course_id, skills=payload.skills
        )

    # Wipe existing first, flush, THEN insert. SQLAlchemy's unit-of-work
    # can otherwise emit the INSERT before the DELETE and trigger the
    # unique constraint on (profile_id, course_skill_id).
    await session.execute(delete(ProfileSkill).where(ProfileSkill.profile_id == profile_id))
    await session.flush()

    new_rows: list[ProfileSkill] = []
    for skill in payload.skills:
        row = ProfileSkill(
            id=uuid7(),
            profile_id=profile_id,
            course_skill_id=skill.course_skill_id,
            proficiency=skill.proficiency,
        )
        session.add(row)
        new_rows.append(row)

    profile.updated_at = datetime.now(UTC)
    await session.flush()

    return [
        SkillRead(id=row.id, course_skill_id=row.course_skill_id, proficiency=row.proficiency)
        for row in new_rows
    ]


# ---------------------------------------------------------------------------
# Schedule replace
# ---------------------------------------------------------------------------


async def replace_schedule(
    session: AsyncSession,
    profile_id: UUID,
    payload: ScheduleReplace,
) -> list[ScheduleSlot]:
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise ProfileNotFound(str(profile_id))

    # Same DELETE-then-INSERT pattern as replace_skills — composite PK
    # collides if the new set overlaps with the old, so we must flush
    # the delete before issuing the inserts.
    await session.execute(
        delete(ProfileScheduleSlot).where(ProfileScheduleSlot.profile_id == profile_id)
    )
    await session.flush()

    new_rows: list[ProfileScheduleSlot] = []
    for slot in payload.slots:
        row = ProfileScheduleSlot(
            profile_id=profile_id,
            day_of_week=slot.day_of_week,
            time_band=slot.time_band,
        )
        session.add(row)
        new_rows.append(row)

    profile.schedule_flexible = payload.schedule_flexible
    profile.updated_at = datetime.now(UTC)
    await session.flush()

    return [ScheduleSlot(day_of_week=row.day_of_week, time_band=row.time_band) for row in new_rows]


# ---------------------------------------------------------------------------
# Completion check
# ---------------------------------------------------------------------------


async def check_completion(
    session: AsyncSession,
    profile_id: UUID,
) -> CompletionResponse:
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise ProfileNotFound(str(profile_id))

    missing: list[str] = []

    if not profile.bio or not profile.bio.strip():
        missing.append("bio")

    skill_count = (
        await session.execute(select(ProfileSkill.id).where(ProfileSkill.profile_id == profile_id))
    ).all()
    if len(skill_count) < 2:
        missing.append("at_least_two_skills")

    if not profile.schedule_flexible:
        slot_count = (
            await session.execute(
                select(ProfileScheduleSlot.profile_id).where(
                    ProfileScheduleSlot.profile_id == profile_id
                )
            )
        ).all()
        if not slot_count:
            missing.append("schedule_or_flexible")

    # Bump activity timestamp on every completion check; the frontend
    # hits this every time the user opens the profile screen, so it's a
    # cheap proxy for "user is around."
    profile.last_active_at = datetime.now(UTC)
    await session.flush()

    return CompletionResponse(is_complete=not missing, missing=missing)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def delete_profile(
    session: AsyncSession,
    profile_id: UUID,
) -> None:
    """Hard-delete the profile. Child rows cascade.

    The enrollment row is untouched -- leaving the course is a separate
    operation. RLS will already filter out profiles the caller doesn't
    own, so we just need to confirm the row exists (or surface 404).
    """
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise ProfileNotFound(str(profile_id))
    await session.delete(profile)
    await session.flush()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_enrollment(session: AsyncSession, enrollment_id: UUID) -> Enrollment:
    enrollment = await session.get(Enrollment, enrollment_id)
    if enrollment is None or enrollment.deleted_at is not None:
        raise EnrollmentNotFound(str(enrollment_id))
    return enrollment


async def _validate_skill_ids(
    session: AsyncSession,
    *,
    enrollment_course_id: UUID,
    skills: list[SkillEntry],
) -> None:
    """Confirm every course_skill_id belongs to the same course."""
    ids = [s.course_skill_id for s in skills]
    if not ids:
        return
    stmt = select(CourseSkill.id).where(
        CourseSkill.id.in_(ids), CourseSkill.course_id == enrollment_course_id
    )
    found = {row[0] for row in (await session.execute(stmt)).all()}
    missing = set(ids) - found
    if missing:
        raise InvalidSkill(", ".join(str(m) for m in missing))


async def _hydrate(session: AsyncSession, profile: Profile) -> ProfileRead:
    """Return a ``ProfileRead`` with all child rows attached."""
    skills_rows = (
        (await session.execute(select(ProfileSkill).where(ProfileSkill.profile_id == profile.id)))
        .scalars()
        .all()
    )
    slot_rows = (
        (
            await session.execute(
                select(ProfileScheduleSlot).where(ProfileScheduleSlot.profile_id == profile.id)
            )
        )
        .scalars()
        .all()
    )
    link_rows = (
        (
            await session.execute(
                select(ProfileLink)
                .where(ProfileLink.profile_id == profile.id)
                .order_by(ProfileLink.display_order)
            )
        )
        .scalars()
        .all()
    )

    return ProfileRead(
        id=profile.id,
        enrollment_id=profile.enrollment_id,
        bio=profile.bio,
        meeting_frequency=profile.meeting_frequency,
        meeting_style=profile.meeting_style,
        comm_tool=profile.comm_tool,
        comm_handle=profile.comm_handle,
        avatar_url=profile.avatar_url,
        schedule_flexible=profile.schedule_flexible,
        last_active_at=profile.last_active_at,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        skills=[
            SkillRead(id=s.id, course_skill_id=s.course_skill_id, proficiency=s.proficiency)
            for s in skills_rows
        ],
        schedule_slots=[
            ScheduleSlot(day_of_week=r.day_of_week, time_band=r.time_band) for r in slot_rows
        ],
        links=[
            LinkRead(
                id=row.id,
                label=row.label,
                url=row.url,
                display_order=row.display_order,
            )
            for row in link_rows
        ],
    )


# Silence ruff: LinkEntry is part of the public API of the schema module
# we import from, but isn't used directly here. Keeping the import so the
# IDE jump-to-definition resolves.
_ = LinkEntry
