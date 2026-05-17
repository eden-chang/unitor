# 10 — API Surface

This document inventories every API call the frontend needs, mapped to either **Supabase direct** (PostgREST + RLS) or **FastAPI** (`/api/v1/...`), per the routing rule in [`decisions/0002-backend-stack.md`](./decisions/0002-backend-stack.md). It also covers cron-triggered endpoints invoked by Postgres / GitHub Actions.

All endpoint shapes are defaults open to review.

## Conventions

- **Path prefix for FastAPI**: `/api/v1`.
- **Auth**: every endpoint (Supabase or FastAPI) requires a Supabase JWT in `Authorization: Bearer …` except where noted as public.
- **Errors**: shape `{ code, message, details? }` per [ADR 0008](./decisions/0008-conventions.md).
- **Pagination**: cursor-based. Query param `cursor`. Response includes `next_cursor` (null when exhausted).
- **Casing**: snake_case in JSON.
- **Identifiers**: UUIDv7 strings.

---

## Part 1 — Supabase direct (PostgREST + RLS)

These are accessed from the frontend via the `@supabase/supabase-js` client. RLS enforces authorization at the DB layer; no FastAPI in the path.

### Auth

- `supabase.auth.signInWithOtp({ email })` — start magic-link sign-in.
- `supabase.auth.signOut()` — log out.
- `supabase.auth.refreshSession()` — handled automatically by the SDK.
- `supabase.auth.onAuthStateChange(...)` — used to drive frontend state.

### Reads (PostgREST `GET`)

| Resource | Query | RLS rule |
|---|---|---|
| `users` | `select=id,display_name,default_avatar_url` for users in shared courses | Only enrolled-with-me + self |
| `universities` | `select=*` | All authenticated |
| `courses` | `select=*&id=in.(my_enrolled_course_ids)` | Only courses I'm enrolled in |
| `sections` | `select=*&course_id=eq.{id}` | Course members |
| `enrollments` | `select=*&course_id=eq.{id}` | Course members |
| `profiles` | `select=*&enrollment_id=in.(course_enrollment_ids)` | Same course |
| `profile_skills` | join via profile | Same course |
| `profile_schedule_slots` | join via profile | Same course |
| `course_skills` | `select=*&course_id=eq.{id}` | Course members |
| `groups` | `select=*&course_id=eq.{id}` | Course members |
| `group_memberships` | `select=*&group_id=eq.{id}` | Course members |
| `group_application_questions` | `select=*&group_id=eq.{id}` | Course members |
| `requests` | `select=*&or=(sender_user_id.eq.me,receiver_user_id.eq.me)` | Sender or receiver |
| `applications` | inbox / outbox | Applicant or group member |
| `application_answers` | join | Same as application |
| `application_votes` | for an application | Group members |
| `conversations` | `select=*` joined with `conversation_participants` | Active participant |
| `conversation_participants` | `select=*&conversation_id=eq.{id}` | Active participant |
| `messages` | `select=*&conversation_id=eq.{id}&order=created_at.desc&limit=50` | Active participant |
| `message_reactions` | join | Active participant in parent conversation |
| `notifications` | `select=*&recipient_user_id=eq.me&order=created_at.desc&limit=20` | Self only |
| `compatibility_cache` | `select=*&viewer_user_id=eq.me&course_id=eq.{id}` | Self as viewer |

### Writes (PostgREST `POST`/`PATCH`/`DELETE`)

| Resource | Operation | RLS rule |
|---|---|---|
| `profiles` | `PATCH` (update own bio, work-style fields) | Own only |
| `profile_skills` | `POST`/`DELETE` | Own only |
| `profile_schedule_slots` | `POST`/`DELETE` | Own only |
| `profile_links` | `POST`/`PATCH`/`DELETE` | Own only |
| `messages` | `POST` | Active participant |
| `message_reactions` | `POST`/`DELETE` | Own only |
| `notifications` | `PATCH read_at` | Own only |
| `conversation_participants` | `PATCH last_read_at` | Own only |
| `application_votes` | `POST`/`DELETE` (own up/down vote) | Group members |

