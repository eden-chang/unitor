"""Discovery service: read paths for the Discovery board.

Two surfaces:

* :func:`list_students` -- People view; classmates in this course with
  their public profile summary.
* :func:`list_groups`   -- Groups view; forming/recruiting groups with
  members + application questions.

Compatibility scoring (sort by Best Match) is intentionally out of scope
here. It's a separate read against ``compatibility_cache`` plumbed in
under task F; until then the default sort is "newest enrollment first".

## Query design

Both calls follow the same pattern:

1. ONE keyset-paginated query that joins the base entities and applies
   the filters.
2. A few small "hydration" queries that batch-fetch the related rows
   (skills, schedule slots, members, questions) for the page worth of
   ids returned by step 1.

That keeps the round-trip count at O(constants per page) regardless of
how many results we return, while letting us write the page query as
plain SQLAlchemy core. No N+1.

The session is a ``user_session`` so RLS already filters down to "rows
in courses I'm enrolled in". The service layer adds the business
filters (skill match, status, search) on top.
"""

from __future__ import annotations

import base64
import json
from collections import defaultdict
from collections.abc import Iterable, Sequence
from uuid import UUID

from sqlalchemy import (
    Select,
    and_,
    exists,
    func,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Enrollment,
    Group,
    GroupApplicationQuestion,
    GroupMembership,
    Profile,
    ProfileScheduleSlot,
    ProfileSkill,
    Section,
    User,
)
from app.schemas.discovery import (
    GroupApplicationQuestionRead,
    GroupListItem,
    GroupListResponse,
    GroupMemberRead,
    StudentListItem,
    StudentListResponse,
    StudentProfileSummary,
    StudentScheduleSlot,
    StudentSkillRead,
)

# ---------------------------------------------------------------------------
# Cursor encoding
# ---------------------------------------------------------------------------
# Opaque to clients. Backed by ``{"id": "<uuid>"}`` so we can extend later
# without breaking the wire format.


def _encode_cursor(payload: dict[str, str]) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str | None) -> dict[str, str] | None:
    if not cursor:
        return None
    try:
        pad = "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(cursor + pad).decode("utf-8")
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return None
        # Coerce all values to str so callers don't worry about types.
        return {k: str(v) for k, v in parsed.items() if isinstance(k, str)}
    except (ValueError, TypeError):
        return None


def _slice_page[T](items: Sequence[T], limit: int) -> tuple[list[T], bool]:
    """Apply the "fetch limit+1" pagination trick.

    We over-fetch by one row to determine if there's another page;
    callers display only the first ``limit`` items.
    """
    has_more = len(items) > limit
    return list(items[:limit]), has_more


# ---------------------------------------------------------------------------
# Students
# ---------------------------------------------------------------------------


# Maximum page size; refuses requests asking for more so a misbehaving
# client can't pull thousands of rows in one shot.
MAX_LIMIT = 100


def _student_base_query(
    course_id: UUID,
) -> Select[tuple[Enrollment, User, Section, Profile]]:
    """Join the rows that produce one row per student.

    The ``Profile`` column is conceptually ``Profile | None`` because of
    the LEFT JOIN. We type it as non-optional here to satisfy
    SQLAlchemy's typed-select machinery and handle the None case at the
    caller (``row.Profile is None``).
    """
    return (
        select(Enrollment, User, Section, Profile)
        .join(User, User.id == Enrollment.user_id)
        .join(Section, Section.id == Enrollment.section_id, isouter=False)
        .join(Profile, Profile.enrollment_id == Enrollment.id, isouter=True)
        .where(
            Enrollment.course_id == course_id,
            Enrollment.deleted_at.is_(None),
            Enrollment.role == "student",
            Enrollment.status == "active",
            User.deleted_at.is_(None),
        )
    )


