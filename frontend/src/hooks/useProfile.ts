/**
 * React-Query bindings for the profile endpoints.
 *
 * Reads:
 *   - `useMyProfile(courseId)` — `GET /profiles/me/{course_id}`. The
 *     404 PROFILE_NOT_FOUND case is *expected* before the wizard runs,
 *     so we swallow it into `{ data: null }` instead of bubbling.
 *
 * Mutations (return the same shape as the underlying wrappers; invalidate
 * the profile + bootstrap queries so dependent screens refetch):
 *   - `useCreateProfile`
 *   - `useUpdateProfile`
 *   - `useReplaceSkills`
 *   - `useReplaceSchedule`
 *   - `useCheckCompletion`
 *
 * Keep this thin — anything page-specific belongs in the component, not
 * here. The hooks are colocated to give the wizard + edit page a single
 * import surface.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import * as apiProfile from "@/api/profile";
import { ApiError } from "@/api/client";
import type {
  CompletionResponse,
  ProfileCreate,
  ProfileRead,
  ProfileUpdate,
  ScheduleReplace,
  ScheduleSlot,
  SkillRead,
  SkillsReplace,
} from "@/types/api";

export const profileKeys = {
  all: ["profile"] as const,
  myByCourse: (courseId: string) => ["profile", "me", courseId] as const,
  byId: (profileId: string) => ["profile", "byId", profileId] as const,
};

/**
 * Wraps `getMyProfile` so the "no profile yet" 404 resolves to `null`
 * instead of becoming an error. Callers branch on `data === null`.
 */
export function useMyProfile(
  courseId: string | undefined,
): UseQueryResult<ProfileRead | null, ApiError> {
  return useQuery<ProfileRead | null, ApiError>({
    queryKey: courseId ? profileKeys.myByCourse(courseId) : ["profile", "me", "none"],
    enabled: !!courseId,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        return await apiProfile.getMyProfile(courseId as string);
      } catch (e) {
        if (e instanceof ApiError && e.code === "PROFILE_NOT_FOUND") {
          return null;
        }
        throw e;
      }
    },
  });
}

export function useCreateProfile(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<ProfileRead, ApiError, ProfileCreate>({
    mutationFn: (payload) => apiProfile.createProfile(payload),
    onSuccess: (data) => {
      if (courseId) {
        qc.setQueryData(profileKeys.myByCourse(courseId), data);
      }
      void qc.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export function useUpdateProfile(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<ProfileRead, ApiError, { profileId: string; payload: ProfileUpdate }>(
    {
      mutationFn: ({ profileId, payload }) => apiProfile.updateProfile(profileId, payload),
      onSuccess: (data) => {
        if (courseId) {
          qc.setQueryData(profileKeys.myByCourse(courseId), data);
        }
        void qc.invalidateQueries({ queryKey: profileKeys.all });
      },
    },
  );
}

export function useReplaceSkills(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<SkillRead[], ApiError, { profileId: string; payload: SkillsReplace }>(
    {
      mutationFn: ({ profileId, payload }) => apiProfile.replaceSkills(profileId, payload),
      onSuccess: () => {
        if (courseId) {
          void qc.invalidateQueries({ queryKey: profileKeys.myByCourse(courseId) });
        }
      },
    },
  );
}

export function useReplaceSchedule(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<
    ScheduleSlot[],
    ApiError,
    { profileId: string; payload: ScheduleReplace }
  >({
    mutationFn: ({ profileId, payload }) => apiProfile.replaceSchedule(profileId, payload),
    onSuccess: () => {
      if (courseId) {
        void qc.invalidateQueries({ queryKey: profileKeys.myByCourse(courseId) });
      }
    },
  });
}

export function useCheckCompletion() {
  return useMutation<CompletionResponse, ApiError, string>({
    mutationFn: (profileId) => apiProfile.checkCompletion(profileId),
  });
}
