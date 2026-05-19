/**
 * Weekday × time-band drag-to-select grid.
 *
 * Used by the profile onboarding wizard (Prof2) and the profile-edit
 * page. The grid is purely visual — the set of keys (e.g. ``"Mon-1"``)
 * is converted to ``ScheduleSlot[]`` by the calling page before being
 * POSTed to the backend in step D.
 *
 * Renamed from the prototype's ``TGrid``.
 */

import { Fragment, useRef, useState } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ScheduleGridProps {
  sel: Set<string>;
  set: (s: Set<string>) => void;
  label: string;
  disabled?: boolean;
}

export function ScheduleGrid({ sel, set, label, disabled = false }: ScheduleGridProps) {
  const ds = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const ts = ["9am-12pm", "12-4pm", "4-8pm", "8-11pm"];
  const dragging = useRef(false);
  const didDragMultiple = useRef(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  const startDrag = (k: string) => {
    if (disabled) return;
    dragging.current = true;
    didDragMultiple.current = false;
    const mode = sel.has(k) ? "remove" : "add";
    setDragMode(mode);
    const n = new Set(sel);
    if (mode === "add") n.add(k);
    else n.delete(k);
    set(n);
  };

  const enterDrag = (k: string) => {
    if (!dragging.current || disabled) return;
    didDragMultiple.current = true;
    const n = new Set(sel);
    if (dragMode === "add") n.add(k);
    else n.delete(k);
    set(n);
  };

  const stopDrag = () => {
    dragging.current = false;
  };

  return (
    <div
      className={cn("mb-7", disabled && "opacity-40")}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
        {label}
      </Label>
      <div
        className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]"
        style={{ userSelect: "none" }}
      >
        <div />
        {ds.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">
            {d}
          </div>
        ))}
        {ts.map((t, ti) => (
          <Fragment key={ti}>
            <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
            {ds.map((d) => {
              const k = `${d}-${ti}`;
              return (
                <button
                  key={k}
                  type="button"
                  role="checkbox"
                  aria-checked={sel.has(k)}
                  aria-label={`${d} ${t}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startDrag(k);
                  }}
                  onMouseEnter={() => enterDrag(k)}
                  className={cn(
                    "py-2.5 px-1 text-center rounded-md text-xs font-medium transition-colors border",
                    disabled ? "pointer-events-none cursor-default" : "cursor-pointer",
                    sel.has(k)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:border-gray-300",
                  )}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
