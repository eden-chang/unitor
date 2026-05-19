# Session log — 2026-05-17 — Backend bring-up

This log is a chronological narrative of a single working session that took the repository from "frontend-only CSC318 prototype with no backend code" to "FastAPI service with auth bootstrap, profile CRUD, and discovery read endpoints, all running against a live Supabase Free-tier project, with CI and 37 passing tests."

It is intentionally written in retrospect so the next contributor can understand *why* the code looks the way it does, not just *what* is there. For *what is currently in the tree*, read [`../../HANDOFF.md`](../../HANDOFF.md) — this file complements that one.

Branches merged today (in order):
1. `chore/repo-bootstrap` → split into monorepo + commit the `.docs/` planning corpus.
2. `feat/backend-bootstrap` → FastAPI skeleton + 8 Alembic migrations + auth bootstrap endpoints.
3. `fix/rls-recursion-and-uuid` → break the enrollments-policy recursion, switch to stdlib `uuid.UUID`.
4. `feat/profile-crud` → `/api/v1/profile` endpoints with replace-set semantics.
5. `fix/second-audit` → transaction lifecycle, CORS regex, JWT hardening, Sentry PII scrubber, secrets, CI.
6. `feat/discovery-read` → `/api/v1/courses/{id}/students` + `/groups`, cursor pagination.

All commits are authored as `eden-chang <eden.chang27@gmail.com>` with no `Co-Authored-By` line, per the user's explicit instruction.

---

## Phase 1 — Take stock of the prototype and stage the docs

Going in, the repo had:
- A working frontend prototype (`App.tsx` ≈ 4655 lines) covering the full Discovery → Group flow with hardcoded data and `localStorage` persistence.
- A `.docs/` folder with several Korean-language phase plans (`phase-1` … `phase-z`) describing how the frontend prototype had been built.
- No backend code, no migrations, no database, no CI.

First moves:
- Archived the Korean phase plans under `.docs/archive/frontend-phases/` so they remain traceable but stop competing for attention with current planning docs.
- Wrote five English-language current-state documents:
  - `01-current-state.md` — what runs today and how to run it.
  - `02-frontend-inventory.md` — page/component-level inventory of the prototype.
  - `03-mock-data-and-state.md` — where data lives (constants, `localStorage`) and where simulated behaviors hide (auto-replies, timed callbacks).
  - `04-backend-gaps.md` — the gap analysis: every backend capability the frontend assumes but does not have.
  - `05-planning-targets.md` — bird's-eye plan with sections that would later be marked "decided" as ADRs landed.

The point of writing these *before* deciding architecture was to make sure the prototype's actual assumptions (not its aspirations) drove the design.

## Phase 2 — Lock the architecture in ADRs

Rather than scatter decisions across chat and PR descriptions, every architectural choice was written as an Architecture Decision Record under `.docs/decisions/`. Each ADR is short, declarative, lists alternatives, and ends with "if we change our minds, write a new ADR that supersedes this one."

ADRs landed in this session:

| # | Title | Core decision |
|---|---|---|
| 0001 | Multi-tenancy | Single Postgres + Row-Level Security. One schema serves every university. |
| 0002 | Backend stack | Supabase (Auth + Postgres + Realtime) + FastAPI hybrid. Supabase handles direct CRUD; FastAPI handles matching, bootstrap, roster ingest, scheduled jobs. |
| 0003 | Infrastructure | Vercel (frontend), Railway (backend), Supabase Pro, Cloudflare R2, Sentry, Resend. |
| 0004 | Data strategy | Hot/cold split. Messages and reactions are co-partitioned monthly via pg_partman. Compatibility scores cached in `compatibility_scores` with idempotency keys. |
| 0005 | Repo structure | Monorepo: `frontend/`, `backend/`, `packages/api-types/`. |
| 0006 | Development toolchain | Python 3.12 + `uv` + SQLAlchemy 2.0 async + Alembic + ruff + mypy strict + pytest. **Migrations are canonical — never apply SQL via the Supabase dashboard.** |
| 0007 | Domain modeling | Profile is per-user (not per-course), one university per user, roster CSV is TA-side and feeds `roster_entry` (not directly into `enrollments`). Group leader is a `group_memberships` row with `role='leader'` and `left_at IS NULL`, enforced by a partial unique index. |
| 0008 | Conventions | UUIDv7 IDs everywhere, `TIMESTAMP WITH TIME ZONE` only, error envelope shape, soft-delete columns, snake_case in DB / camelCase in API. |
| 0009 | First senior audit | Recorded the audit pass and the corrections (hybrid `user_session` / `admin_session`, partitioned-table FK fix, JWT verification, RLS test strategy with `supabase start`). |
| 0010 | Second senior audit | Recorded the second audit pass and its corrections (transaction lifecycle, CORS regex, secrets via `SecretStr`, Sentry PII scrubber, JWT required-claims, structlog request-ID binding, CI workflow). |

