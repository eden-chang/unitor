/**
 * Profile endpoint wrappers.
 *
 * Routes are nested under ``/profiles`` and ``/profiles/me``. All require
 * authentication; RLS limits writes to the owner.
 */

import { apiFetch } from "@/api/client";
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

/**
 * Fetch the caller's profile for ``course_id``.
 *
 * Note: 404 PROFILE_NOT_FOUND is the legitimate "no profile yet" signal —
 * callers should branch on ``ApiError.code`` rather than treating 404 as
 * a hard failure. We let the error bubble; converting it to ``null``
 * here would hide other failure modes.
 */
export function getMyProfile(courseId: string): Promise<ProfileRead> {
  return apiFetch<ProfileRead>(`/profiles/me/${courseId}`);
}

export function getProfile(profileId: string): Promise<ProfileRead> {
  return apiFetch<ProfileRead>(`/profiles/${profileId}`);
}

export function createProfile(payload: ProfileCreate): Promise<ProfileRead> {
  return apiFetch<ProfileRead>("/profiles", { method: "POST", body: payload });
}

export function updateProfile(profileId: string, payload: ProfileUpdate): Promise<ProfileRead> {
  return apiFetch<ProfileRead>(`/profiles/${profileId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function replaceSkills(profileId: string, payload: SkillsReplace): Promise<SkillRead[]> {
  return apiFetch<SkillRead[]>(`/profiles/${profileId}/skills`, {
    method: "PUT",
    body: payload,
  });
}

export function replaceSchedule(
  profileId: string,
  payload: ScheduleReplace,
): Promise<ScheduleSlot[]> {
  return apiFetch<ScheduleSlot[]>(`/profiles/${profileId}/schedule`, {
    method: "PUT",
    body: payload,
  });
}

export function checkCompletion(profileId: string): Promise<CompletionResponse> {
  return apiFetch<CompletionResponse>(`/profiles/${profileId}/complete`, {
    method: "POST",
  });
}

export function deleteProfile(profileId: string): Promise<void> {
  return apiFetch<void>(`/profiles/${profileId}`, { method: "DELETE" });
}
