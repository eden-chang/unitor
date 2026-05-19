/**
 * Prototype password-style signup form.
 *
 * Replaced by ``MagicLinkRequest`` in step C — the magic-link flow
 * doesn't need a password at all. The form is kept here for the
 * mock-data prototype state.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/FormField";
import { Nav } from "@/components/shared/Nav";
import type { RoleGoProps } from "@/types/ui";

interface SignupFormProps extends RoleGoProps {
  onSetName: (name: string) => void;
  onSetEmail: (email: string) => void;
}

export function SignupForm({ role, go, onSetName, onSetEmail }: SignupFormProps) {
  const [showError, setShowError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const canSubmit =
    fullName.trim().length > 0 &&
    university.length > 0 &&
    email.trim().length > 0 &&
    pw.length >= 8 &&
    pw === pw2;
  const handleSubmit = () => {
    if (!canSubmit) return;
    if (email === "unknown@mail.utoronto.ca") {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    onSetName(fullName);
    onSetEmail(email);
    go("verify");
  };
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav
        go={go}
        right={
          <span className="text-[13px] text-gray-500">
            {role === "t" ? "TA / Instructor" : "Student"}
          </span>
        }
      />
      <div className="max-w-[500px] mx-auto py-14 px-6">
        <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">
          Step 1 of 2
        </div>
        <Progress
          value={(1 / 2) * 100}
          className="h-[3px] bg-gray-100 rounded-sm mb-8"
        />
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Create your account
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          Verification link will be sent to your email.
        </p>
        <FormField l="Full Name" id="signup-name">
          <Input
            id="signup-name"
            placeholder="e.g. John Doe"
            value={fullName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
          />
        </FormField>
        <FormField l="University">
          <Select value={university} onValueChange={setUniversity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your university..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utoronto">University of Toronto</SelectItem>
              <SelectItem value="york">York University</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <div className="mb-[18px]">
          <Label
            htmlFor="signup-email"
            className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]"
          >
            University Email
          </Label>
          <Input
            id="signup-email"
            placeholder="yourid@mail.utoronto.ca"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              setEmailError(false);
            }}
            className={emailError ? "border-danger" : ""}
          />
          <p className="text-[13px] text-gray-500 mt-1.5">
            Must match your course enrollment email.
          </p>
          {emailError && (
            <p className="text-[13px] text-danger mt-1">
              Your email was not found in this course. Contact your TA.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-1">
          <FormField l="Password" id="signup-pw">
            <Input
              id="signup-pw"
              type="password"
              placeholder="Min 8 characters"
              value={pw}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPw(e.target.value);
                setShowError(false);
              }}
            />
          </FormField>
          <FormField l="Confirm Password" id="signup-pw2">
            <Input
              id="signup-pw2"
              type="password"
              placeholder="Re-enter"
              className={showError ? "border-danger" : ""}
              value={pw2}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPw2(e.target.value);
                setShowError(false);
              }}
            />
          </FormField>
        </div>
        {pw2.length > 0 && pw !== pw2 && (
          <div className="text-[13px] text-danger mb-4">Passwords don't match.</div>
        )}
        {(pw2.length === 0 || pw === pw2) && <div className="mb-5" />}
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Send Verification Email
        </Button>
      </div>
    </div>
  );
}
