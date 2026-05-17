# 02 — Frontend Inventory

This document is a flat list of every screen, panel, overlay, and reusable building block in the current prototype. It is the source of truth for "what surfaces will need backend support."

All page components live in `src/App.tsx`. Line references are approximate (the file is one ~4,655-line module).

## 1. Routing model

The root component is `Unitor` (≈L4413). It holds:

- `pg: string` — current page id, switched via `go(page)`.
- `role: string` — `"s"` (student) or `"t"` (TA), set by `signup-role`.
- A `P: Record<string, ReactNode>` map (≈L4514) that picks which page to render based on `pg`.

Page ids in active use:

| `pg` value | Component | Role | Purpose |
|---|---|---|---|
| `landing` | `Landing` | public | Marketing landing with Log In / Sign Up |
| `login` | `Login` | public | Email + password login form |
| `signup-role` | `SignupRole` | public | Choose Student or TA / Instructor |
| `signup` | `SignupForm` | public | Full-name + university + email + password |
| `verify` | `Verify` | public | "Check your inbox" confirmation step |
| `dash-empty` | `DashEmpty` | student | Empty-state "My Courses" |
| `dash` | `Dash` | student | "My Courses" with one CSC318 card |
| `join` | `Join` | student | 2-step course-code entry → confirm course |
| `prof-0` | `Prof0` | student | Profile step 1: display name + photo |
| `prof-1` | `Prof1` | student | Profile step 2: skills + proficiency |
| `prof-2` | `Prof2` | student | Profile step 3: section (read-only) + schedule grid |
| `prof-3` | `Prof3` | student | Profile step 4: communication, bio, links |
| `prof-done` | `ProfDone` | student | "Profile Complete!" confirmation |
| `board` | `Discovery` | student | The Discovery board (People + Groups tabs) |
| `mygroup` | `MyGroup` | student | "My Group" page (solo / forming / confirmed) |
| `urgent` | `Urgent` | student | Deadline-pressure view with provisional group |
| `profile-edit` | `ProfileEdit` | student | View/edit own profile |
| `chats` | `ChatsPage` | student | Three-pane chat experience |
| `ta-dash-empty` | `TADashEmpty` | TA | Empty-state "My Courses" |
| `ta-dash` | `TADash` | TA | "My Courses" with one CSC318 card |
| `ta-course-dash` | `TACourseDash` | TA | Overview / Students / Alerts tabs |
| `ta-create` | `TACreate` | TA | Create a course (with optional CSV import) |

There is **no URL routing**. Refresh always lands on `landing`.

`APP_PAGES = {"board", "mygroup", "urgent", "profile-edit", "chats"}` (≈L288) controls when the main app navbar is shown.

## 2. Top-level navigation

`Nav` (≈L294) renders one of two layouts:

- **Public layout** (non-app pages): logo + slot for right-hand content (login/signup buttons).
- **App layout** (`APP_PAGES`): logo, tab bar (Discovery, My Group, Chats, Profile — Discovery hidden when `studentStatus === "closed"`), bell icon, avatar dropdown (Edit Profile / Log Out).

`Nav` accepts `notifications`, `onNotificationClick`, `onMarkAllRead` and passes them to `NotificationBell` (≈L226).

## 3. Notifications

- Types: `NotificationType` (≈L95): nine string-enum members covering group requests, applications, accept/decline, member-left, confirm-requested, urgent-mode.
- Model: `AppNotification { id, type, title, body, timestamp, read, actionTarget? }`.
- Component: `NotificationBell` shows unread count, dropdown list of `NotificationItem` (≈L204) entries.
- Action routing: `handleNotificationClick` in `Unitor` (≈L4497) marks the notification read and navigates based on `type` (e.g., `group-request-received` → `chats`).
- Seed data: `DEMO_NOTIFICATIONS` (≈L2029) — five hardcoded items, persisted in component state only (not in `localStorage`).

## 4. Discovery board (`Discovery`, ≈L2088)

The most feature-dense screen. Sub-features:

- **View toggle**: People / Groups.
- **Filters**:
  - Pills: Solo, Open Group, Favorites (`filterSolo`, `filterOpenGroup`, `filterFavorites`).
  - Dropdowns (rendered via `FilterDropdown`, ≈L2053): Section, Skills, Overlap (range slider 0–100%), My Activity (contact status), Hidden (restore list), and for Groups view: Recruiting toggle, Section, Spots Open.
- **Sort**: Best Match / Most Overlap / Recently Active / Name / Newest (sorts `STU` in place client-side).
- **Search**: simple substring match against name, skills, and bio.
- **Cards**: avatar, name, status pill, contact-status pill, section, top 3 skills, schedule-overlap bar.
- **Per-card actions**:
  - Star (favorite): toggles membership in `starredStudents: Set<string>`, persisted via direct `localStorage.setItem` outside the hook.
  - Eye (hide): pops `ConfirmDialog`; hidden students are persisted similarly and sort to the bottom.
- **Urgent banner**: When `urgentMode` is true, shows a danger banner and forces Solo filter on.
- **Empty state**: "No students match your filters" with a "Clear all filters" button.

Subviews:

