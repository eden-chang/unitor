# ADR 0008 — Cross-cutting conventions

- **Status:** Accepted (default-recommendations; subject to user review)
- **Date:** 2026-05-16
- **Supersedes:** —
- **Superseded by:** —

## Context

Small conventions that get reused across every table, every endpoint, every UI string. Decide once now; never re-litigate. Each is small enough that no separate ADR is needed.

## Decision summary

| # | Concern | Choice |
|---|---|---|
| 1 | Primary key type | **UUIDv7** (time-orderable, 128-bit, generated app-side) |
| 2 | Timestamps | **`timestamptz` columns, UTC always**; ISO 8601 over the wire |
| 3 | Error response shape | **`{ code, message, details? }`** with stable `SCREAMING_SNAKE_CASE` `code` |
| 4 | Soft delete | **Applied to: `users`, `enrollments`, `groups`, `messages`**. Hard delete everywhere else |
| 5 | Timezone per course | **`courses.timezone` column** (IANA name); display rendered in user's local tz |
| 6 | Currency / counts / weights | No money. Counts as `int`. Weights as `numeric(5,4)` for matching coefficients |
| 7 | Enum representation in DB | **Postgres `enum` types** (not text + check constraint) |
| 8 | Casing of API fields | **`snake_case` in JSON**, matches Python and SQL conventions |
| 9 | Default sort order | **Newest first** unless explicitly otherwise (created_at DESC) |
| 10 | Soft delete reads | Filtered out by default at the query layer; **deleted rows never reach the frontend** |

## 1. Primary keys — UUIDv7

All primary keys are UUIDv7.

### Why UUIDv7 over alternatives

- **vs UUIDv4** — Same uniqueness, but UUIDv7 is time-ordered. B-tree inserts at the end of the index (cheap) instead of random positions (causes page splits). Critical for high-write tables (`messages`, `notifications`).
- **vs sequential integers (`bigint`)** — UUIDs don't leak business volume to clients ("user #2017" tells you how many users exist). Useful for security and competitive reasons.
- **vs ULID / KSUID / NanoID** — UUIDv7 is now in the RFC 9562 standard. Postgres handles it natively via the `uuidv7` SQL function (added in pg16 / available via extension on older versions). Library support across Python and TypeScript is broad.

### Application

- Generation: app-side, not in DB defaults, so we can include the ID in the request and trace it through logs.
- Format on the wire: canonical 36-char hyphenated form. No base64.
- Storage: native `uuid` Postgres type.

### Trade-off accepted

- 16 bytes per ID instead of 8 for `bigint`. Negligible at our scale.
- Older tools may display UUIDs as opaque blobs. Acceptable.

## 2. Timestamps — `timestamptz` UTC, ISO 8601 over the wire

Every timestamp column is `timestamptz`. Every value stored is in UTC. Every value over the API is an ISO 8601 string with `Z` suffix.

### Rules

- **Storage**: `timestamptz` (which Postgres normalizes to UTC). Never use `timestamp` (no zone) for real data.
- **API**: ISO 8601 with `Z`. Example: `"2026-05-16T14:30:00.000Z"`.
- **Display**: frontend converts UTC to the user's browser timezone for display. The course's timezone (see §5) is used for deadlines and TA-facing dashboards.
- **Server clocks**: assume UTC; `TZ=UTC` env var on every backend container.
- **"Now" in tests**: inject a clock dependency. No `datetime.now()` calls in business logic.

### Trade-off accepted

- Slight complexity: deadlines need both a UTC instant *and* the course timezone for display ("midnight Toronto time" is a different UTC instant than "midnight London time").

## 3. Error response shape — `{ code, message, details? }`

Every API error returns this exact JSON shape:

```json
{
  "code": "GROUP_FULL",
  "message": "This group is at capacity (6/6).",
  "details": { "group_id": "0190...", "max_size": 6 }
}
```

### Rules

- `code` is a stable, machine-readable identifier in `SCREAMING_SNAKE_CASE`. Never localized. The frontend branches on `code`.
- `message` is human-readable English. Eventually localizable, but always passed through.
- `details` is optional, structured supplementary data (object). Frontend may consume it for richer error UI.
- HTTP status codes are correct (4xx for client errors, 5xx for server errors), but the `code` is the source of truth for branching.

### Canonical codes (extend as features land)

| Code | When |
|---|---|
| `AUTH_REQUIRED` | No JWT or invalid JWT |
| `AUTH_FORBIDDEN` | JWT valid, but user lacks permission |
| `VALIDATION_FAILED` | Pydantic validation error; `details.errors[]` follows |
| `NOT_FOUND` | Referenced resource doesn't exist |
| `ROSTER_EMAIL_NOT_FOUND` | Signup email not in any course's roster |
| `ROSTER_DUPLICATE_EMAIL` | CSV import has same email twice |
| `COURSE_INVITE_INVALID` | Invite code doesn't match any course |
| `GROUP_FULL` | Tried to join a group at max size |
| `GROUP_NOT_RECRUITING` | Tried to apply to a non-listed group |
| `REQUEST_ALREADY_PENDING` | Tried to send a duplicate request |
| `REQUEST_EXPIRED` | Tried to act on an expired request |
| `LEADER_ONLY` | Action restricted to group leader |
| `RATE_LIMITED` | Throttled |
| `INTERNAL_ERROR` | Catch-all (with Sentry ID in `details.sentry_id`) |

