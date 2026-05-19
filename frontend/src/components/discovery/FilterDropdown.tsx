/**
 * Small pill-shaped dropdown trigger used by Discovery's filter bar.
 *
 * The dropdown content is whatever the caller passes as ``children``;
 * this component only owns the open/active styling and the backdrop
 * click-to-close.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FilterDropdownProps {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function FilterDropdown({
  label,
  active,
  open,
  onToggle,
  onClose,
  children,
}: FilterDropdownProps) {
  return (
    <div className="relative shrink-0">
      {open && <div className="fixed inset-0 z-[190]" onClick={onClose} />}
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 h-[34px] px-[14px] rounded-[20px] text-[13px] border transition-colors cursor-pointer whitespace-nowrap",
          active
            ? "bg-[#9652ca]/10 border-[#9652ca] text-[#9652ca]"
            : "bg-white border-[#D1D5DB] text-[#374151] hover:border-gray-400",
        )}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M1 3l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-white border border-border rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-[200] overflow-hidden w-[200px]">
          {children}
        </div>
      )}
    </div>
  );
}
