/**
 * React-Query binding for `GET /courses/{id}/skills`.
 *
 * The skill catalog rarely changes within a session — TAs edit it once
 * at course-setup time. Treat it as effectively immutable for the
 * lifetime of the tab.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import * as apiCourses from "@/api/courses";
import type { ApiError } from "@/api/client";

export function useCourseSkills(
  courseId: string | undefined,
): UseQueryResult<apiCourses.CourseSkillRead[], ApiError> {
  return useQuery<apiCourses.CourseSkillRead[], ApiError>({
    queryKey: ["courses", courseId, "skills"],
    enabled: !!courseId,
    staleTime: Infinity,
    queryFn: () => apiCourses.listCourseSkills(courseId as string),
  });
}
