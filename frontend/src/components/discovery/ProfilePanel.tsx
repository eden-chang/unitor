/**
 * Side-panel detail view shown when the viewer clicks a student card on
 * the Discovery board.
 *
 * Lives on the merged data from `useDiscoveryStudents` — the caller
 * passes the `MergedStudent` straight in, which carries both the
 * profile summary (skills / schedule / bio) and the compatibility score
 * from the batch call. The schedule grid renders directly from
 * `profile.schedule_slots`; we don't refetch since the embedded shape
 * is already complete enough for the panel.
 *
 * Three branches based on the target's `group_status` and (legacy) the
 * mock `FORMING_GROUPS` membership lookup:
 *   - `in_group` + matching forming-group row → defer to the
 *     `FormingStudentPanel` view. Stage 2 will replace the group lookup
 *     with the real `GET /groups` data.
 *   - `in_group` without a matching row → fall back to the solo view.
 *   - `solo` → full compatibility breakdown + Group Request CTA.
 */

import { Fragment, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/shared/icons";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { FormingStudentPanel } from "@/components/discovery/FormingStudentPanel";
import { GroupDetailPanel } from "@/components/groups/GroupDetailPanel";
import { useAuth } from "@/context/auth-context";
import { useCourseSkills } from "@/hooks/useCourseSkills";
import { useMyProfile } from "@/hooks/useProfile";
import { scheduleSlotToCell } from "@/hooks/useWizardState";
import { cn } from "@/lib/utils";
import { FORMING_GROUPS, PROFILE_TIERS } from "@/lib/mock-data";
import type {
  CompatibilityResult,
  StudentListItem,
} from "@/types/api";
import type { Student } from "@/types/ui";
import type { MergedStudent } from "@/hooks/useDiscovery";
import type { GoProps } from "@/types/ui";

interface ProfilePanelProps extends GoProps {
  student: MergedStudent;
  onClose: () => void;
  onContactStatusChange: (userId: string, status: string) => void;
  urgentMode?: boolean;
  contactStatus?: string;
  onOpenChat?: (userId: string) => void;
  onSelectGroup?: (groupId: string) => void;
  onSendRequest?: (userId: string, why: string, question: string) => void;
}

export function ProfilePanelContent({
  go,
  student,
  onClose,
  onContactStatusChange,
  urgentMode = false,
  contactStatus = "none",
  onOpenChat,
  onSelectGroup: _onSelectGroup,
  onSendRequest,
}: ProfilePanelProps) {
  const { enrollments } = useAuth();
  const courseId = enrollments[0]?.course.id;
  const { data: myProfile } = useMyProfile(courseId);
  const skillCatalog = useCourseSkills(courseId);
  const [inlineGroupId, setInlineGroupId] = useState<string | null>(null);
  const [requestStep, setRequestStep] = useState<"view" | "confirm" | "form">("view");
  const [requestWhy, setRequestWhy] = useState("");
  const [requestQuestion, setRequestQuestion] = useState("");
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);

  const name = student.display_name ?? "Pending name";

  // Stage 2: replace this mock lookup with a real "is this student in a
  // forming group?" call. For now the FORMING_GROUPS catalog is mock and
  // keyed by name, so name-based lookup is the right shim.
  const formingGroup =
    student.group_status === "in_group"
      ? FORMING_GROUPS.find(
          (g) =>
            g.leaderName === name ||
            g.members.some((m) => m.name === name),
        )
      : undefined;

  if (student.group_status === "in_group" && !formingGroup) {
    // The target is in a group but no forming-group mock row matches —
    // treat as "closed group" for the panel.
    return ClosedGroupPanel({ name, sectionCode: student.section_code });
  }

  if (student.group_status === "in_group" && formingGroup) {
    if (inlineGroupId) {
      return (
        <GroupDetailPanel
          go={go}
          groupId={inlineGroupId}
          onClose={onClose}
          onApplied={() => {}}
          onOpenChat={(targetName) => {
            onClose();
            if (onOpenChat) onOpenChat(targetName);
          }}
          onBack={() => setInlineGroupId(null)}
        />
      );
    }
    // FormingStudentPanel expects the legacy `Student` mock shape with a
    // computed `overlap` string. Build a minimal adapter from the live
    // data so we can reuse the prototype's panel UI verbatim.
    return (
      <FormingStudentPanel
        student={toLegacyStudent(student)}
        hasGroup={!!formingGroup}
        onViewGroup={() => {
          if (formingGroup) setInlineGroupId(formingGroup.id);
        }}
        onChat={() => {
          if (onOpenChat) onOpenChat(student.user_id);
          onClose();
        }}
      />
    );
  }

  // Solo branch.
  const score = student.score;
  const overall = score?.overall_score ?? null;
  const hasScore = overall !== null;
  const tier: "good" | "normal" | "bad" = !hasScore
    ? "normal"
    : overall >= 80
      ? "good"
      : overall >= 50
        ? "normal"
        : "bad";
  const t = PROFILE_TIERS[tier];
  const hasWarnings = (score?.warnings.length ?? 0) > 0;
  const needsAck = tier === "bad" || tier === "normal";

  const skillsById = new Map((skillCatalog.data ?? []).map((s) => [s.id, s.skill_name]));
  const myScheduleSet = new Set(
    (myProfile?.schedule_slots ?? []).map(scheduleSlotToCell),
  );
  const theirScheduleSet = new Set(
    (student.profile?.schedule_slots ?? []).map(scheduleSlotToCell),
  );

  const ds = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const ts = ["9am-12pm", "12-4pm", "4-8pm", "8-11pm"];
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const firstName = name.split(" ")[0];

  return (
    <div>
      <div className="p-6 pb-2">
        <div className="flex gap-4 items-center mb-4">
          <StudentAvatar name={name} size="size-14" textSize="text-lg" />
          <div className="flex-1">
            <div className="text-[22px] font-bold">{name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "inline-flex items-center justify-center h-[26px] px-2.5 rounded-[12px] leading-none text-[12px] font-medium",
                  student.group_status === "solo"
                    ? "bg-[#DCFCE7] text-[#166534]"
                    : "bg-gray-100 text-gray-500",
                )}
              >
                {student.group_status === "solo" ? "Solo" : "In Group"}
              </span>
              {student.section_code && (
                <span className="text-[14px] text-[#6B7280]">
                  Section {student.section_code}
                </span>
              )}
            </div>
          </div>
        </div>

        {hasScore && score ? (
          <Card className={cn("p-5 mb-5 gap-0 shadow-none", t.bg, t.border)}>
            <div className="flex items-center gap-5 mb-3">
              <div className={cn("text-[42px] font-extrabold", t.text)}>
                {Math.round(score.overall_score)}%
              </div>
              <div>
                <div className={cn("text-[15px] font-bold", t.text)}>{t.label}</div>
                {t.subtitle && (
                  <div className={cn("text-[13px]", t.darkText)}>{t.subtitle}</div>
                )}
              </div>
            </div>
            {(
              [
                ["Schedule", Math.round(score.schedule_score)],
                ["Skills", Math.round(score.skill_score)],
                ["Work Style", Math.round(score.work_style_score)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex items-center gap-2 mb-1">
                <span className={cn("text-[11px] w-16", t.darkText)}>{label}</span>
                <div className={cn("flex-1 h-2 rounded-full overflow-hidden", t.trackBg)}>
                  <div
                    className={cn(
                      "h-full rounded-full",
                      value >= 80 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-danger",
                    )}
                    style={{ width: `${Math.max(value, 3)}%` }}
                  />
                </div>
                <span
                  className={cn("text-[11px] font-semibold w-8 text-right", t.darkText)}
                >
                  {value}%
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <div className="py-3.5 px-[18px] rounded-[10px] border bg-gray-50 border-gray-200 mb-5">
            <div className="text-[13px] font-semibold text-gray-700 mb-0.5">
              No compatibility score
            </div>
            <div className="text-[12px] text-gray-500">
              {student.skipped_reason === "viewer_profile_incomplete"
                ? "Finish your profile to see compatibility scores."
                : student.skipped_reason === "target_profile_incomplete"
                  ? `${firstName} hasn't finished their profile yet.`
                  : "Score will appear once both profiles are complete."}
            </div>
          </div>
        )}

        {score?.reasons && score.reasons.length > 0 && (
          <div className="py-3.5 px-[18px] bg-success-bg rounded-[10px] border border-success-border mb-5">
            <div className="text-[15px] font-bold text-success mb-1">
              Why this match works
            </div>
            <div className="text-[13px] text-success leading-relaxed">
              {score.reasons.join(". ")}.
            </div>
          </div>
        )}

        {hasWarnings ? (
          <div className="py-3.5 px-[18px] rounded-[10px] border bg-caution-bg border-caution-border mb-7">
            <div className="text-[15px] font-bold text-caution mb-1">
              ⚠ Compatibility warnings
            </div>
            <div className="text-[13px] text-caution-dark leading-relaxed">
              {score?.warnings.join(". ")}.
            </div>
          </div>
        ) : (
          hasScore && (
            <div className="py-3.5 px-[18px] bg-success-bg rounded-[10px] border border-success-border mb-7">
              <div className="text-[15px] font-bold text-success mb-1">
                Strong compatibility
              </div>
              <div className="text-[13px] text-success leading-relaxed">
                No warnings — schedules, skills, and work styles align well.
              </div>
            </div>
          )
        )}

        <div className="mb-5">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Skills
          </Label>
          <div className="flex flex-wrap gap-1">
            {(student.profile?.skills ?? []).map((s) => {
              const skName = skillsById.get(s.course_skill_id);
              if (!skName) return null;
              return (
                <span
                  key={s.course_skill_id}
                  className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]"
                >
                  {skName}
                </span>
              );
            })}
            {(student.profile?.skills.length ?? 0) === 0 && (
              <span className="text-[13px] text-gray-400">No skills selected yet.</span>
            )}
          </div>
        </div>

        <div className="mb-5">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            About
          </Label>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {student.profile?.bio || "No bio yet."}
          </p>
        </div>

        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Schedule Overlap
          </Label>
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-1">
            <div />
            {ds.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-gray-500 p-2"
              >
                {d}
              </div>
            ))}
            {ts.map((t2, ti) => (
              <Fragment key={ti}>
                <div className="text-[11px] text-gray-500 flex items-center">{t2}</div>
                {ds.map((d) => {
                  const k = `${d}-${ti}`;
                  const m = myScheduleSet.has(k);
                  const h = theirScheduleSet.has(k);
                  const b = m && h;
                  return (
                    <div
                      key={k}
                      className={cn(
                        "py-3 px-1 text-center rounded-md text-[11px] font-medium",
                        b
                          ? "bg-primary text-primary-foreground"
                          : m
                            ? "bg-schedule-self text-gray-500"
                            : h
                              ? "bg-schedule-other text-gray-400"
                              : "bg-gray-50 text-gray-300",
                      )}
                    >
                      {b ? "✓" : m ? "You" : h ? initials : ""}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          {score && (
            <div className="flex justify-between items-center mt-2.5">
              <div className="text-xs text-gray-500">
                <span className="text-gray-400">◼ You</span> ·{" "}
                <span className="text-gray-300">◼ {firstName}</span>
              </div>
              <div
                className={cn(
                  "py-1 px-3 rounded-md border",
                  score.schedule_overlap_hours > 0
                    ? "bg-success-bg border-success-border"
                    : "bg-danger-bg border-danger-border",
                )}
              >
                <span
                  className={cn(
                    "text-[13px] font-bold",
                    score.schedule_overlap_hours > 0 ? "text-success" : "text-danger",
                  )}
                >
                  {score.schedule_overlap_hours}h/wk overlap
                </span>
              </div>
            </div>
          )}
        </div>

        {score?.skill_complementarity && score.skill_complementarity.length > 0 && (
          <div className="mb-7">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
              Skill Coverage Map
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {score.skill_complementarity.map(({ skill_name, covered_by }) => (
                <div
                  key={skill_name}
                  className={cn(
                    "p-2.5 rounded-lg text-center text-[12px] font-medium border",
                    covered_by === "you"
                      ? "bg-secondary border-border text-foreground"
                      : covered_by === "them"
                        ? "bg-success-bg border-success-border text-success"
                        : covered_by === "both"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-gray-50 border-dashed border-gray-300 text-gray-400",
                  )}
                >
                  <div className="text-[11px] mb-0.5">{skill_name}</div>
                  <div className="text-[10px] opacity-75">({covered_by})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Work Style
          </Label>
          <Card className="p-0 gap-0 shadow-none overflow-hidden">
            {workStyleRows(myProfile, student.profile).map((row, i, arr) => (
              <div
                key={row.label}
                className={cn(
                  "flex justify-between items-center px-4 py-3",
                  i < arr.length - 1 && "border-b border-gray-100",
                  !row.ok && "bg-danger-bg",
                )}
              >
                <span
                  className={cn(
                    "text-[13px]",
                    row.ok ? "text-gray-500" : "text-danger font-semibold",
                  )}
                >
                  {row.label}
                </span>
                <div className="flex gap-3 items-center text-[13px]">
                  <span>{row.you || "—"}</span>
                  <span className="text-gray-400 text-[11px]">vs</span>
                  <span>{row.them || "—"}</span>
                  <span className={cn("text-base", row.ok ? "text-success" : "text-danger")}>
                    {row.ok ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {requestStep === "confirm" && (
        <div className="fixed inset-0 bg-foreground/40 z-[300] flex items-end sm:items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 w-full max-w-[380px] shadow-xl text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-lg font-bold mb-2">Compatibility Warning</div>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-5">
              {tier === "bad"
                ? `Your compatibility with ${firstName} is low. There are significant differences in schedule, skills, or work style that may require extra coordination.`
                : `You and ${firstName} have some differences in schedule or work style. You may need to discuss and align on expectations.`}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRequestStep("view")}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => setRequestStep("form")}>
                Send Anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {requestStep === "form" && (
        <div className="fixed inset-0 bg-foreground/40 z-[300] flex items-end sm:items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 w-full max-w-[420px] shadow-xl">
            <div className="text-[11px] font-bold text-primary uppercase tracking-wide mb-1">
              {urgentMode ? "Quick Request" : "Group Request"}
            </div>
            <div className="text-lg font-bold mb-1">To {name}</div>
            <p className="text-[13px] text-gray-500 mb-5">
              Introduce yourself and give them a reason to say yes.
            </p>
            <div className="mb-4">
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-[7px] block">
                Why work together?
              </Label>
              <Textarea
                value={requestWhy}
                onChange={(e) => setRequestWhy(e.target.value)}
                className="resize-none h-20 text-sm"
                placeholder={`Explain why you and ${firstName} would make a strong team...`}
              />
            </div>
            {!urgentMode && (
              <div className="mb-5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-[7px] block">
                  A question for them
                </Label>
                <Input
                  value={requestQuestion}
                  onChange={(e) => setRequestQuestion(e.target.value)}
                  placeholder="Ask something to start the conversation..."
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRequestStep("view")}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={
                  urgentMode
                    ? requestWhy.trim() === ""
                    : requestWhy.trim() === "" || requestQuestion.trim() === ""
                }
                onClick={() => {
                  onContactStatusChange(student.user_id, "request-sent");
                  if (onSendRequest)
                    onSendRequest(student.user_id, requestWhy, requestQuestion);
                  onClose();
                }}
              >
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 border-t border-border p-4 bg-background z-10">
        {contactStatus === "request-sent" ? (
          <div className="text-center">
            <div className="text-[14px] text-[#6B7280] mb-2">Request Sent</div>
            {!withdrawConfirm ? (
              <button
                onClick={() => setWithdrawConfirm(true)}
                className="text-[13px] text-[#991B1B] hover:underline cursor-pointer"
              >
                Withdraw Request
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-[13px] text-gray-600">Are you sure?</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setWithdrawConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs bg-danger hover:bg-danger/90 text-white"
                    onClick={() => {
                      onContactStatusChange(student.user_id, "none");
                      setWithdrawConfirm(false);
                    }}
                  >
                    Yes, Withdraw
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5 gap-1.5"
              onClick={() => {
                if (onOpenChat) onOpenChat(student.user_id);
                onClose();
              }}
            >
              <Icon.mailSend size={14} color="#9652ca" /> Chat
            </Button>
            <Button
              className="flex-1"
              disabled={!hasScore}
              onClick={() =>
                needsAck ? setRequestStep("confirm") : setRequestStep("form")
              }
            >
              Group Request
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

function toLegacyStudent(s: StudentListItem & { score: CompatibilityResult | null }): Student {
  const name = s.display_name ?? "Pending name";
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const overlapHrs = s.score?.schedule_overlap_hours ?? 0;
  return {
    name,
    sec: s.section_code ?? "",
    init: initials,
    overlap: `${overlapHrs}h/wk`,
    scheduleOverlapHrs: overlapHrs,
    skills: [],
    status: s.group_status === "in_group" ? "open-group" : "solo",
    bio: s.profile?.bio ?? "",
    compatScore: Math.round(s.score?.overall_score ?? 0),
    lastActive: "recently",
    contactStatus: "none",
  };
}

function workStyleRows(
  mine: { meeting_frequency?: string | null; meeting_style?: string | null; comm_tool?: string | null } | null | undefined,
  theirs: { meeting_frequency?: string | null; meeting_style?: string | null; comm_tool?: string | null } | null | undefined,
): { label: string; you: string; them: string; ok: boolean }[] {
  const eq = (a?: string | null, b?: string | null) => !!a && !!b && a === b;
  return [
    {
      label: "Meeting frequency",
      you: mine?.meeting_frequency ?? "",
      them: theirs?.meeting_frequency ?? "",
      ok: eq(mine?.meeting_frequency, theirs?.meeting_frequency),
    },
    {
      label: "Meeting style",
      you: mine?.meeting_style ?? "",
      them: theirs?.meeting_style ?? "",
      ok: eq(mine?.meeting_style, theirs?.meeting_style),
    },
    {
      label: "Communication",
      you: mine?.comm_tool ?? "",
      them: theirs?.comm_tool ?? "",
      ok: eq(mine?.comm_tool, theirs?.comm_tool),
    },
  ];
}

function ClosedGroupPanel({
  name,
  sectionCode,
}: {
  name: string;
  sectionCode: string | null;
}) {
  return (
    <div className="p-6">
      <div className="flex gap-4 items-center mb-5">
        <StudentAvatar name={name} size="size-12" textSize="text-base" />
        <div className="flex-1">
          <div className="text-[18px] font-bold">{name}</div>
          {sectionCode && (
            <div className="text-sm text-gray-500">Section {sectionCode}</div>
          )}
        </div>
        <span className="py-1 px-3 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
          Grouped
        </span>
      </div>
      <div className="py-4 px-5 bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-[13px] font-semibold mb-1">
          {name.split(" ")[0]} is already in a group
        </div>
        <div className="text-[12px] text-gray-600">
          They are no longer available for new group requests.
        </div>
      </div>
    </div>
  );
}
