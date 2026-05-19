/**
 * Prototype mock data used by the in-scope Discovery flow and the
 * still-mock MyGroup / TA pages.
 *
 * Replaced piece-by-piece during stage 1 step E (Discovery wiring) and
 * stage 2 (groups, TA dashboards). For now the constants live here so
 * the extracted components and the leftover App.tsx pages can both
 * import them.
 */

import type {
  CompatibilityBreakdown,
  StatusInfo,
  Student,
} from "@/types/ui";

// ---------------------------------------------------------------------------
// Activity helpers
// ---------------------------------------------------------------------------

export function parseActivityMinutes(lastActive: string): number {
  const n = parseInt(lastActive);
  if (lastActive.includes("min")) return n;
  if (lastActive.includes("hour")) return n * 60;
  if (lastActive.includes("day")) return n * 1440;
  return 99999;
}

export function isRecentlyActive(lastActive: string): boolean {
  return parseActivityMinutes(lastActive) < 30;
}

// ---------------------------------------------------------------------------
// Student roster
// ---------------------------------------------------------------------------

export const STU: Student[] = [
  { name: "Jesse Nguyen", sec: "202", skills: ["Frontend Dev", "Prototyping"], status: "solo", contactStatus: "none", overlap: "8h/wk", init: "JN", bio: "Love building things. Looking for a design-focused team.", rat: { "Frontend Dev": "Proficient", "Prototyping": "Expert" }, lastActive: "5 min ago", compatScore: 87, scheduleOverlapHrs: 8 },
  { name: "Priya Sharma", sec: "201", skills: ["Backend", "Data Analysis"], status: "solo", contactStatus: "none", overlap: "0h/wk", init: "PS", bio: "Data nerd. Prefer async work.", rat: { "Backend": "Proficient", "Data Analysis": "Expert" }, lastActive: "8 days ago", compatScore: 41, scheduleOverlapHrs: 0 },
  { name: "Marcus Lee", sec: "201", skills: ["UI Design", "Frontend Dev"], status: "open-group", contactStatus: "accepted", overlap: "5h/wk", init: "ML", bio: "Design + code. Currently forming a group.", rat: { "UI Design": "Proficient", "Frontend Dev": "Intermediate" }, lastActive: "20 min ago", compatScore: 72, scheduleOverlapHrs: 5 },
  { name: "Aisha Khan", sec: "203", skills: ["Project Mgmt", "UX Writing"], status: "open-group", contactStatus: "none", overlap: "3h/wk", init: "AK", bio: "Organized and reliable. Leading a group focused on accessibility — looking for more members.", rat: { "Project Mgmt": "Expert", "UX Writing": "Proficient" }, lastActive: "1 hour ago", compatScore: 65, scheduleOverlapHrs: 3 },
  { name: "Tom Chen", sec: "201", skills: ["Backend", "Prototyping"], status: "closed", contactStatus: "none", overlap: "—", init: "TC", bio: "Backend dev and creative prototyper.", rat: { "Backend": "Intermediate", "Prototyping": "Proficient" }, lastActive: "2 days ago", compatScore: 0, scheduleOverlapHrs: 0 },
  { name: "David Park", sec: "202", skills: ["Backend", "Data Analysis"], status: "solo", contactStatus: "none", overlap: "6h/wk", init: "DP", bio: "Full-stack developer interested in data-driven projects.", rat: { "Backend": "Expert", "Data Analysis": "Proficient" }, lastActive: "15 min ago", compatScore: 76, scheduleOverlapHrs: 6 },
  { name: "Lisa Wang", sec: "201", skills: ["Frontend Dev", "UX Writing"], status: "solo", contactStatus: "none", overlap: "4h/wk", init: "LW", bio: "I bridge the gap between design and development.", rat: { "Frontend Dev": "Proficient", "UX Writing": "Intermediate" }, lastActive: "2 hours ago", compatScore: 68, scheduleOverlapHrs: 4 },
  { name: "Omar Ali", sec: "203", skills: ["Project Mgmt"], status: "solo", contactStatus: "none", overlap: "2h/wk", init: "OA", bio: "Experienced PM looking for a motivated team.", rat: { "Project Mgmt": "Expert" }, lastActive: "5 days ago", compatScore: 52, scheduleOverlapHrs: 2 },
  { name: "Sofia Rodriguez", sec: "202", skills: ["UI Design", "User Research"], status: "open-group", contactStatus: "accepted", overlap: "7h/wk", init: "SR", bio: "UX researcher passionate about accessible design.", rat: { "UI Design": "Intermediate", "User Research": "Expert" }, lastActive: "10 min ago", compatScore: 81, scheduleOverlapHrs: 7 },
  { name: "Wei Zhang", sec: "202", skills: ["Frontend Dev", "Backend"], status: "solo", contactStatus: "none", overlap: "9h/wk", init: "WZ", bio: "Full-stack dev. Strong in React and Node.", rat: { "Frontend Dev": "Expert", "Backend": "Proficient" }, lastActive: "12 days ago", compatScore: 79, scheduleOverlapHrs: 9 },
  { name: "Elena Popov", sec: "203", skills: ["Data Analysis", "UX Writing"], status: "solo", contactStatus: "none", overlap: "5h/wk", init: "EP", bio: "Research-oriented. Love working with data.", rat: { "Data Analysis": "Expert", "UX Writing": "Intermediate" }, lastActive: "30 min ago", compatScore: 63, scheduleOverlapHrs: 5 },
  { name: "Nadia Kim", sec: "202", skills: ["UX Writing", "User Research"], status: "open-group", contactStatus: "none", overlap: "6h/wk", init: "NK", bio: "UX writer building a team around accessibility.", rat: { "UX Writing": "Expert", "User Research": "Proficient" }, lastActive: "25 min ago", compatScore: 74, scheduleOverlapHrs: 6 },
  { name: "Ben Okafor", sec: "203", skills: ["Backend", "Project Mgmt"], status: "closed", contactStatus: "none", overlap: "—", init: "BO", bio: "Systems thinker and natural team organizer.", rat: { "Backend": "Expert", "Project Mgmt": "Proficient" }, lastActive: "4 days ago", compatScore: 0, scheduleOverlapHrs: 0 },
  { name: "Kai Tanaka", sec: "201", skills: ["Prototyping", "UI Design"], status: "closed", contactStatus: "none", overlap: "—", init: "KT", bio: "Figma wizard.", rat: { "Prototyping": "Expert", "UI Design": "Proficient" }, lastActive: "3 days ago", compatScore: 0, scheduleOverlapHrs: 0 },
  { name: "Nina Okafor", sec: "201", skills: ["User Research", "Data Analysis"], status: "solo", contactStatus: "none", overlap: "7h/wk", init: "NO", bio: "Research-driven designer. I love digging into user data to find insights.", rat: { "User Research": "Expert", "Data Analysis": "Proficient" }, lastActive: "15 min ago", compatScore: 83, scheduleOverlapHrs: 7 },
  { name: "Liam Foster", sec: "202", skills: ["Backend", "Project Mgmt"], status: "open-group", contactStatus: "none", overlap: "5h/wk", init: "LF", bio: "Backend dev and team organizer. Forming a group focused on scalable systems.", rat: { "Backend": "Expert", "Project Mgmt": "Intermediate" }, lastActive: "30 min ago", compatScore: 70, scheduleOverlapHrs: 5 },
  { name: "Yuki Sato", sec: "203", skills: ["Frontend Dev", "UI Design"], status: "open-group", contactStatus: "none", overlap: "6h/wk", init: "YS", bio: "Frontend specialist with a strong eye for design. In Liam's group.", rat: { "Frontend Dev": "Expert", "UI Design": "Intermediate" }, lastActive: "45 min ago", compatScore: 66, scheduleOverlapHrs: 6 },
  { name: "Amara Diallo", sec: "201", skills: ["Prototyping", "User Research"], status: "solo", contactStatus: "none", overlap: "8h/wk", init: "AD", bio: "Rapid prototyper who loves talking to users. Looking for a collaborative team.", rat: { "Prototyping": "Proficient", "User Research": "Expert" }, lastActive: "5 min ago", compatScore: 78, scheduleOverlapHrs: 8 },
  { name: "Ryan Mitchell", sec: "202", skills: ["Data Analysis", "Backend"], status: "solo", contactStatus: "none", overlap: "3h/wk", init: "RM", bio: "Data science background. Prefer structured, deadline-driven teams.", rat: { "Data Analysis": "Expert", "Backend": "Intermediate" }, lastActive: "1 hour ago", compatScore: 58, scheduleOverlapHrs: 3 },
];