async def list_students(
    db: AsyncSession,
    *,
    course_id: UUID,
    me_user_id: UUID,
    section_id: UUID | None = None,
    skill_id: UUID | None = None,
    search: str | None = None,
    cursor: str | None = None,
    limit: int = 50,
) -> StudentListResponse:
    """List students enrolled in ``course_id``.

    Excludes ``me_user_id`` so the caller doesn't see themselves on
    their own Discovery board.
    """
    limit = max(1, min(limit, MAX_LIMIT))
    fetch = limit + 1  # over-fetch by one to detect "has more"

    stmt = _student_base_query(course_id).where(Enrollment.user_id != me_user_id)

    if section_id is not None:
        stmt = stmt.where(Enrollment.section_id == section_id)

    if skill_id is not None:
        # EXISTS keeps us on one row per student (no JOIN-induced dupes).
        skill_subq = select(ProfileSkill.id).where(
            ProfileSkill.profile_id == Profile.id,
            ProfileSkill.course_skill_id == skill_id,
        )
        stmt = stmt.where(Profile.id.is_not(None)).where(exists(skill_subq))

    if search:
        pattern = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.display_name).like(pattern),
                func.lower(Profile.bio).like(pattern),
            )
        )

    cursor_payload = _decode_cursor(cursor)
    if cursor_payload and "enrollment_id" in cursor_payload:
        try:
            after = UUID(cursor_payload["enrollment_id"])
        except ValueError:
            after = None
        if after is not None:
            # UUIDv7 is time-ordered; lexicographic compare on the UUID
            # gives us "joined before X" without needing a separate
            # timestamp comparator.
            stmt = stmt.where(Enrollment.id < after)

    # Newest-joined first. Stable secondary sort on id (which IS the
    # primary sort, since UUIDv7 is time-ordered; the explicit ORDER BY
    # keeps the page boundary deterministic across clients).
    stmt = stmt.order_by(Enrollment.id.desc()).limit(fetch)

    rows = (await db.execute(stmt)).all()
    page_rows, has_more = _slice_page(rows, limit)

    if not page_rows:
        return StudentListResponse(items=[], next_cursor=None)

    profile_ids = [row.Profile.id for row in page_rows if row.Profile is not None]
    user_ids = [row.Enrollment.user_id for row in page_rows]
    skills_by_profile = await _load_skills_by_profile(db, profile_ids)
    slots_by_profile = await _load_schedule_by_profile(db, profile_ids)
    in_group_user_ids = await _user_ids_in_active_groups(db, course_id, user_ids)

    items: list[StudentListItem] = []
    for row in page_rows:
        enrollment = row.Enrollment
        user = row.User
        section = row.Section
        profile = row.Profile

        profile_summary: StudentProfileSummary | None = None
        if profile is not None:
            profile_summary = StudentProfileSummary(
                id=profile.id,
                bio=profile.bio,
                meeting_frequency=profile.meeting_frequency,
                meeting_style=profile.meeting_style,
                comm_tool=profile.comm_tool,
                avatar_url=profile.avatar_url,
                schedule_flexible=profile.schedule_flexible,
                last_active_at=profile.last_active_at,
                skills=skills_by_profile.get(profile.id, []),
                schedule_slots=slots_by_profile.get(profile.id, []),
            )

        items.append(
            StudentListItem(
                user_id=user.id,
                enrollment_id=enrollment.id,
                display_name=user.display_name,
                section_id=enrollment.section_id,
                section_code=section.code if section is not None else None,
                profile=profile_summary,
                group_status="in_group" if user.id in in_group_user_ids else "solo",
                joined_at=enrollment.joined_at,
            )
        )

    next_cursor: str | None = None
    if has_more:
        last = page_rows[-1].Enrollment
        next_cursor = _encode_cursor({"enrollment_id": str(last.id)})

    return StudentListResponse(items=items, next_cursor=next_cursor)


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------


async def list_groups(
    db: AsyncSession,
    *,
    course_id: UUID,
    section_id: UUID | None = None,
    recruiting_only: bool = False,
    states: Iterable[str] | None = None,
    cursor: str | None = None,
    limit: int = 50,
) -> GroupListResponse:
    """List groups in ``course_id``.

    ``section_id`` filters to groups whose leader is in that section (the
    UX shows section filters even though groups themselves aren't
    section-locked; the leader's section is the practical proxy).
    """
    limit = max(1, min(limit, MAX_LIMIT))
    fetch = limit + 1

    stmt = select(Group).where(Group.course_id == course_id, Group.deleted_at.is_(None))

    if recruiting_only:
        stmt = stmt.where(Group.recruiting.is_(True), Group.state == "forming")

    state_list = [s for s in (states or []) if s]
    if state_list:
        stmt = stmt.where(Group.state.in_(state_list))

    if section_id is not None:
        # Filter to groups with at least one active member in the section.
        # This is more useful than leader-section: a recruiting group is
        # discoverable by anyone whose section overlaps the group.
        stmt = stmt.where(
            exists(
                select(GroupMembership.id)
                .join(Enrollment, Enrollment.id == GroupMembership.enrollment_id)
                .where(
                    GroupMembership.group_id == Group.id,
                    GroupMembership.left_at.is_(None),
                    Enrollment.section_id == section_id,
                )
            )
        )

    cursor_payload = _decode_cursor(cursor)
    if cursor_payload and "group_id" in cursor_payload:
        try:
            after = UUID(cursor_payload["group_id"])
        except ValueError:
            after = None
        if after is not None:
            stmt = stmt.where(Group.id < after)

    stmt = stmt.order_by(Group.id.desc()).limit(fetch)

    groups = (await db.execute(stmt)).scalars().all()
    page_groups, has_more = _slice_page(groups, limit)

    if not page_groups:
        return GroupListResponse(items=[], next_cursor=None)

    group_ids = [g.id for g in page_groups]
    members_by_group, leader_by_group = await _load_members_by_group(db, group_ids)
    questions_by_group = await _load_questions_by_group(db, group_ids)

    items = [
        GroupListItem(
            id=g.id,
            course_id=g.course_id,
            name=g.name,
            description=g.description,
            state=g.state,
            recruiting=g.recruiting,
            members=members_by_group.get(g.id, []),
            leader=leader_by_group.get(g.id),
            application_questions=questions_by_group.get(g.id, []),
            confirmation_deadline_at=g.confirmation_deadline_at,
            created_at=g.created_at,
        )
        for g in page_groups
    ]

    next_cursor: str | None = None
    if has_more:
        next_cursor = _encode_cursor({"group_id": str(page_groups[-1].id)})

    return GroupListResponse(items=items, next_cursor=next_cursor)


