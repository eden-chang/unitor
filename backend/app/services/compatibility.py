"""Compatibility scoring service.

Pure scoring functions at the top, DB orchestration at the bottom. Lives
behind ``POST /api/v1/compatibility/batch`` (route in
``app/api/v1/compatibility.py``). See ``.docs/08-matching-spec.md`` for
the algorithm; this module is the implementation.

## Caching

Cache table: ``compatibility_cache`` (migration 0007). On read, rows with
``computed_at IS NULL`` or ``algorithm_version != CURRENT_ALGORITHM_VERSION``
are treated as stale and recomputed in place.

Profile / schedule / skill writes NULL-out related cache rows via
Postgres triggers (migration 0010), so the staleness check is the only
client-side correctness path.

## Algorithm version bumps

Change the weight constants / formula → bump
``CURRENT_ALGORITHM_VERSION`` in the same change. Existing rows become
stale automatically; no migration required.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    CompatibilityCache,
    CourseSkill,
    Enrollment,
    Group,
    GroupMembership,
    Profile,
    ProfileScheduleSlot,
    ProfileSkill,
)
from app.schemas.compatibility import (
    CompatibilityBatchResponse,
    CompatibilityResult,
    SkillCoverageEntry,
    SkippedTarget,
)

# ---------------------------------------------------------------------------
# Constants — bump CURRENT_ALGORITHM_VERSION in the same PR as weight or
# formula changes. Existing cache rows with the old version become stale
# automatically (see module docstring).
# ---------------------------------------------------------------------------

CURRENT_ALGORITHM_VERSION = 1

W_SCHEDULE = 0.40
W_SKILL = 0.35
W_WORK_STYLE = 0.25

SCHEDULE_FULL_MARKS_HOURS = 10  # 10 hr/wk overlap → schedule score = 100
SLOT_HOURS = 3  # spec §4: every slot counts as 3 hours for simplicity
TOTAL_SLOTS = 20  # 5 weekdays x 4 time bands

SKILL_BASE = 70
SKILL_W_GROUP_GAP = 30
SKILL_W_VIEWER_GAP = 40
SKILL_W_REDUNDANCY = 20

WORK_W_FREQUENCY = 50
WORK_W_STYLE = 30
WORK_W_TOOL = 20


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class ViewerProfileIncomplete(Exception):
    """Viewer has no completed profile; cannot compute compatibility yet."""


# ---------------------------------------------------------------------------
# Scoring inputs — what a single user contributes to a (viewer, target) pair
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ScoringProfile:
    """Per-user inputs to the scoring functions.

    Built once per user before the inner loop; the loop never touches the
    DB. The frozen dataclass makes it cheap to pass into tests directly.
    """

    user_id: UUID
    profile_id: UUID
    meeting_frequency: str | None
    meeting_style: str | None
    comm_tool: str | None
    schedule_flexible: bool
    skills: frozenset[UUID]  # course_skill_ids
    slots: frozenset[tuple[int, int]]  # (day_of_week, time_band)


@dataclass
class _ScoreBuildup:
    """Mutable accumulator used during a single (viewer, target) compute."""

    overall: int = 0
    schedule: int = 0
    skill: int = 0
    work_style: int = 0
    overlap_hours: int = 0
    reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    skill_complementarity: list[SkillCoverageEntry] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Pure scoring functions — no DB access. Unit-tested directly.
# ---------------------------------------------------------------------------


def _effective_slots(profile: ScoringProfile) -> frozenset[tuple[int, int]]:
    """Treat ``schedule_flexible`` users as available in every slot."""
    if profile.schedule_flexible:
        return frozenset((day, band) for day in range(5) for band in range(4))
    return profile.slots


def score_schedule(
    viewer: ScoringProfile, target: ScoringProfile
) -> tuple[int, int, list[str], list[str]]:
    """Return ``(score, overlap_hours, reasons, warnings)``."""
    overlap = _effective_slots(viewer) & _effective_slots(target)
    overlap_hours = len(overlap) * SLOT_HOURS
    score = max(0, min(100, round(overlap_hours / SCHEDULE_FULL_MARKS_HOURS * 100)))

    reasons: list[str] = []
    warnings: list[str] = []

    if viewer.schedule_flexible and target.schedule_flexible:
        reasons.append("Both flexible — coordinate directly")
    else:
        if target.schedule_flexible:
            reasons.append("Flexible schedule on their side")
        if viewer.schedule_flexible:
            reasons.append("Flexible schedule on your side")

        if overlap_hours >= 8:
            reasons.append(f"Strong schedule overlap ({overlap_hours}h/wk)")
        elif overlap_hours >= 5:
            reasons.append(f"Good schedule overlap ({overlap_hours}h/wk)")
        elif 2 <= overlap_hours <= 4:
            warnings.append(f"Limited schedule overlap ({overlap_hours}h/wk)")
        elif overlap_hours == 0:
            warnings.append("No schedule overlap detected")

    return score, overlap_hours, reasons, warnings


def score_skills(
    viewer: ScoringProfile,
    target: ScoringProfile,
    group_skills: frozenset[UUID],
    catalog: dict[UUID, str],
) -> tuple[int, list[str], list[str], list[SkillCoverageEntry]]:
    """Return ``(score, reasons, warnings, complementarity)``.

    ``group_skills`` is the union of skills covered by viewer's group
    *excluding* the viewer's own skills (which already live in
    ``viewer.skills``). For solo viewers it's the empty set.

    ``catalog`` maps ``course_skill_id`` → ``skill_name`` for every skill
    in the course's catalog. Skills the viewer / target carry but that
    aren't in the catalog are still counted (they came from the same
    table), but the complementarity vector is only emitted for catalog
    entries.
    """
    skills_v = viewer.skills
    skills_t = target.skills
    skills_g = group_skills

    overlap_v_t = skills_v & skills_t
    complementary_to_group = skills_t - skills_v - skills_g

    catalog_ids = frozenset(catalog.keys())
    # Denominators clamp at 1 to avoid div-by-zero on empty catalogs / empty targets.
    group_gap_pool = max(1, len(catalog_ids - skills_v - skills_g))
    target_size = max(1, len(skills_t))
    redundancy_denom = max(1, max(len(skills_v), len(skills_t)))

    raw = (
        SKILL_BASE
        + SKILL_W_GROUP_GAP * (len(complementary_to_group) / group_gap_pool)
        + SKILL_W_VIEWER_GAP * ((len(skills_t) - len(overlap_v_t)) / target_size)
        - SKILL_W_REDUNDANCY * (len(overlap_v_t) / redundancy_denom)
    )
    score = max(0, min(100, round(raw)))

    reasons: list[str] = []
    warnings: list[str] = []
    complementarity: list[SkillCoverageEntry] = []
    for skill_id, skill_name in sorted(catalog.items(), key=lambda kv: kv[1]):
        if skill_id in overlap_v_t:
            covered: Literal["you", "them", "both", "gap"] = "both"
        elif skill_id in skills_v or skill_id in skills_g:
            covered = "you"
        elif skill_id in skills_t:
            covered = "them"
        else:
            covered = "gap"
        complementarity.append(SkillCoverageEntry(skill_name=skill_name, covered_by=covered))

    target_only_in_catalog = (skills_t - skills_v) & catalog_ids
    if len(target_only_in_catalog) >= 2:
        reasons.append("Complementary skills — strong coverage")
    elif len(target_only_in_catalog) == 1:
        skill_id = next(iter(target_only_in_catalog))
        reasons.append(f"{catalog[skill_id]} fills a clear gap")
    elif skills_t and skills_t == overlap_v_t:
        warnings.append("Overlapping skill sets — limited new coverage")

    if skills_g and not (skills_t - skills_v - skills_g):
        warnings.append("Target's skills overlap with your team's existing coverage")

    return score, reasons, warnings, complementarity


def _match_meeting_style(v: str | None, t: str | None) -> float:
    if v is None or t is None:
        return 0.0
    if v == t:
        return 1.0
    if "hybrid" in (v, t):
        return 0.5
    return 0.0


def _match_exact(v: str | None, t: str | None) -> float:
    return 1.0 if (v is not None and v == t) else 0.0


def score_work_style(
    viewer: ScoringProfile, target: ScoringProfile
) -> tuple[int, list[str], list[str]]:
    freq = _match_exact(viewer.meeting_frequency, target.meeting_frequency)
    style = _match_meeting_style(viewer.meeting_style, target.meeting_style)
    tool = _match_exact(viewer.comm_tool, target.comm_tool)

    score = round(WORK_W_FREQUENCY * freq + WORK_W_STYLE * style + WORK_W_TOOL * tool)
    score = max(0, min(100, score))

    reasons: list[str] = []
    warnings: list[str] = []

    if freq == 1.0 and style == 1.0 and tool == 1.0:
        reasons.append("Same work-style preferences")
    elif freq == 0.0 and style == 0.0 and tool == 0.0:
        warnings.append("Significant work-style differences")
    elif freq == 0.0 and style != 1.0:
        warnings.append("Different meeting cadence and style")

    return score, reasons, warnings


def compute_compatibility(
    viewer: ScoringProfile,
    target: ScoringProfile,
    *,
    group_skills: frozenset[UUID] = frozenset(),
    catalog: dict[UUID, str] | None = None,
) -> _ScoreBuildup:
    """Run all three sub-scores and assemble the result.

    Returns a ``_ScoreBuildup``; the orchestrator converts it to a
    ``CompatibilityResult`` once it has ids and timestamps.
    """
    cat = catalog or {}
    sched_score, overlap_hours, sched_reasons, sched_warnings = score_schedule(viewer, target)
    skill_score, skill_reasons, skill_warnings, complementarity = score_skills(
        viewer, target, group_skills, cat
    )
    work_score, work_reasons, work_warnings = score_work_style(viewer, target)

    overall = round(W_SCHEDULE * sched_score + W_SKILL * skill_score + W_WORK_STYLE * work_score)
    overall = max(0, min(100, overall))

    reasons = [*sched_reasons, *skill_reasons, *work_reasons][:4]
    warnings = [*sched_warnings, *skill_warnings, *work_warnings][:3]

    return _ScoreBuildup(
        overall=overall,
        schedule=sched_score,
        skill=skill_score,
        work_style=work_score,
        overlap_hours=overlap_hours,
        reasons=reasons,
        warnings=warnings,
        skill_complementarity=complementarity,
    )


# ---------------------------------------------------------------------------
# DB orchestration
# ---------------------------------------------------------------------------


async def batch_compatibility(
    db: AsyncSession,
    *,
    viewer_user_id: UUID,
    course_id: UUID,
    target_user_ids: Sequence[UUID],
) -> CompatibilityBatchResponse:
    """Compute (or read-from-cache) compatibility for a batch of targets.

    Steps:
        1. Read non-stale cache rows for the viewer + requested targets.
        2. Identify stale / missing targets.
        3. Batch-load viewer + stale target profiles, plus the course
           catalog and the viewer's group skill set.
        4. For each stale target with a usable profile, compute fresh.
        5. INSERT … ON CONFLICT UPDATE the cache rows.
        6. Return cached + fresh rows merged.

    Raises ``ViewerProfileIncomplete`` if the viewer has no usable
    profile yet (callers should surface this to the UI as
    ``PROFILE_INCOMPLETE``).
    """
    targets = [t for t in target_user_ids if t != viewer_user_id]
    if not targets:
        return CompatibilityBatchResponse(items=[], skipped=[])

    cached = await _fetch_cache(db, viewer_user_id, course_id, targets)
    items: list[CompatibilityResult] = []
    stale_target_ids: list[UUID] = []
    for row in cached:
        if row.computed_at is not None and row.algorithm_version == CURRENT_ALGORITHM_VERSION:
            items.append(_row_to_result(row))
        else:
            stale_target_ids.append(row.target_user_id)

    have_target_ids = {row.target_user_id for row in cached}
    missing_target_ids = [t for t in targets if t not in have_target_ids]
    needs_compute = stale_target_ids + missing_target_ids
    if not needs_compute:
        return CompatibilityBatchResponse(items=items, skipped=[])

    viewer = await _load_scoring_profile(db, course_id, viewer_user_id)
    if viewer is None:
        raise ViewerProfileIncomplete()

    target_profiles = await _load_scoring_profiles(db, course_id, needs_compute)
    catalog = await _load_skill_catalog(db, course_id)
    group_skills = await _load_viewer_group_skills(db, course_id, viewer_user_id, viewer.skills)

    fresh_rows: list[dict[str, object]] = []
    skipped: list[SkippedTarget] = []
    now = datetime.now(UTC)
    for target_id in needs_compute:
        target = target_profiles.get(target_id)
        if target is None:
            skipped.append(
                SkippedTarget(
                    target_user_id=target_id,
                    reason="target_profile_incomplete",
                )
            )
            continue
        buildup = compute_compatibility(
            viewer,
            target,
            group_skills=group_skills,
            catalog=catalog,
        )
        result = CompatibilityResult(
            viewer_user_id=viewer_user_id,
            target_user_id=target_id,
            course_id=course_id,
            algorithm_version=CURRENT_ALGORITHM_VERSION,
            overall_score=buildup.overall,
            schedule_score=buildup.schedule,
            skill_score=buildup.skill,
            work_style_score=buildup.work_style,
            schedule_overlap_hours=buildup.overlap_hours,
            reasons=buildup.reasons,
            warnings=buildup.warnings,
            skill_complementarity=buildup.skill_complementarity,
            computed_at=now,
        )
        items.append(result)
        fresh_rows.append(_result_to_row(result))

    if fresh_rows:
        await _upsert_cache(db, fresh_rows)

    return CompatibilityBatchResponse(items=items, skipped=skipped)


# ---------------------------------------------------------------------------
# Cache I/O
# ---------------------------------------------------------------------------


async def _fetch_cache(
    db: AsyncSession,
    viewer_user_id: UUID,
    course_id: UUID,
    target_user_ids: Sequence[UUID],
) -> list[CompatibilityCache]:
    stmt = select(CompatibilityCache).where(
        CompatibilityCache.viewer_user_id == viewer_user_id,
        CompatibilityCache.course_id == course_id,
        CompatibilityCache.target_user_id.in_(target_user_ids),
    )
    return list((await db.execute(stmt)).scalars().all())


def _row_to_result(row: CompatibilityCache) -> CompatibilityResult:
    return CompatibilityResult(
        viewer_user_id=row.viewer_user_id,
        target_user_id=row.target_user_id,
        course_id=row.course_id,
        algorithm_version=row.algorithm_version,
        overall_score=row.overall_score,
        schedule_score=row.schedule_score,
        skill_score=row.skill_score,
        work_style_score=row.work_style_score,
        schedule_overlap_hours=row.schedule_overlap_hours,
        reasons=list(row.reasons),
        warnings=list(row.warnings),
        skill_complementarity=[SkillCoverageEntry(**entry) for entry in row.skill_complementarity],
        # computed_at is not None here — staleness filter excludes None rows.
        computed_at=row.computed_at,
    )


def _result_to_row(result: CompatibilityResult) -> dict[str, object]:
    return {
        "viewer_user_id": result.viewer_user_id,
        "target_user_id": result.target_user_id,
        "course_id": result.course_id,
        "algorithm_version": result.algorithm_version,
        "overall_score": result.overall_score,
        "schedule_score": result.schedule_score,
        "skill_score": result.skill_score,
        "work_style_score": result.work_style_score,
        "schedule_overlap_hours": result.schedule_overlap_hours,
        "reasons": result.reasons,
        "warnings": result.warnings,
        "skill_complementarity": [entry.model_dump() for entry in result.skill_complementarity],
        "computed_at": result.computed_at,
    }


async def _upsert_cache(db: AsyncSession, rows: list[dict[str, object]]) -> None:
    stmt = pg_insert(CompatibilityCache).values(rows)
    update_cols = {
        col: getattr(stmt.excluded, col)
        for col in (
            "algorithm_version",
            "overall_score",
            "schedule_score",
            "skill_score",
            "work_style_score",
            "schedule_overlap_hours",
            "reasons",
            "warnings",
            "skill_complementarity",
            "computed_at",
        )
    }
    stmt = stmt.on_conflict_do_update(
        index_elements=["viewer_user_id", "target_user_id", "course_id"],
        set_=update_cols,
    )
    await db.execute(stmt)


# ---------------------------------------------------------------------------
# Profile / catalog / group loaders
# ---------------------------------------------------------------------------


async def _load_scoring_profile(
    db: AsyncSession,
    course_id: UUID,
    user_id: UUID,
) -> ScoringProfile | None:
    profiles = await _load_scoring_profiles(db, course_id, [user_id])
    return profiles.get(user_id)


async def _load_scoring_profiles(
    db: AsyncSession,
    course_id: UUID,
    user_ids: Iterable[UUID],
) -> dict[UUID, ScoringProfile]:
    """Batch-load all scoring inputs for the listed users in a course."""
    user_id_list = list({u for u in user_ids})
    if not user_id_list:
        return {}

    # 1. Enrollments + profiles for these users in this course.
    stmt = (
        select(Enrollment, Profile)
        .join(Profile, Profile.enrollment_id == Enrollment.id, isouter=False)
        .where(
            Enrollment.course_id == course_id,
            Enrollment.user_id.in_(user_id_list),
            Enrollment.deleted_at.is_(None),
            Enrollment.status == "active",
        )
    )
    rows = (await db.execute(stmt)).all()

    # Pre-build empty buckets keyed by profile id; populated below.
    profile_by_user: dict[UUID, Profile] = {row.Enrollment.user_id: row.Profile for row in rows}
    if not profile_by_user:
        return {}

    profile_ids = [p.id for p in profile_by_user.values()]

    # 2. Skills, batched.
    skill_stmt = select(ProfileSkill).where(ProfileSkill.profile_id.in_(profile_ids))
    skill_rows = (await db.execute(skill_stmt)).scalars().all()
    skills_by_profile: dict[UUID, set[UUID]] = defaultdict(set)
    for s in skill_rows:
        skills_by_profile[s.profile_id].add(s.course_skill_id)

    # 3. Schedule slots, batched.
    slot_stmt = select(ProfileScheduleSlot).where(ProfileScheduleSlot.profile_id.in_(profile_ids))
    slot_rows = (await db.execute(slot_stmt)).scalars().all()
    slots_by_profile: dict[UUID, set[tuple[int, int]]] = defaultdict(set)
    for slot in slot_rows:
        slots_by_profile[slot.profile_id].add((slot.day_of_week, slot.time_band))

    out: dict[UUID, ScoringProfile] = {}
    for user_id, profile in profile_by_user.items():
        if not _is_complete_profile(profile, skills_by_profile.get(profile.id, set())):
            continue
        out[user_id] = ScoringProfile(
            user_id=user_id,
            profile_id=profile.id,
            meeting_frequency=profile.meeting_frequency,
            meeting_style=profile.meeting_style,
            comm_tool=profile.comm_tool,
            schedule_flexible=profile.schedule_flexible,
            skills=frozenset(skills_by_profile.get(profile.id, set())),
            slots=frozenset(slots_by_profile.get(profile.id, set())),
        )
    return out


def _is_complete_profile(profile: Profile, skill_ids: set[UUID]) -> bool:
    """Profile completion gate per spec §12 decision 10.

    Strict by design: missing inputs would silently produce zeroes
    elsewhere in scoring, which we'd rather surface as ``skipped``.
    """
    if not profile.bio:
        return False
    if len(skill_ids) < 2:
        return False
    return True


async def _load_skill_catalog(db: AsyncSession, course_id: UUID) -> dict[UUID, str]:
    stmt = select(CourseSkill.id, CourseSkill.skill_name).where(CourseSkill.course_id == course_id)
    rows = await db.execute(stmt)
    return {row[0]: row[1] for row in rows}


async def _load_viewer_group_skills(
    db: AsyncSession,
    course_id: UUID,
    viewer_user_id: UUID,
    viewer_own_skills: frozenset[UUID],
) -> frozenset[UUID]:
    """Skills covered by viewer's group members other than themselves.

    Returns the empty set if the viewer is solo. Used to penalize
    "target adds nothing the team doesn't already have".
    """
    stmt = (
        select(ProfileSkill.course_skill_id)
        .join(Profile, Profile.id == ProfileSkill.profile_id)
        .join(Enrollment, Enrollment.id == Profile.enrollment_id)
        .join(GroupMembership, GroupMembership.enrollment_id == Enrollment.id)
        .join(Group, Group.id == GroupMembership.group_id)
        .where(
            Group.course_id == course_id,
            Group.deleted_at.is_(None),
            Group.state != "disbanded",
            GroupMembership.left_at.is_(None),
            GroupMembership.user_id != viewer_user_id,
            # Viewer must themselves be an active member of the group.
            Group.id.in_(
                select(GroupMembership.group_id).where(
                    and_(
                        GroupMembership.user_id == viewer_user_id,
                        GroupMembership.left_at.is_(None),
                    )
                )
            ),
        )
    )
    rows = await db.execute(stmt)
    covered = {row[0] for row in rows} - set(viewer_own_skills)
    return frozenset(covered)
