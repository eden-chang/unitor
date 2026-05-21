/**
 * Side-panel detail view for a forming group.
 *
 * Reads from `GET /api/v1/groups/{id}` via `useGroup`. The apply flow
 * calls `POST /api/v1/groups/{id}/apply` with the live application
 * questions. Submit handles the six documented error codes inline.
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/shared/icons";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { ApiError } from "@/api/client";
import { useApplyToGroup, useGroup } from "@/hooks/useGroups";
import type { GoProps } from "@/types/ui";

interface GroupDetailPanelProps extends GoProps {
  groupId: string;
  onClose: () => void;
  onApplied: (groupId: string) => void;
  onOpenChat?: (userId: string) => void;
  onBack?: () => void;
}

const ERROR_COPY: Record<string, string> = {
  GROUP_NOT_FOUND: "Group not found.",
  GROUP_NOT_RECRUITING: "This group isn't accepting applications right now.",
  GROUP_ALREADY_CONFIRMED: "This group is past the recruiting stage.",
  ALREADY_IN_GROUP: "You're already a member of this group.",
  DUPLICATE_APPLICATION: "You already have a pending application for this group.",
  INVALID_QUESTION: "One of the questions changed while you were applying — refresh and try again.",
};

export function GroupDetailPanel({
  groupId,
  onClose,
  onApplied,
  onOpenChat,
  onBack,
}: GroupDetailPanelProps) {
  const groupQuery = useGroup(groupId);
  const applyMutation = useApplyToGroup(groupId);
  const [showForm, setShowForm] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const group = groupQuery.data;
  const leaderMember = useMemo(
    () => group?.members.find((m) => m.role === "leader"),
    [group],
  );
  const leaderName = leaderMember?.display_name ?? "Unnamed leader";
  const displayName = group?.name ?? `${leaderName}'s Group`;

  if (groupQuery.isLoading) {
    return (
      <div className="p-6 text-center text-gray-400 text-[13px]">Loading group…</div>
    );
  }
  if (groupQuery.error || !group) {
    return (
      <div className="p-6 text-center text-danger text-[13px]">
        {groupQuery.error?.message ?? "Group not found."}
        <div className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-6 text-center pt-16">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success-bg flex items-center justify-center">
          <span className="text-2xl text-success">✓</span>
        </div>
        <div className="text-lg font-bold mb-2">Application Sent!</div>
        <p className="text-[13px] text-gray-600 mb-6">
          {leaderName} will review your application.
        </p>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const questions = group.application_questions;
  const requiredFilled = questions.every((q) => (answers[q.id] ?? "").trim().length > 0);

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      await applyMutation.mutateAsync({
        answers: questions.map((q) => ({
          question_id: q.id,
          answer_text: answers[q.id] ?? "",
        })),
      });
      setSubmitted(true);
      onApplied(group.id);
    } catch (e) {
      if (e instanceof ApiError) {
        setSubmitError(ERROR_COPY[e.code] ?? e.message);
      } else {
        setSubmitError("Couldn't send the application. Try again.");
      }
    }
  };

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
          <div className="text-lg font-bold mb-1">{displayName}</div>
          <div className="text-xs text-gray-500 mb-3">
            {group.recruiting ? "Recruiting" : "Not recruiting"} ·{" "}
            {group.members.length} member{group.members.length === 1 ? "" : "s"}
          </div>
          {group.description && (
            <p className="text-[13px] text-gray-700">{group.description}</p>
          )}
          {leaderMember && onOpenChat && (
            <Button
              className="w-full mt-3 gap-2 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5"
              variant="outline"
              onClick={() => {
                onOpenChat(leaderMember.user_id);
                onClose();
              }}
            >
              <Icon.mailSend size={18} color="#9652ca" />
              Message {leaderName.split(" ")[0]}
            </Button>
          )}
        </div>

        <div className="mb-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
            Members
          </Label>
          {group.members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2 mb-2">
              <StudentAvatar
                name={m.display_name ?? "?"}
                size="size-7"
                textSize="text-xs"
              />
              <span className="text-[12px] font-medium">
                {m.display_name ?? "Pending name"}
              </span>
              {m.role === "leader" && (
                <span className="text-[10px] bg-[#9652ca]/10 text-[#9652ca] px-1.5 py-0.5 rounded ml-auto">
                  Leader
                </span>
              )}
            </div>
          ))}
        </div>

        {questions.length > 0 && (
          <div className="border-t border-gray-100 pt-5">
            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3 block">
              Application Questions
            </Label>
            {!showForm
              ? questions.map((q, i) => (
                  <div key={q.id} className="mb-3">
                    <div className="text-[13px] font-medium text-gray-700 mb-1">
                      {i + 1}. {q.question_text}
                    </div>
                  </div>
                ))
              : questions.map((q, i) => (
                  <div key={q.id} className="mb-4">
                    <Label className="text-[11px] font-bold text-gray-600 mb-[6px] block uppercase tracking-[1px]">
                      {i + 1}. {q.question_text}
                    </Label>
                    <Textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => {
                        if (e.target.value.length > 2000) return;
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }));
                      }}
                      className="text-[12px] resize-none h-16"
                      placeholder="Your answer..."
                    />
                    <div className="text-[11px] text-gray-400 text-right mt-0.5">
                      {(answers[q.id] ?? "").length}/2000
                    </div>
                  </div>
                ))}
          </div>
        )}

        {submitError && (
          <div className="text-[13px] text-danger mt-2">{submitError}</div>
        )}
      </div>
      <div className="border-t border-border p-4">
        {!showForm ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!group.recruiting}
              onClick={() => setShowForm(true)}
            >
              {group.recruiting ? "Apply to Group" : "Not Recruiting"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={
                applyMutation.isPending ||
                (questions.length > 0 && !requiredFilled)
              }
              onClick={() => void handleSubmit()}
            >
              {applyMutation.isPending ? "Sending…" : "Send Application"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
