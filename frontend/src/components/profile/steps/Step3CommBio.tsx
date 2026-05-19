/**
 * Profile wizard step 3 — communication preferences + bio + optional links.
 *
 * On completion the wizard submits everything from step 1-3 in one
 * batch (``POST /profiles`` + ``PUT /skills`` + ``PUT /schedule``) once
 * step D lands. For now this step just routes to ``prof-done``.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/FormField";
import { Nav } from "@/components/shared/Nav";
import { cn } from "@/lib/utils";
import type { GoProps } from "@/types/ui";

export function Step3CommBio({ go }: GoProps) {
  const plats = ["Discord", "WhatsApp", "Email", "Instagram DM", "iMessage", "KakaoTalk"];
  const [sp, setSp] = useState<string[]>(["Discord"]);
  const [bio, setBio] = useState("");
  const tp = (p: string) =>
    setSp(sp.includes(p) ? sp.filter((x) => x !== p) : [...sp, p]);
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
          onClick={() => go("prof-2")}
        >
          ← Back
        </Button>
        <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">
          Step 4 of 4
        </div>
        <Progress
          value={(4 / 4) * 100}
          className="h-[3px] bg-gray-100 rounded-sm mb-8"
        />
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Communication &amp; About You
        </h1>
        <div className="mb-5">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Preferred Platforms
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {plats.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={sp.includes(p)}
                className={cn(
                  "inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer border-[1.5px] transition-colors",
                  sp.includes(p)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300",
                )}
                onClick={() => tp(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {sp.length > 0 && (
          <div
            className={cn(
              "grid gap-3 mb-5",
              sp.length > 1 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {sp.map((p) => (
              <FormField key={p} l={`${p} handle`}>
                <Input placeholder={`Your ${p} username`} />
              </FormField>
            ))}
          </div>
        )}
        <Separator className="my-6 bg-gray-100" />
        <FormField l="About You">
          <Textarea
            className="min-h-[100px] resize-y"
            placeholder="About you and your ideal group"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
          />
          <div
            className={cn(
              "text-[13px] leading-relaxed text-right mt-1",
              bio.length >= 300 ? "text-danger" : "text-gray-500",
            )}
          >
            {bio.length}/300
          </div>
        </FormField>
        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">
            Links (optional)
          </Label>
          <p className="text-[13px] text-gray-500 mb-2">
            Add portfolio, GitHub, LinkedIn, or any relevant links.
          </p>
          <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
            <Input placeholder="Label" />
            <Input placeholder="https://..." />
            <Button variant="outline" size="sm" className="px-4">
              Add
            </Button>
          </div>
        </div>
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={!bio.trim()}
          onClick={() => go("prof-done")}
        >
          Complete Profile
        </Button>
      </div>
    </div>
  );
}
