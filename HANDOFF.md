# Unitor — Handoff document

You are picking up a project that has just finished its backend bring-up. This document is the single starting point — it tells you **where everything lives, what's done, what's next, and the rules the previous contributor was working under**.

Read this top-to-bottom once. Every section is short.

---

## 1. What this project is

Unitor is a class-scoped teammate-matching tool for university courses. A student joins, fills out a profile (skills, schedule, comm preference), and finds compatible classmates or open groups for their course's group project. TAs upload a roster CSV that gates who can sign up. Compatibility is computed by the backend, not the client.

The product started as a CSC318 design-school prototype (frontend only, hardcoded data, `localStorage`). The most recent session brought up the real backend (Supabase + FastAPI) and locked in the architecture.

For the *prototype's* design intent (scenarios, user flows, evaluations), see [`.docs/easea-scenario-ux-flows.md`](./.docs/easea-scenario-ux-flows.md) and [`.docs/evaluations.md`](./.docs/evaluations.md). For *current* state, see this document.

---

## 2. Working agreements (preserved verbatim — do not silently change)

These are the constraints the previous contributor was operating under. They are non-negotiable unless the user explicitly relaxes them.

- **Commit author**: every commit must be authored as `eden-chang <eden.chang27@gmail.com>` via `git commit --author "eden-chang <eden.chang27@gmail.com>" ...`. **Do not modify global `git config`**. **Do not add `Co-Authored-By` lines for Claude or any tool.**
- **Branches**: commit directly to `main`. We do **not** use feature branches anymore. Instead, **track ongoing work in this document** (see §11 "Work log") so whoever picks up next can see what was just done and what's in flight. (Earlier in the project we used branches; that policy was retired on 2026-05-18 at the user's request.)
- **Secrets**: `backend/.env` is gitignored. Never paste full secret values into chat, commits, or external systems. Never commit `.env`.
- **Migrations are canonical**: never apply SQL via the Supabase dashboard. Schema lives in `backend/alembic/versions/`. See [ADR 0006](./.docs/decisions/0006-development-toolchain.md).
- **No silent reverts**: if you have to change a decision recorded in `.docs/decisions/`, write a new ADR that supersedes the old one instead of rewriting history.

---

## 3. Repository map

```
unitor/
├── HANDOFF.md                      # you are here
├── README.md                       # public-facing repo overview
├── Makefile                        # `make help` lists every dev target
├── CLAUDE.md                       # AI assistant guidelines (style, persona)
├── frontend/                       # React 19 + Vite 7 + Tailwind 4 prototype
├── backend/                        # FastAPI service (the work delivered this session)
├── packages/api-types/             # Placeholder — TS types regen'd from backend/openapi.json
├── .docs/                          # Architecture decisions + specs + session logs
├── .github/workflows/              # CI (backend.yml) + GH Pages deploy (deploy.yml)
└── .gitignore / .gitattributes
```

### `backend/` in detail

