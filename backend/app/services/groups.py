"""Group lifecycle service.

Writes for the groups domain (Discovery's read side lives in
``app/services/discovery.py``). Per migration 0004, group writes
flow through the service role — RLS only has SELECT policies for
the groups family. Callers wire this through ``admin_session()``
and the service performs explicit authorization checks against the
``group_memberships`` table.

Lifecycle:

* ``create_group(current_user, enrollment_id, ...)`` — creates a
  `forming` group with the caller as leader. Rejects if the caller
  is already in another non-disbanded group for the same course.
* ``get_group(group_id)`` — full detail, including current
  memberships and active application questions.
* ``update_group(current_user, group_id, payload)`` — leader-only
  edit of name / description / recruiting + replace-set application
  questions.
* ``apply_to_group(current_user, group_id, answers)`` — creates a
  pending application + answers.
* ``accept_application(current_user, application_id)`` /
  ``decline_application(current_user, application_id)`` — leader
  decision. Accept adds the applicant as a member.
* ``leave_group(current_user, group_id)`` — marks ``left_at``. If
  the leader leaves and another member remains, the oldest member
  is promoted; if the leader leaves alone, the group is disbanded.
* ``confirm_group(current_user, group_id)`` — transitions to
  `confirming` then `confirmed` once every member's
  ``confirmed_at`` is set.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid_utils.compat import uuid7

from app.auth.jwt import CurrentUser
from app.db.models import (
    Application,
    ApplicationAnswer,
    Enrollment,
    Group,
    GroupApplicationQuestion,
    GroupMembership,
    User,
)
from app.schemas.groups import (
    ApplicationAnswerRead,
    ApplicationCreate,
    ApplicationRead,
    GroupApplicationQuestionEntry,
    GroupApplicationQuestionRead,
    GroupCreate,
    GroupDetailRead,
    GroupMemberDetail,
    GroupUpdate,
)

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class GroupNotFound(Exception):
    """No (non-deleted) group with this id."""


class EnrollmentNotFound(Exception):
    """Caller's enrollment id doesn't exist or isn't active."""


class AlreadyInGroup(Exception):
    """Caller already has an active membership for this course."""


class NotALeader(Exception):
    """Caller is not the active leader of this group."""


class NotAMember(Exception):
    """Caller is not an active member of this group."""


class GroupNotRecruiting(Exception):
    """The target group has its `recruiting` flag off."""


class GroupAlreadyConfirmed(Exception):
    """The target group is already past the recruiting state."""


class ApplicationNotFound(Exception):
    """No application matches this id, or RLS scope hid it."""


class ApplicationAlreadyResponded(Exception):
    """Application has already been accepted / declined / withdrawn."""


class DuplicateApplication(Exception):
    """Caller already has a pending application for this group."""


class InvalidQuestion(Exception):
    """One of the supplied answer.question_ids isn't on the group."""


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def create_group(
    session: AsyncSession,
    current_user: CurrentUser,
    payload: GroupCreate,
) -> GroupDetailRead:
    """Create a forming group with the caller as the sole leader."""
    user_id = UUID(current_user.id)
    now = datetime.now(UTC)

    enrollment = await _load_enrollment_for_user(session, payload.enrollment_id, user_id)

    # Reject if the user already has an active membership in this course.
    existing_membership = await session.execute(
        select(GroupMembership.id)
        .join(Group, Group.id == GroupMembership.group_id)
        .where(Group.course_id == enrollment.course_id)
        .where(Group.deleted_at.is_(None))
        .where(Group.state != "disbanded")
        .where(GroupMembership.user_id == user_id)
        .where(GroupMembership.left_at.is_(None))
    )
    if existing_membership.scalar_one_or_none() is not None:
        raise AlreadyInGroup(str(enrollment.course_id))

    group = Group(
        id=uuid7(),
        course_id=enrollment.course_id,
        name=payload.name,
        description=payload.description,
        state="forming",
        recruiting=payload.recruiting,
        created_at=now,
        updated_at=now,
    )
    session.add(group)
    await session.flush()

    session.add(
        GroupMembership(
            id=uuid7(),
            group_id=group.id,
            user_id=user_id,
            enrollment_id=enrollment.id,
            role="leader",
            joined_at=now,
        )
    )

    for entry in payload.application_questions:
        session.add(
            GroupApplicationQuestion(
                id=uuid7(),
                group_id=group.id,
                question_text=entry.question_text,
                display_order=entry.display_order,
                is_archived=False,
                created_at=now,
            )
        )
    await session.flush()

    return await get_group(session, group.id)


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


