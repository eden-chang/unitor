/**
 * Dashboard after the student has at least one enrollment.
 *
 * Shows one card per active course (currently hardcoded to CSC318;
 * step C wires this to the real ``bootstrap().enrollments`` list).
 * Clicking the card opens that course's Discovery board.
 */

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Nav } from "@/components/shared/Nav";
import { getInitials } from "@/lib/avatar";
import type { GoProps } from "@/types/ui";

interface DashProps extends GoProps {
  userName?: string;
}

export function Dash({ go, userName }: DashProps) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav
        go={go}
        right={
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="px-4"
              onClick={() => go("mygroup")}
            >
              My Group
            </Button>
            <span className="text-sm text-gray-600">{userName || "Student"}</span>
            <Avatar className="size-8">
              <AvatarFallback className="bg-gray-200 text-gray-500 text-[13px] font-bold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </div>
        }
      />
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
        <Card
          className="p-5 mb-3.5 gap-0 shadow-none cursor-pointer hover:border-gray-300 hover:shadow-sm transition-colors"
          onClick={() => go("board")}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-semibold">CSC318</div>
              <div className="text-sm text-gray-500">
                The Design of Interactive Computational Media
              </div>
              <div className="text-[13px] text-gray-400 mt-1">
                Winter 2026 · Section 201
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <Separator className="my-3.5 bg-gray-100" />
          <div className="flex justify-between">
            <span className="text-[13px] text-gray-500">Group status</span>
            <span className="text-[13px] font-semibold">Looking for group →</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
