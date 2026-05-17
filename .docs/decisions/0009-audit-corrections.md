# ADR 0009 — Senior-engineer audit corrections

- **Status:** Accepted
- **Date:** 2026-05-16
- **Supersedes:** Amends ADRs 0001, 0002, 0003, 0006, and specs 06/08/09
- **Superseded by:** —

## Context

After the initial set of ADRs and specs (0001–0008, plus docs 06–10) was written, a senior-level audit pass was performed. The audit looked for: maintainability risks, scale problems at 10k+ MAU, security gaps, vendor cost surprises, and silent data-integrity bugs. Web research validated specific claims.

This ADR records:

1. The findings and what was corrected.
2. The research links that informed the corrections (kept for future re-evaluation).
3. Verification items still pending (things I couldn't confirm without an actual Supabase project).

## Audit summary

| Severity | Count | Examples |
|---|---|---|
| 🔴 Critical (security / data integrity) | 4 | RLS missing `deleted_at`, FastAPI `service_role` overuse, question schema breaks on edit, partition FK gotcha |
| 🟡 Important (scale / operational) | 4 | Connection pooling URL, missing `algorithm_version`, CSV memory, cache pre-warm |
| 🟢 Misjudged earlier (no change needed) | 3 | Realtime cost actually fine, vendor lock-in acceptable, UUIDv7 strategy correct |
| Minor (cleanup) | 6 | Schema simplifications, JWT rotation note, generated-files diff config, etc. |
| Open / verify | 2 | `pg_partman` availability on Supabase Pro, asyncpg + Supavisor transaction-mode compat |

## Corrections applied

### 🔴 1. RLS policies must enforce `deleted_at IS NULL`

**Problem.** [ADR 0001](./0001-multi-tenancy.md) RLS template filtered only by tenancy. Soft-deleted rows in `users`, `enrollments`, `groups`, `messages` (per [ADR 0008](./0008-conventions.md) §4) would leak to any caller using PostgREST directly. The data-access-layer filter only protects ORM-routed reads.

**Fix.** Updated [ADR 0001](./0001-multi-tenancy.md) RLS template to include `deleted_at IS NULL` on both the subject table and the `enrollments` lookup. Updated [`../06-erd.md`](../06-erd.md) cross-cutting RLS section. Added an implementation rule that any soft-delete table's RLS policy must filter `deleted_at IS NULL` by default; admin/audit reads opt in via a separate policy that bypasses this filter.

### 🔴 2. FastAPI authz: hybrid Pattern C, not service-role only

**Problem.** [ADR 0002](./0002-backend-stack.md) recommended FastAPI use the service role key universally and rely on application-level checks. This loses the RLS safety net — a single missed check leaks tenant data. At 40+ endpoints, this is a real review burden and a bigger blast radius than necessary.

**Fix.** Updated [ADR 0002](./0002-backend-stack.md) to specify a **hybrid pattern**:

- **User-facing endpoints**: open the Postgres session as the `authenticated` role with the user's JWT claims set via `SET LOCAL`. RLS applies. App code still does the additional business checks (leader-only, etc.), but RLS catches tenancy bugs.
- **Cron, admin, bootstrap, sentinel operations**: use service role. These are explicitly marked in the route module.

Implementation pattern (to be reused by every FastAPI endpoint):

```python
# In a request-scoped dependency:
async with engine.connect() as conn:
    await conn.execute(text("SET LOCAL ROLE authenticated"))
    await conn.execute(
        text("SELECT set_config('request.jwt.claims', :claims, true)"),
        {"claims": json.dumps(current_user.jwt_claims_subset)},
    )
    # ... do user-facing work; RLS will filter ...
```

For service-role usage, a separate factory `admin_session()` is used. Endpoints declare which they need; CI enforces that admin sessions are only used in modules under `app/api/v1/admin/` or `app/jobs/`.

### 🔴 3. Application questions must snapshot text into answers

**Problem.** ERD had `application_answers.question_id` pointing at `group_application_questions`. If a leader edits or deletes a question after applications are submitted, existing answers either lose context or break the FK.

**Fix.** Updated [`../06-erd.md`](../06-erd.md) §17:

- `application_answers.question_id` → nullable (kept for analytics, set NULL on question delete).
- `application_answers.question_text_snapshot` text NOT NULL — captured at answer time. This is what the UI displays.
- `group_application_questions.is_archived boolean` — set true when a leader removes a question, instead of hard-deleting, so old answers can still reference it if a TA audit needs to.

### 🔴 4. `message_reactions` co-partitioned with `messages`

**Problem.** ERD had `messages` partitioned monthly but `message_reactions` as a regular table with FK to `messages`. PG 12+ supports FK from regular → partitioned tables, but **drop of an old `messages` partition leaves orphan reactions or causes a constraint check failure**. Mentioned but not solved in the original ERD.

**Fix.** Updated [`../06-erd.md`](../06-erd.md) §22 to partition `message_reactions` by `message_created_at` with the same monthly key as `messages`. `pg_partman` is configured to manage both with the same retention. Cold-storage archive dumps both per partition together.

Composite FK (`message_id, message_created_at`) → (`messages.id, messages.created_at`) so PG can route correctly. The partition-drop is atomic across both.

### 🟡 5. `compatibility_cache.algorithm_version`

**Problem.** When matching weights change, every cache row is stale. Without a version column, we have to truncate the whole table (acceptable but indiscriminate) or live with bad data until the per-row trigger eventually invalidates it.

**Fix.** Added `algorithm_version SMALLINT NOT NULL` to `compatibility_cache` in [`../06-erd.md`](../06-erd.md) §24 and a `CURRENT_ALGORITHM_VERSION` constant in `app/services/compatibility.py`. Read path checks `row.algorithm_version == CURRENT_ALGORITHM_VERSION`; if not, treat as stale. Bump version when weights/formulas change.

Updated [`../08-matching-spec.md`](../08-matching-spec.md) §7 (output schema) and §10 (decisions list) to reflect this.

### 🟡 6. Backend connects via Supavisor pooler, not direct port

**Problem.** SQLAlchemy + asyncpg connecting to `db.{project}.supabase.co:5432` exhausts Supabase's max_connections (60 on Pro) under load. Documentation didn't specify pooler endpoint.

**Fix.** Updated [ADR 0006](./0006-development-toolchain.md):

- Connection URL is `postgres://...supabase.co:6543/postgres?pgbouncer=true` (Supavisor transaction mode).
- SQLAlchemy / asyncpg configuration: `prepared_statement_cache_size=0`, `statement_cache_size=0` to avoid prepared-statement conflicts with transaction-mode pooling.
- For migrations (Alembic), a separate **direct** connection on port 5432 is used because migrations need session-level state. Two connection strings in env: `DATABASE_URL` (pooler, for runtime), `DATABASE_DIRECT_URL` (direct, for migrations).

**Note**: Supabase 2024+ ships Supavisor by default; older docs reference PgBouncer endpoints. Either work, but Supavisor is preferred (multi-tenant pool isolation, Elixir-native, handles 1M+ connections per Supabase's own writeup).

### 🟡 7. CSV roster parser streams, doesn't load whole file

**Problem.** [`../09-csv-roster-spec.md`](../09-csv-roster-spec.md) allowed 5MB / 5,000 rows. Naive `csv.reader(file.read())` puts the whole file in memory. With concurrent uploads (e.g., a TA workshop where 50 instructors upload at once), RAM goes from per-upload 5MB into hundreds of MB, easily blowing past Railway's default 512MB container limit.

**Fix.** Added an implementation rule to [`../09-csv-roster-spec.md`](../09-csv-roster-spec.md):

- Parser uses streaming iteration: `for row in csv.DictReader(stream): ...`. Never `.readlines()`, never `.read()` of the full body.
- Validation per row; results aggregated into the preview without holding the full parsed dataset in memory beyond the first 100 rows and error list.
- The full parsed dataset for the commit step is stored in a Postgres staging table, not in process memory.

### 🟡 8. RLS-aware integration tests via `supabase start`

**Problem.** [ADR 0006](./0006-development-toolchain.md) recommended `testcontainers-python` with a vanilla Postgres image. Vanilla Postgres has no `auth.uid()`, `auth.users`, or any Supabase auth schema. Our RLS policies depend on these. Tests would either skip RLS verification (silently dangerous) or mock `auth.uid()` (doesn't catch policy bugs).

**Fix.** Updated [ADR 0006](./0006-development-toolchain.md):

- **Integration tests**: use `supabase start` (Supabase CLI's local Docker stack) — gives a real Supabase environment locally, including auth.
- **Test DB lifecycle**: `supabase db reset` between test suites for clean state. Alembic migrations run on top of Supabase's bootstrap schema.
- **Unit tests** that don't touch the DB still use plain pytest; no Docker needed.
- **CI**: GitHub Actions service container running `supabase/postgres` image with all extensions; full integration suite runs against it.

## 🟢 Misjudged earlier — kept as documented, no doc change

### 9. Realtime cost — was overstated as a risk

Recomputed using actual pricing from [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing):

- Pro plan: 500 included concurrent, $10 per additional 1,000.
- Team plan: 5,000 included, $599/mo base.

At 100k MAU with 10% concurrent × 2 channels = 20k concurrent connections:
- Pro + overages: $25 + $195 = **$220/mo**.
- Team: **$649/mo** (more, until other Team features are needed).

Pro tier with overages is cheaper than Team plan up to ~500k MAU. The earlier worry that we'd be forced onto Team plan was wrong. **No action needed.** Note this calculation in [ADR 0003](./0003-infrastructure.md) for future reference.

### 10. UUIDv7 — strategy already correct

Research confirmed that UUIDv7's native Postgres support (`uuidv7()` function) ships in PostgreSQL 18. Supabase is currently on PG 15-17, so server-side `uuidv7()` is not available — but [ADR 0008](./0008-conventions.md) already specifies app-side generation, which is correct.

When Supabase upgrades to PG 18 we can migrate to server-side generation (a small refactor — only in the test fixtures and `id_factory()` helper).

### 11. Vendor lock-in — manageable per-component

Each piece of the stack has a documented migration path. Specific exits:

- **Supabase Auth → Auth.js / Clerk / Cognito**. Magic-link migration is straightforward: users keep their primary_email, password-less so no hash migration. Bootstrap-time enrollment links survive.
- **Supabase Postgres → managed Postgres (Neon, RDS, self-hosted)**: `pg_dump` / `pg_restore`. The RLS policies migrate as SQL; only `auth.uid()` references need adapting (define an equivalent function under our control).
- **Supabase Realtime → Pusher / Ably / self-hosted Phoenix**. Frontend rewires subscribe calls. Server stays mostly unchanged (DB triggers don't depend on transport).
- **Cloudflare R2 → S3 / Backblaze B2**. S3-compatible APIs.
- **Vercel / Railway**: container hosting; trivial to move.

No action needed beyond a future "Migration playbook" doc when we want to formalize it.

## Minor / cleanup items applied

### 12. Simplify `direct_conversation_pairs` away

Was an auxiliary table for uniqueness enforcement. Replaced by columns directly on `conversations`:

```
conversations (
  ...
  participant_a_id uuid NULL,  -- only set for type='direct'; lower of the two
  participant_b_id uuid NULL,  -- only set for type='direct'; greater of the two
)
```

Plus a partial unique index:
```sql
CREATE UNIQUE INDEX one_direct_conv_per_pair
  ON conversations (course_id, participant_a_id, participant_b_id)
  WHERE type = 'direct';
```

Updated in [`../06-erd.md`](../06-erd.md) §19. One fewer table, simpler join.

### 13. Conversation deletion: per-participant `left_at` + hard delete when last leaves

Already in the docs but made explicit in [`../10-api-surface.md`](../10-api-surface.md) §3:

- "Delete conversation" UI = set `conversation_participants.left_at`.
- If both/all participants have `left_at`: a cron job hard-deletes the conversation + cascades messages.
- For 1:1 chats with both `left_at` set: immediate hard delete in the same FastAPI request.

### 14. JWT secret rotation policy

Added to [ADR 0003](./0003-infrastructure.md):

- Rotate Supabase JWT secret every 6 months, plus immediately if leaked.
- Frontend uses Supabase JS SDK which auto-fetches new public material — no client deploy needed.
- FastAPI rolls over by reading both `SUPABASE_JWT_SECRET` and `SUPABASE_JWT_SECRET_PREVIOUS` for the 24-hour rotation window. After 24h the previous secret is removed.
- Rotation is logged to `audit_log` with `action = "SECRET_ROTATED"`.

### 15. `.gitattributes` for generated files

Added to [ADR 0005](./0005-repo-structure.md): the generated `packages/api-types/src/generated.ts` and `backend/openapi.json` carry the `linguist-generated=true` attribute so GitHub PR diffs collapse them by default. Humans don't have to scroll through 5,000 lines of generated TypeScript.

### 16. Documented research findings

Sources consulted during the audit, kept here for future reference:

- [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing) — confirmed connection tiers and overage pricing.
- [Supabase Realtime Quota Troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-concurrent-peak-connections-quota-jdDqcp) — explains how concurrent connection accounting works.
- [Supabase True Cost 2026](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance) — independent breakdown of Pro vs Team vs Enterprise.
- [PostgreSQL 18 UUIDv7](https://www.postgresql.org/docs/current/datatype-uuid.html) — native `uuidv7()` arrives in PG 18.
- [Hashrocket: PG 18 UUIDv7 performance](https://hashrocket.com/blog/posts/postgresql-18-s-uuidv7-faster-and-secure-time-ordered-ids) — 33% faster than UUIDv4.
- [pg_uuidv7 extension](https://pgxn.org/dist/pg_uuidv7/) — backport for pre-18 Postgres.
- [pg_partman: foreign keys gotcha](https://www.keithf4.com/table-partitioning-and-foreign-keys/) — historic limitation in trigger-based partitioning.
- [PostgreSQL 12 native partitioning + FK](https://www.enterprisedb.com/blog/postgresql-12-foreign-keys-and-partitioned-tables) — modern native partitioning supports FK both directions.
- [Supabase FastAPI + RLS discussion](https://github.com/orgs/supabase/discussions/33811) — community discussion of authz patterns.
- [Supabase: service-role bypasses RLS](https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z) — confirms that service role unconditionally bypasses.
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — pattern for adding custom claims to JWTs.
- [Pusher vs Supabase Realtime 2026](https://ably.com/compare/pusher-vs-supabase) — comparison for the "should we use Pusher instead" decision.
- [Supabase pg_cron docs](https://supabase.com/docs/guides/database/extensions/pg_cron) — confirms `pg_cron` available on all tiers (Free included).
- [Supabase pg_cron Free Tier discussion](https://github.com/orgs/supabase/discussions/37405) — clarifies behavior on Free tier (cron continues but project pauses after 1 week inactivity, suspending cron with it).
- [Supavisor 1M Connections](https://supabase.com/blog/supavisor-1-million) — Supavisor scales far past what we need.
- [PostgreSQL Connection Pooling: PgBouncer vs Supavisor](https://medium.com/@philmcc/postgresql-connection-pooling-pgbouncer-supavisor-built-in-a34d675db978) — pool mode and limits comparison.

## Items to verify before code is written

### V1. `pg_partman` availability on Supabase Pro

Search results did not directly confirm whether `pg_partman` is exposed on Supabase Pro tier. (Documentation lists many enabled extensions but the picture for `pg_partman` specifically was unclear.) Before relying on it in production:

- Spin up a Supabase Pro project (or check the Supabase extension list in the dashboard).
- Try `CREATE EXTENSION pg_partman`. If unsupported, fall back to **manual partition management** via Alembic migrations that create new monthly partitions ahead of time and a cron job that drops old ones.

This is a small downstream change to [ADR 0004](./0004-data-strategy.md) §2 if it fails: the pattern works either way, just more migration noise.

### V2. asyncpg + Supavisor transaction-mode compatibility

asyncpg uses prepared statements aggressively. Transaction-mode pooling in PgBouncer / Supavisor can mishandle prepared statements. The fix (`prepared_statement_cache_size=0`) is well-known but should be confirmed in our integration tests under load. If misconfigured, symptoms are intermittent "prepared statement 'pgstmt_XXX' already exists" errors.

If this proves flaky, fallbacks:
- Use Supavisor **session mode** (less concurrency benefit, but full session semantics).
- Use psycopg3 with async, which has different prepared statement handling.

## Followup ADRs that may eventually be needed

- ADR for **algorithm change process** — when matching weights are tuned, what's the bump → invalidate → recompute workflow, and how do we communicate score shifts to users?
- ADR for **migration playbook** — formal escape plan from Supabase, when/why we'd execute it.
- ADR for **observability stack** — once Sentry + Railway logs aren't enough (probably around year 2).

## Sign-off

Corrections from this audit are reflected in the following docs, which now reflect the final state of decisions:

- [ADR 0001](./0001-multi-tenancy.md) — RLS template updated
- [ADR 0002](./0002-backend-stack.md) — hybrid authz pattern
- [ADR 0003](./0003-infrastructure.md) — Realtime cost note + JWT rotation policy
- [ADR 0005](./0005-repo-structure.md) — `.gitattributes` for generated files
- [ADR 0006](./0006-development-toolchain.md) — Supavisor pooler + `supabase start` for tests
- [06-erd.md](../06-erd.md) — multiple schema corrections
- [08-matching-spec.md](../08-matching-spec.md) — `algorithm_version` added
- [09-csv-roster-spec.md](../09-csv-roster-spec.md) — streaming parse requirement
- [10-api-surface.md](../10-api-surface.md) — conversation deletion clarified
