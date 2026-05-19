/**
 * Discovery board's "Groups" tab. Renders ``GroupCard`` for each
 * matching forming group, with a section filter on top.
 */

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupCard } from "@/components/groups/GroupCard";
import { FORMING_GROUPS } from "@/lib/mock-data";

interface GroupsViewProps {
  onSelectGroup: (groupId: string) => void;
  appliedGroups: Record<string, string>;
  filterRecruiting?: boolean;
}

export function GroupsView({
  onSelectGroup,
  appliedGroups,
  filterRecruiting = false,
}: GroupsViewProps) {
  const [secFilter, setSecFilter] = useState("all");
  const filtered = FORMING_GROUPS.filter((g) => {
    if (secFilter !== "all" && g.section !== secFilter) return false;
    if (filterRecruiting && g.members.length >= g.maxSize) return false;
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <Select value={secFilter} onValueChange={setSecFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            <SelectItem value="201">201</SelectItem>
            <SelectItem value="202">202</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            appliedStatus={appliedGroups[group.id] || "none"}
            onClick={() => onSelectGroup(group.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            No recruiting groups found.
          </div>
        )}
      </div>
    </div>
  );
}
