/**
 * Persisted ``useState`` backed by ``localStorage``.
 *
 * All Unitor keys are namespaced under ``unitor_`` so we can clear our
 * own state without trampling unrelated apps in dev. The hook silently
 * swallows storage errors (corrupt JSON, quota exceeded) so it never
 * blocks rendering.
 */

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export const LS_PREFIX = "unitor_";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const fullKey = LS_PREFIX + key;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      /* corrupt data — fall through to default */
    }
    return typeof defaultValue === "function" ? (defaultValue as () => T)() : defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [fullKey, value]);

  return [value, setValue];
}
