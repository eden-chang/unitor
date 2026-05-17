# 03 — Mock Data and State Layer

This document catalogs every piece of data that the prototype currently fabricates. When the backend is designed, each of these constants becomes either a database table, a derived computation, or a server-driven event.

All references are to `src/App.tsx` unless noted.

## 1. Hardcoded module-level data

### 1.1 Students

`STU: Student[]` (≈L1335) — 20 student personas. Each has:

```ts
interface Student {
  name: string;                                                   // "Jesse Nguyen"
  sec: string;                                                    // "201" | "202" | "203"
  skills: string[];                                               // ["Frontend Dev", "Prototyping"]
  status: "solo" | "open-group" | "closed";
  contactStatus: "none" | "request-sent" | "replied" | "declined" | "no-response";
  overlap: string;                                                // "8h/wk"  — display only
  init: string;                                                   // "JN"
  bio: string;
  rat: Record<string, string>;                                    // skill -> "Beginner"|"Intermediate"|"Proficient"|"Expert"
  lastActive: string;                                             // "5 min ago" — parsed by parseActivityMinutes
  compatScore: number;                                            // 0-100, precomputed
  scheduleOverlapHrs: number;                                     // 0-10, precomputed
}
```

The "current user" is **not** in this array. The viewer is a phantom user whose name/email come from `useLocalStorage` and whose schedule/skills are the values stored under `profile*` keys by `ProfileEdit` — but those values are never used to recompute anything in `STU`. All compatibility numbers are precomputed against an implicit "you have UI Design + User Research, schedule Mon/Wed/Fri 12-4pm, 2x/wk in-person, Discord" profile that is hardcoded into the seed data.

### 1.2 Compatibility breakdowns

`COMPAT: Record<string, CompatibilityBreakdown>` (≈L1364) — per-student precomputed breakdown:

```ts
interface CompatibilityBreakdown {
  overall: number;
  scheduleScore: number;
  skillScore: number;
  workStyleScore: number;
  matchReasons: string[];
  warnings: string[];
  skillComplementarity: { skill: string; coveredBy: "you" | "them" | "both" | "gap" }[];
}
```

Only 14 of the 20 personas have entries; the rest fall back to a default rendering path inside `ProfilePanelContent`.

### 1.3 Schedule data

`SCHEDULE_DATA: Record<string, { my: Set<string>; theirs: Set<string>; overlapHrs: number }>` (≈L1549) — the cells highlighted in each student's schedule grid. `my` is always the same set (`Mon-1`, `Wed-1`, `Fri-1`) regardless of the viewer's actual stored schedule.

### 1.4 Work-style data

`WORK_STYLE_DATA: Record<string, [string, string, string, boolean][]>` (≈L1567) — three-row table per student (Meeting frequency / Meeting style / Communication) with `[label, mine, theirs, isMatch]`.

### 1.5 Groups

`FORMING_GROUPS: FormingGroup[]` (≈L1641) — three sample recruiting groups with leader, members, needed skills, description, and three application questions each.

### 1.6 TA analytics

`ADMIN_DATA` (≈L924):
- `atRisk: { name, sec, init, daysSinceActivity, skills }[]` — three students.
- `formationTimeline: { date, grouped, ungrouped }[]` — five datapoints for the bar chart.
- `sectionBreakdown: { section, total, grouped, ungrouped, searching, forming }[]` — three sections.
- `skillDemand: { skill, seekers, available }[]` — four skills.

`UNGROUPED_STUDENTS` (≈L950) — three rows for the Ungrouped Students table on the TA overview.

`POST_DEADLINE_GROUPS` (≈L956) — four hardcoded groups shown when the "Post-deadline View" toggle is on. Two are flagged `autoAssigned: true`.

### 1.7 Deadline config

`DEADLINE_CONFIG` (≈L1585):

```ts
{
  totalDays: 21,
  tiers: [
    { min: 7, label: "On Track",  color: "success" },
    { min: 4, label: "Reminder",  color: "warning" },
    { min: 2, label: "Urgent",    color: "caution" },
    { min: 0, label: "Critical",  color: "danger"  },
  ]
}
```

The `Urgent` page hardcodes `daysLeft = 3`. There is no real clock anywhere.

### 1.8 Demo conversations

