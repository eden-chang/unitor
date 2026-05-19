/**
 * Auth endpoint wrappers.
 *
 * Includes ``precheck`` (public) + ``bootstrap`` (authenticated). The
 * ``join`` wrapper will be added in step C alongside the backend split.
 */

import { apiFetch } from "@/api/client";
import type { BootstrapResponse, PrecheckResponse } from "@/types/api";

/**
 * Public roster lookup. The only unauthenticated call in the API.
 *
 * Returns ``{ on_roster, course_count }`` — deliberately doesn't reveal
 * course names to prevent enumeration of the roster from an anonymous
 * caller. See ``backend/app/schemas/auth.py`` for the privacy rationale.
 */
export function precheck(email: string): Promise<PrecheckResponse> {
  return apiFetch<PrecheckResponse>("/auth/precheck", {
    method: "POST",
    body: { email },
    unauthenticated: true,
  });
}

/**
 * Authenticated bootstrap. Idempotent. Called once after each Supabase
 * sign-in to materialise the ``public.users`` row and list the caller's
 * existing enrollments.
 */
export function bootstrap(): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>("/auth/bootstrap", { method: "POST" });
}
