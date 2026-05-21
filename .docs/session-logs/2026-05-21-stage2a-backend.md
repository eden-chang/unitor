# Session log — 2026-05-21 — Stage 2a backend (group lifecycle endpoints)

This log covers the working session that landed the writable surface
for the groups domain — the backend half of phase 2a in
[`.docs/frontend-stage2-plan.md`](../frontend-stage2-plan.md).

Going in:

- Migration 0004 (groups + memberships + application questions) and
  migration 0005 (requests + applications + answers + votes) had
  shipped to live Supabase back on 2026-05-17, but only the groups
  ORM was wired. Applications, application_answers, application_votes,
  and requests were SQL-only with no Python access.
- Discovery's read side already consumed `GET /courses/{id}/groups`
  (live since stage 1). The write side — creating a group, applying,
  accepting / declining, leaving, confirming — had no service or
  route.
- Migration 0004 had explicitly chosen "writes flow through the
  service role; no direct policy needed" for the groups family. That
  rationale was preserved here.

Going out: the full group lifecycle is callable from
`/api/v1/groups` and `/api/v1/applications`, with leader / member
authorization performed against `group_memberships` in the service
layer. 19 new route tests, taking the suite from 71 → 90 passing.

All commits authored as `eden-chang <eden.chang27@gmail.com>`. Branch
policy still "commit directly to `main`."

Commits this session:

| Commit | Message |
|---|---|
| `1594ad8` | feat(backend): stage 2a — group lifecycle endpoints |

---

## Phase 1 — Plan + decisions surface

Before any code, drafted [`.docs/frontend-stage2-plan.md`](../frontend-stage2-plan.md)
and pushed it for review. Five "Decisions to confirm" went in §7:

1. Real-time deferred to stage 3 (poll every 5s/30s).
2. Phase order: Groups first (2a), then Chat (2b), Notifications (2c),
   TA (2d), polish (2e).
3. TA flow (2d) lands in parallel with 2a/2b/2c.
4. One conversation per pair for 1-on-1, one per group for group chat.
5. Notification dedupe: at most one row per (recipient, type, source_id).

User confirmed the plan implicitly by saying "continue" — the
defaults stand.

## Phase 2 — Authorization model trade-off

