/**
 * React-Query bindings for the groups domain.
 *
 * Reads:
 *   - `useGroupsList(courseId, filters)` — Discovery groups feed.
 *   - `useGroup(groupId)` — full detail (MyGroup + Discovery panel).
 *   - `useMyGroup(courseId)` — derives from `useGroupsList`:
 *     returns the group the caller is currently a member of (or null).
 *   - `useGroupApplications(groupId)` — leader-only list.
 *
 * Mutations (all invalidate the relevant keys on success):
 *   - `useCreateGroup`
 *   - `useUpdateGroup`
 *   - `useApplyToGroup`
 *   - `useAcceptApplication` / `useDeclineApplication`
 *   - `useLeaveGroup`
 *   - `useConfirmGroup`
 *
 * Keep cache invalidation co-located with the mutation that caused it.
 * After accept, for example, both the group detail and the application
 * list flip — the mutation handles both keys without callers needing
 * to remember.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import * as apiDiscovery from "@/api/discovery";
import * as apiGroups from "@/api/groups";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/auth-context";
import type {
  ApplicationCreatePayload,
  ApplicationListResponse,
  ApplicationRead,
  GroupCreatePayload,
  GroupDetailRead,
  GroupListResponse,
  GroupUpdatePayload,
} from "@/types/api";

export const groupKeys = {
  all: ["groups"] as const,
  list: (courseId: string | undefined, filters?: GroupsListFilters) =>
    ["groups", "list", courseId, filters?.section_id ?? null, filters?.recruiting ?? null] as const,
  detail: (groupId: string) => ["groups", "detail", groupId] as const,
  applications: (groupId: string) => ["groups", "applications", groupId] as const,
};

export interface GroupsListFilters {
  section_id?: string;
  recruiting?: boolean;
}

export function useGroupsList(
  courseId: string | undefined,
  filters: GroupsListFilters = {},
): UseQueryResult<GroupListResponse, ApiError> {
  return useQuery<GroupListResponse, ApiError>({
    queryKey: groupKeys.list(courseId, filters),
    enabled: !!courseId,
    staleTime: 30_000,
    queryFn: () =>
      apiDiscovery.listGroups(courseId as string, {
        section_id: filters.section_id,
        recruiting_only: filters.recruiting,
      }),
  });
}

export function useGroup(
  groupId: string | undefined,
): UseQueryResult<GroupDetailRead, ApiError> {
  return useQuery<GroupDetailRead, ApiError>({
    queryKey: groupId ? groupKeys.detail(groupId) : ["groups", "detail", "none"],
    enabled: !!groupId,
    staleTime: 30_000,
    queryFn: () => apiGroups.getGroup(groupId as string),
  });
}

/**
 * Returns the group the caller is an active member of for the given
 * course, or `null` if they aren't in one.
 *
 * Lives on top of `useGroupsList` rather than a dedicated endpoint —
 * the list already returns the membership, so we filter locally.
 * If the list ever grows past one page we'll add a dedicated
 * `/groups/mine` endpoint; for stage 2 the list is small enough.
 */
export function useMyGroup(
  courseId: string | undefined,
): UseQueryResult<GroupDetailRead | null, ApiError> & { myGroupId: string | undefined } {
  const { user } = useAuth();
  const listQuery = useGroupsList(courseId, {});
  const myGroupId = listQuery.data?.items.find((g) =>
    g.members.some((m) => m.user_id === user?.id),
  )?.id;
  const detailQuery = useGroup(myGroupId);

  // The hook returns the same shape as `useQuery` so callers can branch
  // on `.data === null`. When the list is loading or the user isn't in
  // any group, `data` is null.
  const combined = {
    ...detailQuery,
    data: myGroupId ? detailQuery.data ?? null : null,
    isLoading: listQuery.isLoading || (myGroupId !== undefined && detailQuery.isLoading),
    error: listQuery.error ?? detailQuery.error,
  } as UseQueryResult<GroupDetailRead | null, ApiError> & { myGroupId: string | undefined };
  combined.myGroupId = myGroupId;
  return combined;
}

