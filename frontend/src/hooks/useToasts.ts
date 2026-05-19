/**
 * State + helpers for ephemeral toast notifications.
 *
 * Pair with ``<ToastContainer>`` from
 * ``@/components/shared/Toast`` — the hook owns the list, the
 * container renders it.
 */

import { useCallback, useState } from "react";

import type { ToastEntry } from "@/components/shared/Toast";

let nextToastId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const showToast = useCallback((message: string) => {
    const id = ++nextToastId;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}
