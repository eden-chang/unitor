/**
 * Discovery board — the People and Groups tabs.
 *
 * Reads from the mock-data constants in ``@/lib/mock-data`` for now.
 * Stage 1 step E replaces ``STU`` with
 * ``GET /api/v1/courses/{course_id}/students`` and the per-card score
 * with the merged ``POST /api/v1/compatibility/batch`` result.
 */

import { useEffect, useState } from "react";

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
import { LS_PREFIX } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import {
  CONTACT_STATUS_LABELS,
  FORMING_GROUPS,
  STU,
  isRecentlyActive,
  parseActivityMinutes,
} from "@/lib/mock-data";
import type { GoProps } from "@/types/ui";

interface DiscoveryProps extends GoProps {
  onSelectStudent: (name: string) => void;
  urgentMode?: boolean;
  onSelectGroup?: (id: string) => void;
  appliedGroups?: Record<string, string>;
  contactStatuses?: Record<string, string>;
  onContactStatusChange?: (name: string, status: string) => void;
  onOpenChat?: (name: string) => void;
}

export function Discovery({
  go,
  onSelectStudent,
  urgentMode = false,
  onSelectGroup,
  appliedGroups = {},
  contactStatuses = {},
}: DiscoveryProps) {
  const [view, setView] = useState<"people" | "groups">("people");
  const [urgentDismissed, setUrgentDismissed] = useState(false);
  const [secFilter, setSecFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("any");
  const [sortBy, setSortBy] = useState("best");
  const [searchQuery] = useState("");
  const [hiddenStudents, setHiddenStudents] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem(LS_PREFIX + "hidden");
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [starredStudents, setStarredStudents] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem(LS_PREFIX + "starred");
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });
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
  const [minOverlapPct, setMinOverlapPct] = useState(0);
  const [activityFilter2, setActivityFilter2] = useState("all");
  const [spotsFilter, setSpotsFilter] = useState("any");

  useEffect(() => {
    localStorage.setItem(LS_PREFIX + "starred", JSON.stringify([...starredStudents]));
  }, [starredStudents]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + "hidden", JSON.stringify([...hiddenStudents]));
  }, [hiddenStudents]);

  useEffect(() => {
    if (urgentMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prototype pattern, fixed during stage 1 step E (Discovery wiring)
      setFilterSolo(true);
      setFilterOpenGroup(false);
    } else {
      setFilterSolo(false);
    }
  }, [urgentMode]);

  const toggleStar = (name: string) =>
    setStarredStudents((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  const filteredStudents = STU.filter((st) => {
    if (st.status === "closed") return false;
    const cs = contactStatuses[st.name] || "none";
    if (cs === "accepted") return false;
    if (secFilter !== "all" && st.sec !== secFilter) return false;
    if (skillFilter !== "any") {
      const target =
        skillFilter === "frontend"
          ? "Frontend Dev"
          : skillFilter === "backend"
          ? "Backend"
          : skillFilter === "ui"
          ? "UI Design"
          : skillFilter === "research"
          ? "User Research"
          : skillFilter === "proto"
          ? "Prototyping"
          : skillFilter === "data"
          ? "Data Analysis"
          : skillFilter === "ux"
          ? "UX Writing"
          : "Project Mgmt";
      if (!st.skills.includes(target)) return false;
    }
    if (minOverlapPct > 0 && (st.scheduleOverlapHrs / 10) * 100 < minOverlapPct)
      return false;
    if (filterSolo && !filterOpenGroup && st.status !== "solo") return false;
    if (filterOpenGroup && !filterSolo && st.status !== "open-group") return false;
    if (filterSolo && filterOpenGroup && st.status !== "solo" && st.status !== "open-group")
      return false;
    if (filterFavorites && !starredStudents.has(st.name)) return false;
    if (activityFilter2 !== "all") {
      const cs2 = contactStatuses[st.name] || "none";
      if (cs2 !== activityFilter2) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !st.name.toLowerCase().includes(q) &&
        !st.skills.some((sk) => sk.toLowerCase().includes(q)) &&
        !st.bio.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  }).sort((a, b) => {
    const hidA = hiddenStudents.has(a.name) ? 1 : 0;
    const hidB = hiddenStudents.has(b.name) ? 1 : 0;
    if (hidA !== hidB) return hidA - hidB;
    const aS = starredStudents.has(a.name) ? 1 : 0;
    const bS = starredStudents.has(b.name) ? 1 : 0;
    if (bS !== aS) return bS - aS;
    switch (sortBy) {
      case "best":
        return b.compatScore - a.compatScore;
      case "overlap":
        return b.scheduleOverlapHrs - a.scheduleOverlapHrs;
      case "active":
        return parseActivityMinutes(a.lastActive) - parseActivityMinutes(b.lastActive);
      case "name":
        return a.name.localeCompare(b.name);
      case "newest":
        return STU.indexOf(b) - STU.indexOf(a);
      default:
        return 0;
    }
  });

  const clearFilters = () => {
    setSecFilter("all");
    setSkillFilter("any");
    setSortBy("best");
    setFilterSolo(false);
    setFilterOpenGroup(false);
    setFilterFavorites(false);
    setMinOverlapPct(0);
    setActivityFilter2("all");
  };

  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[1120px] mx-auto py-10 px-12">
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="text-[13px] text-gray-500">CSC318 · Section 201</div>
            <h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">
              Find Teammates
            </h1>
          </div>
          {view === "people" ? (
            <span className="text-[13px] text-gray-500">
              {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found
            </span>
          ) : (
            <span className="text-[13px] text-gray-500">
              {FORMING_GROUPS.length} group{FORMING_GROUPS.length !== 1 ? "s" : ""} recruiting
            </span>
          )}
        </div>

        {urgentMode && !urgentDismissed && (
          <div className="flex items-center gap-3 px-5 py-3 bg-danger-bg border border-danger-border rounded-xl mb-5">
            <span className="text-danger text-lg">⚠</span>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-danger">Deadline in 3 days</div>
              <div className="text-[12px] text-danger">
                12 students still ungrouped. Respond quickly — No Response triggers after 24h.
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
              onClick={() => setUrgentDismissed(true)}
              className="text-[12px] text-[#6B7280] hover:underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
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
                { label: "Solo", active: filterSolo, toggle: () => setFilterSolo((v) => !v) },
                {
                  label: "Open Group",
                  active: filterOpenGroup,
                  toggle: () => setFilterOpenGroup((v) => !v),
                },
                {
                  label: "Favorites",
                  active: filterFavorites,
                  toggle: () => setFilterFavorites((v) => !v),
                },
              ].map(({ label, active, toggle }) => (
                <button
                  key={label}
                  onClick={toggle}
                  className={cn(
                    "flex items-center gap-1.5 h-[34px] px-[14px] rounded-[20px] text-[13px] border shrink-0 transition-colors cursor-pointer whitespace-nowrap",
                    active
                      ? "bg-[#9652ca]/10 border-[#9652ca] text-[#9652ca]"
                      : "bg-white border-[#D1D5DB] text-[#374151] hover:border-gray-400",
                  )}
                >
                  {active && <span className="text-[11px]">✓</span>}
                  {label}
                </button>
              ))}

              <FilterDropdown
                label={secFilter !== "all" ? secFilter : "Section"}
                active={secFilter !== "all"}
                open={sectionPopover}
                onToggle={() => setSectionPopover((o) => !o)}
                onClose={() => setSectionPopover(false)}
              >
                <div className="py-1">
                  {["all", "201", "202", "203"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSecFilter(s);
                        setSectionPopover(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                        secFilter === s && "text-[#9652ca] font-medium",
                      )}
                    >
                      {s === "all" ? "All Sections" : `Section ${s}`}
                    </button>
                  ))}
                </div>
              </FilterDropdown>

              <FilterDropdown
                label={skillFilter !== "any" ? `Skills (1)` : "Skills"}
                active={skillFilter !== "any"}
                open={skillsPopover}
                onToggle={() => setSkillsPopover((o) => !o)}
                onClose={() => setSkillsPopover(false)}
              >
                <div className="py-1 min-w-[200px]">
                  {[
                    "any",
                    "frontend",
                    "backend",
                    "ui",
                    "research",
                    "proto",
                    "data",
                    "ux",
                    "pm",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSkillFilter(s);
                        setSkillsPopover(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                        skillFilter === s && "text-[#9652ca] font-medium",
                      )}
                    >
                      {s === "any"
                        ? "Any skill"
                        : s === "frontend"
                        ? "Frontend Dev"
                        : s === "backend"
                        ? "Backend"
                        : s === "ui"
                        ? "UI Design"
                        : s === "research"
                        ? "User Research"
                        : s === "proto"
                        ? "Prototyping"
                        : s === "data"
                        ? "Data Analysis"
                        : s === "ux"
                        ? "UX Writing"
                        : "Project Mgmt"}
                    </button>
                  ))}
                </div>
              </FilterDropdown>

              <FilterDropdown
                label={minOverlapPct > 0 ? `Overlap ≥${minOverlapPct}%` : "Overlap"}
                active={minOverlapPct > 0}
                open={overlapPopover}
                onToggle={() => setOverlapPopover((o) => !o)}
                onClose={() => setOverlapPopover(false)}
              >
                <div className="p-4 w-56">
                  <div className="flex justify-between text-[12px] text-[#6B7280] mb-2">
                    <span>0%</span>
                    <span className="font-semibold text-[#111827]">{minOverlapPct}%+</span>
                    <span>100%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={minOverlapPct}
                    onChange={(e) => setMinOverlapPct(Number(e.target.value))}
                    className="w-full accent-[#9652ca]"
                  />
                  {minOverlapPct > 0 && (
                    <button
                      onClick={() => setMinOverlapPct(0)}
                      className="mt-2 text-[12px] text-[#9652ca] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </FilterDropdown>

              <FilterDropdown
                label={
                  activityFilter2 !== "all"
                    ? ({
                        none: "No contact yet",
                        "request-sent": "Request Sent",
                        replied: "Replied",
                        "no-response": "No Response",
                        declined: "Declined",
                      } as Record<string, string>)[activityFilter2] ?? activityFilter2
                    : "My Activity"
                }
                active={activityFilter2 !== "all"}
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
                        setActivityFilter2(v);
                        setActivityPopover(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50 whitespace-nowrap",
                        activityFilter2 === v && "text-[#9652ca] font-medium",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </FilterDropdown>

              {hiddenStudents.size > 0 && (
                <FilterDropdown
                  label={`Hidden (${hiddenStudents.size})`}
                  active={true}
                  open={hiddenPopover}
                  onToggle={() => setHiddenPopover((o) => !o)}
                  onClose={() => setHiddenPopover(false)}
                >
                  <div className="py-1 min-w-[180px]">
                    {[...hiddenStudents].map((name) => (
                      <div key={name} className="flex items-center justify-between px-3 py-2">
                        <span className="text-[13px]">{name}</span>
                        <button
                          onClick={() => {
                            setHiddenStudents((prev) => {
                              const n = new Set(prev);
                              n.delete(name);
                              return n;
                            });
                          }}
                          className="text-[12px] text-[#9652ca] hover:underline cursor-pointer"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-1">
                      <button
                        onClick={() => {
                          setHiddenStudents(new Set());
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
            </>
          ) : (
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
                label={secFilter !== "all" ? secFilter : "Section"}
                active={secFilter !== "all"}
                open={sectionPopover}
                onToggle={() => setSectionPopover((o) => !o)}
                onClose={() => setSectionPopover(false)}
              >
                <div className="py-1">
                  {["all", "201", "202", "203"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSecFilter(s);
                        setSectionPopover(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50",
                        secFilter === s && "text-[#9652ca] font-medium",
                      )}
                    >
                      {s === "all" ? "All Sections" : `Section ${s}`}
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
          )}
        </div>

        <ConfirmDialog
          open={hideConfirmTarget !== null}
          title="Hide this student?"
          body="They'll be moved to the bottom of the list and grayed out. You can restore them anytime."
          confirmLabel="Hide"
          onConfirm={() => {
            if (hideConfirmTarget) {
              setHiddenStudents((prev) => new Set([...prev, hideConfirmTarget]));
            }
            setHideConfirmTarget(null);
          }}
          onCancel={() => setHideConfirmTarget(null)}
        />

        {view === "groups" ? (
          <GroupsView
            onSelectGroup={onSelectGroup ?? (() => {})}
            appliedGroups={appliedGroups}
            filterRecruiting={filterRecruiting}
          />
        ) : (
          <>
            <div className="flex justify-end items-center py-2">
              <div className="flex items-center gap-1 text-[13px] text-[#6B7280]">
                <span>Sort:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
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

            {filteredStudents.length === 0 ? (
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
                {filteredStudents.map((st, i) => {
                  const cs = contactStatuses[st.name];
                  return (
                    <Card
                      key={i}
                      className={cn(
                        "p-4 gap-0 bg-white border-0 rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer relative group",
                        hiddenStudents.has(st.name) &&
                          "opacity-40 pointer-events-none select-none",
                      )}
                      onClick={() => !hiddenStudents.has(st.name) && onSelectStudent(st.name)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            name={st.name}
                            size="size-9"
                            textSize="text-[11px]"
                          />
                          <span className="text-[15px] font-semibold text-[#111827] leading-snug">
                            {st.name}
                          </span>
                        </div>
                        <div className="flex gap-1 ml-2 shrink-0 items-center pointer-events-auto relative z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(st.name);
                            }}
                            className="p-0.5 rounded transition-colors cursor-pointer"
                            aria-label="Toggle favorite"
                          >
                            {starredStudents.has(st.name) ? (
                              <Icon.starFilled size={14} color="#9652ca" />
                            ) : (
                              <Icon.star size={14} color="#D1D5DB" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setHideConfirmTarget(st.name);
                            }}
                            className="p-0.5 rounded transition-all cursor-pointer"
                            aria-label="Toggle visibility"
                          >
                            {hiddenStudents.has(st.name) ? (
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
                            st.status === "solo"
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : "bg-[#FEF3C7] text-[#92400E]",
                          )}
                        >
                          {st.status === "solo" ? "Solo" : "Open Group"}
                        </span>
                        {cs && cs !== "none" && CONTACT_STATUS_LABELS[cs] && (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium",
                              CONTACT_STATUS_LABELS[cs].cls,
                            )}
                          >
                            {CONTACT_STATUS_LABELS[cs].l}
                          </span>
                        )}
                        <span className="text-[12px] text-[#6B7280]">{st.sec}</span>
                        {isRecentlyActive(st.lastActive) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto" />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {st.skills.slice(0, 3).map((sk) => (
                          <span
                            key={sk}
                            className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]"
                          >
                            {sk}
                          </span>
                        ))}
                        {st.skills.length > 3 && (
                          <span className="text-[12px] text-[#6B7280]">
                            +{st.skills.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[12px] text-[#6B7280]">Overlap</span>
                          <span
                            className={cn(
                              "text-[13px] font-semibold",
                              st.scheduleOverlapHrs >= 6
                                ? "text-[#9652ca]"
                                : "text-[#9CA3AF]",
                            )}
                          >
                            {st.overlap}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-[#E5E7EB] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (st.scheduleOverlapHrs / 10) * 100)}%`,
                              backgroundColor:
                                st.scheduleOverlapHrs >= 7
                                  ? "#22C55E"
                                  : st.scheduleOverlapHrs >= 4
                                  ? "#9652ca"
                                  : "#9CA3AF",
                            }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