async def get_group(session: AsyncSession, group_id: UUID) -> GroupDetailRead:
    group = await _load_group(session, group_id)

    members = await _load_members(session, group_id)
    questions = await _load_active_questions(session, group_id)

    return GroupDetailRead(
        id=group.id,
        course_id=group.course_id,
        name=group.name,
        description=group.description,
        state=group.state,
        recruiting=group.recruiting,
        members=members,
        application_questions=questions,
        confirmation_initiated_at=group.confirmation_initiated_at,
        confirmation_deadline_at=group.confirmation_deadline_at,
        confirmed_at=group.confirmed_at,
        created_at=group.created_at,
    )


# ---------------------------------------------------------------------------
# Update — leader edits
# ---------------------------------------------------------------------------


async def update_group(
    session: AsyncSession,
    current_user: CurrentUser,
    group_id: UUID,
    payload: GroupUpdate,
) -> GroupDetailRead:
    user_id = UUID(current_user.id)
    group = await _load_group(session, group_id)
    await _require_leader(session, group_id, user_id)
    now = datetime.now(UTC)

    if payload.name is not None:
        group.name = payload.name
    if payload.description is not None:
        group.description = payload.description
    if payload.recruiting is not None:
        group.recruiting = payload.recruiting
    group.updated_at = now

    if payload.application_questions is not None:
        await _replace_questions(session, group_id, payload.application_questions, now=now)

    await session.flush()
    return await get_group(session, group_id)


# ---------------------------------------------------------------------------
# Apply (applicant) + decide (leader)
# ---------------------------------------------------------------------------


async def apply_to_group(
    session: AsyncSession,
    current_user: CurrentUser,
    group_id: UUID,
    payload: ApplicationCreate,
) -> ApplicationRead:
    user_id = UUID(current_user.id)
    group = await _load_group(session, group_id)

    if not group.recruiting:
        raise GroupNotRecruiting(str(group_id))
    if group.state not in {"forming", "confirming"}:
        raise GroupAlreadyConfirmed(str(group_id))

    # Reject duplicate pending application from the same applicant.
    dup = await session.execute(
        select(Application.id)
        .where(Application.group_id == group_id)
        .where(Application.applicant_user_id == user_id)
        .where(Application.status == "pending")
    )
    if dup.scalar_one_or_none() is not None:
        raise DuplicateApplication(str(group_id))

    # Reject if the applicant is already a member of the group.
    in_group = await session.execute(
        select(GroupMembership.id)
        .where(GroupMembership.group_id == group_id)
        .where(GroupMembership.user_id == user_id)
        .where(GroupMembership.left_at.is_(None))
    )
    if in_group.scalar_one_or_none() is not None:
        raise AlreadyInGroup(str(group_id))

    questions = await _load_active_questions(session, group_id)
    valid_question_ids = {q.id for q in questions}
    snapshots = {q.id: q.question_text for q in questions}
    for ans in payload.answers:
        if ans.question_id not in valid_question_ids:
            raise InvalidQuestion(str(ans.question_id))

    now = datetime.now(UTC)
    application = Application(
        id=uuid7(),
        course_id=group.course_id,
        group_id=group_id,
        applicant_user_id=user_id,
        status="pending",
        created_at=now,
    )
    session.add(application)
    await session.flush()

    for ans in payload.answers:
        session.add(
            ApplicationAnswer(
                id=uuid7(),
                application_id=application.id,
                question_id=ans.question_id,
                question_text_snapshot=snapshots[ans.question_id],
                answer_text=ans.answer_text,
                created_at=now,
            )
        )
    await session.flush()

    return await _hydrate_application(session, application.id)


async def list_applications(
    session: AsyncSession,
    current_user: CurrentUser,
    group_id: UUID,
) -> list[ApplicationRead]:
    user_id = UUID(current_user.id)
    await _load_group(session, group_id)
    await _require_leader(session, group_id, user_id)

    rows = await session.execute(
        select(Application.id)
        .where(Application.group_id == group_id)
        .order_by(Application.created_at.desc())
    )
    return [await _hydrate_application(session, app_id) for (app_id,) in rows.all()]


async def accept_application(
    session: AsyncSession,
    current_user: CurrentUser,
    application_id: UUID,
) -> ApplicationRead:
    return await _respond_to_application(session, current_user, application_id, accept=True)


async def decline_application(
    session: AsyncSession,
    current_user: CurrentUser,
    application_id: UUID,
) -> ApplicationRead:
    return await _respond_to_application(session, current_user, application_id, accept=False)


# ---------------------------------------------------------------------------
# Leave + confirm
# ---------------------------------------------------------------------------