The two audit ADRs (0009 and 0010) are where the *real* operational hardening lives. They look like "amendments" but in practice they are the most important documents in the folder for a future operator.

## Phase 3 — Monorepo split

Up to this point everything lived at the repo root. Per ADR 0005, the tree was reorganized into:

```
unitor/
├── frontend/             # The original Vite + React 19 + Tailwind 4 prototype
├── backend/              # New FastAPI service
├── packages/api-types/   # Placeholder — TS types regenerated from backend OpenAPI
└── .docs/                # ADRs + specs + this session log
```

The frontend was moved as-is (no content changes). The original root-level `package.json`, `vite.config.ts`, etc. were carried into `frontend/`. The `.github/workflows/deploy.yml` GitHub Pages workflow was updated to build from `frontend/`.

## Phase 4 — Supabase project + connection string archaeology

The user created a Supabase Free-tier project at `zwtsofwlomiwqtpxdppy.supabase.co` and pasted a connection string template with a `[YOUR-PASSWORD]` placeholder. From there:

- Password contained `@@`; that needed URL-encoding to `%40%40` before it could live in `DATABASE_URL`/`DATABASE_DIRECT_URL`.
- The region was *not* `us-east-1` as initially guessed from the IPv6 prefix `2600:1f16:c40:`. After a brute-force pooler-host probe, the actual cluster was `aws-1-us-east-2.pooler.supabase.com` — note `aws-1-`, not `aws-0-`.
- `DATABASE_URL` (port 6543, Supavisor pooler in *transaction* mode) is used by the app; `DATABASE_DIRECT_URL` (port 5432, direct) is used by Alembic because migrations need session-level state.

`.env` lives in `backend/.env` and is gitignored. `.env.example` was committed with placeholder values. **Secrets are never re-pasted into chat or commits.**

## Phase 5 — Schema as 8 migrations, then a 9th to fix RLS recursion

Migrations were written from the ERD in `.docs/06-erd.md`. Final state on `main` is **head = 0009**:

| # | What it does |
|---|---|
| 0001 | Postgres extensions (`pgcrypto`, optional `pg_uuidv7`), enums (`course_state`, `enrollment_role`, `group_state`, `group_member_role`, `request_kind`, `app_status`, `delivery_state`, `notification_kind`, `audit_event`). |
| 0002 | Core tables: `universities`, `courses`, `sections`, `course_skills`, `users`, `enrollments`, `roster_entry`. RLS enabled. |
| 0003 | Profile tables: `profiles`, `profile_skills`, `profile_schedule_slots`, `profile_links`. |
| 0004 | Group tables: `groups`, `group_memberships` (partial unique index for one leader per group), `group_application_questions`. |
| 0005 | Request/application tables: `group_requests`, `group_applications`, `application_responses`. |
| 0006 | Conversations + messages, both partitioned monthly via pg_partman. **`message_reactions` is co-partitioned on `message_created_at`** so foreign keys to a partitioned parent are legal; the unique index `uq_message_reactions_per_user` must include the partition key. |
| 0007 | Notifications + `compatibility_scores` cache + audit log. |
| 0008 | `ta_allowlist` for TA bootstrap (not wired yet — task B-1.5). |
| 0009 | RLS recursion fix (see below). |

