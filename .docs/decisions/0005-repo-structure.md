# ADR 0005 — Monorepo layout

- **Status:** Accepted
- **Date:** 2026-05-16
- **Supersedes:** —
- **Superseded by:** —

## Context

[ADR 0002](./0002-backend-stack.md) introduces a FastAPI service alongside the existing React/Vite frontend. The repository today is a single-app frontend (`src/App.tsx` + 12 shadcn UI primitives, ~4,655 lines in one file). We need a layout that:

- Keeps frontend and backend in lockstep when API contracts change.
- Allows independent deploys for frontend and backend.
- Doesn't require Turborepo / Nx / Yarn workspaces from day one (overhead too high for a two-app repo).
- Supports adding more apps later (mobile, an admin panel) without restructuring.

## Decision

**Single Git repository (monorepo) with top-level folders per concern, no workspace tooling at the start.**

```
unitor/
├── frontend/                       # current src/* lives here
│   ├── src/
│   │   ├── routes/                 # React Router pages
│   │   ├── features/               # domain-shaped feature modules
│   │   ├── components/ui/          # shadcn primitives
│   │   ├── lib/
│   │   └── types/                  # imports from packages/api-types
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── ...
├── backend/                        # FastAPI service
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── deps.py
│   │   ├── auth/
│   │   ├── db/
│   │   │   ├── session.py
│   │   │   └── models/
│   │   ├── schemas/
│   │   ├── api/v1/
│   │   ├── services/
│   │   └── jobs/
│   ├── alembic/
│   │   ├── versions/
│   │   └── env.py
│   ├── alembic.ini
│   ├── tests/
│   └── pyproject.toml
├── packages/
│   └── api-types/                  # OpenAPI → TypeScript generated types
│       ├── package.json
│       └── src/
│           └── generated.ts        # output of openapi-typescript
├── infra/                          # optional: terraform / supabase config-as-code
│   ├── supabase/
│   │   ├── migrations/             # mirrored from Alembic for Supabase CLI (read-only copy)
│   │   └── seed.sql
│   └── README.md
├── .docs/                          # planning docs (currently gitignored — see note)
├── .github/
│   └── workflows/
│       ├── frontend.yml            # build + deploy frontend
│       ├── backend.yml             # test + deploy backend
│       └── types.yml               # regenerate api-types on backend changes
├── .gitignore
├── package.json                    # root scripts (lint, typecheck across packages)
└── README.md
```

### Why this exact shape

- **`frontend/` and `backend/` are siblings**, not nested. Either can be opened independently in a separate editor session.
- **`packages/api-types/`** is the only shared code today. Frontend imports types from it; backend regenerates it on every OpenAPI change.
- **`infra/`** is reserved for things like a Terraform module if we ever need it. Empty for now beyond Supabase configuration. We can move all the Supabase artifacts (migrations, config) here when we automate environment setup.
- **`.docs/`** stays where it is (already in use). See note below.

### Tooling deferred (deliberate)

| Tool | Decision | When to revisit |
|---|---|---|
| Turborepo / Nx | Skip | When `npm run test` across folders is too slow or commands diverge wildly |
| pnpm workspaces | Skip | Same trigger. Plain npm in each folder is fine for two folders |
| Lerna / Changesets | Skip | Only relevant if we publish packages |
| Bazel | Skip | Never (overhead too high for our scale) |

We do not need workspace tooling for **two apps + one types package**.

### Type-sharing flow

```
backend/app/api/v1/*.py          ← edit a route
        │
        ▼  (FastAPI auto-generates)
backend/openapi.json              ← committed file
        │
        ▼  (CI: openapi-typescript)
packages/api-types/src/generated.ts
        │
        ▼  (frontend imports)
frontend/src/lib/api/*.ts         ← TanStack Query wrappers
```

The generated `generated.ts` is **committed** so frontend builds don't depend on running backend tooling. A CI job regenerates it and fails if a developer forgot to commit the update.

## Alternatives considered

| Option | Rejected because |
|---|---|
| **Two separate repos (`unitor-web`, `unitor-api`)** | Decouples deploys nicely but every API change requires two PRs, with no way to enforce they land together. Local dev is harder (have to clone two repos). Type-sync drift becomes a recurring incident. |
| **Polyrepo with a third "types" repo** | Worse than option above. |
| **Single repo with one mixed `src/`** | Tempting for a tiny project but the languages, build tools, and deploy pipelines diverge fast. Don't go here. |
| **Turborepo from day one** | Useful when you have ≥5 packages or want incremental builds. Two folders don't need it. |
| **Backend inside `frontend/server/`** (Next.js style) | Conflates two deploy targets. Future mobile app would have to depend on the frontend repo. Don't. |

## Consequences

**Positive:**

- One `git pull` gets you the entire product. One PR can ship coordinated frontend + backend changes.
- Local dev: `cd frontend && npm run dev` in one terminal, `cd backend && uv run uvicorn app.main:app --reload` in another. No tooling to install beyond Node and uv.
- CI matrix is straightforward: changes in `frontend/**` trigger frontend jobs; changes in `backend/**` trigger backend jobs; changes in either trigger the types regeneration check.

**Negative / things to watch:**

- The `npm run` at the root has nothing useful by default. We can add a tiny helper `npm-run-all` setup later if a single command for all-checks-everywhere helps reviewers.
- Without workspace tooling, common dev-deps (e.g., prettier configuration) are duplicated in `frontend/` and `backend/` (in different forms). Acceptable for two apps.

## Implementation rules

1. **Move the current `src/` into `frontend/src/` and adjust `vite.config.ts` paths** as the first commit when the restructuring starts. Single mechanical PR.
2. **Update `.github/workflows/deploy.yml`** at the same time — currently it builds from repo root; that will break the day `frontend/` exists.
3. **`.docs/` stays at repo root.** Decide separately whether to gitignore it.
4. **Generated files (`openapi.json`, `packages/api-types/src/generated.ts`) are committed.** CI verifies they're up to date; humans don't hand-edit them.
5. **`.gitattributes` marks generated files as such** (added per [ADR 0009](./0009-audit-corrections.md) §15) so GitHub auto-collapses their diff in PRs:

   ```
   # .gitattributes
   packages/api-types/src/generated.ts  linguist-generated=true
   backend/openapi.json                 linguist-generated=true
   ```
6. **No circular dependencies.** Frontend depends on `api-types`. Backend produces `openapi.json` which feeds `api-types`. `api-types` depends on nothing in this repo. Backend never imports `api-types`.

## Note on `.docs/`

The current `/.gitignore` includes `/.docs`, which means the planning docs we've written are not committed. This is independent of the layout decision, but worth flagging once: decide explicitly whether `.docs/` should be tracked, moved to a private wiki, or stay local-only.
