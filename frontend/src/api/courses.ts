/**
 * Course endpoint wrappers.
 *
 * NOTE: these endpoints don't exist on the backend yet — they're added
 * in step D of stage 1. Calls will fail with 404 until then. We declare
 * the wrappers now so the rest of step A can compile against them.
 */

import { apiFetch } from "@/api/client";
import type { CourseSummary } from "@/types/api";

export interface SectionRead {
  id: string;
  course_id: string;
  code: string;
}

export interface CourseSkillRead {
  id: string;
  course_id: string;
  skill_name: string;
  display_order: number;
}

export function getCourse(courseId: string): Promise<CourseSummary> {
  return apiFetch<CourseSummary>(`/courses/${courseId}`);
}

export function listSections(courseId: string): Promise<SectionRead[]> {
  return apiFetch<SectionRead[]>(`/courses/${courseId}/sections`);
}

export function listCourseSkills(courseId: string): Promise<CourseSkillRead[]> {
  return apiFetch<CourseSkillRead[]>(`/courses/${courseId}/skills`);
}
