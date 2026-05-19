/**
 * Centered modal for destructive confirmations.
 *
 * Used by "Leave Group", "Disband Group", "Hide Student", etc. The
 * confirm button is always destructive (red) — for non-destructive
 * choices the prototype uses inline UI rather than this dialog.
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-6">
      <div className="bg-white rounded-[12px] p-6 w-full max-w-[400px] shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        <h2 className="text-[18px] font-semibold text-[#111827] mb-2">{title}</h2>
        <p className="text-[14px] text-[#374151] mb-5 leading-relaxed">{body}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[14px] hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-[8px] bg-[#DC2626] text-white text-[14px] font-medium hover:bg-[#B91C1C] cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