- `GroupsView` (≈L1838) — renders `FORMING_GROUPS` as `GroupCard`s (≈L1766). Applied status pulled from `appliedGroups: Record<groupId, "applied"|"accepted"|"declined">`.

## 5. Slide-out panels

`SlidePanel` (≈L1734) is the reusable right-side overlay. The root `Unitor` opens two kinds:

1. **Group Detail Panel** (`GroupDetailPanel`, ≈L1883) — applied to from "Groups" view. Renders group description, leader, members, needed skills, application questions, and an inline application form. On submit, calls `onApplied(groupId)`.
2. **Student Detail Panel** — has two modes:
   - `view` → `ProfilePanelContent` (≈L2642): full profile, compatibility breakdown (overall, schedule, skill, work-style), schedule overlap grid, work-style differences, action buttons (Send Group Request with two-field form, or Join Their Group for `open-group` people, or Withdraw if request already sent). Triggers `onSendRequest(name, why, question)` which writes a fake chat message and schedules a fake reply.
   - `received-request` → `ReceivedRequestPanel` (≈L2549): a faux request from a fixed example, with Accept / Reply / Decline actions.

The slide panel state also drives status transitions (`setStudentStatus("open-group")` on send).

## 6. My Group (`MyGroup`, ≈L3075)

Branches by `studentStatus`:

- **`solo`**: empty-state with a button to go to Discovery.
- **`open-group`**:
  - Header with status pill and `members.length / maxSize`.
  - "Confirm Group" call-to-action when `members.length >= minSize`.
  - Pending applications list using `ApplicationCard` (≈L3016) with up/down vote (purely local state), Accept/Reply/Decline.
  - Member roster cards.
  - Group skills "Has / Still Needed" matrix.
  - Group schedule heatmap (`counts3` / `counts4` are hardcoded availability grids).
  - "Discover Members" + "List Group for Recruiting" toggle.
  - "Leave Group" link with `ConfirmDialog`.
- **Confirm flow**:
  - `idle` → button → `pending` (24h "waiting for members" panel with one-click confirm per member, but only `You` is interactive).
  - `pending` → `confirmed` panel + workspace cards: Contact Exchange table, Project Board (3 hardcoded tasks), Group Availability heatmap.

`onLeaveGroup` reverts `studentStatus` to `solo`.

## 7. Chats (`ChatsPage`, ≈L3734)

Three-pane layout (conversation list, chat thread, contextual right rail).

- Conversation list:
  - Sticky pinned **group chat** ("CSC318 Group") when applicable.
  - Tabs: All / Sent / Received.
  - Each entry: avatar/group icon, last-message preview, unread dot, status pill.
- Chat thread:
  - Top bar with conversation name + status pill.
  - "System card" at the top of 1:1 threads showing the original request (with Why / Question, and expandable details). For received requests not yet ended, shows Accept / Reply / Decline buttons inline; Decline opens an inline reason-picker.
  - Message bubbles with hover-revealed reaction picker (4 reactions) and a single active reaction per message stored in `chatReactions`.
  - Typing indicator (3 bouncing dots) driven by `typing: string | null`.
  - Send box: enter to send. On send, schedules:
    - A typing indicator,
    - A keyword-routed reply 1–2s later (`MOCK_REPLIES` / contextual phrases for "meet", "skill", "hello", "group", "thank"),
    - 30% chance of a follow-up after another 2–4s drawn from `MOCK_FOLLOWUPS`.
- Right rail:
  - For 1:1 threads: stage tracker (Request Sent → Replied → Pending/Accepted/Declined), profile snippet, "Open Profile" link.
  - For the group chat: member roster.
- Conversation lifecycle:
  - `onUpdateConvStatus(name, status)` mutates the conversation object.
  - `onMarkRead(name)` clears the unread flag when opened.
  - `onDeleteConversation(name)` removes the conversation and its messages.

## 8. Urgent matching (`Urgent`, ≈L3348)

Standalone page used when `isUrgent` demo flag is on:

- Deadline progress bar (`DEADLINE_CONFIG.totalDays = 21`).
- Tier-aware banner: On Track / Reminder / Urgent / Critical (`getDeadlineTier`).
- Three hardcoded suggested matches.
- Provisional Group card with 4 hardcoded members and Accept / I'll find my own buttons.
- "Ask TA for help" button toggles a success banner.

## 9. Profile (own) — `ProfileEdit` (≈L3474)

- Toggle between view and edit modes.
- Profile photo upload preview (uses `URL.createObjectURL` — never sent anywhere).
- Skills + per-skill proficiency, bio (`profileBio` in localStorage), meeting frequency, meeting style, communication tool, schedule grid.
- Snapshot/restore for "discard changes".

All values are persisted in `localStorage` under `profile*` keys. They are **not** wired back into the `STU` array or the matching computations.

## 10. TA dashboards