```
backend/
├── pyproject.toml             # Python 3.12, uv-managed deps, ruff/mypy/pytest config
├── uv.lock                    # commit this
├── alembic.ini                # do NOT put the DB URL here (configparser % interp issue)
├── README.md                  # backend-specific dev guide
├── .env / .env.example        # .env is gitignored
├── alembic/
│   ├── env.py                 # reads DB URL from settings (bypasses ini)
│   └── versions/0001..0009    # migrations — head = 0009
├── scripts/
│   └── seed_dev.py            # idempotent UofT + CSC318 + classmates seed
├── tests/
│   ├── conftest.py
│   ├── fixtures/
│   ├── unit/                  # 37 tests, no external deps — `make be-test`
│   └── integration/           # require `supabase start` (per ADR 0009 §8)
└── app/
    ├── main.py                # FastAPI app factory, middleware, routers
    ├── config.py              # pydantic-settings, SecretStr for sensitive fields,
    │                          # build_cors_origin_regex() for *.vercel.app wildcards
    ├── observability.py       # structlog + Sentry init, before_send PII scrubber
    ├── auth/jwt.py            # PyJWT verify (aud + iss + required claims)
    ├── middleware/
    │   └── request_id.py      # X-Request-Id mint + structlog bind + Sentry tag
    ├── db/
    │   ├── session.py         # user_session (default, RLS-respecting)
    │   │                        + CurrentUserDep + UserSessionDep
    │   ├── admin.py           # admin_session (service role, RLS bypassed).
    │   │                        Import only from auth/, admin/, jobs/.
    │   └── models/            # ORM mirrors of migration state (one file per domain)
    ├── schemas/               # Pydantic request/response models
    ├── api/v1/
    │   ├── auth.py            # precheck + bootstrap
    │   ├── health.py
    │   ├── profiles.py        # CRUD + skills/schedule replace-set
    │   ├── discovery.py       # students + groups feeds
    │   └── admin/             # (placeholder) future TA admin endpoints
    ├── services/              # pure business logic
    │   ├── auth_bootstrap.py
    │   ├── profile.py         # replace-set with delete+flush boundary
    │   └── discovery.py       # cursor pagination, batched hydration
    └── jobs/                  # (placeholder) future cron handlers
```

### `.docs/` in detail

```
.docs/
├── README.md                       # docs index (start here for context)
├── 01-current-state.md             # what the prototype is, how to run it
├── 02-frontend-inventory.md        # page/component inventory
├── 03-mock-data-and-state.md       # where frontend mock data hides
├── 04-backend-gaps.md              # capability gap analysis
├── 05-planning-targets.md          # bird's-eye plan (links into ADRs)
├── 06-erd.md                       # full ERD: tables, indices, RLS, partitioning
├── 07-auth-flows.md                # signup, login, JWT verify, deletion
├── 08-matching-spec.md             # compatibility algorithm spec
├── 09-csv-roster-spec.md           # TA roster CSV format + validation
├── 10-api-surface.md               # endpoint inventory + Supabase vs FastAPI split
├── easea-scenario-ux-flows.md      # source UX scenario (reference only)
├── evaluations.md                  # CSC318 design alternatives (reference only)
├── decisions/                      # ADRs — see §4 below
├── session-logs/
│   └── 2026-05-17-backend-bringup.md   # narrative of the bring-up session
└── archive/frontend-phases/        # Korean phase plans — do NOT treat as live work
```

---

## 4. Architecture decisions — read these in order

The ten ADRs are the ground truth for "why is the code structured this way." Each one is short and self-contained. The index lives at [`.docs/decisions/README.md`](./.docs/decisions/README.md).

| # | What it locks in | Read when… |
|---|---|---|
| [0001](./.docs/decisions/0001-multi-tenancy.md) | Single Postgres + RLS, one schema per product not per tenant | …you're touching anything with `course_id` |
| [0002](./.docs/decisions/0002-backend-stack.md) | Supabase + FastAPI hybrid; which calls go where | …you're adding a new endpoint |
| [0003](./.docs/decisions/0003-infrastructure.md) | Hosting, storage, observability vendors | …you're touching infra or deploy |
| [0004](./.docs/decisions/0004-data-strategy.md) | Hot/cold split, partitioning, compatibility caching | …you're touching messages, reactions, or matching cache |
| [0005](./.docs/decisions/0005-repo-structure.md) | Monorepo layout | …you're moving files around |
| [0006](./.docs/decisions/0006-development-toolchain.md) | Python 3.12 + uv + SQLAlchemy 2.0 async + Alembic + ruff/mypy strict | …**before** running any backend command |
| [0007](./.docs/decisions/0007-domain-modeling.md) | Profile is per-user, roster is TA-side, group leader = row+index | …you're touching domain models |
| [0008](./.docs/decisions/0008-conventions.md) | UUIDv7, TZ-aware timestamps, error envelope, soft delete | …you're adding a table or endpoint |
| [0009](./.docs/decisions/0009-audit-corrections.md) | First senior audit — **two-mode session pattern lives here** | …**before you touch `app/db/session.py` or `admin.py`** |
| [0010](./.docs/decisions/0010-second-audit.md) | Second senior audit — transaction lifecycle, CORS regex, SecretStr, Sentry PII, JWT hardening, CI | …**before you change auth, transactions, or CI** |

