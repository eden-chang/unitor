# Session log — 2026-05-20 — Stage 1 / Steps C + D

This log covers the working session that wired the magic-link auth flow
(Step C) and the profile wizard + edit page (Step D) of the stage 1
frontend plan ([`.docs/frontend-stage1-plan.md`](../frontend-stage1-plan.md)).
Going in, the repo had:

- A pure-mock frontend that still rendered the password-style Login /
  Signup / Verify screens from the prototype.
- An `<AuthProvider>` stub that only tracked the Supabase session.
- No backend `POST /auth/join` and no `PATCH /users/me`.
- No `GET /courses/{id}` / `/sections` / `/skills` endpoints.
- A 4-step profile wizard with hardcoded skill chips and a hardcoded
  section, persisting state to `localStorage` keys only.

Going out: a user can paste a roster email at `localhost:5173/unitor-demo/`,
click a real magic link, land on `/auth/callback`, run the bootstrap,
enter an invite code, fill the wizard against a real course, and see
their profile come back through `ProfileEdit` from the database. Step E
(Discovery) is the only thing still on mock data inside the stage-1
slice.

All commits are authored as `eden-chang <eden.chang27@gmail.com>` with
no `Co-Authored-By` line, per the standing rule. Branch policy is
"commit directly to `main`" (retired 2026-05-18; see
`workflow_branches` memory).

Commits this session (chronological):

| Commit | Message |
|---|---|
| `c5f09b3` | feat(backend): stage 1 step C1 — bootstrap split + /auth/join + PATCH /users/me |
| `225afdb` | docs: HANDOFF.md work log for stage 1 step C1 |
| `a3eef2a` | feat(frontend): stage 1 step C2-C7 — magic-link auth + Join wiring |
| `f149ee2` | docs: HANDOFF.md work log for stage 1 step C2-C7 |
| `e0ce645` | feat(backend): stage 1 step D — GET /courses/{id}, /sections, /skills |
| `9a33fe9` | feat(frontend): stage 1 step D — profile wizard + edit wired to backend |
| `d052e53` | docs: HANDOFF.md work log for stage 1 step D |

Test count moved 53 → 65 (step C1) → 71 (step D backend). Frontend
typecheck + build stayed clean throughout; the 1 pre-existing eslint
error in the not-yet-extracted ChatsPage region of `App.tsx` is the
same baseline as before step C started.

---

## Phase 1 — Step C1: split bootstrap, add `/auth/join`, add `PATCH /users/me`

The stage 1 plan called out a deliberate **breaking change** to
`POST /api/v1/auth/bootstrap`: it no longer auto-creates enrollments
just because a roster row matches the caller's email. The rationale
was decided on 2026-05-18 — TAs upload the roster (and pick the
section), but the invite code is still the gate that controls *which*
course a logged-in student is allowed to join. Without a gate, anyone
with a Supabase account whose email appeared on any active roster
would silently get enrolled on first login.

### Bootstrap refactor

`app/services/auth_bootstrap.py` lost its enrollment-creation loop.
What's left:

1. Defensive `_upsert_user` (the `tg_mirror_auth_user` trigger normally
   does this; the service is just a belt-and-suspenders if the trigger
   is delayed or missing).
2. A best-effort roster-link pass: if a `roster_entries` row for this
   email exists on an *active* course and isn't yet linked to a user,
   claim it. This is a UX convenience for the TA-side roster view; it
   doesn't enroll the caller.
3. Return the user's existing enrollments.

`RosterEmailNotFound` is gone. The only remaining error from
`bootstrap` is `MissingEmailClaim`, surfaced as a defensive 401 because
Supabase JWTs from magic-link signup always include `email`. The
`newly_enrolled_count` field was removed from `BootstrapResponse` since
the value is now always 0.

### `POST /api/v1/auth/join`

New module `app/services/auth_join.py`. Three error types — each
unconditionally mapped to a stable error code so the frontend can
surface them inline:

| Service exception | Status | Code |
|---|---|---|
| `InviteCodeNotFound` | 404 | `INVITE_CODE_NOT_FOUND` |
| `NotInRoster` | 403 | `NOT_IN_ROSTER` |
| `AlreadyEnrolled` | 409 | `ALREADY_ENROLLED` |

The route runs inside `admin_session()`. This sits on the existing
legal-import allowlist (`app/api/v1/auth/` is already permitted) — the
caller doesn't yet have RLS visibility into the roster of a course
they're trying to join, so RLS can't be the gate here. App-layer
validation: invite code → active course → caller's email on roster of
*that* course → not already enrolled.

