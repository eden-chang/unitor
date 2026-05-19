# Stage 1 Plan — Frontend Wiring (Component Split + Live Backend)

> Status: **Plan** — review before any code lands.
>
> Goal: take the user through magic-link login → bootstrap → profile setup → Discovery board (people view) → real compatibility scores, **with `App.tsx` split into proper components along the way**. Groups, chat, urgent, and TA pages stay as-is (mock) for this stage.

## 1. What this stage delivers

End-state, in user terms:

1. A new student opens the deployed frontend.
2. They click "Sign in", type a roster email, get the magic link in their inbox.
3. They click the link → land on `/auth/callback` → backend bootstrap runs → they see "Dashboard" with their real name and CSC318 enrollment.
4. They fill in the profile wizard (Prof0–Prof3). Each step writes to the real DB.
5. They open the Discovery board → see real classmates loaded from `GET /courses/{id}/students` → compatibility scores from `POST /api/v1/compatibility/batch`.
6. They open another classmate's profile panel → see real bio, skills, schedule.

**Out of scope for stage 1** (intentionally — see HANDOFF.md §9): groups, chat, urgent, TA flow, notifications, file uploads, real-time. These keep running on mock data; we wire them in stage 2.

## 2. Scope of `App.tsx` work

Today: one 4655-line file. **Stage 1 only touches the pages that are part of the live slice.** Everything else stays in `App.tsx` for now and gets extracted in stage 2.

| Page | In stage 1? | New home |
|---|---|---|
| `Landing` | ✅ extract | `components/landing/Landing.tsx` |
| `SignupRole` | ✅ extract | `components/auth/SignupRole.tsx` |
| `SignupForm`, `Login`, `Verify` | ✅ **replace** with magic-link flow | `components/auth/MagicLinkRequest.tsx`, `MagicLinkSent.tsx`, `MagicLinkCallback.tsx` |
| `DashEmpty`, `Dash`, `Join` | ✅ extract + wire | `components/dashboard/*` |
| `Prof0`..`Prof3`, `ProfDone`, `ProfileEdit` | ✅ extract + wire | `components/profile/*` |
| `Discovery`, `FilterDropdown`, `ProfilePanel` | ✅ extract + wire | `components/discovery/*` |
| `MyGroup`, `ChatsPage`, `Urgent` | ❌ stay in `App.tsx`, untouched | — |
| `TADash*`, `TACreate` | ❌ stay in `App.tsx`, untouched | — |

Shared components (Nav, NotificationBell, Icon, F, TGrid, StudentAvatar, ToastContainer, ConfirmDialog, SlidePanel, useLocalStorage, etc.) get extracted into `components/shared/` and `hooks/` as needed by the in-scope pages. Anything not yet needed stays put.

## 3. Target directory layout (post-stage 1)

```
frontend/src/
├── App.tsx                          # router only (much smaller); keeps the "out of scope" pages inline for now
├── main.tsx                         # React entry; wraps app in <QueryClientProvider> + <AuthProvider>
├── api/                             # typed fetch wrappers, one file per resource
│   ├── client.ts                    # fetch() helper, JWT injection, error envelope parsing
│   ├── auth.ts                      # precheck, bootstrap
│   ├── profile.ts                   # GET/POST/PATCH/DELETE + skills/schedule
│   ├── courses.ts                   # GET /courses/{id}, sections, skill catalog (NEW backend endpoints — see §6)
│   ├── discovery.ts                 # students, groups
│   └── compatibility.ts             # batch
├── supabase/
│   └── client.ts                    # createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── context/
│   ├── AuthContext.tsx              # supabase session + bootstrap result (user + enrollments)
│   └── ToastContext.tsx
├── hooks/
│   ├── useApi.ts                    # thin wrapper over tanstack-query useQuery / useMutation
│   ├── useAuth.ts
│   └── useProfile.ts
├── types/
│   └── api.ts                       # hand-typed for stage 1; switch to generated in stage 2
├── lib/
│   └── utils.ts                     # existing
├── components/
│   ├── ui/                          # existing shadcn — unchanged
│   ├── shared/
│   │   ├── Nav.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── StudentAvatar.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── SlidePanel.tsx
│   │   ├── ToastContainer.tsx
│   │   ├── FormField.tsx            # the existing F() wrapper, renamed
│   │   ├── ScheduleGrid.tsx         # the existing TGrid()
│   │   └── icons.tsx                # the existing Icon record
│   ├── landing/Landing.tsx
│   ├── auth/
│   │   ├── SignupRole.tsx
│   │   ├── MagicLinkRequest.tsx     # email-only form → calls /precheck then supabase.auth.signInWithOtp
│   │   ├── MagicLinkSent.tsx        # the existing "check your inbox" screen
│   │   └── MagicLinkCallback.tsx    # consumes the Supabase access_token hash, calls /bootstrap
│   ├── dashboard/
│   │   ├── DashEmpty.tsx
│   │   ├── Dash.tsx
│   │   └── Join.tsx
│   ├── profile/
│   │   ├── ProfileOnboarding.tsx    # parent of the 4-step wizard; owns shared form state
│   │   ├── steps/
│   │   │   ├── Step0Name.tsx
│   │   │   ├── Step1Skills.tsx
│   │   │   ├── Step2Schedule.tsx
│   │   │   └── Step3CommBio.tsx
│   │   ├── ProfileDone.tsx
│   │   └── ProfileEdit.tsx
│   └── discovery/
│       ├── DiscoveryPage.tsx
│       ├── StudentCard.tsx
│       ├── FilterDropdown.tsx
│       └── ProfilePanel.tsx
└── index.css
```

