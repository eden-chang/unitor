/**
 * Mock "check your inbox" screen. Replaced by ``MagicLinkSent`` in
 * step C, which displays the same content but consumes the real
 * Supabase ``signInWithOtp`` ack.
 */

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/shared/icons";
import { Nav } from "@/components/shared/Nav";
import type { RoleGoProps } from "@/types/ui";

interface VerifyProps extends RoleGoProps {
  userEmail?: string;
}

export function Verify({ role, go, userEmail }: VerifyProps) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto pt-20 px-6 text-center">
        <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">
          Step 2 of 2
        </div>
        <Progress
          value={(2 / 2) * 100}
          className="h-[3px] bg-gray-100 rounded-sm mb-8"
        />
        <div className="mb-5 flex justify-center">
          <Icon.email size={48} />
        </div>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px] text-center">
          Check your inbox
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed text-center">
          We sent a link to <strong>{userEmail || "j.doe@mail.utoronto.ca"}</strong>
        </p>
        <Button
          className="w-full px-7 py-3 h-auto"
          onClick={() => go(role === "t" ? "ta-dash-empty" : "dash-empty")}
        >
          I've Verified My Email
        </Button>
        <div className="mt-3.5">
          <Button variant="link" className="text-foreground">
            Resend email
          </Button>
        </div>
      </div>
    </div>
  );
}
