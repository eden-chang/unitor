/**
 * Bulk-clear all Unitor localStorage keys.
 *
 * Used by the demo bar (Ctrl+D → Reset) so we don't accidentally drop
 * unrelated keys from other apps.
 */

import { LS_PREFIX } from "@/hooks/useLocalStorage";

export function clearAllLocalStorage(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX));
  keys.forEach((k) => {
    localStorage.removeItem(k);
  });
}
