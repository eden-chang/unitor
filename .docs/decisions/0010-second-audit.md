# ADR 0010 — Second senior audit: hardening before any user traffic

- **Status:** Accepted
- **Date:** 2026-05-17
- **Supersedes:** Amends ADRs 0002, 0003, 0006, 0008
- **Superseded by:** —

## Context

After the profile-CRUD branch landed, a fresh senior pass over the entire backend surfaced a handful of latent bugs and operational gaps. They didn't show up yet because:

- The only RLS-respecting endpoint was `GET /health/ready` (single read, single commit).
- CORS was only ever hit from `http://localhost:5173` in dev.
- The JWT verifier ran against tokens we minted ourselves with matching audience.

In other words, the surface area hadn't grown enough to trip the bugs. Closing them now is cheaper than after they ship.

This ADR records the findings, the fixes, and what to watch for next.

## Findings (severity × count)

| Severity | # | Topic |
|---|---|---|
| 🔴 Critical | 3 | Transaction lifecycle, CORS regex, JWT issuer |
| 🟡 Important | 4 | Sentry PII scrub, Settings secret hardening, request-id observability, CI gap |
| 🟢 Minor | 3 | DELETE profile, application_name on DB connections, Makefile DX |

## Corrections applied

### 🔴 1. Session/transaction lifecycle (latent bug)

`user_session` and `admin_session` set the Postgres role + JWT claims via `SET LOCAL` + `set_config(..., is_local=true)` (per ADR 0002). Both settings are **transaction-scoped**. Routes that called `await db.commit()` and then ran another query in the same session would lose their RLS context — the next query would run with the connection's default role and no JWT claims.

Nothing in the current code path triggers this because each route does its work and commits once at the end. But the bug is latent and would bite the first time someone wrote a route that committed mid-flow.

**Fix.** Made both context managers own the transaction via `async with session.begin():`. The body of the `async with` is now exactly one transaction; the manager commits on success, rolls back on exception. **Routes no longer call `await db.commit()`** — and any that does will fail-loud because `begin()` won't allow nested commits. Auth + profile routes were updated. Docstring on `session.py` explains the rule.

### 🔴 2. CORS wildcard origin (production-breaking)

`CORS_ALLOWED_ORIGINS=https://*.vercel.app` was being passed verbatim to Starlette's `allow_origins`, which is **exact-string match only**. Every Vercel preview URL would have been silently rejected as a CORS violation.

**Fix.** Added `app.config.build_cors_origin_regex()` which splits the comma-separated list into exact origins and a compiled regex for wildcard entries. `*` translates to `[^.]+` so `https://*.vercel.app` matches `https://my-pr.vercel.app` but **not** `https://evil.vercel.app.attacker.com`. The regex is passed to Starlette's `allow_origin_regex`.

Tested manually with `curl -H "Origin: https://my-pr-42.vercel.app" OPTIONS` — the preflight now returns the matching origin.

### 🔴 3. JWT verification (security hardening)

`_decode_with` only checked the `aud` claim. A token with the right signature and audience but a wrong/absent `iss` (issuer) or `iat` (issued-at) would pass — that's well below what a production verifier should accept.

**Fix.** Tightened `_decode_with` to:

- Require `sub`, `exp`, `iat`, `iss`, `aud` to be present (PyJWT `require` option).
- Verify `iss` against `{SUPABASE_URL}/auth/v1` (Supabase's canonical issuer).
- Verify `iat` (rejects "issued in the future" trick from clock-skew adversaries).
- Make verification flags explicit instead of leaning on defaults that could change between PyJWT releases.

Also tightened `verify_cron_token` to use `secrets.compare_digest` for constant-time comparison — a non-secret cron token compared with `==` leaks bytes via timing.

New unit tests cover: well-formed, wrong audience, wrong issuer, expired, missing-sub, wrong signature, and a happy-path `get_current_user`.

### 🟡 4. Sentry PII scrubber (production safety)

`sentry_sdk.init` was set with `send_default_pii=False` but no `before_send` hook. User-controlled strings (bio, chat bodies, decline notes) routinely land in exception messages and breadcrumbs. With Resend + custom user-input flows in scope, anything that crashes would surface that content to Sentry.

**Fix.** New `app/observability.py` extracts logging + Sentry config out of `main.py` and adds `_sentry_before_send` that:

- Redacts known PII-bearing keys (`email`, `bio`, `comm_handle`, etc.).
- Regex-scrubs email addresses and JWTs from any string value (defense against PII landing in unexpected places like exception messages).

Walks the event recursively so nested breadcrumbs/extras are scrubbed too.

### 🟡 5. Settings secret hardening

All secret-bearing fields in `app.config.Settings` were typed as `str`. That meant a stray `print(settings)` or a log line dumping settings would emit the service-role key, DB password, JWT secret, etc.

**Fix.** Converted every secret field to `pydantic.SecretStr`:

- `DATABASE_URL`, `DATABASE_DIRECT_URL` (contain DB password)
- `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_SECRET_PREVIOUS`
- `CRON_TOKEN`
- `R2_SECRET_ACCESS_KEY`, `RESEND_API_KEY`, `SENTRY_DSN`

`SecretStr.__repr__` returns `SecretStr('**********')` and `model_dump()` masks them too. Read sites call `.get_secret_value()` explicitly at the point of use. Updated all four read sites (jwt, db/session, alembic env.py, scripts/seed_dev).

### 🟡 6. Request-ID middleware + structured logging

No correlation id on requests. Once Sentry was wired up there'd be no way to tie a Sentry event to a log line to a specific request.

**Fix.** New `app/middleware/request_id.py`:

- Reads `X-Request-Id` from the request (or mints a fresh UUIDv4 hex).
- Sanitizes client-provided ids (printable, no semicolons/commas, ≤64 chars).
- Binds it to `structlog.contextvars` so every log inside the request carries it.
- Tags it on the Sentry scope (`sentry_sdk.set_tag("request_id", …)`).
- Echoes it on the response and exposes it via CORS (`Access-Control-Expose-Headers`).

### 🟡 7. Backend CI (ADR 0006 compliance)

ADR 0006 said "every PR runs ruff + mypy + pytest + alembic dry-run." We didn't have a backend workflow at all — only the GitHub Pages frontend deploy.

**Fix.** Added `.github/workflows/backend.yml`. Runs on push to `main` and on PRs touching `backend/**`. Steps:

1. `uv sync --all-groups --frozen`
2. `ruff check`
3. `ruff format --check`
4. `mypy app`
5. `pytest tests/unit/`
6. Offline alembic chain check — confirms the migration graph resolves to a single head, no DB needed.

The `uv.lock` is the cache key. CI uses stub env vars (the unit tests don't actually dial the network).

### 🟢 8. `DELETE /api/v1/profiles/{id}` (completeness)

The schema supported deletion (CASCADE on profile child rows) and the prototype implies it (no UI yet but ADR 0008 mentions GDPR-style data deletion). No endpoint existed.

**Fix.** Added the endpoint + `delete_profile` service function + two unit tests (204 happy path, 404 missing). RLS already restricts to the owner.

### 🟢 9. `application_name` on DB connections

Supabase observability + DB-side `pg_stat_activity` couldn't tell apart traffic from our backend, the seed script, or random `psql` sessions.

**Fix.** Added `connect_args["server_settings"] = {"application_name": "unitor-backend"}` to the runtime engine. Cosmetic but free.

### 🟢 10. Makefile

`uv run alembic upgrade head`, `uv run pytest`, `uv run uvicorn …` are easy to mistype. Added a top-level Makefile with `be-*` (backend), `fe-*` (frontend), `check`, and `fix` targets, plus a `sql-conn` target that opens psql against `DATABASE_DIRECT_URL` (with `+asyncpg` stripped).

## Items deliberately deferred

- **Rate limiting** — covered in ADR 0006 as post-pilot. The `/auth/precheck` endpoint is a natural enumeration target; add `slowapi` before launch.
- **`selectinload` for profile children** — current `_hydrate` issues three queries. At our scale (≤8 skills, ≤20 slots, ≤5 links per profile) this is microseconds; not worth the abstraction yet.
- **Connection pool warmup at startup** — first request takes ~50ms extra to establish a pool connection. Acceptable for now.
- **OpenAPI → TypeScript regeneration in CI** — needs the frontend to actually consume the types first. The placeholder in `packages/api-types/` still works; we'll wire it up in step C.

## Items still to verify in production (no change yet)

- `pg_partman`/`pg_cron` actually run on Supabase Pro tier when we eventually upgrade — currently confirmed available on **Free**.
- Sentry `before_send` redactor catches whatever we throw at it — needs a real exception to land before we can validate.
- CORS regex behavior across other browsers — tested via curl; double-check from a real Vercel preview when the frontend gets deployed there.

## Sign-off

After this ADR:

- 28 unit tests passing (smoke 2 + auth 4 + profile 11 + jwt 8 + config 3).
- ruff lint clean. ruff format check clean. mypy strict clean.
- Manual verify against live Supabase: precheck, bootstrap, profile CRUD, request-id round-trip, CORS preflight to a Vercel-shaped origin.

Backend is now in a state where I'd feel OK letting a small pilot group hit it without losing sleep.