If you only have time to read three: **0002, 0009, 0010**.

---

## 5. What is done vs what is next

### Done and on `main`

| Capability | Status | Where it lives |
|---|---|---|
| Multi-tenant schema (25 tables) | Applied to live Supabase (head = 0010) | `backend/alembic/versions/0001-0010` |
| Auth bootstrap (`/precheck` + `/bootstrap`) | Working end-to-end | `app/api/v1/auth.py`, `app/services/auth_bootstrap.py` |
| Profile CRUD + skills/schedule replace-set | Working end-to-end | `app/api/v1/profiles.py`, `app/services/profile.py` |
| Discovery read (students + groups feeds) | Working end-to-end | `app/api/v1/discovery.py`, `app/services/discovery.py` |
| Compatibility matching (`POST /compatibility/batch`) | Working end-to-end, cache + invalidation triggers live | `app/api/v1/compatibility.py`, `app/services/compatibility.py`, migration 0010 |
| Two-mode DB sessions (`user_session` + `admin_session`) | Owns its own transaction | `app/db/session.py`, `app/db/admin.py` |
| JWT verification (aud + iss + required claims) | Hardened per ADR 0010 | `app/auth/jwt.py` |
| Observability (structlog + Sentry with PII scrubber) | Wired | `app/observability.py`, `app/middleware/request_id.py` |
| CI (ruff + format + mypy strict + pytest + alembic chain) | Runs on every push | `.github/workflows/backend.yml` |
| Dev seed (UofT + CSC318 + 8 classmates) | Idempotent | `backend/scripts/seed_dev.py` |
| Tests (53 unit tests passing) | Green | `backend/tests/unit/` |

### Next, in suggested order

1. **Task B-1.5 — TA bootstrap endpoints.**
   Use the `ta_allowlist` table (migration 0008). Mirror the student bootstrap pattern in `app/api/v1/auth.py`. `admin_session` import is legal here.

2. **Task C — Frontend wiring.**
   `frontend/App.tsx` is ~4655 lines of prototype. Replace hardcoded data + `localStorage` with real calls. Use the Supabase JS SDK for magic-link sign-in, then call FastAPI for bootstrap, profile, discovery, and compatibility. Discovery's "Best Match" sort uses `POST /api/v1/compatibility/batch`. Regenerate `packages/api-types/` from `backend/openapi.json` and import via `import type { paths } from "@unitor/api-types"`.

3. **Compatibility weight tune-up.**
   The literal formula in `services/compatibility.py` clamps high for fully-complementary pairs and low for fully-redundant pairs (see HANDOFF §11 entry for 2026-05-18). When the pilot generates real data, revisit weights + bump `CURRENT_ALGORITHM_VERSION` in the same change.

4. **Pre-pilot hardening** (not blocking B-1.5/C, but should happen before any real users):
   - Rate limiting on `/auth/precheck` (e.g. `slowapi`) — anti-enumeration.
   - CI lint rule enforcing `admin_session` import restriction (currently a convention, not enforced).
   - `selectinload` to batch profile children if profiling shows the 3-query hydration is hot.
   - OpenAPI → TS types regen step in CI once frontend consumes types.
   - Verify `pg_partman` + `pg_cron` behavior on Pro tier before turning on scheduled jobs.

### Open decision surfaces (already flagged in docs)