## 4. Library decisions (recommended defaults)

| Concern | Choice | Why |
|---|---|---|
| HTTP + cache | **`@tanstack/react-query`** | Handles caching, refetching, mutations, stale-while-revalidate. Standard React data layer. Replaces hand-rolled `useEffect + fetch + useState` loops. |
| Auth SDK | **`@supabase/supabase-js`** | Required for magic-link `signInWithOtp` + session refresh. Hand-rolling is not worth it. |
| Routing | **`react-router-dom`** | Magic-link redirect needs a real URL (`/auth/callback`); the current `pg` string state can't represent that. Migration is mostly mechanical — `pg` values become routes. |
| Generated types | **Hand-typed for stage 1; generated in stage 2** | Getting `packages/api-types/` end-to-end working is its own chore. Hand-type the ~6 endpoints we need this stage; switch to generated when more endpoints land. |
| Form state | **Hand-rolled `useState`** (existing pattern) | Forms are simple. No `react-hook-form` yet. Revisit if validation gets messy. |
| Error toasts | Keep the existing `<ToastContainer>` | No regression; it already works. |

**Push back if you disagree on any of these before we start.** Otherwise these are the defaults I'll use.

## 5. Step-by-step execution plan

One commit per labeled step. Each step ends green (typecheck + lint + dev server boots + page being touched still works).

### Step A — Foundation (no behavior change)

- **A1.** Install runtime deps: `npm i @supabase/supabase-js @tanstack/react-query react-router-dom`.
- **A2.** `frontend/.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`).
- **A3.** `src/supabase/client.ts` — `createClient` singleton.
- **A4.** `src/api/client.ts` — `apiFetch(path, opts)` that:
  - Reads the Supabase session from `supabase.auth.getSession()` and adds `Authorization: Bearer <jwt>`.
  - Parses the ADR-0008 error envelope on non-2xx and throws a typed `ApiError`.
- **A5.** Typed wrappers in `src/api/{auth,profile,discovery,compatibility,courses}.ts` for the endpoints used this stage.
- **A6.** Wrap `<App />` in `<QueryClientProvider>` + `<BrowserRouter>` + a new `<AuthProvider>` (stub, real impl in step C).
- **Acceptance:** `npm run build` + `npm run typecheck` clean; nothing visually changes.

### Step B — Component extraction (pure refactor, still mock data)

Each substep is one commit. **After every commit: `npm run typecheck`, then click through the relevant page in the dev server.**

- **B1.** Shared building blocks → `components/shared/`:
  - `Nav.tsx`, `NotificationBell.tsx`, `StudentAvatar.tsx`, `ConfirmDialog.tsx`, `SlidePanel.tsx`, `ToastContainer.tsx`, `FormField.tsx` (was `F`), `ScheduleGrid.tsx` (was `TGrid`), `icons.tsx` (was `Icon` record), `hooks/useLocalStorage.ts`.
- **B2.** Landing → `components/landing/Landing.tsx`.
- **B3.** Auth pages (as-is, no rewiring yet) → `components/auth/*`. We'll rewire in step C.
- **B4.** Dashboard pages → `components/dashboard/*`.
- **B5.** Profile pages → `components/profile/*`. Step components nest under `profile/steps/`.
- **B6.** Discovery → `components/discovery/*`. Profile panel + filter dropdowns come along.
- **Acceptance after step B:** the user can still click through the entire prototype in mock mode. `App.tsx` is now under ~2000 lines and only contains in-scope router + the not-yet-extracted MyGroup / Chats / Urgent / TA pages.

