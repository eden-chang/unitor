"""Discovery read responses.

Surfaces the Discovery board's two views: People (other students enrolled
in this course) and Groups (forming/recruiting groups). Compatibility
scoring is a separate concern (ADR 0008 / task F) and is plugged in
later; this module only does the relational read.

Pagination is cursor-based per ADR 0008 section 9. The cursor is the last
seen row's stable id, base64-encoded so clients treat it as opaque.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Building blocks shared with the profile schema. Re-import to keep coupling
# explicit; we don't re-export.
# ---------------------------------------------------------------------------

GroupStatus = Literal["solo", "in_group"]


class StudentSkillRead(BaseModel):
    course_skill_id: UUID
    proficiency: Literal["beginner", "intermediate", "proficient", "expert"]


class StudentScheduleSlot(BaseModel):
    day_of_week: int = Field(ge=0, le=4)
    time_band: int = Field(ge=0, le=3)


class StudentProfileSummary(BaseModel):
    """The profile fields we expose to classmates on the Discovery card.

    Excludes potentially-sensitive fields like ``comm_handle`` -- those
    are revealed only after a group request is accepted (see the
    ``MyGroup`` workspace's Contact Exchange).
    """

    id: UUID
    bio: str | None
    meeting_frequency: str | None
    meeting_style: str | None
    comm_tool: str | None  # platform name (e.g. "Discord"); handle is hidden
    avatar_url: str | None
    schedule_flexible: bool
    last_active_at: datetime
    skills: list[StudentSkillRead]
    schedule_slots: list[StudentScheduleSlot]


class StudentListItem(BaseModel):
    user_id: UUID
    enrollment_id: UUID
    display_name: str | None
    section_id: UUID | None
    section_code: str | None
    profile: StudentProfileSummary | None
    group_status: GroupStatus
    joined_at: datetime


class StudentListResponse(BaseModel):
    items: list[StudentListItem]
    next_cursor: str | None = Field(
        default=None,
        description=(
            "Opaque cursor for the next page. Pass back as the ``cursor`` "
            "query param. Null when the list is exhausted."
        ),
    )


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------


GroupSortableState = Literal["forming", "confirming", "confirmed", "disbanded"]


class GroupMemberRead(BaseModel):
    user_id: UUID
    display_name: str | None
    role: Literal["leader", "member"]
    joined_at: datetime


class GroupApplicationQuestionRead(BaseModel):
    id: UUID
    question_text: str
    display_order: int


class GroupListItem(BaseModel):
    id: UUID
    course_id: UUID
    name: str | None = Field(
        default=None,
        description=(
            "Display name; if null the frontend falls back to ``{leader.display_name}'s Group``."
        ),
    )
    description: str | None
    state: GroupSortableState
    recruiting: bool
    members: list[GroupMemberRead]
    leader: GroupMemberRead | None  # null if no active leader (transient state)
    application_questions: list[GroupApplicationQuestionRead]
    confirmation_deadline_at: datetime | None
    created_at: datetime


class GroupListResponse(BaseModel):
    items: list[GroupListItem]
    next_cursor: str | None = None
