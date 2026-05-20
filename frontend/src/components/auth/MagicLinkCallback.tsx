/**
 * Magic-link return URL handler.
 *
 * Mounted at `/auth/callback`. Supabase appends `access_token`, `refresh_token`,
 * etc. to the hash; `supabase-js` parses them automatically when
 * `getSession()` / `onAuthStateChange` fires (handled by `<AuthProvider>`).
 *
 * Our job here is purely orchestration: wait for the session, surface
 * bootstrap loading / errors, then route the user onward.
 *
 * Routing decisions:
 *   - No session after 8 seconds → magic link was bad / expired; show error.
 *   - Bootstrap loading → spinner copy.
 *   - Bootstrap error → "contact your TA" with the API message.
 *   - `enrollments.length === 0` → go to the Join page.
 *   - Otherwise → go to Dash.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icons";
import { Nav } from "@/components/shared/Nav";
import { useAuth } from "@/context/auth-context";
import type { GoProps } from "@/types/ui";

const SESSION_TIMEOUT_MS = 8_000;

interface MagicLinkCallbackProps extends GoProps {
  /** Sync the bootstrap user back into the local-storage demo shim. */
  onUserResolved?: (displayName: string | null, email: string) => void;
  /** Tell the parent shell to flip the demo `hasJoinedCourse` flag. */
  onHasEnrollments?: () => void;
}

export function MagicLinkCallback({
  go,
  onUserResolved,
  onHasEnrollments,
}: MagicLinkCallbackProps) {
  const {
    isSessionLoading,
    isAuthenticated,
    user,
    enrollments,
    isBootstrapLoading,
    bootstrapError,
  } = useAuth();

  const [timedOut, setTimedOut] = useState(false);

  // Detect "magic link didn't bring a session" within a window. Supabase
  // populates the session synchronously off the URL hash, so this should
  // never fire for a healthy link — but a stale / consumed link leaves us
  // stranded with no auth state. Showing an error is better than spinning.
  useEffect(() => {
    if (isAuthenticated) return;
    const timer = window.setTimeout(() => {
      if (!isAuthenticated) setTimedOut(true);
    }, SESSION_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  // Once we have a bootstrap result, route forward.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (isBootstrapLoading) return;
    if (bootstrapError) return;
    if (!user) return;

    onUserResolved?.(user.display_name, user.primary_email);

    if (enrollments.length === 0) {
      go("join");
      return;
    }
    onHasEnrollments?.();
    go("dash");
  }, [
    isAuthenticated,
    isBootstrapLoading,
    bootstrapError,
    user,
    enrollments,
    go,
    onUserResolved,
    onHasEnrollments,
  ]);

  let body: React.ReactNode;
  if (timedOut && !isAuthenticated) {
    body = (
      <Status
        title="Sign-in link expired"
        message="That magic link is no longer valid. Request a new one from the home page."
        cta={{ label: "Back to Home", onClick: () => go("landing") }}
      />
    );
  } else if (bootstrapError) {
    body = (
      <Status
        title="Couldn't finish signing in"
        message={bootstrapError.message}
        cta={{ label: "Back to Home", onClick: () => go("landing") }}
      />
    );
  } else if (isSessionLoading || !isAuthenticated || isBootstrapLoading) {
    body = (
      <Status
        title="Signing you in…"
        message="Verifying your magic link and loading your courses."
        spinner
      />
    );
  } else {
    body = (
      <Status title="Almost there…" message="Routing to your dashboard." spinner />
    );
  }

  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto pt-20 px-6 text-center">
        <div className="mb-5 flex justify-center">
          <Icon.email size={48} />
        </div>
        {body}
      </div>
    </div>
  );
}

function Status({
  title,
  message,
  cta,
  spinner,
}: {
  title: string;
  message: string;
  cta?: { label: string; onClick: () => void };
  spinner?: boolean;
}) {
  return (
    <>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
        {title}
      </h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">{message}</p>
      {spinner && (
        <div className="flex justify-center mb-6">
          <div className="size-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {cta && (
        <Button
          variant="outline"
          className="w-full px-7 py-3 h-auto"
          onClick={cta.onClick}
        >
          {cta.label}
        </Button>
      )}
    </>
  );
}