A real choice surfaced before writing any service code: should group
writes use `user_session` (with new RLS write policies) or
`admin_session` (per migration 0004's stated intent)?

Considered three options:

1. **`admin_session` everywhere.** Matches migration 0004's design.
   The route file imports `admin_session`, breaking the convention
   that restricts the import to `admin/`, `auth/`, and `jobs/`.
2. **Mount under `app/api/v1/admin/groups.py`** so the import is
   technically legal under the existing allowlist. Semantically
   wrong — students do group operations, not admins.
3. **Add migration 0012 with RLS write policies.** Cleanest
   long-term but contradicts 0004's "no direct policy needed" and
   adds substantial migration + policy work for a stage 2a deliverable.

Picked option 1 and extended `app/db/admin.py`'s restricted-import
docstring to include `app/api/v1/groups.py`. Documented in the
commit message + the route module's top-of-file comment.

The CI lint rule that was supposed to enforce the restriction is
still on the pre-pilot hardening list — current enforcement is
convention only, so the docstring extension is the entire
policy change.

## Phase 3 — ORM models for the migration-0005 tables

`backend/app/db/models/application.py` (new) mirrors migration 0005:

- `Application` — group_id + applicant_user_id + status + audit
  (responded_at, responded_by_user_id).
- `ApplicationAnswer` — question_text_snapshot for the audit-friendly
  question editing (ADR 0009 §3): leader edits to the parent question
  don't relocate prior answers.
- `ApplicationVote` — multi-member voting on a pending application
  (not wired into a route yet; the leader-only accept/decline path is
  the stage-2a deliverable, voting is stage 2c+).
- `Request` — the orthogonal "student → student" flow. Schema lands
  here so the ORM is complete, but no route yet (covered by
  notifications phase 2c).

Re-exported all four from `app/db/models/__init__.py`. Ordering in
the `__all__` list kept alphabetical.

## Phase 4 — Schemas

`backend/app/schemas/groups.py` (new) carries everything the writable
surface needs that isn't already in the discovery schema:

- `GroupCreate` — takes `enrollment_id` (not `course_id`) so the
  service can derive the course from a row it's verified belongs to
  the caller. Reuses the leader-set application questions via
  `GroupApplicationQuestionEntry` (id-optional for replace-set).
- `GroupUpdate` — partial update with `application_questions: list | None`.
  Passing `None` keeps questions untouched; passing a list atomically
  replaces.
- `GroupDetailRead` — full membership detail + confirmation timestamps.
  Sibling of `discovery.GroupListItem` (which trims for the feed
  render).
- `ApplicationCreate` / `ApplicationRead` / `ApplicationAnswerRead` —
  the apply / list / accept-decline surface.

Decision: `comm_handle` and other privacy-sensitive fields stay out
of `ApplicationRead`. They flow through the chat path (stage 2b),
not the application path.

## Phase 5 — Service layer

`backend/app/services/groups.py` (new). 11 functions, 12 exception
types, ~680 lines.

### `create_group`

- Validates the enrollment belongs to the caller + is active.
- Rejects if the caller already has a non-disbanded membership in
  the same course (one student → one group at a time).
- Inserts `groups` row + `group_memberships` leader row + any seed
  application questions.

### `update_group`

- Leader-only via `_require_leader` (checks `group_memberships`
  with `role='leader' AND left_at IS NULL`).
- Replace-set semantics for questions: existing rows not in the
  incoming id set get archived (not deleted, so snapshots stay
  intact). New rows insert. Kept rows get text + order updated in
  place.

### `apply_to_group`

- Rejects on: group not found, group not recruiting, group already
  past forming stage, applicant already a member, applicant has a
  pending application for this group, or an answer references a
  question that isn't on the group.
- Each `ApplicationAnswer` stores `question_text_snapshot` lifted
  from the live question at apply-time, so future edits to the
  question text don't change the historical answer's context.

### `accept_application` / `decline_application`

- Leader-only.
- Idempotency: rejects if the application is already non-pending
  with `APPLICATION_ALREADY_RESPONDED`.
- Accept side effects:
  - Inserts a `group_memberships` row for the applicant. Defensive
    re-check that they aren't already a member (rare race).
  - Verifies the applicant still has an active enrollment in the
    course; otherwise raises `EnrollmentNotFound` → 409
    `APPLICANT_NOT_ENROLLED`.
  - Auto-withdraws the applicant's other pending applications in
    the same course (`_withdraw_other_pending_applications`). The
    student can only be in one group; their pending applications
    elsewhere are stale.

### `leave_group`

- Marks `left_at = now()`.
- Leader leaving logic:
  - If another active member exists, promote the oldest-joined to
    leader.
  - If no one else remains, transition group to `disbanded` +
    `recruiting = false`.
- Members leaving don't trigger anything special — the partial
  unique index `uq_group_memberships_active` already ensures one
  active membership per (group, user) pair, so the row is just
  marked left.

### `confirm_group`

- Leader-only.
- Two-step transition:
  - `forming → confirming` flips `recruiting = false` and stamps
    `confirmation_initiated_at`.
  - If every active member has a non-null `confirmed_at`,
    transitions to `confirmed` and stamps `confirmed_at`.
- Stage 2a doesn't wire the per-member "I confirm" endpoint; that
  lands when the MyGroup confirmation UI ships. For now the leader
  calls `/confirm` repeatedly until everyone's row catches up via
  some future mechanism.

### Exception taxonomy

| Exception | Maps to | Status |
|---|---|---|
| `GroupNotFound` | `GROUP_NOT_FOUND` | 404 |
| `NotALeader` | `NOT_GROUP_LEADER` | 403 |
| `NotAMember` | `NOT_GROUP_MEMBER` | 403 |
| `AlreadyInGroup` | `ALREADY_IN_GROUP` | 409 |
| `GroupNotRecruiting` | `GROUP_NOT_RECRUITING` | 409 |
| `GroupAlreadyConfirmed` | `GROUP_ALREADY_CONFIRMED` | 409 |
| `DuplicateApplication` | `DUPLICATE_APPLICATION` | 409 |
| `InvalidQuestion` | `INVALID_QUESTION` | 400 |
| `ApplicationNotFound` | `APPLICATION_NOT_FOUND` | 404 |
| `ApplicationAlreadyResponded` | `APPLICATION_ALREADY_RESPONDED` | 409 |
| `EnrollmentNotFound` | `ENROLLMENT_NOT_FOUND` / `APPLICANT_NOT_ENROLLED` | 403 / 409 |

## Phase 6 — Routes

`backend/app/api/v1/groups.py` (new) exposes two routers:

- `router` (prefix `/groups`) — create, get, patch, apply,
  list-applications, leave, confirm.
- `applications_router` (prefix `/applications`) — accept,
  decline. Separated so URLs read `/applications/{id}/accept`
  rather than nesting under `/groups/{group_id}/applications/{id}`.

Both registered from `app/main.py`. Every endpoint takes
`Annotated[CurrentUser, Depends(get_current_user)]` (no
`UserSessionDep` since group writes use admin_session inline) and
wraps the service call with the standard try/except → `_err()`
adapter.

## Phase 7 — Tests

19 new route tests in `tests/unit/test_groups_routes.py`. Pattern:
patch `groups_routes.admin_session` to a `MagicMock`-yielding async
context manager, monkey-patch the service function for the test
case, drive the route, assert status + error code.

Coverage:

- create_group: happy path, AlreadyInGroup → 409, EnrollmentNotFound
  → 403, requires-auth → 401.
- get_group: happy path, GroupNotFound → 404.
- update_group: NotALeader → 403.
- apply_to_group: happy, GroupNotRecruiting → 409,
  DuplicateApplication → 409, InvalidQuestion → 400.
- list_applications: happy, NotALeader → 403.
- accept_application: happy, ApplicationAlreadyResponded → 409.
- decline_application: happy.
- leave_group: happy (disband path), NotAMember → 403.
- confirm_group: happy.

Final state: 90 tests pass, `ruff check` + `ruff format --check` +
`mypy app` all clean.

## Phase 8 — Cleanup

Pre-format pass had some import ordering issues + a couple of
unused `# type: ignore[arg-type]` comments I'd left on the Pydantic
literal coercions. `ruff format` + a hand pass cleaned both up. The
remaining `_ = (and_, func)` defensive line for unused sqlalchemy
imports was removed entirely once mypy confirmed neither was used.

---

## Things to know going into Stage 2a frontend

1. **Group writes flow through admin_session.** Frontend doesn't
   know or care — every endpoint is just a typed call. But when
   debugging "why did this write succeed when I expected RLS to
   block it," remember the service performs application-layer
   authorization, not the DB.

2. **`enrollment_id` is the create handle, not `course_id`.** When
   wiring `useCreateGroup`, pass `auth.enrollments[0].id`, not
   `auth.enrollments[0].course.id`. The service verifies the
   enrollment belongs to the caller before deriving the course.

3. **Leader-only mutations.** `update_group`, `confirm_group`, and
   the `/applications/{id}/accept|decline` endpoints all 403 if the
   caller isn't an active leader. The frontend should gate those
   buttons behind a `useIsLeader(groupId)` check rather than relying
   on the error.

4. **Auto-withdraw on accept.** When a leader accepts a candidate,
   all the candidate's other pending applications for the same
   course flip to `withdrawn`. The frontend's "my pending
   applications" view should refetch after any accept event so the
   list doesn't go stale.

5. **`question_text_snapshot` is the historical record.** When
   rendering an old `ApplicationRead.answers`, prefer
   `question_text_snapshot` over looking up the live question text
   — leaders may have edited or archived it since.

6. **Confirmation is two-step.** The current `/confirm` endpoint
   flips `forming → confirming` on first call, and `confirming →
   confirmed` only when every member's `confirmed_at` is set. The
   per-member confirm endpoint doesn't exist yet; calling
   `/confirm` repeatedly is currently a no-op past the first
   transition. Stage 2a-frontend should expose the leader-side
   "initiate confirmation" button but defer the per-member confirm
   UI until the matching backend lands (probably stage 2c or 2d).

7. **No notifications producer yet.** When `accept_application`
   fires, the candidate gets no notification — that's a phase 2c
   deliverable. The frontend can poll the candidate's "my
   applications" view in the meantime.

8. **No migrations this session.** Migration head stays at 0011.
   No DB changes were needed.

---

## Open follow-ups (carried into stage 2a frontend)

- Per-member confirmation endpoint (needed to actually reach
  `confirmed` state from `confirming`).
- Notifications producer wiring (phase 2c).
- Application vote endpoint (phase 2c+).
- Request endpoints (phase 2c, replaces the still-mock "received
  request" panel state in App.tsx).
- CI lint rule enforcing the `admin_session` import allowlist —
  still convention-only.
