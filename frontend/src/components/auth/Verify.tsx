/**
 * "Check your inbox" screen shown after a magic link is sent.
 *
 * Kept under the existing `Verify` name to avoid churn in App.tsx's
 * page map. There's no fake "I've verified" button — the only way
 * forward is the link in the user's email, which redirects to
 * `/auth/callback` and runs the bootstrap.
 */

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icons";
import { Nav } from "@/components/shared/Nav";
import { useAuth } from "@/context/auth-context";
import type { GoProps } from "@/types/ui";

interface VerifyProps extends GoProps {
  userEmail?: string;
  /** Optional: resend the magic link to the same address. */
  onResend?: () => void;
}

export function Verify({ go, userEmail, onResend }: VerifyProps) {
  const { signIn } = useAuth();

  const handleResend = async () => {
    if (onResend) {
      onResend();
      return;
    }
    if (!userEmail) return;
    try {
      await signIn(userEmail);
    } catch {
      // Swallow — the user is already on the "check inbox" screen and
      // the request will be retried by clicking again.
    }
  };

  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto pt-20 px-6 text-center">
        <div className="mb-5 flex justify-center">
          <Icon.email size={48} />
        </div>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px] text-center">
          Check your inbox
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed text-center">
          We sent a sign-in link to{" "}
          <strong>{userEmail || "your university email"}</strong>. Open it on
          this device to finish signing in.
        </p>
        <Button
          variant="outline"
          className="w-full px-7 py-3 h-auto"
          onClick={() => go("landing")}
        >
          Back to Home
        </Button>
        <div className="mt-3.5">
          <Button
            variant="link"
            className="text-foreground"
            onClick={() => void handleResend()}
          >
            Resend link
          </Button>
        </div>
      </div>
    </div>
  );
}
