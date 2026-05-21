/**
 * Group lifecycle endpoint wrappers.
 *
 * Reads of the groups feed (Discovery's Groups tab) still go through
 * `api/discovery.ts::listGroups`; this module covers the writable
 * surface that backs MyGroup and the apply flow:
 *   - createGroup / getGroup / updateGroup
 *   - applyToGroup / listApplications
 *   - acceptApplication / declineApplication
 *   - leaveGroup / confirmGroup
 */

import { apiFetch } from "@/api/client";
import type {
  ApplicationCreatePayload,
  ApplicationListResponse,
  ApplicationRead,
  GroupCreatePayload,
  GroupDetailRead,
  GroupUpdatePayload,
} from "@/types/api";

export function createGroup(payload: GroupCreatePayload): Promise<GroupDetailRead> {
  return apiFetch<GroupDetailRead>("/groups", { method: "POST", body: payload });
}

export function getGroup(groupId: string): Promise<GroupDetailRead> {
  return apiFetch<GroupDetailRead>(`/groups/${groupId}`);
}

export function updateGroup(
  groupId: string,
  payload: GroupUpdatePayload,
): Promise<GroupDetailRead> {
  return apiFetch<GroupDetailRead>(`/groups/${groupId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function applyToGroup(
  groupId: string,
  payload: ApplicationCreatePayload,
): Promise<ApplicationRead> {
  return apiFetch<ApplicationRead>(`/groups/${groupId}/apply`, {
    method: "POST",
    body: payload,
  });
}

export function listApplications(groupId: string): Promise<ApplicationListResponse> {
  return apiFetch<ApplicationListResponse>(`/groups/${groupId}/applications`);
}

export function acceptApplication(applicationId: string): Promise<ApplicationRead> {
  return apiFetch<ApplicationRead>(`/applications/${applicationId}/accept`, {
    method: "POST",
  });
}

export function declineApplication(applicationId: string): Promise<ApplicationRead> {
  return apiFetch<ApplicationRead>(`/applications/${applicationId}/decline`, {
    method: "POST",
  });
}

export function leaveGroup(groupId: string): Promise<GroupDetailRead> {
  return apiFetch<GroupDetailRead>(`/groups/${groupId}/leave`, { method: "POST" });
}

export function confirmGroup(groupId: string): Promise<GroupDetailRead> {
  return apiFetch<GroupDetailRead>(`/groups/${groupId}/confirm`, { method: "POST" });
}