`DEMO_CONVERSATIONS: Conversation[]` (≈L1628):

```ts
interface Conversation {
  id: string;
  targetName: string;
  targetInit: string;
  type: "request-sent" | "request-received" | "application-sent" | "application-received" | "group-chat";
  status: "pending" | "replied" | "accepted" | "declined" | "active";
  lastMessage: string;
  timestamp: string;       // human-readable, never reparsed
  unread: boolean;
  isGroup?: boolean;
  groupMembers?: { name: string; init: string }[];
}
```

Seeds the conversation list (1 group chat + 4 1:1s).

### 1.9 Demo chat messages

`DEFAULT_CHAT_MSGS: ChatMessages` (≈L4386) where `ChatMessages = Record<string, { from: string; text: string; time: string }[]>`. Pre-canned threads for the "CSC318 Group" chat plus Marcus Lee, Sofia Rodriguez, David Park, Wei Zhang.

### 1.10 Demo notifications

`DEMO_NOTIFICATIONS: AppNotification[]` (≈L2029) — five fixed entries (group request received, application received, request accepted, confirmation requested, urgent mode activated).

### 1.11 Mock reply scripts

- `MOCK_REPLIES` (≈L2959) — generic reply lines used as fallback.
- `MOCK_REQUEST_REPLIES` (≈L2972) — replies specifically used when a group request is sent.
- `MOCK_FOLLOWUPS: Record<string, string[]>` (≈L2980) — per-target follow-up message pool, with a generic fallback.

`ChatsPage.sendMsg` (≈L3784) picks a reply by keyword matching on the user's outgoing text (`"meet"`, `"skill"`, `"hello"`, `"group"`, `"thank"`) and otherwise falls back to `MOCK_REPLIES`.

### 1.12 Static lookup tables

- `SS: Record<string, StatusInfo>` (≈L1356) — status pill labels for `solo`, `open-group`, `closed`.
- `CONTACT_STATUS_LABELS` (≈L2037) — pill labels for `request-sent`, `replied`, `no-response`, `declined`.
- `PROFILE_TIERS` (≈L1543) — color tokens for "Excellent / Moderate / Low" match tiers.
- `REACTION_ICONS` (≈L3721) + `REACTION_COLORS` (≈L3727) — four chat reactions.
- `PROFILE_IMAGES: Set<string>` (≈L59) — names that have a corresponding PNG in `public/profile_images/`.

## 2. Persistent state (`localStorage` under `unitor_*`)

`useLocalStorage<T>` (≈L35) stores all of:

| Key | Type | Default | Set by |
|---|---|---|---|
| `unitor_userName` | `string` | `""` | `SignupForm`, `Prof0` |
| `unitor_userEmail` | `string` | `""` | `SignupForm` |
| `unitor_hasJoinedCourse` | `boolean` | `false` | `ProfDone` |
| `unitor_hasCreatedCourse` | `boolean` | `false` | `TACreate` |
| `unitor_appliedGroups` | `Record<groupId, status>` | `{}` | `GroupDetailPanel.onApplied` |
| `unitor_studentStatus` | `"solo"\|"open-group"\|"closed"` | `"solo"` | `MyGroup`, `Unitor` callbacks, demo bar |
| `unitor_contactStatuses` | `Record<name, status>` | derived from `STU` | `Discovery`, slide panel |
| `unitor_chatMsgs` | `ChatMessages` | `DEFAULT_CHAT_MSGS` | `ChatsPage`, `Unitor.onSendRequest` |
| `unitor_conversations` | `Conversation[]` | `DEMO_CONVERSATIONS` | `Unitor.openChatWith`, `ChatsPage` |
| `unitor_chatReactions` | `Record<msgKey, ReactionType\|null>` | `{}` | `ChatsPage.toggleReaction` |
| `unitor_profileBio` | `string` | seeded copy | `ProfileEdit` |
| `unitor_profileSkills` | `string[]` | `["UI Design","User Research"]` | `ProfileEdit` |
| `unitor_profileSkillRatings` | `Record<string,string>` | seeded | `ProfileEdit` |
| `unitor_profileMeetFreq` | `string` | `"2x/wk"` | `ProfileEdit` |
| `unitor_profileMeetStyle` | `string` | `"In-person"` | `ProfileEdit` |
| `unitor_profileCommTool` | `string` | `"Discord"` | `ProfileEdit` |
| `unitor_profileSchedule` | `string[]` | `["Mon-1","Wed-1","Fri-1"]` | `ProfileEdit` |

