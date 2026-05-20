/**
 * "Profile complete!" celebration page.
 *
 * Runs `POST /profiles/{id}/complete` once on mount to confirm the
 * matching gate is satisfied. If it isn't, surface the missing fields
 * inline rather than silently routing the user to a Discovery board
 * that will refuse to match them.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Nav } from "@/components/shared/Nav";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/auth-context";
import { useMyProfile, useCheckCompletion } from "@/hooks/useProfile";
import type { GoProps } from "@/types/ui";

interface ProfileDoneProps extends GoProps {
  onJoinCourse: () => void;
}

export function ProfileDone({ go, onJoinCourse }: ProfileDoneProps) {
  const { enrollments } = useAuth();
  const courseId = enrollments[0]?.course.id;
  const { data: profile } = useMyProfile(courseId);
  const checkCompletion = useCheckCompletion();
  const [missing, setMissing] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    checkCompletion.mutate(profile.id, {
      onSuccess: (data) => {
        if (!alive) return;
        setMissing(data.is_complete ? [] : data.missing);
      },
      onError: (err) => {
        if (!alive) return;
        setError(err instanceof ApiError ? err.message : "Couldn't verify completion.");
      },
    });
    return () => {
      alive = false;
    };
    // checkCompletion is a stable mutation object from react-query; we
    // intentionally depend only on the profile id to avoid re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const isComplete = missing !== null && missing.length === 0;

  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto pt-[100px] px-6 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#9652ca]/15 flex items-center justify-center">
          <span className="text-3xl text-[#9652ca]">{isComplete ? "✓" : "…"}</span>
        </div>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          {isComplete ? "Profile Complete!" : "Almost there…"}
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          {isComplete
            ? "You're ready to find teammates."
            : missing && missing.length > 0
              ? `Still missing: ${missing.join(", ")}. Edit your profile to finish.`
              : error
                ? error
                : "Verifying your profile…"}
        </p>
        <Button
          className="px-9 py-3.5 text-base h-auto"
          disabled={!isComplete}
          onClick={() => {
            onJoinCourse();
            go("board");
          }}
        >
          Go to Matching Board
        </Button>
        {missing && missing.length > 0 && (
          <div className="mt-3.5">
            <Button
              variant="link"
              className="text-foreground"
              onClick={() => go("profile-edit")}
            >
              Edit Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
