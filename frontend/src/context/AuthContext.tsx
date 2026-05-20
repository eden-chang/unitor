/**
 * Auth provider — owns the Supabase session + the backend bootstrap.
 *
 * Hierarchy:
 *
 *   <QueryClientProvider>
 *     <BrowserRouter>
 *       <AuthProvider>   ← us
 *         <App />
 *
 * The provider:
 *   1. Subscribes to Supabase auth events.
 *   2. When signed in, runs `apiAuth.bootstrap()` exactly once per session
 *      (via tanstack-query, keyed by access-token). The result is the
 *      backend `public.users` row + the caller's enrollments.
 *   3. Exposes `signIn` / `signOut` / `joinCourse` / `refreshBootstrap`.
 *
 * The matching `useAuth` hook + `AuthContext` object live in
 * `./auth-context.ts` so this file only exports a component (required
 * for Vite fast refresh).
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import * as apiAuth from "@/api/auth";
import { ApiError } from "@/api/client";
import { supabase } from "@/supabase/client";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import type { EnrollmentRead } from "@/types/api";

const BOOTSTRAP_QUERY_KEY = ["auth", "bootstrap"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const qc = useQueryClient();

  // 1. Hydrate the session once, then subscribe to auth-state changes.
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setIsSessionLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Any auth-state change invalidates the bootstrap result —
      // signing out clears it, signing in triggers a fresh fetch.
      qc.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  // 2. Bootstrap once we have a session. `enabled` short-circuits the
  // query while signed out so we don't fire it on every auth-form render.
  const bootstrapQuery = useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => apiAuth.bootstrap(),
    enabled: session !== null,
    // Bootstrap is idempotent and the result rarely changes within a
    // session, so cache it for the lifetime of the tab.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  const signIn = useCallback(async (email: string): Promise<void> => {
    // Precheck first so we can give a clear "not on the roster" error
    // instead of silently sending a useless magic link.
    const check = await apiAuth.precheck(email);
    if (!check.on_roster) {
      throw new ApiError(403, {
        code: "NOT_IN_ROSTER",
        message: "Your email is not on any active course's roster. Contact your TA.",
      });
    }

    // Build the redirect URL using the current origin + BASE_URL so the
    // GH Pages prefix (`/unitor-demo/`) is preserved in production.
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    const redirectTo = `${window.location.origin}${baseUrl}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      throw new ApiError(500, {
        code: "MAGIC_LINK_SEND_FAILED",
        message: error.message,
      });
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    qc.removeQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
  }, [qc]);

  const joinCourse = useCallback(
    async (inviteCode: string): Promise<EnrollmentRead> => {
      const enrollment = await apiAuth.join(inviteCode);
      await qc.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      // Wait for the refetch so the caller can route knowing enrollments are fresh.
      await qc.refetchQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      return enrollment;
    },
    [qc],
  );

  const refreshBootstrap = useCallback(async (): Promise<void> => {
    await qc.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
    await qc.refetchQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
  }, [qc]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isSessionLoading,
      isAuthenticated: session !== null,
      user: bootstrapQuery.data?.user ?? null,
      enrollments: bootstrapQuery.data?.enrollments ?? [],
      isBootstrapLoading: bootstrapQuery.isLoading || bootstrapQuery.isFetching,
      bootstrapError:
        bootstrapQuery.error instanceof ApiError ? bootstrapQuery.error : null,
      signIn,
      signOut,
      joinCourse,
      refreshBootstrap,
    }),
    [
      session,
      isSessionLoading,
      bootstrapQuery.data,
      bootstrapQuery.isLoading,
      bootstrapQuery.isFetching,
      bootstrapQuery.error,
      signIn,
      signOut,
      joinCourse,
      refreshBootstrap,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