Two extra keys are set directly via `localStorage.setItem` from inside `Discovery` (≈L2116):

| Key | Type | Purpose |
|---|---|---|
| `unitor_starred` | `string[]` | Favorited student names |
| `unitor_hidden` | `string[]` | Hidden student names |

`clearAllLocalStorage()` (≈L81) wipes everything `unitor_*` and is wired to the demo bar "reset" button.

**The own-user `profile*` keys are completely disconnected from anything that affects matching.** Changing your skills in `ProfileEdit` does not change a single number on any `STU` card.

## 3. Simulated asynchronous behavior

These are all `setTimeout`-driven and live entirely in the client.

### 3.1 Auto-reply to a sent group request

In `Unitor` (≈L4593) — after `onSendRequest`, a reply lands in 3–5s, the conversation flips to `replied`, and an "X responded" notification is pushed. The reply text is drawn from `MOCK_REQUEST_REPLIES`.

### 3.2 Chat replies

In `ChatsPage.sendMsg` (≈L3784):

1. Set typing indicator.
2. After 1–2s, push a reply chosen by keyword.
3. With 30% probability, after another 2–4s, push a follow-up.

The reply persona is the conversation target's name for 1:1s, or a random group member's name for group chats.

### 3.3 Confirmation flow

`MyGroup` (≈L3075) advances `confirmStage` only when the "You" row's Confirm button is clicked. Other members are stuck in "Waiting…" forever — no timeout, no auto-removal, no broadcast.

### 3.4 Toast lifecycle

Toasts are removed by `setTimeout` after 3 seconds (≈L4447).

### 3.5 Notifications

`addNotification` (≈L4451) only prepends to in-memory state. There is no scheduler, no event source, no cross-tab propagation.

## 4. Behavior that looks rule-based but is hand-coded

- **"No response after 48h / 24h in urgent mode"** — described in `easea-scenario-ux-flows.md` but only realized as a filterable contact-status pill that the user can manually toggle through the demo bar.
- **"Provisional group auto-forms at deadline"** — visible only as a static panel in `Urgent`.
- **"Member who doesn't confirm gets removed"** — described in `MyGroup`'s pending banner but never executed.
- **"Section pre-filled from CSV"** — `Prof2` shows a read-only `L0201` label with no underlying CSV.
- **"Email must match course enrollment"** — only `unknown@mail.utoronto.ca` triggers the error path.
- **"Compatibility score"** — every number in `COMPAT`, `STU.compatScore`, and `STU.scheduleOverlapHrs` was authored by hand. No formula is implemented.

## 5. What the frontend already implies about the data model

The combination of types and constants gives a strong hint at the entities a real backend will need:

- **User** (`name`, `email`, `role`, `avatar`).
- **Course** (`code`, `name`, `semester`, `university`, `minGroupSize`, `maxGroupSize`, `deadline`, `inviteCode`, `skillsCatalog`, `sections`).
- **Enrollment** (`user`, `course`, `section`, `joinedAt`).
- **Profile** (`enrollment`, `skills[]` with proficiency, `schedule` cells, `meetingFrequency`, `meetingStyle`, `commTool`, `bio`, `links[]`).
- **Group** (`course`, `leader`, `members`, `description`, `neededSkills`, `applicationQuestions[]`, `state: forming|confirmed|disbanded`, `listedForRecruiting`).
- **GroupRequest** (`sender`, `receiver`, `why`, `question`, `status: pending|replied|accepted|declined`, `createdAt`, `respondedAt`).
- **GroupApplication** (`applicant`, `group`, `answers[]`, `status`, `votes`).
- **Conversation** (one per 1:1 pair or per group, with `unread` state per participant).
- **Message** (`conversation`, `sender`, `body`, `createdAt`, optional `reactionsByUser`).
- **Notification** (per recipient, type, payload pointing to a target entity, `read`, `createdAt`).
- **Roster row** (course, section, email, name) seeded from CSV.

`04-backend-gaps.md` translates these into the missing backend capabilities.
