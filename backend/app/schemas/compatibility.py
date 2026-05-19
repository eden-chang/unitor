"""Compatibility-score request / response shapes.

Wire shape for ``POST /api/v1/compatibility/batch``. See
``.docs/08-matching-spec.md`` for the algorithm and ``app/services/
compatibility.py`` for the implementation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

SkillCoverage = Literal["you", "them", "both", "gap"]
ProfileGate = Literal["viewer_profile_incomplete", "target_profile_incomplete"]


class SkillCoverageEntry(BaseModel):
    """Per-skill coverage label for the UI breakdown panel."""

    skill_name: str
    covered_by: SkillCoverage


class CompatibilityResult(BaseModel):
    """One viewer→target result, matching the ``compatibility_cache`` row."""

    viewer_user_id: UUID
    target_user_id: UUID
    course_id: UUID
    algorithm_version: int
    overall_score: int = Field(ge=0, le=100)
    schedule_score: int = Field(ge=0, le=100)
    skill_score: int = Field(ge=0, le=100)
    work_style_score: int = Field(ge=0, le=100)
    schedule_overlap_hours: int = Field(ge=0)
    reasons: list[str]
    warnings: list[str]
    skill_complementarity: list[SkillCoverageEntry]
    computed_at: datetime


class CompatibilityBatchRequest(BaseModel):
    """Inputs to ``POST /api/v1/compatibility/batch``.

    ``target_user_ids`` is capped at 200 to keep the batch under one
    seconds-class compute even in worst-case (all stale).
    """

    course_id: UUID
    target_user_ids: list[UUID] = Field(min_length=1, max_length=200)


class SkippedTarget(BaseModel):
    target_user_id: UUID
    reason: ProfileGate


class CompatibilityBatchResponse(BaseModel):
    """The full batch result.

    Targets without a usable profile are returned in ``skipped`` rather
    than blocking the response — the Discovery board hides those cards
    via the same flow that already hides un-onboarded classmates.
    """

    items: list[CompatibilityResult]
    skipped: list[SkippedTarget]
