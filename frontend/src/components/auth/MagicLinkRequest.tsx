/**
 * Magic-link sign-in form.
 *
 * Single field (university email). Flow:
 *   1. Call `apiAuth.precheck(email)` — if the email isn't on any active
 *      roster, surface inline; no email is sent.
 *   2. Call `supabase.auth.signInWithOtp(email, emailRedirectTo: /auth/callback)`.
 *   3. Navigate to the "check your inbox" screen.
 *
 * Replaces both the password-based Login and SignupForm in the prototype.
 * Step 0 of the wizard (display name) happens *after* the magic link
 * completes — there's no name field here.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { Nav } from "@/components/shared/Nav";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/api/client";
import type { GoProps } from "@/types/ui";

interface MagicLinkRequestProps extends GoProps {
  /** Headline copy. Defaults to "Sign in" — pass "Welcome back" for the login mode. */
  heading?: string;
  /** Persist the entered email into the wizard's localStorage shim. */
  onSubmitEmail?: (email: string) => void;
}

export function MagicLinkRequest({
  go,
  heading = "Sign in",
  onSubmitEmail,
}: MagicLinkRequestProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = email.trim();
  const canSubmit = trimmed.length > 0 && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(trimmed);
      onSubmitEmail?.(trimmed);
      go("verify");
    } catch (e) {
      if (e instanceof ApiError && e.code === "NOT_IN_ROSTER") {
        setError("Your email is not on any active course's roster. Contact your TA.");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Something went wrong sending the magic link. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto py-14 px-6">
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          {heading}
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          We&apos;ll send a one-time magic link to your university email.
        </p>
        <FormField l="University Email" id="magic-link-email">
          <Input
            id="magic-link-email"
            type="email"
            placeholder="you@mail.utoronto.ca"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
            }}
            className={error ? "border-danger" : ""}
            autoComplete="email"
            autoFocus
          />
          {error && (
            <p className="text-[13px] text-danger mt-1.5">{error}</p>
          )}
        </FormField>
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {busy ? "Sending…" : "Send Magic Link"}
        </Button>
        <p className="mt-5 text-center text-[13px] text-gray-500">
          Your TA must add your email to the roster before you can sign in.
        </p>
      </div>
    </div>
  );
}
