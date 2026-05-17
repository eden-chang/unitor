"""Profile request/response models.

Profiles are scoped per enrollment (ADR 0007 section 1). The user picks
skills from the per-course catalog, fills in a schedule grid, and a few
free-form fields.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

# ---------------------------------------------------------------------------
# Building blocks
# ---------------------------------------------------------------------------

ProficiencyLevel = Literal["beginner", "intermediate", "proficient", "expert"]


class SkillEntry(BaseModel):
    """A single skill claim on a profile."""

    course_skill_id: UUID
    proficiency: ProficiencyLevel


class ScheduleSlot(BaseModel):
    """A weekday/time-band cell the user is available at.

    ``day_of_week``: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri.
    ``time_band``: 0=9am-12pm, 1=12-4pm, 2=4-8pm, 3=8-11pm.
    """

    day_of_week: int = Field(ge=0, le=4)
    time_band: int = Field(ge=0, le=3)


class LinkEntry(BaseModel):
    label: str = Field(min_length=1, max_length=40)
    url: HttpUrl
    display_order: int = 0


class LinkRead(BaseModel):
    id: UUID
    label: str
    url: str
    display_order: int


class SkillRead(BaseModel):
    id: UUID
    course_skill_id: UUID
    proficiency: ProficiencyLevel


# ---------------------------------------------------------------------------
# Create / update payloads
# ---------------------------------------------------------------------------


class ProfileCreate(BaseModel):
    """Initial profile setup. All fields optional except enrollment_id.

    Frontend posts this once at the end of the Prof0..Prof3 onboarding
    wizard. If the profile already exists, return 409 — clients should
    PATCH instead.
    """

    enrollment_id: UUID
    bio: str | None = Field(default=None, max_length=300)
    meeting_frequency: str | None = Field(default=None, max_length=40)
    meeting_style: str | None = Field(default=None, max_length=40)
    comm_tool: str | None = Field(default=None, max_length=40)
    comm_handle: str | None = Field(default=None, max_length=120)
    schedule_flexible: bool = False
    skills: list[SkillEntry] = Field(default_factory=list)
    schedule_slots: list[ScheduleSlot] = Field(default_factory=list)
    links: list[LinkEntry] = Field(default_factory=list)


class ProfileUpdate(BaseModel):
    """Partial update — anything left out is unchanged.

    For skills/schedule/links, use the dedicated replace endpoints; this
    endpoint only touches the scalar fields on the profile row.
    """

    model_config = ConfigDict(extra="forbid")

    bio: str | None = Field(default=None, max_length=300)
    meeting_frequency: str | None = Field(default=None, max_length=40)
    meeting_style: str | None = Field(default=None, max_length=40)
    comm_tool: str | None = Field(default=None, max_length=40)
    comm_handle: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = None
    schedule_flexible: bool | None = None


class SkillsReplace(BaseModel):
    skills: list[SkillEntry]


class ScheduleReplace(BaseModel):
    schedule_flexible: bool = False
    slots: list[ScheduleSlot] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Read models
# ---------------------------------------------------------------------------


class ProfileRead(BaseModel):
    id: UUID
    enrollment_id: UUID
    bio: str | None
    meeting_frequency: str | None
    meeting_style: str | None
    comm_tool: str | None
    comm_handle: str | None
    avatar_url: str | None
    schedule_flexible: bool
    last_active_at: datetime
    created_at: datetime
    updated_at: datetime
    skills: list[SkillRead]
    schedule_slots: list[ScheduleSlot]
    links: list[LinkRead]


# ---------------------------------------------------------------------------
# Completion check
# ---------------------------------------------------------------------------


class CompletionResponse(BaseModel):
    """Whether the profile meets the criteria to participate in matching.

    ``missing`` lists the specific things that still need attention. Empty
    list with ``is_complete=true`` means the profile is ready.
    """

    is_complete: bool
    missing: list[str] = Field(default_factory=list)
