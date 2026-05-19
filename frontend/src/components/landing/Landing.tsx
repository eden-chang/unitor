/**
 * Public landing page.
 *
 * Marketing copy + two CTAs (Log In, Sign Up) that fan out into the
 * magic-link onboarding flow. No auth state required.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/shared/icons";
import { Nav } from "@/components/shared/Nav";
import type { GoProps } from "@/types/ui";

export function Landing({ go }: GoProps) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav
        go={go}
        right={
          <>
            <Button
              variant="outline"
              size="sm"
              className="px-4"
              onClick={() => go("login")}
            >
              Log In
            </Button>
            <Button size="sm" className="px-4" onClick={() => go("signup-role")}>
              Sign Up
            </Button>
          </>
        }
      />
      <div className="text-center pt-[120px] px-6 pb-20">
        <h1 className="text-[52px] font-extrabold -tracking-[2px] text-foreground mb-4 leading-[1.05]">
          Find your people.
          <br />
          Form your team.
        </h1>
        <p className="text-lg text-gray-600 max-w-[520px] mx-auto mb-11 leading-[1.7]">
          Match with classmates by skills, schedule, and work style.
        </p>
        <div className="flex gap-3.5 justify-center">
          <Button
            className="px-9 py-3.5 text-base h-auto"
            onClick={() => go("signup-role")}
          >
            Get Started
          </Button>
          <Button
            variant="outline"
            className="px-9 py-3.5 text-base h-auto"
            onClick={() => go("login")}
          >
            Log In
          </Button>
        </div>
      </div>
      <div className="max-w-[880px] mx-auto px-6 pb-[100px] grid grid-cols-3 gap-5">
        {(["Discover", "Compare", "Connect"] as const).map((t, i) => {
          const descs = [
            "Browse available teammates.",
            "Compare schedules, skills, and work style.",
            "Message and form your group.",
          ];
          const icons = [
            <Icon.search key="s" size={32} />,
            <Icon.balance key="b" size={32} />,
            <Icon.chat key="c" size={32} />,
          ];
          return (
            <Card key={i} className="px-7 py-8 gap-0 shadow-none rounded-[14px]">
              <div className="mb-3.5">{icons[i]}</div>
              <div className="text-[17px] font-semibold mb-2">{t}</div>
              <div className="text-sm text-gray-600 leading-relaxed">{descs[i]}</div>
            </Card>
          );
        })}
      </div>
      <footer className="max-w-[880px] mx-auto px-6 pb-16 flex justify-center gap-6 text-[13px] text-gray-400">
        <span>© 2026 unitor</span>
        <span className="cursor-pointer hover:text-gray-600">Privacy Policy</span>
        <span className="cursor-pointer hover:text-gray-600">Terms of Service</span>
        <span className="cursor-pointer hover:text-gray-600">Contact</span>
      </footer>
    </div>
  );
}
