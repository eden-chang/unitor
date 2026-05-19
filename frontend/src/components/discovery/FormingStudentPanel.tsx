/**
 * Side-panel content shown when the viewer opens a student who is
 * already in a forming group.
 *
 * Two affordances:
 *   - **Join Their Group** — switches the parent panel to the
 *     ``GroupDetailPanel`` view.
 *   - **Chat** — opens a direct message thread with that student.
 */

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icons";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { cn } from "@/lib/utils";
import type { Student } from "@/types/ui";

interface FormingStudentPanelProps {
  student: Student;
  onViewGroup: () => void;
  hasGroup?: boolean;
  onChat?: () => void;
}

export function FormingStudentPanel({
  student,
  onViewGroup,
  hasGroup = true,
  onChat,
}: FormingStudentPanelProps) {
  return (
    <div className="p-6">
      <div className="flex gap-4 items-center mb-5">
        <StudentAvatar name={student.name} size="size-12" textSize="text-base" />
        <div className="flex-1">
          <div className="text-[18px] font-bold">{student.name}</div>
          <div className="text-sm text-gray-500">Section {student.sec}</div>
        </div>
        <span className="ml-auto py-1 px-3 bg-warning-bg text-warning text-xs font-semibold rounded-full border border-warning-border">
          Formed
        </span>
      </div>
      <div className="py-4 px-5 bg-gray-50 rounded-xl border border-gray-200 mb-5">
        <div className="text-[13px] font-semibold mb-1">
          {student.name.split(" ")[0]} is already in a formed group
        </div>
        <div className="text-[12px] text-gray-600">
          {hasGroup
            ? "You can't send a direct request, but you can apply to join their group."
            : "You can message them to discuss joining their group."}
        </div>
      </div>
      <div className="flex gap-2">
        {hasGroup && (
          <Button className="flex-1" onClick={onViewGroup}>
            Join Their Group →
          </Button>
        )}
        {onChat && (
          <Button
            variant="outline"
            className={cn(
              "gap-1.5 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5",
              hasGroup ? "flex-1" : "w-full",
            )}
            onClick={onChat}
          >
            <Icon.mailSend size={14} color="#9652ca" /> Chat
          </Button>
        )}
      </div>
    </div>
  );
}
