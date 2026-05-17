"""Auth-flow endpoints.

This package is one of the *legal* import sites for
``app.db.admin.admin_session`` per ADR 0002. Bootstrap creates the rows
that *make* RLS work for the user, so it must run with service-role
access.
"""

from app.api.v1.auth.routes import router

__all__ = ["router"]
