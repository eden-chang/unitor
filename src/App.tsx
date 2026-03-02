import { useState, Fragment, type ReactNode, type ReactElement } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

// ==================== TYPES ====================
interface GoProps {
  go: (page: string) => void;
}

interface RoleGoProps extends GoProps {
  role: string;
}

interface NavProps {
  go: (page: string) => void;
  right?: ReactNode;
}

interface FProps {
  l: string;
  id?: string;
  children: ReactNode;
}

interface ProfilePageProps extends GoProps {
  studentName: string;
}

interface SentProps extends GoProps {
  targetName: string;
}

interface TGridProps {
  sel: Set<string>;
  set: (s: Set<string>) => void;
  label: string;
}

interface IconProps {
  size?: number;
  color?: string;
}

interface Student {
  name: string;
  sec: string;
  skills: string[];
  status: "searching" | "talking" | "confirmed";
  overlap: string;
  init: string;
  bio: string;
  rat: Record<string, string>;
  lastActive: string;
  compatScore: number;
  scheduleOverlapHrs: number;
}

interface StatusInfo {
  l: string;
  variant?: "success" | "warning" | "danger";
  cls?: string;
}

interface CompatibilityBreakdown {
  overall: number;
  scheduleScore: number;
  skillScore: number;
  workStyleScore: number;
  matchReasons: string[];
  warnings: string[];
  skillComplementarity: { skill: string; coveredBy: "you" | "them" | "both" | "gap" }[];
}

// ==================== HELPERS ====================
function parseActivityMinutes(lastActive: string): number {
  const n = parseInt(lastActive);
  if (lastActive.includes("min")) return n;
  if (lastActive.includes("hour")) return n * 60;
  if (lastActive.includes("day")) return n * 1440;
  return 99999;
}

function isRecentlyActive(lastActive: string): boolean {
  return parseActivityMinutes(lastActive) < 30;
}
function Nav({ go, right }: NavProps) {
  return (
    <div className="flex justify-between items-center h-14 px-12 bg-card border-b border-border sticky top-0 z-[100]">
      <div className="flex items-center gap-5">
        <span className="text-[22px] font-extrabold text-foreground -tracking-[1px] cursor-pointer" onClick={() => go("landing")}>unitor</span>
      </div>
      <div className="flex items-center gap-3">{right}</div>
    </div>
  );
}

function F({ l, id, children }: FProps) {
  return (
    <div className="mb-[18px]">
      <Label htmlFor={id} className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">{l}</Label>
      {children}
    </div>
  );
}

function TGrid({ sel, set, label }: TGridProps) {
  const ds = ["Mon","Tue","Wed","Thu","Fri"], ts = ["9am–12pm","1–5pm","6–9pm"];
  const tog = (k: string) => { const n = new Set(sel); n.has(k)?n.delete(k):n.add(k); set(n); };
  return (
    <div className="mb-7">
      <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">{label}</Label>
      <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]">
        <div />{ds.map(d=><div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
        {ts.map((t,ti)=><Fragment key={ti}>
          <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
          {ds.map(d=>{ const k=`${d}-${ti}`; return <button key={k} type="button" role="checkbox" aria-checked={sel.has(k)} aria-label={`${d} ${t}`} onClick={()=>tog(k)} className={cn("py-2.5 px-1 text-center rounded-md cursor-pointer text-xs font-medium transition-colors", sel.has(k) ? "bg-primary text-primary-foreground" : "bg-gray-50 text-gray-400 hover:bg-gray-100")} />; })}
        </Fragment>)}
      </div>
    </div>
  );
}

// ==================== ICONS ====================
const Icon: Record<string, (props: IconProps) => ReactElement> = {
  graduation: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 13c-2.755 0-5-2.245-5-5V3.5H4V2h14.75c.69 0 1.25.56 1.25 1.25V9h-1.5V3.5H17V8c0 2.755-2.245 5-5 5ZM8.5 8c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V7h-7v1Zm0-2.5h7v-2h-7v2Zm6.43 9a4.752 4.752 0 0 1 4.59 3.52l1.015 3.785-1.45.39-1.015-3.785A3.253 3.253 0 0 0 14.93 16H9.07c-1.47 0-2.76.99-3.14 2.41l-1.015 3.785-1.45-.39L4.48 18.02a4.762 4.762 0 0 1 4.59-3.52h5.86Z" fill={color}/>
    </svg>
  ),
  clipboard: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.105 5H5.5v15.5h5V22H4V3.5h3V2h10v1.5h3V11h-1.5V5h-1.605c-.33 1.15-1.39 2-2.645 2h-4.5c-1.26 0-2.315-.85-2.645-2ZM15.5 3.5h-7v.75c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25V3.5Zm2.22 9.72a2.164 2.164 0 1 1 3.06 3.06l-5.125 5.125-2.22.74a1.237 1.237 0 0 1-1.28-.3c-.335-.34-.45-.83-.3-1.28l.74-2.22 5.125-5.125Zm-2.875 6.875 4.875-4.875a.664.664 0 1 0-.94-.94l-4.875 4.875-.47 1.41 1.41-.47Z" fill={color}/>
    </svg>
  ),
  email: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M19.25 20H6.5v-1.5h12.75c.69 0 1.25-.56 1.25-1.25V9.46L12 14.37 2 8.595V6.75A2.755 2.755 0 0 1 4.75 4h14.5A2.755 2.755 0 0 1 22 6.75v10.5A2.755 2.755 0 0 1 19.25 20ZM3.5 7.725 12 12.63l8.5-4.905V6.75c0-.69-.56-1.25-1.25-1.25H4.75c-.69 0-1.25.56-1.25 1.25v.975ZM9 15H3.5v1.5H9V15Zm-7-3h2.5v1.5H2V12Z" fill={color}/>
    </svg>
  ),
  books: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 4a3.745 3.745 0 0 0-3 1.51A3.745 3.745 0 0 0 9 4H2v16h7.5c.69 0 1.25.56 1.25 1.25h2.5c0-.69.56-1.25 1.25-1.25H22V4h-7Zm-3.75 15.13a2.726 2.726 0 0 0-1.75-.63h-6v-13H9c1.24 0 2.25 1.01 2.25 2.25v11.38Zm9.25-.63h-6c-.665 0-1.275.235-1.75.63V7.75c0-1.24 1.01-2.25 2.25-2.25h5.5v13Z" fill={color}/>
    </svg>
  ),
  camera: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2 17.25A2.755 2.755 0 0 0 4.75 20h14.5A2.755 2.755 0 0 0 22 17.25v-9a2.755 2.755 0 0 0-2.75-2.75h-2.64l-2-2.5H9.39l-2 2.5H4.75A2.755 2.755 0 0 0 2 8.25v9ZM8.11 7l2-2.5h3.78l2 2.5h3.36c.69 0 1.25.56 1.25 1.25v9c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-9C3.5 7.56 4.06 7 4.75 7h3.36Zm-.61 5.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5S14.48 8 12 8s-4.5 2.02-4.5 4.5Zm1.5 0c0-1.655 1.345-3 3-3s3 1.345 3 3-1.345 3-3 3-3-1.345-3-3Z" fill={color}/>
    </svg>
  ),
  search: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m21.78 20.72-5.62-5.62A7.96 7.96 0 0 0 18 10c0-4.41-3.59-8-8-8s-8 3.59-8 8 3.59 8 8 8a7.96 7.96 0 0 0 5.1-1.84l5.62 5.62 1.06-1.06ZM10 16.5A6.506 6.506 0 0 1 3.5 10c0-3.585 2.915-6.5 6.5-6.5s6.5 2.915 6.5 6.5-2.915 6.5-6.5 6.5Z" fill={color}/>
    </svg>
  ),
  balance: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.75 12.5h9.265l-.02-.77a9.99 9.99 0 0 0-9.725-9.725l-.77-.02v9.265c0 .69.56 1.25 1.25 1.25Zm7.69-1.5H13V3.56A8.493 8.493 0 0 1 20.44 11ZM3.5 12c0 4.685 3.815 8.5 8.5 8.5 3.965 0 7.345-2.785 8.255-6.5h1.535c-.94 4.545-5 8-9.79 8-5.515 0-10-4.485-10-10 0-4.83 3.44-8.87 8-9.8v1.545C6.275 4.65 3.5 8.005 3.5 12Z" fill={color}/>
    </svg>
  ),
  chat: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155ZM3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94V5.75Zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19l1.925 1.925Z" fill={color}/>
    </svg>
  ),
  clockAlert: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 22C6.485 22 2 17.515 2 12S6.485 2 12 2s10 4.485 10 10-4.485 10-10 10Zm0-18.5c-4.685 0-8.5 3.815-8.5 8.5 0 4.685 3.815 8.5 8.5 8.5 4.685 0 8.5-3.815 8.5-8.5 0-4.685-3.815-8.5-8.5-8.5Zm.75 10V8h-1.5v5.5h1.5ZM13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill={color}/>
    </svg>
  ),
};

// ==================== PAGES ====================

