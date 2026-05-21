import { useState, useEffect, useRef, useCallback, Fragment, type ReactNode, type ReactElement } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { LS_PREFIX, useLocalStorage } from "@/hooks/useLocalStorage";
import { clearAllLocalStorage } from "@/lib/storage";
import { getInitials } from "@/lib/avatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormField } from "@/components/shared/FormField";
import { Icon } from "@/components/shared/icons";
import { Nav } from "@/components/shared/Nav";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";
import { SlidePanel } from "@/components/shared/SlidePanel";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { ToastContainer } from "@/components/shared/Toast";
import { Landing } from "@/components/landing/Landing";
import { MagicLinkCallback } from "@/components/auth/MagicLinkCallback";
import { MagicLinkRequest } from "@/components/auth/MagicLinkRequest";
import { SignupForm } from "@/components/auth/SignupForm";
import { SignupRole } from "@/components/auth/SignupRole";
import { Verify } from "@/components/auth/Verify";
import { Dash } from "@/components/dashboard/Dash";
import { DashEmpty } from "@/components/dashboard/DashEmpty";
import { Join } from "@/components/dashboard/Join";
import { ProfileDone } from "@/components/profile/ProfileDone";
import { ProfileEdit } from "@/components/profile/ProfileEdit";
import { Step0Name } from "@/components/profile/steps/Step0Name";
import { Step1Skills } from "@/components/profile/steps/Step1Skills";
import { Step2Schedule } from "@/components/profile/steps/Step2Schedule";
import { Step3CommBio } from "@/components/profile/steps/Step3CommBio";
import { Discovery } from "@/components/discovery/DiscoveryPage";
import { ReceivedRequestPanel } from "@/components/discovery/ReceivedRequestPanel";
import { ProfilePanelContent } from "@/components/discovery/ProfilePanel";
import { GroupDetailPanel } from "@/components/groups/GroupDetailPanel";
import { useToasts } from "@/hooks/useToasts";
import {
  COMPAT,
  STU,
  parseActivityMinutes,
} from "@/lib/mock-data";
import type {
  AppNotification,
  GoProps,
  NotificationType,
  RoleGoProps,
  SentProps,
  StatusInfo,
  Student,
} from "@/types/ui";


// ==================== PAGES ====================



// TA Admin Data
const ADMIN_DATA = {
  atRisk: [
    { name: "Priya Sharma", sec: "201", init: "PS", daysSinceActivity: 8, skills: ["Backend", "Data Analysis"] },
    { name: "Omar Ali", sec: "203", init: "OA", daysSinceActivity: 5, skills: ["Project Mgmt"] },
    { name: "Wei Zhang", sec: "202", init: "WZ", daysSinceActivity: 12, skills: ["Frontend Dev"] },
  ],
  formationTimeline: [
    { date: "Feb 10", grouped: 8, ungrouped: 34 },
    { date: "Feb 17", grouped: 16, ungrouped: 26 },
    { date: "Feb 24", grouped: 24, ungrouped: 18 },
    { date: "Mar 1", grouped: 28, ungrouped: 14 },
    { date: "Mar 8", grouped: 28, ungrouped: 14 },
  ],
  sectionBreakdown: [
    { section: "201", total: 18, grouped: 12, ungrouped: 6, searching: 4, forming: 2 },
    { section: "202", total: 14, grouped: 10, ungrouped: 4, searching: 2, forming: 2 },
    { section: "203", total: 10, grouped: 6, ungrouped: 4, searching: 3, forming: 1 },
  ],
  skillDemand: [
    { skill: "Frontend Dev", seekers: 12, available: 5 },
    { skill: "Backend", seekers: 14, available: 3 },
    { skill: "UI Design", seekers: 8, available: 7 },
    { skill: "User Research", seekers: 6, available: 9 },
  ],
};

const UNGROUPED_STUDENTS = [
  { name: "Omar Ali", sec: "L0101", requestsSent: 0, requestsReceived: 1, lastActive: "3 days ago" },
  { name: "Priya S.", sec: "L0201", requestsSent: 2, requestsReceived: 0, lastActive: "1 day ago" },
  { name: "Chris Lee", sec: "L0101", requestsSent: 0, requestsReceived: 0, lastActive: "5 days ago" },
];

const POST_DEADLINE_GROUPS = [
  { id: "G1", members: ["Jesse Nguyen", "Sofia Rodriguez", "David Park"], autoAssigned: false },
  { id: "G2", members: ["Marcus Lee", "Lisa Wang", "Kai Tanaka"], autoAssigned: false },
  { id: "G3", members: ["Omar Ali", "Chris Lee", "Priya S.", "Elena Popov"], autoAssigned: true },
  { id: "G4", members: ["Wei Zhang", "Aisha Khan"], autoAssigned: true },
];

