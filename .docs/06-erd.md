# 06 — Entity-Relationship Design (ERD)

This document is the concrete schema for the backend. It implements the decisions in [`decisions/0001-multi-tenancy.md`](./decisions/0001-multi-tenancy.md), [`decisions/0004-data-strategy.md`](./decisions/0004-data-strategy.md), [`decisions/0007-domain-modeling.md`](./decisions/0007-domain-modeling.md), and [`decisions/0008-conventions.md`](./decisions/0008-conventions.md). Every column, type, FK, index, and RLS policy that follows is a default — **review and override anything you disagree with before we start writing migrations.**

## Reading guide

- **PK** = primary key, **FK** = foreign key, **UQ** = unique constraint, **IX** = index.
- All `id` columns are `uuid` (UUIDv7), generated app-side.
- All `*_at` columns are `timestamptz` (UTC).
- Default for nullable column type is "not null"; nullability is called out explicitly when allowed.
- Every domain table has `course_id` (or transitively reaches it). All RLS policies use the JWT's enrolled-course set.
- "Soft delete" means a `deleted_at` column exists; the default query filter is `WHERE deleted_at IS NULL`.

## Diagram (rough relationship map)

```
universities ─< courses ─< sections
                 │
                 ├─< course_skills
                 ├─< roster_entries ───────────┐
                 ├─< enrollments ─< profiles ──┘
                 │                  │
                 │                  ├─< profile_skills
                 │                  ├─< profile_schedule_slots
                 │                  └─< profile_links
                 │
                 ├─< groups ─< group_memberships
                 │      │
                 │      ├─< group_application_questions
                 │      └─< applications ─< application_answers
                 │                          └─< application_votes
                 │
                 ├─< requests
                 │
                 ├─< conversations ─< conversation_participants
                 │                    └─< messages ─< message_reactions
                 │
                 ├─< notifications
                 ├─< compatibility_cache
                 └─< audit_log
```

`users` sits outside `universities` because a user can belong to multiple universities.

---

## Table catalog

### 1. `users`

Mirrors Supabase `auth.users`. The Supabase auth row owns identity; this row owns app-level state.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | **PK**. Same value as `auth.users.id`. |
| `primary_email` | `text` | UQ, lowercase, used for roster matching. |
| `display_name` | `text` | Optional. Defaults to first part of email until set. Max 100 chars. |
| `default_avatar_url` | `text` | Nullable. CDN URL from R2. |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | trigger-maintained |
| `deleted_at` | `timestamptz` | nullable; soft delete |

**Indexes:** `IX (lower(primary_email))` for case-insensitive lookup.

**RLS:** A user can read their own row. TAs can read users that are enrolled in their courses (joined through `enrollments`). No one writes this table directly — Supabase Auth populates `id`, FastAPI updates `display_name`/`avatar_url`.

---

### 2. `universities`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | e.g., `"University of Toronto"` |
| `short_name` | `text` | e.g., `"UofT"`. UQ. |
| `email_domain` | `text` | Nullable. e.g., `"mail.utoronto.ca"`. If set, used for warning during signup. |
| `timezone` | `text` | IANA name, e.g., `"America/Toronto"`. Default for new courses. |
| `created_at` / `updated_at` | `timestamptz` | |

**RLS:** Read for any authenticated user (universities are a public-ish list). Write: service role only (admin-created for now).

---

### 3. `courses`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `university_id` | `uuid` | FK → `universities.id` |
| `code` | `text` | e.g., `"CSC318"`. UQ within university. |
| `name` | `text` | e.g., `"The Design of Interactive Computational Media"` |
| `department` | `text` | Nullable. |
| `semester` | `text` | e.g., `"winter-2026"`. |
| `invite_code` | `text` | 6-char uppercase alphanumeric. UQ globally. |
| `min_group_size` | `int` | default 4 |
| `max_group_size` | `int` | default 6 |
| `deadline_at` | `timestamptz` | The group-formation deadline. |
| `timezone` | `text` | Defaults to university timezone. |
| `state` | `course_state` enum | `draft` / `active` / `archived` |
| `created_by_user_id` | `uuid` | FK → `users.id` (the TA who created it) |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | `timestamptz` | soft delete |

**Indexes:** `IX (university_id, state)`, `UQ (invite_code)`.

