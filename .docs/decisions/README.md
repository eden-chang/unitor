# Architecture Decision Records

This folder captures the decisions we have **already settled** for taking Unitor from a frontend-only prototype to a multi-tenant production product. Each record is an **ADR (Architecture Decision Record)**: short, declarative, with alternatives and reasoning preserved so we don't re-litigate.

If you arrived here without context, read `../01-current-state.md` and `../04-backend-gaps.md` first.

## Status legend

- **Accepted** — Decided. Implementation will follow this.
- **Superseded** — Replaced by a later ADR (linked).
- **Proposed** — Drafted, waiting on agreement.

## Records

| # | Title | Status |
|---|---|---|
| [0001](./0001-multi-tenancy.md) | Multi-tenancy: single Postgres + Row-Level Security | Accepted |
| [0002](./0002-backend-stack.md) | Backend stack: Supabase + FastAPI hybrid | Accepted |
| [0003](./0003-infrastructure.md) | Hosting, storage, email, observability vendors | Accepted |
| [0004](./0004-data-strategy.md) | Hot/cold data split, partitioning, compatibility caching | Accepted |
| [0005](./0005-repo-structure.md) | Monorepo layout | Accepted |
| [0006](./0006-development-toolchain.md) | Backend toolchain, migrations rule, OpenAPI flow | Accepted |
| [0007](./0007-domain-modeling.md) | Profile scope, user-university, roster, sections, group leadership | Accepted (default; subject to review) |
| [0008](./0008-conventions.md) | Cross-cutting conventions (IDs, timestamps, errors, soft delete, etc.) | Accepted (default; subject to review) |
| [0009](./0009-audit-corrections.md) | Senior-engineer audit findings + research log; amends ADRs 0001/0002/0003/0005/0006 and specs 06/08/09/10 | Accepted |

## Conventions

- Each file is numbered `NNNN-kebab-case-title.md`.
- New records get the next free number; never renumber existing ones.
- If a decision changes, write a new ADR that **supersedes** the old one. Mark the old one `Superseded` and link forward.

## Two operational notes from the audit (not decisions, just things to fix when you touch tooling)

1. **`.docs/` is currently in `.gitignore`** (line 5 of `/.gitignore`). These planning docs are therefore not tracked. Decide whether to start tracking — recommend yes — and remove the entry. If you keep it private, at minimum sync this folder somewhere else (Notion, a private repo) so the work isn't trapped on one machine.
2. **`npm run lint` does not work today** — eslint is installed, but no `eslint.config.js` exists at the repo root. To be addressed when the frontend is restructured (per the plan in `../05-planning-targets.md`).
