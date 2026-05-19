/**
 * Invite-code course-join flow.
 *
 * Two steps:
 *   0. Enter course code → look up the course.
 *   1. Confirm the matched course → call ``POST /auth/join`` (step C).
 *
 * Stays in the prototype's mock state until step C. The look-up step
 * currently advances unconditionally to a hardcoded CSC318 confirmation;
 * the real call will surface ``INVITE_CODE_NOT_FOUND`` inline.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/shared/FormField";
import { Nav } from "@/components/shared/Nav";
import type { GoProps } from "@/types/ui";

export function Join({ go }: GoProps) {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("");
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto py-14 px-6">
        <Button
          variant="ghost"
          className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm"
          onClick={() => go("dash")}
        >
          ← Back to Dashboard
        </Button>
        {step === 0 ? (
          <>
            <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
              Join a Course
            </h1>
            <p className="text-base text-gray-600 mb-9 leading-relaxed">
              Enter course code from your TA.
            </p>
            <FormField l="Course Code">
              <Input
                className="text-[22px] font-bold tracking-[6px] text-center py-[18px] h-auto"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </FormField>
            <Button
              className="w-full px-7 py-3 h-auto"
              disabled={!code.trim()}
              onClick={() => setStep(1)}
            >
              Look Up
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
              Confirm Course
            </h1>
            <p className="text-base text-gray-600 mb-9 leading-relaxed">
              Is this the right one?
            </p>
            <Card className="p-5 gap-0 shadow-none bg-gray-50">
              <div className="text-[22px] font-bold mb-1">CSC318</div>
              <div className="text-[15px] text-gray-600">
                The Design of Interactive Computational Media
              </div>
              <div className="text-sm text-gray-400 mb-3">
                Winter 2026 · University of Toronto
              </div>
              <Separator className="my-3 bg-gray-100" />
              <div className="grid grid-cols-2 gap-1.5 text-[13px] text-gray-500">
                <span>Sections: 201, 202, 203</span>
                <span>Group size: 4-6</span>
                <span>Deadline: Mar 15, 2026</span>
                <span>Code: W543M7</span>
              </div>
            </Card>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1 px-7 py-3 h-auto"
                onClick={() => setStep(0)}
              >
                Back
              </Button>
              <Button
                className="flex-1 px-7 py-3 h-auto"
                onClick={() => go("prof-0")}
              >
                Join &amp; Set Up Profile
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