- `TADashEmpty` (≈L964) and `TADash` (≈L982) mirror the student dashboards but for the TA persona.
- `TACourseDash` (≈L1002) is the central admin screen:
  - **Overview tab**: course metadata, four KPIs, group-confirmation progress bar, invite code with Copy, Formation Timeline bar chart (`ADMIN_DATA.formationTimeline`), Section Breakdown (`ADMIN_DATA.sectionBreakdown`), Skill Supply/Demand table (`ADMIN_DATA.skillDemand`), Ungrouped Students table (`UNGROUPED_STUDENTS`), and a Post-Deadline toggle that reveals `POST_DEADLINE_GROUPS` with "Move student — stub" alerts.
  - **Students tab**: filterable list (All / Ungrouped only / At risk) over the same `STU` array.
  - **Alerts tab**: deadline-approaching banner, at-risk count (`ADMIN_DATA.atRisk`), per-student reminder / suggest-match actions, bulk reminder button.
  All admin actions only call `showToast` — none persist or notify.
- `TACreate` (≈L1268) is the create-course form. The "Import Student Roster (CSV)" `<input type="file">` only flips `uploaded` to `true`. No parsing, no validation.

## 11. Onboarding

- `Landing`, `SignupRole`, `SignupForm`, `Verify` cover the public funnel.
- `SignupForm` has one hardcoded denylist: typing `unknown@mail.utoronto.ca` shows an "email not found in course" error. Every other email is accepted.
- After "I've verified my email", the user lands on either `dash-empty` or `ta-dash-empty` depending on role.
- `Join` is a simple two-step (enter code → confirm course). The course code is hardcoded as `W543M7` and the result is always CSC318.
- `Prof0` through `Prof3` collect display name, skills, schedule, communication + bio. None of this data is sent anywhere — it stays inside each component's local `useState` and is never merged into the user's "real" profile (`ProfileEdit` has its own separate storage).

## 12. Cross-cutting UI primitives

- **`Toast` system** (≈L19): in-component queue, `showToast(message)` and `removeToast(id)` defined on `Unitor`. Auto-dismisses after 3s.
- **`useLocalStorage<T>` hook** (≈L35): `unitor_*` key prefix, JSON serialized, swallows quota errors.
- **`StudentAvatar`** (≈L70): uses `getProfileImageUrl(name)` which only resolves for the 14 names in the `PROFILE_IMAGES` set (PNGs in `public/profile_images/`); everyone else gets initials.
- **`TGrid`** (≈L368): drag-select 5×4 weekly schedule grid (Mon–Fri × four time bands).
- **`Icon`** (≈L411): hand-rolled SVG icon set (no `lucide-react` import in `App.tsx`).
- **`ConfirmDialog`** (≈L1709): generic destructive-action confirmation modal.
- **`SlidePanel`** (≈L1734): right-side overlay scaffold (header, scrollable body, optional footer).
- **`FilterDropdown`** (≈L2053): controlled dropdown for filter pills.

## 13. shadcn primitives (`src/components/ui/`)

12 components: `alert`, `avatar`, `badge`, `button`, `card`, `checkbox`, `input`, `label`, `progress`, `select`, `separator`, `textarea`. Each wraps a radix primitive (where applicable) with Tailwind classes. Standard shadcn output; no business logic.

## 14. State held in the root `Unitor` component

| State | Source | Persisted? | Used by |
|---|---|---|---|
| `pg` | `useState("landing")` | no | router dispatch |
| `role` | `useState("s")` | no | onboarding route choice |
| `selectedStudent`, `selectedGroup`, `panelMode` | `useState` | no | slide panel visibility |
| `isUrgent` | `useState(false)` | no | urgent banner toggle |
| `userName`, `userEmail` | `useLocalStorage` | yes | header avatar, welcome strings |
| `hasJoinedCourse`, `hasCreatedCourse` | `useLocalStorage` | yes | empty vs. populated dashboards |
| `appliedGroups` | `useLocalStorage<Record<string,string>>` | yes | Groups view applied state |
| `studentStatus` | `useLocalStorage<"solo"\|"open-group"\|"closed">` | yes | Nav visibility, MyGroup branch |
| `notifications` | `useState(DEMO_NOTIFICATIONS)` | no | bell + drop-in flow |
| `contactStatuses` | `useLocalStorage<Record<string,string>>` (seeded from `STU`) | yes | Discovery card pills |
| `chatMsgs` | `useLocalStorage<ChatMessages>` | yes | Chat thread bodies |
| `conversations` | `useLocalStorage<Conversation[]>` | yes | Conversation list |
| `initialSelectedConv` | `useState<string\|null>` | no | "open chat after action" hook |
| `chatReactions` | `useLocalStorage<Record<string,string\|null>>` | yes | per-message reaction |
| `toasts` | `useState<Toast[]>` | no | toast queue |

The Ctrl+D demo bar can short-circuit every one of these to demo any state combination.

## 15. Public assets

- `public/profile_images/*.png` — 14 character portraits used by `getProfileImageUrl`. Any seeded persona not in the `PROFILE_IMAGES` set falls back to initials.
- `public/vite.svg` — favicon.

## 16. What this inventory implies for the backend

Every line above that says "hardcoded", "local state", or "fake reply" is a contract the backend will eventually have to honor or rewrite. The next document (`03-mock-data-and-state.md`) enumerates the mock-data sources directly, and `04-backend-gaps.md` translates them into the missing capabilities.
