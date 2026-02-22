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
}

interface StatusInfo {
  l: string;
  variant?: "success" | "warning" | "danger";
  cls?: string;
}

// ==================== HELPERS ====================
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
          {ds.map(d=>{ const k=`${d}-${ti}`; return <button key={k} type="button" role="checkbox" aria-checked={sel.has(k)} aria-label={`${d} ${t}`} onClick={()=>tog(k)} className={cn("py-2.5 px-1 text-center rounded-md cursor-pointer text-xs font-medium", sel.has(k) ? "bg-primary text-primary-foreground" : "bg-gray-50 text-gray-400")} />; })}
        </Fragment>)}
      </div>
    </div>
  );
}

// ==================== ICONS ====================
const Icon: Record<string, (props: IconProps) => ReactElement> = {
  graduation: ({ size = 24, color = "#202023" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 13c-2.755 0-5-2.245-5-5V3.5H4V2h14.75c.69 0 1.25.56 1.25 1.25V9h-1.5V3.5H17V8c0 2.755-2.245 5-5 5ZM8.5 8c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V7h-7v1Zm0-2.5h7v-2h-7v2Zm6.43 9a4.752 4.752 0 0 1 4.59 3.52l1.015 3.785-1.45.39-1.015-3.785A3.253 3.253 0 0 0 14.93 16H9.07c-1.47 0-2.76.99-3.14 2.41l-1.015 3.785-1.45-.39L4.48 18.02a4.762 4.762 0 0 1 4.59-3.52h5.86Z" fill={color}/>
    </svg>
  ),
  clipboard: ({ size = 24, color = "#202023" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.105 5H5.5v15.5h5V22H4V3.5h3V2h10v1.5h3V11h-1.5V5h-1.605c-.33 1.15-1.39 2-2.645 2h-4.5c-1.26 0-2.315-.85-2.645-2ZM15.5 3.5h-7v.75c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25V3.5Zm2.22 9.72a2.164 2.164 0 1 1 3.06 3.06l-5.125 5.125-2.22.74a1.237 1.237 0 0 1-1.28-.3c-.335-.34-.45-.83-.3-1.28l.74-2.22 5.125-5.125Zm-2.875 6.875 4.875-4.875a.664.664 0 1 0-.94-.94l-4.875 4.875-.47 1.41 1.41-.47Z" fill={color}/>
    </svg>
  ),
  email: ({ size = 24, color = "#202023" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M19.25 20H6.5v-1.5h12.75c.69 0 1.25-.56 1.25-1.25V9.46L12 14.37 2 8.595V6.75A2.755 2.755 0 0 1 4.75 4h14.5A2.755 2.755 0 0 1 22 6.75v10.5A2.755 2.755 0 0 1 19.25 20ZM3.5 7.725 12 12.63l8.5-4.905V6.75c0-.69-.56-1.25-1.25-1.25H4.75c-.69 0-1.25.56-1.25 1.25v.975ZM9 15H3.5v1.5H9V15Zm-7-3h2.5v1.5H2V12Z" fill={color}/>
    </svg>
  ),
  books: ({ size = 24, color = "#202023" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 4a3.745 3.745 0 0 0-3 1.51A3.745 3.745 0 0 0 9 4H2v16h7.5c.69 0 1.25.56 1.25 1.25h2.5c0-.69.56-1.25 1.25-1.25H22V4h-7Zm-3.75 15.13a2.726 2.726 0 0 0-1.75-.63h-6v-13H9c1.24 0 2.25 1.01 2.25 2.25v11.38Zm9.25-.63h-6c-.665 0-1.275.235-1.75.63V7.75c0-1.24 1.01-2.25 2.25-2.25h5.5v13Z" fill={color}/>
    </svg>
  ),
  camera: ({ size = 24, color = "#202023" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2 17.25A2.755 2.755 0 0 0 4.75 20h14.5A2.755 2.755 0 0 0 22 17.25v-9a2.755 2.755 0 0 0-2.75-2.75h-2.64l-2-2.5H9.39l-2 2.5H4.75A2.755 2.755 0 0 0 2 8.25v9ZM8.11 7l2-2.5h3.78l2 2.5h3.36c.69 0 1.25.56 1.25 1.25v9c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-9C3.5 7.56 4.06 7 4.75 7h3.36Zm-.61 5.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5S14.48 8 12 8s-4.5 2.02-4.5 4.5Zm1.5 0c0-1.655 1.345-3 3-3s3 1.345 3 3-1.345 3-3 3-3-1.345-3-3Z" fill={color}/>
    </svg>
  ),
  search: ({ size = 24, color = "#202023" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m21.78 20.72-5.62-5.62A7.96 7.96 0 0 0 18 10c0-4.41-3.59-8-8-8s-8 3.59-8 8 3.59 8 8 8a7.96 7.96 0 0 0 5.1-1.84l5.62 5.62 1.06-1.06ZM10 16.5A6.506 6.506 0 0 1 3.5 10c0-3.585 2.915-6.5 6.5-6.5s6.5 2.915 6.5 6.5-2.915 6.5-6.5 6.5Z" fill={color}/>
    </svg>
  ),
  balance: ({ size = 24, color = "#202023" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.75 12.5h9.265l-.02-.77a9.99 9.99 0 0 0-9.725-9.725l-.77-.02v9.265c0 .69.56 1.25 1.25 1.25Zm7.69-1.5H13V3.56A8.493 8.493 0 0 1 20.44 11ZM3.5 12c0 4.685 3.815 8.5 8.5 8.5 3.965 0 7.345-2.785 8.255-6.5h1.535c-.94 4.545-5 8-9.79 8-5.515 0-10-4.485-10-10 0-4.83 3.44-8.87 8-9.8v1.545C6.275 4.65 3.5 8.005 3.5 12Z" fill={color}/>
    </svg>
  ),
  chat: ({ size = 24, color = "#202023" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155ZM3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94V5.75Zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19l1.925 1.925Z" fill={color}/>
    </svg>
  ),
  clockAlert: ({ size = 24, color = "#202023" }: IconProps) => (
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
      <p className="text-lg text-gray-600 max-w-[520px] mx-auto mb-11 leading-[1.7]">unitor matches you with classmates based on skills, schedules, and work style. No more blind emails or last-minute scrambles.</p>
      <div className="flex gap-3.5 justify-center">
        <Button className="px-9 py-3.5 text-base h-auto" onClick={()=>go("signup-role")}>Get Started</Button>
        <Button variant="outline" className="px-9 py-3.5 text-base h-auto" onClick={()=>go("login")}>Log In</Button>
      </div>
    </div>
    <div className="max-w-[880px] mx-auto px-6 pb-[100px] grid grid-cols-3 gap-5">
      {(["Discover","Compare","Connect"] as const).map((t,i)=>{
        const descs = ["Browse who's available. See skills, schedules, and status at a glance.","Check compatibility before you commit. Schedule overlap, work style, skill balance.","Chat directly. Coordinate on your preferred platform. Form your group."];
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
        <Card key={r.t} className="p-5 mb-3.5 shadow-none cursor-pointer flex-row items-center gap-4" onClick={()=>go(r.to)}>
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
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 1 of 2: Account</div>
      <Progress value={(1/2)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Create your account</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">We'll send a verification link to your university email.</p>
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
      {showError && <div className="text-[13px] text-danger mb-4">Passwords do not match. Please try again.</div>}
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
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 2 of 2: Account</div>
      <Progress value={(2/2)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <div className="mb-5"><Icon.email size={48} /></div>
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
        <div className="mb-3"><Icon.books size={36} /></div>
        <p className="text-[15px] text-gray-500 mb-4">No courses yet.</p>
        <Button variant="outline" size="sm" className="px-4 mx-auto" onClick={()=>go("join")}>Join your first course</Button>
      </Card>
      <div className="mt-2.5" />
      <Card className="p-5 mb-3.5 gap-0 shadow-none cursor-pointer" onClick={()=>go("board")}>
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
        <p className="text-base text-gray-600 mb-9 leading-relaxed">Enter the 6-character code shared by your TA.</p>
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
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("join")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 1 of 4: Profile</div>
      <Progress value={(1/4)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Your Profile</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">This is how other students will see you in this course. You can use a different name and photo for each course.</p>
      <div className="text-center mb-7">
        <Avatar className="size-[88px] mx-auto mb-3 border-2 border-dashed border-gray-300 bg-gray-50">
          <AvatarFallback className="bg-gray-50"><Icon.camera size={28} color="#c4c2bf" /></AvatarFallback>
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
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 2 of 4: Profile</div>
      <Progress value={(2/4)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Your Skills</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Select relevant skills. Add custom ones if needed.</p>
      <div className="mb-5">
        {pre.map(sk=><button key={sk} type="button" aria-pressed={sel.includes(sk)} className={cn("inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px]", sel.includes(sk) ? "bg-primary text-primary-foreground border-primary" : "bg-gray-100 text-gray-600 border-gray-200")} onClick={()=>tog(sk)}>{sk}</button>)}
        <button type="button" className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-gray-100 text-gray-600 border-gray-200 border-dashed">+ Custom</button>
      </div>
      {sel.length>0&&<Card className="p-0 mb-6 gap-0 shadow-none overflow-hidden">
        {sel.map((sk,i)=><div key={sk} className={cn("flex justify-between items-center px-5 py-3", i<sel.length-1 && "border-b border-gray-100")}>
          <span className="text-sm font-medium">{sk}</span>
          <div className="flex gap-1">{lvl.map(l=><button key={l} type="button" aria-pressed={rat[sk]===l} className={cn("py-1 px-2.5 rounded-md text-xs font-medium cursor-pointer", rat[sk]===l ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-500")} onClick={()=>setRat({...rat,[sk]:l})}>{l}</button>)}</div>
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
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 3 of 4: Profile</div>
      <Progress value={(3/4)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Section & Schedule</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">This helps us find teammates with compatible availability.</p>
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
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 4 of 4: Profile</div>
      <Progress value={(4/4)*100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Communication & About You</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Let potential teammates know how to reach you.</p>
      <div className="mb-5">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Preferred Platforms</Label>
        <div className="flex flex-wrap gap-1.5">{plats.map(p=><button key={p} type="button" aria-pressed={sp.includes(p)} className={cn("inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer border-[1.5px]", sp.includes(p) ? "bg-primary text-primary-foreground border-primary" : "bg-gray-100 text-gray-600 border-gray-200")} onClick={()=>tp(p)}>{p}</button>)}</div>
      </div>
      {sp.length>0&&<div className={cn("grid gap-3 mb-5", sp.length>1?"grid-cols-2":"grid-cols-1")}>
        {sp.map(p=><F key={p} l={`${p} handle`}><Input placeholder={`Your ${p} username`} /></F>)}
      </div>}
      <Separator className="my-6 bg-gray-100" />
      <F l="About You"><Textarea className="min-h-[100px] resize-y" placeholder="Tell potential teammates about yourself. What kind of group are you looking for?" /><div className="text-[13px] text-gray-500 leading-relaxed text-right mt-1">0/300</div></F>
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
      <div className="text-5xl mb-5">✓</div>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Profile Complete!</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">You're all set. Head to the board to start finding teammates.</p>
      <Button className="px-9 py-3.5 text-base h-auto" onClick={()=>go("board")}>Go to Matching Board</Button>
    </div>
  </div>;
}

// TA Dashboard
function TADash({ go }: GoProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText("W543M7").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<div className="flex items-center gap-2.5"><span className="text-sm text-gray-600">Prof. Truong</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">KT</AvatarFallback></Avatar></div>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">TA Dashboard</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">My Courses</h1></div>
        <Button size="sm" className="px-4" onClick={()=>go("ta-create")}>+ Create Course</Button>
      </div>
      <Card className="p-5 gap-0 shadow-none">
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
        <p className="text-[13px] text-gray-500 leading-relaxed mt-2">Share this code with students via Quercus or announcements.</p>
      </Card>
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
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Students will use the generated code to join.</p>
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
        <p className="text-[13px] text-gray-500 leading-relaxed mb-2.5">Students will select from these when they join.</p>
        <div>{skills.map(sk=><span key={sk} className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-primary text-primary-foreground border-primary">{sk} <span className="ml-1.5 opacity-60 cursor-pointer" onClick={()=>setSkills(skills.filter(x=>x!==sk))}>×</span></span>)}<span className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-gray-100 text-gray-600 border-gray-200 border-dashed">+ Add Skill</span></div>
      </div>
      <Button className="w-full px-7 py-3 h-auto" onClick={()=>go("ta-dash")}>Create Course</Button>
    </div>
  </div>;
}

// Student data
const STU: Student[] = [
  { name: "Jesse Nguyen", sec: "202", skills: ["Frontend Dev","Prototyping"], status: "searching", overlap: "8h/wk", init: "JN", bio: "Love building things. Looking for a design-focused team.", rat: {"Frontend Dev":"Proficient","Prototyping":"Expert"} },
  { name: "Priya Sharma", sec: "201", skills: ["Backend","Data Analysis"], status: "searching", overlap: "0h/wk", init: "PS", bio: "Data nerd. Prefer async work.", rat: {"Backend":"Proficient","Data Analysis":"Expert"} },
  { name: "Marcus Lee", sec: "201", skills: ["UI Design","Frontend Dev"], status: "talking", overlap: "5h/wk", init: "ML", bio: "Design + code. In talks with a group.", rat: {"UI Design":"Proficient","Frontend Dev":"Intermediate"} },
  { name: "Aisha Khan", sec: "203", skills: ["Project Mgmt","UX Writing"], status: "searching", overlap: "3h/wk", init: "AK", bio: "Organized and reliable.", rat: {"Project Mgmt":"Expert","UX Writing":"Proficient"} },
  { name: "Tom Chen", sec: "201", skills: ["Backend","Prototyping"], status: "confirmed", overlap: "—", init: "TC", bio: "", rat: {} },
];
const SS: Record<string, StatusInfo> = {
  searching: { l: "Looking", variant: "success" },
  talking: { l: "In talks", variant: "warning" },
  confirmed: { l: "Grouped", cls: "bg-gray-100 text-gray-500 border-transparent" },
};

// Matching Board
function Board({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<div className="flex items-center gap-3"><Button variant="outline" size="sm" className="inline-flex items-center gap-1.5 px-4" onClick={()=>go("inbox")}><Icon.chat size={16} /> Messages</Button><Button variant="outline" size="sm" className="px-4" onClick={()=>go("mygroup")}>My Group</Button><Button variant="outline" size="sm" className="px-4" onClick={()=>go("dash")}>Dashboard</Button><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">JD</AvatarFallback></Avatar></div>} />
    <div className="max-w-[1120px] mx-auto py-10 px-12">
      <div className="flex gap-8">
        {/* Sidebar filters */}
        <div className="w-[220px] shrink-0">
          <Card className="py-5 px-[18px] gap-0 shadow-none">
            <div className="text-sm font-bold mb-4">Filters</div>
            <F l="Section">
              <Select defaultValue="all">
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
              <Select defaultValue="any">
                <SelectTrigger className="w-full"><SelectValue placeholder="Any skill" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any skill</SelectItem>
                  <SelectItem value="frontend">Frontend Dev</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="ui">UI Design</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F l="Min Overlap">
              <Select defaultValue="any">
                <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="4">4+ hours</SelectItem>
                  <SelectItem value="8">8+ hours</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F l="Status">
              <Select defaultValue="all">
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
            <span className="text-[13px] text-gray-500">14 students looking</span>
          </div>
          {/* Urgent banner */}
          <div onClick={()=>go("urgent")} className="flex justify-between items-center px-[18px] py-3 bg-danger-bg rounded-[10px] border border-danger-border mb-[18px] cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-danger inline-flex items-center gap-1"><Icon.clockAlert size={16} color="#c1292e" /> D-3</span>
              <span className="text-[13px] text-danger-dark">4 students still ungrouped</span>
            </div>
            <span className="text-[13px] font-semibold text-danger">View suggestions →</span>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {STU.map((st,i)=>{const ss=SS[st.status]; const dest = st.status==="confirmed"?null:st.overlap==="0h/wk"?"snap-warn":"profile-view"; return (
              <Card key={i} className={cn("p-0 gap-0 shadow-none overflow-hidden transition-colors", st.status==="confirmed"?"bg-gray-50 pointer-events-none":"cursor-pointer hover:border-gray-300 hover:shadow-sm")} onClick={()=>dest&&go(dest)}>
                <div className="flex">
                  {/* Overlap highlight strip */}
                  <div className={cn("w-16 flex flex-col items-center justify-center shrink-0 py-3 border-r", st.status==="confirmed" ? "bg-gray-100 border-gray-200" : st.overlap==="0h/wk" ? "bg-danger-bg border-danger-border" : "bg-success-bg border-success-border")}>
                    <div className={cn("text-lg font-extrabold", st.status==="confirmed" ? "text-gray-400" : st.overlap==="0h/wk" ? "text-danger" : "text-success")}>{st.overlap === "—" ? "—" : st.overlap.replace("/wk","")}</div>
                    {st.overlap !== "—" && <div className={cn("text-[10px] mt-0.5", st.overlap==="0h/wk" ? "text-danger" : "text-success")}>/wk</div>}
                    {st.overlap !== "—" && st.overlap !== "0h/wk" && <div className="text-[10px] mt-0.5 text-success">✓</div>}
                    {st.overlap === "0h/wk" && <div className="text-[10px] mt-0.5 text-danger">⚠</div>}
                  </div>
                  <div className="flex-1 px-4 py-3.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[15px] font-semibold">{st.name}</span>
                      <Badge variant={ss.variant} className={ss.cls}>{ss.l}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-1.5">Section {st.sec}</div>
                    <div className="flex gap-1 flex-wrap">
                      {st.skills.map(sk=><span key={sk} className="py-0.5 px-2.5 bg-gray-100 rounded-[10px] text-[11px] text-gray-600">{sk}</span>)}
                    </div>
                  </div>
                </div>
              </Card>
            );})}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// Student Profile Detail
function ProfileView({ go }: GoProps) {
  const st = STU[0];
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("board")}>← Back to Board</Button>
      <div className="flex gap-5 items-center mb-6">
        <Avatar className="size-[72px]"><AvatarFallback className="bg-gray-200 text-gray-500 text-2xl font-bold">{st.init}</AvatarFallback></Avatar>
        <div className="flex-1">
          <h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px] mb-1">{st.name}</h1>
          <div className="text-sm text-gray-500">Section {st.sec} · <span className="text-success font-semibold">Looking for group</span></div>
        </div>
        <Button variant="outline" className="px-5 py-2.5 text-[13px] h-auto" onClick={()=>go("sent-jesse")}>Send Group Request</Button>
      </div>

      {/* Compatibility Summary */}
      <Card className="p-5 gap-0 shadow-none bg-gray-50 border-[1.5px] border-gray-200">
        <div className="flex justify-between items-center mb-3.5">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px]">Compatibility with You</Label>
          <Button variant="link" className="text-foreground text-xs p-0 h-auto" onClick={()=>go("snap-good")}>See full comparison →</Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 bg-card rounded-[10px] text-center border border-gray-200">
            <div className="text-[22px] font-extrabold text-success">8h</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Schedule overlap /wk</div>
          </div>
          <div className="p-3.5 bg-card rounded-[10px] text-center border border-gray-200">
            <div className="text-[22px] font-extrabold text-success">4/4</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Skill coverage</div>
          </div>
          <div className="p-3.5 bg-card rounded-[10px] text-center border border-gray-200">
            <div className="text-[22px] font-extrabold text-success">3/3</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Work style match</div>
          </div>
        </div>
      </Card>

      {/* Skills */}
      <Card className="p-5 mb-3.5 gap-0 shadow-none">
        <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px]">Skills</Label>
        <div className="mt-2">{st.skills.map(sk=><div key={sk} className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm">{sk}</span><span className="text-[13px] text-gray-500">{st.rat[sk]}</span></div>)}</div>
      </Card>

      {/* Availability */}
      <Card className="p-5 mb-3.5 gap-0 shadow-none">
        <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px]">Availability</Label>
        <div className="mt-2 text-sm text-gray-600 leading-[1.7]">
          <div className="mb-1">On campus: <strong>Mon, Wed</strong> afternoons</div>
          <div>Can work: <strong>Mon, Wed</strong> afternoons, <strong>Tue</strong> evenings</div>
        </div>
      </Card>

      {/* Communication */}
      <Card className="p-5 mb-3.5 gap-0 shadow-none">
        <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px]">Communication</Label>
        <div className="mt-2 text-sm">Discord: <strong>jesse.dev</strong></div>
      </Card>

      {/* About */}
      <Card className="p-5 mb-3.5 gap-0 shadow-none">
        <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px]">About</Label>
        <p className="text-sm text-gray-600 leading-relaxed mt-2">{st.bio}</p>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button className="flex-[2] px-7 py-3 h-auto" onClick={()=>go("sent-jesse")}>Send Group Request</Button>
        <Button variant="outline" className="flex-1 px-7 py-3 h-auto inline-flex items-center justify-center gap-1.5" onClick={()=>go("chat")}><Icon.chat size={16} /> Message {st.name.split(" ")[0]}</Button>
      </div>
    </div>
  </div>;
}

// Snapshot Good
function SnapGood({ go }: GoProps) {
  const ds=["Mon","Tue","Wed","Thu","Fri"],ts=["9am–12pm","1–5pm","6–9pm"],my=new Set(["Mon-1","Wed-1","Fri-1"]),th=new Set(["Mon-1","Wed-1","Tue-2"]);
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("profile-view")}>← Back to Profile</Button>
      <div className="flex gap-4 items-center mb-7">
        <Avatar className="size-14"><AvatarFallback className="bg-gray-200 text-gray-500 text-lg font-bold">JN</AvatarFallback></Avatar>
        <div><div className="text-[22px] font-bold">Jesse Nguyen</div><div className="text-sm text-gray-500">Section 202 · Looking for group</div></div>
      </div>
      <div className="grid grid-cols-2 gap-7">
        <div>
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Schedule Overlap</Label>
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]">
            <div />{ds.map(d=><div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
            {ts.map((t,ti)=><Fragment key={ti}><div className="text-[11px] text-gray-500 flex items-center">{t}</div>
              {ds.map(d=>{const k=`${d}-${ti}`,m=my.has(k),h=th.has(k),b=m&&h;return (<div key={k} className={cn("py-2.5 px-1 text-center rounded-md text-[10px] font-medium", b?"bg-primary text-primary-foreground":m?"bg-[#d0d0d0] text-gray-500":h?"bg-[#e0e0e0] text-gray-400":"bg-gray-50 text-gray-300")}>{b?"✓":m?"Me":h?"JN":""}</div>);})}</Fragment>)}
          </div>
          <div className="flex justify-between mt-2.5">
            <div className="text-[11px] text-gray-500">◼ Both · <span className="text-gray-400">◼ You</span> · <span className="text-gray-300">◼ Jesse</span></div>
            <span className="text-sm font-bold text-success">8h/wk</span>
          </div>
        </div>
        <div>
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills</Label>
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            <div className="p-3.5 bg-gray-50 rounded-[10px]"><div className="text-xs font-semibold mb-2">You</div><div className="text-[13px]">UI Design · Expert</div><div className="text-[13px]">User Research · Proficient</div></div>
            <div className="p-3.5 bg-gray-50 rounded-[10px]"><div className="text-xs font-semibold mb-2">Jesse</div><div className="text-[13px]">Frontend Dev · Proficient</div><div className="text-[13px]">Prototyping · Expert</div></div>
          </div>
          <div className="py-2 px-3 bg-success-bg rounded-lg text-[13px] text-success mb-4">✓ Complementary — no overlap, strong coverage</div>
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Work Style</Label>
          {([["Meeting","2x/wk","2x/wk",true],["Style","In-person","In-person",true],["Platform","Discord","Discord",true]] as const).map(([l,y,t,ok])=>(
            <div key={l} className="flex justify-between py-2 border-b border-gray-100 text-[13px]">
              <span className="text-gray-500">{l}</span>
              <div className="flex gap-2.5"><span>{y}</span><span className="text-gray-400">vs</span><span>{t}</span><span className={ok?"text-success":"text-danger"}>{ok?"✓":"⚠"}</span></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <Button variant="outline" className="flex-1 px-7 py-3 h-auto" onClick={()=>go("board")}>Back to Board</Button>
        <Button className="flex-1 px-7 py-3 h-auto" onClick={()=>go("sent-jesse")}>Send Group Request</Button>
      </div>
    </div>
  </div>;
}

// Snapshot Warning (Priya)
function SnapWarn({ go }: GoProps) {
  const [ack, setAck] = useState(false);
  const ds=["Mon","Tue","Wed","Thu","Fri"],ts=["9am–12pm","1–5pm","6–9pm"];
  const my=new Set(["Mon-1","Wed-1","Fri-1"]),th=new Set(["Tue-0","Thu-0"]);
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("board")}>← Back to Board</Button>
      <div className="flex gap-4 items-center mb-4">
        <Avatar className="size-14"><AvatarFallback className="bg-gray-200 text-gray-500 text-lg font-bold">PS</AvatarFallback></Avatar>
        <div className="flex-1">
          <div className="text-[22px] font-bold">Priya Sharma</div>
          <div className="text-sm text-gray-500">Section 201 · Looking for group</div>
        </div>
      </div>

      {/* Warning banner */}
      <div className="py-3.5 px-[18px] bg-caution-bg rounded-[10px] border border-caution-border mb-7">
        <div className="text-[15px] font-bold text-caution mb-1">⚠ Compatibility warnings found</div>
        <div className="text-[13px] text-caution-dark leading-relaxed">No schedule overlap detected. Meeting preferences also differ. Review the details below before you decide.</div>
      </div>

      {/* Schedule */}
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Schedule Overlap</Label>
        <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-1">
          <div />{ds.map(d=><div key={d} className="text-center text-xs font-semibold text-gray-500 p-2">{d}</div>)}
          {ts.map((t,ti)=><Fragment key={ti}><div className="text-[11px] text-gray-500 flex items-center">{t}</div>
            {ds.map(d=>{const k=`${d}-${ti}`,m=my.has(k),h=th.has(k);return (<div key={k} className={cn("py-3 px-1 text-center rounded-md text-[11px] font-medium", m?"bg-[#d0d0d0] text-gray-500":h?"bg-[#e0e0e0] text-gray-400":"bg-gray-50 text-gray-300")}>{m?"You":h?"PS":""}</div>);})}</Fragment>)}
        </div>
        <div className="flex justify-between items-center mt-2.5">
          <div className="text-xs text-gray-500"><span className="text-gray-400">◼ You</span> · <span className="text-gray-300">◼ Priya</span></div>
          <div className="py-1 px-3 bg-danger-bg rounded-md border border-danger-border">
            <span className="text-[13px] font-bold text-danger">0h/wk overlap</span>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills Comparison</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-gray-50 rounded-[10px]"><div className="text-xs font-semibold mb-2">You</div><div className="text-sm mb-1">UI Design</div><div className="text-sm">User Research</div></div>
          <div className="p-4 bg-gray-50 rounded-[10px]"><div className="text-xs font-semibold mb-2">Priya</div><div className="text-sm mb-1">Backend</div><div className="text-sm">Data Analysis</div></div>
        </div>
        <div className="py-2 px-3 bg-success-bg rounded-lg text-[13px] text-success mt-2.5">✓ Complementary skills. No overlap, good coverage.</div>
      </div>

      {/* Work style */}
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Work Style</Label>
        <Card className="p-0 gap-0 shadow-none overflow-hidden">
          {([["Meeting frequency","2x/wk","1x/wk",false],["Meeting style","In-person","Online",false],["Communication","Discord","Discord",true]] as const).map(([l,y,t,ok],i)=>(
            <div key={l} className={cn("flex justify-between items-center px-4 py-3", i<2 && "border-b border-gray-100", !ok && "bg-danger-bg")}>
              <span className={cn("text-[13px]", ok ? "text-gray-500" : "text-danger font-semibold")}>{l}</span>
              <div className="flex gap-3 items-center text-[13px]">
                <span>{y}</span>
                <span className="text-gray-400 text-[11px]">vs</span>
                <span>{t}</span>
                <span className={cn("text-base", ok ? "text-success" : "text-danger")}>{ok?"✓":"✗"}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Acknowledgment */}
      <label className="flex items-start gap-2.5 py-3.5 px-[18px] bg-gray-50 rounded-[10px] border border-gray-200 mb-5 cursor-pointer">
        <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-[3px]" id="ack-checkbox" />
        <span className="text-[13px] text-gray-600 leading-relaxed">I understand that Priya and I have no schedule overlap and different meeting preferences. We will need to coordinate asynchronously.</span>
      </label>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 px-7 py-3 h-auto" onClick={()=>go("board")}>Back to Board</Button>
        <Button disabled={!ack} className="flex-1 px-7 py-3 h-auto" onClick={()=>go("sent-priya")}>Send Group Request</Button>
      </div>
    </div>
  </div>;
}

// Request Sent
function Sent({ go, targetName }: SentProps) {
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto pt-[100px] px-6 text-center">
      <div className="text-5xl mb-5">✓</div>
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
        <Button variant="outline" size="sm" className="px-4" onClick={()=>go("snap-good")}>View Compatibility</Button>
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
    { name: "Jesse Nguyen", init: "JN", last: "Sounds good. Let's also check if anyone has backend experience.", time: "2:22 PM", unread: false },
    { name: "Aisha Khan", init: "AK", last: "Hi! I'd love to join your group for CSC318.", time: "1:05 PM", unread: true },
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
        <Card key={i} className="p-5 mb-3.5 shadow-none cursor-pointer flex-row items-center gap-3.5" onClick={()=>go("chat")}>
          <Avatar className="size-11"><AvatarFallback className="bg-gray-200 text-gray-500 text-sm font-bold">{cv.init}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-0.5">
              <span className={cn("text-sm", cv.unread?"font-bold":"font-medium")}>{cv.name}</span>
              <span className="text-xs text-gray-400">{cv.time}</span>
            </div>
            <div className="text-[13px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">{cv.last}</div>
          </div>
          {cv.unread&&<div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"><span className="sr-only">Unread</span></div>}
        </Card>
      ))}
    </div>
  </div>;
}

// My Group
function MyGroup({ go }: GoProps) {
  const [confirmed, setConfirmed] = useState(false);
  const membersPartial = [
    { name: "John D.", init: "JD", skills: ["UI Design","User Research"], role: "You" },
    { name: "Jesse Nguyen", init: "JN", skills: ["Frontend Dev","Prototyping"], role: "Member" },
    { name: "Aisha Khan", init: "AK", skills: ["Project Mgmt","UX Writing"], role: "Member" },
  ];
  const membersFull = [
    ...membersPartial,
    { name: "David Park", init: "DP", skills: ["Backend","Data Analysis"], role: "Member" },
  ];
  const members = confirmed ? membersFull : membersPartial;
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} right={<Button variant="outline" size="sm" className="px-4" onClick={()=>go("dash")}>Dashboard</Button>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("dash")}>← Dashboard</Button>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">My Group — CSC318</h1>

      {/* Toggle for demo */}
      <div className="mb-5">
        <div className="text-[9px] font-bold text-blue-500 uppercase tracking-[1px] mb-1.5">Demo Controls</div>
        <div className="flex gap-2 p-2 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
          <Button size="sm" variant={!confirmed?"default":"outline"} className="text-xs px-4" onClick={()=>setConfirmed(false)}>Before confirm (3/4)</Button>
          <Button size="sm" variant={confirmed?"default":"outline"} className="text-xs px-4" onClick={()=>setConfirmed(true)}>After confirm (4/4)</Button>
        </div>
      </div>

      {!confirmed ? (
        <>
          <p className="text-base text-gray-600 mb-9 leading-relaxed">3 of 4–6 members. You need at least 1 more person.</p>
          <div className="flex justify-between items-center px-4 py-3 bg-warning-bg rounded-[10px] mb-5 border border-warning-border">
            <span className="text-[13px] text-warning font-semibold">Group not yet confirmed</span>
            <Button size="sm" className="bg-gray-500 text-xs px-4 hover:bg-gray-600" onClick={()=>go("board")}>Find more members</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-base text-gray-600 mb-9 leading-relaxed">4 of 4–6 members. Your group is confirmed!</p>
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
  const recs = [
    { name: "David Park", init: "DP", skills: ["Backend","Data Analysis"], compat: "76%", overlap: "6h/wk" },
    { name: "Lisa Wang", init: "LW", skills: ["Frontend Dev","UX Writing"], compat: "68%", overlap: "4h/wk" },
    { name: "Omar Ali", init: "OA", skills: ["Project Mgmt"], compat: "52%", overlap: "2h/wk" },
  ];
  return <div className="bg-background min-h-screen pb-16">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={()=>go("board")}>← Back to Board</Button>
      <div className="py-3.5 px-[18px] bg-danger-bg rounded-[10px] mb-6 border border-danger-border">
        <div className="text-[15px] font-bold text-danger flex items-center gap-1"><Icon.clockAlert size={16} color="#c1292e" /> Deadline in 3 days</div>
        <div className="text-[13px] text-danger-dark">4 students are still ungrouped. Here are your best matches.</div>
      </div>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Suggested Matches</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Sorted by compatibility with your profile.</p>
      {recs.map((r,i)=>(
        <Card key={i} className="p-5 mb-3.5 shadow-none cursor-pointer flex-row items-center gap-3.5 hover:border-gray-300 hover:shadow-sm transition-colors" onClick={()=>go("snap-good")}>
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
      <Separator className="my-6 bg-gray-100" />
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
    else if(p==="sent-priya"){setSentTarget("Priya");setPg("sent")}
    else if(p==="sent"){setPg("sent")}
    else setPg(p);
  };

  const P: Record<string, ReactNode> = {
    landing:<Landing go={go}/>, "signup-role":<SignupRole go={go}/>, signup:<SignupForm role={role} go={go}/>, verify:<Verify role={role} go={go}/>,
    login:<Login go={go}/>,
    dash:<Dash go={go}/>, join:<Join go={go}/>,
    "prof-0":<Prof0 go={go}/>, "prof-1":<Prof1 go={go}/>, "prof-2":<Prof2 go={go}/>, "prof-3":<Prof3 go={go}/>, "prof-done":<ProfDone go={go}/>,
    "ta-dash":<TADash go={go}/>, "ta-create":<TACreate go={go}/>,
    board:<Board go={go}/>, "profile-view":<ProfileView go={go}/>,
    "snap-good":<SnapGood go={go}/>, "snap-warn":<SnapWarn go={go}/>, sent:<Sent go={go} targetName={sentTarget}/>,
    chat:<Chat go={go}/>, inbox:<Inbox go={go}/>, mygroup:<MyGroup go={go}/>,
    urgent:<Urgent go={go}/>, email:<EmailMock go={go}/>,
  };

  const nav = [
    { g: "Onboard", p: ["landing","login","signup-role","signup","verify"] },
    { g: "Student", p: ["dash","join","prof-0","prof-1","prof-2","prof-3","prof-done"] },
    { g: "Board", p: ["board","profile-view","snap-good","snap-warn","sent"] },
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
