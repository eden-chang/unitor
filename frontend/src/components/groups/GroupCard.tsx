/**
 * Compact card that previews a forming group in the Discovery board's
 * Groups view.
 *
 * Mock-data only for now (uses ``STU`` to look up per-member overlap
 * hours). Stage 2 replaces the data shape with the real group + member
 * payload from the backend.
 */

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { STU } from "@/lib/mock-data";
import type { FormingGroup } from "@/lib/mock-data";

interface GroupCardProps {
  group: FormingGroup;
  appliedStatus: string;
  onClick: () => void;
}

export function GroupCard({ group, appliedStatus, onClick }: GroupCardProps) {
  const STATUS_LABELS: Record<string, { l: string; cls: string }> = {
    applied: { l: "Applied", cls: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]" },
    accepted: { l: "Accepted", cls: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]" },
    declined: { l: "Declined", cls: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]" },
  };

  const avgOverlap =
    group.members.reduce(
      (acc, m) => acc + (STU.find((s) => s.name === m.name)?.scheduleOverlapHrs ?? 0),
      0,
    ) / Math.max(group.members.length, 1);

  return (
    <Card
      className="p-4 gap-0 bg-white border-0 rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[15px] font-semibold text-[#111827]">
          {group.leaderName}'s Group
        </span>
        <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[12px] bg-[#9652ca]/10 text-[#9652ca]">
          {group.members.length}/{group.maxSize}
        </span>
      </div>

      <div className="text-[12px] text-[#6B7280] mb-2.5">Section {group.section}</div>

      <div className="flex flex-wrap items-center gap-1 mb-2.5">
        <span className="text-[12px] text-[#6B7280] mr-0.5">Looking for:</span>
        {group.neededSkills.slice(0, 3).map((sk) => (
          <span
            key={sk}
            className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]"
          >
            {sk}
          </span>
        ))}
        {group.neededSkills.length > 3 && (
          <span className="text-[12px] text-[#6B7280]">
            +{group.neededSkills.length - 3}
          </span>
        )}
      </div>

      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[12px] text-[#6B7280]">Avg. overlap</span>
          <span className="text-[13px] font-semibold text-[#9652ca]">
            {Math.round(avgOverlap)}h/wk
          </span>
        </div>
        <div className="h-1 rounded-full bg-[#E5E7EB] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#9652ca]"
            style={{ width: `${Math.min(100, (avgOverlap / 10) * 100)}%` }}
          />
        </div>
      </div>

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