The detailed specs end with "Decisions to confirm" sections. They are not blocking the next tasks but should be revisited before the pilot:

- [`.docs/06-erd.md`](./.docs/06-erd.md) §13 — 9 schema-level defaults.
- [`.docs/07-auth-flows.md`](./.docs/07-auth-flows.md) §12 — 7 auth/lifecycle defaults.
- [`.docs/08-matching-spec.md`](./.docs/08-matching-spec.md) §12 — 10 algorithm tuning defaults.
- [`.docs/09-csv-roster-spec.md`](./.docs/09-csv-roster-spec.md) §13 — 9 CSV-handling defaults.
- [`.docs/10-api-surface.md`](./.docs/10-api-surface.md) §7 — 9 API-shape defaults.

---

## 6. Quick start

Assumes Python 3.12, [uv](https://docs.astral.sh/uv/), Node 20+, and Docker. From the repo root:

```bash
# One-time: install deps for both stacks.
make be-install                     # backend (uv sync --all-groups)
make fe-install                     # frontend (npm ci)

# Fill in the env file. .env.example has every key with placeholder values.
cp backend/.env.example backend/.env
# then edit backend/.env with the Supabase values you have access to.

# Apply migrations to the database backend/.env points at.
make be-migrate                     # alembic upgrade head

# Seed UofT + CSC318 + classmates (idempotent).
make be-seed

# Run.
make be-dev                         # http://localhost:8000 — docs at /api/v1/docs
make fe-dev                         # http://localhost:5173/unitor-demo/  (separate terminal)
```

Smoke test the backend:

```bash
curl http://localhost:8000/api/v1/health
# → {"status":"ok"}
```

Run the full check loop before pushing:

```bash
make check                          # ruff + ruff format check + mypy + pytest + frontend lint/typecheck
```

---

## 7. Operational gotchas

If you hit any of these and they look surprising, the previous contributor *also* hit them. Don't re-debug from scratch.

| Gotcha | Where it bit | Fix |
|---|---|---|
| RLS infinite recursion on `enrollments` | Every user-session query | `SECURITY DEFINER` helper `public.my_course_ids()` — see migration 0009 |
| `uuid_utils.UUID` rejected by Pydantic v2 | Bootstrap endpoint, profile create | Import from `uuid_utils.compat`, not `uuid_utils` |
| Route calls `await db.commit()` | Subsequent queries silently lose RLS context | Session helpers own the transaction. Routes must not commit. See ADR 0010 §1 |
| `https://*.vercel.app` in `allow_origins` | CORS denies preview deploys | `build_cors_origin_regex()` in `config.py` routes wildcards through `allow_origin_regex` |
| `@@` in DB password | URL parsing fails | URL-encode to `%40%40` |
| `configparser` `%` interpolation in `alembic.ini` | `alembic upgrade` crashes | Read DB URL from settings in `alembic/env.py`, not from the ini |
| Optional `pg_uuidv7` extension aborts the migration transaction | Migration 0001 on Free tier | `bind.begin_nested()` SAVEPOINT around optional `CREATE EXTENSION` |
| asyncpg rejects multi-statement SQL | Migration 0009 first attempt | Split into separate `op.execute()` calls |
| Postgres ENUM vs `Text` mismatch | First profile read | ORM enum columns use `SAEnum(name=..., create_type=False)` |
| SQLAlchemy UoW reorders DELETE-then-INSERT into INSERT-then-DELETE | Profile skills replace-set | Issue `await session.execute(delete(...))` + `await session.flush()` *before* adding new rows |
| Partitioned-table unique index missing partition key | `uq_message_reactions_per_user` | Index must include `message_created_at` |
| `ZoneInfo("America/Toronto")` fails on Windows | First scheduled-job test | Add `tzdata>=2024.2` to `pyproject.toml` |
| `EmailStr` import fails | First config load | Add `pydantic[email]` extras to `pyproject.toml` |

For the narrative version of how each one was found, see [`.docs/session-logs/2026-05-17-backend-bringup.md`](./.docs/session-logs/2026-05-17-backend-bringup.md).

---

## 8. Where to look for what

| If you need to know… | Look here |
|---|---|
| "Why is this code structured this way?" | The matching ADR in `.docs/decisions/` |
| "What endpoints exist and what do they return?" | `app/api/v1/*.py` (routes) → `app/schemas/*.py` (response models) → `/api/v1/docs` in dev |
| "What does the live schema look like?" | `backend/alembic/versions/0001-0009` are the source of truth; `.docs/06-erd.md` has the visual ERD |
| "How is auth wired end-to-end?" | `.docs/07-auth-flows.md`, then `app/auth/jwt.py` + `app/api/v1/auth.py` + `app/services/auth_bootstrap.py` |
| "How should the matching algorithm work?" | `.docs/08-matching-spec.md` (not yet implemented) |
| "What does the frontend currently assume?" | `.docs/02-frontend-inventory.md` + `.docs/03-mock-data-and-state.md` |
| "What's missing from the backend?" | `.docs/04-backend-gaps.md` and §5 above |
| "What happened during the bring-up session?" | `.docs/session-logs/2026-05-17-backend-bringup.md` |
| "How do I run / lint / test?" | `make help` from the repo root |
| "What conventions do I follow for IDs / timestamps / error shape?" | [ADR 0008](./.docs/decisions/0008-conventions.md) |

---

## 9. Things explicitly out of scope right now

Not "never," just "not on the path to the pilot." Don't get sidetracked.

- Real-time (Supabase Realtime channels for chat / group state) — schema is ready (messages/reactions partitioned), wiring is not.
- Notifications (in-app + email via Resend) — table exists in migration 0007, no producer/consumer yet.
- File uploads (profile photos, CSV archives) to Cloudflare R2 — vendor chosen in ADR 0003, no integration yet.
- Frontend refactor of `App.tsx` (4655 lines, single file). The backend endpoint surface is now complete enough to bind against (auth + profile + discovery + compatibility) — this is the next big block of work.
- Admin / TA dashboard endpoints beyond bootstrap.
- Production deploy to Railway. Currently the backend only runs locally and against the Supabase Free tier.

---

## 10. If something feels off

Before assuming the code is wrong:

1. Read the matching ADR. The decision is probably deliberate and the reason is recorded.
2. Read the session log section for that area.
3. If you're still convinced the decision was wrong, **write a new ADR that supersedes the old one** — don't silently change the code. Future-you (or the next handoff) needs the rationale.

---

## 11. Work log

Append-only running log of what was just done and what's actively in progress. Newest entry on top. One short bullet per session — link to commits or session-log files for detail.

- **2026-05-20** — **Stage 1 / Step C2-C7 — Frontend auth wiring (magic link end-to-end).** Real auth flow replaces the password-style prototype.
  - **`<AuthProvider>` is real now.** Tracks Supabase session + runs `apiAuth.bootstrap()` exactly once per session via tanstack-query (`staleTime: Infinity`, keyed on `["auth", "bootstrap"]`). Exposes `signIn(email)`, `signOut()`, `joinCourse(invite_code)`, `refreshBootstrap()`, plus `user` / `enrollments` / `isSessionLoading` / `isBootstrapLoading` / `bootstrapError`. Auth-state changes invalidate the bootstrap cache automatically.
  - **`MagicLinkRequest`** (new) replaces both `Login.tsx` (deleted) and the student branch of `SignupForm.tsx`. Single email field → `apiAuth.precheck(email)` → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: <origin>/auth/callback } })` → routes to `Verify` (now repurposed as "check your inbox", no fake "I've verified" button). `NOT_IN_ROSTER` is surfaced inline before any email is sent.
  - **`MagicLinkCallback`** (new) lives at `pg === "callback"`. Detected on first mount via `window.location.pathname.endsWith("/auth/callback")` so a deep link / refresh lands in the right place. Waits for the Supabase session, then for `bootstrap`; routes to `Join` if `enrollments.length === 0`, else `Dash`. 8s timeout shows "link expired" error so a stale link doesn't spin forever. URL is normalized via `history.replaceState` once we navigate away.
  - **`Join` page** wired to `joinCourse(invite_code)`. Inline copy for all three error codes (`INVITE_CODE_NOT_FOUND`, `NOT_IN_ROSTER`, `ALREADY_ENROLLED`). On `ALREADY_ENROLLED` we still flip the demo `hasJoinedCourse` flag and route to Dash after a short delay so the user isn't trapped. The two-step "look up → confirm" prototype is gone (look-up endpoint would leak invite→course mapping).
  - **`<Nav>`** reads `display_name` from auth context (falls back to the demo-bar `userName` shim). Avatar dropdown shows the name + a real Log Out that awaits `signOut()` then clears localStorage.
  - **App.tsx**: imports `useAuth`, syncs `display_name` + `primary_email` + `enrollments.length > 0` into the local-storage shim once bootstrap lands (keeps existing components that still read those values working). TA mock signup branch (`role === "t"`) keeps using the old `SignupForm`; student branch now goes through `MagicLinkRequest`.
  - **TODO carried forward to Step D:** wire `Step0Name` to call `apiAuth.updateMe(display_name)` on Next (endpoint exists, wrapper exists, just not called yet).
  - Typecheck + build clean. Lint shows the same 1 pre-existing error + 11 warnings as before — no regressions. Dev server boots and serves 200 at `/unitor-demo/`.
  - **Prereq the user completed:** filled `frontend/.env` (VITE_SUPABASE_URL/ANON_KEY/API_BASE_URL); set Supabase dashboard Site URL = `http://localhost:5173` and Redirect URLs include `http://localhost:5173/unitor-demo/auth/callback`.
