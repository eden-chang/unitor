# Unitor

Class-scoped teammate matching for university courses. Originally a CSC318 prototype; now restructured into a multi-stack monorepo per the architecture decisions in [`.docs/decisions/`](./.docs/decisions/).

> Status: **frontend prototype works; backend is bootstrapped but has no business endpoints yet.** Roadmap and rationale are documented under `.docs/`.

## Repository layout

```
unitor/
├── frontend/             # React 19 + Vite 7 + Tailwind 4. The student/TA UI.
├── backend/              # FastAPI service (matching, roster, scheduled jobs).
├── packages/
│   └── api-types/        # Generated TS types from backend OpenAPI (committed).
├── .docs/                # Architecture decisions + specs. Currently gitignored
│                         # (see ADR 0005 "Note on .docs/" — to be revisited).
├── .github/workflows/    # CI / deploy.
├── .gitattributes        # Marks generated files for clean PR diffs.
└── .gitignore
```

Why a monorepo: one git pull gets you the whole product, and frontend + backend changes ship in a single coordinated PR. See [ADR 0005](./.docs/decisions/0005-repo-structure.md).

## Quickstart

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173/unitor-demo/
npm run build
npm run lint
npm run typecheck
```

### Backend

```bash
cd backend
uv sync --all-groups
cp .env.example .env       # fill in Supabase + R2 + Sentry values
uv run uvicorn app.main:app --reload --port 8000
```

See [`backend/README.md`](./backend/README.md) for migrations, tests, and the two-mode session pattern (`user_session` vs `admin_session`).

### Generated API types

After a backend OpenAPI change:

```bash
cd packages/api-types
npm install
npm run generate          # regenerates src/generated.ts from ../../backend/openapi.json
```

Frontend imports the types via `import type { paths } from "@unitor/api-types"`.

## Documentation

Authoritative docs live under `.docs/`:

- **Locked decisions**: [`./.docs/decisions/`](./.docs/decisions/) — 9 ADRs covering multi-tenancy, backend stack, hosting, data strategy, repo layout, toolchain, domain modeling, conventions, and the audit corrections.
- **Current state and specs**: [`./.docs/README.md`](./.docs/README.md) — points at the frontend inventory, ERD, auth flows, matching spec, CSV spec, and API surface.

If you're new, start at [`./.docs/01-current-state.md`](./.docs/01-current-state.md).

## Deployment

| Component | Provider | Notes |
|---|---|---|
| Frontend (static) | Vercel (production), GitHub Pages (prototype mirror) | `.github/workflows/deploy.yml` deploys `frontend/dist` to GitHub Pages on push to `main`. |
| Backend | Railway (then Fly.io at scale) | Not yet wired. |
| Postgres + Auth + Realtime | Supabase | Pro tier needed before scheduled jobs go live (pg_cron + Pro features). |
| Files | Cloudflare R2 + CDN | Profile photos, CSV archives, message archives. |
| Errors | Sentry | Frontend + backend. |

See [ADR 0003](./.docs/decisions/0003-infrastructure.md) for the full picture.

## Conventions

Cross-cutting rules (IDs, timestamps, error shape, naming) are in [ADR 0008](./.docs/decisions/0008-conventions.md). Coding style is in `CLAUDE.md` and project-specific lint/typecheck configs.

## License / contact

— (TBD)
