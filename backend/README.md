# Unitor — Backend

FastAPI service handling matching, roster ingest, group lifecycle, and scheduled jobs. Companion to the React frontend in `../frontend/`.

> The high-level architecture lives in [`../.docs/decisions/`](../.docs/decisions/). Start with [ADR 0002](../.docs/decisions/0002-backend-stack.md) (responsibility split between Supabase and this service), [ADR 0006](../.docs/decisions/0006-development-toolchain.md) (toolchain), and [ADR 0009](../.docs/decisions/0009-audit-corrections.md) (the audit corrections, including the hybrid `user_session` / `admin_session` pattern).

## Prerequisites

- Python 3.12 (`.python-version` pins this).
- [`uv`](https://docs.astral.sh/uv/) for dependency and venv management.
- Docker (for `supabase start` — the local Supabase stack used by integration tests).
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for `supabase start`).

## Local setup

```bash
cd backend

# Create a venv and install both runtime and dev deps.
uv sync --all-groups

# Copy and fill in env vars (gitignored).
cp .env.example .env
```

Required env vars for local boot (see `.env.example` for the full list):
- `DATABASE_URL` — Supavisor pooler URL (port 6543).
- `DATABASE_DIRECT_URL` — direct URL (port 5432). Used by Alembic.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.
- `CRON_TOKEN`.

## Running

```bash
# Dev server with auto-reload.
uv run uvicorn app.main:app --reload --port 8000

# Health check.
curl http://localhost:8000/api/v1/health
# → {"status":"ok"}

# OpenAPI docs (dev only — disabled in prod).
open http://localhost:8000/api/v1/docs
```

## Tests

```bash
# Unit tests — no external dependencies.
uv run pytest tests/unit/

# Integration tests — require a local Supabase stack running.
supabase start                    # in a separate terminal, once
uv run pytest tests/integration/  # uses the local Supabase Postgres + auth schema
```

See [ADR 0009 §8](../.docs/decisions/0009-audit-corrections.md) for why integration tests must run against `supabase start` rather than a vanilla Postgres container (vanilla Postgres lacks `auth.uid()` and `auth.users`).

## Migrations

**The Alembic migrations under `alembic/versions/` are the canonical schema source.** Never apply SQL via the Supabase dashboard. See [ADR 0006](../.docs/decisions/0006-development-toolchain.md) "Migrations rule".

```bash
# Generate a new migration after model changes.
uv run alembic revision --autogenerate -m "add foo column"

# Apply migrations to the local DB.
uv run alembic upgrade head

# Roll back one migration.
uv run alembic downgrade -1
```

Migrations connect via `DATABASE_DIRECT_URL` (port 5432), not the pooler — they need session-level state.

## Lint, format, typecheck

```bash
uv run ruff check .
uv run ruff format .
uv run mypy app/
```

## Module layout

```
app/
├── main.py            # FastAPI app factory
├── config.py          # Settings (pydantic-settings)
├── auth/
│   └── jwt.py         # Supabase JWT verification (PyJWT)
├── db/
│   ├── session.py     # user_session (RLS-respecting, default)
│   ├── admin.py       # admin_session (service role, restricted import)
│   └── models/        # SQLAlchemy ORM models
├── schemas/           # Pydantic request / response models
├── api/v1/
│   ├── health.py
│   ├── admin/         # TA-only endpoints (legal admin_session import site)
│   └── ...
├── services/          # Pure business logic
└── jobs/              # Cron-triggered handlers (legal admin_session import site)
```

## Two connection modes

Per [ADR 0002](../.docs/decisions/0002-backend-stack.md) "Authorization model":

| Mode | Used by | Postgres role | RLS applies? |
|---|---|---|---|
| `user_session(user)` | All user-facing endpoints | `authenticated` (+ JWT claims pushed via `set_config`) | ✅ Yes |
| `admin_session()` | Cron, admin endpoints, bootstrap | `service_role` | ❌ No |

`admin_session` may only be imported from `app/api/v1/admin/`, `app/api/v1/auth/`, and `app/jobs/`. A CI lint rule enforces this. See [ADR 0009 §2](../.docs/decisions/0009-audit-corrections.md).
