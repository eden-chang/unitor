"""Cron-triggered job handlers.

Each handler is a FastAPI endpoint under ``/api/v1/cron/...`` that is
invoked by ``pg_cron`` (Supabase Pro) or by GitHub Actions cron in pilot.
Authentication uses the shared ``X-Cron-Token`` header — see
``app.auth.jwt.verify_cron_token``.

This package may import ``app.db.admin.admin_session`` (per the lint rule
in [ADR 0002]).
"""
