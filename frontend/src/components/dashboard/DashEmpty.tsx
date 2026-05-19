/**
 * Dashboard shown right after sign-up before the student joins any
 * course. CTA points at the Join Course flow.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/shared/icons";
import { Nav } from "@/components/shared/Nav";
import type { GoProps } from "@/types/ui";

export function DashEmpty({ go }: GoProps) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[680px] mx-auto py-14 px-6">
        <div className="flex justify-between items-center mb-7">
          <div>
            <div className="text-sm text-gray-500 mb-0.5">Welcome back,</div>
            <h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">
              My Courses
            </h1>
          </div>
          <Button size="sm" className="px-4" onClick={() => go("join")}>
            + Join a Course
          </Button>
        </div>
        <Card className="py-[52px] px-6 mb-3.5 gap-0 shadow-none text-center border-dashed border-gray-300">
          <div className="mb-3 flex justify-center">
            <Icon.books size={36} />
          </div>
          <p className="text-[15px] text-gray-500 mb-4">No courses yet.</p>
          <Button
            variant="outline"
            size="sm"
            className="px-4 mx-auto"
            onClick={() => go("join")}
          >
            Join your first course
          </Button>
        </Card>
      </div>
    </div>
  );
}
