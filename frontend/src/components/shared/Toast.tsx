/**
 * Toast container.
 *
 * Stage-1 prototype scope: ephemeral notifications fired by user actions
 * (e.g. "Copied to clipboard"). Persistent / inbox-style notifications
 * are handled by ``NotificationBell``; toasts auto-dismiss after 3s.
 *
 * Pair with the ``useToasts`` hook from ``@/hooks/useToasts`` — the
 * hook owns the list, this component renders it.
 */

export interface ToastEntry {
  id: number;
  message: string;
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastEntry[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[500] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-foreground text-background px-5 py-3 rounded-xl shadow-lg text-[14px] font-medium animate-[fadeIn_0.3s_ease] cursor-pointer"
          onClick={() => onRemove(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
