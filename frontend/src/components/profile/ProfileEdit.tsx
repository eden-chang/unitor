/**
 * Profile view / edit page.
 *
 * Two modes:
 *   - **View**: renders the persisted profile in a read-only layout
 *     with an "Edit Profile" CTA at the bottom.
 *   - **Edit**: same form as the onboarding wizard collapsed into one
 *     screen. Save submits PATCH + PUT skills + PUT schedule; Cancel
 *     reverts to the server-side snapshot.
 */

import { Fragment, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/FormField";
import { Icon } from "@/components/shared/icons";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/auth-context";
import { useCourseSkills } from "@/hooks/useCourseSkills";
import {
  useMyProfile,
  useReplaceSchedule,
  useReplaceSkills,
  useUpdateProfile,
} from "@/hooks/useProfile";
import {
  cellToScheduleSlot,
  proficiencyFromApi,
  proficiencyToApi,
  scheduleSlotToCell,
} from "@/hooks/useWizardState";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/avatar";
import type {
  ProficiencyLevel,
  ProfileRead,
  SkillRead,
} from "@/types/api";
import type { GoProps } from "@/types/ui";

const PROFICIENCY_TITLES = ["Beginner", "Intermediate", "Proficient", "Expert"] as const;
const MEETING_FREQUENCIES = ["1x/wk", "2x/wk", "3x/wk", "As needed"] as const;
const MEETING_STYLES = ["In-person", "Online", "Hybrid"] as const;
const COMM_TOOLS = ["Discord", "Slack", "Email", "iMessage"] as const;

interface ProfileEditProps extends GoProps {
  showToast?: (msg: string) => void;
  userName?: string;
}

export function ProfileEdit({
  go,
  showToast,
  userName = "",
}: ProfileEditProps) {
  const { enrollments, user } = useAuth();
  const enrollment = enrollments[0];
  const courseId = enrollment?.course.id;
  const sectionCode = enrollment?.section_code ?? null;

  const { data: profile, isLoading, error } = useMyProfile(courseId);
  const { data: catalog } = useCourseSkills(courseId);
  const updateProfile = useUpdateProfile(courseId);
  const replaceSkills = useReplaceSkills(courseId);
  const replaceSchedule = useReplaceSchedule(courseId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!enrollment) {
    return (
      <PlainShell heading="Join a course first" body="You don't have any active enrollments yet." />
    );
  }
  if (isLoading) {
    return <PlainShell heading="Loading profile…" body="" />;
  }
  if (error && error.code !== "PROFILE_NOT_FOUND") {
    return <PlainShell heading="Couldn't load profile" body={error.message} />;
  }
  if (!profile) {
    return (
      <PlainShell
        heading="No profile yet"
        body="Finish the onboarding wizard to set up your profile."
        cta={{ label: "Open Wizard", onClick: () => go("prof-0") }}
      />
    );
  }

  const skillMeta = (id: string) =>
    catalog?.find((s) => s.id === id) ?? { id, skill_name: "Unknown skill", display_order: 0 };

  const enterEdit = () => {
    setDraft(draftFromProfile(profile));
    setSaveError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(null);
    setSaveError(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaveError(null);
    try {
      await updateProfile.mutateAsync({
        profileId: profile.id,
        payload: {
          bio: draft.bio.trim(),
          meeting_frequency: draft.meetingFrequency,
          meeting_style: draft.meetingStyle,
          comm_tool: draft.commTool,
          schedule_flexible: draft.scheduleFlexible,
        },
      });
      await replaceSkills.mutateAsync({
        profileId: profile.id,
        payload: { skills: draft.skills },
      });
      await replaceSchedule.mutateAsync({
        profileId: profile.id,
        payload: {
          schedule_flexible: draft.scheduleFlexible,
          slots: draft.scheduleCells
            .map(cellToScheduleSlot)
            .filter((s): s is { day_of_week: number; time_band: number } => s !== null),
        },
      });
      showToast?.("Profile saved!");
      setEditing(false);
      setDraft(null);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Couldn't save profile.");
    }
  };

  if (!editing) {
    return (
      <ViewMode
        profile={profile}
        userName={user?.display_name || userName}
        sectionCode={sectionCode}
        skillMeta={skillMeta}
        onEdit={enterEdit}
      />
    );
  }

  if (!draft) {
    return <PlainShell heading="Loading…" body="" />;
  }

  return (
    <EditMode
      draft={draft}
      setDraft={setDraft}
      catalog={catalog ?? []}
      sectionCode={sectionCode}
      userName={user?.display_name || userName}
      saving={
        updateProfile.isPending || replaceSkills.isPending || replaceSchedule.isPending
      }
      saveError={saveError}
      onCancel={cancel}
      onSave={() => void save()}
    />
  );
}

// ---------------------------------------------------------------------------
// Draft + helpers
// ---------------------------------------------------------------------------

interface Draft {
  bio: string;
  skills: { course_skill_id: string; proficiency: ProficiencyLevel }[];
  scheduleCells: string[];
  scheduleFlexible: boolean;
  meetingFrequency: string;
  meetingStyle: string;
  commTool: string;
}

function draftFromProfile(p: ProfileRead): Draft {
  return {
    bio: p.bio ?? "",
    skills: p.skills.map((s) => ({
      course_skill_id: s.course_skill_id,
      proficiency: s.proficiency,
    })),
    scheduleCells: p.schedule_slots.map(scheduleSlotToCell),
    scheduleFlexible: p.schedule_flexible,
    meetingFrequency: p.meeting_frequency ?? "2x/wk",
    meetingStyle: p.meeting_style ?? "In-person",
    commTool: p.comm_tool ?? "Discord",
  };
}

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

interface ViewModeProps {
  profile: ProfileRead;
  userName: string;
  sectionCode: string | null;
  skillMeta: (id: string) => { id: string; skill_name: string; display_order: number };
  onEdit: () => void;
}

function ViewMode({ profile, userName, sectionCode, skillMeta, onEdit }: ViewModeProps) {
  const ds = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const ts = ["9am-12pm", "12-4pm", "4-8pm", "8-11pm"];
  const scheduleSet = useMemo(
    () => new Set(profile.schedule_slots.map(scheduleSlotToCell)),
    [profile.schedule_slots],
  );

  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[680px] mx-auto py-10 px-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="size-20">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-full h-full object-cover rounded-full"
                alt=""
              />
            ) : (
              <AvatarFallback className="bg-gray-200 text-gray-500 text-2xl font-bold">
                {getInitials(userName)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h1 className="text-[24px] font-bold text-foreground -tracking-[0.5px]">
              {userName || "Student"}
            </h1>
            <div className="text-[13px] text-gray-500">
              {sectionCode ? `Section ${sectionCode}` : "No section"} · CSC318
            </div>
          </div>
        </div>

        <SectionLabel>About</SectionLabel>
        <p className="text-[14px] text-gray-700 leading-relaxed mb-5">
          {profile.bio || "No bio yet."}
        </p>

        <SectionLabel>Skills</SectionLabel>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {profile.skills.length === 0 ? (
            <span className="text-[13px] text-gray-400">No skills selected.</span>
          ) : (
            profile.skills.map((s: SkillRead) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]"
              >
                {skillMeta(s.course_skill_id).skill_name}
                <span className="text-[10px] opacity-70">
                  · {proficiencyFromApi(s.proficiency)}
                </span>
              </span>
            ))
          )}
        </div>

        <SectionLabel>Work Style</SectionLabel>
        <Card className="p-0 gap-0 shadow-none overflow-hidden mb-5">
          {[
            ["Meeting frequency", profile.meeting_frequency ?? "—"],
            ["Meeting style", profile.meeting_style ?? "—"],
            ["Communication", profile.comm_tool ?? "—"],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={cn(
                "flex justify-between items-center px-4 py-3",
                i < 2 && "border-b border-gray-100",
              )}
            >
              <span className="text-[13px] text-gray-500">{label}</span>
              <span className="text-[13px] font-medium">{value}</span>
            </div>
          ))}
        </Card>

        <SectionLabel>Weekly Availability</SectionLabel>
        <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px] mb-7">
          <div />
          {ds.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-gray-500 p-1.5"
            >
              {d}
            </div>
          ))}
          {ts.map((t, ti) => (
            <Fragment key={ti}>
              <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
              {ds.map((d) => {
                const k = `${d}-${ti}`;
                return (
                  <div
                    key={k}
                    className={cn(
                      "py-2.5 px-1 text-center rounded-md text-xs font-medium border",
                      scheduleSet.has(k)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-gray-50 text-gray-300 border-gray-200",
                    )}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full gap-2 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5"
          onClick={onEdit}
        >
          <Icon.pencil size={16} color="#9652ca" />
          Edit Profile
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

interface EditModeProps {
  draft: Draft;
  setDraft: (next: Draft) => void;
  catalog: { id: string; skill_name: string }[];
  sectionCode: string | null;
  userName: string;
  saving: boolean;
  saveError: string | null;
  onCancel: () => void;
  onSave: () => void;
}

function EditMode({
  draft,
  setDraft,
  catalog,
  sectionCode,
  userName,
  saving,
  saveError,
  onCancel,
  onSave,
}: EditModeProps) {
  const selectedIds = new Set(draft.skills.map((s) => s.course_skill_id));

  const toggleSkill = (skillId: string) => {
    if (selectedIds.has(skillId)) {
      setDraft({
        ...draft,
        skills: draft.skills.filter((s) => s.course_skill_id !== skillId),
      });
    } else {
      setDraft({
        ...draft,
        skills: [...draft.skills, { course_skill_id: skillId, proficiency: "intermediate" }],
      });
    }
  };

  const setProficiency = (skillId: string, title: string) => {
    setDraft({
      ...draft,
      skills: draft.skills.map((s) =>
        s.course_skill_id === skillId ? { ...s, proficiency: proficiencyToApi(title) } : s,
      ),
    });
  };

  const scheduleSet = new Set(draft.scheduleCells);
  const setScheduleSet = (next: Set<string>) =>
    setDraft({ ...draft, scheduleCells: [...next] });

  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[680px] mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-gray-200 text-gray-500 text-xl font-bold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-[24px] font-bold text-foreground -tracking-[0.5px]">
                {userName || "Student"}
              </h1>
              <div className="text-[13px] text-gray-500">
                {sectionCode ? `Section ${sectionCode}` : "No section"} · CSC318
              </div>
            </div>
          </div>
          <Button variant="ghost" className="text-gray-500 text-sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <FormField l="Bio">
          <Textarea
            value={draft.bio}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value.slice(0, 300) })}
            className="resize-none h-20 text-sm"
            placeholder="Tell teammates about yourself..."
          />
        </FormField>

        <div className="mb-[18px]">
          <SectionLabel>Skills</SectionLabel>
          <div className="flex flex-wrap gap-2 mb-3">
            {catalog.map((sk) => (
              <button
                key={sk.id}
                type="button"
                onClick={() => toggleSkill(sk.id)}
                className={cn(
                  "py-1.5 px-3.5 rounded-full text-[13px] font-medium border transition-colors",
                  selectedIds.has(sk.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-gray-500 border-gray-200 hover:border-gray-400",
                )}
              >
                {sk.skill_name}
              </button>
            ))}
          </div>
          {draft.skills.length > 0 && (
            <div className="space-y-2">
              {draft.skills.map((s) => {
                const meta = catalog.find((c) => c.id === s.course_skill_id);
                if (!meta) return null;
                return (
                  <div key={s.course_skill_id} className="flex items-center gap-3">
                    <span className="text-[13px] text-gray-700 w-32 shrink-0">
                      {meta.skill_name}
                    </span>
                    <Select
                      value={proficiencyFromApi(s.proficiency)}
                      onValueChange={(v) => setProficiency(s.course_skill_id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFICIENCY_TITLES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-[18px]">
          <SectionLabel>Work Style</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <SelectField
              label="Meeting frequency"
              value={draft.meetingFrequency}
              options={MEETING_FREQUENCIES}
              onChange={(v) => setDraft({ ...draft, meetingFrequency: v })}
            />
            <SelectField
              label="Meeting style"
              value={draft.meetingStyle}
              options={MEETING_STYLES}
              onChange={(v) => setDraft({ ...draft, meetingStyle: v })}
            />
            <SelectField
              label="Communication"
              value={draft.commTool}
              options={COMM_TOOLS}
              onChange={(v) => setDraft({ ...draft, commTool: v })}
            />
          </div>
        </div>

        <ScheduleGrid
          sel={scheduleSet}
          set={setScheduleSet}
          label="Weekly Availability"
          disabled={draft.scheduleFlexible}
        />
        <label className="flex items-center gap-2 -mt-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            className="accent-primary"
            checked={draft.scheduleFlexible}
            onChange={(e) =>
              setDraft({ ...draft, scheduleFlexible: e.target.checked })
            }
          />
          <span className="text-[13px] text-gray-600">Flexible / Not sure</span>
        </label>

        {saveError && (
          <p className="text-[13px] text-danger mb-3">{saveError}</p>
        )}

        <Button className="w-full" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small bits
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
      {children}
    </Label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PlainShell({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[500px] mx-auto pt-20 px-6 text-center">
        <h1 className="text-[24px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          {heading}
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">{body}</p>
        {cta && (
          <Button className="px-9 py-3 h-auto" onClick={cta.onClick}>
            {cta.label}
          </Button>
        )}
      </div>
    </div>
  );
}
