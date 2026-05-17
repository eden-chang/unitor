# ADR 0001 — Multi-tenancy: single Postgres + Row-Level Security

- **Status:** Accepted
- **Date:** 2026-05-16
- **Supersedes:** —
- **Superseded by:** —

## Context

Unitor will eventually host many universities and many courses inside the same product. We need a tenancy model that:

1. Keeps one university's data inaccessible to another at the database layer (not just the application layer).
2. Stays cheap and operationally simple at realistic scale.
3. Doesn't paint us into a corner if a particular university later demands data residency or full isolation.

Realistic scale projections (from `../05-planning-targets.md` discussions): 200k total users / 80k MAU at the optimistic 5-year ceiling. Total persistent data well under 100 GB. **This is single-Postgres territory.**

## Decision

Use a **single shared Postgres database** with **row-level multi-tenancy** enforced by Postgres Row-Level Security (RLS). Every domain table carries a tenancy key (`university_id` and/or `course_id`); RLS policies use the authenticated user's claims to filter rows server-side.

Specifically:

- Every domain table includes the lowest-level scoping key it needs (typically `course_id`; `university_id` is reachable through `course_id`).
- RLS is **enabled** on every user-readable table. The default policy is "deny"; we add `SELECT/INSERT/UPDATE/DELETE` policies per table.
- Frontend connects to Postgres only through Supabase's PostgREST layer using **anon key + user JWT**; RLS does the actual filtering.
- FastAPI connects to Postgres directly using **service role key** (which bypasses RLS) but performs equivalent authorization in application code based on the JWT.

## Alternatives considered

| Option | Rejected because |
|---|---|
| **Schema-per-tenant** | Migrations become O(tenants). Postgres tolerates dozens of schemas, not thousands. Connection pool fragmentation. No real isolation benefit over RLS at our scale. |
| **Database-per-tenant** | Most expensive option (one managed DB per university × 200 universities = ~$2k+/month just for DB instances at the optimistic ceiling). Migrations become operations-heavy. Cross-tenant analytics painful. Save this for the rare case a customer contractually requires it. |
| **Application-only authorization (no RLS)** | One missing `WHERE course_id = ?` in any query leaks one tenant's data to another. RLS removes a whole class of vulnerabilities from the code review surface. |

## Consequences

**Positive:**

- One database to back up, monitor, migrate, and pay for.
- Cross-tenant features (e.g., a future "browse universities" page) are a normal query, not a federation problem.
- RLS gives defense in depth: a SQL injection or a frontend bug cannot cross tenant boundaries.

**Negative / things to watch:**

- RLS policies are **part of the data model** and must be migrated like schema. Treat them with the same review discipline.
- Noisy-neighbor risk: a huge course could degrade performance for others. Mitigation: per-course query plans are simple (everything is filtered by `course_id` first), and indexes lead with `course_id`.
- We must not let any service hold the service-role key in code that frontend users can reach. Service role lives only on the backend.

## Implementation rules to lock in now

1. **Tenancy column required.** Migrations CI step must reject any new domain table without `course_id` (or `university_id` where appropriate).
2. **RLS-enabled by default.** A migration that creates a table without an RLS policy fails review.
3. **Soft-delete tables must filter `deleted_at IS NULL` in RLS** (added per [ADR 0009](./0009-audit-corrections.md) §1). The data-access layer filter is insufficient because PostgREST and direct SQL bypass it.
4. **Service role isolation.** Service role key is only present in backend environment secrets. Never bundled into the frontend, never exposed in client logs.
5. **Indexes lead with `course_id`** for any table that's queried per course (which is most of them).
6. **Future escape hatch.** If we ever need to split a university to its own DB, the migration is: dump + restore filtered by `university_id`, point a routing layer at the new DB. Painful but possible because all FKs are scoped within `university_id`.

## Canonical RLS policy templates

### Read policy (tenant + soft-delete aware)

```sql
ALTER TABLE T ENABLE ROW LEVEL SECURITY;

CREATE POLICY t_read ON T FOR SELECT
  USING (
    -- subject row is not soft-deleted (only if T has deleted_at)
    deleted_at IS NULL
    -- and tenant filter
    AND course_id IN (
      SELECT course_id FROM enrollments
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );
```

For tables **without** a `deleted_at` column, drop the `deleted_at IS NULL` clause on the subject side, but keep it on the `enrollments` lookup.

### Admin/audit "see deleted rows" policy

Only granted to specific roles (e.g., TA + instructors viewing course history). Implement as a separate policy:

```sql
CREATE POLICY t_read_admin ON T FOR SELECT
  USING (
    course_id IN (
      SELECT course_id FROM enrollments
      WHERE user_id = auth.uid()
        AND role IN ('ta', 'instructor')
        AND deleted_at IS NULL
    )
  );
```

When both policies match, Postgres `OR`s them — the admin policy grants visibility to soft-deleted rows for TAs.

## Open follow-ups

- ADR for partitioning the `messages` table — covered in [ADR 0004](./0004-data-strategy.md).
- ADR for hosting/operations choices — covered in [ADR 0003](./0003-infrastructure.md).
- The senior audit ([ADR 0009](./0009-audit-corrections.md)) amends this ADR — see specifically the corrected RLS templates above.
