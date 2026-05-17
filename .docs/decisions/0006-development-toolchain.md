# ADR 0006 — Development toolchain, migrations, OpenAPI flow

- **Status:** Accepted
- **Date:** 2026-05-16
- **Supersedes:** —
- **Superseded by:** —

## Context

The stack ([ADR 0002](./0002-backend-stack.md)) and layout ([ADR 0005](./0005-repo-structure.md)) are locked. We now pick the day-one development toolchain so we don't accumulate inconsistent choices that become migration debt.

The principles: **typed everywhere we can be, generated where humans don't add value, tested where regressions are silent.**

## Decision

### Backend (Python / FastAPI)

| Concern | Tool | Justification |
|---|---|---|
| Language | **Python 3.12** | Async maturity, type system improvements. Avoid 3.13 until ecosystem catches up. |
| Web framework | **FastAPI** ≥0.115 | Async-first, Pydantic integration, OpenAPI generation. |
| Validation / schemas | **Pydantic v2** | Default with FastAPI. 5–10× faster than v1. |
| ORM | **SQLAlchemy 2.0** (async) | Mature, well-tested async support, migration tooling. |
| DB driver | **asyncpg** | Fastest Postgres async driver for Python. **Configure with `prepared_statement_cache_size=0` and `statement_cache_size=0`** when connecting through Supavisor transaction-mode pooler (see "Connection topology" below). |
| Connection pooler | **Supavisor (transaction mode)** | Provided by Supabase on all tiers. Runtime traffic connects via port 6543. Migrations use direct port 5432. Added per [ADR 0009](./0009-audit-corrections.md) §6. |
| Migrations | **Alembic** | Mature, integrates with SQLAlchemy. **Sole source of truth for schema.** Runs against the direct (port 5432) connection, not the pooler. |
| JWT verification | **PyJWT** | Standard library for JWT in Python. Actively maintained. (Previously considered `python-jose` — rejected due to known maintenance issues.) |
| HTTP client (server→server) | **httpx** | Async, same project as Starlette/FastAPI. |
| Settings / config | **pydantic-settings** | Type-safe env var loading. |
| Background scheduling (prod) | **pg_cron** (Postgres extension on Supabase Pro) | Triggers via HTTP call to FastAPI endpoints. |
| Background scheduling (free tier / dev) | **GitHub Actions cron** → curl to FastAPI | Fallback while we're on Supabase Free. |
| Dependency manager | **uv** (Astral) | 10–100× faster than pip/poetry, lockfile-first. |
| Linter | **ruff check** | One tool replaces flake8 + isort + many plugins. Already in `CLAUDE.md` rule. |
| Formatter | **ruff format** | Same. |
| Type checker | **mypy** (strict mode) | Defense against `Any`-leaking through the codebase. |
| Testing | **pytest** + **pytest-asyncio** | Industry standard. |
| HTTP test client | **httpx** with FastAPI's `TestClient` or `AsyncClient` | Hits real ASGI app. |
| Test DB | **`supabase start` (Supabase CLI's local Docker stack)** for integration tests | Vanilla Postgres lacks `auth.uid()`, `auth.users`, and the auth schema our RLS policies depend on. Supabase CLI gives a real Supabase environment locally. Unit tests that don't touch DB still use plain pytest. Updated per [ADR 0009](./0009-audit-corrections.md) §8. |
| Logging | **structlog** with JSON output | Greppable in Railway/Fly. |
| Error tracking | **sentry-sdk** | Both backend and frontend. |
| Rate limiting (later) | **slowapi** | Add when public endpoints become exposed. |

### Frontend (React / Vite)

| Concern | Tool | Justification |
|---|---|---|
| Framework | **React 19** (already in use) | Keep. |
| Build | **Vite 7** (already in use) | Keep. |
| Routing | **React Router v7** | Mature, file-based routing optional, type-safe loaders. (Alternative: TanStack Router — slightly newer, also good.) |
| Server state | **TanStack Query v5** | Caching, retries, optimistic updates. Pairs naturally with REST. |
| Forms | **React Hook Form** + **Zod** resolver | Type-safe forms with schema validation. |
| Runtime validation | **Zod** | Validate API responses at the boundary. |
| Supabase SDK | **@supabase/supabase-js** v2 | Direct CRUD + Realtime. |
| Date/time | **date-fns** | Tree-shakeable, replaces moment/dayjs. |
| Linter | **ESLint** flat config | Resolve the missing `eslint.config.js` issue noted in `./README.md`. |
| Formatter | **Prettier** | Standard. |
| Type checker | **tsc --noEmit** | Already wired via `tsconfig.app.json`. |
| Testing | **Vitest** + **@testing-library/react** + **MSW** | Vitest aligns with Vite. MSW mocks API in unit tests. |
| E2E (later) | **Playwright** | When user flows stabilize. |

### Type sharing flow

The frontend never hand-writes API request/response types.

1. FastAPI auto-generates `openapi.json` from route signatures.
2. CI runs `npx openapi-typescript backend/openapi.json -o packages/api-types/src/generated.ts`.
3. The generated file is **committed** to the repo (so frontend builds don't depend on running backend tooling).
4. CI fails if a developer changed the API but forgot to regenerate.
5. Frontend imports types via `import type { paths, components } from "@unitor/api-types"` and wraps them in TanStack Query hooks.

Upgrade path: when generated fetchers/hooks become valuable, swap `openapi-typescript` for **orval** (generates TanStack Query hooks directly).

### Migrations rule (the most important rule in this document)

**Every schema change is an Alembic migration in `backend/alembic/versions/`. No exceptions.**

- No SQL run from the Supabase dashboard SQL editor against any environment other than a throwaway local DB.
- The Supabase project does not have a separate "migrations" workflow we use. Alembic is canonical.
- The Supabase CLI's migrations folder, if used at all, is a read-only mirror generated from Alembic state. We do **not** maintain it by hand.
- CI runs `alembic upgrade head` against a fresh Postgres container on every PR. If it fails, the PR fails.

This rule, on its own, prevents the single most common multi-environment incident (dev/staging/prod schemas drifting silently).

### Connection topology (added per [ADR 0009](./0009-audit-corrections.md) §6)

The backend uses **two** Postgres connection strings, both pointing at the same Supabase project but at different ports.

| Env var | URL pattern | Used by | Reason |
|---|---|---|---|
| `DATABASE_URL` | `postgres://...supabase.co:6543/postgres?pgbouncer=true` | Runtime FastAPI (request handling) | Supavisor transaction-mode pooler. Lets us scale way past the instance's raw `max_connections` limit (60 on Pro). |
| `DATABASE_DIRECT_URL` | `postgres://...supabase.co:5432/postgres` | Alembic migrations only | Migrations need session-level state (advisory locks, CREATE INDEX CONCURRENTLY, etc.) that transaction-mode pooling breaks. |

SQLAlchemy/asyncpg connection options for the pooled URL:

```python
create_async_engine(
    DATABASE_URL,
    connect_args={
        "prepared_statement_cache_size": 0,  # transaction mode incompatibility
        "statement_cache_size": 0,
    },
    pool_size=10,           # per FastAPI worker
    max_overflow=10,
    pool_pre_ping=True,
)
```

If the symptoms `prepared statement "pgstmt_XXX" already exists` appear in production logs, those two `0` flags are the culprit.

### CORS

- FastAPI allows specific origins only: the Vercel production domain, Vercel preview URL pattern (`*.vercel.app`), and `localhost:5173` for dev.
- No `Access-Control-Allow-Origin: *`.
- JWT in `Authorization` header; CORS `credentials: false`. No cookies involved.

### Logging and error reporting

- Backend: `structlog` configured to emit JSON in production, pretty-printed in dev. Sentry catches uncaught exceptions and `logger.error`-level logs.
- Frontend: `console.error` for dev, Sentry for prod. Source maps uploaded on build.
- PII: Sentry's `beforeSend` hook redacts email addresses, user names, message bodies before transmission.

### API conventions

- All endpoints under `/api/v1/`.
- Errors return `{ "code": "GROUP_FULL", "message": "Group is at capacity", "details": { ... } }`. The `code` is stable; the `message` is for humans; the `details` are optional.
- Pagination: cursor-based, never page-number. Responses include `next_cursor` (null when exhausted).
- Timestamps: ISO 8601 UTC strings. The frontend formats for display.
- IDs: UUIDv7 if we can (time-orderable). Otherwise UUIDv4. Never auto-increment integers (leaks volume).

## Alternatives considered

| Option | Rejected because |
|---|---|
| **Poetry / pip-tools / pdm** instead of uv | uv is materially faster, has a single lockfile (`uv.lock`), and is now stable. |
| **SQLModel** instead of SQLAlchemy 2.0 | Pleasant but combines ORM and serialization in ways that can confuse later. SQLAlchemy 2.0 alone is the safer long-term bet. |
| **Pure asyncpg with hand-written queries** | Saves the ORM abstraction tax but trades it for hand-written migrations and join logic. Not worth it at our scale. |
| **TanStack Router** instead of React Router v7 | Excellent and arguably better DX, but smaller community. RR7 is still the safer default. Either is fine. |
| **Redux / Zustand for server state** | Server state is not client state. TanStack Query owns this. Local UI state can use Zustand if we ever need it; today `useState` is enough. |
| **Jest** instead of Vitest | Vitest aligns with Vite and is faster. |
| **Drizzle** (TS ORM) | We're not in TypeScript on the backend. |
| **GraphQL** | Overkill for a small REST surface. Adds tooling cost without buying anything we need. |

## Consequences

**Positive:**

- All major boundaries (DB ↔ backend, backend ↔ frontend, frontend forms ↔ frontend state) are type-checked.
- Migration discipline is enforceable in CI from day one.
- No tool in this list is a niche choice; replacements exist if any of them disappoint.

**Negative / things to watch:**

- Strict typing slows the first few weeks. Pays back many times over. Don't relax it.
- Generated `generated.ts` shows up in PR diffs. Trust the tool; review only the source changes.
- `testcontainers` is heavier than mocking. Worth it because RLS bugs are invisible to a mocked DB.

## Implementation rules

1. **`ruff check && ruff format && mypy && pytest` must pass before any merge.** Plus on the frontend: `eslint && tsc --noEmit && vitest run`.
2. **Alembic migrations are immutable once merged.** A bug in a migration is fixed with a new migration, not by editing an old one.
3. **No hand-written types for API requests/responses on the frontend.** Use the generated types.
4. **`Any` is a code smell.** PRs that add it should explain why in a comment.
5. **Tests live next to code** (`backend/app/services/compatibility.py` ↔ `backend/tests/unit/services/test_compatibility.py`).