export function useGroupApplications(
  groupId: string | undefined,
  enabled = true,
): UseQueryResult<ApplicationListResponse, ApiError> {
  return useQuery<ApplicationListResponse, ApiError>({
    queryKey: groupId
      ? groupKeys.applications(groupId)
      : ["groups", "applications", "none"],
    enabled: !!groupId && enabled,
    staleTime: 30_000,
    queryFn: () => apiGroups.listApplications(groupId as string),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateGroup(): UseMutationResult<
  GroupDetailRead,
  ApiError,
  GroupCreatePayload
> {
  const qc = useQueryClient();
  return useMutation<GroupDetailRead, ApiError, GroupCreatePayload>({
    mutationFn: (payload) => apiGroups.createGroup(payload),
    onSuccess: (data) => {
      qc.setQueryData(groupKeys.detail(data.id), data);
      void qc.invalidateQueries({ queryKey: ["groups", "list"] });
    },
  });
}

export function useUpdateGroup(
  groupId: string | undefined,
): UseMutationResult<GroupDetailRead, ApiError, GroupUpdatePayload> {
  const qc = useQueryClient();
  return useMutation<GroupDetailRead, ApiError, GroupUpdatePayload>({
    mutationFn: (payload) => apiGroups.updateGroup(groupId as string, payload),
    onSuccess: (data) => {
      qc.setQueryData(groupKeys.detail(data.id), data);
      void qc.invalidateQueries({ queryKey: ["groups", "list"] });
    },
  });
}

export function useApplyToGroup(
  groupId: string | undefined,
): UseMutationResult<ApplicationRead, ApiError, ApplicationCreatePayload> {
  const qc = useQueryClient();
  return useMutation<ApplicationRead, ApiError, ApplicationCreatePayload>({
    mutationFn: (payload) => apiGroups.applyToGroup(groupId as string, payload),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: groupKeys.applications(data.group_id) });
      // The group detail list doesn't change on apply, so no list invalidation.
    },
  });
}

export function useAcceptApplication(
  groupId: string | undefined,
): UseMutationResult<ApplicationRead, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<ApplicationRead, ApiError, string>({
    mutationFn: (applicationId) => apiGroups.acceptApplication(applicationId),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: groupKeys.applications(data.group_id) });
      void qc.invalidateQueries({ queryKey: groupKeys.detail(data.group_id) });
      // Accept side-effects: a new membership row exists, so the list feed
      // changes too.
      void qc.invalidateQueries({ queryKey: ["groups", "list"] });
      // And the new member's "my applications elsewhere" auto-withdraw
      // means we can't trust those caches either.
      void qc.invalidateQueries({ queryKey: ["applications"] });
      void groupId; // suppress unused-param warning; kept for future fanout
    },
  });
}

export function useDeclineApplication(
  groupId: string | undefined,
): UseMutationResult<ApplicationRead, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<ApplicationRead, ApiError, string>({
    mutationFn: (applicationId) => apiGroups.declineApplication(applicationId),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: groupKeys.applications(data.group_id) });
      void groupId;
    },
  });
}

export function useLeaveGroup(): UseMutationResult<GroupDetailRead, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<GroupDetailRead, ApiError, string>({
    mutationFn: (groupId) => apiGroups.leaveGroup(groupId),
    onSuccess: (data) => {
      qc.setQueryData(groupKeys.detail(data.id), data);
      void qc.invalidateQueries({ queryKey: ["groups", "list"] });
    },
  });
}

export function useConfirmGroup(): UseMutationResult<GroupDetailRead, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<GroupDetailRead, ApiError, string>({
    mutationFn: (groupId) => apiGroups.confirmGroup(groupId),
    onSuccess: (data) => {
      qc.setQueryData(groupKeys.detail(data.id), data);
      void qc.invalidateQueries({ queryKey: ["groups", "list"] });
    },
  });
}
