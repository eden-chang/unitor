# ADR 0003 — Hosting, storage, email, observability vendors

- **Status:** Accepted
- **Date:** 2026-05-16
- **Supersedes:** —
- **Superseded by:** —

## Context

[ADR 0002](./0002-backend-stack.md) decided we run a React frontend, a FastAPI service, and a Supabase project. We now need to pick the actual hosting and supporting services. Priority order: **(1) low operational toil, (2) cheap at pilot scale, (3) clear upgrade path to higher scale, (4) no avoidable vendor lock-in for things we can't rewrite.**

## Decision

| Concern | Vendor | Tier (pilot) | Notes |
|---|---|---|---|
| Database, Auth, Realtime, optional Storage | **Supabase** | Free → Pro ($25/mo) when scheduled jobs needed | See "pg_cron caveat" below |
| Frontend hosting | **Vercel** | Hobby (free) | Static deploy; PR preview URLs; CDN built in |
| Backend hosting | **Railway** (primary) or **Fly.io** (alternate) | Railway Hobby (~$5/mo with credit) | Switch to Fly.io if egress or multi-region becomes relevant |
| File storage + CDN | **Cloudflare R2** + Cloudflare CDN | $0–5/mo | **Free egress** is the killer feature; profile photos served straight from CDN |
| Transactional email (non-auth) | **Resend** | Free up to 3k/month, $20 for 50k | TA reminder emails, deadline alerts, password-recovery-like flows that Supabase Auth doesn't cover |
| Error tracking | **Sentry** | Developer (free) | Backend + frontend |
| Logs | Railway/Fly built-in (stdout) | Free | Add Better Stack / Axiom later if we need search/retention |
| DNS, TLS | Cloudflare | Free | TLS termination at CDN, origin via Cloudflare proxy |

### Critical clarification: pg_cron tier

**`pg_cron` is only available on Supabase Pro tier and above.** Free tier does not expose it.

- **Pilot fallback**: A GitHub Actions cron workflow that `curl`s a signed FastAPI endpoint on a schedule. Free, ugly, sufficient.
- **Production**: pg_cron on Supabase Pro. Trade $25/month for not depending on GitHub Actions for production cron.

### Critical clarification: never use Supabase Storage for hot files

We're paying for Supabase's compute and database, not for object storage egress at retail prices. **All file storage flows through Cloudflare R2** because egress is free. Pattern:

- Frontend asks FastAPI for an "upload signed URL"; FastAPI returns an R2 presigned PUT URL.
- Browser uploads directly to R2.
- FastAPI receives the object key on success, stores it in Postgres.
- Display URL is `https://cdn.unitor.app/...` served from the CDN with R2 origin.

### Hosting comparison — pilot

| Component | Vercel | Railway | Fly.io | Render |
|---|---|---|---|---|
| Frontend (static) | ✅ best | works | works | works |
| FastAPI | ❌ function limits | ✅ easiest | ✅ cheapest free tier | works, but spin-down on free |
| Cron | ✅ Cron Jobs | ✅ via Railway cron | requires workaround | works |
| Cost (pilot) | $0 | ~$5 | $0–5 | $0 |
| Cost (steady state) | $0 (still free) | $5–20 | $5–15 | $7 |

**Pick:** Vercel for frontend, Railway for FastAPI for the pilot. Fly.io is the upgrade path when multi-region or per-VM cost optimization matters.

## Alternatives considered

| Option | Rejected because |
|---|---|
| **AWS/GCP from day one** | Massive setup tax. Three engineers we don't have. Pilot doesn't need ECS, RDS, CloudFront. Move there only if a customer's procurement forces it. |
| **Heroku** | Smaller free tier than Railway/Fly. No DX advantage. Salesforce ownership means uncertain future. |
| **Self-hosted Postgres on a VPS** | Backups, point-in-time recovery, monitoring all become our problem. Saves maybe $25/month and costs many hours per month. Bad trade. |
| **Backblaze B2 instead of R2** | Storage slightly cheaper but egress fees apply. R2's zero egress flips the comparison for any user-facing CDN traffic. |
| **AWS S3 + CloudFront** | More mature but more setup. R2 is API-compatible enough that we can switch to S3 in a day if needed. |
| **SendGrid / Postmark / Mailgun** | All fine. Resend has a cleaner DX and pricing, plus React Email integration. Easy to migrate to Postmark if Resend disappoints. |
| **Datadog / New Relic** | Overkill at this scale and ~$30/host/month for the cheapest plans. Sentry + Railway logs cover the relevant gaps. |

