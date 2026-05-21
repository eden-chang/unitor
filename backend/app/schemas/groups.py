"""Group lifecycle request/response models.

Covers the writable surface for the groups domain that stage 1's
Discovery feed left alone:

* `GroupCreate` / `GroupUpdate` — leader-side mutations.
* `ApplicationCreate` / `ApplicationRead` — student-side
  application + leader-side accept / decline.
* `GroupDetailRead` / `GroupApplicationQuestionRead` — full group
  detail used by the MyGroup page (extends what Discovery already
  returns via `GroupListItem`).

Reads still flow through `app/schemas/discovery.py` for the
Discovery groups feed; this module adds the per-group write paths.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

GroupState = Literal["forming", "confirming", "confirmed", "disbanded"]
GroupMemberRole = Literal["leader", "member"]
ApplicationStatus = Literal["pending", "accepted", "declined", "withdrawn"]

# ---------------------------------------------------------------------------
# Group mutations
# ---------------------------------------------------------------------------


class GroupApplicationQuestionEntry(BaseModel):
    """One row in a leader's replace-set of application questions.

    `id` is optional — providing an existing UUID preserves the row
    (and any prior answers that snapshot its text). Omitting `id`
    creates a new question.
    """

    id: UUID | None = None
    question_text: str = Field(min_length=1, max_length=300)
    display_order: int = Field(default=0, ge=0)


class GroupCreate(BaseModel):
    """Spin up a new forming group with the caller as leader.

    `enrollment_id` is the leader's own enrollment in the course;
    we read the course id from it rather than letting the client
    pass an arbitrary course id. Application questions, if any,
    default to none — the leader can add them later via
    `PATCH /groups/{id}`.
    """

    enrollment_id: UUID
    name: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=300)
    recruiting: bool = True
    application_questions: list[GroupApplicationQuestionEntry] = Field(default_factory=list)


class GroupUpdate(BaseModel):
    """Partial update of a group's metadata + (optionally) questions.

    The leader is the only one who can call this — RLS-equivalent
    enforcement happens at the service layer since group writes
    flow through the service role (see migration 0004).

    Pass `application_questions` to replace the full question set
    atomically. Leave it `None` to keep questions untouched.
    """

    name: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=300)
    recruiting: bool | None = None
    application_questions: list[GroupApplicationQuestionEntry] | None = None


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------


class GroupMemberDetail(BaseModel):
    membership_id: UUID
    user_id: UUID
    display_name: str | None
    role: GroupMemberRole
    joined_at: datetime
    confirmed_at: datetime | None


class GroupApplicationQuestionRead(BaseModel):
    id: UUID
    question_text: str
    display_order: int


class GroupDetailRead(BaseModel):
    """Full group detail used by the MyGroup page.

    Sibling of `discovery.GroupListItem` — Discovery's variant trims
    membership detail for the cheap feed render; this one carries
    the full membership list + a confirmation-deadline view that the
    MyGroup workspace actually renders.
    """

    id: UUID
    course_id: UUID
    name: str | None
    description: str | None
    state: GroupState
    recruiting: bool
    members: list[GroupMemberDetail]
    application_questions: list[GroupApplicationQuestionRead]
    confirmation_initiated_at: datetime | None
    confirmation_deadline_at: datetime | None
    confirmed_at: datetime | None
    created_at: datetime


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------


class ApplicationAnswerEntry(BaseModel):
    """One answer the applicant supplies on `POST /groups/{id}/apply`."""

    question_id: UUID
    answer_text: str = Field(max_length=2000)


class ApplicationCreate(BaseModel):
    answers: list[ApplicationAnswerEntry] = Field(default_factory=list)


class ApplicationAnswerRead(BaseModel):
    id: UUID
    question_id: UUID | None
    question_text_snapshot: str
    answer_text: str


class ApplicationRead(BaseModel):
    id: UUID
    course_id: UUID
    group_id: UUID
    applicant_user_id: UUID
    applicant_display_name: str | None
    status: ApplicationStatus
    created_at: datetime
    responded_at: datetime | None
    responded_by_user_id: UUID | None
    answers: list[ApplicationAnswerRead]


class ApplicationListResponse(BaseModel):
    items: list[ApplicationRead]