On success the service creates the `enrollments` row with the
TA-assigned `section_id` from the roster entry. If the roster row
hadn't been linked yet, we link it too (cheap idempotency for the
"first login + first join" path).

### `PATCH /api/v1/users/me`

The plan needed this so step 0 of the profile wizard (display name)
can persist edits. The naïve route would have run under
`admin_session`, but that pulls `app/api/v1/users.py` into the
restricted-import allowlist for what is logically a self-service
write.

The cleaner solution was a new RLS policy. **Migration 0011** adds
`users_update_self` to `public.users`:

```sql
CREATE POLICY users_update_self ON users FOR UPDATE
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid() AND deleted_at IS NULL);
```

That's all the route needs: it just runs under `user_session` and lets
Postgres enforce the own-row constraint. Applied to live Supabase
(head = 0011) before commit.

### Tests

`tests/unit/test_auth_routes.py` rewritten to match the new bootstrap
shape (no `newly_enrolled_count`, no `RosterEmailNotFound` path,
`MissingEmailClaim` → 401 instead of 403). Six new tests for `/auth/join`
cover the happy path + each of the three error codes + a 401 (no auth)
+ a 422 (empty invite code). New file
`tests/unit/test_users_routes.py` covers `PATCH /users/me` for the
happy path, 401, two 422s (empty + overlong name), and 404 from the
service.

### Type fixes that surfaced

`current_user.id` is a string from JWT; `Enrollment.user_id` and
`RosterEntry.user_id` are typed as `UUID` on the ORM. Mypy caught both
sites where we were assigning a string to a UUID-typed column. Fix:
wrap with `UUID(current_user.id)` once at the top of each service
function, then thread the typed value through. Also bumped the
`_upsert_user(user_id: str)` signature to `UUID`.

After the dust settled: `ruff check` + `ruff format` + `mypy app` +
`pytest tests/unit/ -q` all green. Test count 53 → 65.

---

## Phase 2 — User prereqs gate: `.env` + Supabase dashboard

Before any of step C2-C7 could run end-to-end, the user had to:

