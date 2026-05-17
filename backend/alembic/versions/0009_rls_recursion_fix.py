"""fix infinite recursion in enrollments_read RLS policy

The original `enrollments_read` policy in migration 0002 looked up the
caller's courses by SELECTing from `enrollments` itself, which makes
Postgres re-apply RLS to that subquery, which calls the same policy,
which... recurses. PG detects it and raises
``InvalidObjectDefinitionError: infinite recursion detected in policy``.

This shows up the moment any user-session query touches a table whose
own policy joins `enrollments` (which is most of them, given the
multi-tenancy model).

Fix: a tiny SECURITY DEFINER helper, ``public.my_course_ids()``, that
bypasses RLS to return the caller's active course IDs. The policy then
calls the helper instead of doing a recursive subquery on `enrollments`.

Other policies that reference `enrollments` are unaffected because the
recursion was specifically on `enrollments` re-applying its own policy
during the subquery. Once that loop is broken, all dependents work.

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009"
down_revision: str | Sequence[str] | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # SECURITY DEFINER means the function runs as its owner (postgres role
    # in Supabase migration context), which bypasses RLS. STABLE means
    # Postgres can call it once per query and cache. SET search_path
    # locks down resolution to known schemas (defense against search_path
    # hijacking inside SECURITY DEFINER).
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION public.my_course_ids()
            RETURNS SETOF uuid
            LANGUAGE sql STABLE SECURITY DEFINER
            SET search_path = public, auth
            AS $$
                SELECT course_id
                FROM public.enrollments
                WHERE user_id = auth.uid()
                  AND deleted_at IS NULL
            $$;
            """
        )
    )
    # Grant execute to the application roles. Supabase auth issues JWTs
    # whose role claim is `authenticated`; anon role isn't expected to
    # use this but we grant it too for symmetry.
    op.execute(sa.text("GRANT EXECUTE ON FUNCTION public.my_course_ids() TO authenticated"))
    op.execute(sa.text("GRANT EXECUTE ON FUNCTION public.my_course_ids() TO anon"))

    # Replace the recursive policy. New version: own rows + rows in
    # courses we're enrolled in, computed through the helper.
    op.execute(sa.text("DROP POLICY IF EXISTS enrollments_read ON enrollments"))
    op.execute(
        sa.text(
            """
            CREATE POLICY enrollments_read ON enrollments FOR SELECT
              USING (
                deleted_at IS NULL
                AND (
                  user_id = auth.uid()
                  OR course_id IN (SELECT public.my_course_ids())
                )
              );
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP POLICY IF EXISTS enrollments_read ON enrollments"))
    op.execute(
        sa.text(
            """
            CREATE POLICY enrollments_read ON enrollments FOR SELECT
              USING (
                deleted_at IS NULL
                AND (
                  user_id = auth.uid()
                  OR course_id IN (
                    SELECT course_id FROM enrollments
                    WHERE user_id = auth.uid() AND deleted_at IS NULL
                  )
                )
              );
            """
        )
    )
    op.execute(sa.text("DROP FUNCTION IF EXISTS public.my_course_ids()"))