## Cost projections (USD/month)

| Phase | Frontend | Backend | Supabase | R2 | Email | Errors | Total |
|---|---|---|---|---|---|---|---|
| Pilot (1 university, 5 courses, ~500 users) | $0 | $0–5 | $0 | $0 | $0 | $0 | **$0–5** |
| Beta (5 universities, ~3k users) | $0 | $5 | $25 | $1 | $0 | $0 | **~$31** |
| Year 2 (15 universities, ~15k users) | $0 | $20 | $25 + $30 overages | $5 | $20 | $0 | **~$100** |
| Year 3 (50 universities, ~50k users) | $20 | $50 | $100–150 | $15 | $20 | $26 (Team) | **~$230–280** |
| Year 5 ceiling (200 universities, ~200k users) | $20 | $100–200 | $400–800 | $50 | $50 | $80 (Business) | **~$700–1,200** |

For comparison: a single mid-sized DevOps hire at this stage would be $7k+/month. The vendor stack is the right side of that arithmetic for years.

## Consequences

**Positive:**

- All managed services with free or near-free pilot tiers.
- Each piece is replaceable: Railway → Fly, R2 → S3, Resend → Postmark are all 1-day migrations.
- No infrastructure team needed for the foreseeable future.

**Negative / things to watch:**

- Multiple vendor dashboards to monitor and pay. Ops procedure: a single shared 1Password or Doppler vault for credentials; a runbook listing each vendor's status page.
- Free tiers can change. Treat $0 as "pleasantly subsidized for now," not "the steady state."
- Vendor outages: Supabase outages have happened. Mitigation: nightly logical dump to R2 (belt-and-suspenders backup), automated.

## Realtime cost — re-verified (per [ADR 0009](./0009-audit-corrections.md) §9)

The initial planning briefly worried that Supabase Realtime would force us onto the Team plan ($599/mo) at scale. The actual pricing math contradicts that. Recorded here for future reference.

| MAU | Concurrent (≈10%) | Channels/user | Total | Pro + overage | Team |
|---|---|---|---|---|---|
| 10k | 1,000 | 2 | 2,000 | $25 + $15 = **$40** | $599 |
| 50k | 5,000 | 2 | 10,000 | $25 + $95 = **$120** | $649 |
| 100k | 10,000 | 2 | 20,000 | $25 + $195 = **$220** | $649 |
| 500k | 50,000 | 2 | 100,000 | $25 + $995 = **$1,020** | $1,549 |

Pro + overages stays cheaper than Team plan up through ~500k MAU. We move to Team only when other Team-tier features become valuable (SLA, dedicated support, larger Postgres compute), not because of Realtime alone. Source: [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing).

## JWT secret rotation policy (added per [ADR 0009](./0009-audit-corrections.md) §14)

- **Cadence**: Rotate the Supabase JWT secret every 6 months. Rotate immediately if a leak is suspected.
- **Frontend**: Supabase JS SDK refetches the public verification material automatically; no client deploy needed.
- **Backend (FastAPI)**: keep two env vars during the rotation window — `SUPABASE_JWT_SECRET` (new) and `SUPABASE_JWT_SECRET_PREVIOUS` (old). The JWT-verification dependency tries the new one first, falls back to the old one. After 24 hours, remove the previous-value env var.
- **Audit trail**: every rotation logs `action = "SECRET_ROTATED"` to `audit_log` (actor = the human operator).
- **Tooling**: a short runbook step in `infra/runbooks/jwt-rotation.md` documents the click-path in Supabase + the env-var update in Railway/Vercel.

## Implementation rules

1. **All secrets in environment variables.** Dev: `.env` file (gitignored). Prod: each platform's secret manager (Vercel env, Railway env, Supabase env).
2. **CDN for all user-visible files.** Never serve images directly from Supabase or Railway.
3. **Belt-and-suspenders DB backup.** Supabase PITR plus a nightly `pg_dump` to R2. Test restore quarterly.
4. **Status page subscriptions.** Subscribe the team to Supabase, Vercel, Railway, Cloudflare, Resend status pages from day one.
5. **Vendor lock-in audit.** Once a quarter, list everything that would break if vendor X disappeared overnight. Update the runbook for each.
6. **JWT secret rotation.** Every 6 months on a calendar reminder; immediately on suspected leak. Per "JWT secret rotation policy" above.