### Realtime subscriptions

Frontend subscribes via `supabase.channel("...")`. Each subscription is per-resource, not per-course.

| Channel | Filter | Triggers refresh of |
|---|---|---|
| `conversation:{id}` | INSERT on `messages` WHERE `conversation_id = {id}` | The chat thread view |
| `user:{id}:notifications` | INSERT on `notifications` WHERE `recipient_user_id = {id}` | The notification bell |
| `course:{id}:groups` (optional, scope: leader UI) | INSERT/UPDATE on `groups` and `group_memberships` for the leader's group | The MyGroup page |

Avoid course-wide channels (Discovery board doesn't subscribe — students refresh by reopening).

---

## Part 2 — FastAPI endpoints (domain logic)

All under `/api/v1`. All require Supabase JWT unless noted public.

### Auth lifecycle

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/precheck` | Student: check if email is on any roster. Public; uses email only. Returns `{ on_roster, course_count }`. |
| `POST` | `/auth/ta-precheck` | TA: check if email is on `ta_allowlist`. Public. Returns `{ allowed }`. |
| `POST` | `/auth/bootstrap` | After Supabase magic-link callback: ensure `public.users` row, link roster entries, create enrollments. Idempotent. |
| `DELETE` | `/users/me` | Account deletion. Hard-deletes most user data; anonymizes messages. |

### Profile

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/profiles/avatar/upload-url` | Returns an R2 presigned PUT URL for uploading a profile photo. Body: `{ filename, content_type, size }`. Response: `{ upload_url, object_key }`. |
| `POST` | `/profiles/avatar/commit` | Confirms upload after the browser PUT. Updates `profiles.avatar_url`. Body: `{ object_key }`. |
| `POST` | `/enrollments/{id}/profile/complete` | Marks the profile setup as complete (idempotent guardrail). Validates that the profile meets the "complete" criteria. |

### Course (TA)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/courses` | TA creates a course. Body: `{ university_id, code, name, semester, department?, min_group_size, max_group_size, deadline_at, timezone, sections: [...], skills: [...] }`. |
| `PATCH` | `/courses/{id}` | TA updates a course's basic fields. |
| `POST` | `/courses/{id}/sections` | Add a section. |
| `PATCH` | `/courses/{id}/sections/{section_id}` | Rename a section. |
| `DELETE` | `/courses/{id}/sections/{section_id}` | Soft-remove (only if no enrollments use it). |
| `POST` | `/courses/{id}/skills` | Add to skill catalog. |
| `PATCH` | `/courses/{id}/skills/{skill_id}` | Rename / reorder. |
| `DELETE` | `/courses/{id}/skills/{skill_id}` | Remove (only if no profile_skills use it). |
| `POST` | `/courses/{id}/archive` | Archive course (changes state, freezes writes). |

### Course join (student)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/courses/join` | Student joins a course via invite code. Body: `{ invite_code }`. Validates against roster; creates `enrollments` if matched. |
| `POST` | `/courses/{id}/leave` | Student drops a course. |

### Roster

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/courses/{id}/roster/preview` | Upload a CSV; returns the parsed preview. Form-data with `file`. See [`./09-csv-roster-spec.md`](./09-csv-roster-spec.md). |
| `POST` | `/courses/{id}/roster/commit` | Commit a previously uploaded preview. Body: `{ upload_id, mode, skip_errors }`. |
| `GET` | `/courses/{id}/roster/export` | Download current roster as CSV. |
| `DELETE` | `/courses/{id}/roster/entries/{entry_id}` | Manually remove a roster entry. |

### Requests (one-to-one)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/requests` | Send a group request. Body: `{ course_id, receiver_user_id, why, question? }`. Side effects: create row, write a message into a new conversation, fire notification, schedule `expires_at`. |
| `POST` | `/requests/{id}/respond` | Receiver responds. Body: `{ action: "accept" \| "decline" \| "reply", reason?, note? }`. Accept side-effect: create group if neither has one, add both to `group_memberships`. Reply side-effect: set status to `replied`, no decision yet. |
| `POST` | `/requests/{id}/withdraw` | Sender withdraws while pending. |

### Group applications

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/applications` | Submit application. Body: `{ group_id, answers: [{ question_id, answer_text }] }`. |
| `POST` | `/applications/{id}/respond` | Leader responds. Body: `{ action: "accept" \| "decline" \| "reply", note? }`. |
| `POST` | `/applications/{id}/withdraw` | Applicant withdraws. |

### Groups

| Method | Path | Purpose |
|---|---|---|
| `PATCH` | `/groups/{id}` | Leader updates name / description / recruiting toggle / application questions. |
| `POST` | `/groups/{id}/leave` | Member leaves. Triggers leader auto-transfer if leader leaves. |
| `POST` | `/groups/{id}/confirm/initiate` | Leader starts 24h confirm window. Validates `min_size <= members <= max_size`. |
| `POST` | `/groups/{id}/confirm/agree` | Each member confirms within the window. |
| `POST` | `/groups/{id}/confirm/cancel` | Leader cancels the confirm window. |
| `POST` | `/groups/{id}/members/{user_id}/remove` | Leader removes a member. |

### Compatibility / matching

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/compatibility/batch` | Body: `{ course_id, target_user_ids: [uuid] }`. Returns cache results; computes missing/stale entries inline. Response is an array of `CompatibilityResult`. |

### TA analytics

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/ta/courses/{id}/overview` | Returns `{ student_count, group_count, ungrouped_count, days_to_deadline, confirmation_percent }`. |
| `GET` | `/ta/courses/{id}/formation-timeline` | Returns time-series for the bar chart. |
| `GET` | `/ta/courses/{id}/section-breakdown` | Per-section counts. |
| `GET` | `/ta/courses/{id}/skill-supply-demand` | Per-skill seekers/available numbers. |
| `GET` | `/ta/courses/{id}/at-risk` | List of students flagged at-risk by activity / deadline. |
| `GET` | `/ta/courses/{id}/groups` | All groups with member lists (post-deadline view). |
| `POST` | `/ta/courses/{id}/extend-deadline` | Push the deadline. Body: `{ new_deadline_at }`. Writes audit log. |
| `POST` | `/ta/courses/{id}/remind` | Bulk-email ungrouped students. Body: `{ subject?, body? }` for customization. |
| `POST` | `/ta/courses/{id}/remind-student/{user_id}` | One-off reminder. |
| `POST` | `/ta/courses/{id}/suggest-match/{user_id}` | Surface a match suggestion to a student (creates a notification). |
| `POST` | `/ta/courses/{id}/provisional-groups` | Force-run the provisional group formation now (dry-run by default). Body: `{ apply: bool }`. |

### Chats (special FastAPI cases)

Most chat operations go through Supabase direct, but a few orchestrated ones use FastAPI:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/conversations` | Create a conversation (only needed when starting a new direct chat; group chats auto-create with the group). Body: `{ course_id, type, target_user_id? }`. |
| `DELETE` | `/conversations/{id}` | Per [ADR 0009](./decisions/0009-audit-corrections.md) §13: sets the caller's `conversation_participants.left_at`. For `type='direct'`, if the other participant already has `left_at` set, FastAPI hard-deletes the conversation row + cascades messages in the same transaction. For `type='group'`, hard-delete is deferred to a cron job that runs only when the group is disbanded. |

### Health / admin

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Public. Liveness check. |
| `GET` | `/health/ready` | Public. Readiness — checks DB connection. |
| `GET` | `/version` | Public. Returns `{ commit, build_time }`. |

---

## Part 3 — Cron-triggered endpoints

Triggered by `pg_cron` (on Supabase Pro) or by GitHub Actions cron (on Supabase Free). All authenticated with a shared cron secret in `X-Cron-Token` header, not a user JWT.

| Method | Path | Schedule | Purpose |
|---|---|---|---|
| `POST` | `/cron/requests/expire` | Every 15 min | Mark `requests` with `expires_at < now()` as `expired`. Notify both parties. |
| `POST` | `/cron/groups/confirm-expire` | Every 15 min | If a group's `confirmation_deadline_at < now()` and not all members have confirmed: remove unconfirmed members, demote/transfer leader if needed, return group to `forming`. |
| `POST` | `/cron/courses/deadline-tier-tick` | Every hour | Compute current deadline tier per active course; create `urgent_mode` notifications for ungrouped students at the appropriate thresholds. |
| `POST` | `/cron/courses/provisional-groups` | Daily at midnight per course-tz, last day before deadline | Generate provisional group recommendations and notify ungrouped students. |
| `POST` | `/cron/notifications/cleanup` | Daily | Hard-delete notifications older than 30 days. |
| `POST` | `/cron/messages/archive` | Monthly | Dump partitions older than 12 months to R2 and drop them. |
| `POST` | `/cron/compatibility/clean-stale` | Daily | Mark cache rows stale where either party has been inactive 30+ days. |
| `POST` | `/cron/audit-log/archive` | Yearly | Dump audit_log older than 1 year to R2. |

---

## Part 4 — Mapping to frontend pages

Cross-reference between the screens in [`./02-frontend-inventory.md`](./02-frontend-inventory.md) and the calls each one makes.

| Page | Reads | Writes |
|---|---|---|
| `landing`, `login`, `signup-*`, `verify` | (Supabase Auth) | (Supabase Auth) `POST /auth/precheck`, `POST /auth/ta-precheck`, `POST /auth/bootstrap` |
| `dash`, `dash-empty` | Supabase: `courses`, `enrollments` | — |
| `join` | — | `POST /courses/join` |
| `prof-0..3` | Supabase: `course_skills`, `sections` | Supabase: `profiles`, `profile_skills`, `profile_schedule_slots`, `profile_links`; `POST /profiles/avatar/upload-url`, `POST /profiles/avatar/commit`; `POST /enrollments/{id}/profile/complete` |
| `profile-edit` | Supabase: own profile + tied tables | Supabase: same; avatar via FastAPI |
| `board` (Discovery) | Supabase: `enrollments`, `profiles`, `profile_skills`, `profile_schedule_slots`; `POST /compatibility/batch` | — |
| `Discovery` filters/sort | (client-side over loaded data) | — |
| `ProfilePanelContent` (slide-out) | Supabase: target profile; cached compat via batch | `POST /requests`, `POST /requests/{id}/withdraw` |
| `ReceivedRequestPanel` | — | `POST /requests/{id}/respond` |
| `GroupDetailPanel` | Supabase: group, members, questions | `POST /applications`, `POST /applications/{id}/withdraw` |
| `mygroup` | Supabase: group, members, applications, application_answers, application_votes | Supabase: `application_votes`; FastAPI: `POST /applications/{id}/respond`, `PATCH /groups/{id}`, `POST /groups/{id}/leave`, `POST /groups/{id}/confirm/initiate`, `POST /groups/{id}/confirm/agree`, `POST /groups/{id}/members/{user_id}/remove` |
| `urgent` | Supabase: cached compat; course deadline | `POST /ta/courses/{id}/remind-student/me` (Ask TA for help) |
| `chats` | Supabase: conversations, messages, reactions, participants | Supabase: messages, reactions, last_read_at; FastAPI: `POST /conversations`, `DELETE /conversations/{id}` |
| `Nav` bell | Supabase: `notifications` (realtime) | Supabase: `PATCH notifications.read_at` |
| `ta-dash`, `ta-dash-empty` | Supabase: courses owned/taed | — |
| `ta-create` | — | `POST /courses`; `POST /courses/{id}/roster/preview`, `POST /courses/{id}/roster/commit` |
| `ta-course-dash` Overview | `GET /ta/courses/{id}/overview`, `/formation-timeline`, `/section-breakdown`, `/skill-supply-demand` | `POST /ta/courses/{id}/extend-deadline`, `POST /ta/courses/{id}/provisional-groups`, `POST /ta/courses/{id}/remind` |
| `ta-course-dash` Students | Supabase: enrollments + profiles | (mostly read; per-student actions go through FastAPI) |
| `ta-course-dash` Alerts | `GET /ta/courses/{id}/at-risk` | `POST /ta/courses/{id}/remind-student/{user_id}`, `POST /ta/courses/{id}/suggest-match/{user_id}` |

---

## Part 5 — Notification dispatch flow

Whenever FastAPI performs a side-effect that should notify someone, it inserts into `notifications`. Supabase Realtime then pushes the new row to the recipient's subscribed channel.

```
[FastAPI service] → [INSERT INTO notifications] → [Postgres LISTEN/NOTIFY internally] → [Supabase Realtime] → [user:{id}:notifications channel] → [Frontend bell badge updates]
```

For email-delivered notifications (TA reminders, deadline alerts to inactive students who aren't online): FastAPI calls Resend's API and stamps `audit_log`.

---

## Part 6 — Idempotency

Endpoints that create resources should be safe to retry:

- `POST /auth/bootstrap` — naturally idempotent (uses `ON CONFLICT DO NOTHING` and existence checks).
- `POST /courses/join` — returns `200` with the existing enrollment if already joined.
- `POST /requests` — duplicate active request (same sender, receiver, course) returns existing request with status `409 REQUEST_ALREADY_PENDING`.
- `POST /applications` — same shape for duplicate active application.
- Cron endpoints accept an optional `Idempotency-Key` header for safe retry.

Endpoints that perform destructive actions (`DELETE /users/me`, `DELETE /courses/{id}/roster/entries/{entry_id}`) are not idempotent in the strict sense (the second call returns `NOT_FOUND`) — but they don't have surprising side effects on a retry.

---

## Part 7 — Open questions / decisions

1. **No public endpoints other than precheck, health, and version** — even the landing page's "see a demo course" feature, if we want it, requires auth. Confirm.
2. **Bulk endpoints**: should `POST /compatibility/batch` cap the array size? Recommend cap at 200 target ids per request to prevent abuse.
3. **Notification email delivery threshold**: do we always email TA reminders, or only when the recipient is offline? Recommend: always (TA initiates the action; the user should always know).
4. **Per-conversation Realtime channels** vs course-wide: confirmed per-conversation. Open: should the leader UI subscribe to the whole group's applications too? (Yes, recommend.)
5. **Search**: no search endpoint defined yet. Discovery search is client-side over the loaded list. If course sizes grow, add `GET /courses/{id}/students/search` with Postgres `pg_trgm`.
6. **Versioning**: `/api/v1` is the current and only version. The next breaking change will branch to `/api/v2`. Old endpoints stay live for 90 days after deprecation.
7. **CORS**: production allows `https://app.unitor.app` and `https://*.vercel.app` (for preview URLs). Dev allows `http://localhost:5173`. Configure in `app/main.py`.
8. **Rate limits**: deferred to post-pilot. When added: 100 req/min for general endpoints, 10 req/min for write endpoints, 3 req/min for `POST /requests` (anti-spam).
9. **Webhooks**: none yet. If we add Supabase auth webhooks (e.g., for cleanup on `auth.user.deleted`), they live under `/webhooks/supabase` with HMAC verification.
