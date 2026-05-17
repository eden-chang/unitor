# 08 — Matching Algorithm Specification

This document specifies the compatibility-scoring algorithm. The current prototype's numbers are all hand-authored; this is what replaces them. The output of this algorithm fills the `compatibility_cache` table ([`./06-erd.md`](./06-erd.md) §24) and drives Discovery's sort, the per-student detail panel breakdown, and the Urgent page suggestions.

All defaults are recommendations open to review.

## 1. Goal

For a (viewer, target) pair within a course, produce:

- A single overall score, 0–100.
- Three sub-scores (schedule, skill, work style), each 0–100.
- A schedule-overlap value in hours (independent metric for sort and display).
- A list of human-readable reasons and warnings.
- A skill-complementarity vector for the UI breakdown.

The result is **cached** (`compatibility_cache`); recomputation is triggered when either user's profile changes (`computed_at` set to `NULL` by trigger).

## 2. Inputs

For each user (viewer + target):

- `enrollment.section_id` — their section in this course.
- `profile.meeting_frequency`, `profile.meeting_style`, `profile.comm_tool` — work style.
- `profile.schedule_flexible: bool` — if true, treat as fully available.
- `profile_skills[]` — { skill, proficiency }.
- `profile_schedule_slots[]` — the available 30 min×4 = 4 × 5 = 20 possible slots they marked.
- `profile.last_active_at` — used as a tiebreaker, not a scoring input.

Additionally for the viewer's *group* (if they are in one):

- The set of skills already covered by the group (used for complementarity).
- The group's collective schedule (intersection).

## 3. Overall score formula

```
overall = round(
    W_schedule  * schedule_score
  + W_skill     * skill_score
  + W_work_style * work_style_score
)
```

with default weights:

| Weight | Default value | Notes |
|---|---|---|
| `W_schedule` | 0.40 | Most-cited blocker per requirements; weight reflects that. |
| `W_skill` | 0.35 | Skill complementarity matters but not dominantly. |
| `W_work_style` | 0.25 | Tertiary; can be discussed. |

Weights sum to 1.0. They're stored as a config value (initially constants in `app/config.py`; later move to a per-course config row to allow TAs to adjust).

## 4. Schedule sub-score

### Inputs

- `slots_v` = set of slot IDs the viewer is available (or all 20 if `schedule_flexible`).
- `slots_t` = set of slot IDs the target is available.
- 20 total slots: 5 weekdays × 4 time bands (9–12, 12–4, 4–8, 8–11). Each slot represents 3 or 4 hours; for simplicity, **every slot counts as 3 hours** of overlap.

### Computation

```
overlap_slots    = slots_v ∩ slots_t
overlap_hours    = |overlap_slots| * 3
schedule_score   = clamp(round(overlap_hours / 10 * 100), 0, 100)
```