### Trade-off accepted

- Slightly verbose for trivial errors. Pays back in frontend branching simplicity.

## 4. Soft delete — applied only where audit matters

Only these tables have a `deleted_at timestamptz` column. Everything else is hard delete.

| Table | Soft delete? | Reason |
|---|---|---|
| `users` | ✅ | Legal/audit; preserve referential integrity for past groups |
| `enrollments` | ✅ | Past course participation must remain auditable |
| `groups` | ✅ | Group history matters for TA dashboards |
| `messages` | ✅ | Moderation: deleted message should be marked "deleted" not vanish |
| `notifications` | ❌ | Transient; hard delete after 30 days |
| `requests`, `applications` | ❌ | Status (`withdrawn`, `declined`) tells the story; no need for `deleted_at` |
| `profiles`, `profile_*` | ❌ | Replaced wholesale on edit; no audit value in soft delete |
| `compatibility_cache` | ❌ | Disposable cache |
| `audit_log` | ❌ | Audit log is itself the audit; never deleted |
| `roster_entries` | ❌ | If TA removes, it's removed. (Audit log captures the removal.) |
| `conversations` | ❌ | "Delete conversation" is per-user (a participant leaves), not the conversation itself |

### Rules

- All queries from the application layer filter `WHERE deleted_at IS NULL` by default. The ORM models include a `soft_delete()` method and a default scope.
- Deletion is via `UPDATE deleted_at = now()` plus any cascading soft-deletes the business logic requires (e.g., deleting a user soft-deletes their `group_memberships`).
- "Hard delete on user request" (GDPR / FERPA) is a **separate destructive op** that overrides soft delete: actually `DELETE` rows, replace with anonymized placeholders where referenced. Tracked in `audit_log`.

### Trade-off accepted

- Default scope filtering is easy to forget when writing ad-hoc queries. Mitigation: use the ORM models, not raw SQL, in application code.

## 5. Timezone per course

`courses.timezone` is an IANA timezone name (e.g., `"America/Toronto"`). Required, not nullable.

### Why per-course

- A university can run courses in multiple campuses across timezones (e.g., NYU NY vs NYU Abu Dhabi).
- Deadlines are wall-clock times in the course's timezone, not UTC. "March 15 at 11:59 PM Toronto" is the actual deadline.

### Application

- Storage: ISO timestamps in UTC; the course timezone is metadata.
- Display: TA-facing screens render in the course timezone. Student-facing screens render in the browser's local timezone, with the course timezone shown as a label ("Deadline: Mar 15, 11:59 PM Toronto / 8:59 PM your time").

## 6. Numeric types

| Use case | Type | Example |
|---|---|---|
| Counts (group size, member count, score 0–100) | `int` (`integer`) | `member_count = 4` |
| Larger counts (notifications generated cumulative) | `bigint` | — |
| Matching algorithm weights | `numeric(5,4)` (4 decimal places) | `0.4500` |
| Compatibility score sub-components | `int 0–100` | — |
| Coordinates (none yet) | — | — |
| Money (none yet) | — | — |

No `float`/`double` anywhere. (Floats in finance/scoring code lead to subtle bugs.)

## 7. Enums — Postgres native types

Status fields use Postgres `enum` types, not free-form text.

```sql
CREATE TYPE enrollment_role AS ENUM ('student', 'ta', 'instructor');
CREATE TYPE group_state AS ENUM ('forming', 'confirming', 'confirmed', 'disbanded');
CREATE TYPE request_status AS ENUM ('pending', 'replied', 'accepted', 'declined', 'withdrawn', 'expired');
```

### Why enums over `text` + `CHECK (value IN (...))`

- Self-documenting in `\d table` output.
- Postgres optimizer treats enum equality as int comparison internally — faster on huge tables.
- Adding a new value: `ALTER TYPE ... ADD VALUE ...` (additive, safe). Removing a value requires a migration with explicit `UPDATE` first.

### Trade-off accepted

- Renaming an enum value is migration-painful. Mitigation: pick values carefully now, and prefer adding new ones to renaming old ones.

## 8. JSON casing — `snake_case`

All API request and response bodies use `snake_case` keys.

```json
{ "user_id": "...", "course_id": "...", "created_at": "..." }
```

Matches Python convention and SQL convention. Frontend mapping to camelCase happens at the TS-side boundary if desired, but the wire format stays snake. Pydantic auto-generates from the model attribute names; no manual aliases needed.

## 9. Default sort

When a list endpoint doesn't specify ordering: **newest first** (`created_at DESC`, with `id DESC` tiebreaker for time-ordered IDs like UUIDv7).

Exceptions are explicit:
- Discovery: `compat_score DESC, last_active_at DESC, id ASC`.
- Conversation list: `last_message_at DESC NULLS LAST`.
- TA reports: per-report; documented in [`../10-api-surface.md`](../10-api-surface.md).

## 10. Soft delete reads

Deleted rows are **filtered at the data-access layer**. They do not leak to the frontend through API responses. The only exception is admin/audit endpoints that explicitly opt in (e.g., `?include_deleted=true` for a TA viewing past groups).

## Open follow-ups

- I18N strategy: deferred until after pilot. English-only for now.
- Accessibility audit: deferred until after pilot.
- Telemetry events: deferred. When we introduce them, the event names will follow `SCREAMING_SNAKE_CASE` matching error codes.
