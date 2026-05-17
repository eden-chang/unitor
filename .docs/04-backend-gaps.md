# 04 — Backend Gaps

This document lists what the prototype is missing in order to become a usable, multi-user product. Each gap is named, scoped, and tied to the frontend surface that depends on it. **This is a gap analysis, not an implementation plan** — `05-planning-targets.md` covers the forward-looking planning surface.

## 1. Identity, sessions, authorization — entirely absent

What's missing:

- No signup that creates a real user record. `SignupForm` only stores the name/email in `localStorage`.
- No password storage, hashing, or strength enforcement beyond a frontend `pw.length >= 8` check.
- No email verification — the "verify" page just has an "I've verified my email" button.
- No login session, token, refresh, or logout (the avatar dropdown's "Log Out" simply returns to `landing`).
- No role distinction at runtime — `role: "s" | "t"` lives in component state and is set by which signup button was clicked.
- No course-scoped authorization. Any user could, in principle, view any course's data because all data is bundled into the static frontend.
- No leader-only enforcement (e.g., only the leader should be able to accept applications, configure the application form, or trigger group confirmation).

Surfaces that need this:

- `Landing`, `Login`, `SignupRole`, `SignupForm`, `Verify`.
- `Nav` avatar menu (Edit Profile, Log Out).
- Every authenticated page (must reject unauthenticated requests).
- `MyGroup` leader actions (Accept application, Decline, Confirm Group, List for Recruiting).
- `TACourseDash` (TA-only) and `TACreate` (TA-only).

Open design questions:

- Auth provider: roll-your-own vs. SSO with the university IdP vs. a managed service?
- Session model: cookie-based session vs. JWT vs. opaque token?
- Password recovery flow (today the "Forgot password?" link just toasts a message).
- TA URL gating (the UX doc mentions `easea.com/instructor`); is the role decided by URL, by IdP claim, or by manual TA invitation?

## 2. Persistence — only `localStorage`

What's missing:

- No database. All state either disappears at "reset" or is trapped on one device.
- No multi-device sync (a student logging in from a phone sees an empty world).
- No cross-user visibility (your sent request never reaches the other person — there is no other person).
- No data migration story; schema changes will corrupt stored JSON shapes silently (the hook just falls back to default).

Surfaces depending on persistence:

- Every list and detail page. See `03-mock-data-and-state.md` §2 for the exhaustive `unitor_*` key list.

Open design questions:

- Database choice (Postgres vs. SQLite vs. a managed cloud DB).
- Whether profile data is per-enrollment (one profile per course) or per-user (shared across courses).
- Soft-delete vs. hard-delete for groups, conversations, accounts.

## 3. Course lifecycle and roster ingest

What's missing:

- `TACreate` collects every field needed (university, department, course code, semester, name, min/max group size, deadline, sections, skills catalog) but does nothing with them.
- The "Import Student Roster (CSV)" file input only flips a `uploaded` boolean to show a green banner. There is no CSV parsing, no schema validation, no duplicate handling, no preview, no error reporting, no per-section split.
- Invite code (`W543M7`) is hardcoded and not generated, not validated, not rotated.
- "Join a course" (`Join`) accepts any 6-character code and always resolves to CSC318.

Surfaces:

- `TACreate`, `TADash`, `TADashEmpty`.
- `Join`, `Dash`, `DashEmpty`.
- `SignupForm` (email matching against roster).
- `Prof2` (section pre-filled from CSV).

Open design questions:

- CSV column contract: `name, email, section` is the documented minimum. What about preferred name, opt-out flag, accommodations?
- Roster updates after course creation (add/remove students mid-semester, re-import, diff).
- Multi-instructor / co-TA support.
- Skill catalog editing post-creation: can students see new skills appear, or are catalogs frozen at course start?

## 4. Profiles and matching

What's missing:

- The own-user profile (`ProfileEdit`) writes to `localStorage` and never feeds into compatibility, schedule overlap, or any decision the UI makes about other students.
- All compatibility scores are stored verbatim per persona in `COMPAT` and `STU`. There is no scoring function.
- "Schedule overlap" is a hand-authored integer (`scheduleOverlapHrs`) plus a display string (`overlap`); the schedule grids in `SCHEDULE_DATA` were tuned to roughly match those numbers, not derived from them.
- Work-style compatibility (`WORK_STYLE_DATA`) is a static three-row table per student — no real comparison against your `profileMeetFreq` / `profileMeetStyle` / `profileCommTool`.
- "Last active" is a frozen human string; there is no real activity tracker.

Surfaces:

- `Discovery` (cards, sort by Best Match / Most Overlap / Recently Active, overlap filter).
- `ProfilePanelContent` (compatibility breakdown, schedule overlap grid, work-style table).
- `Urgent` (suggested matches list).
- `TACourseDash` Overview tab (skill demand, ungrouped table, formation timeline).

Open design questions:

- Whose profile is the "current user" — once the backend exists, the seeded `STU` array should be replaced by real enrolled students plus the current user. How is the seed data retired without losing demo value?
- Matching algorithm: weights for schedule vs. skill vs. work style? Course-level configurable, or system-wide?
- Should "compatibility" be precomputed (e.g., nightly batch) or computed on read? At what cardinality (45 students per course, all pairs = 990 comparisons) is precomputation worth it?
- How is "last active" defined — last login, last message sent, last profile edit?

## 5. Request / application lifecycle

What's missing:

- Sent requests don't reach a recipient. They write a fake chat thread for the sender and schedule a `setTimeout` for the auto-reply.
- The `ReceivedRequestPanel` is shown only when the demo bar manually flips state into `received-request` mode. There is no actual inbound request from a real user.
- Group applications submitted via `GroupDetailPanel` only update `appliedGroups` in the sender's `localStorage` — no server-side row, no notification to the group leader, no propagation to other members.
- Decline reasons captured in the UI go nowhere.
- The "No Response after 48h / 24h in urgent mode" auto-tagging is not implemented — only the filter pill exists.
- Withdrawal of a sent request is shown as a button but has no persistence semantics beyond local state.

Surfaces:

- `Discovery` (contact-status pills).
- `ProfilePanelContent` (Send Group Request form, Withdraw, "they replied" state).
- `ReceivedRequestPanel`, `ChatsPage` system card (Accept / Reply / Decline / decline reason picker).
- `GroupDetailPanel` application form, `MyGroup` pending applications list with up/down votes.

Open design questions:

- Idempotency: can a student send a second request after a No Response?
- Member voting on applications: advisory only, or majority-required? Tie-breaker? What if leader overrides?
- Notifications fan-out: when a request changes state, who gets notified and through what channels?
- Auto-removal of stale requests (48h / 24h) — is it a cron-like batch job, or computed on read?

## 6. Group lifecycle

What's missing:

- Group creation is implicit: accepting a request silently bumps `studentStatus` to `open-group`, and `MyGroup` then renders against a hardcoded `membersPartial` / `membersFull` array.
- Min/max group size is hardcoded (4–6) in `MyGroup`; the course-level min/max from `TACreate` never flows through.
- The 24h confirmation window is rendered visually but is not a clock — only the "You" row is interactive; others stay "Waiting…" indefinitely.
- "Leader" status is implicit; there is no enforcement.
- "List Group for Recruiting" / "Delist" toggles are local boolean only — `GroupsView` always shows all three hardcoded groups regardless.
- "Leave Group" reverts your status but doesn't reconfigure anyone else.
- The "post-deadline" auto-grouping shown in `TACourseDash` and `Urgent` is hardcoded sample data.

Surfaces:

- `MyGroup`, `GroupsView`, `GroupDetailPanel`, `ApplicationCard`.
- `Urgent` provisional group panel.
- `TACourseDash` Post-Deadline view.

Open design questions:

- What is the minimum group state required at confirmation? (All members confirmed? Leader can override?)
- How does removal / leaving work post-confirmation? Does confirmation lock the group, or only signal to the TA?
- What does "delist" do operationally — the group still exists, just isn't visible in Groups view?
- How is the provisional group computed? Random fill, or compatibility-weighted assignment?

## 7. Messaging

What's missing:

- No transport. Messages are appended to `chatMsgs` in `localStorage`, never sent.
- The auto-reply machinery exists only inside `ChatsPage.sendMsg` — there is no real second user.
- Group chat membership is hardcoded into the `groupConv.groupMembers` array.
- Reactions are stored per `selectedConv + index` key with no per-user attribution — they're effectively single-user "favorites" on messages.
- No typing indicators arrive from any source; they are scripted by your own send.
- No read receipts, delivery confirmations, or message ordering across clients.
- No attachment support, no link unfurling, no profanity / safety controls.

Surfaces:

- `ChatsPage` entire UI.
- The "system card" at the top of a 1:1 thread (Accept / Reply / Decline).
- Group chat pinned conversation.
- "Open Chat" entry points from `ProfilePanelContent`, notifications, and `MyGroup`.

Open design questions:

- Real-time transport: WebSocket / Server-Sent Events / long-poll / push?
- Chat retention: forever, course-lifetime, or post-confirmation only?
- Should the in-app chat be the source of truth, or only a bridge before students exchange Discord/Slack handles (which the prototype's "Contact Exchange" workspace card already implies)?
- Moderation: does the TA have access to message contents? Reporting flow?

## 8. Notifications

What's missing:

- No real notification source. The five entries in `DEMO_NOTIFICATIONS` are seeded at app startup and only mutated by client actions (e.g., sending a request adds a "they responded" entry).
- No per-user inbox; everyone in this single-tenant tab sees the same five.
- No delivery channels: no email, no push, no SMS, no in-app banner outside the bell dropdown.
- Notification `actionTarget` is a free-form string interpreted client-side; there is no first-class link / deep-link target.
- No batching, no read-state sync across devices, no "snooze".

Surfaces:

- `NotificationBell`, `NotificationItem`, `Nav`.
- `handleNotificationClick` routing.
- `Urgent` page deadline alerts.
- `TACourseDash` Alerts tab.

Open design questions:

- Channel preferences per user.
- Should the TA receive student-level notifications, or only aggregates?
- Frequency caps to avoid notification storms near deadline.

## 9. Deadline and scheduled work

What's missing:

- No timekeeper. `DEADLINE_CONFIG` has tiers but no clock — `Urgent` literally hardcodes `daysLeft = 3`.
- "Reminder emails" promised in the TA Alerts tab go nowhere.
- "Extend deadline" toasts a message and does nothing.
- "Provisional groups generated" toasts and does nothing.
- The 24h confirmation window is rendered but never enforced.
- The "no response after 48h" rule has no enforcement.

Surfaces:

- `Urgent`, `TACourseDash` Alerts tab, `MyGroup` confirm panel, `Discovery` urgent banner.

Open design questions:

- Time zone handling for course-level deadlines.
- Whether scheduled jobs are best-effort (cron) or guaranteed (a job queue with retries).
- How does the system catch up after downtime that crosses a deadline?

## 10. TA admin and analytics

What's missing:

- All analytics arrays (`ADMIN_DATA.atRisk`, `formationTimeline`, `sectionBreakdown`, `skillDemand`, `UNGROUPED_STUDENTS`, `POST_DEADLINE_GROUPS`) are hand-written and frozen.
- "Send reminder email", "Suggest match", "Email all ungrouped", "Move student" all `showToast` or `window.alert`.
- "Copy invite code" works (uses the clipboard API) but the code itself is hardcoded.
- The post-deadline group list, including the `autoAssigned` flag, is not derived from anything.

Surfaces:

- `TACourseDash` Overview / Students / Alerts tabs.
- `TADash`, `TADashEmpty`.

Open design questions:

- What counts as "at risk"? (Currently demoed as days since last activity > 5.)
- Whether TA can edit student profiles, force-move students between groups, or only intervene via messages.
- Export formats for course-end reports.

## 11. File handling

What's missing:

- Profile photo upload in `Prof0` and `ProfileEdit` only shows a local preview via `URL.createObjectURL`; the file never leaves the browser.
- CSV upload in `TACreate` is not parsed; the file is discarded.
- No attachment support in chat.

Open design questions:

- Storage location (object store vs. database BLOB).
- Image processing pipeline (resize, EXIF strip, content scan).
- Quota and lifecycle (delete on account removal? on course end?).

## 12. URL routing and deep-linking

What's missing:

- No URL routing whatsoever. `pg` is internal state; every refresh returns to `landing`.
- No deep-linkable student profile, group page, or chat thread.
- The `actionTarget` field on notifications is a magic string interpreted client-side, not a URL.

Surfaces:

- Every page; notification routing; email-link follow-through; bookmarks.

Open design questions:

- React Router vs. file-based routing (e.g., Next.js / TanStack Router).
- URL shape that survives renaming users and groups (slugs vs. opaque IDs).

## 13. Observability and operational concerns

Not implemented, and not yet planned:

- No telemetry, no error reporting, no logging.
- No feature flags / kill switches for risky flows (e.g., provisional auto-grouping at deadline).
- No rate limiting on request-sending, chat, or applications.
- No abuse / report flow (e.g., reporting harassment in chat).
- No audit log for TA actions (Move student, Extend deadline).

## 14. Tests, CI, deployment

What's missing:

- Zero tests in the repository.
- No CI workflow visible in the working tree (`.github/` was not inspected here; treat as unknown until verified).
- Build output goes to `/dist`; deployment target is implied by `base: "/unitor-demo/"` (likely GitHub Pages or a static subpath), but there is no documented release process.

## 15. Things the prototype gets right (do not break)

So the next phase doesn't accidentally regress:

- The state vocabulary (`solo / open-group / closed` + `request-sent / replied / declined / no-response`) maps cleanly onto a real domain model. Reuse it.
- The role-based nav visibility (Discovery hidden when `closed`) is a UX decision worth preserving.
- The slide-panel pattern (request review without leaving Discovery) reduces context switching; keep it when wiring to real data.
- The notification taxonomy (9 types in `NotificationType`) is granular enough to drive a real event system; the backend can reuse it as event names.
- The Ctrl+D demo bar is invaluable for testing; keep an equivalent dev-only mode after backend wiring so QA can still exercise edge states.

The next document (`05-planning-targets.md`) translates these gaps into a planning surface — decisions to make and conversations to have before code is written.