(10 hours of weekly overlap is the "full marks" target — chosen empirically from the prototype's `scheduleOverlapHrs` field.)

### Reasons and warnings

- `overlap_hours >= 8` → reason: `"Strong schedule overlap (8h/wk)"`.
- `overlap_hours >= 5` → reason: `"Good schedule overlap (5h/wk)"`.
- `overlap_hours >= 2` and `<= 4` → warning: `"Limited schedule overlap (Xh/wk)"`.
- `overlap_hours == 0` → warning: `"No schedule overlap detected"`.
- `schedule_flexible` true on either side → reason: `"Flexible schedule on their side"` (or yours, etc.).

### Edge case: both flexible

If both have `schedule_flexible = true`, `overlap_hours = 20 slots * 3 = 60`. We cap at 10 for score purposes but display as "flexible / flexible." The reason text becomes `"Both flexible — coordinate directly"`.

## 5. Skill sub-score

### Inputs

- `skills_v` = viewer's skills (set of strings from course catalog).
- `skills_t` = target's skills.
- `skills_g` = viewer's group's already-covered skills (empty if solo).
- `skills_course_catalog` = the full course skill set.

### Computation

We score on three sub-factors:

```
overlap_v_t            = skills_v ∩ skills_t          # both have it
complementary_to_v     = skills_t - skills_v           # target adds something
complementary_to_group = skills_t - (skills_v ∪ skills_g)  # target adds to the group

skill_score_raw =
    +30 * |complementary_to_group| / max(1, |skills_course_catalog - skills_v - skills_g|)
    +40 * (|skills_t| - |overlap_v_t|) / max(1, |skills_t|)
    -20 * |overlap_v_t| / max(1, max(|skills_v|, |skills_t|))     # penalty for redundancy
    +base 70

skill_score = clamp(round(skill_score_raw), 0, 100)
```

In plain English:
- Heavily reward skills the target brings that nobody on the viewer's team has.
- Moderately reward skills the target has that the viewer lacks.
- Mildly penalize having the exact same skill set.
- Center around 70 so most reasonable matches score decently.

### Reasons and warnings

For each skill in `skills_course_catalog`, classify `covered_by`:

- `"both"` if it's in `overlap_v_t`.
- `"you"` if only in `skills_v` (or `skills_g`).
- `"them"` if only in `skills_t`.
- `"gap"` if in neither.

The frontend's existing "skill complementarity" panel directly consumes this vector.

Reasons / warnings derived:

- ≥2 complementary skills → reason: `"Complementary skills — strong coverage"`.
- 1 complementary skill → reason: `"{skill_name} fills a clear gap"`.
- All `overlap_v_t` (0 complementary) → warning: `"Overlapping skill sets — limited new coverage"`.

## 6. Work-style sub-score

### Inputs

Three pairs of fields:

| Field | Type |
|---|---|
| `meeting_frequency` | text (e.g., `"1x/wk"`, `"2x/wk"`, `"3x/wk"`, `"as_needed"`) |
| `meeting_style` | text (`"in-person"`, `"online"`, `"hybrid"`) |
| `comm_tool` | text (`"Discord"`, `"Slack"`, `"WhatsApp"`, `"Email"`, `"iMessage"`, `"KakaoTalk"`, `"Instagram DM"`) |

### Computation

Each field is a 1/0 match (1 if exact, 0 otherwise). We weight them:

```
work_style_score = round(
    50 * match(meeting_frequency)
  + 30 * match(meeting_style)
  + 20 * match(comm_tool)
)
```

Caveat: **`hybrid` matches both `in-person` and `online` half-credit**. So:

```
match_meeting_style(v, t):
    if v == t: 1
    elif "hybrid" in (v, t): 0.5
    else: 0
```

`comm_tool` mismatches are mild; this is why it's the lowest weight (the team can agree on a tool).

### Reasons and warnings

- All three match → reason: `"Same work-style preferences"`.
- All three differ → warning: `"Significant work-style differences"`.
- `meeting_style` differs and `meeting_frequency` differs → warning: `"Different meeting cadence and style"`.
- `comm_tool` differs → mention only, not a warning (low impact).

## 7. Output schema (matches `compatibility_cache`)

`algorithm_version` was added per [ADR 0009](./decisions/0009-audit-corrections.md) §5 — every cache row carries the version of the algorithm that produced it. Rows with a non-matching version are treated as stale on read.

```python
CURRENT_ALGORITHM_VERSION: int = 1  # bumped manually in the same PR as weight/formula changes

class CompatibilityResult(BaseModel):
    viewer_user_id: UUID
    target_user_id: UUID
    course_id: UUID
    algorithm_version: int        # CURRENT_ALGORITHM_VERSION at compute time
    overall_score: int            # 0-100
    schedule_score: int           # 0-100
    skill_score: int              # 0-100
    work_style_score: int         # 0-100
    schedule_overlap_hours: int   # raw hours, 0..20+ (display caps at "10+")
    reasons: list[str]            # max 4 entries, ordered by importance
    warnings: list[str]           # max 3 entries, ordered by severity
    skill_complementarity: list[SkillCoverageEntry]
    computed_at: datetime
```

**Version bump procedure**:
1. Change weights / formula in `app/services/compatibility.py`.
2. Bump `CURRENT_ALGORITHM_VERSION` in the same file in the same PR.
3. No DB migration required; existing cache rows with the old version are treated as stale on next read and recomputed in place.
4. Optionally truncate `compatibility_cache` if a fast cutover is desired and the table is small enough.

`SkillCoverageEntry`: `{ skill_name: str, covered_by: Literal["you", "them", "both", "gap"] }`.

## 8. Tier labels (for the UI banner)

`PROFILE_TIERS` in the frontend (≈L1543 of `App.tsx`) maps to:

| Tier | Score range | Label | Color |
|---|---|---|---|
| `good` | 75–100 | `"Excellent Match"` | success (green) |
| `normal` | 50–74 | `"Moderate Match"` | warning (yellow) |
| `bad` | 0–49 | `"Low Compatibility"` | danger (red) |

Boundaries are intentionally generous on `good` and tight on `bad` so most reasonable matches don't get flagged as poor.

## 9. Computation timing

### Lazy compute on Discovery load

```
1. Frontend opens Discovery → calls Supabase directly for the student list (filtered by course).
2. Frontend extracts target_user_ids and calls FastAPI:
     POST /api/v1/compatibility/batch
     body: { course_id, target_user_ids: [...] }
3. FastAPI:
   a. SELECT FROM compatibility_cache WHERE viewer = me AND target IN (...)
      AND computed_at IS NOT NULL
      AND algorithm_version = CURRENT_ALGORITHM_VERSION.
   b. Identify missing or stale targets (missing row, NULL computed_at, or version mismatch).
   c. For each missing/stale, run the scoring function in-process (no extra DB round-trips per pair —
      load all profiles in one query).
   d. INSERT … ON CONFLICT UPDATE the cache rows (writes algorithm_version + computed_at).
   e. Return the full result set keyed by target_user_id.
4. Frontend merges scores into the displayed cards.
```

### Cache invalidation

- **Profile changes**: Postgres trigger on `profiles`, `profile_skills`, `profile_schedule_slots`: any change sets `computed_at = NULL` on cache rows involving the affected user (as viewer or target).
- **Group state changes** (`group_memberships` insert/delete): set `computed_at = NULL` for cache rows where the viewer is a group member (because `skills_g` changed).
- **Algorithm version bump**: handled on read — rows whose `algorithm_version` doesn't match the constant in code are treated as stale automatically. No migration needed.
- **Cron**: a daily job sets `computed_at = NULL` for all rows where one party hasn't been active in 30+ days (stale-data hygiene).

### When the viewer has no profile yet

The score is undefined. The frontend hides cards until the viewer completes their profile setup.

## 10. Test vectors

These should be implemented as unit tests in `backend/tests/unit/services/test_compatibility.py`.

### Test 1: identical schedule, complementary skills, same work style

- Viewer skills: `{UI Design, User Research}`; schedule: Mon/Wed/Fri 12–4pm.
- Target skills: `{Frontend Dev, Prototyping}`; schedule: same.
- Both: `2x/wk`, `in-person`, `Discord`.
- Expected: `overall ≈ 92`, `schedule = 90`, `skill ≈ 95`, `work_style = 100`.

### Test 2: no schedule overlap, complementary skills

- Same skills as above.
- Schedules disjoint.
- Same work style.
- Expected: `overall ≈ 60`, `schedule = 0`, `skill ≈ 95`, `work_style = 100`. The bad schedule pulls the overall down hard despite great skill fit.

### Test 3: huge overlap, identical skills

- Same schedule, same skills, same work style.
- Expected: `overall ≈ 75`, `schedule = 100`, `skill ≈ 60` (heavy redundancy penalty), `work_style = 100`.

### Test 4: flexible viewer, busy target

- Viewer flexible, target available 2 slots/week.
- Expected: `schedule = 60`, others reasonable. `schedule_flexible` reason includes `"Flexible schedule on your side"`.

### Test 5: viewer in a group with full skill coverage

- Viewer's group already covers all 4 course skills.
- Target's skills are a subset.
- Expected: skill score < 60 (no marginal gain from target). Warning: `"Target's skills overlap with your team's existing coverage"`.

### Test 6: new user, no profile

- Viewer's profile is incomplete.
- Expected: function raises `ProfileIncomplete` exception; caller (FastAPI route) returns `{ code: "PROFILE_INCOMPLETE" }`, frontend prompts to complete profile.

## 11. Performance notes

- A Discovery load with 50 visible students = 50 (target) cache lookups + at most 50 fresh computes.
- Each compute is in-memory and runs in microseconds (set intersections + a few multiplications).
- The bottleneck is fetching the input data: profiles, skills, schedule slots. Recommend `JOIN` and a single query that returns all targets' inputs in one trip.
- At 100 students/course × 5,000 courses, the cache table is ~50M rows. Indexed on `(course_id, viewer_user_id, overall_score DESC)`, Discovery reads are fast.

## 12. Decisions to confirm or override

1. **Default weights (0.40 / 0.35 / 0.25)** — these are the recommended starting point. Should be made configurable per-course later (a `course_matching_config` table).
2. **Schedule's "10 hours = full marks"** — based on the prototype's hand-tuned numbers. Could be 8 or 12 instead.
3. **Skill scoring centered at 70** — keeps most matches in the "decent" range. Lowering the base makes the algorithm more selective.
4. **Work style hybrid = 0.5** — could be 1.0 (treat hybrid as a wildcard) or 0.0 (force exact match).
5. **Schedule slot = 3 hours** — arbitrary. The actual slot widths are 3, 4, 4, 3 hours; we average to 3 for simplicity. Could be more precise.
6. **No "Section bonus"** — students in the same section don't get an extra boost. Trivial to add (`+5 if same section`).
7. **No "Last active" influence on score** — only used for sort tiebreakers. Could add a small decay (e.g., `score *= 0.95` if last_active > 7d).
8. **No "Mutual interest" boost** — if two students have already exchanged a request, no score adjustment. Could add `+10` to reinforce reciprocity. (Risk: encourages echo chambers.)
9. **Reasons/warnings as English strings** — fine for pilot. Move to translatable keys when i18n lands.
10. **`PROFILE_INCOMPLETE` defined as missing any of: skills (<2), schedule (0 slots and not flexible), bio (empty)** — strict but matches the existing prototype's gates.
