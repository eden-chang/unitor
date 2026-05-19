/**
 * Side-panel detail view shown when the viewer clicks a student card on
 * the Discovery board.
 *
 * Three branches based on the target student's status:
 *   - ``closed``        — read-only "already in a confirmed group" message.
 *   - ``open-group``    — defers to ``FormingStudentPanel``; if the viewer
 *     clicks "Join Their Group" the panel swaps to ``GroupDetailPanel``
 *     inline.
 *   - ``solo``          — the full compatibility breakdown + Group Request
 *     CTA.
 *
 * Stage 1 step E replaces the mock COMPAT / SCHEDULE_DATA / WORK_STYLE_DATA
 * with live data from ``GET /profiles/{id}`` plus the
 * ``POST /compatibility/batch`` payload already cached on the page.
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
import { cn } from "@/lib/utils";
import {
  COMPAT,
  FORMING_GROUPS,
  PROFILE_TIERS,
  SCHEDULE_DATA,
  STU,
  WORK_STYLE_DATA,
} from "@/lib/mock-data";
import type { GoProps } from "@/types/ui";

interface ProfilePanelProps extends GoProps {
  studentName: string;
  onClose: () => void;
  onContactStatusChange: (name: string, status: string) => void;
  urgentMode?: boolean;
  contactStatus?: string;
  onOpenChat?: (name: string) => void;
  onSelectGroup?: (groupId: string) => void;
  onSendRequest?: (name: string, why: string, question: string) => void;
}

export function ProfilePanelContent({
  go,
  studentName,
  onClose,
  onContactStatusChange,
  urgentMode = false,
  contactStatus = "none",
  onOpenChat,
  onSelectGroup: _onSelectGroup,
  onSendRequest,
}: ProfilePanelProps) {
  const [inlineGroupId, setInlineGroupId] = useState<string | null>(null);
  const [requestStep, setRequestStep] = useState<"view" | "confirm" | "form">("view");
  const [requestWhy, setRequestWhy] = useState("");
  const [requestQuestion, setRequestQuestion] = useState("");
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const st = STU.find((s) => s.name === studentName);

  if (!st) return null;

  if (st.status === "closed") {
    return (
      <div className="p-6">
        <div className="flex gap-4 items-center mb-5">
          <StudentAvatar name={st.name} size="size-12" textSize="text-base" />
          <div className="flex-1">
            <div className="text-[18px] font-bold">{st.name}</div>
            <div className="text-sm text-gray-500">Section {st.sec}</div>
          </div>
          <span className="py-1 px-3 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
            Grouped
          </span>
        </div>
        <div className="py-4 px-5 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-[13px] font-semibold mb-1">
            {st.name.split(" ")[0]} is already in a confirmed group
          </div>
          <div className="text-[12px] text-gray-600">
            They are no longer available for new group requests.
          </div>
        </div>
      </div>
    );
  }

  if (st.status === "open-group") {
    const studentGroup = FORMING_GROUPS.find(
      (g) => g.members.some((m) => m.name === st.name) || g.leaderName === st.name,
    );

    if (inlineGroupId) {
      const groupExists = FORMING_GROUPS.find((g) => g.id === inlineGroupId);
      if (groupExists) {
        return (
          <GroupDetailPanel
            go={go}
            groupId={inlineGroupId}
            onClose={onClose}
            onApplied={() => {}}
            onOpenChat={(name) => {
              onClose();
              if (onOpenChat) onOpenChat(name);
            }}
            onBack={() => setInlineGroupId(null)}
          />
        );
      }
    }

    return (
      <FormingStudentPanel
        student={st}
        hasGroup={!!studentGroup}
        onViewGroup={() => {
          if (studentGroup) {
            setInlineGroupId(studentGroup.id);
          }
        }}
        onChat={() => {
          if (onOpenChat) onOpenChat(st.name);
          onClose();
        }}
      />
    );
  }

  const c = COMPAT[studentName];
  const sched = SCHEDULE_DATA[studentName];
  const workRows = WORK_STYLE_DATA[studentName];

  if (!c || !sched || !workRows) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[200px] text-gray-400">
        <div className="text-[13px]">No compatibility data available.</div>
      </div>
    );
  }

  const ds = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const ts = ["9am-12pm", "12-4pm", "4-8pm", "8-11pm"];
  const firstName = studentName.split(" ")[0];
  const tier: "good" | "normal" | "bad" =
    c.overall >= 80 ? "good" : c.overall >= 50 ? "normal" : "bad";
  const t = PROFILE_TIERS[tier];
  const hasWarnings = c.warnings.length > 0;
  const needsAck = tier === "bad" || tier === "normal";

  return (
    <div>
      <div className="p-6 pb-2">
        <div className="flex gap-4 items-center mb-4">
          <StudentAvatar name={st.name} size="size-14" textSize="text-lg" />
          <div className="flex-1">
            <div className="text-[22px] font-bold">{st.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "inline-flex items-center justify-center h-[26px] px-2.5 rounded-[12px] leading-none text-[12px] font-medium",
                  st.status === "solo"
                    ? "bg-[#DCFCE7] text-[#166534]"
                    : "bg-gray-100 text-gray-500",
                )}
              >
                {st.status === "solo" ? "Solo" : "Closed"}
              </span>
              <span className="text-[14px] text-[#6B7280]">Section {st.sec}</span>
            </div>
          </div>
        </div>
        <Card className={cn("p-5 mb-5 gap-0 shadow-none", t.bg, t.border)}>
          <div className="flex items-center gap-5 mb-3">
            <div className={cn("text-[42px] font-extrabold", t.text)}>{c.overall}%</div>
            <div>
              <div className={cn("text-[15px] font-bold", t.text)}>{t.label}</div>
              {t.subtitle && (
                <div className={cn("text-[13px]", t.darkText)}>{t.subtitle}</div>
              )}
            </div>
          </div>
          {(
            [
              ["Schedule", c.scheduleScore],
              ["Skills", c.skillScore],
              ["Work Style", c.workStyleScore],
            ] as const
          ).map(([label, score]) => (
            <div key={label} className="flex items-center gap-2 mb-1">
              <span className={cn("text-[11px] w-16", t.darkText)}>{label}</span>
              <div className={cn("flex-1 h-2 rounded-full overflow-hidden", t.trackBg)}>
                <div
                  className={cn(
                    "h-full rounded-full",
                    score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-danger",
                  )}
                  style={{ width: `${Math.max(score, 3)}%` }}
                />
              </div>
              <span
                className={cn("text-[11px] font-semibold w-8 text-right", t.darkText)}
              >
                {score}%
              </span>
            </div>
          ))}
        </Card>

        {!hasWarnings ? (
          <div className="py-3.5 px-[18px] bg-success-bg rounded-[10px] border border-success-border mb-7">
            <div className="text-[15px] font-bold text-success mb-1">
              Strong compatibility
            </div>
            <div className="text-[13px] text-success leading-relaxed">
              No warnings — schedules, skills, and work styles align well.
            </div>
          </div>
        ) : (
          <div className="py-3.5 px-[18px] rounded-[10px] border bg-caution-bg border-caution-border mb-7">
            <div className="text-[15px] font-bold text-caution mb-1">
              ⚠ Compatibility warnings found
            </div>
            <div className="text-[13px] text-caution-dark leading-relaxed">
              {c.warnings.join(". ")}.
            </div>
          </div>
        )}

        <div className="mb-5">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Skills
          </Label>
          <div className="flex flex-wrap gap-1">
            {st.skills.map((sk) => (
              <span
                key={sk}
                className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]"
              >
                {sk}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            About
          </Label>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {st.bio || "No bio yet."}
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
                  const m = sched.my.has(k);
                  const h = sched.theirs.has(k);
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
                      {b ? "✓" : m ? "You" : h ? st.init : ""}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <div className="flex justify-between items-center mt-2.5">
            <div className="text-xs text-gray-500">
              <span className="text-gray-400">◼ You</span> ·{" "}
              <span className="text-gray-300">◼ {firstName}</span>
            </div>
            <div
              className={cn(
                "py-1 px-3 rounded-md border",
                sched.overlapHrs > 0
                  ? "bg-success-bg border-success-border"
                  : "bg-danger-bg border-danger-border",
              )}
            >
              <span
                className={cn(
                  "text-[13px] font-bold",
                  sched.overlapHrs > 0 ? "text-success" : "text-danger",
                )}
              >
                {sched.overlapHrs}h/wk overlap
              </span>
            </div>
          </div>
        </div>

        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Skills Comparison
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-gray-50 rounded-[10px]">
              <div className="text-xs font-semibold mb-2">You</div>
              <div className="text-sm mb-1">UI Design</div>
              <div className="text-sm">User Research</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-[10px]">
              <div className="text-xs font-semibold mb-2">{firstName}</div>
              {st.skills.map((sk) => (
                <div key={sk} className="text-sm mb-1">
                  {sk}
                </div>
              ))}
            </div>
          </div>
          <div className="py-2 px-3 bg-success-bg rounded-lg text-[13px] text-success mt-2.5">
            ✓ Complementary skills
          </div>
        </div>

        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Skill Coverage Map
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {c.skillComplementarity.map(({ skill, coveredBy }) => (
              <div
                key={skill}
                className={cn(
                  "p-2.5 rounded-lg text-center text-[12px] font-medium border",
                  coveredBy === "you"
                    ? "bg-secondary border-border text-foreground"
                    : coveredBy === "them"
                    ? "bg-success-bg border-success-border text-success"
                    : coveredBy === "both"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-gray-50 border-dashed border-gray-300 text-gray-400",
                )}
              >
                <div className="text-[11px] mb-0.5">{skill}</div>
                <div className="text-[10px] opacity-75">({coveredBy})</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Work Style
          </Label>
          <Card className="p-0 gap-0 shadow-none overflow-hidden">
            {workRows.map(([l, y, t2, ok], i) => (
              <div
                key={l}
                className={cn(
                  "flex justify-between items-center px-4 py-3",
                  i < workRows.length - 1 && "border-b border-gray-100",
                  !ok && "bg-danger-bg",
                )}
              >
                <span
                  className={cn(
                    "text-[13px]",
                    ok ? "text-gray-500" : "text-danger font-semibold",
                  )}
                >
                  {l}
                </span>
                <div className="flex gap-3 items-center text-[13px]">
                  <span>{y}</span>
                  <span className="text-gray-400 text-[11px]">vs</span>
                  <span>{t2}</span>
                  <span className={cn("text-base", ok ? "text-success" : "text-danger")}>
                    {ok ? "✓" : "✗"}
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
            <div className="text-lg font-bold mb-1">To {st.name}</div>
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
                placeholder={`Explain why you and ${st.name.split(" ")[0]} would make a strong team...`}
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
                  onContactStatusChange(studentName, "request-sent");
                  if (onSendRequest) onSendRequest(studentName, requestWhy, requestQuestion);
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
                      onContactStatusChange(studentName, "none");
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
                if (onOpenChat) onOpenChat(studentName);
                onClose();
              }}
            >
              <Icon.mailSend size={14} color="#9652ca" /> Chat
            </Button>
            <Button
              className="flex-1"
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
