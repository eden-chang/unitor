# ADR 0007 — Domain modeling decisions

- **Status:** Accepted (default-recommendations; subject to user review)
- **Date:** 2026-05-16
- **Supersedes:** —
- **Superseded by:** —

## Context

[ADR 0001](./0001-multi-tenancy.md) locked the tenancy strategy. Before drawing the ERD ([`../06-erd.md`](../06-erd.md)) we need five domain-modeling decisions that the ERD then implements. Each had multiple defensible options; this ADR records the chosen option for each.

## Decision summary

| # | Decision | Choice |
|---|---|---|
| 1 | Profile scope | **Per enrollment** (one profile per (user, course) pair) |
| 2 | User ↔ university relationship | **One user, many enrollments** (cross-university single account) |
| 3 | Roster representation | **Separate `roster_entries` table**, lazily bound to `users` |
| 4 | Section as entity | **First-class `sections` table** scoped to course |
| 5 | Group leadership | **`group_memberships.role` column** (no `groups.leader_id`) |

## 1. Profile scope — per enrollment

A student's profile (skills, schedule, work-style, bio, avatar) lives **per enrollment**, not per user.

### Rationale

- The prototype's `Prof0`–`Prof3` flow is explicitly part of joining a course, implying course-scoped profiles. `ProfileEdit` storing globally is a leak from the prototype's mock-state architecture, not a design statement.
- Skills relevant to CSC318 (UI Design, User Research, …) differ from skills relevant to a databases course (SQL, schema design, …). A global profile forces students into a one-size-fits-all skill catalog.
- Schedules vary by semester. A global schedule is wrong by week 2.
- Migration story (re-enrolling next semester) is clean: a new enrollment → a new empty profile to fill out.

### Implications for the ERD

- `profiles.enrollment_id` is the unique foreign key (1-to-1 with enrollment).
- No global `users.profile`. Per-user info on `users` is limited to identity: `id`, `primary_email`, `display_name`, `avatar_url` (the *default* avatar, can be overridden per-enrollment).
- Skill catalog is per-course (`course_skills` table), not global. A student picks from the course's catalog when filling their profile.

### Trade-off accepted

- Slight duplication: a student in two simultaneous courses fills out two profiles. This is the right trade — most students take one course at a time on this product, and the duplication is shallow.

## 2. User ↔ university relationship — one user, many enrollments

A single `users` row can belong to multiple universities and multiple courses.

### Rationale

- A real student may be:
  - A current undergrad at university A.
  - A cross-registered student at neighboring university B for one course.
  - An alumnus auditing a course years later.
- Forcing one account per university splits identity and breaks login UX.
- Supabase Auth identifies a user by `auth.users.id`; we mirror that to `public.users.id`. A single auth record can satisfy many enrollments.

### Implications for the ERD

- `users` table has no `university_id` column.
- `enrollments` is the join table: `(user_id, course_id, section_id, role, status)`.
- `enrollments.role` is `student | ta | instructor`. A user can be a TA in one course and a student in another simultaneously.

### Trade-off accepted

- Email uniqueness is at the `users` level, not per-university. A student must use a stable primary email across universities. If they want to keep emails separate, they create two accounts. We don't try to merge accounts automatically.
- For roster matching: we match `roster_entries.email` against `users.primary_email`. If a student's roster email differs from their account email, the TA must update the roster CSV (or the student updates their primary email). No silent fuzzy matching.

## 3. Roster representation — separate `roster_entries` table

When a TA uploads a roster, the rows become `roster_entries`, not stub `users`.

### Rationale

- A roster row is a **claim** ("this email is allowed in this course"), not yet a person.
- Many roster rows never sign up. Creating `users` for all of them pollutes the user table with empty stubs and forces decisions about what their `id`/`display_name` should be.
- TA dashboard wants to see "students who haven't signed up yet" — that's `roster_entries WHERE user_id IS NULL`, a natural query.
- When a student signs up, we link: `UPDATE roster_entries SET user_id = $1 WHERE course_id = $2 AND lower(email) = lower($3)`. Linking is explicit.

### Implications for the ERD