1. Fill `frontend/.env` from `frontend/.env.example`. Three values:
   `VITE_SUPABASE_URL` (same as `backend/.env`'s `SUPABASE_URL`),
   `VITE_SUPABASE_ANON_KEY` (the publishable key — NOT the
   service-role key), and `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
   The `.env` file is already gitignored at three layers
   (root, `frontend/`, `backend/`) — verified before walking the user
   through it.

2. Configure Supabase dashboard → Authentication → URL Configuration:
   - Site URL: `http://localhost:5173`
   - Redirect URLs include `http://localhost:5173/unitor-demo/auth/callback`.

The mid-session pause to walk the user through filling these values
was deliberate: C2-C7 isn't testable until both prereqs land, and
attempting to type them on the user's behalf would have meant
secrets-in-chat. The walkthrough explicitly told the user **not** to
paste the filled values back into the conversation.

`uv` wasn't on PATH on this Windows machine — backend pytest /
ruff / mypy were run through `./.venv/Scripts/python.exe -m <tool>`
throughout. `make` targets still work since they `cd backend && uv run …`.

---

## Phase 3 — Step C2-C7: real magic-link flow on the frontend

### `<AuthProvider>` (C2)

Before: stub that exposed `session`, `isLoading`, `isAuthenticated`.

After: a real provider over the Supabase session plus a tanstack-query
`useQuery` on `apiAuth.bootstrap()` keyed `["auth", "bootstrap"]` with
`staleTime: Infinity` and `gcTime: Infinity`. The query is `enabled:
session !== null` so we don't fire it on the sign-in form. Auth-state
changes (`onAuthStateChange`) invalidate the bootstrap query
automatically, so signing in triggers a fresh fetch and signing out
clears it. Sign out also explicitly `qc.removeQueries({...})` so the
query result doesn't survive logout for the next user.

Exposed methods:

- `signIn(email)` — precheck → `signInWithOtp` with `emailRedirectTo`
  derived from `window.location.origin + BASE_URL + /auth/callback`.
  Throws an `ApiError` with code `NOT_IN_ROSTER` if precheck fails so
  the form can render the same inline error the bootstrap path used to.
- `signOut()` — Supabase signout + `removeQueries`.
- `joinCourse(inviteCode)` — calls `apiAuth.join`, then *awaits* both
  `invalidateQueries` and `refetchQueries` so the caller can route
  knowing `enrollments` is fresh.
- `refreshBootstrap()` — same pair, surfaced for the profile wizard
  after `PATCH /users/me`.

### `MagicLinkRequest` (C3 + C6)

Single email field. Replaces both `Login.tsx` (deleted entirely as
dead code — there's no longer a separate password path) and the
student branch of `SignupForm.tsx`. Calls `signIn(email)` and routes
to `Verify` (repurposed as "check your inbox" — its old fake "I've
Verified My Email" button was removed since the only way forward is
the real link).

TA mock flow: `signup-t` still routes to the old `SignupForm.tsx`
because the TA flow is out of scope for stage 1 and was kept rendering
its mock screens. `signup-s` and `login` both go through
`MagicLinkRequest`.

### `MagicLinkCallback` (C4)

The Supabase magic link redirects to
`http://localhost:5173/unitor-demo/auth/callback`. Vite serves the
SPA from `BASE_URL = /unitor-demo/`, so the path inside the app is
`/auth/callback`.

The existing prototype has a `pg`-string pseudo-router (page state in
`App.tsx`), not real react-router routing. The simplest wiring was:

- A `getInitialPage()` helper at module scope detects the callback
  path on first mount via `window.location.pathname.endsWith("/auth/callback")`
  and seeds `pg` to `"callback"`.
- The `go()` wrapper normalises the URL back to `BASE_URL` (via
  `history.replaceState`) when we navigate away from the callback,
  so a reload doesn't re-trigger the callback flow.

The callback component itself watches `isAuthenticated` +
`isBootstrapLoading` + `bootstrapError` and routes once we know
whether `enrollments` is empty (→ `Join`) or non-empty (→ `Dash`). An
8-second timeout shows a "link expired" status if no session ever
arrives — Supabase populates the session synchronously off the URL
hash for a healthy link, so a 0-second wait is the common case, but
a stale / already-consumed link would otherwise spin forever.

### `Join` page (C5)

Stripped the prototype's two-step "look up → confirm" flow. The
"look-up" endpoint would have leaked an invite-code → course-name
mapping to anyone who could guess codes; the response from `/join`
already returns the course details on success. So the page is one
field + one button.

`ALREADY_ENROLLED` is treated as a soft success: surface the inline
copy, flip `hasJoinedCourse`, and route to `Dash` after a short delay
so the user isn't trapped on the form.

### `<Nav>` (C7)

Reads `display_name` from auth context with the demo-bar `userName`
as fallback. The avatar dropdown's "Log Out" button awaits
`signOut()` then clears localStorage (so the demo bar's state
doesn't survive). The dropdown also shows the name + email above the
"Edit Profile" / "Log Out" rows.

### App.tsx integration

After bootstrap lands, sync the values back into the localStorage
shim so the prototype's still-mock components (Dash greeting, etc.)
keep working:

```tsx
useEffect(() => {
  if (auth.user?.display_name && auth.user.display_name !== userName) {
    setUserName(auth.user.display_name);
  }
  if (auth.user?.primary_email && auth.user.primary_email !== userEmail) {
    setUserEmail(auth.user.primary_email);
  }
  if (auth.enrollments.length > 0 && !hasJoinedCourse) {
    setHasJoinedCourse(true);
  }
}, [auth.user, auth.enrollments, /* … */]);
```

This is intentionally one-way: the shim follows the auth context, not
the other way around. The shim survives until stage 2 when each page
is refactored to read directly from the context.

`Login.tsx` deleted as dead code. Verified no imports remained before
removal.

### Cleanup

After the rewire: `tsc --noEmit` + `vite build` clean. Dev server
boots and serves HTTP 200 at `/unitor-demo/`. The eslint baseline (1
pre-existing error inside the not-yet-extracted ChatsPage in App.tsx,
11 warnings of various flavours) is unchanged — no regressions.

---

## Phase 4 — Step D: profile wizard and edit page on the backend

### Backend: course metadata endpoints

The wizard's skill picker needs the per-course skill catalog; the
section line needs the section list; the Discovery filter bar (later
in step E) needs both plus the course header. Three thin endpoints
under a new `app/api/v1/courses.py`, all RLS-respecting under
`user_session`:

- `GET /api/v1/courses/{id}` → `CourseSummary`
- `GET /api/v1/courses/{id}/sections` → `list[SectionRead]`
- `GET /api/v1/courses/{id}/skills` → `list[CourseSkillRead]`

`SectionRead` and `CourseSkillRead` carry only the fields the frontend
uses (no `course_id` field, since it's already in the URL). The
sections list is ordered by section code; the skill catalog is
ordered by `display_order` then `skill_name`.

404 covers both "course doesn't exist" and "course exists but RLS
filtered it out". We don't distinguish so the existence of unrelated
courses isn't leaked to a probing caller.

`app/services/courses.py` calls `get_course` from `list_sections` and
`list_skills` before running the secondary query, so a not-found
course returns 404 rather than an empty list (less confusing).

Six route tests in `tests/unit/test_courses_routes.py` — same
dependency-override pattern the profile + users tests use. Test count
65 → 71.

### Frontend: query hooks

`hooks/useProfile.ts` centralises the profile-page query layer:

- `useMyProfile(courseId)` wraps `GET /profiles/me/{course_id}` and
  swallows `PROFILE_NOT_FOUND` into `{ data: null }`. Bubbling that
  404 would have made the wizard's "no profile yet → submit"
  branch awkward.
- `useCreateProfile` / `useUpdateProfile` / `useReplaceSkills` /
  `useReplaceSchedule` — all invalidate the matching
  `profileKeys.myByCourse(courseId)` key on success, and
  `useUpdateProfile` also writes the response directly into the query
  cache via `setQueryData` so the edit page's next render shows the
  fresh data without a round-trip.
- `useCheckCompletion` — a `useMutation` rather than a `useQuery`
  because the endpoint bumps `last_active_at` server-side; we only
  want to run it on the wizard's celebration page, not anywhere the
  query cache might inadvertently auto-refetch.

`hooks/useCourseSkills.ts` is a single `useQuery` against the skill
catalog with `staleTime: Infinity` — TAs edit the catalog at course
setup time and almost never afterwards, so caching it for the lifetime
of the tab is fine.

### Frontend: wizard shared state

The 4 wizard steps live in separate components routed through the
`pg`-string page map. To share state across them without lifting it
into a parent context, every wizard field is backed by
`useLocalStorage` under a `wizard_*` namespace via the new hook
`hooks/useWizardState.ts`. This gives us:

- State that survives a mid-wizard refresh.
- One `reset()` call to clear it all after `POST /profiles` succeeds.
- Reversible helpers `proficiencyToApi` / `proficiencyFromApi` and
  `cellToScheduleSlot` / `scheduleSlotToCell` so the same code path
  works in both directions (wizard → DB, DB → ProfileEdit).

The `ScheduleGrid` component uses string keys like `"Mon-1"`,
`"Wed-2"`. The backend stores `{ day_of_week: 0..4, time_band: 0..3 }`.
The two converters above are the only place that mapping lives.

### Step 0 — Name

Pre-fills from `user.display_name` (auth context). On Next:

1. `apiAuth.updateMe(name)` — `PATCH /users/me`.
2. `await refreshBootstrap()` so Nav and any other consumers see the
   new name immediately.
3. `go("prof-1")`.

The photo-upload button is disabled with a "stage 2" hint so the
mock state doesn't look broken.

### Step 1 — Skills

Catalog from `useCourseSkills(enrollments[0]?.course.id)`. Selection
shape `{ course_skill_id, proficiency }` matches the backend's
`SkillEntry` directly. Custom-skill button removed (no backend
support — TAs own the catalog).

`MIN_SKILLS = 2` enforced client-side; the backend service also has
the same gate via `check_completion`.

### Step 2 — Section + schedule

Section code comes from `enrollments[0]?.section_code` (TA-assigned
on the roster). Read-only display, since students don't pick their
own section.

The schedule grid + "flexible" checkbox persist into wizard state.
"Next" is disabled if neither is set, mirroring the completion
criterion that "at least 1 schedule slot OR `schedule_flexible=true`"
is required.

### Step 3 — Comm + bio + submit

This is the only step that talks to the backend on Next. It runs
`POST /profiles` with everything from steps 1-3 inlined in the body
(`ProfileCreate` accepts `skills` and `schedule_slots` so we don't
need separate PUTs for the first submission):

```tsx
await apiProfile.createProfile({
  enrollment_id: enrollment.id,
  bio: wizard.bio.trim(),
  meeting_frequency: wizard.meetingFrequency,
  meeting_style: wizard.meetingStyle,
  comm_tool: wizard.commTool,
  comm_handle: wizard.commHandle.trim() || null,
  schedule_flexible: wizard.scheduleFlexible,
  skills: buildSkills(),
  schedule_slots: buildSlots(),
});
```

Idempotency for partial wizard runs: if the backend returns
`PROFILE_ALREADY_EXISTS` (409), the step falls back to:

1. `PATCH /profiles/{existing.id}` for the scalar fields.
2. `PUT /profiles/{existing.id}/skills` to replace the skill set.
3. `PUT /profiles/{existing.id}/schedule` to replace the schedule.

The prototype's "pick multiple platforms" UI collapsed to a single
selection because `comm_tool` is a scalar on the backend, not a list.
If we want multi-platform later, that's an `app/db/models/profile.py`
change first.

On success: `wizard.reset()` clears the localStorage namespace, then
`go("prof-done")`.

### ProfileDone — completion gate

On mount, the page calls `POST /profiles/{id}/complete` once via
`useCheckCompletion`. If `is_complete=false`, the "Go to Matching
Board" button stays disabled and a "Edit Profile" link appears so the
user can fix the missing fields. A small effect-id-only dependency
list (`[profile?.id]`) prevents a re-run loop; the
`exhaustive-deps` rule is suppressed inline with a comment that names
the reason (the mutation object is stable from React Query).

### ProfileEdit — drop localStorage, read from the API

The prototype version had ~10 `useLocalStorage` keys. All gone.
ProfileEdit now:

- Reads via `useMyProfile`.
- Renders a "no profile yet" shell with a CTA back to `prof-0` if the
  endpoint 404s.
- On Edit, materialises a local `draft` from the fresh profile.
- On Save, runs the same three-call sequence the wizard falls back to
  (PATCH + PUT skills + PUT schedule).
- On Cancel, discards the draft — the server-side snapshot is the
  source of truth.

The view-mode skill chips render skill names from the catalog (so the
name shows even if the user later removes a chip from selection), and
the schedule cells go through `scheduleSlotToCell` for round-trip
fidelity with the wizard.

One linter trap caught here: I'd initially seeded the `draft` via a
`useEffect` that depended on `editing` + `profile` + `draft`. The
`react-hooks/set-state-in-effect` rule (the same rule that fires on
the pre-existing ChatsPage warning in App.tsx) rejected it. Fix:
remove the effect entirely and seed the draft synchronously in
`enterEdit`. The component already guarantees `profile` is loaded
before the edit button is rendered, so the effect was redundant.

### Verification

- Backend: `pytest tests/unit/ -q` → 71 passed.
- Backend: `ruff check` + `ruff format --check` + `mypy app` all clean.
- Frontend: `tsc --noEmit` clean.
- Frontend: `vite build` clean (bundle warning unchanged from before).
- Frontend: `eslint .` shows 1 error + 11 warnings — same baseline
  as before step C started. No regressions.

---

## Things to know going into Step E

1. **The bootstrap result is the source of truth for `course_id` and
   `section_code`.** Every page that needs them already uses
   `useAuth().enrollments[0]`. Step E should follow the same pattern
   rather than hand-typing course IDs anywhere.

2. **Skill catalog is cached forever.** `useCourseSkills` uses
   `staleTime: Infinity`. If a TA-side skill-catalog edit endpoint
   lands in stage 2, it needs to invalidate the
   `["courses", id, "skills"]` query key.

3. **DiscoveryPage has a pre-existing `react-hooks/set-state-in-effect`
   suppression on the `urgentMode` sync effect.** The eslint comment
   in `DiscoveryPage.tsx` says it'll be fixed during step E's Discovery
   wiring. Don't forget to flip that suppression to a derived-value
   pattern when the page is rewired.

4. **The TA flow (`role === "t"` → `SignupForm`) is still on mocks**
   on purpose. Anything that touches TA-side state should be out of
   scope for stage 1. Stage 2 will rewrite the TA pages alongside
   the roster-import flow.

5. **The wizard's `localStorage` namespace is `wizard_*`** under the
   existing `unitor_` prefix from `useLocalStorage`. A migration in
   stage 2 (when we add resume-where-you-left-off) needs to be aware
   of that.

6. **`POST /compatibility/batch` exists but is unchanged in this
   session.** Step E will use it as-is. The compatibility cache
   invalidation triggers from migration 0010 fire on profile changes,
   so Discovery scores will recompute after the wizard finishes.

7. **`GET /api/v1/courses/{id}/sections` exists but has no consumer
   yet** — Step E (section filter on Discovery) is the first caller.

---

## Open follow-ups (none introduced this session)

The only thing carried forward from before that's relevant to step E is
the DiscoveryPage eslint suppression noted above. All step C and step D
TODO items are resolved.
