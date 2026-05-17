# ADR 0004 — Data strategy: hot/cold split, partitioning, compatibility caching

- **Status:** Accepted
- **Date:** 2026-05-16
- **Supersedes:** —
- **Superseded by:** —

## Context

[ADR 0001](./0001-multi-tenancy.md) locks us into a single Postgres. Within that database, different data types have very different size, lifetime, and access patterns. Treating them uniformly will burn cash, especially on bandwidth and storage egress. Realistic data inventory:

| Data type | Size per row | Rows at 5-year ceiling | Total | Access pattern |
|---|---|---|---|---|
| `users`, `universities`, `courses` | ≤1 KB | ≤10k | < 50 MB | Hot, forever |
| `enrollments`, `profiles`, `groups`, `group_memberships` | ~5 KB | ≤1M | < 5 GB | Hot during course, cool after |
| `requests`, `applications` | ~1 KB | ≤10M | < 10 GB | Hot during course, archive after |
| `messages` | ~200 bytes | 50–100M | 10–20 GB | Hot during course, ~0 reads after course end |
| `notifications` | ~500 bytes | 100M+ | ~50 GB | Hot for ~30 days, then disposable |
| `compatibility_cache` | ~100 bytes | ≤50M | ~5 GB | Recomputed when profile changes |
| Profile photos | ~50–500 KB | ≤200k | ~50 GB | Constant CDN delivery |

The biggest cost levers are:

- **Messages** (largest growing table, low long-term read value).
- **Profile photos** (largest egress, served on every page).
- **Compatibility scores** (recomputation cost vs storage cost).

## Decision

### 1. Hot/cold tier policy

Each data type is assigned a tier and a lifecycle.

| Data | Tier | Lifecycle |
|---|---|---|
| `users`, `universities`, `courses` | **Hot (Postgres)** | Forever |
| `enrollments`, `profiles`, `groups`, `group_memberships`, `roster_entries` | **Hot (Postgres)** | Forever; small enough |
| `requests`, `applications` | **Hot (Postgres)** | Forever; small enough; useful for audit |
| `messages` | **Hot (Postgres, partitioned monthly)** during course; **Cold (R2 JSON dump)** 6 months after course end | Partition dropped from Postgres post-archive |
| `notifications` | **Hot (Postgres)** for 30 days, then **deleted** | No archive: notifications are transient by design |
| `compatibility_cache` | **Hot (Postgres)** | Cleared on course end |
| Profile photos | **R2 + Cloudflare CDN** from day one | Forever; deleted when user deletes account |
| Audit log (TA destructive actions) | **Hot (Postgres)** then **Cold (R2)** after 1 year | 7-year retention for compliance |
| CSV upload originals | **Cold (R2)** from upload | 7-year retention for audit |

### 2. Partitioning policy

Only **`messages`** is partitioned. Everything else is comfortably under 100M rows at the ceiling.

- Partition by `RANGE (created_at)`, monthly partitions.
- Tool: `pg_partman` extension (available on Supabase Pro).
- Retention: keep current month + previous 12 months hot. After that, dump partitions to R2 (one JSON file per partition per course) and `DETACH + DROP` the partition.
- Restore path: lazy load on demand. If a user clicks "show messages from last year," FastAPI fetches the JSON dump from R2 and serves it read-only.

Why no other tables partitioned: even at the 5-year ceiling, no other table exceeds 100M rows. Postgres handles that with normal indexes.

### 3. Compatibility scoring: lazy + cached

Reject pre-computing all pairs. Reject computing on every read. Use **lazy compute + cache + invalidate**.

- Table: `compatibility_cache (viewer_user_id, target_user_id, course_id, score, sub_scores JSONB, reasons TEXT[], warnings TEXT[], computed_at TIMESTAMPTZ)`. Primary key: `(viewer_user_id, target_user_id, course_id)`.
- Read path: when a user opens Discovery, FastAPI checks the cache for `(viewer, *, course)` rows. For any missing/stale targets, compute in batch (single Postgres trip per Discovery load).
- Invalidation: a Postgres trigger on `profiles` updates marks `computed_at = NULL` for any cache row touching that user. Next read re-computes.
- Capacity check: 5,000 courses × 100 students × 100 students = 50M rows × ~100 bytes = ~5 GB. Cheap.

### 4. Notifications: aggressive deletion

- Cron job daily: delete `notifications` older than 30 days.
- Read-receipt sync is *not* needed across devices for our use case.
- This keeps the table small enough to ignore.

### 5. Profile photos: never through Supabase Storage

- Upload flow: frontend → FastAPI (signed URL) → direct PUT to R2 → frontend confirms key with FastAPI.
- Serve flow: `https://cdn.unitor.app/profiles/{user_id}/{image_id}.webp` via Cloudflare CDN, cached aggressively.
- Image processing (resize, WebP convert) at upload time by a Cloudflare Worker or FastAPI endpoint.

### 6. Read-path optimizations baked in from day one

- **Discovery pagination**: cursor-based on `(compat_score DESC, user_id ASC)`, 20 per page. Never load the full course.
- **Realtime subscriptions**: subscribe per conversation, not per course. A user with two active conversations holds two channels, not one giant course channel.
- **Indexes**: every table's first index is on its tenancy key (`course_id`). Composite indexes for common filters (e.g., `(course_id, status, last_active_at DESC)`).

## Alternatives considered

| Option | Rejected because |
|---|---|
| **Keep everything in Postgres forever** | At ceiling, ~100 GB. Affordable, but Postgres storage is 6–10× more expensive than R2 per GB. Tier separation pays for itself by year 2. |
| **Precompute all compatibility pairs nightly** | Wastes compute for pairs no one views. The cache approach gets the same UX with less work. |
| **Compute compatibility on every Discovery load** | Acceptable at 50 students/course, painful at 500. We don't yet know how courses will grow; cache decouples this concern from the algorithm. |
| **Use Supabase Storage for images** | Egress charged at $0.09/GB. At 1 TB/month CDN traffic this is $90/month vs $0 on R2. |
| **Time-series DB (Timescale) for messages** | Postgres + `pg_partman` is sufficient and avoids another technology. |

## Consequences

**Positive:**

- Costs are dominated by usage tiers we can actually pay for, not by retail egress.
- Each table's growth pattern is bounded by an explicit policy.
- Cold storage is a simple JSON dump per partition — no proprietary format, easy to inspect, easy to restore.

**Negative / things to watch:**

- Restoring an old message thread requires R2 fetch, which is slower than a hot DB query. Acceptable because it's rare.
- Partitioning adds operational complexity to the `messages` table (creating partitions, dropping partitions). The `pg_partman` extension automates this but must be configured correctly.
- Cache invalidation requires correctly-written triggers. A bug here shows stale scores; the worst-case fix is `DELETE FROM compatibility_cache WHERE course_id = ?` to force recomputation.

## Implementation rules

1. **Tenancy key first** on every table's first index.
2. **Partitioning** only on `messages`. Don't add it to other tables unless they exceed 50M rows.
3. **Invalidation triggers** are part of the schema migration that introduces a cache table.
4. **Archive automation** runs on a schedule (monthly cron). Dry-run mode for the first two runs; verify dump integrity before enabling drop.
5. **Photo serving never hits Postgres or Supabase Storage.** Codify in code review.
6. **Retention defaults**: notifications 30d, compatibility cache invalidated per profile-change, messages 12 months hot, CSV/audit 7 years cold. Any deviation requires an ADR or comment.
