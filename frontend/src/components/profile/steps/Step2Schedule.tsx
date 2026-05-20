/**
 * Profile wizard step 2 — section (read-only) + availability grid.
 *
 * Section is pulled off the user's first enrollment (TA-assigned via
 * the roster). The schedule grid + "flexible" checkbox persist into
 * wizard state for step 3 to submit.
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Nav } from "@/components/shared/Nav";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";
import { useAuth } from "@/context/auth-context";
import { useWizardState } from "@/hooks/useWizardState";
import type { GoProps } from "@/types/ui";

export function Step2Schedule({ go }: GoProps) {
  const { enrollments } = useAuth();
  const sectionCode = enrollments[0]?.section_code ?? null;
  const {
    scheduleCells,
    setScheduleCells,
    scheduleFlexible,
    setScheduleFlexible,
  } = useWizardState();

  const sel = new Set(scheduleCells);
  const setSel = (next: Set<string>) => setScheduleCells([...next]);

  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav
        go={go}
        right={
          <span className="text-[13px] text-gray-500 leading-relaxed">
            CSC318 · Profile
          </span>
        }
      />
      <div className="max-w-[680px] mx-auto py-14 px-6">
        <Button
          variant="ghost"
          className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm"
          onClick={() => go("prof-1")}
        >
          ← Back
        </Button>
        <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">
          Step 3 of 4
        </div>
        <Progress
          value={(3 / 4) * 100}
          className="h-[3px] bg-gray-100 rounded-sm mb-8"
        />
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Section &amp; Schedule
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          For matching compatible schedules.
        </p>
        <div className="mb-[18px]">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Your Section
          </Label>
          <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
            <span className="text-sm font-medium">
              {sectionCode ?? "Not assigned yet"}
            </span>
            <span className="text-[11px] text-gray-400 ml-auto">
              Pre-filled from enrollment
            </span>
          </div>
        </div>
        <p className="text-[13px] text-gray-500 mb-3">
          Click or drag to select available times.
        </p>
        <ScheduleGrid
          sel={sel}
          set={setSel}
          label="When can you work on the project?"
          disabled={scheduleFlexible}
        />
        <label className="flex items-center gap-2 -mt-4 mb-7 cursor-pointer">
          <Checkbox
            checked={scheduleFlexible}
            onCheckedChange={(v) => setScheduleFlexible(v === true)}
          />
          <span className="text-[13px] text-gray-600">Flexible / Not sure</span>
        </label>
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={!scheduleFlexible && scheduleCells.length === 0}
          onClick={() => go("prof-3")}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
