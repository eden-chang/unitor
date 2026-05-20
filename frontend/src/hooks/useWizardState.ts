/**
 * Shared state for the profile-onboarding wizard.
 *
 * Each step is rendered through the App.tsx `pg` page map, so we can't
 * hold this in a single parent's `useState` without lifting it into a
 * provider. Instead we back every field with `useLocalStorage` under a
 * `wizard_` namespace — that gives us:
 *
 *   - state that survives a page refresh mid-wizard,
 *   - a single import surface for every step, and
 *   - one `reset()` call to clear it all once `POST /profiles` succeeds.
 *
 * Keep these field names stable: production rollouts should treat any
 * rename as a localStorage migration.
 */

import { useCallback, type Dispatch, type SetStateAction } from "react";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { ProficiencyLevel } from "@/types/api";

export interface WizardSkillEntry {
  course_skill_id: string;
  proficiency: ProficiencyLevel;
}

export interface WizardScheduleCell {
  /** Same encoding the ScheduleGrid uses: `"Mon-1"`, `"Wed-2"`, etc. */
  cell: string;
}

const FIELDS = [
  "wizardSkills",
  "wizardSchedule",
  "wizardScheduleFlexible",
  "wizardCommTool",
  "wizardCommHandle",
  "wizardBio",
  "wizardMeetingFrequency",
  "wizardMeetingStyle",
  "wizardLinkLabel",
  "wizardLinkUrl",
] as const;

export interface WizardState {
  skills: WizardSkillEntry[];
  setSkills: Dispatch<SetStateAction<WizardSkillEntry[]>>;

  scheduleCells: string[];
  setScheduleCells: Dispatch<SetStateAction<string[]>>;
  scheduleFlexible: boolean;
  setScheduleFlexible: Dispatch<SetStateAction<boolean>>;

  commTool: string;
  setCommTool: Dispatch<SetStateAction<string>>;
  commHandle: string;
  setCommHandle: Dispatch<SetStateAction<string>>;

  bio: string;
  setBio: Dispatch<SetStateAction<string>>;

  meetingFrequency: string;
  setMeetingFrequency: Dispatch<SetStateAction<string>>;
  meetingStyle: string;
  setMeetingStyle: Dispatch<SetStateAction<string>>;

  /** Reset every wizard field. Call after the profile is created. */
  reset: () => void;
}

export function useWizardState(): WizardState {
  const [skills, setSkills] = useLocalStorage<WizardSkillEntry[]>("wizardSkills", []);
  const [scheduleCells, setScheduleCells] = useLocalStorage<string[]>("wizardSchedule", []);
  const [scheduleFlexible, setScheduleFlexible] = useLocalStorage<boolean>(
    "wizardScheduleFlexible",
    false,
  );
  const [commTool, setCommTool] = useLocalStorage<string>("wizardCommTool", "Discord");
  const [commHandle, setCommHandle] = useLocalStorage<string>("wizardCommHandle", "");
  const [bio, setBio] = useLocalStorage<string>("wizardBio", "");
  const [meetingFrequency, setMeetingFrequency] = useLocalStorage<string>(
    "wizardMeetingFrequency",
    "2x/wk",
  );
  const [meetingStyle, setMeetingStyle] = useLocalStorage<string>(
    "wizardMeetingStyle",
    "In-person",
  );

  const reset = useCallback(() => {
    // useLocalStorage uses `unitor_` prefix; mirror it here.
    for (const key of FIELDS) {
      try {
        window.localStorage.removeItem(`unitor_${key}`);
      } catch {
        // ignore — storage may be unavailable (private mode).
      }
    }
  }, []);

  return {
    skills,
    setSkills,
    scheduleCells,
    setScheduleCells,
    scheduleFlexible,
    setScheduleFlexible,
    commTool,
    setCommTool,
    commHandle,
    setCommHandle,
    bio,
    setBio,
    meetingFrequency,
    setMeetingFrequency,
    meetingStyle,
    setMeetingStyle,
    reset,
  };
}

/** Helpers shared between the wizard + ProfileEdit. */

const PROF_TITLE_TO_API: Record<string, ProficiencyLevel> = {
  Beginner: "beginner",
  Intermediate: "intermediate",
  Proficient: "proficient",
  Expert: "expert",
};

const PROF_API_TO_TITLE: Record<ProficiencyLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  proficient: "Proficient",
  expert: "Expert",
};

export function proficiencyToApi(title: string): ProficiencyLevel {
  return PROF_TITLE_TO_API[title] ?? "intermediate";
}

export function proficiencyFromApi(level: ProficiencyLevel): string {
  return PROF_API_TO_TITLE[level];
}

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/** Convert `"Mon-1"` → `{ day_of_week: 0, time_band: 1 }`. */
export function cellToScheduleSlot(
  cell: string,
): { day_of_week: number; time_band: number } | null {
  const [day, band] = cell.split("-");
  const dow = DAY_ORDER.indexOf(day as (typeof DAY_ORDER)[number]);
  const tb = Number.parseInt(band, 10);
  if (dow < 0 || Number.isNaN(tb)) return null;
  return { day_of_week: dow, time_band: tb };
}

/** Convert API `{ day_of_week, time_band }` → `"Mon-1"`. */
export function scheduleSlotToCell(
  slot: { day_of_week: number; time_band: number },
): string {
  return `${DAY_ORDER[slot.day_of_week] ?? "Mon"}-${slot.time_band}`;
}
