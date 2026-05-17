# 05 — Planning Targets

This is the forward-looking planning surface. **No code is committed to yet** — these are the decisions and artifacts that should exist before backend implementation starts. Each section ends with the open questions whose answers feed the eventual technical design.

> **Decisions already locked**: §§1, 7 (in part), and several cross-cutting choices have been formalized as ADRs in [`decisions/`](./decisions/). Sections below note which ADR supersedes them. Anything not pointing to an ADR is still open.

## 1. Decide the deployment shape — ✅ DECIDED

See [`decisions/0003-infrastructure.md`](./decisions/0003-infrastructure.md). Vercel (frontend), Railway (FastAPI), Supabase (Postgres + Auth + Realtime), Cloudflare R2 (files), Resend (email), Sentry (errors). Domain/URL gating (TA vs student) is still open and is covered in §3 below.

## 2. Confirm the canonical domain model — partially decided, ERD open

Tenancy strategy is locked: [`decisions/0001-multi-tenancy.md`](./decisions/0001-multi-tenancy.md). Data lifecycle / partitioning policy is locked: [`decisions/0004-data-strategy.md`](./decisions/0004-data-strategy.md). The remaining work is the concrete ERD. Open sub-decisions for the ERD discussion:

- **Profile scope**: per-user (one profile, reused across courses) or per-enrollment (a fresh profile per course)? The current UI implies per-course (because `Prof0`–`Prof3` happen during course join), but the persistence in `ProfileEdit` implies a global profile. Resolve this.
- **Group identity**: does a group have a stable name/slug, or is it always referred to as "Aisha Khan's Group"? The current UI uses the leader's name as the label.
- **Leader transfer**: out of scope for the prototype but trivial-looking. Decide if it stays out of scope or gets a small carve-out (e.g., on leader leave).
- **Roster row vs. user**: when a TA uploads a CSV, the rows exist as "potential users" until each student signs up. Decide whether to model this as a separate `RosterEntry` table or to lazily create stub `User` rows.
- **Sections**: model as a string on enrollment or as a first-class entity (likely first-class — the UX filters by section and the TA dashboard slices by section).

Output: an ERD or table list with column types and primary/foreign keys. Keep it small enough to fit on one page.

## 3. Settle the authentication model — partially decided

Provider, transport, and verification mechanism are decided ([`decisions/0002-backend-stack.md`](./decisions/0002-backend-stack.md): Supabase Auth, magic links, JWT in `Authorization` header). Still open:

- **Roster-gated signup**: must a student's email already exist in some course's roster before they can complete signup? The UX doc says yes — we still need to decide whether this is enforced in Supabase Auth (via a "before sign-up" hook) or in FastAPI on first profile creation.
- **TA gating**: by URL (`/instructor`), by allowlist (table of TA emails), or by manual provisioning. The UX doc implies a different URL.
- **Account-to-enrollment binding**: a user with the same email at two universities — single account or two? (Recommend single Supabase user, multiple enrollments.)

Output: an auth-flow diagram covering signup, verify, login, refresh, logout, account-to-enrollment binding.

## 4. Define the API surface (planning, not implementation)

For each frontend surface in `02-frontend-inventory.md`, write down the API call(s) it needs, the request payload, and the response shape. Group by resource:

- `courses`, `enrollments`, `profiles`
- `students/me`, `students/:id`
- `groups`, `groups/:id/members`, `groups/:id/applications`
- `requests` (one-to-one), `applications` (to groups)
- `conversations`, `messages`, `reactions`
- `notifications`
- `ta/courses/:id/overview`, `ta/courses/:id/alerts`, `ta/courses/:id/students`
- `ta/courses/:id/roster` (CSV upload)

For each endpoint, decide: who is authorized? what changes does it produce? what events does it emit? what does the frontend need cached?

Output: an OpenAPI-style or table-style endpoint list. Do not pick the framework yet — the contract should be implementation-agnostic.

## 5. Choose the matching strategy

The compatibility scores are currently hand-authored. Decide:

- **What inputs feed the score?** Schedule overlap (in hours), skill complementarity (Jaccard-like vs. gap-coverage), work-style match (exact match on three fields), recency of activity, optional manual TA boost?
- **Score range and normalization** — keep the 0–100 number? Three sub-scores (schedule, skill, work-style) as today?
- **Refresh cadence** — recompute on profile change, on a schedule, or on read?
- **Cardinality** — full pairwise inside a course (likely fine at 45 students), or top-K per student?
- **Transparency** — the UI shows "Why this score" reasons and warnings. Decide whether reasons are also computed or curated.

