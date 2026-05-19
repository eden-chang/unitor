/**
 * Hand-typed mirrors of the backend's Pydantic shapes.
 *
 * Stage 1 convention: keep these tight against ``backend/app/schemas/*``.
 * In stage 2 we replace this file with generated types from
 * ``backend/openapi.json`` and route imports through ``packages/api-types``.
 *
 * Naming: snake_case fields, matching the wire format. The frontend doesn't
 * camel-case on the boundary — we'd rather match the API one-to-one.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface PrecheckResponse {
  on_roster: boolean;
  course_count: number;
}

export interface UserRead {
  id: string;
  primary_email: string;
  display_name: string | null;
  default_avatar_url: string | null;
}

export interface CourseSummary {
  id: string;
  code: string;
  name: string;
  semester: string;
  timezone: string;
  deadline_at: string;
}

export interface EnrollmentRead {
  id: string;
  course: CourseSummary;
  section_id: string | null;
  section_code: string | null;
  role: string;
  status: string;
  joined_at: string;
}

export interface BootstrapResponse {
  user: UserRead;
  enrollments: EnrollmentRead[];
  newly_enrolled_count: number;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export type ProficiencyLevel = "beginner" | "intermediate" | "proficient" | "expert";

export interface SkillEntry {
  course_skill_id: string;
  proficiency: ProficiencyLevel;
}

export interface SkillRead {
  id: string;
  course_skill_id: string;
  proficiency: ProficiencyLevel;
}

export interface ScheduleSlot {
  day_of_week: number; // 0..4 (Mon..Fri)
  time_band: number; // 0..3
}

export interface LinkEntry {
  label: string;
  url: string;
  display_order?: number;
}

export interface LinkRead {
  id: string;
  label: string;
  url: string;
  display_order: number;
}

export interface ProfileRead {
  id: string;
  enrollment_id: string;
  bio: string | null;
  meeting_frequency: string | null;
  meeting_style: string | null;
  comm_tool: string | null;
  comm_handle: string | null;
  avatar_url: string | null;
  schedule_flexible: boolean;
  last_active_at: string;
  created_at: string;
  updated_at: string;
  skills: SkillRead[];
  schedule_slots: ScheduleSlot[];
  links: LinkRead[];
}

export interface ProfileCreate {
  enrollment_id: string;
  bio?: string | null;
  meeting_frequency?: string | null;
  meeting_style?: string | null;
  comm_tool?: string | null;
  comm_handle?: string | null;
  schedule_flexible?: boolean;
  skills?: SkillEntry[];
  schedule_slots?: ScheduleSlot[];
  links?: LinkEntry[];
}

export interface ProfileUpdate {
  bio?: string | null;
  meeting_frequency?: string | null;
  meeting_style?: string | null;
  comm_tool?: string | null;
  comm_handle?: string | null;
  avatar_url?: string | null;
  schedule_flexible?: boolean | null;
}

export interface SkillsReplace {
  skills: SkillEntry[];
}

export interface ScheduleReplace {
  schedule_flexible: boolean;
  slots: ScheduleSlot[];
}

export interface CompletionResponse {
  is_complete: boolean;
  missing: string[];
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export type GroupStatus = "solo" | "in_group";

export interface StudentSkillRead {
  course_skill_id: string;
  proficiency: ProficiencyLevel;
}

export interface StudentScheduleSlot {
  day_of_week: number;
  time_band: number;
}

export interface StudentProfileSummary {
  id: string;
  bio: string | null;
  meeting_frequency: string | null;
  meeting_style: string | null;
  comm_tool: string | null;
  avatar_url: string | null;
  schedule_flexible: boolean;
  last_active_at: string;
  skills: StudentSkillRead[];
  schedule_slots: StudentScheduleSlot[];
}

export interface StudentListItem {
  user_id: string;
  enrollment_id: string;
  display_name: string | null;
  section_id: string | null;
  section_code: string | null;
  profile: StudentProfileSummary | null;
  group_status: GroupStatus;
  joined_at: string;
}

export interface StudentListResponse {
  items: StudentListItem[];
  next_cursor: string | null;
}

export type GroupSortableState = "forming" | "confirming" | "confirmed" | "disbanded";

export interface GroupMemberRead {
  user_id: string;
  display_name: string | null;
  role: "leader" | "member";
  joined_at: string;
}

export interface GroupApplicationQuestionRead {
  id: string;
  question_text: string;
  display_order: number;
}

export interface GroupListItem {
  id: string;
  course_id: string;
  name: string | null;
  description: string | null;
  state: GroupSortableState;
  recruiting: boolean;
  members: GroupMemberRead[];
  leader: GroupMemberRead | null;
  application_questions: GroupApplicationQuestionRead[];
  confirmation_deadline_at: string | null;
  created_at: string;
}

export interface GroupListResponse {
  items: GroupListItem[];
  next_cursor: string | null;
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

export type SkillCoverage = "you" | "them" | "both" | "gap";

export interface SkillCoverageEntry {
  skill_name: string;
  covered_by: SkillCoverage;
}

export interface CompatibilityResult {
  viewer_user_id: string;
  target_user_id: string;
  course_id: string;
  algorithm_version: number;
  overall_score: number;
  schedule_score: number;
  skill_score: number;
  work_style_score: number;
  schedule_overlap_hours: number;
  reasons: string[];
  warnings: string[];
  skill_complementarity: SkillCoverageEntry[];
  computed_at: string;
}

export interface SkippedTarget {
  target_user_id: string;
  reason: "viewer_profile_incomplete" | "target_profile_incomplete";
}

export interface CompatibilityBatchRequest {
  course_id: string;
  target_user_ids: string[];
}

export interface CompatibilityBatchResponse {
  items: CompatibilityResult[];
  skipped: SkippedTarget[];
}
