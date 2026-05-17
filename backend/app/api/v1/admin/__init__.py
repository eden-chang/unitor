"""Admin / TA-only endpoints.

Modules under this package are the **only place** ``app.db.admin.admin_session``
may be imported. CI enforces this. See [ADR 0002] and [ADR 0009] §2.
"""