- **2026-05-20** — **Stage 1 / Step C1 — Backend prep for auth wiring.** Backend-only changes that the frontend magic-link flow (C2-C7) will consume.
  - **Bootstrap behavior change (BREAKING):** `POST /api/v1/auth/bootstrap` no longer auto-enrolls anyone, even if their email is on a roster. It now just ensures the `public.users` row exists and returns the caller's existing enrollments. `RosterEmailNotFound` is gone; the only remaining error is `MissingEmailClaim` (defensive 401). `newly_enrolled_count` removed from the response. `services/auth_bootstrap.py` and the route updated together; `tests/unit/test_auth_routes.py` rewritten to match.
  - **New endpoint `POST /api/v1/auth/join`:** takes `{invite_code}`, validates the code against `courses.invite_code` (404 `INVITE_CODE_NOT_FOUND`), confirms the caller's email is on that course's roster (403 `NOT_IN_ROSTER`), refuses if already enrolled (409 `ALREADY_ENROLLED`), otherwise creates a single `enrollments` row with the TA-assigned `section_id` from the roster entry. Service in `app/services/auth_join.py`; route uses `admin_session` (legal under the existing allowlist: `app/api/v1/auth/` is already permitted — caller has no RLS visibility into the roster of a course they haven't joined yet, so RLS can't be the gate here).
  - **New endpoint `PATCH /api/v1/users/me`:** updates `public.users.display_name` so the profile wizard's step 0 can persist edits to the name Supabase signup seeded. Runs under `user_session`; **migration 0011** adds the `users_update_self` RLS policy (id = auth.uid()) so the database — not the route — enforces own-row-only. Migration applied to live Supabase (head = 0011).
  - **Schemas:** `JoinRequest`, `UserUpdateRequest` added to `schemas/auth.py`.
  - **Test count:** 53 → 65. All 65 unit tests pass; `ruff check` + `ruff format` + `mypy` clean. Frontend untouched in this step.
  - **Out of scope for this commit:** frontend wiring (C2-C7) — `AuthProvider` rewrite, `MagicLinkRequest`/`MagicLinkCallback`/`Join` pages, real-name display in `<Nav>`. Those need the user's `frontend/.env` filled and Supabase dashboard redirect URLs configured before they can be tested end-to-end.
