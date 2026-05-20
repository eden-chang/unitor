/**
 * Course endpoint wrappers.
 *
 * Three read-only header lookups used by the profile wizard + Discovery
 * filter bar. All routes are course-scoped under `/courses/{id}/*` and
 * already RLS-respecting on the backend.
 */

import { apiFetch } from "@/api/client";
import type { CourseSummary } from "@/types/api";

export interface SectionRead {
  id: string;
  code: string;
}

export interface CourseSkillRead {
  id: string;
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
