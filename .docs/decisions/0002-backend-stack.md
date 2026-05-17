# ADR 0002 — Backend stack: Supabase + FastAPI hybrid

- **Status:** Accepted
- **Date:** 2026-05-16
- **Supersedes:** —
- **Superseded by:** —

## Context

The frontend prototype (see `../02-frontend-inventory.md`) implies dozens of backend capabilities: identity, persistence, real-time chat, scheduled jobs, matching computation, CSV ingest, file uploads, notifications. We need a stack that:

- Ships an MVP fast (single small team, no dedicated DevOps).
- Lets us add domain logic (matching, deadline workflows) without contorting the framework.
- Doesn't lock us in to a vendor for the hard-to-rewrite parts (i.e., the business logic itself).
- Stays cheap at pilot scale (≤ $50/month) and remains affordable at 50k MAU.

## Decision

**Use Supabase for platform primitives and FastAPI (Python) for domain logic.**

### Division of responsibility

| Operation | Handled by | Why |
|---|---|---|
| Magic-link signup / login | Supabase Auth | Zero code. Handles email delivery, token issuance, session refresh, recovery. |
| Reading a course's students, groups, profiles | **Supabase direct** (PostgREST + RLS) | Trivially expressible as a single SQL query with row filtering. No backend code adds value. |
| Updating own profile | **Supabase direct** (PostgREST + RLS) | Single-table UPDATE, RLS enforces "own data only." |
| Sending a chat message | **Supabase direct** (INSERT) | Realtime broadcast happens automatically via Supabase Realtime subscription. |
| Subscribing to chat / notifications | Supabase Realtime channel | Built-in WebSocket transport. |
| Sending a group request | **FastAPI** | Multi-step: validate target's status, create request, dispatch notification, possibly create conversation. |
| Accepting an application / confirming a group | **FastAPI** | Transactional state machine with side effects. |
| Computing compatibility scores | **FastAPI** | Domain logic; uses Python's numerical ecosystem; results cached in DB. |
| Ingesting a CSV roster | **FastAPI** | Multi-stage flow: parse → validate → preview → commit. |
| Running scheduled jobs (deadline tiers, no-response timeout, provisional grouping) | **pg_cron → FastAPI endpoints** | Time-based work belongs server-side. pg_cron is Postgres-native (no extra infra). |
| Uploading a profile photo | **Cloudflare R2 directly** via signed URL minted by FastAPI | See [ADR 0003](./0003-infrastructure.md). |

Estimated request volume split: **~80% of authenticated calls go to Supabase directly, ~20% go through FastAPI.** FastAPI can therefore stay small.

### Authorization model — hybrid pattern (amended by [ADR 0009](./0009-audit-corrections.md) §2)

Two parallel security layers, **not one**:

1. **Frontend → Supabase**: Frontend uses Supabase anon key + the user's JWT. Postgres RLS policies decide which rows the user can read/write. This is the front line of defense for direct CRUD.
2. **Frontend → FastAPI**: Frontend sends the same Supabase JWT in an `Authorization: Bearer …` header. FastAPI verifies the JWT signature (HS256, Supabase JWT secret) and extracts `sub` + claims. FastAPI then opens a Postgres connection in one of two modes depending on the endpoint.

#### Two FastAPI session modes

**(A) `user_session` — used by all user-facing endpoints (default).**

The Postgres session is set to the `authenticated` role with the user's JWT claims pushed into a session variable so RLS policies see the same `auth.uid()` they would see for a direct frontend call. **RLS applies inside FastAPI.** App code still does business-rule checks (leader-only, etc.), but tenancy bugs are blocked by the database itself.

```python
# app/db/session.py (sketch)
async def user_session(current_user: CurrentUser) -> AsyncSession:
    async with engine.connect() as conn:
        await conn.execute(text("SET LOCAL ROLE authenticated"))
        await conn.execute(
            text("SELECT set_config('request.jwt.claims', :claims, true)"),
            {"claims": json.dumps(current_user.jwt_claims_subset)},
        )
        yield AsyncSession(bind=conn, expire_on_commit=False)
```

**(B) `admin_session` — used only by cron, bootstrap, admin, system operations.**