**RLS:**
- Read: any authenticated user enrolled in this course (via `enrollments`), plus any TA of the course.
- Read (limited): a user with a valid invite code can read `(id, code, name, semester, min_group_size, max_group_size)` to confirm course identity before joining. This is a FastAPI endpoint, not direct RLS — RLS denies anonymous reads.
- Write: only users with `enrollments.role IN ('ta', 'instructor')` for this course.

---

### 4. `sections`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `course_id` | `uuid` | FK → `courses.id` |
| `code` | `text` | e.g., `"L0101"` or `"201"`. |
| `created_at` / `updated_at` / `deleted_at` | `timestamptz` | |

**Indexes:** `UQ (course_id, code)`.

**RLS:** Same as `courses` (read = enrolled in the course; write = TA of the course).

---

### 5. `course_skills`

Per-course skill catalog. Students pick from this list when filling their profile.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `course_id` | `uuid` | FK |
| `skill_name` | `text` | e.g., `"UI Design"` |
| `display_order` | `int` | For consistent UI ordering. |
| `created_at` | `timestamptz` | |

**Indexes:** `UQ (course_id, lower(skill_name))`.

**RLS:** Read = enrolled in course. Write = TA.

---

### 6. `roster_entries`

The TA's claim that a given email belongs in this course. Empty until linked.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `course_id` | `uuid` | FK |
| `section_id` | `uuid` | Nullable. FK → `sections.id`. |
| `email` | `text` | Lowercase. |
| `name` | `text` | From CSV. |
| `user_id` | `uuid` | Nullable. FK → `users.id`. Filled on student signup. |
| `imported_at` | `timestamptz` | |
| `imported_by_user_id` | `uuid` | FK → `users.id` (the TA who uploaded). |
| `removed_at` | `timestamptz` | Nullable. Set if a re-import drops this email; not deleted to preserve audit. |

**Indexes:** `UQ (course_id, lower(email)) WHERE removed_at IS NULL`. `IX (course_id, user_id) WHERE user_id IS NULL` for "students who haven't signed up yet."

**RLS:** Read = TAs of the course only. Write = TAs of the course only. Students never see this table directly. The signup flow goes through FastAPI which queries with service role.

---

### 7. `enrollments`

A user's participation in a course.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK |
| `course_id` | `uuid` | FK |
| `section_id` | `uuid` | FK (nullable only during signup transition; required after) |
| `role` | `enrollment_role` enum | `student` / `ta` / `instructor` |
| `status` | `enrollment_status` enum | `active` / `dropped` / `completed` |
| `joined_at` | `timestamptz` | |
| `created_at` / `updated_at` / `deleted_at` | `timestamptz` | soft delete |

**Indexes:** `UQ (user_id, course_id) WHERE deleted_at IS NULL`. `IX (course_id, role, status)` for TA dashboard queries.

**RLS:**
- Read own row always.
- Read other enrollments in the same course if you're enrolled (with `role IN ('ta', 'instructor')`) **or** if you have an active enrollment yourself (so students can see classmates).
- Write own row: only on create (joining the course); status changes go through FastAPI.
- Write others' rows: TA only, for status (e.g., marking `dropped`).

---

### 8. `profiles`

One per enrollment.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `enrollment_id` | `uuid` | FK, UQ |
| `bio` | `text` | Max 300 chars (enforced in app + DB constraint). |
| `meeting_frequency` | `text` | e.g., `"2x/wk"`. Free-form for now; could enum later. |
| `meeting_style` | `text` | e.g., `"in-person"`, `"online"`, `"hybrid"`. |
| `comm_tool` | `text` | e.g., `"Discord"`. |
| `comm_handle` | `text` | The user's @-handle on that tool. Nullable. |
| `avatar_url` | `text` | Nullable. CDN URL. |
| `schedule_flexible` | `boolean` | If true, treat as fully-available for matching. |
| `last_active_at` | `timestamptz` | Updated on any action by this user in the course. |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:** `IX (enrollment_id)`, `IX (last_active_at DESC)` for activity sorts.

**RLS:**
- Read: own profile + profiles of users enrolled in the same course.
- Write: only own profile.

---

### 9. `profile_skills`

Skills the student claims with proficiency. Many-to-many between profiles and the per-course skill catalog.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK |
| `course_skill_id` | `uuid` | FK → `course_skills.id` |
| `proficiency` | `proficiency_level` enum | `beginner`/`intermediate`/`proficient`/`expert` |

