/**
 * Compatibility endpoint wrapper.
 *
 * Single call: ``POST /api/v1/compatibility/batch``. Returns scores for
 * every target whose profile is complete; targets without a profile
 * land in ``skipped``.
 */

import { apiFetch } from "@/api/client";
import type {
  CompatibilityBatchRequest,
  CompatibilityBatchResponse,
} from "@/types/api";

export function batchCompatibility(
  payload: CompatibilityBatchRequest,
): Promise<CompatibilityBatchResponse> {
  return apiFetch<CompatibilityBatchResponse>("/compatibility/batch", {
    method: "POST",
    body: payload,
  });
}