async def leave_group(
    session: AsyncSession,
    current_user: CurrentUser,
    group_id: UUID,
) -> GroupDetailRead:
    user_id = UUID(current_user.id)
    group = await _load_group(session, group_id)

    membership = await _load_active_membership(session, group_id, user_id)
    if membership is None:
        raise NotAMember(str(group_id))

    now = datetime.now(UTC)
    membership.left_at = now

    # If the leader is leaving, transfer or disband.
    if membership.role == "leader":
        next_leader = await _find_next_leader(session, group_id, exclude_user_id=user_id)
        if next_leader is None:
            group.state = "disbanded"
            group.recruiting = False
        else:
            next_leader.role = "leader"

    group.updated_at = now
    await session.flush()

    return await get_group(session, group_id)


async def confirm_group(
    session: AsyncSession,
    current_user: CurrentUser,
    group_id: UUID,
) -> GroupDetailRead:
    user_id = UUID(current_user.id)
    group = await _load_group(session, group_id)
    await _require_leader(session, group_id, user_id)

    now = datetime.now(UTC)
    if group.state == "forming":
        group.state = "confirming"
        group.confirmation_initiated_at = now
        group.recruiting = False

    membership_rows = await _load_active_memberships_raw(session, group_id)
    if all(m.confirmed_at is not None for m in membership_rows):
        group.state = "confirmed"
        group.confirmed_at = now
    group.updated_at = now
    await session.flush()
    return await get_group(session, group_id)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _load_enrollment_for_user(
    session: AsyncSession, enrollment_id: UUID, user_id: UUID
) -> Enrollment:
    row = await session.execute(
        select(Enrollment)
        .where(Enrollment.id == enrollment_id)
        .where(Enrollment.user_id == user_id)
        .where(Enrollment.deleted_at.is_(None))
        .where(Enrollment.status == "active")
    )
    enrollment = row.scalar_one_or_none()
    if enrollment is None:
        raise EnrollmentNotFound(str(enrollment_id))
    return enrollment


async def _load_group(session: AsyncSession, group_id: UUID) -> Group:
    row = await session.execute(
        select(Group).where(Group.id == group_id).where(Group.deleted_at.is_(None))
    )
    group = row.scalar_one_or_none()
    if group is None:
        raise GroupNotFound(str(group_id))
    return group


async def _require_leader(session: AsyncSession, group_id: UUID, user_id: UUID) -> None:
    row = await session.execute(
        select(GroupMembership.id)
        .where(GroupMembership.group_id == group_id)
        .where(GroupMembership.user_id == user_id)
        .where(GroupMembership.role == "leader")
        .where(GroupMembership.left_at.is_(None))
    )
    if row.scalar_one_or_none() is None:
        raise NotALeader(str(group_id))


async def _load_active_membership(
    session: AsyncSession, group_id: UUID, user_id: UUID
) -> GroupMembership | None:
    row = await session.execute(
        select(GroupMembership)
        .where(GroupMembership.group_id == group_id)
        .where(GroupMembership.user_id == user_id)
        .where(GroupMembership.left_at.is_(None))
    )
    return row.scalar_one_or_none()


async def _find_next_leader(
    session: AsyncSession, group_id: UUID, *, exclude_user_id: UUID
) -> GroupMembership | None:
    row = await session.execute(
        select(GroupMembership)
        .where(GroupMembership.group_id == group_id)
        .where(GroupMembership.user_id != exclude_user_id)
        .where(GroupMembership.left_at.is_(None))
        .order_by(GroupMembership.joined_at.asc())
    )
    return row.scalars().first()


async def _load_members(session: AsyncSession, group_id: UUID) -> list[GroupMemberDetail]:
    rows = await session.execute(
        select(GroupMembership, User.display_name)
        .join(User, User.id == GroupMembership.user_id)
        .where(GroupMembership.group_id == group_id)
        .where(GroupMembership.left_at.is_(None))
        .order_by(GroupMembership.joined_at.asc())
    )
    return [
        GroupMemberDetail(
            membership_id=m.id,
            user_id=m.user_id,
            display_name=name,
            role=m.role,
            joined_at=m.joined_at,
            confirmed_at=m.confirmed_at,
        )
        for (m, name) in rows.all()
    ]


async def _load_active_memberships_raw(
    session: AsyncSession, group_id: UUID
) -> list[GroupMembership]:
    rows = await session.execute(
        select(GroupMembership)
        .where(GroupMembership.group_id == group_id)
        .where(GroupMembership.left_at.is_(None))
    )
    return list(rows.scalars())


async def _load_active_questions(
    session: AsyncSession, group_id: UUID
) -> list[GroupApplicationQuestionRead]:
    rows = await session.execute(
        select(GroupApplicationQuestion)
        .where(GroupApplicationQuestion.group_id == group_id)
        .where(GroupApplicationQuestion.is_archived.is_(False))
        .order_by(GroupApplicationQuestion.display_order.asc())
    )
    return [
        GroupApplicationQuestionRead(
            id=q.id, question_text=q.question_text, display_order=q.display_order
        )
        for q in rows.scalars()
    ]


