# Stage 2 Plan — Frontend Wiring (Group lifecycle + Chat + Notifications + TA)

> Status: **Draft** — review before any code lands.
>
> Goal: extract and wire the remaining out-of-scope pages from
> `App.tsx` so the entire student-facing prototype runs on the real
> backend. Stage 1 covered auth → wizard → Discovery; stage 2 covers
> **groups, conversations, notifications, and the TA flow.**

## 1. What this stage delivers

End-state, in user terms:

1. A student opens the Discovery → Groups tab and sees real forming
   groups from `GET /courses/{id}/groups`. Applying creates real
   rows in `applications`.
2. A student creates a group (or accepts an application) and lands
   on a MyGroup page driven by `GET /groups/{id}`. Leader can edit
   questions, accept/decline applications, kick / leave / disband.
3. A student opens Chats → sees real conversations from
   `GET /conversations` and live messages from
   `GET /conversations/{id}/messages`. Sending a message persists.
4. Notifications bell shows real `GET /notifications`. Clicking a
   "group request received" notif opens the received-request panel
   driven by the real request row, not mock state.
5. TA flow: a TA can create a course (`POST /courses`), upload a
   roster CSV (`POST /courses/{id}/roster`), see an analytics
   dashboard (`GET /courses/{id}/admin`), and copy the invite code.
6. Photos: a user can upload an avatar (Cloudflare R2 presigned URL).

**Out of scope for stage 2** (deferred to stage 3 / pilot polish):

- Real-time push (Supabase Realtime channels) — stage 2 polls.
- pg_partman + pg_cron scheduled jobs — needs Pro tier verification.
- Email notifications (Resend) — stage 2 only writes the in-app row.
- Compatibility weight tune-up — needs pilot data first.

## 2. Backend gap analysis

Stage 1 left these migrations applied but with no ORM models, no
schemas, no services, no routes:

| Migration | Tables | What needs to land |
|---|---|---|
| 0005 | `requests`, `applications`, `application_answers`, `application_votes` | ORM + service + routes (POST/GET requests; POST/GET/accept/decline applications) |
| 0006 | `conversations`, `messages`, `message_reactions`, `read_receipts` | ORM + service + routes |
| 0007 | `notifications` (compat + audit are done) | ORM + service + routes |
| 0008 | `ta_allowlist`, `roster_imports`, `roster_lines` | ORM + service + routes (TA bootstrap + CSV upload) |

Groups (migration 0004) **does** have ORM models but no lifecycle
routes — only the read-side `GET /courses/{id}/groups` (Discovery
feed) exists. Stage 2 adds the write side.

Other gaps surfaced during stage 1:

| Gap | Owner |
|---|---|
| Photo upload — R2 presigned URL endpoint | Stage 2 phase 2e |
| Multi-platform `comm_tool` — schema change | Likely defer to stage 3; not blocking |
| `recently_active` derived flag on `StudentListItem` | Stage 2 phase 2a (small) |
| Rate limiting on `/auth/precheck` | Pre-pilot hardening — separate task, not blocking stage 2 |

## 3. Phased execution

Each phase is one or more sessions ending in a working state. Phases
are mostly independent — they could land in any order — but the
listed order minimizes risk:

- **Phase 2a — Groups (~2 sessions)** — biggest, most interconnected.
- **Phase 2b — Conversations / Chat (~2 sessions)** — depends on groups
  for accept-handle exchange but otherwise standalone.
- **Phase 2c — Notifications (~1 session)** — orchestrates phases 2a+2b.
- **Phase 2d — TA flow (~2 sessions)** — independent of 2a/2b/2c.
- **Phase 2e — Polish & deferred (~1 session)** — photo upload, recently-active flag, lint cleanups.

### Phase 2a — Groups

#### Backend