- **2026-05-19** — **Stage 1 / Step B6 — Extract Discovery + groups + mock data. Step B complete.**
  App.tsx: **3471 → 1986 lines** (-43% on top of B1-B5; -57% overall from 4655). Pure refactor, no behavior change.
  - `lib/mock-data.ts` — STU, SS, COMPAT, PROFILE_TIERS, SCHEDULE_DATA, WORK_STYLE_DATA, CONTACT_STATUS_LABELS, FormingGroup, FORMING_GROUPS, parseActivityMinutes, isRecentlyActive.
  - `components/discovery/` — FilterDropdown, FormingStudentPanel, ReceivedRequestPanel, ProfilePanel (was ProfilePanelContent), DiscoveryPage (was Discovery).
  - `components/groups/` — GroupCard, GroupsView, GroupDetailPanel. Small scope expansion beyond the plan: these are used by both Discovery (in scope) and App.tsx top level via SlidePanel, so keeping them in App.tsx would have forced awkward back-imports. They form a coherent groups module.
  - Commit `71a04c2`. Typecheck + lint (new files) + build clean. One pre-existing `react-hooks/set-state-in-effect` warning in DiscoveryPage.tsx is suppressed inline with a TODO to fix in step E.
  - App.tsx is now: router + out-of-scope pages (MyGroup, ChatsPage, Urgent, TADash*, TACreate, ApplicationCard, Sent) + their exclusive mock data (DEMO_CONVERSATIONS, DEMO_NOTIFICATIONS, MOCK_REPLIES, DEADLINE_CONFIG). **Step B complete — Step C (auth wiring) is next.**
