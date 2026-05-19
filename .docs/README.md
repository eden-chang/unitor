# Unitor — Documentation Index

Unitor is a class-scoped teammate-matching tool. The repository currently contains a **frontend-only demo prototype** built for CSC318. The next milestone is to design (not yet build) a real backend so the product becomes usable end-to-end.

These docs describe the prototype as it stands today, the gaps to close, and the architectural decisions that are now locked in. **No backend code has been written yet.**

## Locked decisions

Start here if you want to know what we have already agreed on:

- [`decisions/`](./decisions/) — ADR-style records, one per architectural decision. See the [decisions index](./decisions/README.md).

The nine ADRs in that folder cover multi-tenancy, the backend stack, hosting, the data strategy, the repo layout, the development toolchain, domain modeling, cross-cutting conventions, and the senior-audit corrections that amend several of the earlier ADRs.

## Documents in this folder

### Current-state documentation

| File | Purpose |
|------|---------|
| [`01-current-state.md`](./01-current-state.md) | Snapshot of what exists today: stack, run instructions, scope of the prototype, what it can and cannot do. |
| [`02-frontend-inventory.md`](./02-frontend-inventory.md) | Page-by-page and component-by-component inventory of the frontend, including routing, navigation, and overlays. |
| [`03-mock-data-and-state.md`](./03-mock-data-and-state.md) | Where the data lives today (hardcoded constants, `localStorage`), what types it has, and where simulated behaviors hide (auto-replies, timed callbacks). |
| [`04-backend-gaps.md`](./04-backend-gaps.md) | Concrete list of missing backend capabilities: auth, identity, persistence, matching, real-time, notifications, file/CSV ingest, admin, integrations. |
| [`05-planning-targets.md`](./05-planning-targets.md) | Forward-looking planning surface. Sections marked "decided" link to the relevant ADR; remaining sections are open work. |

### Detailed specifications (all decisions to confirm before code is written)

| File | Purpose |
|------|---------|
| [`06-erd.md`](./06-erd.md) | Complete entity-relationship design: every table, column, index, RLS policy, partitioning rule. |
| [`07-auth-flows.md`](./07-auth-flows.md) | Signup, login, JWT verification, account deletion, multi-device. |
| [`08-matching-spec.md`](./08-matching-spec.md) | Compatibility scoring algorithm: inputs, formula, weights, output schema, test vectors. |
| [`09-csv-roster-spec.md`](./09-csv-roster-spec.md) | TA roster CSV format, validation, preview/commit flow, edge cases. |
| [`10-api-surface.md`](./10-api-surface.md) | Endpoint inventory split across Supabase direct, FastAPI, and cron triggers. Mapped to every frontend screen. |

## Reference material (kept for context, not authoritative for backend planning)

| File | Purpose |
|------|---------|
| [`easea-scenario-ux-flows.md`](./easea-scenario-ux-flows.md) | Source-of-truth scenario document driving the prototype UX. Useful for understanding intended user flows. |
| [`evaluations.md`](./evaluations.md) | CSC318 design-alternatives evaluation. Background on why this product exists and what tradeoffs it makes. |

## Session logs

Chronological narratives of significant working sessions. Useful when you want the *why* behind a series of commits, not just the *what*.

| File | Purpose |
|------|---------|
| [`session-logs/2026-05-17-backend-bringup.md`](./session-logs/2026-05-17-backend-bringup.md) | Single-session narrative of the backend bring-up: ADRs locked in, schema applied to live Supabase, auth/profile/discovery endpoints shipped, two senior audits absorbed. |

For a forward-looking "what's done, what's next, gotchas, quick-start" document aimed at the next contributor, see [`../HANDOFF.md`](../HANDOFF.md) at the repo root.

## Archive

[`archive/frontend-phases/`](./archive/frontend-phases/) — Korean-language implementation plans (phase-1 through phase-z) that were executed to build the current frontend prototype. Kept for traceability. **Do not treat as live work items.**

## How to use these docs

1. Start with `01-current-state.md` to understand what runs today.
2. Read `02-frontend-inventory.md` and `03-mock-data-and-state.md` together to see exactly what the frontend assumes a backend will provide.
3. Use `04-backend-gaps.md` as the gap analysis.
4. Read [`decisions/`](./decisions/) to see what has been agreed on so far.
5. Use `05-planning-targets.md` for the bird's-eye plan; sections corresponding to a finished ADR are noted there.
6. For detailed implementation specs (schema, auth, matching, CSV, API), read `06–10`. **Each ends with a "Decisions to confirm" section listing defaults you may want to override before code is written.**

## Open review surface

The following docs end with explicit checklists of decisions still open or pending your sign-off:

- [`06-erd.md`](./06-erd.md) §13 — 9 schema-level defaults.
- [`07-auth-flows.md`](./07-auth-flows.md) §12 — 7 auth/lifecycle defaults.
- [`08-matching-spec.md`](./08-matching-spec.md) §12 — 10 algorithm tuning defaults.
- [`09-csv-roster-spec.md`](./09-csv-roster-spec.md) §13 — 9 CSV-handling defaults.
- [`10-api-surface.md`](./10-api-surface.md) §7 — 9 API-shape defaults.

Plus the open follow-ups in [`decisions/0007-domain-modeling.md`](./decisions/0007-domain-modeling.md) (TA vs instructor role distinction, section reassignment) and [`decisions/0008-conventions.md`](./decisions/0008-conventions.md) (i18n strategy, accessibility audit, telemetry).
