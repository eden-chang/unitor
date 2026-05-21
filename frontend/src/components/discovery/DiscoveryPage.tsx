/**
 * Discovery board — People and Groups tabs.
 *
 * **People** is live as of stage 1 step E: `GET /courses/{id}/students`
 * paginated via `useInfiniteQuery`, scores merged in from
 * `POST /compatibility/batch`, filters wired to the section + skill
 * catalogs. Local-only state (favorites, hidden, contact-status chips)
 * stays in `localStorage` keyed by user_id.
 *
 * **Groups** is still on mock `FORMING_GROUPS` for stage 1 with a banner
 * pointing at stage 2. The group flow needs more endpoints landing
 * first (membership, application questions, etc.) and falls outside
 * the live slice.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Icon } from "@/components/shared/icons";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { FilterDropdown } from "@/components/discovery/FilterDropdown";
import { GroupsView } from "@/components/groups/GroupsView";
import * as apiCourses from "@/api/courses";
import { useAuth } from "@/context/auth-context";
import { useCourseSkills } from "@/hooks/useCourseSkills";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useDiscoveryStudents,
  type MergedStudent,
} from "@/hooks/useDiscovery";
import { LS_PREFIX } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import {
  CONTACT_STATUS_LABELS,
  FORMING_GROUPS,
} from "@/lib/mock-data";
import type { GoProps } from "@/types/ui";

interface DiscoveryProps extends GoProps {
  onSelectStudent: (student: MergedStudent) => void;
  urgentMode?: boolean;
  onSelectGroup?: (id: string) => void;
  appliedGroups?: Record<string, string>;
  contactStatuses?: Record<string, string>;
  onContactStatusChange?: (userId: string, status: string) => void;
  onOpenChat?: (userId: string) => void;
}

export function Discovery({
  go,
  onSelectStudent,
  urgentMode = false,
  onSelectGroup,
  appliedGroups = {},
  contactStatuses = {},
}: DiscoveryProps) {
  const { enrollments } = useAuth();
  const enrollment = enrollments[0];
  const courseId = enrollment?.course.id;
  const viewerName = enrollment?.course.code ?? "Discovery";

  const [view, setView] = useState<"people" | "groups">("people");
  const [urgentDismissed, setUrgentDismissed] = useState(false);
  const [secFilter, setSecFilter] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState<string>("any");
  const [sortBy, setSortBy] = useState<SortKey>("best");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 250);

  // Local-only state keyed by user_id (uuid string).
  const [hiddenIds, setHiddenIds] = usePersistentSet("hiddenIds");
  const [starredIds, setStarredIds] = usePersistentSet("starredIds");
  const [filterSolo, setFilterSolo] = useState(false);
  const [filterOpenGroup, setFilterOpenGroup] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterRecruiting, setFilterRecruiting] = useState(false);
  const [hideConfirmTarget, setHideConfirmTarget] = useState<string | null>(null);
  const [hiddenPopover, setHiddenPopover] = useState(false);
  const [sectionPopover, setSectionPopover] = useState(false);
  const [skillsPopover, setSkillsPopover] = useState(false);
  const [overlapPopover, setOverlapPopover] = useState(false);
  const [activityPopover, setActivityPopover] = useState(false);
  const [spotsPopover, setSpotsPopover] = useState(false);
  const [minOverlapHrs, setMinOverlapHrs] = useState(0);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [spotsFilter, setSpotsFilter] = useState<string>("any");

  // Derived (no useEffect): when the urgentMode prop is on, force Solo and
  // clear Open Group. The local toggles still operate; once urgentMode
  // turns off, they take effect again. This replaces the prototype's
  // `useEffect` -> `setState` sync that previously tripped the
  // react-hooks/set-state-in-effect rule.
  const effectiveFilterSolo = urgentMode ? true : filterSolo;
  const effectiveFilterOpenGroup = urgentMode ? false : filterOpenGroup;

  const sectionsQuery = useQuery({
    queryKey: ["courses", courseId, "sections"],
    enabled: !!courseId,
    staleTime: Infinity,
    queryFn: () => apiCourses.listSections(courseId as string),
  });
  const skillCatalog = useCourseSkills(courseId);

  const discovery = useDiscoveryStudents(courseId, {
    section_id: secFilter !== "all" ? secFilter : undefined,
    skill_id: skillFilter !== "any" ? skillFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const visibleStudents = useMemo(() => {
    const arr = discovery.items.filter((st) => {
      if (effectiveFilterSolo && !effectiveFilterOpenGroup && st.group_status !== "solo")
        return false;
      if (effectiveFilterOpenGroup && !effectiveFilterSolo && st.group_status !== "in_group")
        return false;
      if (filterFavorites && !starredIds.has(st.user_id)) return false;
      if (minOverlapHrs > 0) {
        const hrs = st.score?.schedule_overlap_hours ?? 0;
        if (hrs < minOverlapHrs) return false;
      }
      if (activityFilter !== "all") {
        const cs = contactStatuses[st.user_id] || "none";
        if (cs !== activityFilter) return false;
      }
      return true;
    });
    return arr.sort((a, b) => {
      const hidA = hiddenIds.has(a.user_id) ? 1 : 0;
      const hidB = hiddenIds.has(b.user_id) ? 1 : 0;
      if (hidA !== hidB) return hidA - hidB;
      const aS = starredIds.has(a.user_id) ? 1 : 0;
      const bS = starredIds.has(b.user_id) ? 1 : 0;
      if (bS !== aS) return bS - aS;
      switch (sortBy) {
        case "best":
          return (b.score?.overall_score ?? -1) - (a.score?.overall_score ?? -1);
        case "overlap":
          return (
            (b.score?.schedule_overlap_hours ?? -1) -
            (a.score?.schedule_overlap_hours ?? -1)
          );
        case "active":
          return (
            new Date(b.profile?.last_active_at ?? 0).getTime() -
            new Date(a.profile?.last_active_at ?? 0).getTime()
          );
        case "name":
          return (a.display_name ?? "").localeCompare(b.display_name ?? "");
        case "newest":
          return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
        default:
          return 0;
      }
    });
  }, [
    discovery.items,
    effectiveFilterSolo,
    effectiveFilterOpenGroup,
    filterFavorites,
    starredIds,
    hiddenIds,
    minOverlapHrs,
    activityFilter,
    contactStatuses,
    sortBy,
  ]);

  const clearFilters = () => {
    setSecFilter("all");
    setSkillFilter("any");
    setSortBy("best");
    setFilterSolo(false);
    setFilterOpenGroup(false);
    setFilterFavorites(false);
    setMinOverlapHrs(0);
    setActivityFilter("all");
    setSearchQuery("");
  };

  const skillsById = useMemo(() => {
    const map = new Map<string, string>();
    if (skillCatalog.data) {
      for (const s of skillCatalog.data) {
        map.set(s.id, s.skill_name);
      }
    }
    return map;
  }, [skillCatalog.data]);

  if (!enrollment) {
    return (
      <DiscoveryShell heading="Join a course first" body="You don't have any active enrollments yet." />
    );
  }

  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[1120px] mx-auto py-10 px-12">
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="text-[13px] text-gray-500">
              {viewerName}
              {enrollment.section_code ? ` · Section ${enrollment.section_code}` : ""}
            </div>
            <h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">
              Find Teammates
            </h1>
          </div>
          {view === "people" ? (
            <span className="text-[13px] text-gray-500">
              {discovery.isLoading
                ? "Loading…"
                : `${visibleStudents.length} student${visibleStudents.length !== 1 ? "s" : ""}`}
            </span>
          ) : (
            <span className="text-[13px] text-gray-500">
              {FORMING_GROUPS.length} group{FORMING_GROUPS.length !== 1 ? "s" : ""} recruiting
            </span>
          )}
        </div>

        {urgentMode && !urgentDismissed && (
          <UrgentBanner go={go} onDismiss={() => setUrgentDismissed(true)} />
        )}

        {discovery.viewerProfileIncomplete && (
          <div className="flex items-center gap-3 px-5 py-3 bg-caution-bg border border-caution-border rounded-xl mb-5">
            <span className="text-caution text-lg">!</span>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-caution">
                Your profile is incomplete
              </div>
              <div className="text-[12px] text-caution-dark">
                Finish setting up to see compatibility scores.
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => go("profile-edit")}>
              Edit Profile
            </Button>
          </div>
        )}

        {discovery.error && (
          <div className="px-5 py-3 bg-danger-bg border border-danger-border rounded-xl mb-5 text-[13px] text-danger">
            Couldn&apos;t load the board: {discovery.error.message}
          </div>
        )}

        <div className="flex items-end justify-between border-b border-border h-12 px-0 mb-0">
          <div className="flex h-full items-end gap-6">
            {(["people", "groups"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "pb-[14px] text-[14px] border-b-2 capitalize transition-colors cursor-pointer",
                  view === v
                    ? "font-semibold text-[#111827] border-[#9652ca]"
                    : "font-normal text-[#9CA3AF] border-transparent hover:border-[#9652ca]/40",
                )}
              >
                {v === "people" ? "People" : "Groups"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 py-3 border-b border-border flex-wrap">
          {view === "people" ? (
            <>
              {[
                {
                  label: "Solo",
                  active: effectiveFilterSolo,
                  toggle: () => setFilterSolo((v) => !v),
                  disabled: urgentMode,
                },
                {
                  label: "Open Group",
                  active: effectiveFilterOpenGroup,
                  toggle: () => setFilterOpenGroup((v) => !v),
                  disabled: urgentMode,
                },
                {
                  label: "Favorites",
                  active: filterFavorites,
                  toggle: () => setFilterFavorites((v) => !v),
                  disabled: false,
                },
              ].map(({ label, active, toggle, disabled }) => (
                <button
                  key={label}
                  onClick={disabled ? undefined : toggle}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-1.5 h-[34px] px-[14px] rounded-[20px] text-[13px] border shrink-0 transition-colors cursor-pointer whitespace-nowrap",
                    active
                      ? "bg-[#9652ca]/10 border-[#9652ca] text-[#9652ca]"
                      : "bg-white border-[#D1D5DB] text-[#374151] hover:border-gray-400",
                    disabled && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {active && <span className="text-[11px]">✓</span>}
                  {label}
                </button>
              ))}

              <FilterDropdown
                label={
                  secFilter !== "all"
                    ? sectionsQuery.data?.find((s) => s.id === secFilter)?.code ?? "Section"
                    : "Section"
                }
                active={secFilter !== "all"}
                open={sectionPopover}
                onToggle={() => setSectionPopover((o) => !o)}
                onClose={() => setSectionPopover(false)}
              >
                <div className="py-1 min-w-[180px]">
                  <button
                    onClick={() => {
                      setSecFilter("all");
                      setSectionPopover(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                      secFilter === "all" && "text-[#9652ca] font-medium",
                    )}
                  >
                    All Sections
                  </button>
                  {(sectionsQuery.data ?? []).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSecFilter(s.id);
                        setSectionPopover(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                        secFilter === s.id && "text-[#9652ca] font-medium",
                      )}
                    >
                      Section {s.code}
                    </button>
                  ))}
                </div>
              </FilterDropdown>

              <FilterDropdown
                label={
                  skillFilter !== "any"
                    ? skillsById.get(skillFilter) ?? "Skill"
                    : "Skills"
                }
                active={skillFilter !== "any"}
                open={skillsPopover}
                onToggle={() => setSkillsPopover((o) => !o)}
                onClose={() => setSkillsPopover(false)}
              >
                <div className="py-1 min-w-[200px] max-h-[260px] overflow-y-auto">
                  <button
                    onClick={() => {
                      setSkillFilter("any");
                      setSkillsPopover(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                      skillFilter === "any" && "text-[#9652ca] font-medium",
                    )}
                  >
                    Any skill
                  </button>
                  {(skillCatalog.data ?? []).map((sk) => (
                    <button
                      key={sk.id}
                      onClick={() => {
                        setSkillFilter(sk.id);
                        setSkillsPopover(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                        skillFilter === sk.id && "text-[#9652ca] font-medium",
                      )}
                    >
                      {sk.skill_name}
                    </button>
                  ))}
                </div>
              </FilterDropdown>

              <FilterDropdown
                label={minOverlapHrs > 0 ? `Overlap ≥${minOverlapHrs}h` : "Overlap"}
                active={minOverlapHrs > 0}
                open={overlapPopover}
                onToggle={() => setOverlapPopover((o) => !o)}
                onClose={() => setOverlapPopover(false)}
              >
                <div className="p-4 w-56">
                  <div className="flex justify-between text-[12px] text-[#6B7280] mb-2">
                    <span>0h</span>
                    <span className="font-semibold text-[#111827]">{minOverlapHrs}h+</span>
                    <span>20h</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={minOverlapHrs}
                    onChange={(e) => setMinOverlapHrs(Number(e.target.value))}
                    className="w-full accent-[#9652ca]"
                  />
                  {minOverlapHrs > 0 && (
                    <button
                      onClick={() => setMinOverlapHrs(0)}
                      className="mt-2 text-[12px] text-[#9652ca] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </FilterDropdown>

              <FilterDropdown
                label={
                  activityFilter !== "all"
                    ? ({
                        none: "No contact yet",
                        "request-sent": "Request Sent",
                        replied: "Replied",
                        "no-response": "No Response",
                        declined: "Declined",
                      } as Record<string, string>)[activityFilter] ?? activityFilter
                    : "My Activity"
                }
                active={activityFilter !== "all"}
                open={activityPopover}
                onToggle={() => setActivityPopover((o) => !o)}
                onClose={() => setActivityPopover(false)}
              >
                <div className="py-1">
                  {[
                    ["all", "All"],
                    ["none", "No contact yet"],
                    ["request-sent", "Request Sent"],
                    ["replied", "Replied"],
                    ["no-response", "No Response"],
                    ["declined", "Declined"],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => {
                        setActivityFilter(v);
                        setActivityPopover(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50 whitespace-nowrap",
                        activityFilter === v && "text-[#9652ca] font-medium",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </FilterDropdown>

              {hiddenIds.size > 0 && (
                <FilterDropdown
                  label={`Hidden (${hiddenIds.size})`}
                  active={true}
                  open={hiddenPopover}
                  onToggle={() => setHiddenPopover((o) => !o)}
                  onClose={() => setHiddenPopover(false)}
                >
                  <div className="py-1 min-w-[180px]">
                    {[...hiddenIds].map((id) => {
                      const stu = discovery.items.find((s) => s.user_id === id);
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between px-3 py-2"
                        >
                          <span className="text-[13px]">
                            {stu?.display_name ?? "Hidden student"}
                          </span>
                          <button
                            onClick={() => {
                              setHiddenIds((prev) => {
                                const n = new Set(prev);
                                n.delete(id);
                                return n;
                              });
                            }}
                            className="text-[12px] text-[#9652ca] hover:underline cursor-pointer"
                          >
                            Restore
                          </button>
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-1">
                      <button
                        onClick={() => {
                          setHiddenIds(new Set());
                          setHiddenPopover(false);
                        }}
                        className="text-[12px] text-[#991B1B] hover:underline cursor-pointer"
                      >
                        Restore All
                      </button>
                    </div>
                  </div>
                </FilterDropdown>
              )}

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name…"
                className="ml-auto h-[34px] px-3 rounded-[20px] text-[13px] border border-[#D1D5DB] focus:outline-none focus:border-[#9652ca] w-[200px]"
              />
            </>
          ) : (
            <GroupsFilterBar
              secFilter={secFilter}
              setSecFilter={setSecFilter}
              filterRecruiting={filterRecruiting}
              setFilterRecruiting={setFilterRecruiting}
              spotsFilter={spotsFilter}
              setSpotsFilter={setSpotsFilter}
              sectionPopover={sectionPopover}
              setSectionPopover={setSectionPopover}
              spotsPopover={spotsPopover}
              setSpotsPopover={setSpotsPopover}
              sections={sectionsQuery.data ?? []}
            />
          )}
        </div>

        <ConfirmDialog
          open={hideConfirmTarget !== null}
          title="Hide this student?"
          body="They'll be moved to the bottom of the list and grayed out. You can restore them anytime."
          confirmLabel="Hide"
          onConfirm={() => {
            if (hideConfirmTarget) {
              setHiddenIds((prev) => new Set([...prev, hideConfirmTarget]));
            }
            setHideConfirmTarget(null);
          }}
          onCancel={() => setHideConfirmTarget(null)}
        />

        {view === "groups" ? (
          <>
            <div className="px-5 py-3 mt-3 bg-caution-bg border border-caution-border rounded-xl text-[13px] text-caution-dark">
              <strong className="text-caution">Stage 2 preview.</strong> Group
              data below is mock — the live group endpoints arrive in stage 2.
            </div>
            <GroupsView
              onSelectGroup={onSelectGroup ?? (() => {})}
              appliedGroups={appliedGroups}
              filterRecruiting={filterRecruiting}
            />
          </>
        ) : (
          <>
            <div className="flex justify-end items-center py-2">
              <div className="flex items-center gap-1 text-[13px] text-[#6B7280]">
                <span>Sort:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="h-7 border-none shadow-none text-[13px] text-[#6B7280] w-auto gap-1 px-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Best Match</SelectItem>
                    <SelectItem value="overlap">Most Overlap</SelectItem>
                    <SelectItem value="active">Recently Active</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {discovery.isLoading ? (
              <div className="py-16 text-center text-[13px] text-gray-400">
                Loading classmates…
              </div>
            ) : visibleStudents.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-[15px] font-semibold text-gray-500 mb-2">
                  No students match your filters
                </div>
                <p className="text-[13px] text-gray-400 mb-4">
                  Try adjusting your criteria.
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleStudents.map((st) => (
                  <StudentCard
                    key={st.user_id}
                    student={st}
                    skillsById={skillsById}
                    starred={starredIds.has(st.user_id)}
                    hidden={hiddenIds.has(st.user_id)}
                    contactStatus={contactStatuses[st.user_id]}
                    onClick={() => onSelectStudent(st)}
                    onToggleStar={() =>
                      setStarredIds((prev) => {
                        const n = new Set(prev);
                        if (n.has(st.user_id)) n.delete(st.user_id);
                        else n.add(st.user_id);
                        return n;
                      })
                    }
                    onHide={() => setHideConfirmTarget(st.user_id)}
                  />
                ))}
              </div>
            )}

            {discovery.hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  disabled={discovery.isFetchingMore}
                  onClick={() => discovery.loadMore()}
                >
                  {discovery.isFetchingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bits
// ---------------------------------------------------------------------------

type SortKey = "best" | "overlap" | "active" | "name" | "newest";

interface StudentCardProps {
  student: MergedStudent;
  skillsById: Map<string, string>;
  starred: boolean;
  hidden: boolean;
  contactStatus: string | undefined;
  onClick: () => void;
  onToggleStar: () => void;
  onHide: () => void;
}

function StudentCard({
  student,
  skillsById,
  starred,
  hidden,
  contactStatus,
  onClick,
  onToggleStar,
  onHide,
}: StudentCardProps) {
  const name = student.display_name ?? "Pending name";
  const skillNames = (student.profile?.skills ?? [])
    .slice(0, 3)
    .map((s) => skillsById.get(s.course_skill_id))
    .filter((v): v is string => !!v);
  const totalSkills = student.profile?.skills.length ?? 0;
  const overlap = student.score?.schedule_overlap_hours ?? null;
  const overall = student.score?.overall_score ?? null;

  return (
    <Card
      className={cn(
        "p-4 gap-0 bg-white border-0 rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer relative group",
        hidden && "opacity-40 pointer-events-none select-none",
      )}
      onClick={hidden ? undefined : onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2.5">
          <StudentAvatar name={name} size="size-9" textSize="text-[11px]" />
          <span className="text-[15px] font-semibold text-[#111827] leading-snug">
            {name}
          </span>
        </div>
        <div className="flex gap-1 ml-2 shrink-0 items-center pointer-events-auto relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className="p-0.5 rounded transition-colors cursor-pointer"
            aria-label="Toggle favorite"
          >
            {starred ? (
              <Icon.starFilled size={14} color="#9652ca" />
            ) : (
              <Icon.star size={14} color="#D1D5DB" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
            className="p-0.5 rounded transition-all cursor-pointer"
            aria-label="Toggle visibility"
          >
            {hidden ? (
              <Icon.eyeOff size={14} color="#9CA3AF" />
            ) : (
              <Icon.eyeOpen size={14} color="#D1D5DB" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2.5">
        <span
          className={cn(
            "inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium",
            student.group_status === "solo"
              ? "bg-[#DCFCE7] text-[#166534]"
              : "bg-[#FEF3C7] text-[#92400E]",
          )}
        >
          {student.group_status === "solo" ? "Solo" : "In Group"}
        </span>
        {contactStatus && contactStatus !== "none" && CONTACT_STATUS_LABELS[contactStatus] && (
          <span
            className={cn(
              "inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium",
              CONTACT_STATUS_LABELS[contactStatus].cls,
            )}
          >
            {CONTACT_STATUS_LABELS[contactStatus].l}
          </span>
        )}
        {student.section_code && (
          <span className="text-[12px] text-[#6B7280]">{student.section_code}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-2.5">
        {skillNames.map((sk) => (
          <span
            key={sk}
            className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]"
          >
            {sk}
          </span>
        ))}
        {totalSkills > 3 && (
          <span className="text-[12px] text-[#6B7280]">+{totalSkills - 3}</span>
        )}
        {totalSkills === 0 && (
          <span className="text-[12px] text-gray-400">No skills yet</span>
        )}
      </div>

      {overall !== null ? (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-[#6B7280]">Compatibility</span>
          <span
            className={cn(
              "text-[13px] font-semibold",
              overall >= 80 ? "text-[#22C55E]" : overall >= 50 ? "text-[#9652ca]" : "text-[#9CA3AF]",
            )}
          >
            {overall}%
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-[#6B7280]">Compatibility</span>
          <span className="text-[12px] text-gray-400">
            {student.skipped_reason === "target_profile_incomplete"
              ? "Profile incomplete"
              : student.skipped_reason === "viewer_profile_incomplete"
                ? "Finish yours first"
                : "…"}
          </span>
        </div>
      )}

      {overlap !== null && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[12px] text-[#6B7280]">Overlap</span>
            <span
              className={cn(
                "text-[13px] font-semibold",
                overlap >= 6 ? "text-[#9652ca]" : "text-[#9CA3AF]",
              )}
            >
              {overlap}h/wk
            </span>
          </div>
          <div className="h-1 rounded-full bg-[#E5E7EB] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (overlap / 10) * 100)}%`,
                backgroundColor:
                  overlap >= 7 ? "#22C55E" : overlap >= 4 ? "#9652ca" : "#9CA3AF",
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usePersistentSet(key: string): [Set<string>, (next: Set<string> | ((prev: Set<string>) => Set<string>)) => void] {
  const [state, setState] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(LS_PREFIX + key);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const setPersisted = (next: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setState((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      try {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify([...v]));
      } catch {
        /* ignore */
      }
      return v;
    });
  };

  return [state, setPersisted];
}

