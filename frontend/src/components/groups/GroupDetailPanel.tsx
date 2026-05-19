/**
 * Side-panel detail view for a forming group.
 *
 * Two states:
 *   - Browse mode: members, skill composition, combined schedule,
 *     application questions (read-only).
 *   - Form mode: same panel, application questions become editable.
 *
 * Mock-data only for now. Stage 2 wires the apply flow to
 * ``POST /api/v1/groups/{id}/applications``.
 */

import { Fragment, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/shared/icons";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { cn } from "@/lib/utils";
import { FORMING_GROUPS } from "@/lib/mock-data";
import type { GoProps } from "@/types/ui";

interface GroupDetailPanelProps extends GoProps {
  groupId: string;
  onClose: () => void;
  onApplied: (groupId: string) => void;
  onOpenChat?: (name: string) => void;
  onBack?: () => void;
}

export function GroupDetailPanel({
  groupId,
  onClose,
  onApplied,
  onOpenChat,
  onBack,
}: GroupDetailPanelProps) {
  const group = FORMING_GROUPS.find((g) => g.id === groupId)!;
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [answers, setAnswers] = useState<string[]>(group.applicationQuestions.map(() => ""));

  if (submitted) {
    return (
      <div className="p-6 text-center pt-16">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success-bg flex items-center justify-center">
          <span className="text-2xl text-success">✓</span>
        </div>
        <div className="text-lg font-bold mb-2">Application Sent!</div>
        <p className="text-[13px] text-gray-600 mb-6">
          {group.leaderName} will review your application.
        </p>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        {onBack && (
          <button
            onClick={onBack}
            className="text-[13px] text-gray-500 hover:text-gray-700 mb-3 cursor-pointer"
          >
            ← Back to profile
          </button>
        )}
        <div className="mb-5">
          <div className="text-lg font-bold mb-1">{group.leaderName}'s Group</div>
          <div className="text-xs text-gray-500 mb-3">
            Section {group.section} · {group.members.length}/{group.maxSize} members
          </div>
          <p className="text-[13px] text-gray-700">{group.description}</p>
          <Button
            className="w-full mt-3 gap-2 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5"
            variant="outline"
            onClick={() => {
              if (onOpenChat) onOpenChat(group.leaderName);
              onClose();
            }}
          >
            <Icon.mailSend size={18} color="#9652ca" />
            Message {group.leaderName.split(" ")[0]}
          </Button>
        </div>
        <div className="mb-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
            Members
          </Label>
          {group.members.map((m, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <StudentAvatar name={m.name} size="size-7" textSize="text-xs" />
              <span className="text-[12px] font-medium">{m.name}</span>
              <div className="flex gap-1 ml-auto">
                {m.skills.map((sk) => (
                  <span
                    key={sk}
                    className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
            Skills Composition
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Has</div>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(group.members.flatMap((m) => m.skills))).map((sk) => (
                  <span
                    key={sk}
                    className="text-[11px] bg-success-bg text-success px-2 py-0.5 rounded-lg border border-success-border"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Needs</div>
              <div className="flex flex-wrap gap-1">
                {group.neededSkills.map((sk) => (
                  <span
                    key={sk}
                    className="text-[11px] bg-accent text-accent-foreground px-2 py-0.5 rounded-lg border border-border"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mb-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
            Combined Schedule
          </Label>
          <div className="grid grid-cols-[48px_repeat(5,1fr)] gap-[2px]">
            <div />
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold text-gray-500 py-1"
              >
                {d}
              </div>
            ))}
            {["9a-12p", "1-5p", "6-9p"].map((t, ti) => (
              <Fragment key={ti}>
                <div className="text-[10px] text-gray-500 flex items-center">{t}</div>
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => {
                  const counts: Record<string, number> = {
                    "Mon-0": 1,
                    "Mon-1": 2,
                    "Tue-1": 1,
                    "Wed-0": 1,
                    "Wed-1": 2,
                    "Thu-2": 1,
                    "Fri-1": 2,
                  };
                  const c = counts[`${d}-${ti}`] || 0;
                  const total = group.members.length;
                  return (
                    <div
                      key={d}
                      className={cn(
                        "py-2 text-center rounded text-[10px] font-medium",
                        c >= total
                          ? "bg-primary text-primary-foreground"
                          : c >= total / 2
                          ? "bg-success-bg text-success"
                          : c > 0
                          ? "bg-gray-100 text-gray-500"
                          : "bg-gray-50 text-gray-300",
                      )}
                    >
                      {c > 0 ? `${c}/${total}` : ""}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <div className="text-[10px] text-gray-400 mt-1.5">
            Darker = more members available
          </div>
        </div>
        <div className="border-t border-gray-100 pt-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3 block">
            Application Questions
          </Label>
          {!showForm
            ? group.applicationQuestions.map((q, i) => (
                <div key={i} className="mb-3">
                  <div className="text-[13px] font-medium text-gray-700 mb-1">
                    {i + 1}. {q}
                  </div>
                </div>
              ))
            : group.applicationQuestions.map((q, i) => (
                <div key={i} className="mb-4">
                  <Label className="text-[11px] font-bold text-gray-600 mb-[6px] block uppercase tracking-[1px]">
                    {i + 1}. {q}
                  </Label>
                  <Textarea
                    value={answers[i]}
                    onChange={(e) => {
                      if (e.target.value.length > 300) return;
                      const next = [...answers];
                      next[i] = e.target.value;
                      setAnswers(next);
                    }}
                    className="text-[12px] resize-none h-16"
                    placeholder="Your answer..."
                  />
                  <div className="text-[11px] text-gray-400 text-right mt-0.5">
                    {answers[i].length}/300
                  </div>
                </div>
              ))}
        </div>
      </div>
      <div className="border-t border-border p-4">
        {!showForm ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => setShowForm(true)}>
              Apply to Group
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={answers.some((a) => a.trim() === "")}
              onClick={() => {
                setSubmitted(true);
                onApplied(group.id);
              }}
            >
              Send Application
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