// Landing
function Landing({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<><Button variant="outline" size="sm" className="px-4" onClick={()=>go("login")}>Log In</Button><Button size="sm" className="px-4" onClick={()=>go("signup-role")}>Sign Up</Button></>} />
    <div className="text-center pt-[120px] px-6 pb-20">
      <h1 className="text-[52px] font-extrabold -tracking-[2px] text-foreground mb-4 leading-[1.05]">Find your people.<br/>Form your team.</h1>
      <p className="text-lg text-gray-600 max-w-[520px] mx-auto mb-11 leading-[1.7]">Match with classmates by skills, schedule, and work style.</p>
      <div className="flex gap-3.5 justify-center">
        <Button className="px-9 py-3.5 text-base h-auto" onClick={()=>go("signup-role")}>Get Started</Button>
        <Button variant="outline" className="px-9 py-3.5 text-base h-auto" onClick={()=>go("login")}>Log In</Button>
      </div>
    </div>
    <div className="max-w-[880px] mx-auto px-6 pb-[100px] grid grid-cols-3 gap-5">
      {(["Discover","Compare","Connect"] as const).map((t,i)=>{
        const descs = ["Browse available teammates.","Compare schedules, skills, and work style.","Message and form your group."];
        const icons = [<Icon.search key="s" size={32} />,<Icon.balance key="b" size={32} />,<Icon.chat key="c" size={32} />];
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
  </div>;
}

// Signup Role
function SignupRole({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Join unitor</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">How will you use unitor?</p>
      {[{i:<Icon.graduation size={24} />,t:"Student",d:"Find and join project groups",to:"signup-s"},{i:<Icon.clipboard size={24} />,t:"TA / Instructor",d:"Create courses and manage groups",to:"signup-t"}].map(r=>(
        <Card key={r.t} className="p-5 mb-3.5 shadow-none cursor-pointer flex-row items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-colors" onClick={()=>go(r.to)}>
          <div className="w-[50px] h-[50px] rounded-xl bg-gray-50 flex items-center justify-center">{r.i}</div>
          <div className="flex-1"><div className="text-base font-semibold">{r.t}</div><div className="text-sm text-gray-500">{r.d}</div></div>
          <span className="text-gray-300 text-lg">→</span>
        </Card>
      ))}
    </div>
  </div>;
}

// Signup Form
function SignupForm({ role, go }: RoleGoProps) {
  const [showError, setShowError] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const handleSubmit = () => {
    if (pw !== pw2 && pw2.length > 0) {
      setShowError(true);
      return;
    }
    setShowError(false);
    go("verify");
  };
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<span className="text-[13px] text-gray-500">{role==="t"?"TA / Instructor":"Student"}</span>} />
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 1 of 2</div>
      <Progress value={(1/2)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Create your account</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Verification link will be sent to your email.</p>
      <F l="Full Name" id="signup-name"><Input id="signup-name" placeholder="e.g. John Doe" /></F>
      <F l="University">
        <Select>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select your university..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="utoronto">University of Toronto</SelectItem>
            <SelectItem value="york">York University</SelectItem>
          </SelectContent>
        </Select>
      </F>
      <F l="University Email" id="signup-email"><Input id="signup-email" placeholder="you@mail.utoronto.ca" /></F>
      <div className="grid grid-cols-2 gap-3 mb-1">
        <F l="Password" id="signup-pw"><Input id="signup-pw" type="password" placeholder="Min 8 characters" value={pw} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setPw(e.target.value);setShowError(false);}} /></F>
        <F l="Confirm Password" id="signup-pw2"><Input id="signup-pw2" type="password" placeholder="Re-enter" className={showError ? "border-danger" : ""} value={pw2} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setPw2(e.target.value);setShowError(false);}} /></F>
      </div>
      {showError && <div className="text-[13px] text-danger mb-4">Passwords don't match.</div>}
      {!showError && <div className="mb-5" />}
      <Button className="w-full px-7 py-3 h-auto" onClick={handleSubmit}>Send Verification Email</Button>
    </div>
  </div>;
}

// Email Verify
function Verify({ role, go }: RoleGoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto pt-20 px-6 text-center">
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 2 of 2</div>
      <Progress value={(2/2)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <div className="mb-5 flex justify-center"><Icon.email size={48} /></div>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px] text-center">Check your inbox</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed text-center">We sent a link to <strong>j.doe@mail.utoronto.ca</strong></p>
      <Button className="w-full px-7 py-3 h-auto" onClick={()=>go(role==="t"?"ta-dash":"dash")}>I've Verified My Email</Button>
      <div className="mt-3.5"><Button variant="link" className="text-foreground">Resend email</Button></div>
    </div>
  </div>;
}

// Student Dashboard
function Dash({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<div className="flex items-center gap-4"><Button variant="outline" size="sm" className="px-4" onClick={()=>go("board")}>Board</Button><Button variant="outline" size="sm" className="inline-flex items-center gap-1.5 px-4" onClick={()=>go("inbox")}><Icon.chat size={16} /> Messages</Button><Button variant="outline" size="sm" className="px-4" onClick={()=>go("mygroup")}>My Group</Button><span className="text-sm text-gray-600">John</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-[13px] font-bold">JD</AvatarFallback></Avatar></div>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">Welcome back,</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">My Courses</h1></div>
        <Button size="sm" className="px-4" onClick={()=>go("join")}>+ Join a Course</Button>
      </div>
      <Card className="py-[52px] px-6 mb-3.5 gap-0 shadow-none text-center border-dashed border-gray-300">
        <div className="mb-3 flex justify-center"><Icon.books size={36} /></div>
        <p className="text-[15px] text-gray-500 mb-4">No courses yet.</p>
        <Button variant="outline" size="sm" className="px-4 mx-auto" onClick={()=>go("join")}>Join your first course</Button>
      </Card>
      <div className="mt-2.5" />
      <Card className="p-5 mb-3.5 gap-0 shadow-none cursor-pointer hover:border-gray-300 hover:shadow-sm transition-colors" onClick={()=>go("board")}>
        <div className="flex justify-between items-start">
          <div><div className="text-lg font-semibold">CSC318</div><div className="text-sm text-gray-500">The Design of Interactive Computational Media</div><div className="text-[13px] text-gray-400 mt-1">Winter 2026 · Section 201</div></div>
          <Badge variant="success">Active</Badge>
        </div>
        <Separator className="my-3.5 bg-gray-100" />
        <div className="flex justify-between"><span className="text-[13px] text-gray-500">Group status</span><span className="text-[13px] font-semibold">Looking for group →</span></div>
      </Card>
    </div>
  </div>;
}

// Join Course
function Join({ go }: GoProps) {
  const [step, setStep] = useState(0);
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("dash")}>← Back to Dashboard</Button>
      {step===0?<>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Join a Course</h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">Enter course code from your TA.</p>
        <F l="Course Code"><Input className="text-[22px] font-bold tracking-[6px] text-center py-[18px] h-auto" placeholder="ABC123" /></F>
        <Button className="w-full px-7 py-3 h-auto" onClick={()=>setStep(1)}>Look Up</Button>
      </>:
      <>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Confirm Course</h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">Is this the right one?</p>
        <Card className="p-5 gap-0 shadow-none bg-gray-50">
          <div className="text-[22px] font-bold mb-1">CSC318</div>
          <div className="text-[15px] text-gray-600">The Design of Interactive Computational Media</div>
          <div className="text-sm text-gray-400 mb-3">Winter 2026 · University of Toronto</div>
          <Separator className="my-3 bg-gray-100" />
          <div className="grid grid-cols-2 gap-1.5 text-[13px] text-gray-500">
            <span>Sections: 201, 202, 203</span><span>Group size: 4–6</span>
            <span>Deadline: Mar 15, 2026</span><span>Code: W543M7</span>
          </div>
        </Card>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 px-7 py-3 h-auto" onClick={()=>setStep(0)}>Back</Button>
          <Button className="flex-1 px-7 py-3 h-auto" onClick={()=>go("prof-0")}>Join & Set Up Profile</Button>
        </div>
      </>}
    </div>
  </div>;
}

// Profile 0 - Name & Photo
function Prof0({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<span className="text-[13px] text-gray-500 leading-relaxed">CSC318 · Profile</span>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("join")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 1 of 4</div>
      <Progress value={(1/4)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Your Profile</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">How teammates will see you.</p>
      <div className="text-center mb-7">
        <Avatar className="size-[88px] mx-auto mb-3 border-2 border-dashed border-gray-300 bg-gray-50">
          <AvatarFallback className="bg-gray-50"><Icon.camera size={28} color="var(--gray-300)" /></AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm" className="px-4">Upload Photo</Button>
      </div>
      <F l="Display Name"><Input placeholder="e.g. John D." /></F>
      <Button className="w-full px-7 py-3 h-auto" onClick={()=>go("prof-1")}>Next</Button>
    </div>
  </div>;
}

// Profile 1 - Skills
function Prof1({ go }: GoProps) {
  const pre = ["UI Design","Frontend Dev","Backend","User Research","Prototyping","Data Analysis","UX Writing","Project Mgmt"];
  const [sel, setSel] = useState<string[]>(["UI Design","User Research"]);
  const [rat, setRat] = useState<Record<string, string>>({"UI Design":"Expert","User Research":"Proficient"});
  const lvl = ["Beginner","Intermediate","Proficient","Expert"];
  const tog = (sk: string) => { if(sel.includes(sk)){setSel(sel.filter(x=>x!==sk));const r={...rat};delete r[sk];setRat(r);}else{setSel([...sel,sk]);setRat({...rat,[sk]:"Intermediate"});} };
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<span className="text-[13px] text-gray-500 leading-relaxed">CSC318 · Profile</span>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("prof-0")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 2 of 4</div>
      <Progress value={(2/4)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Your Skills</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Select or add skills.</p>
      <div className="mb-5">
        {pre.map(sk=><button key={sk} type="button" aria-pressed={sel.includes(sk)} className={cn("inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] transition-colors", sel.includes(sk) ? "bg-primary text-primary-foreground border-primary" : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300")} onClick={()=>tog(sk)}>{sk}</button>)}
        <button type="button" className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-gray-100 text-gray-600 border-gray-200 border-dashed">+ Custom</button>
      </div>
      {sel.length>0&&<Card className="p-0 mb-6 gap-0 shadow-none overflow-hidden">
        {sel.map((sk,i)=><div key={sk} className={cn("flex justify-between items-center px-5 py-3", i<sel.length-1 && "border-b border-gray-100")}>
          <span className="text-sm font-medium">{sk}</span>
          <div className="flex gap-1">{lvl.map(l=><button key={l} type="button" aria-pressed={rat[sk]===l} className={cn("py-1 px-2.5 rounded-md text-xs font-medium cursor-pointer transition-colors", rat[sk]===l ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-500 hover:bg-gray-200")} onClick={()=>setRat({...rat,[sk]:l})}>{l}</button>)}</div>
        </div>)}
      </Card>}
      <Button className="w-full px-7 py-3 h-auto" onClick={()=>go("prof-2")}>Next</Button>
    </div>
  </div>;
}

// Profile 2 - Section & Schedule
function Prof2({ go }: GoProps) {
  const [camp, setCamp] = useState<Set<string>>(new Set(["Mon-0","Wed-0","Mon-1","Wed-1","Fri-1"]));
  const [work, setWork] = useState<Set<string>>(new Set(["Mon-1","Tue-1","Wed-1","Thu-2","Fri-1"]));
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<span className="text-[13px] text-gray-500 leading-relaxed">CSC318 · Profile</span>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("prof-1")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 3 of 4</div>
      <Progress value={(3/4)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Section & Schedule</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">For matching compatible schedules.</p>
      <F l="Your Section">
        <Select defaultValue="201">
          <SelectTrigger className="w-full"><SelectValue placeholder="Select section..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="201">Section 201</SelectItem>
            <SelectItem value="202">Section 202</SelectItem>
            <SelectItem value="203">Section 203</SelectItem>
          </SelectContent>
        </Select>
      </F>
      <TGrid sel={camp} set={setCamp} label="When are you on campus?" />
      <TGrid sel={work} set={setWork} label="When can you work on the project?" />
      <Button className="w-full px-7 py-3 h-auto" onClick={()=>go("prof-3")}>Next</Button>
    </div>
  </div>;
}

// Profile 3 - Communication & Bio
function Prof3({ go }: GoProps) {
  const plats = ["Discord","WhatsApp","Email","Instagram DM","iMessage","KakaoTalk"];
  const [sp, setSp] = useState<string[]>(["Discord"]);
  const tp = (p: string) => setSp(sp.includes(p)?sp.filter(x=>x!==p):[...sp,p]);
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<span className="text-[13px] text-gray-500 leading-relaxed">CSC318 · Profile</span>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("prof-2")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 4 of 4</div>
      <Progress value={(4/4)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Communication & About You</h1>
      <div className="mb-5">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Preferred Platforms</Label>
        <div className="flex flex-wrap gap-1.5">{plats.map(p=><button key={p} type="button" aria-pressed={sp.includes(p)} className={cn("inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer border-[1.5px] transition-colors", sp.includes(p) ? "bg-primary text-primary-foreground border-primary" : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300")} onClick={()=>tp(p)}>{p}</button>)}</div>
      </div>
      {sp.length>0&&<div className={cn("grid gap-3 mb-5", sp.length>1?"grid-cols-2":"grid-cols-1")}>
        {sp.map(p=><F key={p} l={`${p} handle`}><Input placeholder={`Your ${p} username`} /></F>)}
      </div>}
      <Separator className="my-6 bg-gray-100" />
      <F l="About You"><Textarea className="min-h-[100px] resize-y" placeholder="About you and your ideal group" /><div className="text-[13px] text-gray-500 leading-relaxed text-right mt-1">0/300</div></F>
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Links (optional)</Label>
        <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
          <Input placeholder="Label" /><Input placeholder="https://..." /><Button variant="outline" size="sm" className="px-4">Add</Button>
        </div>
      </div>
      <Button className="w-full px-7 py-3 h-auto" onClick={()=>go("prof-done")}>Complete Profile</Button>
    </div>
  </div>;
}

// Profile Complete Confirmation
function ProfDone({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto pt-[100px] px-6 text-center">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-success-bg flex items-center justify-center"><span className="text-3xl text-success">✓</span></div>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Profile Complete!</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">You're ready to find teammates.</p>
      <Button className="px-9 py-3.5 text-base h-auto" onClick={()=>go("board")}>Go to Matching Board</Button>
    </div>
  </div>;
}

// TA Admin Data
const ADMIN_DATA = {
  atRisk: [
    { name: "Priya Sharma", sec: "201", init: "PS", daysSinceActivity: 8, skills: ["Backend","Data Analysis"] },
    { name: "Omar Ali", sec: "203", init: "OA", daysSinceActivity: 5, skills: ["Project Mgmt"] },
    { name: "Wei Zhang", sec: "202", init: "WZ", daysSinceActivity: 12, skills: ["Frontend Dev"] },
  ],
  formationTimeline: [
    { date: "Feb 10", grouped: 8, ungrouped: 34 },
    { date: "Feb 17", grouped: 16, ungrouped: 26 },
    { date: "Feb 24", grouped: 24, ungrouped: 18 },
    { date: "Mar 1", grouped: 28, ungrouped: 14 },
    { date: "Mar 8", grouped: 28, ungrouped: 14 },
  ],
  sectionBreakdown: [
    { section: "201", total: 18, grouped: 12, ungrouped: 6 },
    { section: "202", total: 14, grouped: 10, ungrouped: 4 },
    { section: "203", total: 10, grouped: 6, ungrouped: 4 },
  ],
  skillDemand: [
    { skill: "Frontend Dev", seekers: 12, available: 5 },
    { skill: "Backend", seekers: 14, available: 3 },
    { skill: "UI Design", seekers: 8, available: 7 },
    { skill: "User Research", seekers: 6, available: 9 },
  ],
};

// TA Dashboard
function TADash({ go }: GoProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "students" | "alerts">("overview");
  const [studentFilter, setStudentFilter] = useState("all");
  const handleCopy = () => {
    navigator.clipboard.writeText("W543M7").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const filteredAdminStudents = STU.filter(s => {
    if (studentFilter === "ungrouped") return s.status !== "confirmed";
    if (studentFilter === "atrisk") return ADMIN_DATA.atRisk.some(r => r.name === s.name);
    return true;
  });
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<div className="flex items-center gap-2.5"><span className="text-sm text-gray-600">Prof. Truong</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">KT</AvatarFallback></Avatar></div>} />
    <div className="max-w-[780px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">TA Dashboard</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">CSC318</h1></div>
        <Button size="sm" className="px-4" onClick={()=>go("ta-create")}>+ Create Course</Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6" role="tablist">
        {(["overview","students","alerts"] as const).map(t => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={cn("py-[7px] px-4 rounded-lg text-[13px] font-semibold cursor-pointer capitalize relative", tab === t ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-500")} onClick={() => setTab(t)}>
            {t}
            {t === "alerts" && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">{ADMIN_DATA.atRisk.length}</span>}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && <>
        <Card className="p-5 gap-0 shadow-none mb-4">
          <div className="flex justify-between mb-4">
            <div><div className="text-lg font-semibold">CSC318</div><div className="text-sm text-gray-500">Design of Interactive Media · Winter 2026</div></div>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center mb-4">
            {([["42","Students"],["6","Groups"],["14","Ungrouped"],["12 days left","Deadline"]] as const).map(([v,l])=><div key={l}><div className={cn("font-bold", v === "12 days left" ? "text-base" : "text-2xl")}>{v}</div><div className="text-xs text-gray-500">{l}</div></div>)}
          </div>
          <div className="h-[3px] bg-gray-100 rounded-sm mb-1"><div className="h-full w-[67%] bg-success rounded-sm" /></div>
          <div className="text-xs text-gray-500 mb-4">67% of students grouped</div>
          <Separator className="my-3.5 bg-gray-100" />
          <div className="flex justify-between items-center">
            <div><div className="text-[13px] font-semibold mb-1">Invite Code</div><code className="py-2 px-4 bg-gray-50 rounded-md text-lg font-bold tracking-[3px] border border-gray-200">W543M7</code></div>
            <Button variant="outline" size="sm" className="px-4" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</Button>
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed mt-2">Share with students.</p>
        </Card>

        {/* Formation Timeline */}
        <Card className="p-5 gap-0 shadow-none mb-4">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Formation Timeline</Label>
          <div className="flex items-end gap-2 h-[120px]">
            {ADMIN_DATA.formationTimeline.map((d) => {
              const total = d.grouped + d.ungrouped;
              const gPct = (d.grouped / total) * 100;
              const uPct = (d.ungrouped / total) * 100;
              return <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-[2px]" style={{ height: "100px" }}>
                  <div className="bg-gray-200 rounded-t-sm" style={{ height: `${uPct}%` }} />
                  <div className="bg-success rounded-b-sm" style={{ height: `${gPct}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{d.date}</span>
              </div>;
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success" /> Grouped</span><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-200" /> Ungrouped</span></div>
        </Card>

        {/* Section Breakdown */}
        <Card className="p-5 gap-0 shadow-none mb-4">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Section Breakdown</Label>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50"><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Section</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Total</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Grouped</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Ungrouped</th></tr></thead>
              <tbody>
                {ADMIN_DATA.sectionBreakdown.map((s, i) => (
                  <tr key={s.section} className={i < ADMIN_DATA.sectionBreakdown.length - 1 ? "border-b border-gray-100" : ""}>
                    <td className="py-2 px-3 font-medium">{s.section}</td>
                    <td className="py-2 px-3 text-center">{s.total}</td>
                    <td className="py-2 px-3 text-center text-success font-semibold">{s.grouped}</td>
                    <td className="py-2 px-3 text-center text-danger font-semibold">{s.ungrouped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Skill Supply/Demand */}
        <Card className="p-5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Skill Supply / Demand</Label>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50"><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Skill</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Seekers</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Available</th><th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Gap</th></tr></thead>
              <tbody>
                {ADMIN_DATA.skillDemand.map((s, i) => {
                  const gap = s.seekers - s.available;
                  return <tr key={s.skill} className={i < ADMIN_DATA.skillDemand.length - 1 ? "border-b border-gray-100" : ""}>
                    <td className="py-2 px-3 font-medium">{s.skill}</td>
                    <td className="py-2 px-3 text-center">{s.seekers}</td>
                    <td className="py-2 px-3 text-center">{s.available}</td>
                    <td className={cn("py-2 px-3 text-center font-semibold", gap > 0 ? "text-danger" : "text-success")}>{gap > 0 ? `−${gap}` : `+${Math.abs(gap)}`}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </>}

      {/* Students tab */}
      {tab === "students" && <>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[13px] text-gray-500">{filteredAdminStudents.length} students</span>
          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              <SelectItem value="ungrouped">Ungrouped only</SelectItem>
              <SelectItem value="atrisk">At risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredAdminStudents.map((st, i) => {
          const ss = SS[st.status];
          return <Card key={i} className="p-4 mb-2.5 gap-0 shadow-none flex-row items-center gap-3">
            <Avatar className="size-9"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">{st.init}</AvatarFallback></Avatar>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm font-semibold">{st.name}</span>
                <Badge variant={ss.variant} className={ss.cls}>{ss.l}</Badge>
              </div>
              <div className="text-xs text-gray-500">Section {st.sec} · {st.skills.join(", ")}</div>
            </div>
          </Card>;
        })}
      </>}

      {/* Alerts tab */}
      {tab === "alerts" && <>
        {/* Deadline alert */}
        <Card className="p-5 gap-0 shadow-none mb-4 bg-caution-bg border-caution-border">
          <div className="text-[15px] font-bold text-caution mb-1">Deadline Approaching</div>
          <div className="text-[13px] text-caution-dark leading-relaxed mb-3">14 students ungrouped — provisional groups form in 3 days.</div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs px-4">Review provisional groups</Button>
            <Button variant="outline" size="sm" className="text-xs px-4">Extend deadline</Button>
            <Button variant="outline" size="sm" className="text-xs px-4">Email all ungrouped</Button>
          </div>
        </Card>

        {/* At-risk banner */}
        <div className="py-3.5 px-[18px] bg-danger-bg rounded-[10px] border border-danger-border mb-4">
          <div className="text-[15px] font-bold text-danger mb-1">{ADMIN_DATA.atRisk.length} students at risk</div>
          <div className="text-[13px] text-danger-dark leading-relaxed">These students have been inactive and may miss the deadline.</div>
        </div>

        {ADMIN_DATA.atRisk.map((st, i) => (
          <Card key={i} className="p-5 mb-3 gap-0 shadow-none">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="size-10"><AvatarFallback className="bg-gray-200 text-gray-500 text-sm font-bold">{st.init}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="text-sm font-semibold">{st.name}</div>
                <div className="text-xs text-gray-500">Section {st.sec} · Last active {st.daysSinceActivity} days ago</div>
              </div>
              <Badge variant="danger">Inactive {st.daysSinceActivity}d</Badge>
            </div>
            <div className="flex gap-1 mb-3">{st.skills.map(sk => <span key={sk} className="py-0.5 px-2.5 bg-gray-100 rounded-[10px] text-[11px] text-gray-600">{sk}</span>)}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs px-4">Send reminder email</Button>
              <Button size="sm" variant="outline" className="text-xs px-4">Suggest match</Button>
            </div>
          </Card>
        ))}

        <Separator className="my-5 bg-gray-100" />
        <Button className="w-full px-7 py-3 h-auto">Send bulk reminder to all ungrouped</Button>
      </>}
    </div>
  </div>;
}

// TA Create Course
function TACreate({ go }: GoProps) {
  const [skills, setSkills] = useState<string[]>(["UI Design","Frontend Dev","Backend","User Research","Prototyping","Data Analysis"]);
  const [secs, setSecs] = useState<string[]>(["201","202","203"]);
  const [newSec, setNewSec] = useState("");
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("ta-dash")}>← Back</Button>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Create a Course</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Students join with this code.</p>
      <div className="grid grid-cols-2 gap-3 mb-1">
        <F l="University"><Input value="University of Toronto" readOnly /></F>
        <F l="Department"><Input placeholder="e.g. Computer Science" /></F>
        <F l="Course Code"><Input placeholder="e.g. CSC318" /></F>
        <F l="Semester">
          <Select defaultValue="winter-2026">
            <SelectTrigger className="w-full"><SelectValue placeholder="Select semester..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="winter-2026">Winter 2026</SelectItem>
              <SelectItem value="fall-2026">Fall 2026</SelectItem>
            </SelectContent>
          </Select>
        </F>
      </div>
      <F l="Course Name"><Input placeholder="e.g. The Design of Interactive Computational Media" /></F>
      <div className="grid grid-cols-3 gap-3 mb-1">
        <F l="Min Group Size"><Input placeholder="4" /></F>
        <F l="Max Group Size"><Input placeholder="6" /></F>
        <F l="Deadline"><Input type="date" /></F>
      </div>

      <Separator className="my-6 bg-gray-100" />
      <div className="mb-6">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Sections</Label>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {secs.map(sc=><span key={sc} className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium border-[1.5px] bg-primary text-primary-foreground border-primary">{sc} <span className="ml-1.5 opacity-60 cursor-pointer" onClick={()=>setSecs(secs.filter(x=>x!==sc))}>×</span></span>)}
        </div>
        <div className="flex gap-2">
          <Input className="w-[120px]" placeholder="e.g. 204" value={newSec} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setNewSec(e.target.value)} />
          <Button variant="outline" size="sm" className="px-4" onClick={()=>{if(newSec.trim()){setSecs([...secs,newSec.trim()]);setNewSec("");}}}>+ Add</Button>
        </div>
      </div>

      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills for this Course</Label>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-2.5">Students pick from these.</p>
        <div>{skills.map(sk=><span key={sk} className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-primary text-primary-foreground border-primary">{sk} <span className="ml-1.5 opacity-60 cursor-pointer" onClick={()=>setSkills(skills.filter(x=>x!==sk))}>×</span></span>)}<span className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-gray-100 text-gray-600 border-gray-200 border-dashed">+ Add Skill</span></div>
      </div>
      <Button className="w-full px-7 py-3 h-auto" onClick={()=>go("ta-dash")}>Create Course</Button>
    </div>
  </div>;
}

// Student data
const STU: Student[] = [
  { name: "Jesse Nguyen", sec: "202", skills: ["Frontend Dev","Prototyping"], status: "searching", overlap: "8h/wk", init: "JN", bio: "Love building things. Looking for a design-focused team.", rat: {"Frontend Dev":"Proficient","Prototyping":"Expert"}, lastActive: "5 min ago", compatScore: 87, scheduleOverlapHrs: 8 },
  { name: "Priya Sharma", sec: "201", skills: ["Backend","Data Analysis"], status: "searching", overlap: "0h/wk", init: "PS", bio: "Data nerd. Prefer async work.", rat: {"Backend":"Proficient","Data Analysis":"Expert"}, lastActive: "8 days ago", compatScore: 41, scheduleOverlapHrs: 0 },
  { name: "Marcus Lee", sec: "201", skills: ["UI Design","Frontend Dev"], status: "talking", overlap: "5h/wk", init: "ML", bio: "Design + code. In talks with a group.", rat: {"UI Design":"Proficient","Frontend Dev":"Intermediate"}, lastActive: "20 min ago", compatScore: 72, scheduleOverlapHrs: 5 },
  { name: "Aisha Khan", sec: "203", skills: ["Project Mgmt","UX Writing"], status: "searching", overlap: "3h/wk", init: "AK", bio: "Organized and reliable.", rat: {"Project Mgmt":"Expert","UX Writing":"Proficient"}, lastActive: "1 hour ago", compatScore: 65, scheduleOverlapHrs: 3 },
  { name: "Tom Chen", sec: "201", skills: ["Backend","Prototyping"], status: "confirmed", overlap: "—", init: "TC", bio: "", rat: {}, lastActive: "2 days ago", compatScore: 0, scheduleOverlapHrs: 0 },
  { name: "David Park", sec: "202", skills: ["Backend","Data Analysis"], status: "searching", overlap: "6h/wk", init: "DP", bio: "Full-stack developer interested in data-driven projects.", rat: {"Backend":"Expert","Data Analysis":"Proficient"}, lastActive: "15 min ago", compatScore: 76, scheduleOverlapHrs: 6 },
  { name: "Lisa Wang", sec: "201", skills: ["Frontend Dev","UX Writing"], status: "searching", overlap: "4h/wk", init: "LW", bio: "I bridge the gap between design and development.", rat: {"Frontend Dev":"Proficient","UX Writing":"Intermediate"}, lastActive: "2 hours ago", compatScore: 68, scheduleOverlapHrs: 4 },
  { name: "Omar Ali", sec: "203", skills: ["Project Mgmt"], status: "searching", overlap: "2h/wk", init: "OA", bio: "Experienced PM looking for a motivated team.", rat: {"Project Mgmt":"Expert"}, lastActive: "5 days ago", compatScore: 52, scheduleOverlapHrs: 2 },
  { name: "Sofia Rodriguez", sec: "202", skills: ["UI Design","User Research"], status: "talking", overlap: "7h/wk", init: "SR", bio: "UX researcher passionate about accessible design.", rat: {"UI Design":"Intermediate","User Research":"Expert"}, lastActive: "10 min ago", compatScore: 81, scheduleOverlapHrs: 7 },
  { name: "Wei Zhang", sec: "202", skills: ["Frontend Dev","Backend"], status: "searching", overlap: "9h/wk", init: "WZ", bio: "Full-stack dev. Strong in React and Node.", rat: {"Frontend Dev":"Expert","Backend":"Proficient"}, lastActive: "12 days ago", compatScore: 79, scheduleOverlapHrs: 9 },
  { name: "Elena Popov", sec: "203", skills: ["Data Analysis","UX Writing"], status: "searching", overlap: "5h/wk", init: "EP", bio: "Research-oriented. Love working with data.", rat: {"Data Analysis":"Expert","UX Writing":"Intermediate"}, lastActive: "30 min ago", compatScore: 63, scheduleOverlapHrs: 5 },
  { name: "Kai Tanaka", sec: "201", skills: ["Prototyping","UI Design"], status: "confirmed", overlap: "—", init: "KT", bio: "Figma wizard.", rat: {"Prototyping":"Expert","UI Design":"Proficient"}, lastActive: "3 days ago", compatScore: 0, scheduleOverlapHrs: 0 },
];
const SS: Record<string, StatusInfo> = {
  searching: { l: "Looking", variant: "success" },
  talking: { l: "In talks", variant: "warning" },
  confirmed: { l: "Grouped", cls: "bg-gray-100 text-gray-500 border-transparent" },
};

const COMPAT: Record<string, CompatibilityBreakdown> = {
  "Jesse Nguyen": {
    overall: 87, scheduleScore: 90, skillScore: 95, workStyleScore: 100,
    matchReasons: ["Strong schedule overlap (8h/wk)","Complementary skills — no redundancy","Same meeting preference (in-person, 2x/wk)"],
    warnings: [],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" },{ skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" },{ skill: "Prototyping", coveredBy: "them" },
      { skill: "Backend", coveredBy: "gap" },{ skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" },{ skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Priya Sharma": {
    overall: 41, scheduleScore: 0, skillScore: 90, workStyleScore: 33,
    matchReasons: ["Complementary skills — good coverage"],
    warnings: ["No schedule overlap detected","Different meeting frequency (2x/wk vs 1x/wk)","Different meeting style (in-person vs online)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" },{ skill: "User Research", coveredBy: "you" },
      { skill: "Backend", coveredBy: "them" },{ skill: "Data Analysis", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" },{ skill: "Prototyping", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" },{ skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "David Park": {
    overall: 76, scheduleScore: 75, skillScore: 85, workStyleScore: 67,
    matchReasons: ["Good schedule overlap (6h/wk)","Complementary skills"],
    warnings: ["Different meeting style (in-person vs hybrid)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" },{ skill: "User Research", coveredBy: "you" },
      { skill: "Backend", coveredBy: "them" },{ skill: "Data Analysis", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" },{ skill: "Prototyping", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" },{ skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Sofia Rodriguez": {
    overall: 81, scheduleScore: 85, skillScore: 70, workStyleScore: 100,
    matchReasons: ["Strong schedule overlap (7h/wk)","Same work style preferences"],
    warnings: ["Overlapping skill sets — both do UI Design"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "both" },{ skill: "User Research", coveredBy: "both" },
      { skill: "Frontend Dev", coveredBy: "gap" },{ skill: "Prototyping", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" },{ skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" },{ skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
};

const PROFILE_TIERS = {
  good: { bg: "bg-success-bg", border: "border-success-border", text: "text-success", darkText: "text-success", trackBg: "bg-success-border", label: "Excellent Match", subtitle: "" },
  normal: { bg: "bg-warning-bg", border: "border-warning-border", text: "text-warning", darkText: "text-warning", trackBg: "bg-warning-border", label: "Moderate Match", subtitle: "Some differences to discuss." },
  bad: { bg: "bg-danger-bg", border: "border-danger-border", text: "text-danger", darkText: "text-danger-dark", trackBg: "bg-danger-border", label: "Low Compatibility", subtitle: "Schedule and work style conflicts." },
} as const;

const SCHEDULE_DATA: Record<string, { my: Set<string>; theirs: Set<string>; overlapHrs: number }> = {
  "Jesse Nguyen": { my: new Set(["Mon-1","Wed-1","Fri-1"]), theirs: new Set(["Mon-1","Wed-1","Tue-2"]), overlapHrs: 8 },
  "David Park": { my: new Set(["Mon-1","Wed-1","Fri-1"]), theirs: new Set(["Mon-1","Tue-1","Wed-1","Thu-2"]), overlapHrs: 6 },
  "Priya Sharma": { my: new Set(["Mon-1","Wed-1","Fri-1"]), theirs: new Set(["Tue-0","Thu-0"]), overlapHrs: 0 },
};

const WORK_STYLE_DATA: Record<string, [string, string, string, boolean][]> = {
  "Jesse Nguyen": [["Meeting frequency","2x/wk","2x/wk",true],["Meeting style","In-person","In-person",true],["Communication","Discord","Discord",true]],
  "David Park": [["Meeting frequency","2x/wk","2x/wk",true],["Meeting style","In-person","Hybrid",false],["Communication","Discord","Discord",true]],
  "Priya Sharma": [["Meeting frequency","2x/wk","1x/wk",false],["Meeting style","In-person","Online",false],["Communication","Discord","Discord",true]],
};

const DEADLINE_CONFIG = {
  totalDays: 21,
  tiers: [
    { min: 7, label: "On Track", color: "success" as const, desc: "Plenty of time to find your group." },
    { min: 4, label: "Reminder", color: "warning" as const, desc: "The deadline is approaching. Start reaching out!" },
    { min: 2, label: "Urgent", color: "caution" as const, desc: "Time is running out. Review system-suggested matches." },
    { min: 0, label: "Critical", color: "danger" as const, desc: "Provisional groups will auto-form if you don't act." },
  ],
};

function getDeadlineTier(daysLeft: number) {
  for (const tier of DEADLINE_CONFIG.tiers) {
    if (daysLeft >= tier.min) return tier;
  }
  return DEADLINE_CONFIG.tiers[DEADLINE_CONFIG.tiers.length - 1];
}

// Matching Board
function Board({ go }: GoProps) {
  const [secFilter, setSecFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("any");
  const [overlapFilter, setOverlapFilter] = useState("any");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("best");
  const [searchQuery, setSearchQuery] = useState("");
  const [demoTier, setDemoTier] = useState(2);
  const tierDays = [10, 5, 3, 1];
  const currentTier = getDeadlineTier(tierDays[demoTier]);

  const filteredStudents = STU.filter(st => {
    if (secFilter !== "all" && st.sec !== secFilter) return false;
    if (skillFilter !== "any") {
      const target = skillFilter === "frontend" ? "Frontend Dev" : skillFilter === "backend" ? "Backend" : skillFilter === "ui" ? "UI Design" : skillFilter === "research" ? "User Research" : skillFilter === "proto" ? "Prototyping" : skillFilter === "data" ? "Data Analysis" : skillFilter === "ux" ? "UX Writing" : "Project Mgmt";
      if (!st.skills.includes(target)) return false;
    }
    if (overlapFilter !== "any" && st.scheduleOverlapHrs < parseInt(overlapFilter)) return false;
    if (statusFilter === "looking" && st.status !== "searching") return false;
    if (statusFilter === "talking" && st.status !== "talking") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!st.name.toLowerCase().includes(q) && !st.skills.some(sk => sk.toLowerCase().includes(q)) && !st.bio.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "best": return b.compatScore - a.compatScore;
      case "overlap": return b.scheduleOverlapHrs - a.scheduleOverlapHrs;
      case "active": return parseActivityMinutes(a.lastActive) - parseActivityMinutes(b.lastActive);
      case "name": return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  const clearFilters = () => { setSecFilter("all"); setSkillFilter("any"); setOverlapFilter("any"); setStatusFilter("all"); setSearchQuery(""); setSortBy("best"); };

  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<div className="flex items-center gap-3"><Button variant="outline" size="sm" className="inline-flex items-center gap-1.5 px-4" onClick={()=>go("inbox")}><Icon.chat size={16} /> Messages</Button><Button variant="outline" size="sm" className="px-4" onClick={()=>go("mygroup")}>My Group</Button><Button variant="outline" size="sm" className="px-4" onClick={()=>go("dash")}>Dashboard</Button><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">JD</AvatarFallback></Avatar></div>} />
    <div className="max-w-[1120px] mx-auto py-10 px-12">
      <div className="flex gap-8">
        {/* Sidebar filters */}
        <div className="w-[220px] shrink-0">
          <Card className="py-5 px-[18px] gap-0 shadow-none">
            <div className="text-sm font-bold mb-4">Filters</div>
            <F l="Section">
              <Select value={secFilter} onValueChange={setSecFilter}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All Sections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="201">201</SelectItem>
                  <SelectItem value="202">202</SelectItem>
                  <SelectItem value="203">203</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F l="Skills">
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Any skill" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any skill</SelectItem>
                  <SelectItem value="frontend">Frontend Dev</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="ui">UI Design</SelectItem>
                  <SelectItem value="research">User Research</SelectItem>
                  <SelectItem value="proto">Prototyping</SelectItem>
                  <SelectItem value="data">Data Analysis</SelectItem>
                  <SelectItem value="ux">UX Writing</SelectItem>
                  <SelectItem value="pm">Project Mgmt</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F l="Min Overlap">
              <Select value={overlapFilter} onValueChange={setOverlapFilter}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="2">2+ hours</SelectItem>
                  <SelectItem value="4">4+ hours</SelectItem>
                  <SelectItem value="8">8+ hours</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F l="Status">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="looking">Looking</SelectItem>
                  <SelectItem value="talking">In talks</SelectItem>
                </SelectContent>
              </Select>
            </F>
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="flex justify-between items-end mb-4">
            <div><div className="text-[13px] text-gray-500">CSC318 · Section 201</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">Find Teammates</h1></div>
            <span className="text-[13px] text-gray-500">{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found</span>
          </div>

          {/* Search + Sort row */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2"><Icon.search size={16} color="var(--gray-400)" /></div>
              <Input className="pl-9" placeholder="Search by name, skill, or keyword..." value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best match</SelectItem>
                <SelectItem value="overlap">Most overlap</SelectItem>
                <SelectItem value="active">Recently active</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tier-aware urgent banner */}
          <div className="mb-2">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[1px] mb-1.5">Demo: Deadline Tier</div>
            <div className="flex gap-2 p-2 border-2 border-dashed border-border rounded-lg bg-secondary mb-3">
              {(["Green","Yellow","Orange","Red"] as const).map((label, i) => (
                <Button key={label} size="sm" variant={demoTier === i ? "default" : "outline"} className="text-xs px-3" onClick={() => setDemoTier(i)}>{label}</Button>
              ))}
            </div>
          </div>
          {currentTier.color !== "success" && (
            <div onClick={() => go("urgent")} className={cn("flex justify-between items-center px-[18px] py-3 rounded-[10px] border mb-[18px] cursor-pointer hover:shadow-sm transition-shadow",
              currentTier.color === "warning" ? "bg-warning-bg border-warning-border" :
              currentTier.color === "caution" ? "bg-caution-bg border-caution-border" :
              "bg-danger-bg border-danger-border"
            )}>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-bold inline-flex items-center gap-1",
                  currentTier.color === "warning" ? "text-warning" : currentTier.color === "caution" ? "text-caution" : "text-danger"
                )}><Icon.clockAlert size={16} color={currentTier.color === "warning" ? "var(--warning)" : currentTier.color === "caution" ? "var(--caution)" : "var(--danger)"} /> {tierDays[demoTier]} days left</span>
                <span className={cn("text-[13px]",
                  currentTier.color === "warning" ? "text-warning" : currentTier.color === "caution" ? "text-caution-dark" : "text-danger-dark"
                )}>{currentTier.color === "danger" ? "Provisional groups form soon!" : currentTier.desc}</span>
              </div>
              <span className={cn("text-[13px] font-semibold",
                currentTier.color === "warning" ? "text-warning" : currentTier.color === "caution" ? "text-caution" : "text-danger"
              )}>View suggestions →</span>
            </div>
          )}

          {/* Student cards or empty state */}
          {filteredStudents.length === 0 ? (
            <Card className="py-[52px] px-6 gap-0 shadow-none text-center border-dashed border-gray-300">
              <p className="text-[15px] text-gray-500 mb-4">No students match your filters.</p>
              <Button variant="outline" size="sm" className="px-4 mx-auto" onClick={clearFilters}>Clear all filters</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {filteredStudents.map((st,i)=>{const ss=SS[st.status]; const dest = st.status==="confirmed"?null:st.compatScore>=80?"profile-view-good":st.compatScore>=50?"profile-view-normal":"profile-view-bad"; return (
                <Card key={i} className={cn("p-0 gap-0 shadow-none overflow-hidden transition-colors", st.status==="confirmed"?"bg-gray-50 pointer-events-none":"cursor-pointer hover:border-gray-300 hover:shadow-sm")} onClick={()=>dest&&go(dest)}>
                  <div className="flex">
                    <div className={cn("w-16 flex flex-col items-center justify-center shrink-0 py-3 border-r", st.status==="confirmed" ? "bg-gray-100 border-gray-200" : st.overlap==="0h/wk" ? "bg-danger-bg border-danger-border" : "bg-success-bg border-success-border")}>
                      <div className={cn("text-lg font-extrabold", st.status==="confirmed" ? "text-gray-400" : st.overlap==="0h/wk" ? "text-danger" : "text-success")}>{st.overlap === "—" ? "—" : st.overlap.replace("/wk","")}</div>
                      {st.overlap !== "—" && <div className={cn("text-[10px] mt-0.5", st.overlap==="0h/wk" ? "text-danger" : "text-success")}>/wk</div>}
                      {st.status !== "confirmed" && st.compatScore > 0 && <div className={cn("text-[10px] mt-1 font-semibold", st.compatScore >= 70 ? "text-success" : st.compatScore >= 50 ? "text-warning" : "text-danger")}>{st.compatScore}%</div>}
                    </div>
                    <div className="flex-1 px-4 py-3.5">
                      <div className="flex justify-between mb-1">
                        <span className="text-[15px] font-semibold inline-flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", isRecentlyActive(st.lastActive) ? "bg-success" : "bg-gray-300")} />
                          {st.name}
                        </span>
                        <Badge variant={ss.variant} className={ss.cls}>{ss.l}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mb-1.5">Section {st.sec} · <span className="text-gray-400">{st.lastActive}</span></div>
                      <div className="flex gap-1 flex-wrap">
                        {st.skills.map(sk=><span key={sk} className="py-0.5 px-2.5 bg-gray-100 rounded-[10px] text-[11px] text-gray-600">{sk}</span>)}
                      </div>
                    </div>
                  </div>
                </Card>
              );})}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>;
}

// Unified Profile Page
function ProfilePage({ go, studentName }: ProfilePageProps) {
  const [ack, setAck] = useState(false);
  const st = STU.find(s => s.name === studentName)!;
  const c = COMPAT[studentName];
  const sched = SCHEDULE_DATA[studentName];
  const workRows = WORK_STYLE_DATA[studentName];
  const ds = ["Mon","Tue","Wed","Thu","Fri"], ts = ["9am–12pm","1–5pm","6–9pm"];
  const firstName = studentName.split(" ")[0];
  const tier: "good" | "normal" | "bad" = c.overall >= 80 ? "good" : c.overall >= 50 ? "normal" : "bad";
  const t = PROFILE_TIERS[tier];
  const hasWarnings = c.warnings.length > 0;
  const needsAck = tier === "bad" || tier === "normal";
  const sentKey = `sent-${firstName.toLowerCase()}`;

  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("board")}>← Back to Board</Button>

      {/* Header */}
      <div className="flex gap-4 items-center mb-4">
        <Avatar className="size-14"><AvatarFallback className="bg-gray-200 text-gray-500 text-lg font-bold">{st.init}</AvatarFallback></Avatar>
        <div className="flex-1">
          <div className="text-[22px] font-bold">{st.name}</div>
          <div className="text-sm text-gray-500">Section {st.sec} · Looking for group</div>
        </div>
      </div>

      {/* Compatibility Score Card */}
      <Card className={cn("p-5 mb-5 gap-0 shadow-none", t.bg, t.border)}>
        <div className="flex items-center gap-5 mb-3">
          <div className={cn("text-[42px] font-extrabold", t.text)}>{c.overall}%</div>
          <div>
            <div className={cn("text-[15px] font-bold", t.text)}>{t.label}</div>
            {t.subtitle && <div className={cn("text-[13px]", t.darkText)}>{t.subtitle}</div>}
          </div>
        </div>
        {([["Schedule", c.scheduleScore],["Skills", c.skillScore],["Work Style", c.workStyleScore]] as const).map(([label, score]) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <span className={cn("text-[11px] w-16", t.darkText)}>{label}</span>
            <div className={cn("flex-1 h-2 rounded-full overflow-hidden", t.trackBg)}>
              <div className={cn("h-full rounded-full", score >= 70 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.max(score, 3)}%` }} />
            </div>
            <span className={cn("text-[11px] font-semibold w-8 text-right", t.darkText)}>{score}%</span>
          </div>
        ))}
      </Card>

      {/* Banner */}
      {!hasWarnings ? (
        <div className="py-3.5 px-[18px] bg-success-bg rounded-[10px] border border-success-border mb-7">
          <div className="text-[15px] font-bold text-success mb-1">Strong compatibility</div>
          <div className="text-[13px] text-success leading-relaxed">No warnings — schedules, skills, and work styles align well.</div>
        </div>
      ) : (
        <div className={cn("py-3.5 px-[18px] rounded-[10px] border mb-7", tier === "bad" ? "bg-caution-bg border-caution-border" : "bg-caution-bg border-caution-border")}>
          <div className="text-[15px] font-bold text-caution mb-1">⚠ Compatibility warnings found</div>
          <div className="text-[13px] text-caution-dark leading-relaxed">{c.warnings.join(". ")}.</div>
        </div>
      )}

      {/* Schedule Overlap Grid */}
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Schedule Overlap</Label>
        <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-1">
          <div />{ds.map(d=><div key={d} className="text-center text-xs font-semibold text-gray-500 p-2">{d}</div>)}
          {ts.map((t2,ti)=><Fragment key={ti}><div className="text-[11px] text-gray-500 flex items-center">{t2}</div>
            {ds.map(d=>{const k=`${d}-${ti}`,m=sched.my.has(k),h=sched.theirs.has(k),b=m&&h;return (<div key={k} className={cn("py-3 px-1 text-center rounded-md text-[11px] font-medium", b?"bg-primary text-primary-foreground":m?"bg-schedule-self text-gray-500":h?"bg-schedule-other text-gray-400":"bg-gray-50 text-gray-300")}>{b?"✓":m?"You":h?st.init:""}</div>);})}</Fragment>)}
        </div>
        <div className="flex justify-between items-center mt-2.5">
          <div className="text-xs text-gray-500">{sched.overlapHrs > 0 && "◼ Both · "}<span className="text-gray-400">◼ You</span> · <span className="text-gray-300">◼ {firstName}</span></div>
          <div className={cn("py-1 px-3 rounded-md border", sched.overlapHrs > 0 ? "bg-success-bg border-success-border" : "bg-danger-bg border-danger-border")}>
            <span className={cn("text-[13px] font-bold", sched.overlapHrs > 0 ? "text-success" : "text-danger")}>{sched.overlapHrs}h/wk overlap</span>
          </div>
        </div>
      </div>

      {/* Skills Comparison */}
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills Comparison</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-gray-50 rounded-[10px]"><div className="text-xs font-semibold mb-2">You</div><div className="text-sm mb-1">UI Design</div><div className="text-sm">User Research</div></div>
          <div className="p-4 bg-gray-50 rounded-[10px]"><div className="text-xs font-semibold mb-2">{firstName}</div>{st.skills.map(sk=><div key={sk} className="text-sm mb-1">{sk}</div>)}</div>
        </div>
        <div className="py-2 px-3 bg-success-bg rounded-lg text-[13px] text-success mt-2.5">✓ Complementary skills</div>
      </div>

      {/* Skill Coverage Map */}
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skill Coverage Map</Label>
        <div className="grid grid-cols-4 gap-2">
          {c.skillComplementarity.map(({ skill, coveredBy }) => (
            <div key={skill} className={cn("p-2.5 rounded-lg text-center text-[12px] font-medium border",
              coveredBy === "you" ? "bg-secondary border-border text-foreground" :
              coveredBy === "them" ? "bg-success-bg border-success-border text-success" :
              coveredBy === "both" ? "bg-primary text-primary-foreground border-primary" :
              "bg-gray-50 border-dashed border-gray-300 text-gray-400"
            )}>
              <div className="text-[11px] mb-0.5">{skill}</div>
              <div className="text-[10px] opacity-75">({coveredBy})</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
          <span>◼ You</span><span className="text-success">◼ {firstName}</span><span>◼ Both</span><span className="text-gray-400">◻ Gap</span>
        </div>
      </div>

      {/* Work Style Table */}
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Work Style</Label>
        <Card className="p-0 gap-0 shadow-none overflow-hidden">
          {workRows.map(([l,y,t2,ok],i)=>(
            <div key={l} className={cn("flex justify-between items-center px-4 py-3", i<workRows.length-1 && "border-b border-gray-100", !ok && "bg-danger-bg")}>
              <span className={cn("text-[13px]", ok ? "text-gray-500" : "text-danger font-semibold")}>{l}</span>
              <div className="flex gap-3 items-center text-[13px]">
                <span>{y}</span>
                <span className="text-gray-400 text-[11px]">vs</span>
                <span>{t2}</span>
                <span className={cn("text-base", ok ? "text-success" : "text-danger")}>{ok?"✓":"✗"}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Acknowledgment checkbox (bad/normal only) */}
      {needsAck && (
        <label className="flex items-start gap-2.5 py-3.5 px-[18px] bg-gray-50 rounded-[10px] border border-gray-200 mb-5 cursor-pointer">
          <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-[3px]" id="ack-checkbox" />
          <span className="text-[13px] text-gray-600 leading-relaxed">
            {tier === "bad"
              ? "I understand there are compatibility concerns and we'll need to coordinate carefully."
              : "I understand there are some differences and we'll need to discuss them."}
          </span>
        </label>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 px-7 py-3 h-auto" onClick={()=>go("board")}>Back to Board</Button>
        <Button disabled={needsAck && !ack} className="flex-1 px-7 py-3 h-auto" onClick={()=>go(sentKey)}>Send Group Request</Button>
      </div>
    </div>
  </div>;
}

// Request Sent
function Sent({ go, targetName }: SentProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto pt-[100px] px-6 text-center">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-success-bg flex items-center justify-center"><span className="text-3xl text-success">✓</span></div>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px] text-center">Request Sent!</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed text-center">{targetName} will be notified by email. You'll hear back soon.</p>
      <div className="flex gap-3 justify-center">
        <Button className="px-7 py-3 h-auto" onClick={()=>go("board")}>Back to Board</Button>
        <Button variant="outline" className="px-7 py-3 h-auto" onClick={()=>go("inbox")}>Messages</Button>
      </div>
    </div>
  </div>;
}

// Chat
function Chat({ go }: GoProps) {
  const msgs = [
    { from: "me", text: "Hey Jesse! I saw we have 8 hours of overlap and complementary skills. Want to team up for CSC318?", time: "2:14 PM" },
    { from: "them", text: "Hey John! Yeah I checked your profile too — looks like a great fit. I'm down!", time: "2:18 PM" },
    { from: "me", text: "Awesome! Should we look for 2-3 more members? I saw Aisha Khan has project management skills.", time: "2:20 PM" },
    { from: "them", text: "Sounds good. Let's also check if anyone has backend experience.", time: "2:22 PM" },
  ];
  return <div className="bg-background min-h-screen flex flex-col">
    <Nav go={go} right={<Button variant="outline" size="sm" className="px-4" onClick={()=>go("inbox")}>← Inbox</Button>} />
    <div className="max-w-[680px] mx-auto w-full flex-1 flex flex-col px-6">
      {/* Chat header */}
      <div className="flex items-center gap-3.5 py-4 border-b border-gray-200">
        <Avatar className="size-10"><AvatarFallback className="bg-gray-200 text-gray-500 text-sm font-bold">JN</AvatarFallback></Avatar>
        <div className="flex-1">
          <div className="text-base font-semibold">Jesse Nguyen</div>
          <div className="text-xs text-gray-500">CSC318 · Section 202 · Last seen 2:22 PM</div>
        </div>
      </div>
      {/* Quick action bar */}
      <div className="flex gap-2 py-2.5 border-b border-gray-100">
        <Button variant="outline" size="sm" className="text-xs px-4" onClick={()=>go("profile-view-good")}>Compatibility</Button>
        <Button variant="outline" size="sm" className="text-xs px-4" onClick={()=>go("mygroup")}>Group</Button>
        <Button variant="outline" size="sm" className="text-xs px-4">Share Contact</Button>
      </div>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-5 flex flex-col gap-3">
        {msgs.map((m,i)=>(
          <div key={i} className={cn("flex", m.from==="me"?"justify-end":"justify-start")}>
            <div className={cn("max-w-[70%] py-2.5 px-3.5 text-sm leading-relaxed", m.from==="me"?"bg-primary text-primary-foreground rounded-[12px_12px_2px_12px]":"bg-card text-foreground border border-gray-200 rounded-[12px_12px_12px_2px]")}>
              {m.text}
              <div className="text-[11px] mt-1 opacity-50 text-right">{m.time}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Fixed input bar */}
      <div className="py-3.5 pb-[78px] border-t border-gray-200 flex gap-2.5">
        <Input className="flex-1" placeholder="Type a message..." />
        <Button size="sm" className="px-4">Send</Button>
      </div>
    </div>
  </div>;
}

// Inbox
function Inbox({ go }: GoProps) {
  const convos = [
    { name: "CSC318 Group", init: "G", last: "Aisha: I set up the shared doc", time: "3:01 PM", unread: true, isGroup: true },
    { name: "Jesse Nguyen", init: "JN", last: "Sounds good. Let's also check if anyone has backend experience.", time: "2:22 PM", unread: false, isGroup: false },
    { name: "Aisha Khan", init: "AK", last: "Hi! I'd love to join your group for CSC318.", time: "1:05 PM", unread: true, isGroup: false },
  ];
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<div className="flex items-center gap-3"><Button variant="outline" size="sm" className="px-4" onClick={()=>go("dash")}>Dashboard</Button><Button variant="outline" size="sm" className="px-4" onClick={()=>go("board")}>Board</Button><Button variant="outline" size="sm" className="px-4" onClick={()=>go("mygroup")}>My Group</Button><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">JD</AvatarFallback></Avatar></div>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Messages</h1>

      {/* Course tabs */}
      <div className="flex gap-1 mb-6" role="tablist">
        <button type="button" role="tab" aria-selected={true} className="py-[7px] px-4 rounded-lg text-[13px] font-semibold bg-primary text-primary-foreground cursor-pointer">CSC318</button>
        <button type="button" role="tab" aria-selected={false} className="py-[7px] px-4 rounded-lg text-[13px] font-medium bg-gray-100 text-gray-500 cursor-pointer">CSC207</button>
      </div>

      {convos.map((cv,i)=>(
        <Card key={i} className="p-5 mb-3.5 shadow-none cursor-pointer flex-row items-center gap-3.5 hover:border-gray-300 hover:shadow-sm transition-colors" onClick={()=>go("chat")}>
          <Avatar className="size-11"><AvatarFallback className={cn("text-sm font-bold", cv.isGroup ? "bg-success-bg text-success" : "bg-gray-200 text-gray-500")}>{cv.init}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-0.5">
              <span className={cn("text-sm", cv.unread?"font-bold":"font-medium")}>{cv.name}</span>
              <span className="text-xs text-gray-400">{cv.time}</span>
            </div>
            <div className="text-[13px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">{cv.last}</div>
          </div>
          {cv.unread&&<div className="w-2 h-2 rounded-full bg-secondary0 shrink-0"><span className="sr-only">Unread</span></div>}
        </Card>
      ))}
    </div>
  </div>;
}

// My Group
function MyGroup({ go }: GoProps) {
  const [confirmed, setConfirmed] = useState(false);
  const membersPartial = [
    { name: "John D.", init: "JD", skills: ["UI Design","User Research"], role: "You", platform: "Discord", handle: "john.d" },
    { name: "Jesse Nguyen", init: "JN", skills: ["Frontend Dev","Prototyping"], role: "Member", platform: "Discord", handle: "jesse.dev" },
    { name: "Aisha Khan", init: "AK", skills: ["Project Mgmt","UX Writing"], role: "Member", platform: "WhatsApp", handle: "+1 (647) 555-0123" },
  ];
  const membersFull = [
    ...membersPartial,
    { name: "David Park", init: "DP", skills: ["Backend","Data Analysis"], role: "Member", platform: "Discord", handle: "dpark.dev" },
  ];
  const members = confirmed ? membersFull : membersPartial;
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<Button variant="outline" size="sm" className="px-4" onClick={()=>go("dash")}>Dashboard</Button>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("dash")}>← Dashboard</Button>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">My Group — CSC318</h1>

      {/* Toggle for demo */}
      <div className="mb-5">
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[1px] mb-1.5">Demo Controls</div>
        <div className="flex gap-2 p-2 border-2 border-dashed border-border rounded-lg bg-secondary">
          <Button size="sm" variant={!confirmed?"default":"outline"} className="text-xs px-4" onClick={()=>setConfirmed(false)}>Before confirm (3/4)</Button>
          <Button size="sm" variant={confirmed?"default":"outline"} className="text-xs px-4" onClick={()=>setConfirmed(true)}>After confirm (4/4)</Button>
        </div>
      </div>

      {!confirmed ? (
        <>
          <p className="text-base text-gray-600 mb-9 leading-relaxed">3/4–6 members — need 1+ more.</p>
          <div className="flex justify-between items-center px-4 py-3 bg-warning-bg rounded-[10px] mb-5 border border-warning-border">
            <span className="text-[13px] text-warning font-semibold">Group not yet confirmed</span>
            <Button size="sm" variant="secondary" className="text-xs px-4" onClick={()=>go("board")}>Find more members</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-base text-gray-600 mb-9 leading-relaxed">4/4–6 — Confirmed!</p>
          <div className="flex justify-between items-center px-4 py-3 bg-success-bg rounded-[10px] mb-5 border border-success-border">
            <span className="text-[13px] text-success font-semibold">✓ Group confirmed</span>
            <span className="text-xs text-success">Submitted to instructor</span>
          </div>
        </>
      )}

      {members.map((m,i)=>(
        <Card key={i} className="p-5 mb-3.5 shadow-none flex-row items-center gap-3.5">
          <Avatar className="size-11"><AvatarFallback className="bg-gray-200 text-gray-500 text-sm font-bold">{m.init}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="text-sm font-semibold">{m.name}</span>
              <span className="text-xs text-gray-500">{m.role}</span>
            </div>
            <div className="flex gap-1 mt-1">{m.skills.map(sk=><span key={sk} className="py-0.5 px-2 bg-gray-100 rounded-lg text-[11px] text-gray-600">{sk}</span>)}</div>
          </div>
        </Card>
      ))}

      {/* Workspace cards (confirmed only) */}
      {confirmed && <>
        <Separator className="my-6 bg-gray-100" />

        {/* Contact Exchange */}
        <Card className="p-5 mb-3.5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Contact Exchange</Label>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50"><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Name</th><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Platform</th><th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Handle</th></tr></thead>
              <tbody>
                {membersFull.map((m, i) => (
                  <tr key={i} className={i < membersFull.length - 1 ? "border-b border-gray-100" : ""}>
                    <td className="py-2 px-3 font-medium">{m.name}</td>
                    <td className="py-2 px-3 text-gray-500">{m.platform}</td>
                    <td className="py-2 px-3 text-gray-600 font-mono text-[13px]">{m.handle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Project Board */}
        <Card className="p-5 mb-3.5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Project Board</Label>
          {([
            { task: "Set up shared Google Doc", assignee: "Aisha", done: true },
            { task: "Draft project proposal outline", assignee: "John", done: false },
            { task: "Research competitor apps", assignee: "Jesse", done: false },
          ]).map((t, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100">
              <Checkbox checked={t.done} disabled />
              <span className={cn("text-sm flex-1", t.done && "line-through text-gray-400")}>{t.task}</span>
              <span className="text-[11px] text-gray-500 bg-gray-100 py-0.5 px-2 rounded-full">{t.assignee}</span>
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-3 text-xs px-4">+ Add task</Button>
        </Card>

        {/* Group Availability */}
        <Card className="p-5 mb-3.5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Group Availability</Label>
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]">
            <div />{["Mon","Tue","Wed","Thu","Fri"].map(d=><div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
            {["9am–12pm","1–5pm","6–9pm"].map((t,ti)=><Fragment key={ti}>
              <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
              {["Mon","Tue","Wed","Thu","Fri"].map(d=>{
                const counts: Record<string, number> = {"Mon-0":2,"Mon-1":4,"Tue-1":2,"Tue-2":1,"Wed-0":2,"Wed-1":3,"Thu-2":1,"Fri-1":3};
                const c = counts[`${d}-${ti}`] || 0;
                return <div key={d} className={cn("py-2.5 px-1 text-center rounded-md text-[10px] font-medium",
                  c >= 4 ? "bg-primary text-primary-foreground" :
                  c >= 3 ? "bg-success text-white" :
                  c >= 2 ? "bg-success-bg text-success" :
                  c >= 1 ? "bg-gray-100 text-gray-500" :
                  "bg-gray-50 text-gray-300"
                )}>{c > 0 ? `${c}/4` : ""}</div>;
              })}
            </Fragment>)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2">Darker = more members available</div>
        </Card>
      </>}

      <div className="flex gap-3 mt-6">
        <Button className="flex-1 px-7 py-3 h-auto" onClick={()=>go("inbox")}>Messages</Button>
        {!confirmed ? (
          <Button variant="outline" disabled className="flex-1 px-7 py-3 h-auto">Confirm Group (need 4+)</Button>
        ) : (
          <Button variant="outline" className="flex-1 px-7 py-3 h-auto" onClick={()=>go("board")}>Find more members</Button>
        )}
      </div>
    </div>
  </div>;
}

// Urgent Matching
function Urgent({ go }: GoProps) {
  const [taSent, setTaSent] = useState(false);
  const daysLeft = 3;
  const tier = getDeadlineTier(daysLeft);
  const elapsed = DEADLINE_CONFIG.totalDays - daysLeft;
  const pct = Math.round((elapsed / DEADLINE_CONFIG.totalDays) * 100);
  const recs = [
    { name: "David Park", init: "DP", skills: ["Backend","Data Analysis"], compat: "76%", overlap: "6h/wk", route: "profile-view-normal" },
    { name: "Lisa Wang", init: "LW", skills: ["Frontend Dev","UX Writing"], compat: "68%", overlap: "4h/wk", route: "profile-view-normal" },
    { name: "Omar Ali", init: "OA", skills: ["Project Mgmt"], compat: "52%", overlap: "2h/wk", route: "profile-view-bad" },
  ];
  const provisionalMembers = [
    { name: "You (John D.)", init: "JD", skills: ["UI Design","User Research"] },
    { name: "Omar Ali", init: "OA", skills: ["Project Mgmt"] },
    { name: "Wei Zhang", init: "WZ", skills: ["Frontend Dev","Backend"] },
    { name: "Elena Popov", init: "EP", skills: ["Data Analysis","UX Writing"] },
  ];
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("board")}>← Back to Board</Button>

      {/* Deadline progress bar */}
      <Card className="p-5 mb-5 gap-0 shadow-none">
        <div className="flex justify-between items-center mb-2">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px]">Group Formation Deadline</Label>
          <span className="text-[13px] font-bold text-danger">{daysLeft} days remaining</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full bg-danger transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-gray-500">
          <span>Started Feb 15</span>
          <span>{pct}% elapsed</span>
          <span>Due Mar 8</span>
        </div>
      </Card>

      {/* Tier-aware banner */}
      <div className={cn("py-3.5 px-[18px] rounded-[10px] mb-6 border",
        tier.color === "danger" ? "bg-danger-bg border-danger-border" :
        tier.color === "caution" ? "bg-caution-bg border-caution-border" :
        "bg-warning-bg border-warning-border"
      )}>
        <div className={cn("text-[15px] font-bold flex items-center gap-1",
          tier.color === "danger" ? "text-danger" : tier.color === "caution" ? "text-caution" : "text-warning"
        )}><Icon.clockAlert size={16} color={tier.color === "danger" ? "var(--danger)" : tier.color === "caution" ? "var(--caution)" : "var(--warning)"} /> {tier.label} — Deadline in {daysLeft} days</div>
        <div className={cn("text-[13px] leading-relaxed",
          tier.color === "danger" ? "text-danger-dark" : tier.color === "caution" ? "text-caution-dark" : "text-warning"
        )}>{tier.desc}</div>
      </div>

      <h1 className="text-[28px] font-bold text-foreground mb-5 -tracking-[0.5px]">Suggested Matches</h1>
      {recs.map((r,i)=>(
        <Card key={i} className="p-5 mb-3.5 shadow-none cursor-pointer flex-row items-center gap-3.5 hover:border-gray-300 hover:shadow-sm transition-colors" onClick={()=>go(r.route)}>
          <Avatar className="size-[46px]"><AvatarFallback className="bg-gray-200 text-gray-500 text-[15px] font-bold">{r.init}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{r.name}</div>
            <div className="flex gap-1 mt-1">{r.skills.map(sk=><span key={sk} className="py-0.5 px-2 bg-gray-100 rounded-lg text-[11px] text-gray-600">{sk}</span>)}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{r.compat}</div>
            <div className="text-[11px] text-gray-500">overlap: {r.overlap}</div>
          </div>
        </Card>
      ))}

      {/* Provisional Group */}
      <Separator className="my-6 bg-gray-100" />
      <Card className="p-5 gap-0 shadow-none border-dashed border-caution-border bg-caution-bg mb-5">
        <div className="text-[15px] font-bold text-caution mb-1">Provisional Group</div>
        <div className="text-[13px] text-caution-dark leading-relaxed mb-4">Auto-forms at deadline if no action taken.</div>
        {provisionalMembers.map((m, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-caution-border last:border-0">
            <Avatar className="size-8"><AvatarFallback className="bg-white text-caution text-xs font-bold">{m.init}</AvatarFallback></Avatar>
            <span className="text-sm font-medium flex-1">{m.name}</span>
            <div className="flex gap-1">{m.skills.map(sk => <span key={sk} className="py-0.5 px-2 bg-white rounded-lg text-[10px] text-caution-dark">{sk}</span>)}</div>
          </div>
        ))}
        <div className="flex gap-3 mt-4">
          <Button size="sm" className="flex-1 text-xs px-4">Accept this group</Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs px-4" onClick={() => go("board")}>I'll find my own</Button>
        </div>
      </Card>

      {taSent ? (
        <div className="py-3.5 px-[18px] bg-success-bg rounded-[10px] border border-success-border text-center">
          <span className="text-[13px] font-semibold text-success">✓ Your TA has been notified and will follow up by email.</span>
        </div>
      ) : (
        <Button variant="outline" className="w-full px-7 py-3 h-auto" onClick={()=>setTaSent(true)}>Ask TA for help</Button>
      )}
    </div>
  </div>;
}

// Email Notification Mockup
function EmailMock({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("dash")}>← Back</Button>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Email Notification Preview</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">This is what students receive when someone messages them.</p>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-card">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs text-gray-500 mb-1">From: <strong>unitor for CSC318</strong> &lt;notify@unitor.app&gt;</div>
          <div className="text-xs text-gray-500 mb-1">To: jesse.nguyen@mail.utoronto.ca</div>
          <div className="text-sm font-semibold">Subject: [CSC318] John D. sent you a message</div>
        </div>
        <div className="p-7">
          <div className="text-center mb-5"><span className="text-xl font-extrabold">unitor</span></div>
          <div className="text-[15px] mb-3">Hi Jesse,</div>
          <div className="text-sm text-gray-600 leading-[1.7] mb-5">
            <strong>John D.</strong> sent you a message in <strong>CSC318</strong>:
          </div>
          <div className="py-3.5 px-[18px] bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed mb-6 border-l-[3px] border-l-primary">
            "Hey Jesse! I saw we have 8 hours of overlap and complementary skills. Want to team up for CSC318?"
          </div>
          <div className="text-center mb-6">
            <div className="inline-block py-3 px-8 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">View on unitor →</div>
          </div>
          <Separator className="my-5 bg-gray-100" />
          <div className="text-xs text-gray-400 text-center">You received this because you're enrolled in CSC318 on unitor.<br />University of Toronto · Winter 2026</div>
        </div>
      </div>
    </div>
  </div>;
}

// Login Page (Fix #2)
function Login({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Welcome back</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Log in with your university email.</p>
      <F l="University Email" id="login-email"><Input id="login-email" placeholder="you@mail.utoronto.ca" /></F>
      <F l="Password" id="login-password"><Input id="login-password" type="password" placeholder="Your password" /></F>
      <Button className="w-full px-7 py-3 h-auto" onClick={()=>go("dash")}>Log In</Button>
      <div className="mt-3.5 text-center"><Button variant="link" className="text-foreground">Forgot password?</Button></div>
      <div className="mt-5 text-center text-sm text-gray-500">Don't have an account? <Button variant="link" className="text-foreground p-0 h-auto" onClick={()=>go("signup-role")}>Sign up</Button></div>
    </div>
  </div>;
}

// ==================== APP ====================
export default function Unitor() {
  const [pg, setPg] = useState("landing");
  const [role, setRole] = useState("s");
  const [sentTarget, setSentTarget] = useState("Jesse");
  const go = (p: string) => {
    if(p==="signup-s"){setRole("s");setPg("signup")}
    else if(p==="signup-t"){setRole("t");setPg("signup")}
    else if(p==="sent-jesse"){setSentTarget("Jesse");setPg("sent")}
    else if(p==="sent-david"){setSentTarget("David");setPg("sent")}
    else if(p==="sent-priya"){setSentTarget("Priya");setPg("sent")}
    else if(p==="sent"){setPg("sent")}
    else setPg(p);
    window.scrollTo(0, 0);
  };

  const P: Record<string, ReactNode> = {
    landing:<Landing go={go}/>, "signup-role":<SignupRole go={go}/>, signup:<SignupForm role={role} go={go}/>, verify:<Verify role={role} go={go}/>,
    login:<Login go={go}/>,
    dash:<Dash go={go}/>, join:<Join go={go}/>,
    "prof-0":<Prof0 go={go}/>, "prof-1":<Prof1 go={go}/>, "prof-2":<Prof2 go={go}/>, "prof-3":<Prof3 go={go}/>, "prof-done":<ProfDone go={go}/>,
    "ta-dash":<TADash go={go}/>, "ta-create":<TACreate go={go}/>,
    board:<Board go={go}/>,
    "profile-view-good":<ProfilePage go={go} studentName="Jesse Nguyen" />,
    "profile-view-normal":<ProfilePage go={go} studentName="David Park" />,
    "profile-view-bad":<ProfilePage go={go} studentName="Priya Sharma" />,
    sent:<Sent go={go} targetName={sentTarget}/>,
    chat:<Chat go={go}/>, inbox:<Inbox go={go}/>, mygroup:<MyGroup go={go}/>,
    urgent:<Urgent go={go}/>, email:<EmailMock go={go}/>,
  };

  const nav = [
    { g: "Onboard", p: ["landing","login","signup-role","signup","verify"] },
    { g: "Student", p: ["dash","join","prof-0","prof-1","prof-2","prof-3","prof-done"] },
    { g: "Board", p: ["board","profile-view-good","profile-view-normal","profile-view-bad","sent"] },
    { g: "Social", p: ["chat","inbox","mygroup","urgent","email"] },
    { g: "TA", p: ["ta-dash","ta-create"] },
  ];

  return <div>
    {P[pg]}
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border py-2 px-4 flex gap-4 items-center z-[999] flex-wrap">
      {nav.map(n=><div key={n.g} className="flex items-center gap-[3px]">
        <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">{n.g}</span>
        {n.p.map(p=><button key={p} onClick={()=>setPg(p)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", pg===p ? "border-[1.5px] border-primary bg-primary text-primary-foreground" : "border-gray-200 bg-card text-gray-500")}>{p}</button>)}
      </div>)}
    </div>
  </div>;
}