### The RLS recursion incident

Initial `enrollments` policy:

```sql
USING (
  user_id = auth.uid()
  OR course_id IN (SELECT course_id FROM enrollments WHERE user_id = auth.uid() ...)
)
```

The `SELECT ... FROM enrollments` inside the policy re-triggers the same policy → infinite recursion → every user-session query against `enrollments` returned `42P17 infinite recursion`. This blew up the very first `GET /api/v1/auth/precheck` against the live DB.

Fix: migration 0009 defines a `SECURITY DEFINER` helper that bypasses RLS *just for the lookup*:

```sql
CREATE OR REPLACE FUNCTION public.my_course_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT course_id FROM public.enrollments
  WHERE user_id = auth.uid() AND deleted_at IS NULL
$$;
```

The policy now reads `course_id IN (SELECT public.my_course_ids())`. The helper runs as the function owner (bypasses RLS) but is `STABLE` and tied to `auth.uid()`, so it is still per-caller. Recorded in ADR 0009 §3.

### Other migration gotchas worth knowing

- **Optional extensions abort transactions.** `CREATE EXTENSION pg_uuidv7` fails on Free tier; once a transaction errors, every subsequent statement in the same migration step also fails. Fix: wrap the optional `CREATE EXTENSION` in `bind.begin_nested()` so the SAVEPOINT can roll back without poisoning the outer transaction.
- **asyncpg rejects multi-statement SQL.** `CREATE FUNCTION ...; DROP TRIGGER ...; CREATE TRIGGER ...;` in one `op.execute()` is rejected. Split into separate `op.execute()` calls.
- **configparser interpolation in `alembic.ini`.** The URL-encoded password contains `%40`, which `configparser` reads as a partial interpolation. Fix: don't push the URL through `alembic.ini` at all — read it directly from settings inside `alembic/env.py`.

### Enums vs ORM models

When `course_state` and friends were declared as Postgres `ENUM` types in migration 0001, but the ORM models used `Text`, Postgres rejected `WHERE course_state = 'active'` with a `varchar` mismatch error. Fix: each ORM enum column uses `SAEnum("a", "b", ..., name="course_state", create_type=False)`. `create_type=False` is critical — the enum already exists in the DB; we don't want Alembic to re-emit it.

## Phase 6 — FastAPI application skeleton

`backend/app/` was wired up:

- `main.py` — FastAPI app factory, lifespan hook, CORS middleware, request-ID middleware, four routers (`health`, `auth`, `profiles`, `discovery`).
- `config.py` — `pydantic-settings` based, all sensitive values are `SecretStr` (`DATABASE_URL`, `DATABASE_DIRECT_URL`, `SUPABASE_*_KEY`, `SUPABASE_JWT_SECRET`, `CRON_TOKEN`, `SENTRY_DSN`).
- `auth/jwt.py` — `PyJWT` verifier with audience + issuer + required-claims (`sub`, `exp`, `iat`, `iss`, `aud`).
- `db/session.py` — async session factory + the **two-mode** pattern (see Phase 8).
- `db/admin.py` — `admin_session` (service role, RLS bypassed). Importable only from `app/api/v1/admin/`, `app/api/v1/auth/`, `app/jobs/`.
- `observability.py` — structlog + Sentry init, `before_send` PII scrubber that redacts emails, JWTs, and keys named `email`/`bio`/`comm_handle`.
- `middleware/request_id.py` — reads or mints `X-Request-Id`, binds it to structlog contextvars and Sentry tag, echoes on the response.

## Phase 7 — Auth bootstrap endpoint

Pre-pilot, only students whose university email is on the `roster_entry` table are allowed to sign up. The flow is:

1. Student types email → frontend calls `POST /api/v1/auth/precheck` with `{email}`.
2. Backend checks `roster_entry`; returns `{eligible: true, sections: [...]}` or `{eligible: false}`.
3. If eligible, frontend triggers Supabase magic-link sign-in.
4. After magic-link redirect, frontend has a Supabase JWT. It calls `POST /api/v1/auth/bootstrap` with that JWT.
5. Backend verifies the JWT, finds the matching `roster_entry`, idempotently creates `users` and `enrollments` rows, returns `{user, enrollments}`.

UUIDv7 IDs come from `uuid_utils.compat.uuid7()` — note `compat`. The non-compat `uuid_utils.uuid7()` returns the `uuid_utils.UUID` class which Pydantic v2 rejects. `compat.uuid7()` returns a stdlib `uuid.UUID`.

## Phase 8 — The two-mode session pattern

The single most load-bearing piece of operational hardening in this session. Documented in ADR 0009 §2 (pattern) and ADR 0010 §1 (transaction lifecycle).

### `user_session(user)` — default for every user-facing endpoint

```python
@asynccontextmanager
async def user_session(user: CurrentUser) -> AsyncIterator[AsyncSession]:
    factory = _get_session_factory()
    async with factory() as session:
        async with session.begin():
            await _set_role(session, "authenticated")
            await _set_jwt_claims(session, user.jwt_claims_subset)
            yield session
```

Two non-obvious things:

1. **The session owns the transaction.** `async with session.begin()` enters a transaction; on context exit it commits (or rolls back on exception). Routes therefore *must not* call `await db.commit()` explicitly. An earlier draft did, and the bug latent in that draft is documented in ADR 0010 §1: `SET LOCAL ROLE authenticated` and `SET LOCAL "request.jwt.claims"` are scoped to the current transaction. A route-level commit would close that transaction and the *next* query in the same request would silently run as the connection's default role with empty JWT claims — which under RLS means "I see nothing" rather than a noisy error.
2. **`SET LOCAL ROLE authenticated`** activates Supabase's RLS policies (they are keyed off `auth.role()` and `auth.uid()`). Without this `SET LOCAL`, the session runs as whatever role the connection string used — typically `postgres` or `service_role` — and RLS is bypassed.

The `set_config('request.jwt.claims', ..., true)` push exposes the JWT to PL/pgSQL via `auth.uid()`, `auth.jwt()`, etc. The `true` second argument scopes it to the current transaction.

### `admin_session()` — service role, RLS bypassed

Used only by:
- `POST /api/v1/auth/bootstrap` (the user does not have a `users` row yet, so RLS would deny everything).
- Future cron jobs in `app/jobs/`.
- Future TA admin endpoints in `app/api/v1/admin/`.

A CI lint rule (planned, not yet enforced) will fail the build if `admin_session` is imported outside those three paths.

### FastAPI dependency wrappers

So routes don't have to manually `async with user_session(user) as db:`, two `Annotated` aliases live in `db/session.py`:

```python
CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
UserSessionDep = Annotated[AsyncSession, Depends(user_session_dep)]
```

Routes just declare `db: UserSessionDep, user: CurrentUserDep` and FastAPI wires the rest.

## Phase 9 — First senior audit (recorded in ADR 0009)

After Phase 8 the user asked for a "16-year-experience senior dev" pass. The audit found and fixed:

- **Partitioned-table foreign key constraint.** `message_reactions.message_id` referencing partitioned `messages` was illegal — needed to be co-partitioned with `message_created_at` and reference `(message_id, message_created_at)`.
- **JWT verification was too permissive.** Added audience check (`authenticated`), and pinned the verifier to Supabase's HS256 secret (no `verify=False` paths).
- **No RLS testing strategy.** Vanilla Postgres in tests lacks `auth.uid()` and `auth.users`, so RLS policies could not be exercised. Documented the rule: integration tests run against a `supabase start` local stack.
- **Service role import discipline.** `admin_session` may only live in three import sites (see Phase 8).
- **First-class request IDs.** `X-Request-Id` middleware bound to structlog + Sentry.