- `roster_entries (id, course_id, section_id, email, name, user_id, imported_at, imported_by_user_id)`.
- `enrollments` is only created **after** a `roster_entries` row is bound to a `users` row.
- Signup flow: a student tries to sign up → Supabase Auth creates user → FastAPI checks for matching `roster_entries` → if found, creates `enrollments` + links `roster_entries.user_id`; if not, signup is rejected ("Your email was not found in this course. Contact your TA.").

### Trade-off accepted

- Re-imports need a merge strategy (covered in [`../09-csv-roster-spec.md`](../09-csv-roster-spec.md)).
- Dropping a student from the roster after they enrolled is two operations (remove `roster_entries` row, decide what to do with their `enrollments` and `profiles`).

## 4. Sections — first-class entity

Sections are their own table, not a free-form string column on enrollments.

### Rationale

- Sections drive UX filters and TA dashboard slicing. Free-form strings invite typos ("L0101" vs "L0101 ").
- A section is a property of the *course offering*, not the student. Modeling it as an entity captures that.
- Section roster size, meeting times, TA-of-record are all natural additions later. The table is the place for those.

### Implications for the ERD

- `sections (id, course_id, code, created_at, deleted_at)`. `(course_id, code)` is unique.
- `enrollments.section_id` is a foreign key (nullable only during the brief window between roster import and section assignment).
- `roster_entries.section_id` is the TA's claim from the CSV. When the student enrolls, we copy it to `enrollments.section_id`.
- TA can add or rename a section without bulk-updating enrollments (because they reference `section_id`, not the string).

### Trade-off accepted

- One extra join in queries. Indexed properly, this is negligible.

## 5. Group leadership — `group_memberships.role` column

The leader is identified by `group_memberships.role = 'leader'`, not by `groups.leader_id`.

### Rationale

- Leader transfer (out of scope for prototype, but trivial to need later) is one UPDATE on the memberships table.
- Co-leadership / multiple instructors-of-record / future role types all add cleanly without schema churn.
- Auditing "who has been leader of this group over time" is supported by keeping historical memberships (with `left_at`).
- Avoids the "leader_id points to a user who already left the group" foot-gun.

### Implications for the ERD

- `group_memberships (id, group_id, user_id, enrollment_id, role, joined_at, confirmed_at, left_at)`.
- `role` enum: `leader | member`. (Could become `leader | co_leader | member` later without a schema migration.)
- Invariant: at any time, exactly one active membership per group has `role = 'leader'`. Enforced via a partial unique index: `UNIQUE (group_id) WHERE role = 'leader' AND left_at IS NULL`.
- Leader transfer is two updates in one transaction: demote old leader → promote new one.

### Trade-off accepted

- One extra query when displaying "the leader is X" — easily fetched alongside members. Not a performance concern at our scale.
- The partial-unique-index pattern requires Postgres (not SQLite). We're on Postgres, so fine.

## Alternatives considered (rejected)

| Decision | Rejected alternative | Why rejected |
|---|---|---|
| 1 | Per-user profile shared across courses | Skill catalog and schedule both differ per course; would force a one-size catalog system-wide. |
| 1 | Profile per (user, semester) | Half measure; doesn't help when a student takes two courses in one semester with different skill needs. |
| 2 | One user per university | Multiple accounts to manage; login confusion; cross-registered students poorly served. |
| 2 | One global account, university chosen per session | Auth complexity, no real benefit. |
| 3 | Lazy stub users for roster | Pollutes `users` table; needs sentinel `display_name`; cleanup is its own problem. |
| 3 | Roster as a JSON column on `courses` | Untargetable by RLS; can't index for "students who haven't joined." |
| 4 | Section as `text` column on enrollment | Typos, no integrity, hard to rename. |
| 4 | Section per-user record (no course link) | Sections don't exist outside a course offering. |
| 5 | `groups.leader_id` | Leader transfer is messy; can't represent co-leaders; can point at users who left. |
| 5 | `groups.created_by` + leader inferred at runtime | Loses the data; "creator" and "leader" aren't always the same. |

## Open follow-ups (later ADRs may be needed)

- Leader transfer flow (still out of scope; revisit when needed).
- TA / instructor distinction within `enrollments.role`: do they have different powers? (Pilot: treat both as "TA-class," distinguish later if needed.)
- Section reassignment (a student moves from 201 to 202 mid-term): drop `enrollments` row and re-create, or update in place with an audit log entry? Decide before §3 of `../07-auth-flows.md` is implemented.