// TA Dashboard — Empty
function TADashEmpty({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<div className="flex items-center gap-2.5"><span className="text-sm text-gray-600">Prof. Truong</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">KT</AvatarFallback></Avatar></div>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">Welcome back,</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">My Courses</h1></div>
        <Button size="sm" className="px-4" onClick={() => go("ta-create")}>+ Create Course</Button>
      </div>
      <Card className="py-[52px] px-6 mb-3.5 gap-0 shadow-none text-center border-dashed border-gray-300">
        <div className="mb-3 flex justify-center"><Icon.books size={36} /></div>
        <p className="text-[15px] text-gray-500 mb-4">No courses yet.</p>
        <Button variant="outline" size="sm" className="px-4 mx-auto" onClick={() => go("ta-create")}>Create your first course</Button>
      </Card>
    </div>
  </div>;
}

// TA Dashboard — With CSC318
function TADash({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<div className="flex items-center gap-2.5"><span className="text-sm text-gray-600">Prof. Truong</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">KT</AvatarFallback></Avatar></div>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">Welcome back,</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">My Courses</h1></div>
        <Button size="sm" className="px-4" onClick={() => go("ta-create")}>+ Create Course</Button>
      </div>
      <Card className="p-5 mb-3.5 gap-0 shadow-none cursor-pointer hover:border-gray-300 hover:shadow-sm transition-colors" onClick={() => go("ta-course-dash")}>
        <div className="flex justify-between items-start">
          <div><div className="text-lg font-semibold">CSC318</div><div className="text-sm text-gray-500">The Design of Interactive Computational Media</div><div className="text-[13px] text-gray-400 mt-1">Winter 2026 · 42 students</div></div>
          <Badge variant="success">Active</Badge>
        </div>
        <Separator className="my-3.5 bg-gray-100" />
        <div className="flex justify-between"><span className="text-[13px] text-gray-500">Group formation</span><span className="text-[13px] font-semibold">14 ungrouped →</span></div>
      </Card>
    </div>
  </div>;
}

function TACourseDash({ go, showToast }: GoProps & { showToast?: (msg: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "students" | "alerts">("overview");
  const [studentFilter, setStudentFilter] = useState("all");
  const [postDeadline, setPostDeadline] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText("W543M7").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const filteredAdminStudents = STU.filter(s => {
    if (studentFilter === "ungrouped") return s.status === "solo" || s.status === "open-group";
    if (studentFilter === "atrisk") return ADMIN_DATA.atRisk.some(r => r.name === s.name);
    return true;
  });
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<div className="flex items-center gap-2.5"><span className="text-sm text-gray-600">Prof. Truong</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">KT</AvatarFallback></Avatar></div>} />
    <div className="max-w-[780px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("ta-dash")}>← Back to Courses</Button>
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">TA Dashboard</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">CSC318</h1></div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6" role="tablist">
        {(["overview", "students", "alerts"] as const).map(t => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={cn("py-[7px] px-4 rounded-lg text-[13px] font-semibold cursor-pointer capitalize relative", tab === t ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-500")} onClick={() => setTab(t)}>
            {t}
            {t === "alerts" && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">{ADMIN_DATA.atRisk.length}</span>}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && <>
        <Card className="p-5 gap-0 shadow-none mb-4">
          <div className="flex justify-between mb-4">
            <div><div className="text-lg font-semibold">CSC318</div><div className="text-sm text-gray-500">Design of Interactive Media · Winter 2026</div></div>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center mb-4">
            {([["42", "Students"], ["6", "Groups"], ["14", "Ungrouped"], ["12 days left", "Deadline"]] as const).map(([v, l]) => <div key={l}><div className={cn("font-bold", v === "12 days left" ? "text-base" : "text-2xl")}>{v}</div><div className="text-xs text-gray-500">{l}</div></div>)}
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[13px] font-medium">Group confirmation progress</span>
              <span className="text-[13px] font-bold text-success">21%</span>
            </div>
            <Progress value={21} className="h-2" />
            <div className="text-[11px] text-gray-500 mt-1">10 of 45 students confirmed</div>
          </div>
          <Separator className="my-3.5 bg-gray-100" />
          <div className="flex justify-between items-center">
            <div><div className="text-[13px] font-semibold mb-1">Invite Code</div><code className="py-2 px-4 bg-gray-50 rounded-md text-lg font-bold tracking-[3px] border border-gray-200">W543M7</code></div>
            <Button variant="outline" size="sm" className="px-4" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</Button>
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed mt-2">Share with students.</p>
        </Card>

        {/* Formation Timeline */}
        <Card className="p-5 gap-0 shadow-none mb-4">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Formation Timeline</Label>
          <div className="flex items-end gap-2 h-[120px]">
            {ADMIN_DATA.formationTimeline.map((d) => {
              const total = d.grouped + d.ungrouped;
              const gPct = (d.grouped / total) * 100;
              const uPct = (d.ungrouped / total) * 100;
              return <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-[2px]" style={{ height: "100px" }}>
                  <div className="bg-gray-200 rounded-t-sm" style={{ height: `${uPct}%` }} />
                  <div className="bg-success rounded-b-sm" style={{ height: `${gPct}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{d.date}</span>
              </div>;
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success" /> Grouped</span><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-200" /> Ungrouped</span></div>
        </Card>

        {/* Section Breakdown */}
        <Card className="p-5 gap-0 shadow-none mb-4">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Section Breakdown</Label>
          <div className="flex flex-col gap-3">
            {ADMIN_DATA.sectionBreakdown.map((s) => (
              <div key={s.section} className="rounded-lg border border-gray-200 p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Section {s.section}</span>
                  <span className="text-xs text-gray-500">{s.total} students</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Solo", count: s.searching, cls: "text-danger" },
                    { label: "Open Group", count: s.forming, cls: "text-warning" },
                    { label: "Grouped", count: s.grouped, cls: "text-success" },
                  ].map(({ label, count, cls }) => (
                    <div key={label} className="text-center py-2 bg-gray-50 rounded-lg">
                      <div className={cn("text-lg font-bold", cls)}>{count}</div>
                      <div className="text-[10px] text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Skill Supply/Demand */}
        <Card className="p-5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Skill Supply / Demand</Label>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50"><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Skill</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Seekers</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Available</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Gap</th></tr></thead>
              <tbody>
                {ADMIN_DATA.skillDemand.map((s, i) => {
                  const gap = s.seekers - s.available;
                  return <tr key={s.skill} className={i < ADMIN_DATA.skillDemand.length - 1 ? "border-b border-gray-100" : ""}>
                    <td className="py-2 px-3 font-medium">{s.skill}</td>
                    <td className="py-2 px-3 text-center">{s.seekers}</td>
                    <td className="py-2 px-3 text-center">{s.available}</td>
                    <td className={cn("py-2 px-3 text-center font-semibold", gap > 0 ? "text-danger" : "text-success")}>{gap > 0 ? `−${gap}` : `+${Math.abs(gap)}`}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Ungrouped Students */}
        <Card className="p-5 gap-0 shadow-none mt-4">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Ungrouped Students</Label>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Name</th>
                  <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Section</th>
                  <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Sent</th>
                  <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Received</th>
                  <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Last Active</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {UNGROUPED_STUDENTS.map((st, i) => {
                  const inactive = parseActivityMinutes(st.lastActive) > 3 * 24 * 60;
                  return (
                    <tr key={st.name} className={i < UNGROUPED_STUDENTS.length - 1 ? "border-b border-gray-100" : ""}>
                      <td className="py-2 px-3 font-medium">{st.name}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{st.sec}</td>
                      <td className="py-2 px-3 text-center">{st.requestsSent}</td>
                      <td className="py-2 px-3 text-center">{st.requestsReceived}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{st.lastActive}</td>
                      <td className="py-2 px-3 text-right">
                        {inactive && <Badge variant="warning" className="text-[10px]">Inactive</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Post-deadline demo toggle */}
        <div className="flex justify-end mt-4">
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setPostDeadline(pd => !pd)}>
            {postDeadline ? "Normal View" : "Post-deadline View"}
          </Button>
        </div>

        {/* Post-deadline group list */}
        {postDeadline && (
          <Card className="p-5 gap-0 shadow-none mt-3">
            <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">All Groups (confirmed + auto-assigned)</Label>
            <div className="flex flex-col gap-2">
              {POST_DEADLINE_GROUPS.map((g) => (
                <div key={g.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Group {g.id}</span>
                      {g.autoAssigned && <Badge variant="warning" className="text-[10px]">Auto-assigned</Badge>}
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={() => window.alert("Move student — stub")}>Move student</Button>
                  </div>
                  <div className="text-xs text-gray-500">{g.members.join(", ")}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </>}

      {/* Students tab */}
      {tab === "students" && <>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[13px] text-gray-500">{filteredAdminStudents.length} students</span>
          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              <SelectItem value="ungrouped">Ungrouped only</SelectItem>
              <SelectItem value="atrisk">At risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredAdminStudents.map((st, i) => {
          const ss = SS[st.status] ?? { l: st.status, variant: "secondary" as const };
          return <Card key={i} className="p-4 mb-2.5 shadow-none flex-row items-center gap-3">
            <StudentAvatar name={st.name} size="size-9" textSize="text-xs" />
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm font-semibold">{st.name}</span>
                <Badge variant={ss.variant} className={ss.cls}>{ss.l}</Badge>
              </div>
              <div className="text-xs text-gray-500">Section {st.sec} · {st.skills.join(", ")}</div>
            </div>
          </Card>;
        })}
      </>}

      {/* Alerts tab */}
      {tab === "alerts" && <>
        {/* Deadline alert */}
        <Card className="p-5 gap-0 shadow-none mb-4 bg-caution-bg border-caution-border">
          <div className="text-[15px] font-bold text-caution mb-1">Deadline Approaching</div>
          <div className="text-[13px] text-caution-dark leading-relaxed mb-3">14 students ungrouped — provisional groups form in 3 days.</div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs px-4" onClick={() => showToast?.("Provisional groups generated")}>Review provisional groups</Button>
            <Button variant="outline" size="sm" className="text-xs px-4" onClick={() => showToast?.("Deadline extended by 3 days")}>Extend deadline</Button>
            <Button variant="outline" size="sm" className="text-xs px-4" onClick={() => showToast?.("Email sent to all ungrouped students")}>Email all ungrouped</Button>
          </div>
        </Card>

        {/* At-risk banner */}
        <div className="py-3.5 px-[18px] bg-danger-bg rounded-[10px] border border-danger-border mb-4">
          <div className="text-[15px] font-bold text-danger mb-1">{ADMIN_DATA.atRisk.length} students at risk</div>
          <div className="text-[13px] text-danger-dark leading-relaxed">These students have been inactive and may miss the deadline.</div>
        </div>

        {ADMIN_DATA.atRisk.map((st, i) => (
          <Card key={i} className="p-5 mb-3 gap-0 shadow-none">
            <div className="flex items-center gap-3 mb-3">
              <StudentAvatar name={st.name} size="size-10" textSize="text-sm" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{st.name}</div>
                <div className="text-xs text-gray-500">Section {st.sec} · Last active {st.daysSinceActivity} days ago</div>
              </div>
              <Badge variant="danger">Inactive {st.daysSinceActivity}d</Badge>
            </div>
            <div className="flex gap-1 mb-3">{st.skills.map(sk => <span key={sk} className="py-0.5 px-2.5 bg-gray-100 rounded-[10px] text-[11px] text-gray-600">{sk}</span>)}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs px-4" onClick={() => showToast?.("Reminder email sent to " + st.name)}>Send reminder email</Button>
              <Button size="sm" variant="outline" className="text-xs px-4" onClick={() => showToast?.("Match suggestion sent to " + st.name)}>Suggest match</Button>
            </div>
          </Card>
        ))}

        <Separator className="my-5 bg-gray-100" />
        <Button className="w-full px-7 py-3 h-auto" onClick={() => showToast?.("Bulk reminder sent to all ungrouped students")}>Send bulk reminder to all ungrouped</Button>
      </>}
    </div>
  </div>;
}

// TA Create Course
function TACreate({ go, onCreateCourse, showToast }: GoProps & { onCreateCourse: () => void; showToast?: (msg: string) => void }) {
  const [skills, setSkills] = useState<string[]>(["UI Design", "Frontend Dev", "Backend", "User Research", "Prototyping", "Data Analysis"]);
  const [secs, setSecs] = useState<string[]>(["201", "202", "203"]);
  const [newSec, setNewSec] = useState("");
  const [uploaded, setUploaded] = useState(false);
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("ta-dash")}>← Back</Button>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Create a Course</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Students join with this code.</p>
      <div className="grid grid-cols-2 gap-3 mb-1">
        <FormField l="University"><Input value="University of Toronto" readOnly /></FormField>
        <FormField l="Department"><Input placeholder="e.g. Computer Science" /></FormField>
        <FormField l="Course Code"><Input placeholder="e.g. CSC318" /></FormField>
        <FormField l="Semester">
          <Select defaultValue="winter-2026">
            <SelectTrigger className="w-full"><SelectValue placeholder="Select semester..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="winter-2026">Winter 2026</SelectItem>
              <SelectItem value="fall-2026">Fall 2026</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <FormField l="Course Name"><Input placeholder="e.g. The Design of Interactive Computational Media" /></FormField>
      <div className="grid grid-cols-3 gap-3 mb-1">
        <FormField l="Min Group Size"><Input placeholder="4" /></FormField>
        <FormField l="Max Group Size"><Input placeholder="6" /></FormField>
        <FormField l="Deadline"><Input type="date" /></FormField>
      </div>

      <Separator className="my-6 bg-gray-100" />
      <div className="mb-6">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Sections</Label>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {secs.map(sc => <span key={sc} className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium border-[1.5px] bg-primary text-primary-foreground border-primary">{sc} <span className="ml-1.5 opacity-60 cursor-pointer" onClick={() => setSecs(secs.filter(x => x !== sc))}>×</span></span>)}
        </div>
        <div className="flex gap-2">
          <Input className="w-[120px]" placeholder="e.g. 204" value={newSec} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSec(e.target.value)} />
          <Button variant="outline" size="sm" className="px-4" onClick={() => { if (newSec.trim()) { setSecs([...secs, newSec.trim()]); setNewSec(""); } }}>+ Add</Button>
        </div>
      </div>

      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills for this Course</Label>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-2.5">Students pick from these.</p>
        <div>{skills.map(sk => <span key={sk} className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-primary text-primary-foreground border-primary">{sk} <span className="ml-1.5 opacity-60 cursor-pointer" onClick={() => setSkills(skills.filter(x => x !== sk))}>×</span></span>)}<span className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-gray-100 text-gray-600 border-gray-200 border-dashed">+ Add Skill</span></div>
      </div>
      <Separator className="my-6 bg-gray-100" />
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Import Student Roster (Optional)</Label>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-3">Upload a CSV with columns: name, email, section.</p>
        <Input type="file" accept=".csv" className="text-sm" onChange={() => setUploaded(true)} />
        {uploaded && (
          <div className="py-3 px-4 bg-success-bg rounded-lg border border-success-border mt-3">
            <div className="text-[13px] font-bold text-success mb-1">✓ 45 students imported</div>
            <div className="text-[12px] text-success">L0101: 23 students · L0201: 22 students</div>
          </div>
        )}
      </div>
      <Button className="w-full px-7 py-3 h-auto" onClick={() => { onCreateCourse(); showToast?.("Course created!"); go("ta-dash"); }}>Create Course</Button>
    </div>
  </div>;
}

// Student data


const DEADLINE_CONFIG = {
  totalDays: 21,
  tiers: [
    { min: 7, label: "On Track", color: "success" as const, desc: "Plenty of time to find your group." },
    { min: 4, label: "Reminder", color: "warning" as const, desc: "The deadline is approaching. Start reaching out!" },
    { min: 2, label: "Urgent", color: "caution" as const, desc: "Time is running out. Review system-suggested matches." },
    { min: 0, label: "Critical", color: "danger" as const, desc: "Provisional groups will auto-form if you don't act." },
  ],
};

function getDeadlineTier(daysLeft: number) {
  for (const tier of DEADLINE_CONFIG.tiers) {
    if (daysLeft >= tier.min) return tier;
  }
  return DEADLINE_CONFIG.tiers[DEADLINE_CONFIG.tiers.length - 1];
}


interface Conversation {
  id: string;
  targetName: string;
  targetInit: string;
  type: "request-sent" | "request-received" | "application-sent" | "application-received" | "group-chat";
  status: "pending" | "replied" | "accepted" | "declined" | "active";
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  isGroup?: boolean;
  groupMembers?: { name: string; init: string }[];
}

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-group", targetName: "CSC318 Group", targetInit: "G", type: "group-chat", status: "active", lastMessage: "Sofia: Let's meet Thursday!", timestamp: "10m ago", unread: true, isGroup: true, groupMembers: [
      { name: "Marcus Lee", init: "ML" },
      { name: "Sofia Rodriguez", init: "SR" },
    ]
  },
  { id: "conv-1", targetName: "Marcus Lee", targetInit: "ML", type: "request-sent", status: "accepted", lastMessage: "Welcome to the group!", timestamp: "2d ago", unread: false },
  { id: "conv-2", targetName: "Sofia Rodriguez", targetInit: "SR", type: "request-received", status: "accepted", lastMessage: "Excited to work together!", timestamp: "1d ago", unread: false },
  { id: "conv-3", targetName: "David Park", targetInit: "DP", type: "request-sent", status: "replied", lastMessage: "Sounds great! When are you free?", timestamp: "2h ago", unread: true },
  { id: "conv-4", targetName: "Wei Zhang", targetInit: "WZ", type: "request-sent", status: "declined", lastMessage: "Sorry, I found another group.", timestamp: "2d ago", unread: false },
];





// Matching Board
const DEMO_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", type: "group-request-received", title: "Group Request from David Park", body: "David wants to team up for CSC318.", timestamp: "2 min ago", read: false, actionTarget: "David Park" },
  { id: "n2", type: "group-application-received", title: "New Application from Priya Sharma", body: "Priya applied to your group.", timestamp: "15 min ago", read: false, actionTarget: "mygroup" },
  { id: "n3", type: "request-accepted", title: "Jesse Nguyen accepted your request", body: "You're now forming a group together.", timestamp: "1 hour ago", read: true, actionTarget: "Jesse Nguyen" },
  { id: "n4", type: "confirm-requested", title: "Group confirmation requested", body: "Jesse is requesting everyone to confirm.", timestamp: "3 hours ago", read: true, actionTarget: "mygroup" },
  { id: "n5", type: "urgent-mode", title: "Urgent Mode activated", body: "Deadline in 3 days. 12 students still ungrouped.", timestamp: "1 day ago", read: true, actionTarget: "board" },
];









// Request Sent
function Sent({ go, targetName }: SentProps) {
  return <div className="bg-background min-h-screen pb-6">
    <div className="max-w-[500px] mx-auto pt-10 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("board")}>← Back to Board</Button>
      <div className="text-center pt-12">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-success-bg flex items-center justify-center"><span className="text-3xl text-success">✓</span></div>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px] text-center">Request Sent!</h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed text-center">{targetName} will be notified by email. You'll hear back soon.</p>
        <div className="flex gap-3 justify-center">
          <Button className="px-7 py-3 h-auto" onClick={() => go("board")}>Back to Board</Button>
          <Button variant="outline" className="px-7 py-3 h-auto" onClick={() => go("mygroup")}>View My Group</Button>
        </div>
      </div>
    </div>
  </div>;
}

const MOCK_REPLIES = [
  "That sounds great! When would you like to meet?",
  "I'm interested! Let me check my schedule.",
  "Thanks for reaching out! What part of the project excites you most?",
  "Sure, I think we'd work well together. Let's discuss more!",
  "Awesome! I was hoping someone with your skills would reach out.",
  "Let me think about it and get back to you soon!",
  "Sounds good! Do you prefer meeting in person or online?",
  "I'd love to chat more about this. When are you free?",
  "Great timing — I was just looking for teammates!",
  "That works for me! Should we set up a quick call?",
];

const MOCK_REQUEST_REPLIES = [
  "Thanks for the request! I've been looking at your profile and I think we'd be a great match.",
  "Hey! I'd love to work together. Your skills really complement mine.",
  "Interesting! Let me review your profile. What's your experience with group projects?",
  "Thanks for reaching out! I have a few questions before I decide — when are you usually available to meet?",
  "Hi! I like your profile. Do you have a preference for how the group communicates?",
];

const MOCK_FOLLOWUPS: Record<string, string[]> = {
  "Jesse Nguyen": [
    "By the way, I found a great template for our project proposal!",
    "Also, Prof mentioned the midterm deliverable is due March 15",
    "I just shared the Google Doc link in the group chat",
  ],
  "David Park": [
    "I set up a GitHub repo for us already — I'll share the link",
    "Quick question — do you prefer React or Vue for the frontend?",
    "I noticed we overlap on Tuesdays and Thursdays, want to make those our meeting days?",
  ],
  "Priya Sharma": [
    "I've been working on some backend prototypes, want me to share?",
    "By the way, I have experience with the dataset from last year's course",
  ],
  "Aisha Khan": [
    "I created a project timeline — want to take a look?",
    "Should we set up a shared Notion workspace?",
  ],
};

interface ApplicationCardProps {
  applicant: {
    name: string;
    init: string;
    sec: string;
    skills: string[];
    scheduleOverlap: string;
    formAnswers: { q: string; a: string }[];
    votes: { up: number; down: number };
  };
  isLeader: boolean;
  onReply?: (name: string) => void;
  onAccept?: () => void;
}

function ApplicationCard({ applicant, isLeader, onReply, onAccept }: ApplicationCardProps) {
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);
  return (
    <Card className="p-5 mb-3.5 shadow-none gap-0">
      <div className="flex items-center gap-3 mb-4">
        <StudentAvatar name={applicant.name} size="size-10" textSize="text-sm" />
        <div>
          <div className="text-sm font-semibold">{applicant.name}</div>
          <div className="text-xs text-gray-500">Section {applicant.sec} · {applicant.scheduleOverlap} overlap</div>
        </div>
        <div className="ml-auto flex gap-1 flex-wrap justify-end">
          {applicant.skills.map(sk => <span key={sk} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-lg">{sk}</span>)}
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {applicant.formAnswers.map((fa, j) => (
          <div key={j} className="text-[12px]">
            <span className="font-semibold text-gray-500">{fa.q}</span>
            <p className="text-gray-700 mt-0.5">{fa.a}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <span className="text-[11px] text-gray-500">Member votes:</span>
        <button
          onClick={() => setMyVote(v => v === "up" ? null : "up")}
          className={cn("px-3 py-1 rounded-lg text-sm border flex items-center gap-1", myVote === "up" ? "bg-success-bg border-success text-success" : "border-gray-200 text-gray-400")}
        >
          <Icon.thumbUp size={14} /> {applicant.votes.up + (myVote === "up" ? 1 : 0)}
        </button>
        <button
          onClick={() => setMyVote(v => v === "down" ? null : "down")}
          className={cn("px-3 py-1 rounded-lg text-sm border flex items-center gap-1", myVote === "down" ? "bg-danger-bg border-danger text-danger" : "border-gray-200 text-gray-400")}
        >
          <Icon.thumbDown size={14} /> {applicant.votes.down + (myVote === "down" ? 1 : 0)}
        </button>
        {isLeader && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" className="text-xs px-3 bg-success hover:bg-success/90 text-white" onClick={onAccept}>Accept</Button>
            <Button size="sm" variant="outline" className="text-xs px-3" onClick={() => onReply?.(applicant.name)}>Reply</Button>
            <Button size="sm" variant="outline" className="text-xs px-3 text-danger border-danger hover:bg-danger-bg">Decline</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// My Group
type ConfirmStage = "idle" | "pending" | "confirmed";

interface MyGroupProps extends GoProps {
  studentStatus?: "solo" | "open-group" | "closed";
  onAcceptRequest?: () => void;
  onLeaveGroup?: () => void;
  onOpenChat?: (name: string) => void;
  userName?: string;
}

function MyGroup({ go, studentStatus = "open-group", onAcceptRequest, onLeaveGroup, onOpenChat, userName = "" }: MyGroupProps) {
  const [accepted, setAccepted] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [confirmStage, setConfirmStage] = useState<ConfirmStage>("idle");
  const [recruiting, setRecruiting] = useState(false);
  const membersPartial = [
    { name: userName || "You", init: getInitials(userName), skills: ["UI Design", "User Research"], role: "You (Leader)", platform: "Discord", handle: userName ? userName.toLowerCase().replace(/\s/g, ".") : "you" },
    { name: "Marcus Lee", init: "ML", skills: ["UI Design", "Frontend Dev"], role: "Member", platform: "Discord", handle: "marcus.lee" },
    { name: "Sofia Rodriguez", init: "SR", skills: ["UI Design", "User Research"], role: "Member", platform: "Discord", handle: "sofia.r" },
  ];
  const membersFull = [
    ...membersPartial,
    { name: "Lisa Wang", init: "LW", skills: ["Frontend Dev", "UX Writing"], role: "Member", platform: "Discord", handle: "lisa.wang" },
  ];
  const members = accepted ? membersFull : membersPartial;
  const pendingApplicants = accepted ? [] : [
    {
      name: "Lisa Wang", init: "LW", sec: "201",
      skills: ["Frontend Dev", "UX Writing"],
      scheduleOverlap: "4h/wk",
      formAnswers: [
        { q: "What skills can you contribute?", a: "Frontend development and UX copywriting." },
        { q: "What role do you want?", a: "Frontend dev — I love building interactive UIs." },
        { q: "When are you free to work?", a: "Weekday afternoons and Saturday mornings." },
      ],
      votes: { up: 1, down: 0 },
    },
  ];
  const minSize = 4, maxSize = 6;
  const canConfirm = members.length >= minSize && members.length <= maxSize;
  const markConfirmed = (_name: string) => setConfirmStage("confirmed");

  if (studentStatus === "solo") {
    return <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[680px] mx-auto py-14 px-6">
        <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("board")}>← Dashboard</Button>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">My Group — CSC318</h1>
        <Card className="py-[52px] px-6 gap-0 shadow-none text-center border-dashed border-gray-300">
          <div className="text-4xl mb-4">👥</div>
          <div className="text-[17px] font-semibold mb-2">You're not in a group yet</div>
          <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">Find teammates on the Discovery board and send a group request to get started.</p>
          <Button onClick={() => go("board")}>Browse Discovery →</Button>
        </Card>
      </div>
    </div>;
  }

  return <div className="bg-background min-h-screen pb-6">

    <div className="max-w-[680px] mx-auto py-14 px-6">
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
        Your Group — CSC318
        {confirmStage === "confirmed" && <span className="inline-flex items-center justify-center h-[26px] px-3 rounded-full leading-none text-[12px] font-medium bg-[#DCFCE7] text-[#166534] ml-2 align-middle">✓ Confirmed</span>}
      </h1>
      {confirmStage !== "confirmed" && (
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium bg-[#FEF3C7] text-[#92400E]">Formed</span>
          <span className="text-[14px] text-[#6B7280]">{members.length}/{maxSize} members</span>
        </div>
      )}

      {/* Confirm Group button — prominent at top when group is full */}
      {canConfirm && confirmStage === "idle" && (
        <div className="flex justify-between items-center px-4 py-3 bg-success-bg rounded-[10px] mb-5 mt-3 border border-success-border">
          <span className="text-[13px] text-success font-semibold">Group is full — ready to confirm!</span>
          <Button size="sm" className="text-xs px-5 bg-success hover:bg-success/90 text-white" onClick={() => setConfirmStage("pending")}>Confirm Group</Button>
        </div>
      )}

      {/* Confirm stage banners */}
      {confirmStage === "pending" && (
        <div className="py-4 px-5 bg-warning-bg border border-warning-border rounded-xl mb-5 mt-3">
          <div className="text-[13px] font-bold text-warning mb-1">
            Waiting for all members to confirm (24h window)
          </div>
          <div className="text-[12px] text-warning mb-3">
            Each member must confirm below. Members who don't respond will be removed.
          </div>
          {members.map((m, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-[12px]">{m.name}</span>
              {m.role === "You"
                ? <Button size="sm" className="text-xs px-3 h-7" onClick={() => markConfirmed(m.name)}>Confirm</Button>
                : <span className="text-[11px] text-gray-400">Waiting...</span>
              }
            </div>
          ))}
        </div>
      )}

      {confirmStage === "confirmed" && (
        <div className="py-3 px-5 bg-success-bg border border-success-border rounded-xl mb-5 mt-3">
          <div className="text-[13px] font-bold text-success">✓ Group confirmed — submitted to instructor</div>
        </div>
      )}

      {!canConfirm && confirmStage === "idle" && (
        <>
          <p className="text-base text-gray-600 mb-5 mt-3 leading-relaxed">{members.length}/{minSize}–{maxSize} members — need {minSize - members.length} more.</p>
          <div className="flex justify-between items-center px-4 py-3 bg-warning-bg rounded-[10px] mb-5 border border-warning-border">
            <span className="text-[13px] text-warning font-semibold">Group not yet confirmed</span>
            <Button size="sm" variant="outline" className="text-xs px-4 border-[#f59e0b] bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]" onClick={() => go("board")}>Find more members</Button>
          </div>
        </>
      )}

      {pendingApplicants.length > 0 && (
        <section className="mb-8">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">
            Pending Applications ({pendingApplicants.length})
          </Label>
          {pendingApplicants.map((ap, i) => (
            <ApplicationCard key={i} applicant={ap} isLeader onReply={onOpenChat} onAccept={() => { setAccepted(true); onAcceptRequest?.(); }} />
          ))}
        </section>
      )}

      {members.map((m, i) => (
        <Card key={i} className="p-5 mb-3.5 shadow-none flex-row items-center gap-3.5">
          <StudentAvatar name={m.name} size="size-11" textSize="text-sm" />
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="text-sm font-semibold">{m.name}</span>
              <span className="text-xs text-gray-500">{m.role}</span>
            </div>
            <div className="flex gap-1 mt-1">{m.skills.map(sk => <span key={sk} className="py-0.5 px-2 bg-gray-100 rounded-lg text-[11px] text-gray-600">{sk}</span>)}</div>
          </div>
        </Card>
      ))}

      {/* Skills composition */}
      {confirmStage !== "confirmed" && (
        <div className="mb-6 mt-2">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Group Skills</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Has</div>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(members.flatMap(m => m.skills))).map(sk => (
                  <span key={sk} className="text-[11px] bg-success-bg text-success px-2 py-0.5 rounded-lg border border-success-border">{sk}</span>
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Still Needed</div>
              <div className="flex flex-wrap gap-1">
                {["Backend", "Data Analysis"].filter(sk => !members.flatMap(m => m.skills).includes(sk)).map(sk => (
                  <span key={sk} className="text-[11px] bg-accent text-accent-foreground px-2 py-0.5 rounded-lg border border-border">{sk}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group schedule grid */}
      {confirmStage !== "confirmed" && (
        <Card className="p-5 mb-3.5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Group Schedule</Label>
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]">
            <div />{["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
            {["9am–12pm", "12–4pm", "4–8pm", "8–11pm"].map((t, ti) => <Fragment key={ti}>
              <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => {
                const total = members.length;
                const counts3: Record<string, number> = { "Mon-0": 2, "Mon-1": 3, "Tue-1": 2, "Wed-0": 1, "Wed-1": 3, "Thu-2": 1, "Fri-1": 2 };
                const counts4: Record<string, number> = { "Mon-0": 2, "Mon-1": 4, "Tue-1": 2, "Tue-2": 1, "Wed-0": 2, "Wed-1": 3, "Thu-2": 1, "Fri-1": 3 };
                const cmap = accepted ? counts4 : counts3;
                const c = cmap[`${d}-${ti}`] || 0;
                return <div key={d} className={cn("py-2.5 px-1 text-center rounded-md text-[10px] font-medium",
                  c >= total ? "bg-primary text-primary-foreground" :
                    c >= total / 2 ? "bg-success-bg text-success" :
                      c >= 1 ? "bg-gray-100 text-gray-500" :
                        "bg-gray-50 text-gray-300"
                )}>{c > 0 ? `${c}/${total}` : ""}</div>;
              })}
            </Fragment>)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2">Darker = more members available</div>
        </Card>
      )}

      {/* Workspace cards (confirmed only) */}
      {confirmStage === "confirmed" && <>
        <Separator className="my-6 bg-gray-100" />

        {/* Contact Exchange */}
        <Card className="p-5 mb-3.5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Contact Exchange</Label>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50"><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Name</th><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Platform</th><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Handle</th></tr></thead>
              <tbody>
                {membersFull.map((m, i) => (
                  <tr key={i} className={i < membersFull.length - 1 ? "border-b border-gray-100" : ""}>
                    <td className="py-2 px-3 font-medium">{m.name}</td>
                    <td className="py-2 px-3 text-gray-500">{m.platform}</td>
                    <td className="py-2 px-3 text-gray-600 font-mono text-[13px]">{m.handle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Project Board */}
        <Card className="p-5 mb-3.5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Project Board</Label>
          {([
            { task: "Set up shared Google Doc", assignee: "Aisha", done: true },
            { task: "Draft project proposal outline", assignee: "John", done: false },
            { task: "Research competitor apps", assignee: "Jesse", done: false },
          ]).map((t, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100">
              <Checkbox checked={t.done} disabled />
              <span className={cn("text-sm flex-1", t.done && "line-through text-gray-400")}>{t.task}</span>
              <span className="text-[11px] text-gray-500 bg-gray-100 py-0.5 px-2 rounded-full">{t.assignee}</span>
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-3 text-xs px-4">+ Add task</Button>
        </Card>

        {/* Group Availability */}
        <Card className="p-5 mb-3.5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Group Availability</Label>
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]">
            <div />{["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
            {["9am–12pm", "12–4pm", "4–8pm", "8–11pm"].map((t, ti) => <Fragment key={ti}>
              <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => {
                const counts: Record<string, number> = { "Mon-0": 2, "Mon-1": 4, "Tue-1": 2, "Tue-2": 1, "Wed-0": 2, "Wed-1": 3, "Thu-2": 1, "Fri-1": 3 };
                const c = counts[`${d}-${ti}`] || 0;
                return <div key={d} className={cn("py-2.5 px-1 text-center rounded-md text-[10px] font-medium",
                  c >= 4 ? "bg-primary text-primary-foreground" :
                    c >= 3 ? "bg-success text-white" :
                      c >= 2 ? "bg-success-bg text-success" :
                        c >= 1 ? "bg-gray-100 text-gray-500" :
                          "bg-gray-50 text-gray-300"
                )}>{c > 0 ? `${c}/4` : ""}</div>;
              })}
            </Fragment>)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2">Darker = more members available</div>
        </Card>
      </>}

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1 px-7 py-3 h-auto" onClick={() => go("board")}>Discover Members</Button>
        {!recruiting ? (
          <Button variant="outline" className="flex-1 px-7 py-3 h-auto border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5" onClick={() => setRecruiting(true)}>List Group for Recruiting</Button>
        ) : (
          <Button variant="outline" className="flex-1 px-7 py-3 h-auto border-[#f59e0b] text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a]" onClick={() => setRecruiting(false)}>Delist from Recruiting</Button>
        )}
      </div>
      <div className="text-center mt-3">
        <button onClick={() => setShowLeaveDialog(true)} className="text-[13px] text-[#991B1B] hover:underline cursor-pointer">
          Leave Group
        </button>
      </div>

      <ConfirmDialog
        open={showLeaveDialog}
        title="Leave this group?"
        body="The remaining members will be notified. You'll return to searching status."
        confirmLabel="Leave Group"
        onConfirm={() => { setShowLeaveDialog(false); onLeaveGroup?.(); go("board"); }}
        onCancel={() => setShowLeaveDialog(false)}
      />
    </div>
  </div>;
}

// Urgent Matching
function Urgent({ go }: GoProps) {
  const [taSent, setTaSent] = useState(false);
  const daysLeft = 3;
  const tier = getDeadlineTier(daysLeft);
  const elapsed = DEADLINE_CONFIG.totalDays - daysLeft;
  const pct = Math.round((elapsed / DEADLINE_CONFIG.totalDays) * 100);
  const recs = [
    { name: "David Park", init: "DP", skills: ["Backend", "Data Analysis"], compat: "76%", overlap: "6h/wk" },
    { name: "Lisa Wang", init: "LW", skills: ["Frontend Dev", "UX Writing"], compat: "68%", overlap: "4h/wk" },
    { name: "Omar Ali", init: "OA", skills: ["Project Mgmt"], compat: "52%", overlap: "2h/wk" },
  ];
  const provisionalMembers = [
    { name: "You", init: "ME", skills: ["UI Design", "User Research"] },
    { name: "Omar Ali", init: "OA", skills: ["Project Mgmt"] },
    { name: "Wei Zhang", init: "WZ", skills: ["Frontend Dev", "Backend"] },
    { name: "Elena Popov", init: "EP", skills: ["Data Analysis", "UX Writing"] },
  ];
  return <div className="bg-background min-h-screen pb-6">
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("board")}>← Back to Board</Button>

      {/* Deadline progress bar */}
      <Card className="p-5 mb-5 gap-0 shadow-none">
        <div className="flex justify-between items-center mb-2">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px]">Group Formation Deadline</Label>
          <span className="text-[13px] font-bold text-danger">{daysLeft} days remaining</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full bg-danger transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-gray-500">
          <span>Started Feb 15</span>
          <span>{pct}% elapsed</span>
          <span>Due Mar 8</span>
        </div>
      </Card>

      {/* Tier-aware banner */}
      <div className={cn("py-3.5 px-[18px] rounded-[10px] mb-6 border",
        tier.color === "danger" ? "bg-danger-bg border-danger-border" :
          tier.color === "caution" ? "bg-caution-bg border-caution-border" :
            "bg-warning-bg border-warning-border"
      )}>
        <div className={cn("text-[15px] font-bold flex items-center gap-1",
          tier.color === "danger" ? "text-danger" : tier.color === "caution" ? "text-caution" : "text-warning"
        )}><Icon.clockAlert size={16} color={tier.color === "danger" ? "var(--danger)" : tier.color === "caution" ? "var(--caution)" : "var(--warning)"} /> {tier.label} — Deadline in {daysLeft} days</div>
        <div className={cn("text-[13px] leading-relaxed",
          tier.color === "danger" ? "text-danger-dark" : tier.color === "caution" ? "text-caution-dark" : "text-warning"
        )}>{tier.desc}</div>
      </div>

      <h1 className="text-[28px] font-bold text-foreground mb-5 -tracking-[0.5px]">Suggested Matches</h1>
      {recs.map((r, i) => (
        <Card key={i} className="p-5 mb-3.5 shadow-none flex-row items-center gap-3.5">
          <StudentAvatar name={r.name} size="size-[46px]" textSize="text-[15px]" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{r.name}</div>
            <div className="flex gap-1 mt-1">{r.skills.map(sk => <span key={sk} className="py-0.5 px-2 bg-gray-100 rounded-lg text-[11px] text-gray-600">{sk}</span>)}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{r.compat}</div>
            <div className="text-[11px] text-gray-500">overlap: {r.overlap}</div>
          </div>
        </Card>
      ))}

      {/* Provisional Group */}
      <Separator className="my-6 bg-gray-100" />
      <Card className="p-5 gap-0 shadow-none border-dashed border-caution-border bg-caution-bg mb-5">
        <div className="text-[15px] font-bold text-caution mb-1">Provisional Group</div>
        <div className="text-[13px] text-caution-dark leading-relaxed mb-4">Auto-forms at deadline if no action taken.</div>
        {provisionalMembers.map((m, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-caution-border last:border-0">
            <Avatar className="size-8"><AvatarFallback className="bg-caution-bg text-caution text-xs font-bold">{m.init}</AvatarFallback></Avatar>
            <span className="text-sm font-medium flex-1">{m.name}</span>
            <div className="flex gap-1">{m.skills.map(sk => <span key={sk} className="py-0.5 px-2 bg-caution-bg rounded-lg text-[10px] text-caution-dark">{sk}</span>)}</div>
          </div>
        ))}
        <div className="flex gap-3 mt-4">
          <Button size="sm" className="flex-1 text-xs px-4">Accept this group</Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs px-4" onClick={() => go("board")}>I'll find my own</Button>
        </div>
      </Card>

      {taSent ? (
        <div className="py-3.5 px-[18px] bg-success-bg rounded-[10px] border border-success-border text-center">
          <span className="text-[13px] font-semibold text-success">✓ Your TA has been notified and will follow up by email.</span>
        </div>
      ) : (
        <Button variant="outline" className="w-full px-7 py-3 h-auto" onClick={() => setTaSent(true)}>Ask TA for help</Button>
      )}
    </div>
  </div>;
}

// ==================== CHATS PAGE ====================
type ChatMessages = Record<string, { from: string; text: string; time: string }[]>;

interface ChatsPageProps extends GoProps {
  conversations: Conversation[];
  contactStatuses: Record<string, string>;
  onContactStatusChange: (name: string, status: string) => void;
  onAccept?: (name: string) => void;
  msgs: ChatMessages;
  onMsgsChange: Dispatch<SetStateAction<ChatMessages>>;
  initialSelectedConv?: string | null;
  onClearInitialConv?: () => void;
  reactions: Record<string, string | null>;
  onReactionsChange: Dispatch<SetStateAction<Record<string, string | null>>>;
  onUpdateConvStatus?: (name: string, status: string) => void;
  onMarkRead?: (name: string) => void;
  onDeleteConversation?: (name: string) => void;
  userName?: string;
}

type ReactionType = "check" | "thumbUp" | "heart" | "sad";
const REACTION_ICONS: { type: ReactionType; icon: (p: IconProps) => ReactElement; emoji: string }[] = [
  { type: "check", icon: Icon.reactCheck, emoji: "✓" },
  { type: "thumbUp", icon: Icon.reactThumbUp, emoji: "👍" },
  { type: "heart", icon: Icon.reactHeart, emoji: "❤" },
  { type: "sad", icon: Icon.reactSad, emoji: "😢" },
];
const REACTION_COLORS: Record<ReactionType, string> = {
  check: "#16a34a",
  thumbUp: "#eab308",
  heart: "#dc2626",
  sad: "#3b82f6",
};

function ChatsPage({ go, conversations, contactStatuses, onContactStatusChange, onAccept, msgs, onMsgsChange, initialSelectedConv, onClearInitialConv, reactions: reactionsFromProps, onReactionsChange, onUpdateConvStatus, onMarkRead, onDeleteConversation, userName = "" }: ChatsPageProps) {
  const [selectedConv, setSelectedConv] = useState<string | null>(initialSelectedConv ?? (conversations.length > 0 ? conversations[0].targetName : null));

  useEffect(() => {
    if (initialSelectedConv) {
      setSelectedConv(initialSelectedConv);
      onClearInitialConv?.();
    }
  }, [initialSelectedConv, onClearInitialConv]);
  const [convTab, setConvTab] = useState<"all" | "sent" | "received">("all");
  const setMsgs = onMsgsChange;
  const [input, setInput] = useState("");
  const [showDeclineMenu, setShowDeclineMenu] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineNote, setDeclineNote] = useState("");
  const [requestExpanded, setRequestExpanded] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const reactions = reactionsFromProps;
  const setReactions = onReactionsChange;
  const toggleReaction = (msgKey: string, type: ReactionType) => {
    setReactions(prev => ({ ...prev, [msgKey]: prev[msgKey] === type ? null : type }));
  };

  const groupConv = conversations.find(c => c.isGroup);
  const individualConvs = conversations.filter(c => !c.isGroup);
  const filteredConvs = individualConvs.filter(c => {
    if (convTab === "sent") return c.type === "request-sent" || c.type === "application-sent";
    if (convTab === "received") return c.type === "request-received" || c.type === "application-received";
    return true;
  });

  const conv = conversations.find(c => c.targetName === selectedConv);
  const isGroupChat = conv?.isGroup === true;
  const student = selectedConv && !isGroupChat ? STU.find(s => s.name === selectedConv) : null;
  const currentMsgs = selectedConv ? (msgs[selectedConv] || []) : [];
  const isEnded = conv?.status === "accepted" || conv?.status === "declined";

  const [typing, setTyping] = useState<string | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const addReply = useCallback((convName: string, from: string, text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMsgs(prev => ({
      ...prev,
      [convName]: [...(prev[convName] || []), { from, text, time }],
    }));
  }, [setMsgs]);

  const sendMsg = () => {
    if (!input.trim() || !selectedConv) return;
    const text = input.trim();
    const convName = selectedConv;
    const convObj = conversations.find(c => c.targetName === convName);
    const isGroup = convObj?.isGroup;
    setMsgs(prev => ({
      ...prev,
      [convName]: [...(prev[convName] || []), { from: "me", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }],
    }));
    setInput("");
    setTimeout(scrollToBottom, 50);

    // Show typing indicator
    const typingName = isGroup
      ? (convObj?.groupMembers?.[Math.floor(Math.random() * (convObj?.groupMembers?.length ?? 1))]?.name ?? "Someone")
      : convName;
    setTyping(typingName);

    // Primary reply after 1-2s
    const delay1 = 1000 + Math.random() * 1000;
    setTimeout(() => {
      setTyping(null);
      const replyFrom = isGroup ? typingName : "them";
      // Pick contextual reply based on what user said
      let replyText: string;
      const lower = text.toLowerCase();
      if (lower.includes("meet") || lower.includes("schedule") || lower.includes("free")) {
        replyText = ["I'm free Tuesday and Thursday afternoons!", "How about Wednesday at 2pm?", "Evenings work best for me — maybe 7pm?", "I can do any weekday after 4pm!"][Math.floor(Math.random() * 4)];
      } else if (lower.includes("skill") || lower.includes("experience") || lower.includes("good at")) {
        replyText = ["I'm strongest in frontend — React and TypeScript mostly.", "I've done a lot of UX research projects before.", "Backend is my thing — APIs, databases, the whole stack.", "I'm pretty versatile but I really enjoy data analysis."][Math.floor(Math.random() * 4)];
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        replyText = ["Hey! Nice to hear from you! 😊", "Hi there! How's it going?", "Hey! What's up?"][Math.floor(Math.random() * 3)];
      } else if (lower.includes("group") || lower.includes("team") || lower.includes("join")) {
        replyText = ["I'd love to be part of the team!", "Sounds like a great group so far!", "I'm in! When do we start?", "Excited to work together on this!"][Math.floor(Math.random() * 4)];
      } else if (lower.includes("thank") || lower.includes("great") || lower.includes("awesome") || lower.includes("perfect")) {
        replyText = ["No problem! 😄", "Glad we're on the same page!", "Awesome, looking forward to it!", "Great, let's keep the momentum going!"][Math.floor(Math.random() * 4)];
      } else {
        replyText = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
      }
      addReply(convName, replyFrom, replyText);
      setTimeout(scrollToBottom, 50);

      // 30% chance of a follow-up message after 2-4 more seconds
      if (Math.random() < 0.3) {
        const delay2 = 2000 + Math.random() * 2000;
        const followups = MOCK_FOLLOWUPS[convName] ?? ["By the way, have you checked the course syllabus yet?", "Also, when's the deadline for group formation?"];
        setTimeout(() => {
          setTyping(isGroup ? typingName : convName);
          setTimeout(() => {
            setTyping(null);
            addReply(convName, replyFrom, followups[Math.floor(Math.random() * followups.length)]);
            setTimeout(scrollToBottom, 50);
          }, 800 + Math.random() * 800);
        }, delay2);
      }
    }, delay1);
  };

  const handleDecline = () => {
    if (!selectedConv) return;
    onContactStatusChange(selectedConv, "declined");
    onUpdateConvStatus?.(selectedConv, "declined");
    setMsgs(prev => ({
      ...prev,
      [selectedConv]: [...(prev[selectedConv] || []), { from: "me", text: `Declined: ${declineReason}${declineNote ? ` — ${declineNote}` : ""}`, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }],
    }));
    setShowDeclineMenu(false);
    setDeclineReason("");
    setDeclineNote("");
  };

  const STATUS_PILL: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#92400E]" },
    replied: { label: "Replied", cls: "bg-[#9652ca]/15 text-[#9652ca]" },
    accepted: { label: "Accepted", cls: "bg-[#DCFCE7] text-[#166534]" },
    declined: { label: "Declined", cls: "bg-[#FEE2E2] text-[#991B1B]" },
    active: { label: "Active", cls: "bg-[#DCFCE7] text-[#166534]" },
  };

  const DECLINE_REASONS = ["Already found a group", "Schedules do not overlap enough", "Looking for different skills"];

  const stages = conv?.type.includes("application")
    ? ["Applied", "Replied", conv?.status === "accepted" ? "Accepted" : conv?.status === "declined" ? "Declined" : "Pending"]
    : ["Request Sent", "Replied", conv?.status === "accepted" ? "Accepted" : conv?.status === "declined" ? "Declined" : "Pending"];
  const currentStageIdx = conv?.status === "accepted" || conv?.status === "declined" ? 2 : conv?.status === "replied" ? 1 : 0;

  void contactStatuses;

  return (
    <div className="flex justify-center h-full bg-background">
      <div className="flex w-full max-w-[1400px] h-full">

        {/* LEFT PANEL: Conversation List */}
        <div className="w-[280px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
          {/* Header + tabs */}
          <div className="px-4 pt-4 pb-2 border-b border-[#E5E7EB] shrink-0">
            <div className="text-[16px] font-semibold mb-3">Messages</div>
            <div className="flex h-8 items-end gap-5">
              {(["all", "sent", "received"] as const).map(t => (
                <button key={t} onClick={() => setConvTab(t)}
                  className={cn(
                    "pb-[6px] text-[13px] border-b-2 capitalize transition-colors cursor-pointer",
                    convTab === t
                      ? "font-semibold text-[#111827] border-[#9652ca]"
                      : "font-normal text-[#9CA3AF] border-transparent hover:border-[#9652ca]/40"
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-16 px-4 text-center">
                <div>
                  <div className="text-4xl mb-3">💬</div>
                  <div className="text-[15px] font-semibold text-gray-500 mb-2">No conversations yet</div>
                  <p className="text-[13px] text-gray-400">Start by messaging someone on the Discovery board.</p>
                </div>
              </div>
            )}
            {/* Pinned group chat */}
            {groupConv && (
              <button
                onClick={() => { setSelectedConv(groupConv.targetName); setShowDeclineMenu(false); onMarkRead?.(groupConv.targetName); }}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-3 text-left transition-colors border-b-2 border-[#E5E7EB] cursor-pointer",
                  selectedConv === groupConv.targetName
                    ? "bg-[#F3F4F6] border-l-[3px] border-l-[#9652ca]"
                    : "hover:bg-[#FAFAFA] border-l-[3px] border-l-transparent bg-[#FAFAFA]"
                )}
              >
                <div className="size-9 shrink-0 rounded-full bg-[#9652ca]/15 flex items-center justify-center">
                  <Icon.chat size={16} color="#9652ca" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn("text-[13px] truncate", groupConv.unread ? "font-semibold text-[#111827]" : "font-medium text-[#374151]")}>{groupConv.targetName}</span>
                      {groupConv.unread && <span className="w-2 h-2 rounded-full bg-[#9652ca] shrink-0" />}
                    </div>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">{groupConv.timestamp}</span>
                  </div>
                  <div className="text-[12px] text-[#6B7280] truncate">{groupConv.lastMessage}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-[#9652ca] font-medium">{groupConv.groupMembers?.length ?? 0} members</span>
                    <span className="inline-flex items-center justify-center h-[16px] px-1 rounded leading-none text-[9px] font-medium bg-[#9652ca]/10 text-[#9652ca]">Group</span>
                  </div>
                </div>
              </button>
            )}

            {/* Individual conversations */}
            {filteredConvs.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[#9CA3AF]">No conversations</div>
            ) : (
              filteredConvs.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedConv(c.targetName); setShowDeclineMenu(false); onMarkRead?.(c.targetName); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-3 text-left transition-colors border-b border-[#F3F4F6] cursor-pointer",
                    selectedConv === c.targetName
                      ? "bg-[#F3F4F6] border-l-[3px] border-l-[#9652ca]"
                      : "hover:bg-[#FAFAFA] border-l-[3px] border-l-transparent"
                  )}
                >
                  <StudentAvatar name={c.targetName} size="size-9" textSize="text-[11px]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={cn("text-[13px] truncate", c.unread ? "font-semibold text-[#111827]" : "font-medium text-[#374151]")}>{c.targetName}</span>
                        {c.unread && <span className="w-2 h-2 rounded-full bg-[#9652ca] shrink-0" />}
                      </div>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0">{c.timestamp}</span>
                    </div>
                    <div className="text-[12px] text-[#6B7280] truncate mb-1">{c.lastMessage}</div>
                    <span className={cn("inline-flex items-center justify-center h-[18px] px-1.5 rounded-full leading-none text-[10px] font-medium", STATUS_PILL[c.status]?.cls)}>
                      {STATUS_PILL[c.status]?.label}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CENTER PANEL: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#E5E7EB] bg-white">
          {selectedConv && conv && (isGroupChat || student) ? (
            <>
              {/* Top bar */}
              <div className="flex items-center gap-3 h-14 px-5 border-b border-[#E5E7EB] shrink-0">
                {isGroupChat ? (
                  <>
                    <div className="size-8 rounded-full bg-[#9652ca]/15 flex items-center justify-center shrink-0">
                      <Icon.chat size={14} color="#9652ca" />
                    </div>
                    <span className="text-[15px] font-semibold">{conv.targetName}</span>
                    <span className="text-[12px] text-[#6B7280]">{conv.groupMembers?.length ?? 0} members</span>
                  </>
                ) : (
                  <>
                    <span className="text-[15px] font-semibold">{conv.targetName}</span>
                    <span className={cn("inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium", STATUS_PILL[conv.status]?.cls)}>
                      {STATUS_PILL[conv.status]?.label}
                    </span>
                  </>
                )}
              </div>

              {/* Scrollable chat content */}
              <div className="flex-1 overflow-y-auto">
                {/* Chat messages */}
                <div className="flex flex-col gap-2.5 p-5">
                  {/* System card — only for 1:1 conversations */}
                  {!isGroupChat && student && (() => {
                    const iSent = conv.type === "request-sent" || conv.type === "application-sent";
                    return (
                      <div className={cn("flex flex-col", iSent ? "items-end" : "items-start")}>
                        <div className={cn("max-w-[85%] rounded-[12px] border border-[#E5E7EB] overflow-hidden", iSent ? "rounded-br-[4px]" : "rounded-bl-[4px]")}>
                          {/* Compact header — always visible */}
                          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#FAFAFA]">
                            <StudentAvatar name={student.name} size="size-7" textSize="text-[10px]" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-[#9652ca]">
                                  {conv.type.includes("request") ? "Group Request" : "Group Application"}
                                </span>
                                <span className="text-[11px] text-[#9CA3AF]">{conv.timestamp}</span>
                              </div>
                              <div className="text-[12px] text-[#6B7280]">
                                {iSent ? `You sent to ${student.name}` : `From ${student.name} · Section ${student.sec}`}
                              </div>
                            </div>
                            <button onClick={() => setRequestExpanded(v => !v)} className="text-[12px] text-[#9652ca] font-medium hover:underline cursor-pointer shrink-0">
                              {requestExpanded ? "Hide" : "Details"}
                            </button>
                          </div>

                          {/* Expanded details */}
                          {requestExpanded && (
                            <div className="px-4 py-3 border-t border-[#F3F4F6] bg-white">
                              {/* Profile + skills */}
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                {student.skills.slice(0, 3).map(sk => (
                                  <span key={sk} className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-[#9652ca]/10 text-[#9652ca]">{sk}</span>
                                ))}
                                <span className="text-[11px] text-[#6B7280] ml-1">Overlap: <strong className="text-[#9652ca]">{student.overlap}</strong></span>
                              </div>
                              {/* Form answers */}
                              <div className="space-y-2 mb-3">
                                <div>
                                  <div className="text-[11px] text-[#6B7280]">Why work together:</div>
                                  <div className="text-[13px] text-[#111827] mt-0.5">I think our skills complement each other well — I cover frontend and you have design + research skills.</div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-[#6B7280]">Their question:</div>
                                  <div className="text-[13px] text-[#111827] mt-0.5">What's your preferred working style — async or sync collaboration?</div>
                                </div>
                              </div>
                              {/* Action buttons — only for received requests */}
                              {!isEnded && !iSent && (
                                <div className="flex gap-2 pt-3 border-t border-[#F3F4F6]">
                                  <button onClick={() => { onContactStatusChange(conv.targetName, "accepted"); if (onAccept) onAccept(conv.targetName); onUpdateConvStatus?.(conv.targetName, "accepted"); }}
                                    className="flex-1 h-8 rounded-[8px] bg-[#9652ca] text-white text-[13px] font-medium hover:bg-[#7a4a9e] cursor-pointer transition-colors">Accept</button>
                                  <button className="flex-1 h-8 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[13px] font-medium hover:bg-[#F9FAFB] cursor-pointer transition-colors">Reply</button>
                                  <button onClick={() => setShowDeclineMenu(v => !v)}
                                    className="flex-1 h-8 rounded-[8px] border border-[#D1D5DB] text-[#991B1B] text-[13px] font-medium hover:bg-[#FEE2E2]/30 cursor-pointer transition-colors">Decline</button>
                                </div>
                              )}
                              {/* Decline dropdown */}
                              {showDeclineMenu && !isEnded && !iSent && (
                                <div className="mt-3 p-3 border border-[#E5E7EB] rounded-[8px] bg-[#F9FAFB]">
                                  <div className="text-[13px] font-medium mb-2">Select a reason:</div>
                                  <div className="space-y-1.5 mb-3">
                                    {DECLINE_REASONS.map(r => (
                                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="decline" value={r} checked={declineReason === r} onChange={() => setDeclineReason(r)} className="accent-[#9652ca]" />
                                        <span className="text-[13px] text-[#374151]">{r}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <input value={declineNote} onChange={e => setDeclineNote(e.target.value)} placeholder="Optional note..."
                                    className="w-full h-8 rounded-[6px] border border-[#D1D5DB] px-3 text-[13px] mb-3 outline-none focus:border-[#9652ca]" />
                                  <div className="flex gap-2">
                                    <button onClick={() => setShowDeclineMenu(false)} className="flex-1 h-8 rounded-[6px] border border-[#D1D5DB] text-[13px] text-[#374151] cursor-pointer hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleDecline} disabled={!declineReason} className={cn("flex-1 h-8 rounded-[6px] text-[13px] font-medium cursor-pointer transition-colors", declineReason ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]" : "bg-gray-200 text-gray-400")}>Confirm Decline</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-[#9CA3AF] mt-1">{conv.timestamp}</span>
                      </div>
                    );
                  })()}

                  {/* Empty conversation hint */}
                  {currentMsgs.length === 0 && !isGroupChat && (
                    <p className="text-[13px] text-[#9CA3AF] italic text-center py-6">Say hello to start chatting!</p>
                  )}

                  {/* Chat messages */}
                  {currentMsgs.map((m, i) => {
                    const msgKey = `${selectedConv}-${i}`;
                    const myReaction = reactions[msgKey];
                    return (
                      <div key={i} className={cn("flex flex-col", m.from === "me" ? "items-end" : "items-start")}>
                        {isGroupChat && m.from !== "me" && (
                          <span className="text-[11px] font-medium text-[#9652ca] mb-0.5 ml-1">{m.from}</span>
                        )}
                        <div className="relative group">
                          <div
                            className={cn(
                              "px-[14px] py-[10px] text-[14px] leading-relaxed",
                              m.from === "me"
                                ? "bg-[#9652ca] text-white rounded-[16px_16px_4px_16px]"
                                : "bg-[#F3F4F6] text-[#111827] rounded-[16px_16px_16px_4px]"
                            )}
                          >{m.text}</div>
                          {/* Reaction picker — hover-based, bottom-right of bubble */}
                          {m.from !== "me" && (
                            <div className="absolute right-0 hidden group-hover:flex gap-0.5 bg-white border border-[#E5E7EB] rounded-full shadow-sm px-1 py-0.5 z-10" style={{ bottom: "-25px" }}>
                              {REACTION_ICONS.map(r => (
                                <button key={r.type} onClick={() => toggleReaction(msgKey, r.type)}
                                  className={cn("w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#F3F4F6] transition-colors cursor-pointer", myReaction === r.type && "bg-opacity-15")}>
                                  <r.icon size={13} color={myReaction === r.type ? REACTION_COLORS[r.type] : "#6B7280"} />
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Active reaction badge */}
                          {myReaction && (
                            <div
                              className="absolute -bottom-2.5 left-1 bg-white border border-[#E5E7EB] rounded-full px-1.5 h-5 flex items-center justify-center shadow-sm cursor-pointer text-[11px]"
                              onClick={() => toggleReaction(msgKey, myReaction)}
                            >
                              {REACTION_ICONS.find(r => r.type === myReaction)?.emoji}
                            </div>
                          )}
                        </div>
                        <span className={cn("text-[11px] text-[#9CA3AF]", myReaction ? "mt-3.5" : "mt-1")}>{m.time}</span>
                      </div>
                    );
                  })}
                  {conv.status === "accepted" && (
                    <p className="text-[13px] text-[#6B7280] italic text-center py-3">
                      Request accepted — you're forming a group!
                    </p>
                  )}
                  {conv.status === "declined" && (
                    <p className="text-[13px] text-[#991B1B] italic text-center py-3">
                      Request declined.
                    </p>
                  )}
                  {typing && (
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] font-medium text-[#9652ca] mb-0.5 ml-1">{typing}</span>
                      <div className="bg-[#F3F4F6] rounded-[16px_16px_16px_4px] px-4 py-2.5 flex gap-1 items-center">
                        <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={msgEndRef} />
                </div>
              </div>

              {/* Input area */}
              {!isEnded ? (
                <div className="flex items-center gap-2 h-14 px-5 border-t border-[#E5E7EB] shrink-0 bg-white">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMsg()}
                    placeholder="Type a message..."
                    className="flex-1 h-9 rounded-[20px] border border-[#D1D5DB] px-4 text-[14px] outline-none focus:border-[#9652ca] bg-white"
                  />
                  <button onClick={sendMsg} disabled={!input.trim()}
                    className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                      input.trim() ? "bg-[#9652ca] text-white" : "bg-gray-200 text-gray-400"
                    )}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              ) : (
                <div className="h-14 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center gap-3 shrink-0">
                  <span className="text-[13px] text-[#6B7280]">This conversation has ended.</span>
                  <button onClick={() => go("mygroup")} className="text-[13px] text-[#9652ca] font-medium hover:underline cursor-pointer">My Group</button>
                  <span className="text-[#D1D5DB]">·</span>
                  <button onClick={() => go("dash")} className="text-[13px] text-[#9652ca] font-medium hover:underline cursor-pointer">Dashboard</button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#9CA3AF] text-[14px]">
              Select a conversation to start chatting
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Profile + Timeline */}
        <div className="w-[320px] shrink-0 bg-white overflow-y-auto">
          {/* Group chat: show member list */}
          {isGroupChat && conv ? (
            <div className="p-5">
              <div className="text-[16px] font-semibold mb-1">Group Chat</div>
              <div className="text-[13px] text-[#6B7280] mb-5">CSC318 · Section 201</div>

              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-3">Members ({(conv.groupMembers?.length ?? 0) + 1})</div>
                {/* Current user */}
                <div className="flex items-center gap-2.5 py-2 border-b border-[#F3F4F6]">
                  <Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-[11px] font-bold">{getInitials(userName)}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{userName || "You"} (You)</div>
                    <div className="text-[11px] text-[#6B7280]">UI Design, User Research</div>
                  </div>
                </div>
                {conv.groupMembers?.map(m => {
                  const s = STU.find(st => st.name === m.name);
                  return (
                    <div key={m.name} className="flex items-center gap-2.5 py-2 border-b border-[#F3F4F6]">
                      <StudentAvatar name={m.name} size="size-8" textSize="text-[11px]" />
                      <div className="flex-1">
                        <div className="text-[13px] font-medium">{m.name}</div>
                        <div className="text-[11px] text-[#6B7280]">{s?.skills.join(", ") ?? ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Group Skills</div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(["UI Design", "User Research", ...(conv.groupMembers?.flatMap(m => STU.find(s => s.name === m.name)?.skills ?? []) ?? [])])).map(sk => (
                    <span key={sk} className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]">{sk}</span>
                  ))}
                </div>
              </div>

              <button onClick={() => go("mygroup")} className="w-full h-10 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[13px] font-medium hover:bg-[#F9FAFB] cursor-pointer transition-colors">
                Go to My Group
              </button>
            </div>
          ) : student && conv ? (
            <div className="p-5">
              {/* Profile header */}
              <div className="flex flex-col items-center text-center mb-5 pb-5 border-b border-[#E5E7EB]">
                <StudentAvatar name={student.name} size="size-16 mb-3" textSize="text-xl" />
                <div className="text-[18px] font-bold">{student.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn(
                    "inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium",
                    student.status === "solo" ? "bg-[#DCFCE7] text-[#166534]" :
                      student.status === "open-group" ? "bg-[#FEF3C7] text-[#92400E]" :
                        "bg-gray-100 text-gray-500"
                  )}>
                    {student.status === "solo" ? "Solo" : student.status === "open-group" ? "Open Group" : "Closed"}
                  </span>
                  <span className="text-[13px] text-[#6B7280]">Section {student.sec}</span>
                </div>
                <button onClick={() => go("board")} className="text-[12px] text-[#9652ca] hover:underline cursor-pointer mt-2">View Full Profile →</button>
              </div>

              {/* Vertical timeline */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-3">Progress</div>
                <div className="flex flex-col gap-0">
                  {stages.map((label, i) => {
                    const isComplete = i <= currentStageIdx;
                    const isCurrent = i === currentStageIdx;
                    const isLast = i === stages.length - 1;
                    const timestamps = ["Mar 22, 2:14 PM", "Mar 22, 2:18 PM", ""];
                    return (
                      <div key={label} className="flex gap-3">
                        {/* Circle + line */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0 mt-1",
                            isComplete ? "bg-[#9652ca]" : "border-2 border-[#D1D5DB] bg-white",
                            isCurrent && "ring-2 ring-[#9652ca]/30"
                          )} />
                          {!isLast && <div className={cn("w-px flex-1 min-h-[28px]", isComplete && i < currentStageIdx ? "bg-[#9652ca]" : "bg-[#E5E7EB]")} />}
                        </div>
                        {/* Label + time */}
                        <div className="pb-4">
                          <div className={cn(
                            "text-[13px]",
                            isCurrent ? "font-semibold text-[#9652ca]" :
                              isComplete ? "font-medium text-[#9652ca]" :
                                "text-[#9CA3AF]"
                          )}>{label}</div>
                          {isComplete && timestamps[i] && (
                            <div className="text-[11px] text-[#9CA3AF] mt-0.5">{timestamps[i]}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bio */}
              {student.bio && (
                <div className="mb-5">
                  <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">About</div>
                  <p className="text-[13px] text-[#374151] leading-relaxed">{student.bio}</p>
                </div>
              )}

              {/* Skills */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Skills</div>
                <div className="flex flex-wrap gap-1">
                  {student.skills.map(sk => (
                    <span key={sk} className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]">{sk}</span>
                  ))}
                </div>
              </div>

              {/* Schedule overlap */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Schedule Overlap</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                    <div className="h-full rounded-full bg-[#9652ca]" style={{ width: `${Math.min(100, (student.scheduleOverlapHrs / 10) * 100)}%` }} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#9652ca] shrink-0">{student.overlap}</span>
                </div>
              </div>

              {/* Skill ratings */}
              {Object.keys(student.rat).length > 0 && (
                <div className="mb-5">
                  <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Skill Ratings</div>
                  {Object.entries(student.rat).map(([skill, level]) => (
                    <div key={skill} className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] last:border-0">
                      <span className="text-[13px] text-[#374151]">{skill}</span>
                      <span className="text-[12px] text-[#6B7280]">{level}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Last active */}
              <div className="text-[12px] text-[#9CA3AF] mb-5">Last active: {student.lastActive}</div>

              {/* Send Group Request button — only when no request sent yet */}
              {contactStatuses[student.name] === "none" && (
                <Button variant="outline" className="w-full gap-2 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5" onClick={() => { onContactStatusChange(student.name, "request-sent"); go("board"); }}>
                  <Icon.mailSend size={16} color="#9652ca" />
                  Send Group Request
                </Button>
              )}
              {contactStatuses[student.name] === "request-sent" && (
                <div className="text-center text-[13px] text-[#6B7280]">Group request sent</div>
              )}

              <div className="mt-6 pt-4 border-t border-[#F3F4F6] text-center">
                <button onClick={() => setDeleteConfirm(true)} className="text-[13px] text-[#DC2626] font-semibold hover:text-[#B91C1C] hover:underline cursor-pointer">Delete this chat</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#9CA3AF] text-[13px] p-5">
              Select a conversation to see profile
            </div>
          )}
        </div>

      </div>

      {/* Delete chat confirmation modal */}
      {deleteConfirm && selectedConv && (
        <div className="fixed inset-0 bg-foreground/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 w-full max-w-[360px] shadow-xl text-center">
            <div className="text-lg font-bold mb-2">Delete this chat?</div>
            <p className="text-[13px] text-gray-600 mb-5">This will permanently remove the conversation with <strong>{selectedConv}</strong> and all messages.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white" onClick={() => {
                const name = selectedConv;
                onDeleteConversation?.(name);
                setDeleteConfirm(false);
                setSelectedConv(conversations.find(c => c.targetName !== name)?.targetName ?? null);
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== APP ====================
const DEFAULT_CHAT_MSGS: ChatMessages = {
  "CSC318 Group": [
    { from: "Marcus Lee", text: "Hey everyone! Excited to work together.", time: "Mar 22, 10:00 AM" },
    { from: "Sofia Rodriguez", text: "Same here! I set up the shared doc.", time: "Mar 22, 10:05 AM" },
    { from: "me", text: "Great, let's set up a meeting time.", time: "Mar 22, 10:12 AM" },
    { from: "Sofia Rodriguez", text: "Let's meet Thursday!", time: "Mar 22, 10:15 AM" },
  ],
  "Marcus Lee": [
    { from: "me", text: "Hey Marcus! I saw we have similar design skills. Want to team up?", time: "Mar 20, 3:00 PM" },
    { from: "them", text: "Definitely! I've been looking for a UI-focused group.", time: "Mar 20, 3:05 PM" },
    { from: "me", text: "Awesome, welcome to the group!", time: "Mar 20, 3:10 PM" },
  ],
  "Sofia Rodriguez": [
    { from: "them", text: "Hi! I'm interested in joining your group. I bring UX research experience.", time: "Mar 21, 11:00 AM" },
    { from: "me", text: "That sounds perfect! We'd love to have you.", time: "Mar 21, 11:15 AM" },
    { from: "them", text: "Excited to work together!", time: "Mar 21, 11:20 AM" },
  ],
  "David Park": [
    { from: "them", text: "Hey! I saw we have great schedule overlap. Want to form a group?", time: "Mar 22, 2:14 PM" },
    { from: "me", text: "Sounds great! When are you free this week?", time: "Mar 22, 2:18 PM" },
  ],
  "Wei Zhang": [
    { from: "me", text: "Hi Wei! Want to join our CSC318 group?", time: "Mar 19, 4:00 PM" },
    { from: "them", text: "Sorry, I found another group already. Good luck!", time: "Mar 20, 9:00 AM" },
  ],
};

function getInitialPage(): string {
  // Magic-link return URL — detect the callback path so a deep-link
  // reload doesn't drop the user on the landing page mid-auth.
  if (typeof window !== "undefined" && window.location.pathname.endsWith("/auth/callback")) {
    return "callback";
  }
  return "landing";
}

export default function Unitor() {
  const [pg, setPg] = useState(getInitialPage);
  const [role, setRole] = useState("s");
  const [showDemoBar, setShowDemoBar] = useState(false);
  const auth = useAuth();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); setShowDemoBar(v => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const [selectedStudent, setSelectedStudent] = useState<import("@/hooks/useDiscovery").MergedStudent | null>(null);
  const [receivedRequestSender, setReceivedRequestSender] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [userName, setUserName] = useLocalStorage<string>("userName", "");
  const [userEmail, setUserEmail] = useLocalStorage<string>("userEmail", "");
  const [hasJoinedCourse, setHasJoinedCourse] = useLocalStorage<boolean>("hasJoinedCourse", false);
  const [hasCreatedCourse, setHasCreatedCourse] = useLocalStorage<boolean>("hasCreatedCourse", false);
  const [appliedGroups, setAppliedGroups] = useLocalStorage<Record<string, string>>("appliedGroups", {});
  const [studentStatus, setStudentStatus] = useLocalStorage<"solo" | "open-group" | "closed">("studentStatus", "solo");
  const [notifications, setNotifications] = useState<AppNotification[]>(DEMO_NOTIFICATIONS);
  const [contactStatuses, setContactStatuses] = useLocalStorage<Record<string, string>>(
    "contactStatuses",
    () => Object.fromEntries(STU.map(s => [s.name, s.contactStatus]))
  );
  const [chatMsgs, setChatMsgs] = useLocalStorage<ChatMessages>("chatMsgs", DEFAULT_CHAT_MSGS);
  const [conversations, setConversations] = useLocalStorage<Conversation[]>("conversations", DEMO_CONVERSATIONS);
  const [initialSelectedConv, setInitialSelectedConv] = useState<string | null>(null);
  const [chatReactions, setChatReactions] = useLocalStorage<Record<string, string | null>>("chatReactions", {});
  const { toasts, showToast, removeToast } = useToasts();

  const addNotification = useCallback((type: NotificationType, title: string, body: string, actionTarget?: string) => {
    const n: AppNotification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      body,
      timestamp: "Just now",
      read: false,
      actionTarget,
    };
    setNotifications(prev => [n, ...prev]);
  }, []);

  const updateContactStatus = useCallback((name: string, status: string) =>
    setContactStatuses(prev => ({ ...prev, [name]: status })), [setContactStatuses]);

  const openChatWith = useCallback((name: string) => {
    const existing = conversations.find(c => c.targetName === name);
    if (!existing) {
      const stu = STU.find(s => s.name === name);
      const newConv: Conversation = {
        id: `conv-new-${Date.now()}`,
        targetName: name,
        targetInit: stu?.init ?? name.split(" ").map(w => w[0]).join(""),
        type: "request-sent",
        status: "pending",
        lastMessage: "Start a conversation",
        timestamp: "now",
        unread: false,
      };
      setConversations(prev => [...prev, newConv]);
    }
    setInitialSelectedConv(name);
    setPg("chats");
    window.scrollTo(0, 0);
  }, [conversations, setConversations]);

  const go = (p: string) => {
    if (p === "signup-s") { setRole("s"); setPg("signup") }
    else if (p === "signup-t") { setRole("t"); setPg("signup") }
    else setPg(p);
    // If we landed via /auth/callback, normalize the URL once we navigate
    // away so a reload doesn't re-trigger the callback flow.
    if (typeof window !== "undefined" && window.location.pathname.endsWith("/auth/callback") && p !== "callback") {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
      window.history.replaceState(null, "", base);
    }
    window.scrollTo(0, 0);
  };

  // Sync the bootstrap's display_name into the local-storage shim once
  // it lands, so the existing prototype components that read `userName`
  // still see the real name.
  useEffect(() => {
    if (auth.user?.display_name && auth.user.display_name !== userName) {
      setUserName(auth.user.display_name);
    }
    if (auth.user?.primary_email && auth.user.primary_email !== userEmail) {
      setUserEmail(auth.user.primary_email);
    }
    if (auth.enrollments.length > 0 && !hasJoinedCourse) {
      setHasJoinedCourse(true);
    }
  }, [auth.user, auth.enrollments, userName, userEmail, hasJoinedCourse, setUserName, setUserEmail, setHasJoinedCourse]);



  const handleNotificationClick = (n: AppNotification) => {
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
    if (!n.actionTarget) return;
    if (n.type === "group-request-received") {
      go("chats");
    } else if (n.type === "request-accepted" || n.type === "request-declined") {
      go("chats");
    } else if (n.type === "group-application-received") {
      go("mygroup");
    } else {
      go(n.actionTarget);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  const P: Record<string, ReactNode> = {
    landing: <Landing go={go} />, "signup-role": <SignupRole go={go} />,
    signup: role === "t"
      ? <SignupForm role={role} go={go} onSetName={setUserName} onSetEmail={setUserEmail} />
      : <MagicLinkRequest go={go} heading="Create your account" onSubmitEmail={setUserEmail} />,
    verify: <Verify go={go} userEmail={userEmail} />,
    login: <MagicLinkRequest go={go} heading="Welcome back" onSubmitEmail={setUserEmail} />,
    callback: <MagicLinkCallback
      go={go}
      onUserResolved={(name) => { if (name) setUserName(name); }}
      onHasEnrollments={() => setHasJoinedCourse(true)}
    />,
    "dash-empty": <DashEmpty go={go} />, dash: <Dash go={go} userName={userName} />,
    join: <Join go={go} onJoined={() => setHasJoinedCourse(true)} />,
    "prof-0": <Step0Name go={go} initialName={userName} onSaveName={setUserName} />, "prof-1": <Step1Skills go={go} />, "prof-2": <Step2Schedule go={go} />, "prof-3": <Step3CommBio go={go} />, "prof-done": <ProfileDone go={go} onJoinCourse={() => setHasJoinedCourse(true)} />,
    "ta-dash-empty": <TADashEmpty go={go} />, "ta-dash": <TADash go={go} />, "ta-course-dash": <TACourseDash go={go} showToast={showToast} />, "ta-create": <TACreate go={go} onCreateCourse={() => setHasCreatedCourse(true)} showToast={showToast} />,
    board: <Discovery go={go} onSelectStudent={(student) => {
      const cs = contactStatuses[student.user_id];
      if (cs === "replied") { go("chats"); return; }
      setSelectedStudent(student);
    }} urgentMode={isUrgent} onSelectGroup={setSelectedGroup} appliedGroups={appliedGroups} contactStatuses={contactStatuses} onContactStatusChange={updateContactStatus} onOpenChat={(userId) => openChatWith(userId)} />,
    chats: <ChatsPage go={go} conversations={conversations} contactStatuses={contactStatuses} onContactStatusChange={updateContactStatus} onAccept={(name) => { updateContactStatus(name, "accepted"); setStudentStatus("open-group"); }} msgs={chatMsgs} onMsgsChange={setChatMsgs} initialSelectedConv={initialSelectedConv} onClearInitialConv={() => setInitialSelectedConv(null)} reactions={chatReactions} onReactionsChange={setChatReactions} onUpdateConvStatus={(name, status) => setConversations(prev => prev.map(c => c.targetName === name ? { ...c, status: status as Conversation["status"] } : c))} onMarkRead={(name) => setConversations(prev => prev.map(c => c.targetName === name ? { ...c, unread: false } : c))} onDeleteConversation={(name) => { setConversations(prev => prev.filter(c => c.targetName !== name)); setChatMsgs(prev => { const next = { ...prev }; delete next[name]; return next; }); }} userName={userName} />,
    mygroup: <MyGroup go={go} studentStatus={studentStatus} onAcceptRequest={() => setStudentStatus("open-group")} onLeaveGroup={() => setStudentStatus("solo")} onOpenChat={(name) => openChatWith(name)} userName={userName} />,
    urgent: <Urgent go={go} />,
    "profile-edit": <ProfileEdit go={go} showToast={showToast} userName={userName} />,
  };

  const nav = [
    { g: "Onboard", p: ["landing", "login", "signup-role", "signup", "verify"] },
    { g: "Student", p: ["dash-empty", "dash", "join", "prof-0", "prof-1", "prof-2", "prof-3", "prof-done"] },
    { g: "Board", p: ["board", "profile-edit"] },
    { g: "Social", p: ["mygroup", "urgent", "chats"] },
    { g: "TA", p: ["ta-dash-empty", "ta-dash", "ta-course-dash", "ta-create"] },
  ];

  // demo status switcher
  const statusCycle: ("solo" | "open-group" | "closed")[] = ["solo", "open-group", "closed"];

  return <div className="flex flex-col h-screen">
    {APP_PAGES.has(pg) && (
      <Nav go={go} activePage={pg} studentStatus={studentStatus} notifications={notifications} onNotificationClick={handleNotificationClick} onMarkAllRead={handleMarkAllRead} userName={userName} onSignOut={() => clearAllLocalStorage()} />
    )}
    <div className="flex-1 overflow-y-auto">
      {P[pg]}
    </div>

    <SlidePanel
      open={selectedGroup !== null}
      onClose={() => setSelectedGroup(null)}
      title="Group Details"
    >
      {selectedGroup && (
        <GroupDetailPanel
          key={selectedGroup}
          go={go}
          groupId={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onApplied={(id) => {
            setAppliedGroups(prev => ({ ...prev, [id]: "applied" }));
          }}
          onOpenChat={(name) => { setSelectedGroup(null); openChatWith(name); }}
        />
      )}
    </SlidePanel>

    <SlidePanel
      open={selectedStudent !== null}
      onClose={() => setSelectedStudent(null)}
      title="Student Profile"
    >
      {selectedStudent && (
        <ProfilePanelContent
          student={selectedStudent}
          go={go}
          onClose={() => setSelectedStudent(null)}
          onContactStatusChange={updateContactStatus}
          urgentMode={isUrgent}
          contactStatus={contactStatuses[selectedStudent.user_id] ?? "none"}
          onOpenChat={(userId) => {
            const sel = selectedStudent;
            setSelectedStudent(null);
            openChatWith(sel.display_name ?? userId);
          }}
          onSelectGroup={(id) => { setSelectedStudent(null); setSelectedGroup(id); }}
          onSendRequest={(userId, why, question) => {
            const sel = selectedStudent;
            const targetName = sel.display_name ?? userId;
            setSelectedStudent(null);
            setStudentStatus("open-group");
            const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const msgText = `📋 Group Request\n\nWhy: ${why}${question ? `\n\nQuestion: ${question}` : ""}`;
            const existing = conversations.find(c => c.targetName === targetName);
            if (!existing) {
              const initials = targetName.split(" ").map(w => w[0] ?? "").join("").slice(0, 2);
              setConversations(prev => [...prev, { id: `conv-${Date.now()}`, targetName, targetInit: initials, type: "request-sent", status: "pending", lastMessage: "Group request sent", timestamp: "now", unread: false }]);
            } else {
              setConversations(prev => prev.map(c => c.targetName === targetName ? { ...c, type: "request-sent", status: "pending", lastMessage: "Group request sent", timestamp: "now" } : c));
            }
            setChatMsgs(prev => ({ ...prev, [targetName]: [...(prev[targetName] || []), { from: "me", text: msgText, time }] }));
            setInitialSelectedConv(targetName);
            setPg("chats");
            showToast("Group request sent!");
            const firstName = targetName.split(" ")[0];
            setTimeout(() => {
              const replyText = MOCK_REQUEST_REPLIES[Math.floor(Math.random() * MOCK_REQUEST_REPLIES.length)];
              const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              setChatMsgs(prev => ({ ...prev, [targetName]: [...(prev[targetName] || []), { from: "them", text: replyText, time: replyTime }] }));
              setConversations(prev => prev.map(c => c.targetName === targetName ? { ...c, status: "replied", lastMessage: replyText, unread: true } : c));
              addNotification("request-accepted", `${firstName} responded`, `${firstName} replied to your group request.`, "chats");
            }, 3000 + Math.random() * 2000);
            window.scrollTo(0, 0);
          }}
        />
      )}
    </SlidePanel>

    <SlidePanel
      open={receivedRequestSender !== null}
      onClose={() => setReceivedRequestSender(null)}
      title="Group Request"
    >
      {receivedRequestSender && (
        <ReceivedRequestPanel
          senderName={receivedRequestSender}
          onClose={() => setReceivedRequestSender(null)}
          onAccept={() => {
            updateContactStatus(receivedRequestSender, "accepted");
            setStudentStatus("open-group");
            go("mygroup");
            setReceivedRequestSender(null);
          }}
          onReply={() => {
            if (receivedRequestSender) updateContactStatus(receivedRequestSender, "replied");
            setReceivedRequestSender(null);
            go("chats");
          }}
        />
      )}
    </SlidePanel>

    <ToastContainer toasts={toasts} onRemove={removeToast} />

    {/* Demo controls — 2 rows */}
    {showDemoBar && (
      <div className="shrink-0 bg-card border-t border-border py-1.5 px-4 flex flex-col gap-1">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-[3px] border-r border-gray-200 pr-3">
            <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">Status</span>
            {statusCycle.map(s => (
              <button key={s} onClick={() => setStudentStatus(s)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", studentStatus === s ? "border-[1.5px] border-primary bg-primary text-primary-foreground" : "border-gray-200 bg-card text-gray-500")}>{s}</button>
            ))}
          </div>
          {nav.slice(0, 3).map(n => <div key={n.g} className="flex items-center gap-[3px]">
            <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">{n.g}</span>
            {n.p.map(p => <button key={p} onClick={() => setPg(p)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", pg === p ? "border-[1.5px] border-primary bg-primary text-primary-foreground" : "border-gray-200 bg-card text-gray-500")}>{p}</button>)}
          </div>)}
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {nav.slice(3).map(n => <div key={n.g} className="flex items-center gap-[3px]">
            <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">{n.g}</span>
            {n.p.map(p => <button key={p} onClick={() => setPg(p)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", pg === p ? "border-[1.5px] border-primary bg-primary text-primary-foreground" : "border-gray-200 bg-card text-gray-500")}>{p}</button>)}
          </div>)}
          <div className="flex items-center gap-[3px] ml-auto">
            <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">Demo</span>
            <button onClick={() => setIsUrgent(v => !v)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", isUrgent ? "border-[1.5px] border-danger bg-danger text-white" : "border-gray-200 bg-card text-gray-500")}>urgent</button>
            <button onClick={() => updateContactStatus("Jesse Nguyen", "no-response")} className="py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border border-gray-200 bg-card text-gray-500">no-resp</button>
            <button onClick={() => { clearAllLocalStorage(); window.location.reload(); }} className="py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border border-danger bg-danger/10 text-danger font-bold">reset</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}