- **0012 migration** if needed (probably not — schemas exist).
- ORM model gaps: `Application`, `ApplicationAnswer`, `ApplicationVote`, `Request` (the latter for "group request" student→student flow).
- Schemas: `GroupCreate`, `GroupUpdate`, `GroupRead` (already exists for list), `ApplicationCreate`, `ApplicationRead`, plus request/answer/vote shapes.
- Service `app/services/groups.py` with:
  - `create_group(session, current_user, payload)` — starts as solo leader.
  - `update_group(session, group_id, payload)` — recruiting flag, name, description, application questions (replace-set).
  - `apply_to_group(session, current_user, group_id, answers)` — creates `applications` + `application_answers` rows.
  - `accept_application(session, application_id)` / `decline_application(session, application_id)` — leader-only, RLS-respecting.
  - `leave_group(session, current_user, group_id)` — marks `left_at`. If leader leaves: transfer to oldest member or disband.
  - `confirm_group(session, group_id)` — transition to confirmed state.
- Routes mounted under `/api/v1/groups` and `/api/v1/courses/{id}/groups` (for list — already exists).
- Unit tests: 8-12 new tests covering each transition.

#### Frontend

- `api/groups.ts` wrappers for each new endpoint.
- `hooks/useGroup.ts` — `useGroup(groupId)`, `useMyGroup(courseId)`, mutations.
- `components/groups/` rewrite:
  - `GroupsView` reads `GET /courses/{id}/groups` (live).
  - `GroupDetailPanel` reads `GET /groups/{id}` + posts apply.
  - `MyGroup` (currently in App.tsx) extracts to `components/groups/MyGroup.tsx` and wires to live data.
- Discovery's Groups-tab "Stage 2 preview" banner is removed.
- Acceptance: a user can create a group, recruit, accept an applicant, and the applicant lands on the same group.

### Phase 2b — Conversations / Chat

#### Backend

- ORM: `Conversation`, `Message`, `MessageReaction`, `ReadReceipt`.
- Schemas: `ConversationRead`, `ConversationListItem`, `MessageRead`, `MessageCreate`, reaction shape.
- Service `app/services/conversations.py`:
  - `list_conversations(session, current_user, course_id)`.
  - `get_messages(session, conversation_id, cursor, limit)` — cursor-paginated.
  - `send_message(session, conversation_id, body)`.
  - `mark_read(session, conversation_id)`.
  - `react(session, message_id, emoji)`.
- Conversation **creation** is implicit — the first message to a target user auto-creates the conversation (one-on-one) or it's tied to a group acceptance (group-internal).
- Routes under `/api/v1/conversations`.
- Tests: 6-10.

#### Frontend

- `api/conversations.ts` + `hooks/useConversations.ts` + `useMessages.ts`.
- `components/chat/` (new directory):
  - `ChatsPage.tsx` — extract from `App.tsx` (~600 lines today).
  - `ConversationList.tsx`, `MessageThread.tsx`.
- Polling cadence: 5s while a conversation is open, 30s for the list.
  Real-time channels deferred to stage 3.
- Acceptance: a user can send a message and the receiver sees it within 5s.

### Phase 2c — Notifications

#### Backend

- ORM: `Notification` (already partly defined via migration 0007).
- Schemas: `NotificationRead`, `NotificationListResponse`.
- Service: `list_notifications`, `mark_read(id)`, `mark_all_read`.
- **Producers** for notifications already wired in stage 2a/2b:
  - Group request received → notification row inserted in `apply_to_group`.
  - Group request accepted/declined → in `accept_application` / `decline_application`.
  - New message → in `send_message`.
  - Application response → in `accept_application` / `decline_application`.
- Routes under `/api/v1/notifications`.
- Tests: 4-6.

#### Frontend

- `api/notifications.ts` + `hooks/useNotifications.ts`.
- `NotificationBell` already exists in `components/shared/`; rewire
  the data source.
- `App.tsx` mock `DEMO_NOTIFICATIONS` removed. The notifications
  bell now ticks every 30s.
- Acceptance: triggering an apply/accept/message in one tab causes the
  bell to badge in the other tab within 30s.

### Phase 2d — TA flow

#### Backend