function UrgentBanner({ go, onDismiss }: { go: (p: string) => void; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-danger-bg border border-danger-border rounded-xl mb-5">
      <span className="text-danger text-lg">⚠</span>
      <div className="flex-1">
        <div className="text-[13px] font-bold text-danger">Deadline approaching</div>
        <div className="text-[12px] text-danger">
          Respond quickly — No Response triggers after 24h.
        </div>
      </div>
      <Button
        size="sm"
        variant="destructive"
        className="text-xs px-3"
        onClick={() => go("urgent")}
      >
        View Details
      </Button>
      <button
        onClick={onDismiss}
        className="text-[12px] text-[#6B7280] hover:underline cursor-pointer shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}

interface GroupsFilterBarProps {
  secFilter: string;
  setSecFilter: (v: string) => void;
  filterRecruiting: boolean;
  setFilterRecruiting: (v: boolean | ((prev: boolean) => boolean)) => void;
  spotsFilter: string;
  setSpotsFilter: (v: string) => void;
  sectionPopover: boolean;
  setSectionPopover: (v: boolean | ((prev: boolean) => boolean)) => void;
  spotsPopover: boolean;
  setSpotsPopover: (v: boolean | ((prev: boolean) => boolean)) => void;
  sections: { id: string; code: string }[];
}

function GroupsFilterBar({
  secFilter,
  setSecFilter,
  filterRecruiting,
  setFilterRecruiting,
  spotsFilter,
  setSpotsFilter,
  sectionPopover,
  setSectionPopover,
  spotsPopover,
  setSpotsPopover,
  sections,
}: GroupsFilterBarProps) {
  return (
    <>
      <button
        onClick={() => setFilterRecruiting((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 h-[34px] px-[14px] rounded-[20px] text-[13px] border shrink-0 transition-colors cursor-pointer whitespace-nowrap",
          filterRecruiting
            ? "bg-[#9652ca]/10 border-[#9652ca] text-[#9652ca]"
            : "bg-white border-[#D1D5DB] text-[#374151] hover:border-gray-400",
        )}
      >
        {filterRecruiting && <span className="text-[11px]">✓</span>}
        Recruiting
      </button>

      <FilterDropdown
        label={
          secFilter !== "all"
            ? sections.find((s) => s.id === secFilter)?.code ?? "Section"
            : "Section"
        }
        active={secFilter !== "all"}
        open={sectionPopover}
        onToggle={() => setSectionPopover((o) => !o)}
        onClose={() => setSectionPopover(false)}
      >
        <div className="py-1">
          <button
            onClick={() => {
              setSecFilter("all");
              setSectionPopover(false);
            }}
            className={cn(
              "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
              secFilter === "all" && "text-[#9652ca] font-medium",
            )}
          >
            All Sections
          </button>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSecFilter(s.id);
                setSectionPopover(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                secFilter === s.id && "text-[#9652ca] font-medium",
              )}
            >
              Section {s.code}
            </button>
          ))}
        </div>
      </FilterDropdown>

      <FilterDropdown
        label="Spots Open"
        active={spotsFilter !== "any"}
        open={spotsPopover}
        onToggle={() => setSpotsPopover((o) => !o)}
        onClose={() => setSpotsPopover(false)}
      >
        <div className="py-1">
          {[
            ["any", "Any"],
            ["1+", "1+"],
            ["2+", "2+"],
            ["3+", "3+"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => {
                setSpotsFilter(v);
                setSpotsPopover(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                spotsFilter === v && "text-[#9652ca] font-medium",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </FilterDropdown>
    </>
  );
}

function DiscoveryShell({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[500px] mx-auto pt-20 px-6 text-center">
        <h1 className="text-[24px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          {heading}
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
