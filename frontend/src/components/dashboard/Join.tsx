/**
 * Invite-code course-join flow.
 *
 * Single screen: the user enters an invite code → we POST to
 * `/api/v1/auth/join` and route to the profile wizard on success.
 *
 * The backend returns one of three error codes that we surface inline:
 *   - `INVITE_CODE_NOT_FOUND` — the code didn't match any active course.
 *   - `NOT_IN_ROSTER`         — code matched, but the caller's email isn't on the roster.
 *   - `ALREADY_ENROLLED`      — code matched and the caller is already in.
 *
 * The two-step "look up → confirm" prototype is gone: the look-up
 * endpoint doesn't exist (it would leak invite-code → course-name
 * mapping to anyone who can guess codes), and the post-Join confirmation
 * lives in the response itself.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { Nav } from "@/components/shared/Nav";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/auth-context";
import type { GoProps } from "@/types/ui";

interface JoinProps extends GoProps {
  /** Flips the demo "joined a course" flag in App.tsx local storage. */
  onJoined?: () => void;
}

const ERROR_COPY: Record<string, string> = {
  INVITE_CODE_NOT_FOUND: "We couldn't find an active course with that code. Double-check with your TA.",
  NOT_IN_ROSTER: "Your email isn't on this course's roster. Contact your TA to be added.",
  ALREADY_ENROLLED: "You're already enrolled in this course.",
};

export function Join({ go, onJoined }: JoinProps) {
  const { joinCourse } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = code.trim();
  const canSubmit = trimmed.length > 0 && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await joinCourse(trimmed);
      onJoined?.();
      go("prof-0");
    } catch (e) {
      if (e instanceof ApiError && e.code in ERROR_COPY) {
        setError(ERROR_COPY[e.code]);
        // `ALREADY_ENROLLED` is the only case where we'd want to route
        // forward instead of asking the user to re-type — they're already
        // in, just send them to the dashboard.
        if (e.code === "ALREADY_ENROLLED") {
          onJoined?.();
          window.setTimeout(() => go("dash"), 1200);
        }
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Something went wrong joining the course. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto py-14 px-6">
        <Button
          variant="ghost"
          className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm"
          onClick={() => go("dash-empty")}
        >
          ← Back to Dashboard
        </Button>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Join a Course
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          Enter the invite code from your TA.
        </p>
        <FormField l="Invite Code">
          <Input
            className={
              "text-[22px] font-bold tracking-[6px] text-center py-[18px] h-auto " +
              (error ? "border-danger" : "")
            }
            placeholder="ABC123"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
            }}
            autoFocus
          />
          {error && <p className="text-[13px] text-danger mt-1.5">{error}</p>}
        </FormField>
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {busy ? "Joining…" : "Join Course"}
        </Button>
      </div>
    </div>
  );
}
