/**
 * Profile wizard step 1 — pick at least 2 skills with proficiency.
 *
 * Skill catalog is mock for now. Step D wires this to
 * ``GET /api/v1/courses/{course_id}/skills``.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Nav } from "@/components/shared/Nav";
import { cn } from "@/lib/utils";
import type { GoProps } from "@/types/ui";

export function Step1Skills({ go }: GoProps) {
  const pre = [
    "UI Design",
    "Frontend Dev",
    "Backend",
    "User Research",
    "Prototyping",
    "Data Analysis",
    "UX Writing",
    "Project Mgmt",
  ];
  const [sel, setSel] = useState<string[]>([]);
  const [rat, setRat] = useState<Record<string, string>>({});
  const lvl = ["Beginner", "Intermediate", "Proficient", "Expert"];
  const tog = (sk: string) => {
    if (sel.includes(sk)) {
      setSel(sel.filter((x) => x !== sk));
      const r = { ...rat };
      delete r[sk];
      setRat(r);
    } else {
      setSel([...sel, sk]);
      setRat({ ...rat, [sk]: "Intermediate" });
    }
  };
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
          onClick={() => go("prof-0")}
        >
          ← Back
        </Button>
        <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">
          Step 2 of 4
        </div>
        <Progress
          value={(2 / 4) * 100}
          className="h-[3px] bg-gray-100 rounded-sm mb-8"
        />
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Your Skills
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          Select at least 2 skills.
        </p>
        <div className="mb-5">
          {pre.map((sk) => (
            <button
              key={sk}
              type="button"
              aria-pressed={sel.includes(sk)}
              className={cn(
                "inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] transition-colors",
                sel.includes(sk)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300",
              )}
              onClick={() => tog(sk)}
            >
              {sk}
            </button>
          ))}
          <button
            type="button"
            className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-gray-100 text-gray-600 border-gray-200 border-dashed"
          >
            + Custom
          </button>
        </div>
        {sel.length > 0 && (
          <Card className="p-0 mb-6 gap-0 shadow-none overflow-hidden">
            {sel.map((sk, i) => (
              <div
                key={sk}
                className={cn(
                  "flex justify-between items-center px-5 py-3",
                  i < sel.length - 1 && "border-b border-gray-100",
                )}
              >
                <span className="text-sm font-medium">{sk}</span>
                <div className="flex gap-1">
                  {lvl.map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={rat[sk] === l}
                      className={cn(
                        "py-1 px-2.5 rounded-md text-xs font-medium cursor-pointer transition-colors",
                        rat[sk] === l
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                      )}
                      onClick={() => setRat({ ...rat, [sk]: l })}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        )}
        {sel.length < 2 && sel.length > 0 && (
          <p className="text-[13px] text-danger mb-3">Select at least one more skill.</p>
        )}
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={sel.length < 2}
          onClick={() => go("prof-2")}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
