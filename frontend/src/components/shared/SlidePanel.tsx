/**
 * Right-side sliding overlay used by Discovery and MyGroup for detail
 * panels (student profile, group detail, received request, etc.).
 *
 * Always slides in from the right at 480px wide (95vw on small screens).
 * The header has a ``title`` + close button; an optional ``footer`` is
 * pinned to the bottom and doesn't scroll.
 */

import type { ReactNode } from "react";

import { Icon } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  title?: string;
}

export function SlidePanel({
  open,
  onClose,
  children,
  footer,
  title = "Details",
}: SlidePanelProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-foreground/20 z-[150]" onClick={onClose} />
      )}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[480px] max-w-[95vw] bg-background border-l border-border z-[160]",
          "flex flex-col overflow-hidden",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between h-14 px-5 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-gray-600">{title}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 leading-none"
          >
            <Icon.x size={18} color="#9CA3AF" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </>
  );
}