async def _replace_questions(
    session: AsyncSession,
    group_id: UUID,
    entries: list[GroupApplicationQuestionEntry],
    *,
    now: datetime,
) -> None:
    """Archive removed questions; insert new ones; rewrite text/order on kept ones.

    Snapshots stay attached to the original question id via
    ``ApplicationAnswer.question_text_snapshot`` so edits don't break
    past applications (ADR 0009 §3).
    """
    existing_rows = await session.execute(
        select(GroupApplicationQuestion)
        .where(GroupApplicationQuestion.group_id == group_id)
        .where(GroupApplicationQuestion.is_archived.is_(False))
    )
    existing = {q.id: q for q in existing_rows.scalars()}

    incoming_ids = {e.id for e in entries if e.id is not None}
    for q in existing.values():
        if q.id not in incoming_ids:
            q.is_archived = True
            q.archived_at = now

    for entry in entries:
        if entry.id is not None and entry.id in existing:
            existing[entry.id].question_text = entry.question_text
            existing[entry.id].display_order = entry.display_order
        else:
            session.add(
                GroupApplicationQuestion(
                    id=uuid7(),
                    group_id=group_id,
                    question_text=entry.question_text,
                    display_order=entry.display_order,
                    is_archived=False,
                    created_at=now,
                )
            )


async def _hydrate_application(session: AsyncSession, application_id: UUID) -> ApplicationRead:
    row = await session.execute(
        select(Application, User.display_name)
        .join(User, User.id == Application.applicant_user_id)
        .where(Application.id == application_id)
    )
    pair = row.first()
    if pair is None:
        raise ApplicationNotFound(str(application_id))
    application, applicant_name = pair

    answers_rows = await session.execute(
        select(ApplicationAnswer)
        .where(ApplicationAnswer.application_id == application_id)
        .order_by(ApplicationAnswer.created_at.asc())
    )
    answers = [
        ApplicationAnswerRead(
            id=a.id,
            question_id=a.question_id,
            question_text_snapshot=a.question_text_snapshot,
            answer_text=a.answer_text,
        )
        for a in answers_rows.scalars()
    ]

    return ApplicationRead(
        id=application.id,
        course_id=application.course_id,
        group_id=application.group_id,
        applicant_user_id=application.applicant_user_id,
        applicant_display_name=applicant_name,
        status=application.status,
        created_at=application.created_at,
        responded_at=application.responded_at,
        responded_by_user_id=application.responded_by_user_id,
        answers=answers,
    )


async def _respond_to_application(
    session: AsyncSession,
    current_user: CurrentUser,
    application_id: UUID,
    *,
    accept: bool,
) -> ApplicationRead:
    user_id = UUID(current_user.id)
    row = await session.execute(select(Application).where(Application.id == application_id))
    application = row.scalar_one_or_none()
    if application is None:
        raise ApplicationNotFound(str(application_id))
    if application.status != "pending":
        raise ApplicationAlreadyResponded(application.status)

    group = await _load_group(session, application.group_id)
    await _require_leader(session, group.id, user_id)

    now = datetime.now(UTC)
    application.status = "accepted" if accept else "declined"
    application.responded_at = now
    application.responded_by_user_id = user_id

    if accept:
        # Make sure the applicant isn't already a member (defensive).
        existing = await _load_active_membership(session, group.id, application.applicant_user_id)
        if existing is None:
            enrollment_row = await session.execute(
                select(Enrollment.id)
                .where(Enrollment.user_id == application.applicant_user_id)
                .where(Enrollment.course_id == group.course_id)
                .where(Enrollment.deleted_at.is_(None))
                .where(Enrollment.status == "active")
            )
            enrollment_id = enrollment_row.scalar_one_or_none()
            if enrollment_id is None:
                raise EnrollmentNotFound(str(application.applicant_user_id))
            session.add(
                GroupMembership(
                    id=uuid7(),
                    group_id=group.id,
                    user_id=application.applicant_user_id,
                    enrollment_id=enrollment_id,
                    role="member",
                    joined_at=now,
                )
            )
        # Also withdraw the applicant's other pending applications for the
        # same course — they're now in a group, so they can't apply elsewhere.
        await _withdraw_other_pending_applications(
            session,
            user_id=application.applicant_user_id,
            course_id=group.course_id,
            now=now,
        )
    group.updated_at = now
    await session.flush()
    return await _hydrate_application(session, application_id)


async def _withdraw_other_pending_applications(
    session: AsyncSession,
    *,
    user_id: UUID,
    course_id: UUID,
    now: datetime,
) -> None:
    rows = await session.execute(
        select(Application)
        .where(Application.applicant_user_id == user_id)
        .where(Application.course_id == course_id)
        .where(Application.status == "pending")
    )
    for app in rows.scalars():
        app.status = "withdrawn"
        app.responded_at = now
