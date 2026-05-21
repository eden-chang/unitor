/**
 * Discovery board's "Groups" tab. Renders `GroupCard` for each
 * matching forming group, fed by the live `GET /courses/{id}/groups`
 * endpoint via `useGroupsList`.
 *
 * Filters: `filterRecruiting` from the parent maps to the
 * `recruiting_only=true` query param. Section + spots filters from
 * the prototype's DiscoveryPage are passed through too; section
 * filter wires to the API, spots filter is dropped for stage 2a
 * (no `max_size` on the backend — would need a schema decision
 * first).
 */

import { GroupCard } from "@/components/groups/GroupCard";
import { useAuth } from "@/context/auth-context";
import { useGroupsList } from "@/hooks/useGroups";

interface GroupsViewProps {
  onSelectGroup: (groupId: string) => void;
  appliedGroups: Record<string, string>;
  filterRecruiting?: boolean;
  sectionId?: string;
}

export function GroupsView({
  onSelectGroup,
  appliedGroups,
  filterRecruiting = false,
  sectionId,
}: GroupsViewProps) {
  const { enrollments } = useAuth();
  const courseId = enrollments[0]?.course.id;
  const { data, isLoading, error } = useGroupsList(courseId, {
    section_id: sectionId,
    recruiting: filterRecruiting || undefined,
  });

  if (!courseId) {
    return (
      <div className="text-center py-16 text-gray-400 text-[13px]">
        No active enrollment.
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="text-center py-16 text-gray-400 text-[13px]">
        Loading groups…
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-16 text-danger text-[13px]">
        Couldn&apos;t load groups: {error.message}
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
      {items.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          appliedStatus={appliedGroups[group.id] || "none"}
          onClick={() => onSelectGroup(group.id)}
        />
      ))}
      {items.length === 0 && (
        <div className="col-span-full text-center py-16 text-gray-400">
          No groups found.
        </div>
      )}
    </div>
  );
}
