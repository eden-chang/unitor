/**
 * Compact card that previews a forming group in the Discovery board's
 * Groups view.
 *
 * Renders from the live `GroupListItem` shape (stage 2a). The mock
 * "average overlap" and "needed skills" fields don't exist on the
 * server side — those would require either a backend-computed
 * derivation or a richer member-skills hydration. Stage 2a card sticks
 * to what's available: leader name, member count, recruiting flag,
 * application-question count.
 */

import { Card } from "@/components/ui/card";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { cn } from "@/lib/utils";
import type { GroupListItem } from "@/types/api";

interface GroupCardProps {
  group: GroupListItem;
  appliedStatus: string;
  onClick: () => void;
}

const STATUS_LABELS: Record<string, { l: string; cls: string }> = {
  applied: { l: "Applied", cls: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]" },
  accepted: { l: "Accepted", cls: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]" },
  declined: { l: "Declined", cls: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]" },
};

export function GroupCard({ group, appliedStatus, onClick }: GroupCardProps) {
  const leaderName = group.leader?.display_name ?? "Unnamed leader";
  const displayName = group.name ?? `${leaderName}'s Group`;

  return (
    <Card
      className="p-4 gap-0 bg-white border-0 rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[15px] font-semibold text-[#111827]">{displayName}</span>
        <span
          className={cn(
            "inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[12px]",
            group.recruiting
              ? "bg-[#9652ca]/10 text-[#9652ca]"
              : "bg-gray-100 text-gray-500",
          )}
        >
          {group.members.length} {group.members.length === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="text-[12px] text-[#6B7280] mb-2.5">
        {group.recruiting ? "Recruiting" : "Not recruiting"}
        {group.state !== "forming" && (
          <span className="ml-1.5">· {group.state}</span>
        )}
      </div>

      {group.description && (
        <p className="text-[13px] text-gray-700 mb-2.5 line-clamp-2">
          {group.description}
        </p>
      )}

      <div className="flex items-center gap-1 mb-2">
        {group.members.slice(0, 4).map((m) => (
          <StudentAvatar
            key={m.user_id}
            name={m.display_name ?? "?"}
            size="size-7"
            textSize="text-[10px]"
          />
        ))}
        {group.members.length > 4 && (
          <span className="text-[11px] text-[#6B7280] ml-1">
            +{group.members.length - 4}
          </span>
        )}
      </div>

      {group.application_questions.length > 0 && (
        <div className="text-[11px] text-[#6B7280] mt-1">
          {group.application_questions.length} application question
          {group.application_questions.length === 1 ? "" : "s"}
        </div>
      )}

      {appliedStatus && appliedStatus !== "none" && STATUS_LABELS[appliedStatus] && (
        <div className="mt-2 pt-2 border-t border-[#F3F4F6]">
          <span
            className={cn(
              "inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium border",
              STATUS_LABELS[appliedStatus].cls,
            )}
          >
            {STATUS_LABELS[appliedStatus].l}
          </span>
        </div>
      )}
    </Card>
  );
}
