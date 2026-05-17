# 01 — Current State of the Codebase

> Status as of this document: **frontend-only prototype**. No server, no database, no real authentication, no real messaging transport. Everything that looks "alive" is faked in the browser. The product is not usable beyond a single-user demo.

## 1. What Unitor is

Unitor is a **course-scoped teammate-matching application**. The target user flow:

1. A TA or instructor creates a course and uploads a roster.
2. Students sign up with their university email (the email must match the roster) and complete a profile (skills, schedule, communication preferences, bio).
3. Students discover teammates via a **Discovery** board (People view + Groups view) and send group requests or apply to forming groups.
4. Once members agree, the group is **confirmed** through a 24h consent window, then enters a confirmed workspace.
5. The TA dashboard surfaces formation progress, at-risk students, skill supply/demand, and provisional auto-grouping near deadlines.

The prototype faithfully renders all of these flows. None of them yet survive a page reload across machines, or work for more than one user at a time.

## 2. Tech stack

| Concern | Tool |
|---|---|
| UI framework | React 19 (function components, hooks) |
| Build tool | Vite 7 (`@vitejs/plugin-react`) |
| Language | TypeScript 5.9 (strict via `tsconfig.app.json`) |
| Styling | Tailwind CSS 4 + `tw-animate-css` + `shadcn/tailwind.css` preset |
| Component primitives | shadcn-style wrappers around `radix-ui` (in `src/components/ui/`) |
| Icons | Custom inline SVG `Icon` map (`lucide-react` is listed but not used by `App.tsx`) |
| Class utils | `clsx` + `tailwind-merge` via `cn()` in `src/lib/utils.ts` |
| Linting | ESLint 9 with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` |
| Routing | **None.** A single string state `pg` is used as the current screen identifier; the `Unitor` component dispatches over a `P: Record<string, ReactNode>` map. |
| State management | `useState` + a custom `useLocalStorage` hook with `unitor_` prefix |
| Backend | **None.** |
| Tests | **None.** |

`vite.config.ts` sets `base: "/unitor-demo/"` — the prototype is built to be served under that subpath (likely on GitHub Pages / a static host).

## 3. Run / build

From `package.json`:

```
npm install
npm run dev        # local dev server on http://localhost:5173/unitor-demo/
npm run build      # type-check then vite build into ./dist
npm run lint       # eslint .
npm run preview    # serve the production build locally
```

There is no test runner script, no backend script, no CI configuration visible in the repo root.

## 4. Repository shape

```
unitor/
├── .docs/                    # Documentation (this folder)
├── .github/                  # (probably CI/Pages config — not inspected here)
├── dist/                     # Built static output
├── public/
│   ├── profile_images/       # 14 PNGs of seeded student personas
│   └── vite.svg
├── src/
│   ├── App.tsx               # ~4655 lines: ALL pages, ALL state, ALL mock data
│   ├── main.tsx              # Vite entrypoint
│   ├── index.css             # Tailwind + custom theme tokens
│   ├── lib/utils.ts          # cn() helper
│   ├── assets/react.svg
│   └── components/ui/        # 12 shadcn-style primitives
│       ├── alert.tsx avatar.tsx badge.tsx button.tsx card.tsx
│       ├── checkbox.tsx input.tsx label.tsx progress.tsx
│       ├── select.tsx separator.tsx textarea.tsx
├── components.json           # shadcn config
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
└── vite.config.ts
```

**The entire application lives in one file:** `src/App.tsx` is ~4,655 lines and contains every page component, every type, every piece of mock data, every helper, every overlay/panel, and the root `Unitor` component. The only other source files are the entrypoint, the styling, one utility, and the 12 generic UI primitives.

## 5. Scope of the demo

What the demo can do **right now, in a single browser tab**:

- Walk through the full student onboarding flow (role selection → signup → email "verify" → join course → 4-step profile setup).
- Walk through the TA onboarding flow (create course, optional CSV upload that simply flips a "uploaded" flag).
- Browse the Discovery board (People and Groups tabs) with filtering, sorting, favorites, hiding, search.
- Open student detail panels and send a fake group request (auto-reply arrives ~3–5s later).
- Open group detail panels and submit a fake application.
- Accept / decline / reply to requests.
- See a fake chat experience with conversation list, message bubbles, reactions, typing indicators, and keyword-based canned auto-replies.
- View "My Group" through three stages: empty (solo), forming (with applications), and confirmed (with workspace cards).
- Trigger "urgent mode" with a deadline countdown and provisional-group preview.
- View the TA course dashboard with overview, students, and alerts tabs (all driven by hardcoded analytics arrays).
- See notifications drop down from the bell, mark them read, and follow `actionTarget` deep-links.
- Toggle a hidden demo bar (Ctrl+D) that lets you jump to any page or switch student status.

What the demo **cannot** do:

- Persist anything across browsers, users, or machines (everything is in `localStorage`).
- Authenticate any user — the email field is never validated against anything except a hard-coded denylist of one address.
- Match users against each other — every "compatibility score" and "overlap" is a literal number on a hardcoded `STU` array.
- Send a real message to anyone — replies are timed `setTimeout` callbacks with keyword-based canned responses.
- Notify anyone outside the current tab.
- Import or persist a real CSV roster — `<input type="file">` just toggles a green banner.
- Enforce any of the constraints that the UX claims: 24h decline window, deadline auto-grouping, group size min/max, leader uniqueness, status transitions.

## 6. Key architectural facts to know before backend planning

1. **No data layer abstraction.** Components read from module-level constants (`STU`, `COMPAT`, `SCHEDULE_DATA`, `WORK_STYLE_DATA`, `ADMIN_DATA`, `FORMING_GROUPS`, `DEMO_NOTIFICATIONS`, `DEMO_CONVERSATIONS`, `DEFAULT_CHAT_MSGS`, `MOCK_REPLIES`, `MOCK_FOLLOWUPS`, `MOCK_REQUEST_REPLIES`). There is no fetch layer, no API client, no service module.
2. **No identity beyond a local username and email string.** `userName` and `userEmail` are saved via the local-storage hook. The TA persona is hardcoded as "Prof. Truong" (`KT` initials).
3. **A single global page-string router.** `pg: string` in the root `Unitor` component, switched by `go(p)`. There is no URL synchronization, no deep links, no browser back/forward integration. Refreshing always returns to the landing page (unless localStorage has restored some state, which only affects in-page state, not the route).
4. **Side effects are simulated with timers.** Auto-replies, status transitions, and "they replied" notifications are all `setTimeout` calls inside `Unitor` and `ChatsPage`.
5. **All "ownership" is implicit.** The "current user" is always the same person inside `MyGroup` (assumed to be the leader once they accept). There is no concept of an authenticated session token, member-role checks, or per-user permission enforcement.
6. **Hidden demo bar drives state directly.** `Ctrl+D` exposes buttons that mutate `studentStatus`, jump pages, and clear all local storage. This is useful for evaluating flows but means the prototype has zero state-machine integrity once a backend exists.
7. **`base: "/unitor-demo/"`** is baked into Vite config and the avatar URL builder (`/unitor-demo/profile_images/...`). A real deployment will likely change this.

## 7. What "usable" needs to mean next

For Unitor to become usable beyond a one-tab demo, the backend must own (at minimum):

- Identity and session: real signup/login, email verification, roster-based access gating.
- Persistence: courses, sections, rosters, profiles, groups, applications, requests, notifications, messages.
- Authorization: student vs. TA, group leader vs. member, course membership.
- Matching computations: compatibility scores, schedule overlap, skill complementarity.
- Asynchronous coordination: real notifications, real chat delivery, deadline-aware jobs (no-response timeout, provisional group formation).
- Roster ingest: CSV parsing, validation, email-keyed matching.
- Admin reporting: live versions of the TA dashboard analytics.

The next document (`02-frontend-inventory.md`) maps every UI surface so the backend can be designed against the actual contract the frontend already implies.
