/**
 * Auth context — stage 1, step A: STUB.
 *
 * For now this only exposes the Supabase session and a stable
 * ``isAuthenticated`` boolean. Step C fills in the real shape (user +
 * enrollments from ``/auth/bootstrap``, plus ``signIn`` / ``signOut`` /
 * ``joinCourse``).
 *
 * We ship the stub now so the provider tree in ``main.tsx`` is in its
 * final form before we touch any page logic.
 *
 * The matching ``useAuth`` hook + ``AuthContext`` object live in
 * ``./auth-context.ts`` so this file only exports a component (required
 * for Vite fast refresh).
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/supabase/client";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: session !== null,
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