// ---------------------------------------------------------------------------
// Status badge labels
// ---------------------------------------------------------------------------

export const SS: Record<string, StatusInfo> = {
  solo: { l: "Solo", variant: "success" },
  "open-group": { l: "Open Group", variant: "warning" },
  closed: { l: "Closed", cls: "bg-gray-100 text-gray-500 border-transparent" },
};

// ---------------------------------------------------------------------------
// Compatibility breakdowns (mock — replaced by /api/v1/compatibility/batch in step E)
// ---------------------------------------------------------------------------

export const COMPAT: Record<string, CompatibilityBreakdown> = {
  "Jesse Nguyen": {
    overall: 87, scheduleScore: 90, skillScore: 95, workStyleScore: 100,
    matchReasons: ["Strong schedule overlap (8h/wk)", "Complementary skills — no redundancy", "Same meeting preference (in-person, 2x/wk)"],
    warnings: [],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "Prototyping", coveredBy: "them" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Priya Sharma": {
    overall: 41, scheduleScore: 0, skillScore: 90, workStyleScore: 33,
    matchReasons: ["Complementary skills — good coverage"],
    warnings: ["No schedule overlap detected", "Different meeting frequency (2x/wk vs 1x/wk)", "Different meeting style (in-person vs online)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Backend", coveredBy: "them" }, { skill: "Data Analysis", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "David Park": {
    overall: 76, scheduleScore: 75, skillScore: 85, workStyleScore: 67,
    matchReasons: ["Good schedule overlap (6h/wk)", "Complementary skills"],
    warnings: ["Different meeting style (in-person vs hybrid)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Backend", coveredBy: "them" }, { skill: "Data Analysis", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Sofia Rodriguez": {
    overall: 81, scheduleScore: 85, skillScore: 70, workStyleScore: 100,
    matchReasons: ["Strong schedule overlap (7h/wk)", "Same work style preferences"],
    warnings: ["Overlapping skill sets — both do UI Design"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "both" }, { skill: "User Research", coveredBy: "both" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Marcus Lee": {
    overall: 72, scheduleScore: 70, skillScore: 80, workStyleScore: 67,
    matchReasons: ["Good schedule overlap (5h/wk)", "Complementary skills"],
    warnings: ["Different communication tools (Discord vs Slack)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "both" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Aisha Khan": {
    overall: 65, scheduleScore: 50, skillScore: 90, workStyleScore: 56,
    matchReasons: ["Strong skill complementarity", "Different strengths"],
    warnings: ["Limited schedule overlap (3h/wk)", "Different meeting style (in-person vs online)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Project Mgmt", coveredBy: "them" }, { skill: "UX Writing", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
    ],
  },
  "Lisa Wang": {
    overall: 68, scheduleScore: 60, skillScore: 75, workStyleScore: 67,
    matchReasons: ["Decent overlap (4h/wk)", "Frontend + UX Writing complement your research"],
    warnings: ["Both lack backend skills", "Different meeting frequency (2x vs 3x/wk)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "UX Writing", coveredBy: "them" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Omar Ali": {
    overall: 52, scheduleScore: 35, skillScore: 85, workStyleScore: 33,
    matchReasons: ["Project Mgmt fills a clear gap in your team"],
    warnings: ["Very limited schedule overlap (2h/wk)", "Different communication style", "Rarely active (5 days ago)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Project Mgmt", coveredBy: "them" }, { skill: "Backend", coveredBy: "gap" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
    ],
  },
  "Wei Zhang": {
    overall: 79, scheduleScore: 85, skillScore: 90, workStyleScore: 56,
    matchReasons: ["Strong schedule overlap (9h/wk)", "Full-stack covers frontend + backend gaps"],
    warnings: ["Different meeting style (in-person vs hybrid)", "Rarely active (12 days ago)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "Backend", coveredBy: "them" },
      { skill: "Data Analysis", coveredBy: "gap" }, { skill: "UX Writing", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Elena Popov": {
    overall: 63, scheduleScore: 60, skillScore: 80, workStyleScore: 44,
    matchReasons: ["Data Analysis + UX Writing complement your design skills"],
    warnings: ["Work style differences", "Different meeting frequency"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Data Analysis", coveredBy: "them" }, { skill: "UX Writing", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Backend", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Nadia Kim": {
    overall: 74, scheduleScore: 70, skillScore: 75, workStyleScore: 78,
    matchReasons: ["Good schedule overlap (6h/wk)", "UX Writing + Research complement UI skills"],
    warnings: ["Both forming groups — coordination needed"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "both" },
      { skill: "UX Writing", coveredBy: "them" }, { skill: "Frontend Dev", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Nina Okafor": {
    overall: 83, scheduleScore: 85, skillScore: 90, workStyleScore: 78,
    matchReasons: ["Strong schedule overlap (7h/wk)", "Research + Data Analysis fills key gaps", "Similar work style"],
    warnings: [],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "both" },
      { skill: "Data Analysis", coveredBy: "them" }, { skill: "Frontend Dev", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Liam Foster": {
    overall: 70, scheduleScore: 65, skillScore: 85, workStyleScore: 56,
    matchReasons: ["Backend + PM fills major team gaps"],
    warnings: ["Different meeting style (in-person vs online)", "Already forming a group"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Backend", coveredBy: "them" }, { skill: "Project Mgmt", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
    ],
  },
  "Yuki Sato": {
    overall: 66, scheduleScore: 70, skillScore: 60, workStyleScore: 67,
    matchReasons: ["Good schedule overlap (6h/wk)"],
    warnings: ["Overlapping skills — both do UI Design", "Already in a forming group"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "both" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "Backend", coveredBy: "gap" },
      { skill: "Data Analysis", coveredBy: "gap" }, { skill: "UX Writing", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Amara Diallo": {
    overall: 78, scheduleScore: 90, skillScore: 80, workStyleScore: 67,
    matchReasons: ["Excellent schedule overlap (8h/wk)", "Prototyping + Research complement design skills"],
    warnings: ["Different communication tool (Discord vs WhatsApp)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "both" },
      { skill: "Prototyping", coveredBy: "them" }, { skill: "Frontend Dev", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Ryan Mitchell": {
    overall: 58, scheduleScore: 40, skillScore: 85, workStyleScore: 44,
    matchReasons: ["Data Analysis + Backend fills technical gaps"],
    warnings: ["Limited schedule overlap (3h/wk)", "Different meeting frequency (2x vs as-needed)", "Different meeting style"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Data Analysis", coveredBy: "them" }, { skill: "Backend", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Compatibility tier styling
// ---------------------------------------------------------------------------

export const PROFILE_TIERS = {
  good: { bg: "bg-success-bg", border: "border-success-border", text: "text-success", darkText: "text-success", trackBg: "bg-success-border", label: "Excellent Match", subtitle: "" },
  normal: { bg: "bg-warning-bg", border: "border-warning-border", text: "text-warning", darkText: "text-warning", trackBg: "bg-warning-border", label: "Moderate Match", subtitle: "Some differences to discuss." },
  bad: { bg: "bg-danger-bg", border: "border-danger-border", text: "text-danger", darkText: "text-danger-dark", trackBg: "bg-danger-border", label: "Low Compatibility", subtitle: "Schedule and work style conflicts." },
} as const;

// ---------------------------------------------------------------------------
// Schedule + work-style breakdowns (mock — replaced in step E)
// ---------------------------------------------------------------------------

export const SCHEDULE_DATA: Record<
  string,
  { my: Set<string>; theirs: Set<string>; overlapHrs: number }
> = {
  "Jesse Nguyen": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Wed-1", "Tue-2"]), overlapHrs: 8 },
  "David Park": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Tue-1", "Wed-1", "Thu-2"]), overlapHrs: 6 },
  "Priya Sharma": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Tue-0", "Thu-0"]), overlapHrs: 0 },
  "Marcus Lee": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Tue-1", "Wed-1"]), overlapHrs: 5 },
  "Aisha Khan": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Fri-2"]), overlapHrs: 3 },
  "Lisa Wang": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Wed-1", "Fri-2"]), overlapHrs: 4 },
  "Omar Ali": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Thu-0", "Fri-0"]), overlapHrs: 2 },
  "Wei Zhang": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Tue-1", "Wed-1", "Thu-1", "Fri-1"]), overlapHrs: 9 },
  "Elena Popov": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-0", "Wed-1", "Fri-1"]), overlapHrs: 5 },
  "Nadia Kim": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Wed-1", "Fri-2"]), overlapHrs: 6 },
  "Nina Okafor": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Tue-1", "Wed-1", "Fri-1"]), overlapHrs: 7 },
  "Liam Foster": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Wed-2", "Fri-1"]), overlapHrs: 5 },
  "Yuki Sato": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Wed-1", "Thu-1"]), overlapHrs: 6 },
  "Amara Diallo": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Tue-1", "Wed-1", "Thu-1", "Fri-1"]), overlapHrs: 8 },
  "Ryan Mitchell": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Tue-2", "Thu-2", "Fri-1"]), overlapHrs: 3 },
};

export const WORK_STYLE_DATA: Record<
  string,
  [string, string, string, boolean][]
> = {
  "Jesse Nguyen": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Discord", true]],
  "David Park": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "Hybrid", false], ["Communication", "Discord", "Discord", true]],
  "Priya Sharma": [["Meeting frequency", "2x/wk", "1x/wk", false], ["Meeting style", "In-person", "Online", false], ["Communication", "Discord", "Discord", true]],
  "Marcus Lee": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Slack", false]],
  "Aisha Khan": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "Online", false], ["Communication", "Discord", "Email", false]],
  "Lisa Wang": [["Meeting frequency", "2x/wk", "3x/wk", false], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Discord", true]],
  "Omar Ali": [["Meeting frequency", "2x/wk", "1x/wk", false], ["Meeting style", "In-person", "Online", false], ["Communication", "Discord", "Slack", false]],
  "Wei Zhang": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "Hybrid", false], ["Communication", "Discord", "Discord", true]],
  "Elena Popov": [["Meeting frequency", "2x/wk", "3x/wk", false], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Slack", false]],
  "Nadia Kim": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Slack", false]],
  "Nina Okafor": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "WhatsApp", false]],
  "Liam Foster": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "Online", false], ["Communication", "Discord", "Discord", true]],
  "Yuki Sato": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "Hybrid", false], ["Communication", "Discord", "Discord", true]],
  "Amara Diallo": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "WhatsApp", false]],
  "Ryan Mitchell": [["Meeting frequency", "2x/wk", "As needed", false], ["Meeting style", "In-person", "Online", false], ["Communication", "Discord", "Slack", false]],
};

// ---------------------------------------------------------------------------
// Contact-status pill styling
// ---------------------------------------------------------------------------

export const CONTACT_STATUS_LABELS: Record<string, { l: string; cls: string }> = {
  "request-sent": { l: "Request Sent", cls: "bg-accent text-accent-foreground" },
  "replied": { l: "Replied", cls: "bg-primary/15 text-primary" },
  "no-response": { l: "No Response", cls: "bg-gray-100 text-gray-500" },
  "declined": { l: "Declined", cls: "bg-danger-bg text-danger" },
};

// ---------------------------------------------------------------------------
// Forming groups (mock — replaced in stage 2)
// ---------------------------------------------------------------------------

export interface FormingGroup {
  id: string;
  leaderName: string;
  leaderInit: string;
  members: { name: string; init: string; skills: string[] }[];
  maxSize: number;
  section: string;
  neededSkills: string[];
  description: string;
  applicationQuestions: string[];
}

export const FORMING_GROUPS: FormingGroup[] = [
  {
    id: "group-alpha",
    leaderName: "Aisha Khan",
    leaderInit: "AK",
    section: "203",
    members: [
      { name: "Aisha Khan", init: "AK", skills: ["Project Mgmt", "UX Writing"] },
      { name: "Nadia Kim", init: "NK", skills: ["UX Writing", "User Research"] },
    ],
    maxSize: 5,
    neededSkills: ["Backend", "Frontend Dev", "Data Analysis"],
    description: "Building an accessibility-focused study app. Looking for someone strong in backend or frontend dev.",
    applicationQuestions: [
      "What skills can you contribute?",
      "What role do you want?",
      "When are you free to work?",
    ],
  },
  {
    id: "group-beta",
    leaderName: "Chris Lee",
    leaderInit: "CL",
    section: "202",
    members: [
      { name: "Chris Lee", init: "CL", skills: ["Backend", "Data Analysis"] },
      { name: "Mia Torres", init: "MT", skills: ["UI Design"] },
      { name: "Sam Park", init: "SP", skills: ["User Research"] },
    ],
    maxSize: 5,
    neededSkills: ["Frontend Dev", "Project Mgmt"],
    description: "Working on a campus resource-sharing platform. Great schedule overlap already.",
    applicationQuestions: [
      "What skills can you contribute?",
      "What role do you want?",
      "When are you free to work?",
    ],
  },
  {
    id: "group-gamma",
    leaderName: "Liam Foster",
    leaderInit: "LF",
    section: "202",
    members: [
      { name: "Liam Foster", init: "LF", skills: ["Backend", "Project Mgmt"] },
      { name: "Yuki Sato", init: "YS", skills: ["Frontend Dev", "UI Design"] },
    ],
    maxSize: 5,
    neededSkills: ["User Research", "Data Analysis", "UX Writing"],
    description: "Building a scalable group-matching tool. Strong dev team — need research and design skills.",
    applicationQuestions: [
      "What research or design experience do you have?",
      "How do you approach user testing?",
      "What's your availability like?",
    ],
  },
];