# ---------------------------------------------------------------------------
# Hydration helpers
# ---------------------------------------------------------------------------


async def _load_skills_by_profile(
    db: AsyncSession, profile_ids: Sequence[UUID]
) -> dict[UUID, list[StudentSkillRead]]:
    if not profile_ids:
        return {}
    stmt = select(ProfileSkill).where(ProfileSkill.profile_id.in_(profile_ids))
    rows = (await db.execute(stmt)).scalars().all()
    out: dict[UUID, list[StudentSkillRead]] = defaultdict(list)
    for row in rows:
        out[row.profile_id].append(
            StudentSkillRead(
                course_skill_id=row.course_skill_id,
                proficiency=row.proficiency,
            )
        )
    return out


async def _load_schedule_by_profile(
    db: AsyncSession, profile_ids: Sequence[UUID]
) -> dict[UUID, list[StudentScheduleSlot]]:
    if not profile_ids:
        return {}
    stmt = select(ProfileScheduleSlot).where(ProfileScheduleSlot.profile_id.in_(profile_ids))
    rows = (await db.execute(stmt)).scalars().all()
    out: dict[UUID, list[StudentScheduleSlot]] = defaultdict(list)
    for row in rows:
        out[row.profile_id].append(
            StudentScheduleSlot(
                day_of_week=row.day_of_week,
                time_band=row.time_band,
            )
        )
    return out


async def _user_ids_in_active_groups(
    db: AsyncSession, course_id: UUID, user_ids: Sequence[UUID]
) -> set[UUID]:
    if not user_ids:
        return set()
    stmt = (
        select(GroupMembership.user_id)
        .join(Group, Group.id == GroupMembership.group_id)
        .where(
            Group.course_id == course_id,
            Group.deleted_at.is_(None),
            Group.state != "disbanded",
            GroupMembership.user_id.in_(user_ids),
            GroupMembership.left_at.is_(None),
        )
    )
    rows = await db.execute(stmt)
    return {row[0] for row in rows}


async def _load_members_by_group(
    db: AsyncSession, group_ids: Sequence[UUID]
) -> tuple[dict[UUID, list[GroupMemberRead]], dict[UUID, GroupMemberRead | None]]:
    members_by_group: dict[UUID, list[GroupMemberRead]] = defaultdict(list)
    leader_by_group: dict[UUID, GroupMemberRead | None] = {}
    if not group_ids:
        return members_by_group, leader_by_group

    stmt = (
        select(GroupMembership, User)
        .join(User, User.id == GroupMembership.user_id)
        .where(
            GroupMembership.group_id.in_(group_ids),
            GroupMembership.left_at.is_(None),
            and_(User.deleted_at.is_(None)),
        )
        .order_by(GroupMembership.joined_at.asc())
    )
    rows = (await db.execute(stmt)).all()
    for row in rows:
        gm = row.GroupMembership
        user = row.User
        member = GroupMemberRead(
            user_id=user.id,
            display_name=user.display_name,
            role=gm.role,
            joined_at=gm.joined_at,
        )
        members_by_group[gm.group_id].append(member)
        if gm.role == "leader":
            leader_by_group[gm.group_id] = member

    # Ensure every requested group has a leader entry, even if null.
    for gid in group_ids:
        leader_by_group.setdefault(gid, None)
    return members_by_group, leader_by_group


async def _load_questions_by_group(
    db: AsyncSession, group_ids: Sequence[UUID]
) -> dict[UUID, list[GroupApplicationQuestionRead]]:
    if not group_ids:
        return {}
    stmt = (
        select(GroupApplicationQuestion)
        .where(
            GroupApplicationQuestion.group_id.in_(group_ids),
            GroupApplicationQuestion.is_archived.is_(False),
        )
        .order_by(GroupApplicationQuestion.display_order.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    out: dict[UUID, list[GroupApplicationQuestionRead]] = defaultdict(list)
    for q in rows:
        out[q.group_id].append(
            GroupApplicationQuestionRead(
                id=q.id,
                question_text=q.question_text,
                display_order=q.display_order,
            )
        )
    return out
