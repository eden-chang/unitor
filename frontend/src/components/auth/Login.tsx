/**
 * Prototype password-style login.
 *
 * Replaced by the same ``MagicLinkRequest`` component as signup in
 * step C — no separate password path.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { Nav } from "@/components/shared/Nav";
import type { GoProps } from "@/types/ui";

interface LoginProps extends GoProps {
  onLogin?: () => void;
  showToast?: (message: string) => void;
}

export function Login({ go, onLogin, showToast }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = email.trim().length > 0 && password.length > 0;
  const handleLogin = () => {
    if (!canSubmit) return;
    if (onLogin) onLogin();
    else go("dash");
  };
  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav go={go} />
      <div className="max-w-[500px] mx-auto py-14 px-6">
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Welcome back
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          Log in with your university email.
        </p>
        <FormField l="University Email" id="login-email">
          <Input
            id="login-email"
            placeholder="you@mail.utoronto.ca"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField l="Password" id="login-password">
          <Input
            id="login-password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={!canSubmit}
          onClick={handleLogin}
        >
          Log In
        </Button>
        <div className="mt-3.5 text-center">
          <Button
            variant="link"
            className="text-foreground"
            onClick={() =>
              showToast?.("Check your email for password reset instructions")
            }
          >
            Forgot password?
          </Button>
        </div>
        <div className="mt-5 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Button
            variant="link"
            className="text-foreground p-0 h-auto"
            onClick={() => go("signup-role")}
          >
            Sign up
          </Button>
        </div>
      </div>
    </div>
  );
}