**Indexes:** `UQ (profile_id, course_skill_id)`. `IX (course_skill_id)` for skill-supply queries.

**RLS:** Read same as `profiles`. Write own profile's only.

---

### 10. `profile_schedule_slots`

A profile's available time slots. 5 days × 4 time bands = at most 20 rows per profile.

| Column | Type | Notes |
|---|---|---|
| `profile_id` | `uuid` | FK, part of PK |
| `day_of_week` | `int` | 0–4 (Mon–Fri), part of PK |
| `time_band` | `int` | 0–3 (9–12, 12–4, 4–8, 8–11), part of PK |

**PK:** `(profile_id, day_of_week, time_band)`. (Only rows for slots the user has selected; absence means unavailable.)

**Indexes:** `IX (day_of_week, time_band)` for "who is free at this slot" queries.

**RLS:** Same as `profiles`.

---

### 11. `profile_links`

Optional bio links (portfolio, GitHub, LinkedIn).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK |
| `label` | `text` | e.g., `"GitHub"` |
| `url` | `text` | Validated as HTTPS URL. |
| `display_order` | `int` | |

**Indexes:** `IX (profile_id)`.

**RLS:** Same as `profiles`.

---

### 12. `groups`

A forming or confirmed group within a course.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `course_id` | `uuid` | FK |
| `name` | `text` | Nullable; defaults to "{leader display_name}'s Group" in UI when null. |
| `description` | `text` | Set by leader. |
| `state` | `group_state` enum | `forming` / `confirming` / `confirmed` / `disbanded` |
| `recruiting` | `boolean` | True if listed on the Groups view. Default false. |
| `confirmation_initiated_at` | `timestamptz` | Nullable. Starts the 24h confirm window. |
| `confirmation_deadline_at` | `timestamptz` | Nullable. `confirmation_initiated_at + 24h`. |
| `created_at` / `updated_at` / `confirmed_at` / `deleted_at` | `timestamptz` | soft delete |

**Indexes:** `IX (course_id, state)`, `IX (course_id, recruiting) WHERE recruiting AND state = 'forming'`.

**RLS:** Read = enrolled in course (any role). Write = leader of the group + TAs of the course. Insert: via FastAPI only.

---

### 13. `group_memberships`

The leader and members of each group. Includes historical (left) memberships for audit.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK |
| `user_id` | `uuid` | FK |
| `enrollment_id` | `uuid` | FK (denormalized for fast joins; must match `(user_id, group.course_id)`) |
| `role` | `group_member_role` enum | `leader` / `member` |
| `joined_at` | `timestamptz` | |
| `confirmed_at` | `timestamptz` | Nullable. Set when the member clicks Confirm during the 24h window. |
| `left_at` | `timestamptz` | Nullable. Soft-leave; preserves audit. |

**Indexes:**
- `UQ (group_id, user_id) WHERE left_at IS NULL` — a user can be in a group only once at a time.
- `UQ (group_id) WHERE role = 'leader' AND left_at IS NULL` — at most one active leader per group.
- `IX (user_id, left_at)` for "what's my active group?"

**RLS:** Read = enrolled in course. Write = leader (for accepting/removing members) + the member themselves (for leaving) + FastAPI (for orchestrated flows).

---

### 14. `group_application_questions`

Questions the leader configures for applicants to answer. Updated per [ADR 0009](./decisions/0009-audit-corrections.md) §3 — questions are now archive-on-delete to preserve referential history of past answers.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK |
| `question_text` | `text` | |
| `display_order` | `int` | |
| `is_archived` | `boolean` | default `false`. Leader edits/deletes set this true instead of hard delete. |
| `created_at` / `archived_at` | `timestamptz` | |

**Indexes:** `IX (group_id, display_order) WHERE is_archived = false`.

**RLS:** Read = enrolled in course (so applicants see active questions; old `application_answers` keep their snapshotted text — see §17). Write = group leader.

---

### 15. `requests`

One-to-one group requests between two students (sender → receiver).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `course_id` | `uuid` | FK (denormalized for RLS) |
| `sender_user_id` | `uuid` | FK |
| `receiver_user_id` | `uuid` | FK |
| `why` | `text` | The "Why work together?" form field. |
| `question` | `text` | Nullable. The optional "A question for them" form field. |
| `status` | `request_status` enum | `pending`/`replied`/`accepted`/`declined`/`withdrawn`/`expired` |
| `created_at` | `timestamptz` | |
| `responded_at` | `timestamptz` | Nullable. |
| `decline_reason` | `text` | Nullable. From the radio buttons in the UI. |
| `decline_note` | `text` | Nullable. Free-form. |
| `expires_at` | `timestamptz` | `created_at + 48h` normal, `+24h` urgent mode. |

