/**
 * Role selector — student vs. TA/instructor.
 *
 * Routes to ``signup-s`` or ``signup-t`` so the next screen can adapt
 * its copy. Once magic-link auth lands in step C this whole page may
 * collapse into the email entry (single role per email domain), but
 * for now it keeps the prototype's two-track UX.
 */

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/shared/icons";
import { Nav } from "@/components/shared/Nav";
import type { GoProps } from "@/types/ui";

export function SignupRole({ go }: GoProps) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto py-14 px-6">
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Join unitor
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          How will you use unitor?
        </p>
        {[
          {
            i: <Icon.graduation size={24} />,
            t: "Student",
            d: "Find and join project groups",
            to: "signup-s",
          },
          {
            i: <Icon.clipboard size={24} />,
            t: "TA / Instructor",
            d: "Create courses and manage groups",
            to: "signup-t",
          },
        ].map((r) => (
          <Card
            key={r.t}
            className="p-5 mb-3.5 shadow-none cursor-pointer flex-row items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-colors"
            onClick={() => go(r.to)}
          >
            <div className="w-[50px] h-[50px] rounded-xl bg-gray-50 flex items-center justify-center">
              {r.i}
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold">{r.t}</div>
              <div className="text-sm text-gray-500">{r.d}</div>
            </div>
            <span className="text-gray-300 text-lg">→</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
