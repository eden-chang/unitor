/**
 * Discovery board data composition.
 *
 * Two queries fire per filter change:
 *   1. `GET /courses/{id}/students?…` — paginated via `useInfiniteQuery`
 *      so "Load more" just appends a page.
 *   2. `POST /compatibility/batch` — scores for the union of user_ids
 *      across all loaded pages. The query key includes the sorted id
 *      list so paginating in invalidates the missing-scores window.
 *
 * `useDiscoveryStudents` returns the merged list (StudentListItem +
 * optional CompatibilityResult + skipped-reason) plus a flag for
 * the viewer-incomplete profile case so the page can surface a banner.
 */

import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import * as apiDiscovery from "@/api/discovery";
import * as apiCompat from "@/api/compatibility";
import { ApiError } from "@/api/client";
import type {
  CompatibilityBatchResponse,
  CompatibilityResult,
  StudentListItem,
  StudentListResponse,
} from "@/types/api";

const PAGE_SIZE = 24;

export interface DiscoveryFilters {
  section_id?: string;
  skill_id?: string;
  search?: string;
}

export interface MergedStudent extends StudentListItem {
  score: CompatibilityResult | null;
  /** Reason if compatibility was skipped (viewer or target incomplete). */
  skipped_reason: "viewer_profile_incomplete" | "target_profile_incomplete" | null;
}

export interface UseDiscoveryStudentsResult {
  items: MergedStudent[];
  isLoading: boolean;
  isFetchingMore: boolean;
  error: ApiError | null;
  viewerProfileIncomplete: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function useDiscoveryStudents(
  courseId: string | undefined,
  filters: DiscoveryFilters,
): UseDiscoveryStudentsResult {
  const studentsQuery = useInfiniteQuery<
    StudentListResponse,
    ApiError,
    { pages: StudentListResponse[]; pageParams: (string | null)[] },
    readonly [string, string | undefined, string | null, string | null, string | null],
    string | null
  >({
    queryKey: [
      "students",
      courseId,
      filters.section_id ?? null,
      filters.skill_id ?? null,
      filters.search ?? null,
    ],
    enabled: !!courseId,
    initialPageParam: null,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: ({ pageParam }) =>
      apiDiscovery.listStudents(courseId as string, {
        section_id: filters.section_id,
        skill_id: filters.skill_id,
        search: filters.search,
        cursor: pageParam ?? undefined,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? null,
  });

  const items: StudentListItem[] = useMemo(
    () => studentsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [studentsQuery.data],
  );

  // Sort ids so the cache key is order-insensitive — paginating shouldn't
  // refetch a key that's only changed by the order of incoming items.
  const sortedIds = useMemo(() => [...items.map((s) => s.user_id)].sort(), [items]);

  const batchQuery = useQuery<CompatibilityBatchResponse, ApiError>({
    queryKey: ["compatibility-batch", courseId, sortedIds.join(",")],
    enabled: !!courseId && sortedIds.length > 0,
    staleTime: 60_000,
    queryFn: () =>
      apiCompat.batchCompatibility({
        course_id: courseId as string,
        target_user_ids: sortedIds,
      }),
  });

  const viewerProfileIncomplete =
    batchQuery.error instanceof ApiError && batchQuery.error.code === "PROFILE_INCOMPLETE";

  const merged: MergedStudent[] = useMemo(() => {
    const scoreById = new Map<string, CompatibilityResult>();
    const skipById = new Map<string, MergedStudent["skipped_reason"]>();
    if (batchQuery.data) {
      for (const r of batchQuery.data.items) {
        scoreById.set(r.target_user_id, r);
      }
      for (const s of batchQuery.data.skipped) {
        skipById.set(s.target_user_id, s.reason);
      }
    }
    return items.map((s) => ({
      ...s,
      score: scoreById.get(s.user_id) ?? null,
      skipped_reason: skipById.get(s.user_id) ?? null,
    }));
  }, [items, batchQuery.data]);

  const error =
    (studentsQuery.error instanceof ApiError ? studentsQuery.error : null) ??
    (batchQuery.error instanceof ApiError && !viewerProfileIncomplete
      ? batchQuery.error
      : null);

  return {
    items: merged,
    isLoading: studentsQuery.isLoading,
    isFetchingMore: studentsQuery.isFetchingNextPage,
    error,
    viewerProfileIncomplete,
    hasMore: studentsQuery.hasNextPage,
    loadMore: () => {
      if (studentsQuery.hasNextPage && !studentsQuery.isFetchingNextPage) {
        void studentsQuery.fetchNextPage();
      }
    },
  };
}