Uses the service role key, bypasses RLS. Each endpoint that needs it imports it from `app/db/admin.py`. Lint rule: `admin_session` may only be imported by files under `app/api/v1/admin/`, `app/api/v1/auth/`, or `app/jobs/`. CI enforces this.

#### Why two modes instead of one

- `user_session` everywhere is impossible: bootstrap (creating the first `users` row before any enrollments exist), cron jobs (no logged-in user), and TA cross-student operations all need broader access.
- `admin_session` everywhere is what the original ADR said. The audit ([ADR 0009](./0009-audit-corrections.md) §2) flagged this as risky — a missed `WHERE` clause in any of ~40 endpoints leaks tenant data.
- Splitting them surface-level lets RLS be the floor for user-facing traffic while still allowing the admin ops we need.

The trade-off: small per-request overhead for `SET LOCAL ROLE` + `set_config`. Negligible (sub-millisecond).

### Backend framework: FastAPI

- **Async by default**, matches Postgres async drivers.
- **Pydantic v2** validation gives clean request/response models.
- **OpenAPI auto-generated** from the route signatures.
- **Mature ecosystem** for the domain operations we need (numpy/scipy for matching, pandas for CSV parsing if needed).

### Backend language: Python 3.12

- Picked over Node.js/TypeScript despite the appeal of frontend-backend type sharing, because the matching algorithm and any future statistical/ML work lean toward Python's strengths.
- Picked over Ruby/Rails because Realtime/Auth would be additional work that Supabase already owns.

## Alternatives considered

| Option | Rejected because |
|---|---|
| **Supabase Edge Functions only** (no FastAPI) | Edge Functions are Deno/TypeScript. Limited library ecosystem. Cold starts. Difficult to test matching code; debugging complex flows is painful. Vendor lock-in deepens. |
| **Node.js (Hono, Fastify, NestJS) instead of FastAPI** | TypeScript-everywhere is attractive (could use tRPC for end-to-end types), but we lose Python's analytical libraries for matching. Net negative for this product. |
| **Rails (with custom Realtime + Auth)** | Mature ORM and conventions, but we'd be rebuilding what Supabase gives for free. Realtime in Rails (ActionCable) is fine but ops-heavier than Supabase Realtime. |
| **Django + DRF** | DRF is heavier than FastAPI and async support is a retrofit. Admin UI not worth it because the TA dashboard is the React frontend. |
| **No backend service at all — pure Postgres + functions** | Possible but matching logic in PL/pgSQL or PL/Python is untestable in isolation and slow to iterate. |
| **Next.js full-stack API routes** | Couples frontend and backend deployments. Vercel function execution limits (memory, time) constrain matching/CSV jobs. Hard to evolve toward a separate mobile client later. |

## Consequences

**Positive:**

- The high-value, hard-to-rewrite domain logic lives in our code (FastAPI), in a portable language.
- The high-toil, low-differentiation work (auth, websocket transport, file storage SDK) is bought, not built.
- Two small surfaces are simpler than one big one, when the surfaces are at clean boundaries.

**Negative / things to watch:**

- We must operate two services (Supabase + FastAPI). Both have managed hosting, but it's still two dashboards.
- The 80/20 split means changes sometimes need to touch both sides. Keep them in the same monorepo (see [ADR 0005](./0005-repo-structure.md)) so PRs cover both.
- The "FastAPI uses service role" pattern is powerful and **must not be exposed to the frontend**. Mitigation: secret hygiene, code review, never log the key.

## Implementation rules

1. **Decision rule for "Supabase direct vs FastAPI"**: if the operation is a single table read/write that maps cleanly to SQL with RLS, go through Supabase. If it requires multi-step orchestration, business validation beyond schema, or external calls, go through FastAPI. **When in doubt, FastAPI** — it's easier to move it down to Supabase later than to extract it up to FastAPI.
2. **JWT verification lives in exactly one place**: a FastAPI dependency that returns the current user. No other code parses tokens.
3. **`user_session` is the default**. `admin_session` is opt-in per endpoint and only legal under specific module paths. See "Authorization model" section above.
4. **Service role key never leaves backend env vars**. Frontend bundles must not contain it.
5. **FastAPI is stateless**. Anything that needs to live across requests goes in Postgres or Realtime channels, not in process memory.
