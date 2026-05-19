/**
 * Profile view / edit page.
 *
 * Two modes:
 *   - **View** (default): renders the persisted profile in a read-only
 *     layout with an "Edit Profile" CTA at the bottom.
 *   - **Edit**: same form as the onboarding wizard collapsed into a
 *     single screen; Cancel reverts via the snapshot taken on entry.
 *
 * Step D rewires the localStorage state to ``GET /profiles/me/{course}``
 * + ``PATCH /profiles/{id}`` + ``PUT /skills`` / ``PUT /schedule``.
 */

import { Fragment, useState } from "react";

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
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/avatar";
import type { GoProps } from "@/types/ui";

export function ProfileEdit({
  go: _go,
  showToast,
  userName = "",
}: GoProps & { showToast?: (msg: string) => void; userName?: string }) {
  const ALL_SKILLS = [
    "Frontend Dev",
    "Backend",
    "UI Design",
    "User Research",
    "Prototyping",
    "Data Analysis",
    "UX Writing",
    "Project Mgmt",
  ];
  const PROFICIENCY = ["Beginner", "Intermediate", "Proficient", "Expert"];
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useLocalStorage<string>(
    "profileBio",
    "UX designer focused on accessible, user-centered products.",
  );
  const [selectedSkills, setSelectedSkills] = useLocalStorage<string[]>(
    "profileSkills",
    ["UI Design", "User Research"],
  );
  const [skillRatings, setSkillRatings] = useLocalStorage<Record<string, string>>(
    "profileSkillRatings",
    { "UI Design": "Proficient", "User Research": "Expert" },
  );
  const [meetFreq, setMeetFreq] = useLocalStorage<string>("profileMeetFreq", "2x/wk");
  const [meetStyle, setMeetStyle] = useLocalStorage<string>("profileMeetStyle", "In-person");
  const [commTool, setCommTool] = useLocalStorage<string>("profileCommTool", "Discord");
  const [scheduleArr, setScheduleArr] = useLocalStorage<string[]>("profileSchedule", [
    "Mon-1",
    "Wed-1",
    "Fri-1",
  ]);
  const schedule = new Set(scheduleArr);
  const setSchedule = (s: Set<string>) => setScheduleArr([...s]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{
    bio: string;
    skills: string[];
    ratings: Record<string, string>;
    freq: string;
    style: string;
    tool: string;
    sched: string[];
  } | null>(null);

  const toggleSkill = (sk: string) => {
    if (selectedSkills.includes(sk)) {
      setSelectedSkills((prev) => prev.filter((s) => s !== sk));
      setSkillRatings((prev) => {
        const n = { ...prev };
        delete n[sk];
        return n;
      });
    } else {
      setSelectedSkills((prev) => [...prev, sk]);
      setSkillRatings((prev) => ({ ...prev, [sk]: "Intermediate" }));
    }
  };

  const enterEdit = () => {
    setSnapshot({
      bio,
      skills: selectedSkills,
      ratings: skillRatings,
      freq: meetFreq,
      style: meetStyle,
      tool: commTool,
      sched: scheduleArr,
    });
    setEditing(true);
  };

  const handleCancel = () => {
    if (snapshot) {
      setBio(snapshot.bio);
      setSelectedSkills(snapshot.skills);
      setSkillRatings(snapshot.ratings);
      setMeetFreq(snapshot.freq);
      setMeetStyle(snapshot.style);
      setCommTool(snapshot.tool);
      setScheduleArr(snapshot.sched);
    }
    setEditing(false);
  };

  const handleSave = () => {
    setEditing(false);
    setSnapshot(null);
    showToast?.("Profile saved!");
  };

  const ds = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const ts = ["9am-12pm", "12-4pm", "4-8pm", "8-11pm"];

  if (!editing) {
    return (
      <div className="bg-background min-h-screen pb-6">
        <div className="max-w-[680px] mx-auto py-10 px-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="size-20">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  className="w-full h-full object-cover rounded-full"
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
              <div className="text-[13px] text-gray-500">Section 201 · CSC318</div>
              <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium bg-[#DCFCE7] text-[#166534] mt-1">
                Solo
              </span>
            </div>
          </div>

          <div className="mb-5">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
              About
            </Label>
            <p className="text-[14px] text-gray-700 leading-relaxed">
              {bio || "No bio yet."}
            </p>
          </div>

          <div className="mb-5">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
              Skills
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {selectedSkills.map((sk) => (
                <span
                  key={sk}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]"
                >
                  {sk}{" "}
                  <span className="text-[10px] opacity-70">· {skillRatings[sk]}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
              Work Style
            </Label>
            <Card className="p-0 gap-0 shadow-none overflow-hidden">
              {[
                ["Meeting frequency", meetFreq],
                ["Meeting style", meetStyle],
                ["Communication", commTool],
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
          </div>

          <div className="mb-7">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
              Weekly Availability
            </Label>
            <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]">
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
                          schedule.has(k)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-gray-50 text-gray-300 border-gray-200",
                        )}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5"
            onClick={() => enterEdit()}
          >
            <Icon.pencil size={16} color="#9652ca" />
            Edit Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[680px] mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <AvatarFallback className="bg-gray-200 text-gray-500 text-xl font-bold">
                  {getInitials(userName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-[24px] font-bold text-foreground -tracking-[0.5px]">
                {userName || "Student"}
              </h1>
              <div className="text-[13px] text-gray-500">Section 201 · CSC318</div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="profile-photo"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhotoUrl(URL.createObjectURL(file));
                }}
              />
              <label
                htmlFor="profile-photo"
                className="text-[13px] text-primary hover:underline cursor-pointer"
              >
                Change Photo
              </label>
            </div>
          </div>
          <Button
            variant="ghost"
            className="text-gray-500 text-sm"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>

        <FormField l="Bio">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="resize-none h-20 text-sm"
            placeholder="Tell teammates about yourself..."
          />
        </FormField>

        <div className="mb-[18px]">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Skills
          </Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {ALL_SKILLS.map((sk) => (
              <button
                key={sk}
                type="button"
                onClick={() => toggleSkill(sk)}
                className={cn(
                  "py-1.5 px-3.5 rounded-full text-[13px] font-medium border transition-colors",
                  selectedSkills.includes(sk)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-gray-500 border-gray-200 hover:border-gray-400",
                )}
              >
                {sk}
              </button>
            ))}
          </div>
          {selectedSkills.length > 0 && (
            <div className="space-y-2">
              {selectedSkills.map((sk) => (
                <div key={sk} className="flex items-center gap-3">
                  <span className="text-[13px] text-gray-700 w-32 shrink-0">{sk}</span>
                  <Select
                    value={skillRatings[sk] ?? "Intermediate"}
                    onValueChange={(v) =>
                      setSkillRatings((prev) => ({ ...prev, [sk]: v }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-[18px]">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Work Style
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Meeting frequency</div>
              <Select value={meetFreq} onValueChange={setMeetFreq}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1x/wk", "2x/wk", "3x/wk", "As needed"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Meeting style</div>
              <Select value={meetStyle} onValueChange={setMeetStyle}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["In-person", "Online", "Hybrid"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Communication</div>
              <Select value={commTool} onValueChange={setCommTool}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Discord", "Slack", "Email", "iMessage"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScheduleGrid sel={schedule} set={setSchedule} label="Weekly Availability" />

        <Button className="w-full" onClick={handleSave}>
          Save Profile
        </Button>
      </div>
    </div>
  );
}
