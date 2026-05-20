/**
 * Profile wizard step 3 — communication preferences + bio.
 *
 * On Complete, submits the accumulated wizard state in three calls:
 *   1. `POST /profiles` — creates the profile row with scalar fields
 *      and (in the same call) the initial skills + schedule.
 *   2. The skills + schedule actually arrive in the POST body too —
 *      no separate PUTs needed for the first submission.
 *
 * If the user already has a profile (409 PROFILE_ALREADY_EXISTS), we
 * fall back to PATCH + PUT replacements so the wizard is idempotent —
 * a partial completion that left state in localStorage can finish later.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/FormField";
import { Nav } from "@/components/shared/Nav";
import { cn } from "@/lib/utils";
import * as apiProfile from "@/api/profile";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/auth-context";
import { useMyProfile } from "@/hooks/useProfile";
import {
  cellToScheduleSlot,
  useWizardState,
} from "@/hooks/useWizardState";
import type { GoProps } from "@/types/ui";

const COMM_PLATFORMS = [
  "Discord",
  "WhatsApp",
  "Email",
  "Instagram DM",
  "iMessage",
  "KakaoTalk",
] as const;

interface Step3Props extends GoProps {
  onProfileCreated?: (profileId: string) => void;
}

export function Step3CommBio({ go, onProfileCreated }: Step3Props) {
  const { enrollments } = useAuth();
  const enrollment = enrollments[0];
  const courseId = enrollment?.course.id;
  const wizard = useWizardState();
  const { data: existing } = useMyProfile(courseId);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (p: string) => {
    if (wizard.commTool === p) return;
    wizard.setCommTool(p);
  };

  const buildSkills = () =>
    wizard.skills.map((s) => ({
      course_skill_id: s.course_skill_id,
      proficiency: s.proficiency,
    }));

  const buildSlots = () =>
    wizard.scheduleCells
      .map(cellToScheduleSlot)
      .filter((slot): slot is { day_of_week: number; time_band: number } => slot !== null);

  const handleSubmit = async () => {
    if (!enrollment) {
      setError("No enrollment found. Re-join the course first.");
      return;
    }
    if (!wizard.bio.trim()) return;
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      let profileId: string;
      try {
        const profile = await apiProfile.createProfile({
          enrollment_id: enrollment.id,
          bio: wizard.bio.trim(),
          meeting_frequency: wizard.meetingFrequency,
          meeting_style: wizard.meetingStyle,
          comm_tool: wizard.commTool,
          comm_handle: wizard.commHandle.trim() || null,
          schedule_flexible: wizard.scheduleFlexible,
          skills: buildSkills(),
          schedule_slots: buildSlots(),
        });
        profileId = profile.id;
      } catch (e) {
        // If a partial wizard run left a profile behind, finish it via PATCH.
        if (e instanceof ApiError && e.code === "PROFILE_ALREADY_EXISTS" && existing) {
          await apiProfile.updateProfile(existing.id, {
            bio: wizard.bio.trim(),
            meeting_frequency: wizard.meetingFrequency,
            meeting_style: wizard.meetingStyle,
            comm_tool: wizard.commTool,
            comm_handle: wizard.commHandle.trim() || null,
            schedule_flexible: wizard.scheduleFlexible,
          });
          await apiProfile.replaceSkills(existing.id, { skills: buildSkills() });
          await apiProfile.replaceSchedule(existing.id, {
            schedule_flexible: wizard.scheduleFlexible,
            slots: buildSlots(),
          });
          profileId = existing.id;
        } else {
          throw e;
        }
      }

      onProfileCreated?.(profileId);
      wizard.reset();
      go("prof-done");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Couldn't save your profile. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav
        go={go}
        right={
          <span className="text-[13px] text-gray-500 leading-relaxed">
            CSC318 · Profile
          </span>
        }
      />
      <div className="max-w-[680px] mx-auto py-14 px-6">
        <Button
          variant="ghost"
          className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm"
          onClick={() => go("prof-2")}
        >
          ← Back
        </Button>
        <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">
          Step 4 of 4
        </div>
        <Progress
          value={(4 / 4) * 100}
          className="h-[3px] bg-gray-100 rounded-sm mb-8"
        />
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Communication &amp; About You
        </h1>

        <div className="mb-5">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Preferred Platform
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {COMM_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={wizard.commTool === p}
                className={cn(
                  "inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer border-[1.5px] transition-colors",
                  wizard.commTool === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300",
                )}
                onClick={() => togglePlatform(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <FormField l={`${wizard.commTool} handle`}>
          <Input
            placeholder={`Your ${wizard.commTool} username`}
            value={wizard.commHandle}
            onChange={(e) => wizard.setCommHandle(e.target.value)}
          />
        </FormField>

        <Separator className="my-6 bg-gray-100" />

        <FormField l="About You">
          <Textarea
            className="min-h-[100px] resize-y"
            placeholder="About you and your ideal group"
            value={wizard.bio}
            onChange={(e) => wizard.setBio(e.target.value.slice(0, 300))}
          />
          <div
            className={cn(
              "text-[13px] leading-relaxed text-right mt-1",
              wizard.bio.length >= 300 ? "text-danger" : "text-gray-500",
            )}
          >
            {wizard.bio.length}/300
          </div>
        </FormField>

        {error && (
          <p className="text-[13px] text-danger mb-3">{error}</p>
        )}

        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={!wizard.bio.trim() || busy || !enrollment}
          onClick={() => void handleSubmit()}
        >
          {busy ? "Saving…" : "Complete Profile"}
        </Button>
      </div>
    </div>
  );
}
