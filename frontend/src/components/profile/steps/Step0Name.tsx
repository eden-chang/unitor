/**
 * Profile wizard step 0 — name + photo.
 *
 * Step C wires the Next button to ``PATCH /api/v1/users/me`` so the
 * server-side display name updates as the wizard advances. Photo upload
 * lands in stage 2 (Cloudflare R2).
 */

import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FormField } from "@/components/shared/FormField";
import { Icon } from "@/components/shared/icons";
import { Nav } from "@/components/shared/Nav";
import type { GoProps } from "@/types/ui";

interface Step0Props extends GoProps {
  initialName?: string;
  onSaveName?: (name: string) => void;
}

export function Step0Name({ go, initialName, onSaveName }: Step0Props) {
  const [name, setName] = useState(initialName ?? "");
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
          onClick={() => go("join")}
        >
          ← Back
        </Button>
        <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">
          Step 1 of 4
        </div>
        <Progress
          value={(1 / 4) * 100}
          className="h-[3px] bg-gray-100 rounded-sm mb-8"
        />
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Your Profile
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          How teammates will see you.
        </p>
        <div className="text-center mb-7">
          <Avatar className="size-[88px] mx-auto mb-3 border-2 border-dashed border-gray-300 bg-gray-50">
            <AvatarFallback className="bg-gray-50">
              <Icon.camera size={28} color="var(--gray-300)" />
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" className="px-4">
            Upload Photo
          </Button>
        </div>
        <FormField l="Display Name">
          <Input
            placeholder="e.g. John D."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={!name.trim()}
          onClick={() => {
            onSaveName?.(name);
            go("prof-1");
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