### Step C — Auth wiring (first live call)

- **C1.** Backend prep (small, done before any frontend change):
  - Split `auth_bootstrap.py`: keep `bootstrap` for user-row creation + listing existing enrollments; remove the auto-enroll-from-roster logic.
  - Add `services/auth_join.py` + `POST /api/v1/auth/join` taking `{invite_code}`. Validates invite code, finds roster entry by `(course_id, email)`, creates enrollment with the roster's section. Errors: 403 `NOT_IN_ROSTER`, 404 `INVITE_CODE_NOT_FOUND`, 409 `ALREADY_ENROLLED`.
  - Add `PATCH /api/v1/users/me` taking `{display_name}`.
  - Unit tests for each. Update `tests/unit/test_auth_routes.py` for the bootstrap shape change.
- **C2.** `<AuthProvider>` now real: tracks `session` (from supabase), `user` + `enrollments` (from a one-shot `/auth/bootstrap` call cached in tanstack-query), exposes `signIn(email)`, `signOut()`, `joinCourse(inviteCode)`.
- **C3.** `MagicLinkRequest`: replaces the password form. Calls `apiAuth.precheck(email)`:
  - If `on_roster: true`, calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: <origin>/auth/callback } })` and routes to `MagicLinkSent`.
  - If `on_roster: false`, surfaces the existing "not in roster" inline error.
- **C4.** `MagicLinkCallback` at route `/auth/callback`:
  - Lets `supabase-js` parse the hash (`supabase.auth.getSession()` returns the session after redirect).
  - Calls `apiAuth.bootstrap()` exactly once; on success seeds the auth context's user + enrollments.
  - If `enrollments.length === 0`: routes to `Join` (invite-code entry).
  - Otherwise: routes to `Dash`.
- **C5.** `Join` page: takes invite code → calls `apiAuth.join(inviteCode)` → on success, re-runs `bootstrap` to refresh enrollments → routes to `Dash`. Surfaces the three error codes inline.
- **C6.** `Login` reuses `MagicLinkRequest` — same magic-link flow, no separate password path.
- **C7.** `<Nav>` shows real user name from the auth context. Demo bar (`ctrl+d`) stays; it injects a fake user instead of breaking auth.
- **Acceptance:** sign in with a real roster email locally → enter invite code → see Dash with real name and enrollment. Sign out works. Wrong invite code shows inline error.

### Step D — Profile wiring

- **D1.** `apiCourses.getSkillCatalog(courseId)` → uses the new backend endpoint (see §6) to populate the skill picker.
- **D2.** `ProfileOnboarding` becomes the single owner of the wizard form. Each step submits incrementally:
  - Step 0 (name): editable — calls `PATCH /users/me` on Next. Pre-filled with `bootstrap().user.display_name`.
  - Step 1 (skills): held in component state until step 3.
  - Step 2 (schedule): held in component state until step 3.
  - Step 3 (comm + bio): on submit, calls `POST /profiles` (create) or `PATCH /profiles/{id}` (edit), then `PUT /skills`, then `PUT /schedule`.
- **D3.** `ProfileDone` polls `POST /profiles/{id}/complete` to confirm.
- **D4.** `ProfileEdit` (the "edit existing profile" page) reads via `useProfile(courseId)`, writes via the same mutations.
- **Acceptance:** completing the wizard creates real rows; visiting profile-edit shows them back; field updates persist.

### Step E — Discovery wiring

- **E1.** `DiscoveryPage` replaces the `STU` constant with `useQuery(['students', courseId, filters], apiDiscovery.listStudents)`.
- **E2.** Filter chips (section, skill, search) wire to query params; debounce search by 250 ms.
- **E3.** After the page of students arrives, fire `apiCompatibility.batch({ course_id, target_user_ids })`; merge results by `target_user_id` into the displayed cards. Skipped targets (incomplete profile) keep showing the card but hide the score.
- **E4.** "Load more" button consumes `next_cursor`.
- **E5.** Profile panel: open by clicking a card → fetches `GET /profiles/{id}` for the canonical detail view. Schedule grid + skills + bio render from the real row.
- **E6.** Group view (tab in Discovery): **leave on mock `FORMING_GROUPS`** for stage 1. Add a banner "Live groups arriving in stage 2."
- **Acceptance:** running locally with the seed data (`make be-seed`) shows the 8 classmates with real compatibility scores. Filters narrow the list. Profile panel shows real data.

### Step F — Verification + handoff

- **F1.** Manual end-to-end pass:
  - Sign in with a roster email → bootstrap → Dash.
  - Fill the wizard → see profile in profile-edit.
  - Discovery loads with real classmates + scores.
  - Click a classmate → real profile panel.
  - Sign out → sign in again → state persists.
- **F2.** `npm run typecheck` + `npm run lint` clean.
- **F3.** Backend tests still green (`make be-test`).
- **F4.** Append a single entry to `HANDOFF.md` §11 work log linking the relevant commits.
- **F5.** Note any deferred items (e.g., name-edit endpoint, group view, etc.) in HANDOFF.md §5 "Next" so they're not forgotten.

## 6. Backend additions needed during stage 1

Confirmed after the open-questions review:

| Endpoint | Why it's needed | Estimated work |
|---|---|---|
| `GET /api/v1/courses/{course_id}` | Course header (name, code, deadline) on Dash + Discovery | tiny — service + route + Pydantic + 1 unit test |
| `GET /api/v1/courses/{course_id}/sections` | Section filter dropdown on Discovery | tiny |
| `GET /api/v1/courses/{course_id}/skills` | Skill picker in profile wizard + skill filter on Discovery | tiny |
| `PATCH /api/v1/users/me` | Step 0 of the profile wizard lets the user edit the name that came from Supabase signup | tiny |
| `POST /api/v1/auth/join` | **New gate**: takes `{invite_code}`, validates against `courses.invite_code`, looks up caller's email in `roster_entry` for that course, creates the enrollment with the TA-assigned section. Fails 403 `NOT_IN_ROSTER` if email isn't on the course's roster. | small — service + route + 2-3 unit tests |

**Bootstrap change (BREAKING):** `POST /api/v1/auth/bootstrap` stops auto-creating enrollments from `roster_entry`. It still creates / refreshes the `public.users` row and returns existing enrollments, but new enrollments now require `POST /auth/join` with an invite code. Rationale (per user clarification on 2026-05-18): students may not pick their section — TAs assign it via the uploaded roster — but the invite code is still the gate that decides which course a logged-in student is allowed to join. Recorded as a follow-up entry in HANDOFF.md when the code lands.

All endpoints above are RLS-respecting (user_session) and don't need new migrations. `POST /auth/join` is the legal place to use `admin_session` (already in the bootstrap module's allowlist).

## 7. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Magic-link redirect doesn't work locally because Supabase needs an https URL | Use `http://localhost:5173/auth/callback` — Supabase explicitly allows localhost. Add it to the project's "Site URL" + "Redirect URLs" in the Supabase dashboard. |
| Bootstrap is called twice (e.g., after a page reload) | `apiAuth.bootstrap` is idempotent already (see `services/auth_bootstrap.py`). React Query's `staleTime: Infinity` for this key is enough. |
| App.tsx becomes inconsistent during extraction (lots of files moved mid-refactor) | One commit per substep in B. After each, the dev server boots and the touched page still works. |
| Some shared component is imported by an out-of-scope page (e.g., MyGroup uses Nav) | Extract it but **keep the old export from App.tsx** as a re-export until stage 2. Avoids touching out-of-scope pages. |
| TanStack Query learning curve | Use it minimally for stage 1: `useQuery` for reads, `useMutation` for writes. No fancy `optimisticUpdates` yet. |
| RLS denies a query we expect to work (e.g., listing classmates) | The relevant policy exists from migration 0002. Test by running locally against the seeded DB. If a policy blocks, fix at the DB layer via a follow-up migration, not by going through `admin_session`. |

## 8. Time / risk estimate

- Step A: 30 min (mechanical).
- Step B: 1–2 sessions (lots of files; finicky but low-risk).
- Step C: 1 session (auth is the trickiest part).
- Step D: 1 session.
- Step E: 1 session.
- Step F: 30 min.

Total: about **4–6 working sessions**. We can pause and merge at the end of any step — every step ends in a working state.

## 9. Resolved decisions (2026-05-18)

1. **Library defaults in §4** — approved as written. `react-query` + `react-router-dom` + `supabase-js` + hand-typed types for stage 1.
2. **Step 0 (name)** — editable; add `PATCH /api/v1/users/me` (small, fits in step C).
3. **`Join` page** — kept. TAs upload the roster (TA picks the section, students don't), but the invite code is still the join-this-course gate. Bootstrap stops auto-enrolling — see §6 for the bootstrap split + new `POST /api/v1/auth/join` endpoint.

Plan is final. Starting step A next.
