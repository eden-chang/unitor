/**
 * "Profile complete!" celebration page.
 *
 * Routes the student onto the Discovery board. ``onJoinCourse``
 * flips the prototype's localStorage flag; step C/D wires that to
 * the real bootstrap response.
 */

import { Button } from "@/components/ui/button";
import { Nav } from "@/components/shared/Nav";
import type { GoProps } from "@/types/ui";

export function ProfileDone({
  go,
  onJoinCourse,
}: GoProps & { onJoinCourse: () => void }) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto pt-[100px] px-6 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#9652ca]/15 flex items-center justify-center">
          <span className="text-3xl text-[#9652ca]">✓</span>
        </div>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Profile Complete!
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          You're ready to find teammates.
        </p>
        <Button
          className="px-9 py-3.5 text-base h-auto"
          onClick={() => {
            onJoinCourse();
            go("board");
          }}
        >
          Go to Matching Board
        </Button>
      </div>
    </div>
  );
}