Output: a one-page scoring spec with formulas, weights, and worked examples for two contrasting pairs.

## 6. Plan the real-time and scheduled work

The prototype simulates two distinct kinds of asynchrony:

1. **Real-time** (chat, typing indicators, "they replied" notifications): plan transport (WebSocket vs. SSE vs. push) and fallback (long-poll).
2. **Scheduled** (24h confirmation window, 48h/24h "No Response" timeout, deadline tiers, provisional group formation, reminder emails): plan job execution (cron, queue, durable timer).

Decide whether both can be handled by the same component, or whether they need separate infrastructure. Identify retry, idempotency, and timezone behaviors.

Output: an event/job catalog naming each scheduled action, its trigger, and its idempotency key.

## 7. Plan the CSV ingest pipeline

Currently a no-op. Required behaviors:

- Schema: declared columns and validation rules (e.g., email format, section allowlist, duplicate detection).
- Mode: full replace vs. delta upsert.
- Preview & confirm: the TA should see a dry-run before committing.
- Error reporting: per-row errors with line numbers.
- Audit: who uploaded what, when.

Output: a small spec for the upload, parse, validate, preview, commit, and post-import notification flow.

## 8. Plan migrations and seed strategy

Once persistence is real, the 20 hand-authored `STU` personas become a problem:

- Decide whether to keep a "demo course" with these personas as a permanent test fixture, or to retire them entirely.
- Decide whether the existing `profile_images/*.png` files stay (likely yes — they're useful for demos and don't conflict with real avatars if names are different).
- Plan how local-storage state gets migrated or wiped when a user first logs into the real backend (the prototype's `clearAllLocalStorage` is a starting point).

## 9. Plan observability and operational basics

Even pilot deployments need:

- Server-side request logging with PII redaction.
- Error reporting (Sentry-style).
- Lightweight metrics (sign-ups, requests sent, groups confirmed, deadline-tier transitions).
- Rate limits on the request, application, and message endpoints.
- A break-glass for the TA to undo bad bulk actions (the demo currently has none).

## 10. Plan testing and CI

The repo has zero tests. At minimum, plan:

- A test runner choice (Vitest fits the Vite stack).
- A unit-test seed: the matching/scoring function is the single highest-value place to start once it exists.
- An integration-test seed: an end-to-end happy path through signup → join course → send request → accept → confirm group.
- A CI workflow that runs lint + type-check + tests on every PR.

## 11. Sequencing

Suggested ordering once decisions above are in hand. Each step lists what unblocks it and what it unblocks. **Treat this as draft order, not a commitment.**

1. **Platform decisions and ERD** (§§1–2). Unblocks everything else.
2. **Auth + identity** (§3). Unblocks per-user data.
3. **Course + roster + enrollment** (§§2, 7). Unblocks course-scoped reads.
4. **Profile CRUD** (`Prof0`–`Prof3`, `ProfileEdit`).
5. **Discovery read path** (course-scoped student list, filterable, sortable). Defer matching scores; start with deterministic stubs.
6. **Request + application lifecycle** (§5 first pass with stubbed scoring).
7. **Group formation and confirmation** (with real 24h timer).
8. **Messaging** (real transport).
9. **Notifications** (real source, real dispatch).
10. **TA dashboards and analytics** (live versions of `ADMIN_DATA`).
11. **CSV ingest** (full validate / preview / commit flow).
12. **Scheduling** (deadline tiers, no-response timeout, provisional grouping).
13. **Hardening** (observability, rate limits, abuse reports, audit log).

Each step should ship behind a feature flag and stay shippable independently.

## 12. Decision log to maintain alongside this folder

A running log of decisions, who made them, and what alternatives were considered. Suggested location: `.docs/decisions/` with one ADR-style file per decision. This avoids re-litigating settled questions during implementation.

---

This planning surface intentionally avoids prescribing a stack. The right next conversation is the platform-decisions one (§1). Once that is settled, the ERD, auth model, and API surface fall into place quickly, and only then is it useful to start writing code.
