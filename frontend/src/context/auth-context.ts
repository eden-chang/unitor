/**
 * Auth context object + hook.
 *
 * Lives in its own file (separate from `AuthContext.tsx`) so the
 * provider file only exports a component — required for Vite's fast
 * refresh / HMR.
 */

import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

import type { ApiError } from "@/api/client";
import type { EnrollmentRead, UserRead } from "@/types/api";

export interface AuthContextValue {
  /** Supabase session — `null` when signed out, undefined while loading. */
  session: Session | null;
  /** True while the initial session hydration is in flight. */
  isSessionLoading: boolean;
  /** Convenience: `session !== null`. */
  isAuthenticated: boolean;

  /** Backend user row. `null` until bootstrap finishes or if no session. */
  user: UserRead | null;
  /** Enrollments returned by bootstrap. Empty list ⇒ student hasn't joined a course. */
  enrollments: EnrollmentRead[];
  /** True while the bootstrap query is loading for an authenticated session. */
  isBootstrapLoading: boolean;
  /** Last bootstrap error (typed `ApiError`), if any. */
  bootstrapError: ApiError | null;

  /**
   * Send a magic link to `email`. Resolves once Supabase has accepted the
   * OTP request; the user then completes auth via the email link.
   * Throws `ApiError` (code `NOT_IN_ROSTER`) if the roster precheck fails.
   */
  signIn: (email: string) => Promise<void>;
  /** Sign out and clear cached bootstrap. */
  signOut: () => Promise<void>;
  /**
   * Join a course by invite code. On success re-runs bootstrap so
   * `enrollments` is fresh before the caller routes anywhere.
   */
  joinCourse: (inviteCode: string) => Promise<EnrollmentRead>;
  /** Force a fresh bootstrap fetch (e.g. after a `PATCH /users/me`). */
  refreshBootstrap: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
