"""compatibility_cache: viewer-own write policy + invalidation triggers

Two pieces of operational hardening for the matching service introduced
by task F:

1. INSERT and UPDATE policies for ``compatibility_cache``. Migration
   0007 only created a SELECT policy ("viewer reads own rows"), which
   would block the upsert path that runs under ``user_session``.
   The new policies let the viewer write rows where they are the
   viewer; the scoring inputs come from server-side service code, so
   there is no integrity concern with letting authenticated users
   memoize their own scores.

2. Trigger functions that NULL ``computed_at`` on cache rows involving
   any user whose ``profiles`` / ``profile_skills`` /
   ``profile_schedule_slots`` rows just changed. Spec §9.

The triggers fire AFTER INSERT/UPDATE/DELETE. They are server-side, so
they invalidate correctly regardless of which API path mutated the
profile. Pure cache invalidation lives at the DB layer; the service
code only deals with the "stale → recompute" half.

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-18

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010"
down_revision: str | Sequence[str] | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Cache write policies (viewer can INSERT/UPDATE rows where they are
    # the viewer). Migration 0007 already enabled RLS on the table.
    # ------------------------------------------------------------------
    op.execute(
        sa.text(
            """
            CREATE POLICY compatibility_cache_write_own_insert
              ON compatibility_cache FOR INSERT
              WITH CHECK (viewer_user_id = auth.uid());
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE POLICY compatibility_cache_write_own_update
              ON compatibility_cache FOR UPDATE
              USING (viewer_user_id = auth.uid())
              WITH CHECK (viewer_user_id = auth.uid());
            """
        )
    )

    # ------------------------------------------------------------------
    # Invalidation trigger: when any of the source tables changes for a
    # given user, mark every cache row touching that user as stale.
    #
    # We resolve "affected user" off of the changing row:
    #   - profiles:         enrollment.user_id of the changed profile.
    #   - profile_skills:   profile.enrollment.user_id of the changed row.
    #   - profile_schedule_slots: same as profile_skills.
    #
    # SECURITY DEFINER so the trigger can write to compatibility_cache
    # even when fired under the authenticated role (RLS would otherwise
    # block updating rows where the user isn't the viewer; here we need
    # to NULL rows where they're the *target* too).
    # ------------------------------------------------------------------
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION public.invalidate_compat_for_user(
                affected_user_id uuid
            )
            RETURNS void
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public
            AS $$
                UPDATE public.compatibility_cache
                SET computed_at = NULL
                WHERE viewer_user_id = affected_user_id
                   OR target_user_id = affected_user_id;
            $$;
            """
        )
    )

    # profiles: row carries enrollment_id; resolve to user_id once.
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION public.invalidate_compat_on_profile_change()
            RETURNS trigger
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $$
            DECLARE
                affected uuid;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    SELECT user_id INTO affected FROM public.enrollments
                      WHERE id = OLD.enrollment_id;
                ELSE
                    SELECT user_id INTO affected FROM public.enrollments
                      WHERE id = NEW.enrollment_id;
                END IF;
                IF affected IS NOT NULL THEN
                    PERFORM public.invalidate_compat_for_user(affected);
                END IF;
                RETURN NULL;
            END;
            $$;
            """
        )
    )

    # profile_skills / profile_schedule_slots: hop through profiles to
    # find enrollment → user.
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION public.invalidate_compat_on_profile_child_change()
            RETURNS trigger
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $$
            DECLARE
                pid uuid;
                affected uuid;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    pid := OLD.profile_id;
                ELSE
                    pid := NEW.profile_id;
                END IF;
                SELECT e.user_id INTO affected
                  FROM public.profiles p
                  JOIN public.enrollments e ON e.id = p.enrollment_id
                  WHERE p.id = pid;
                IF affected IS NOT NULL THEN
                    PERFORM public.invalidate_compat_for_user(affected);
                END IF;
                RETURN NULL;
            END;
            $$;
            """
        )
    )

    op.execute(
        sa.text(
            """
            CREATE TRIGGER trg_invalidate_compat_profiles
              AFTER INSERT OR UPDATE OR DELETE ON public.profiles
              FOR EACH ROW
              EXECUTE FUNCTION public.invalidate_compat_on_profile_change();
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE TRIGGER trg_invalidate_compat_skills
              AFTER INSERT OR UPDATE OR DELETE ON public.profile_skills
              FOR EACH ROW
              EXECUTE FUNCTION public.invalidate_compat_on_profile_child_change();
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE TRIGGER trg_invalidate_compat_schedule
              AFTER INSERT OR UPDATE OR DELETE ON public.profile_schedule_slots
              FOR EACH ROW
              EXECUTE FUNCTION public.invalidate_compat_on_profile_child_change();
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DROP TRIGGER IF EXISTS trg_invalidate_compat_schedule ON public.profile_schedule_slots"
        )
    )
    op.execute(
        sa.text("DROP TRIGGER IF EXISTS trg_invalidate_compat_skills ON public.profile_skills")
    )
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_invalidate_compat_profiles ON public.profiles"))
    op.execute(
        sa.text("DROP FUNCTION IF EXISTS public.invalidate_compat_on_profile_child_change()")
    )
    op.execute(sa.text("DROP FUNCTION IF EXISTS public.invalidate_compat_on_profile_change()"))
    op.execute(sa.text("DROP FUNCTION IF EXISTS public.invalidate_compat_for_user(uuid)"))
    op.execute(
        sa.text("DROP POLICY IF EXISTS compatibility_cache_write_own_update ON compatibility_cache")
    )
    op.execute(
        sa.text("DROP POLICY IF EXISTS compatibility_cache_write_own_insert ON compatibility_cache")
    )