- **2026-05-19** — **Stage 1 / Step B1-B5 — App.tsx component split (in-scope pages).**
  App.tsx: **4655 → 3471 lines** (-25%). Pure refactor, no behavior change. Five substeps, one commit each:
  - **B1** (`2c95eaf`) shared building blocks: `hooks/{useLocalStorage,useToasts}.ts`, `lib/{storage,avatar}.ts`, `types/ui.ts`, `components/shared/{icons,Toast,StudentAvatar,FormField,ScheduleGrid,ConfirmDialog,SlidePanel,NotificationBell,Nav,nav-config}.tsx`. Renames: `F`→`FormField`, `TGrid`→`ScheduleGrid`.
  - **B2+B3** (`4fc0b60`) `components/landing/Landing.tsx`, `components/auth/{SignupRole,SignupForm,Verify,Login}.tsx`.
  - **B4** (`bcfe0c9`) `components/dashboard/{DashEmpty,Dash,Join}.tsx`.
  - **B5** (`e9714bc`) `components/profile/steps/Step{0..3}*.tsx`, `components/profile/{ProfileDone,ProfileEdit}.tsx`.
  Still in App.tsx (out of scope for stage 1): MyGroup, ChatsPage, Urgent, TADash*, TACreate, GroupCard/View/DetailPanel, Sent, ApplicationCard, plus all mock-data constants (STU, COMPAT, SS, SCHEDULE_DATA, WORK_STYLE_DATA, FORMING_GROUPS, DEMO_*). Discovery extraction (**B6**) deferred — needs to also move the mock data to `lib/mock-data.ts` since both Discovery and the still-in-place MyGroup depend on it.
  Each substep was typecheck-clean + lint-clean (new files) + build-clean. **Pre-existing eslint errors in the prototype's leftover App.tsx code** (cascading `setState` in effects, etc.) intentionally not fixed — they'll be addressed when each page is refactored in step C onward. Plan: [`.docs/frontend-stage1-plan.md`](./.docs/frontend-stage1-plan.md).