- ORM: `TaAllowlist`, `RosterImport`, `RosterLine`.
- Schemas: `CourseCreate`, `CourseUpdate`, `RosterUploadResponse`, `AdminDashRead`.
- Services:
  - `app/services/ta_bootstrap.py` — separate from student bootstrap; reads `ta_allowlist`.
  - `app/services/courses_admin.py` — create / update course (TA-only via TA bootstrap).
  - `app/services/roster.py` — CSV parse + upsert + diff report.
  - `app/services/admin_dash.py` — analytics (counts, at-risk students, formation timeline).
- Routes under `/api/v1/admin/*` (already a router stub from stage 1).
- File upload: CSV comes as multipart/form-data; size cap + content-type check.
- Tests: 8-12.

#### Frontend

- `api/admin.ts` wrappers.
- `components/ta/` (new directory) extracts `TADashEmpty`, `TADash`, `TACourseDash`, `TACreate` from `App.tsx`.
- Acceptance: a TA can create a course, upload a roster, share the invite code, and watch the analytics tick as students join.

### Phase 2e — Polish & deferred

- **Photo upload.** New `POST /api/v1/uploads/presign` endpoint
  returning an R2 presigned PUT URL + final asset URL. Frontend uploads
  directly to R2, then PATCHes `avatar_url` on the profile.
- **`recently_active` server-side flag.** Add to `StudentListItem`
  computed from `last_active_at`. Restore the green dot on Discovery
  cards.
- **ChatsPage eslint error.** Naturally clears when ChatsPage is
  extracted in phase 2b.
- **`packages/api-types/`.** Generate TypeScript types from
  `backend/openapi.json` and switch frontend imports off the
  hand-typed `src/types/api.ts`.

## 4. Migration policy

No new tables expected for the read-side work — migrations 0004-0008
already created them. If any phase needs a new column or RLS
adjustment, ship it as the next migration (0012+). **Always apply
migrations to live Supabase before merging the code that depends on
them** (same rule as stage 1).

## 5. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Groups state machine is complex (forming → confirming → confirmed → disbanded) | Build one transition at a time, with a test per transition. Don't try to implement all four in one PR. |
| Conversations table is partitioned (per ADR 0004) | The migration already handles partitioning. Don't manually `INSERT INTO messages_2026_05`; use the parent table and let pg_partman route writes. |
| Notifications producer wiring spreads across modules | Each producer call lives next to the action that triggers it. Don't centralize — that creates spaghetti. Test that each action inserts a notification row. |
| Real-time deferred to stage 3, but polling feels janky | Acceptable for the pilot. Document the polling cadence in component docstrings so future migration to channels is clean. |
| CSV upload security (CSV injection, oversize, malformed) | Enforce content-type, max 1 MB, parse via stdlib `csv` with strict mode, reject any cell starting with `=`/`+`/`-`/`@`. |
| TA flow can mutate course state in destructive ways | All destructive endpoints require explicit confirmation in the UI (modal). The backend rejects any state change without a TA bootstrap. |

## 6. Time estimate

- Phase 2a (Groups): 2 sessions.
- Phase 2b (Chat): 2 sessions.
- Phase 2c (Notifications): 1 session.
- Phase 2d (TA): 2 sessions.
- Phase 2e (Polish): 1 session.

Total: ~8 sessions. Can pause and merge at the end of any phase —
every phase ends in a working state.

## 7. Decisions to confirm

1. **Real-time deferred.** Stage 2 polls (5s in-thread, 30s list /
   notif). Real-time channels are a stage 3 deliverable. **Confirm.**
2. **Phase order.** Groups first because it unblocks both Chat
   (group-internal conversations) and Notifications (apply/accept
   producers). **Confirm.**
3. **TA flow can land in parallel.** Phase 2d doesn't share any
   surface with 2a/2b/2c. A separate session can pick it up
   independently. **Confirm.**
4. **Conversation model.** One conversation per pair of users for
   1-on-1, one conversation per group for group chat. Group chat
   membership = group membership. **Confirm.**
5. **Notification deduplication.** Each producer call inserts at
   most one notification row per (recipient, type, source_id) tuple.
   **Confirm.**

If any of these need adjustment, push back before phase 2a starts.
Otherwise the defaults stand.