**Indexes:**
- `IX (receiver_user_id, status, created_at DESC)` for the inbox.
- `IX (sender_user_id, status, created_at DESC)` for sent items.
- `IX (course_id, status, expires_at)` for the cron sweep of expirations.
- `UQ (course_id, sender_user_id, receiver_user_id) WHERE status IN ('pending', 'replied')` — prevent duplicate pending requests.

**RLS:** Read = sender or receiver. Write = sender (insert, withdraw) or receiver (respond).

---

### 16. `applications`

Application by a student to a forming group.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `course_id` | `uuid` | FK (denormalized) |
| `group_id` | `uuid` | FK |
| `applicant_user_id` | `uuid` | FK |
| `status` | `application_status` enum | `pending`/`accepted`/`declined`/`withdrawn` |
| `created_at` | `timestamptz` | |
| `responded_at` | `timestamptz` | Nullable. |
| `responded_by_user_id` | `uuid` | FK → `users.id`. Nullable. (The leader who acted.) |

**Indexes:**
- `IX (group_id, status, created_at DESC)` for the leader's pending list.
- `IX (applicant_user_id, status, created_at DESC)` for the applicant's history.
- `UQ (group_id, applicant_user_id) WHERE status = 'pending'`.

**RLS:** Read = applicant + all current members of the group (so the team can see who's applying). Write = applicant (insert, withdraw) + leader (respond).

---

### 17. `application_answers`

The applicant's responses to the leader's questions. Updated per [ADR 0009](./decisions/0009-audit-corrections.md) §3 — question text is **snapshotted** at answer time so leader edits/deletes don't break past answers.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `application_id` | `uuid` | FK |
| `question_id` | `uuid` | Nullable FK → `group_application_questions.id`. Kept for analytics; nulled if the question is hard-deleted in a future migration. |
| `question_text_snapshot` | `text` | NOT NULL. The exact question text at the time the answer was submitted. UI displays this. |
| `answer_text` | `text` | |
| `created_at` | `timestamptz` | |

**Indexes:** `UQ (application_id, question_id) WHERE question_id IS NOT NULL`.

**RLS:** Same as parent `application`.

---

### 18. `application_votes`

Member up/down votes on an application (advisory; leader still decides).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `application_id` | `uuid` | FK |
| `voter_user_id` | `uuid` | FK |
| `vote` | `vote_value` enum | `up` / `down` |
| `created_at` | `timestamptz` | |

**Indexes:** `UQ (application_id, voter_user_id)`.

**RLS:** Read = group members. Write = group members (only their own vote).

---

### 19. `conversations`

A 1:1 or group chat. **Simplified per [ADR 0009](./decisions/0009-audit-corrections.md) §12 — direct uniqueness enforced inline; no auxiliary table.**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `course_id` | `uuid` | FK (denormalized) |
| `type` | `conversation_type` enum | `direct` / `group` |
| `group_id` | `uuid` | Nullable. FK → `groups.id` (only for `type = 'group'`). |
| `participant_a_id` | `uuid` | Nullable. For `type = 'direct'` only. Always the lexicographically lower user_id. |
| `participant_b_id` | `uuid` | Nullable. For `type = 'direct'` only. Always the lexicographically higher user_id. |
| `last_message_at` | `timestamptz` | Nullable. Updated on every message insert. |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:**
- `IX (course_id, type)`
- `IX (group_id) WHERE group_id IS NOT NULL`
- `UQ (course_id, participant_a_id, participant_b_id) WHERE type = 'direct'` — at most one direct conversation per pair per course.

**Constraints (CHECK):**
- `type = 'direct'` ⇒ `participant_a_id IS NOT NULL AND participant_b_id IS NOT NULL AND participant_a_id < participant_b_id AND group_id IS NULL`.
- `type = 'group'` ⇒ `group_id IS NOT NULL AND participant_a_id IS NULL AND participant_b_id IS NULL`.

**RLS:** Read = current participant (joined via `conversation_participants`). Write = service role only (FastAPI creates conversations).

**Lifecycle (clarified per [ADR 0009](./decisions/0009-audit-corrections.md) §13):**
- "Delete conversation" UI = set the calling user's `conversation_participants.left_at`. The conversation row itself stays.
- For `type = 'direct'`: if both participants have `left_at IS NOT NULL`, FastAPI hard-deletes the conversation + cascades the messages in the same request.
- For `type = 'group'`: hard-delete only when the underlying group is disbanded.

---

### 20. `conversation_participants`

Membership in a conversation. Carries per-user unread state.

| Column | Type | Notes |
|---|---|---|
| `conversation_id` | `uuid` | FK, part of PK |
| `user_id` | `uuid` | FK, part of PK |
| `joined_at` | `timestamptz` | |
| `last_read_at` | `timestamptz` | Nullable. |
| `unread_count` | `int` | Default 0. Maintained by trigger on `messages` insert (per non-sender). |
| `left_at` | `timestamptz` | Nullable. "Delete conversation" for one side = set `left_at`. |

**PK:** `(conversation_id, user_id)`.

**Indexes:** `IX (user_id, left_at)` for the conversation list query.

**RLS:** Read = own participant rows. Write = own row only (for marking read).

---

### 21. `messages` — **PARTITIONED**

The chat content. Highest-volume table.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Part of composite PK `(id, created_at)`. |
| `conversation_id` | `uuid` | FK |
| `sender_user_id` | `uuid` | FK |
| `body` | `text` | Max 4000 chars. |
| `created_at` | `timestamptz` | Part of composite PK + partition key. |
| `edited_at` | `timestamptz` | Nullable. |
| `deleted_at` | `timestamptz` | Nullable. Soft delete (tombstone shown as "Message deleted"). |

**Primary key:** composite `(id, created_at)` — required by native partitioning when used as the FK target of `message_reactions`. The `id` alone remains globally unique (UUIDv7); the composite is a Postgres requirement, not a data-model one.

**Partitioning:** `RANGE (created_at)`, monthly partitions, managed by `pg_partman`. Retention: 12 months hot; archived partitions dumped to R2 then dropped (with the corresponding `message_reactions` partitions).

**Indexes (on each partition):**
- `IX (conversation_id, created_at DESC)` — main read pattern.
- `IX (sender_user_id, created_at DESC)` — moderation queries.

**RLS:** Read = participant of the conversation. Write (insert) = participant.

---

### 22. `message_reactions` — **PARTITIONED (co-partitioned with `messages`)**

Per-user reaction on a message. **Co-partitioned with `messages` per [ADR 0009](./decisions/0009-audit-corrections.md) §4** so partition drops stay atomic across both tables and there are no orphans.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, part of partition key |
| `message_id` | `uuid` | Part of composite FK. |
| `message_created_at` | `timestamptz` | Part of composite FK + partition key. Same monthly range as `messages`. |
| `user_id` | `uuid` | FK |
| `reaction_type` | `reaction_type` enum | `check` / `thumb_up` / `heart` / `sad` |
| `created_at` | `timestamptz` | |

**Partitioning:** `RANGE (message_created_at)`, monthly partitions, managed by `pg_partman` with the **same retention policy as `messages`**. Old partitions are dumped together to R2 in the archive job.

**Foreign key:** composite `(message_id, message_created_at) REFERENCES messages(id, created_at)`. PG 12+ supports this with native partitioning.

**Indexes (on each partition):** `UQ (message_id, user_id)` (one reaction per user per message).

**RLS:** Read = participant of the parent conversation. Write = own only.

---

### 23. `notifications`

Per-recipient notification feed.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `recipient_user_id` | `uuid` | FK |
| `course_id` | `uuid` | FK |
| `type` | `notification_type` enum | The 9 types from `NotificationType` in the prototype. |
| `title` | `text` | |
| `body` | `text` | |
| `action_target_type` | `text` | Nullable. e.g., `"request"`, `"conversation"`, `"group"`. |
| `action_target_id` | `uuid` | Nullable. |
| `read_at` | `timestamptz` | Nullable. |
| `created_at` | `timestamptz` | |

**Indexes:** `IX (recipient_user_id, created_at DESC)`, `IX (recipient_user_id, read_at) WHERE read_at IS NULL` for the unread badge.

**RLS:** Read/Write = own only.

**Retention:** Cron deletes rows older than 30 days.

---

### 24. `compatibility_cache`

Per-viewer, per-target compatibility result. Lazy computed. **Updated per [ADR 0009](./decisions/0009-audit-corrections.md) §5** with `algorithm_version` for sane invalidation on weight changes.

| Column | Type | Notes |
|---|---|---|
| `viewer_user_id` | `uuid` | FK, part of PK |
| `target_user_id` | `uuid` | FK, part of PK |
| `course_id` | `uuid` | FK, part of PK |
| `algorithm_version` | `smallint` | NOT NULL. The compatibility algorithm version used to compute this row. Bumped in code when weights or formula change. Rows with a non-matching version are treated as stale. |
| `overall_score` | `int` | 0–100. |
| `schedule_score` | `int` | 0–100. |
| `skill_score` | `int` | 0–100. |
| `work_style_score` | `int` | 0–100. |
| `schedule_overlap_hours` | `int` | Computed; useful for sorts independent of the score. |
| `reasons` | `text[]` | "Why this score" bullets. |
| `warnings` | `text[]` | Warnings (e.g., "no schedule overlap"). |
| `skill_complementarity` | `jsonb` | `[{ skill, covered_by: 'you'|'them'|'both'|'gap' }, ...]` |
| `computed_at` | `timestamptz` | Nullable. NULL means stale; the next read triggers recompute. |

**PK:** `(viewer_user_id, target_user_id, course_id)`.

**Indexes:** `IX (course_id, viewer_user_id, overall_score DESC) WHERE algorithm_version = (current) AND computed_at IS NOT NULL` for sorted Discovery loads. (`current` will be a constant at index-build time; rebuild the index when the version bumps.)

**RLS:** Read = own rows (`viewer_user_id = auth.uid()`). Write = service role only (FastAPI writes after compute).

**Invalidation:**
- Postgres trigger on `profiles`, `profile_skills`, `profile_schedule_slots` sets `computed_at = NULL` for all cache rows involving the affected user.
- `algorithm_version` mismatch is treated as stale on read; FastAPI recomputes and upserts with the new version.
- Migrations that bump `CURRENT_ALGORITHM_VERSION` (in `app/services/compatibility.py`) ship in the same PR as the weight/formula change.

---

### 25. `audit_log`

Append-only log of consequential actions (especially TA destructive ops).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `course_id` | `uuid` | Nullable FK (some events are user-level). |
| `actor_user_id` | `uuid` | Nullable FK (cron jobs have null actor). |
| `actor_kind` | `actor_kind` enum | `user` / `cron` / `system` |
| `action` | `text` | SCREAMING_SNAKE, e.g., `"TA_EXTENDED_DEADLINE"`. |
| `target_type` | `text` | Nullable. e.g., `"course"`. |
| `target_id` | `uuid` | Nullable. |
| `payload` | `jsonb` | Free-form context. |
| `created_at` | `timestamptz` | |

**Indexes:** `IX (course_id, created_at DESC)`, `IX (action, created_at DESC)`.

**RLS:** Read = TA of the course (when `course_id` matches). Write = service role only.

**Retention:** Hot for 1 year, then archive to R2.

---

## Enum types

```sql
CREATE TYPE course_state         AS ENUM ('draft', 'active', 'archived');
CREATE TYPE enrollment_role      AS ENUM ('student', 'ta', 'instructor');
CREATE TYPE enrollment_status    AS ENUM ('active', 'dropped', 'completed');
CREATE TYPE proficiency_level    AS ENUM ('beginner', 'intermediate', 'proficient', 'expert');
CREATE TYPE group_state          AS ENUM ('forming', 'confirming', 'confirmed', 'disbanded');
CREATE TYPE group_member_role    AS ENUM ('leader', 'member');
CREATE TYPE request_status       AS ENUM ('pending', 'replied', 'accepted', 'declined', 'withdrawn', 'expired');
CREATE TYPE application_status   AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');
CREATE TYPE vote_value           AS ENUM ('up', 'down');
CREATE TYPE conversation_type    AS ENUM ('direct', 'group');
CREATE TYPE reaction_type        AS ENUM ('check', 'thumb_up', 'heart', 'sad');
CREATE TYPE notification_type    AS ENUM (
  'group_request_received', 'group_application_received',
  'request_accepted', 'request_declined',
  'application_accepted', 'application_declined',
  'member_left', 'confirm_requested', 'urgent_mode'
);
CREATE TYPE actor_kind           AS ENUM ('user', 'cron', 'system');
```

---

## Cross-cutting RLS policy template

The pattern repeats. For a domain table `T` scoped to `course_id`. **Updated per [ADR 0009](./decisions/0009-audit-corrections.md) §1 — soft-delete filter is now mandatory.**

```sql
-- Enable RLS
ALTER TABLE T ENABLE ROW LEVEL SECURITY;

-- A user can read non-deleted rows for courses they're (non-deleted-) enrolled in
CREATE POLICY t_read ON T FOR SELECT
  USING (
    -- Subject row not soft-deleted. Drop this line for tables without `deleted_at`.
    deleted_at IS NULL
    AND course_id IN (
      SELECT course_id FROM enrollments
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Write rules vary per table; specifics in each section above.
```

`auth.uid()` is the Supabase helper that returns the JWT's `sub` claim. FastAPI **respects RLS for user-facing endpoints** by opening sessions as the `authenticated` role with the user's JWT claims pushed via `set_config('request.jwt.claims', …, true)`. Service-role sessions (which bypass RLS) are limited to cron, admin, and bootstrap operations. See [ADR 0002](./decisions/0002-backend-stack.md) "Authorization model" and [ADR 0009](./decisions/0009-audit-corrections.md) §2.

---

## Indexing rules (recap)

1. **Every domain table has `course_id` (or transitively reaches it) as the first column in its primary read index.**
2. **No N+1 queries**: indexes are designed for the actual query patterns ("inbox," "discovery sorted by compat," "leader's pending applications").
3. **Partial indexes** are heavily used when one status value dominates queries (e.g., `WHERE status = 'pending'`).
4. **Foreign keys are indexed** unless they're already covered by another index.

---

## Migration order

The Alembic migration to bootstrap the schema runs in this order:

1. Extensions: `pgcrypto` (uuid), `pg_partman` (Pro tier), `pg_cron` (Pro tier).
2. Enum types.
3. `universities` → `courses` → `sections` → `course_skills` → `roster_entries`.
4. `users` (mirrored from `auth.users` via trigger).
5. `enrollments` → `profiles` → `profile_skills` → `profile_schedule_slots` → `profile_links`.
6. `groups` → `group_memberships` → `group_application_questions`.
7. `requests` → `applications` → `application_answers` → `application_votes`.
8. `conversations` → `conversation_participants` → `messages` (with partitioning) → `message_reactions`.
9. `notifications` → `compatibility_cache` → `audit_log`.
10. Triggers: `updated_at`, compatibility-cache invalidation, message-insert side effects (update `last_message_at`, bump unread counts, dispatch notifications).
11. RLS policies (after all tables exist).
12. Seed data: a "demo university" + a "demo CSC318 course" for E2E tests.

---

## Decisions to confirm or override before migrations are written

These are choices made by default in this document that you might want to revisit:

1. **Message body limit of 4000 chars** — typical for a "casual chat" UX. Drop to 1000 or 2000 if we want shorter messages.
2. **Direct-conversation uniqueness** is per-course (two users in the same course → one direct conversation). Alternative: globally per-user-pair across courses. Default chosen for simplicity and tenancy isolation.
3. **`profile_schedule_slots` as a row table** vs. a single `bigint` bitmap on `profiles`. Default chosen for queryability ("show me everyone free Wed afternoon"). Bitmap saves storage at the cost of joinability.
4. **Application questions are per-group** (`group_application_questions`). Alternative: per-course default questions inherited by groups. Default kept per-group because the prototype lets leaders customize.
5. **`compatibility_cache` keeps `reasons` and `warnings` as `text[]`** — simple. Alternative: structured `jsonb` for i18n/format flexibility. Default chosen for pilot simplicity.
6. **`notifications` retention at 30 days** — see [ADR 0004](./decisions/0004-data-strategy.md). Adjust per stakeholder feedback.
7. **No `course_communication_platforms` table** — communication tools are a constant list in the app, not data. Add later if we want per-course customization.
8. **`message_reactions` denormalizes `message_created_at`** — needed for partition routing. Alternative: declare reactions as also partitioned by the same key.
9. **`messages.body` is not encrypted at rest beyond Postgres baseline** — if FERPA/PIPEDA review wants column-level encryption, add `pgcrypto` + a KMS scheme. Out of scope for pilot.

Any of these defaults that you want to flip — leave a note and the ERD will be updated in this doc before migrations are written.