- **2026-05-18** — **Stage 1 / Step A — Frontend foundation (no behavior change).**
  - `npm i @supabase/supabase-js @tanstack/react-query react-router-dom` (frontend/package.json).
  - `frontend/.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`. **`frontend/.env` is required before `npm run dev`** — copy from `.env.example` and fill with the Supabase project's URL + anon key (same project as `backend/.env`).
  - `src/supabase/client.ts` — Supabase singleton.
  - `src/api/client.ts` — `apiFetch` + typed `ApiError` (parses the ADR-0008 error envelope; routes 422s through `VALIDATION_ERROR`).
  - `src/api/{auth,profile,discovery,compatibility,courses}.ts` — hand-typed wrappers for every endpoint stage 1 needs (some courses/* endpoints don't exist on the backend yet — added in step D).
  - `src/types/api.ts` — mirrors backend Pydantic shapes. Replace with generated types in stage 2.
  - `src/context/AuthContext.tsx` + `auth-context.ts` — stub auth provider; only exposes Supabase session + `isAuthenticated`. Real shape (user + enrollments + signIn/Out/joinCourse) lands in step C.
  - `src/main.tsx` wrapped in `QueryClientProvider` + `BrowserRouter` (basename driven by `BASE_URL` so the `/unitor-demo/` GH-Pages prefix still works) + `AuthProvider`.
  - Plan: [`.docs/frontend-stage1-plan.md`](./.docs/frontend-stage1-plan.md). Step B next.
- **2026-05-18** — **Task F shipped: compatibility matching algorithm + `POST /api/v1/compatibility/batch`.**
  - Pure scoring service `app/services/compatibility.py` implementing spec §3-6 (schedule / skill / work-style sub-scores + weighted overall). `CURRENT_ALGORITHM_VERSION = 1`.
  - Schemas `app/schemas/compatibility.py` (batch request/response + `SkillCoverageEntry` + `SkippedTarget`).
  - Route `app/api/v1/compatibility.py` wired in `main.py`. Returns `PROFILE_INCOMPLETE` (400) for viewers without a complete profile; lists targets without a profile in `skipped` rather than failing the batch.
  - ORM model `app/db/models/compatibility.py` (`CompatibilityCache`) + re-export from `app/db/models/__init__.py`.
  - **Migration 0010** applied to live Supabase: viewer-own INSERT/UPDATE policies on `compatibility_cache`, and Postgres triggers on `profiles` / `profile_skills` / `profile_schedule_slots` that NULL `computed_at` on related cache rows. Cache invalidation is now server-side; no app-code wiring needed.
  - 16 new unit tests (53 total). Five of the six spec §10 test vectors land in the expected tier; test 5 (group full coverage) asserts the warning fires but documents that the literal formula scores higher than the spec's "<60" prose expectation — flagged as a weight tune-up candidate.
  - **Known divergences from spec (documented in test module):** the §5 skill formula clamps high for "fully complementary" pairs (spec ≈95, actual 100) and low for "identical pairs" (spec ≈60, actual 50). Both are within tier; bump weights + algorithm version together when tuning.
  - **Open follow-up:** group-skill invalidation trigger when group join/leave endpoints land (spec §9 second bullet) — schema is ready, no producer yet.
- **2026-05-18** — Branch-per-feature policy retired; commit directly to `main` from here on, with progress tracked in this section.
- **2026-05-17** — Backend bring-up: 10 ADRs locked in, 9 Alembic migrations applied to live Supabase, auth bootstrap + profile CRUD + discovery read endpoints shipped, two senior audits absorbed, CI added. Detail: [`.docs/session-logs/2026-05-17-backend-bringup.md`](./.docs/session-logs/2026-05-17-backend-bringup.md).

Welcome aboard.
