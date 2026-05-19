/**
 * Discovery endpoint wrappers.
 *
 * Both endpoints are course-scoped reads under ``user_session`` — RLS
 * already filters to courses the caller is enrolled in.
 */

import { apiFetch } from "@/api/client";
import type {
  GroupListResponse,
  GroupSortableState,
  StudentListResponse,
} from "@/types/api";

export interface ListStudentsParams {
  section_id?: string;
  skill_id?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export function listStudents(
  courseId: string,
  params: ListStudentsParams = {},
): Promise<StudentListResponse> {
  return apiFetch<StudentListResponse>(`/courses/${courseId}/students`, {
    query: params,
  });
}

export interface ListGroupsParams {
  section_id?: string;
  recruiting_only?: boolean;
  state?: GroupSortableState[];
  cursor?: string;
  limit?: number;
}

export function listGroups(
  courseId: string,
  params: ListGroupsParams = {},
): Promise<GroupListResponse> {
  // ``state`` is a multi-value query param. Our client serializer turns
  // an array into repeated ``state=foo&state=bar`` automatically via the
  // underlying ``URLSearchParams.append`` calls.
  const flat: Record<string, string | number | boolean | undefined | null> = {
    section_id: params.section_id,
    recruiting_only: params.recruiting_only,
    cursor: params.cursor,
    limit: params.limit,
  };
  // Compose URL manually for the array case so we can append each state.
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(flat)) {
    if (v === undefined || v === null) continue;
    search.append(k, String(v));
  }
  for (const s of params.state ?? []) {
    search.append("state", s);
  }
  const qs = search.toString();
  const suffix = qs ? `?${qs}` : "";
  return apiFetch<GroupListResponse>(`/courses/${courseId}/groups${suffix}`);
}
