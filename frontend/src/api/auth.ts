/**
 * Auth endpoint wrappers.
 *
 * `precheck` is the only unauthenticated call. Everything else assumes a
 * Supabase session is in the JWT store (the `apiFetch` helper grabs it).
 */

import { apiFetch } from "@/api/client";
import type {
  BootstrapResponse,
  EnrollmentRead,
  PrecheckResponse,
  UserRead,
} from "@/types/api";

/**
 * Public roster lookup. The only unauthenticated call in the API.
 *
 * Returns `{ on_roster, course_count }` — deliberately doesn't reveal
 * course names to prevent enumeration of the roster from an anonymous
 * caller. See `backend/app/schemas/auth.py` for the privacy rationale.
 */
export function precheck(email: string): Promise<PrecheckResponse> {
  return apiFetch<PrecheckResponse>("/auth/precheck", {
    method: "POST",
    body: { email },
    unauthenticated: true,
  });
}

/**
 * Authenticated bootstrap. Idempotent. Called once per Supabase sign-in
 * to materialise the `public.users` row and return the caller's existing
 * enrollments. Does *not* create enrollments — `join` is the only way
 * to enter a course.
 */
export function bootstrap(): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>("/auth/bootstrap", { method: "POST" });
}

/**
 * Join a course using its invite code. On success creates a single
 * enrollment using the TA-assigned section. Errors (mapped through
 * `ApiError`): `INVITE_CODE_NOT_FOUND`, `NOT_IN_ROSTER`, `ALREADY_ENROLLED`.
 */
export function join(inviteCode: string): Promise<EnrollmentRead> {
  return apiFetch<EnrollmentRead>("/auth/join", {
    method: "POST",
    body: { invite_code: inviteCode },
  });
}

/**
 * Update the caller's `display_name`. Used by the profile wizard's step 0.
 */
export function updateMe(displayName: string): Promise<UserRead> {
  return apiFetch<UserRead>("/users/me", {
    method: "PATCH",
    body: { display_name: displayName },
  });
}