ADR 0009 is the record. Many of its "amendments" patch earlier ADRs (0001 / 0002 / 0003 / 0005 / 0006).

## Phase 10 — Profile CRUD (task D)

`POST/GET/PATCH/DELETE /api/v1/profile` plus:

- `PUT /api/v1/profile/skills` — replace-set of `profile_skills` rows.
- `PUT /api/v1/profile/schedule` — replace-set of `profile_schedule_slots` rows.

The replace-set methods had a subtle bug. The original implementation did:

```python
for row in old_rows: await session.delete(row)
for spec in new_specs: session.add(Profile...(...))
await session.flush()
```

SQLAlchemy's unit of work *reordered* this into INSERT-then-DELETE, which hit the `(profile_id, skill_id)` unique constraint. Fix: explicitly issue the DELETE and flush *before* adding new rows:

```python
await session.execute(delete(ProfileSkill).where(ProfileSkill.profile_id == profile_id))
await session.flush()
for spec in new_specs:
    session.add(ProfileSkill(...))
```

Documented in commit `25272a9`.

Profile completion (`profile.completed_at`) is set automatically when all four of `bio`, `comm_method`, `comm_handle`, and at least one `profile_skills` row exist. The check runs at the end of `create_profile`, `update_profile`, `replace_skills`. Documented as policy in ADR 0007 §3.

## Phase 11 — Second senior audit (recorded in ADR 0010)

User asked for a *second* "16-year senior" pass post-profile-CRUD. The audit found and fixed:

1. **Transaction lifecycle bug** — already described in Phase 8. Session helpers were refactored to own the transaction; routes stopped calling `commit()`. Marked **BREAKING** in commit `f5e9a85` because any future code that copies the old pattern would silently break RLS.
2. **CORS wildcards.** `https://*.vercel.app` was being passed to `allow_origins` (which is exact-match). Added `build_cors_origin_regex()` in `config.py` translating `*` → `[^.]+` and routing wildcards through `allow_origin_regex`.
3. **Secrets in plain `str`.** Sensitive `Settings` fields were promoted to `SecretStr`. Logging emits `**` for them automatically.
4. **JWT required claims.** Added `options={"require": ["sub", "exp", "iat", "iss", "aud"]}` and pinned issuer to `{SUPABASE_URL}/auth/v1`.
5. **Cron token timing attack.** `request.headers["X-Cron-Token"] == settings.CRON_TOKEN` replaced with `secrets.compare_digest(...)`.
6. **Sentry PII leakage.** `before_send` strips emails (regex), JWT-shaped tokens, and any dict key in `{"email", "bio", "comm_handle"}`.
7. **structlog context binding.** Request ID is bound at middleware entry and unbound on response so async tasks don't bleed IDs across requests.
8. **CI was missing.** Added `.github/workflows/backend.yml` running ruff check + ruff format check + mypy strict + pytest + an Alembic offline chain check (head reachable from base).
9. **Missing deps.** `pydantic[email]` (so `EmailStr` works) and `tzdata` (so `ZoneInfo("America/Toronto")` works on Windows) added to `pyproject.toml`.

The corresponding commit is `f5e9a85` (`fix(backend)!: harden session/auth/observability + add CI per ADR 0010`).

## Phase 12 — Discovery read endpoints (task E)

`feat/discovery-read` added two read endpoints:

- `GET /api/v1/courses/{course_id}/students` — People view feed. Filters by `section_id`, `skill_id`, `search` (ILIKE on display name), cursor pagination. Excludes the caller. Returns each classmate's public profile summary if onboarding is complete.
- `GET /api/v1/courses/{course_id}/groups` — Groups view feed. Filters by `section_id`, `recruiting_only`, `state` (multi-value), cursor pagination. Hydrates each group with its members (leader first) and application questions.

Operational notes:

- **Cursor pagination.** `_encode_cursor`/`_decode_cursor` in `services/discovery.py` round-trip a `(updated_at, id)` tuple through base64-encoded JSON. Stable under `ORDER BY updated_at DESC, id DESC` because both columns are non-null and the composite is unique.
- **No N+1.** Hydration is three batched queries (group rows → memberships for those groups → questions for those groups → users for those memberships), not one query per group.
- **RLS does the security work.** Routes use `UserSessionDep`, which means every query is already filtered by "rows in courses I'm enrolled in". The route layer adds business filters (section, skill, recruiting, state) *on top* of that, not in place of it.
- **PEP 695 generic syntax.** `_slice_page` uses `def _slice_page[T](...)` rather than the older `TypeVar` + `Generic` pattern, per ruff `UP047`.

The corresponding commit is `14fa127`.

## Phase 13 — Merge + docs (this branch)

After `feat/discovery-read` was merged to `main` via fast-forward and pushed, this branch (`docs/session-and-handoff`) was created to:

- Record this chronological narrative (you're reading it).
- Write a forward-looking `HANDOFF.md` at the repo root for whoever picks up next.

Neither doc adds any code or changes runtime behavior.

---

## Carry-forwards for the next session

A short list of things the next contributor should know on day one. The full version with file paths is in `../../HANDOFF.md`.

### Working agreements (preserved verbatim from the user)

- **All commits authored as `eden-chang <eden.chang27@gmail.com>`** using `git commit --author "eden-chang <eden.chang27@gmail.com>"`. **Do not modify global git config.** **No `Co-Authored-By` lines.**
- **All future work on feature branches**, never directly on `main`.
- **Secrets stay in `backend/.env`.** Never paste full secret values back into chat or commits.

### Things that exist but are not yet wired

- `ta_allowlist` table exists (migration 0008). TA bootstrap endpoints (task B-1.5) are not built.
- `compatibility_scores` table exists (migration 0007). The matching algorithm + `POST /api/v1/compatibility/batch` endpoint (task F) is not built. Discovery currently cannot sort by Best Match.
- `frontend/` is still the original CSC318 prototype. It is not wired to any backend endpoint yet (task C). Magic-link flow, real Discovery feed, real profile, real group flow all still talk to hardcoded data and `localStorage`.
- `packages/api-types/` is a placeholder. Once frontend starts consuming real endpoints, regenerating TS types from `backend/openapi.json` becomes part of the dev loop.

### Things that exist and are wired

- Auth bootstrap end-to-end against live Supabase.
- Profile CRUD end-to-end.
- Discovery read end-to-end (sort by recent activity; no Best Match yet).
- CI on every push to `main`: ruff check + ruff format check + mypy strict + pytest + Alembic chain check.
- 37 unit tests passing locally (`uv run pytest tests/unit/`).

### Operational gotchas to remember

- **Never apply SQL via the Supabase dashboard.** Migrations under `backend/alembic/versions/` are canonical. If you change schema there, the next `alembic upgrade head` will conflict.
- **Routes must not call `await db.commit()`.** The session helper owns the transaction. See Phase 8.
- **`admin_session` is restricted.** Only `app/api/v1/admin/`, `app/api/v1/auth/`, and `app/jobs/` may import it. A CI lint rule for this is planned but not enforced.
- **Use `uuid_utils.compat.uuid7()`**, not `uuid_utils.uuid7()`. The non-compat version returns a class Pydantic v2 rejects.
- **Free-tier Supabase** is the current backing DB. `pg_partman` and `pg_cron` work but you may want to verify against Pro before relying on scheduled jobs.

### Open follow-ups (not blocking next feature work)

- `slowapi` rate limiting on `/auth/precheck` (anti-enumeration) before the pilot.
- `selectinload` to batch profile children if the 3-query hydration shows up in profiling.
- OpenAPI → TypeScript types regeneration step in CI once `frontend/` starts consuming endpoints.
- Connection-pool warmup if first-request latency becomes a problem.
- Verify `pg_partman` / `pg_cron` behavior on Pro tier before the pilot.
