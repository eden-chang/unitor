import { useState } from "react";

// ==================== DESIGN TOKENS ====================
const c = {
  bg: "#f7f7f5", white: "#ffffff", black: "#111111",
  g50: "#f5f5f3", g100: "#ededeb", g200: "#dddbd8", g300: "#c4c2bf", g400: "#a8a6a2", g500: "#7d7b78", g600: "#5c5a57", g700: "#3d3b38",
  green: "#2d6a4f", greenBg: "#d8f3dc", greenLight: "#b7e4c7",
  yellow: "#b5860a", yellowBg: "#fef3c7",
  red: "#c1292e", redBg: "#fde8e8",
  orange: "#c2530a", orangeBg: "#fff1e6", orangeBorder: "#fed7aa",
  accent: "#111111",
};

// ==================== SHARED STYLES ====================
const base = {
  page: { fontFamily: "'Inter', 'Helvetica Neue', sans-serif", background: c.bg, minHeight: "100vh", paddingBottom: 64 },
  narrow: { maxWidth: 500, margin: "0 auto", padding: "56px 24px" },
  medium: { maxWidth: 680, margin: "0 auto", padding: "56px 24px" },
  wide: { maxWidth: 1120, margin: "0 auto", padding: "40px 48px" },

  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", height: 56, padding: "0 48px", background: c.white, borderBottom: `1px solid ${c.g200}`, position: "sticky", top: 0, zIndex: 100 },
  logo: { fontSize: 22, fontWeight: 800, color: c.black, letterSpacing: -1, cursor: "pointer" },

  h1: { fontSize: 40, fontWeight: 700, color: c.black, margin: "0 0 10px", letterSpacing: -1, lineHeight: 1.1 },
  h2: { fontSize: 28, fontWeight: 700, color: c.black, margin: "0 0 8px", letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: 600, color: c.black, margin: "0 0 4px" },
  sub: { fontSize: 16, color: c.g600, margin: "0 0 36px", lineHeight: 1.6 },
  label: { fontSize: 11, fontWeight: 700, color: c.g600, marginBottom: 7, display: "block", textTransform: "uppercase", letterSpacing: 1 },
  sm: { fontSize: 13, color: c.g500, lineHeight: 1.5 },

  btn: { padding: "12px 28px", background: c.black, color: c.white, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btn2: { padding: "12px 28px", background: c.white, color: c.black, border: `1.5px solid ${c.g300}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnG: { background: "none", border: "none", color: c.black, fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "underline" },
  btnSm: { padding: "7px 16px", background: c.black, color: c.white, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnO: { padding: "7px 16px", background: c.white, color: c.black, border: `1.5px solid ${c.g300}`, borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  back: { background: "none", border: "none", fontSize: 14, cursor: "pointer", color: c.g600, fontWeight: 500, marginBottom: 20, padding: 0 },

  input: { width: "100%", padding: "11px 14px", border: `1.5px solid ${c.g200}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: c.white },
  ta: { width: "100%", padding: "11px 14px", border: `1.5px solid ${c.g200}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", minHeight: 100, resize: "vertical", fontFamily: "inherit", background: c.white },
  sel: { width: "100%", padding: "11px 14px", border: `1.5px solid ${c.g200}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: c.white, appearance: "none" },

  pill: { display: "inline-block", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", margin: "0 6px 8px 0" },
  pOff: { background: c.g100, color: c.g600, border: `1.5px solid ${c.g200}` },
  pOn: { background: c.black, color: c.white, border: `1.5px solid ${c.black}` },
  card: { border: `1px solid ${c.g200}`, borderRadius: 12, padding: "20px", background: c.white, marginBottom: 14 },
  badge: { display: "inline-block", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600 },
  hr: { border: "none", borderTop: `1px solid ${c.g100}`, margin: "24px 0" },
  av: { width: 42, height: 42, borderRadius: 21, background: c.g200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: c.g500, flexShrink: 0, overflow: "hidden" },
  prog: { height: 3, background: c.g100, borderRadius: 2, overflow: "hidden", marginBottom: 32 },
  progF: { height: "100%", background: c.black, borderRadius: 2 },
};

// ==================== HELPERS ====================
function Nav({ go, right }) {
  return (
    <div style={base.topbar}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span style={base.logo} onClick={() => go("landing")}>unitor</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{right}</div>
    </div>
  );
}
function Prog({ n, t }) { return <div style={base.prog}><div style={{ ...base.progF, width: `${(n/t)*100}%` }} /></div>; }
function F({ l, children }) { return <div style={{ marginBottom: 18 }}><label style={base.label}>{l}</label>{children}</div>; }
function Sel({ children }) { return <div style={{ position: "relative" }}><select style={base.sel}>{children}</select><span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.g400 }}>▾</span></div>; }

function TGrid({ sel, set, label }) {
  const ds = ["Mon","Tue","Wed","Thu","Fri"], ts = ["9–12","1–5","6–9"];
  const tog = k => { const n = new Set(sel); n.has(k)?n.delete(k):n.add(k); set(n); };
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={base.label}>{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: "64px repeat(5,1fr)", gap: 3 }}>
        <div />{ds.map(d=><div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: c.g500, padding: 6 }}>{d}</div>)}
        {ts.map((t,ti)=><>
          <div key={`l${ti}`} style={{ fontSize: 11, color: c.g500, display: "flex", alignItems: "center" }}>{t}</div>
          {ds.map(d=>{ const k=`${d}-${ti}`; return <div key={k} onClick={()=>tog(k)} style={{ padding: "10px 4px", textAlign: "center", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500, background: sel.has(k)?c.black:c.g50, color: sel.has(k)?c.white:c.g400 }} />; })}
        </>)}
      </div>
    </div>
  );
}

// ==================== ICONS ====================
const Icon = {
  graduation: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 13c-2.755 0-5-2.245-5-5V3.5H4V2h14.75c.69 0 1.25.56 1.25 1.25V9h-1.5V3.5H17V8c0 2.755-2.245 5-5 5ZM8.5 8c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V7h-7v1Zm0-2.5h7v-2h-7v2Zm6.43 9a4.752 4.752 0 0 1 4.59 3.52l1.015 3.785-1.45.39-1.015-3.785A3.253 3.253 0 0 0 14.93 16H9.07c-1.47 0-2.76.99-3.14 2.41l-1.015 3.785-1.45-.39L4.48 18.02a4.762 4.762 0 0 1 4.59-3.52h5.86Z" fill={color}/>
    </svg>
  ),
  clipboard: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.105 5H5.5v15.5h5V22H4V3.5h3V2h10v1.5h3V11h-1.5V5h-1.605c-.33 1.15-1.39 2-2.645 2h-4.5c-1.26 0-2.315-.85-2.645-2ZM15.5 3.5h-7v.75c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25V3.5Zm2.22 9.72a2.164 2.164 0 1 1 3.06 3.06l-5.125 5.125-2.22.74a1.237 1.237 0 0 1-1.28-.3c-.335-.34-.45-.83-.3-1.28l.74-2.22 5.125-5.125Zm-2.875 6.875 4.875-4.875a.664.664 0 1 0-.94-.94l-4.875 4.875-.47 1.41 1.41-.47Z" fill={color}/>
    </svg>
  ),
  email: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M19.25 20H6.5v-1.5h12.75c.69 0 1.25-.56 1.25-1.25V9.46L12 14.37 2 8.595V6.75A2.755 2.755 0 0 1 4.75 4h14.5A2.755 2.755 0 0 1 22 6.75v10.5A2.755 2.755 0 0 1 19.25 20ZM3.5 7.725 12 12.63l8.5-4.905V6.75c0-.69-.56-1.25-1.25-1.25H4.75c-.69 0-1.25.56-1.25 1.25v.975ZM9 15H3.5v1.5H9V15Zm-7-3h2.5v1.5H2V12Z" fill={color}/>
    </svg>
  ),
  books: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 4a3.745 3.745 0 0 0-3 1.51A3.745 3.745 0 0 0 9 4H2v16h7.5c.69 0 1.25.56 1.25 1.25h2.5c0-.69.56-1.25 1.25-1.25H22V4h-7Zm-3.75 15.13a2.726 2.726 0 0 0-1.75-.63h-6v-13H9c1.24 0 2.25 1.01 2.25 2.25v11.38Zm9.25-.63h-6c-.665 0-1.275.235-1.75.63V7.75c0-1.24 1.01-2.25 2.25-2.25h5.5v13Z" fill={color}/>
    </svg>
  ),
  camera: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2 17.25A2.755 2.755 0 0 0 4.75 20h14.5A2.755 2.755 0 0 0 22 17.25v-9a2.755 2.755 0 0 0-2.75-2.75h-2.64l-2-2.5H9.39l-2 2.5H4.75A2.755 2.755 0 0 0 2 8.25v9ZM8.11 7l2-2.5h3.78l2 2.5h3.36c.69 0 1.25.56 1.25 1.25v9c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-9C3.5 7.56 4.06 7 4.75 7h3.36Zm-.61 5.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5S14.48 8 12 8s-4.5 2.02-4.5 4.5Zm1.5 0c0-1.655 1.345-3 3-3s3 1.345 3 3-1.345 3-3 3-3-1.345-3-3Z" fill={color}/>
    </svg>
  ),
  search: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m21.78 20.72-5.62-5.62A7.96 7.96 0 0 0 18 10c0-4.41-3.59-8-8-8s-8 3.59-8 8 3.59 8 8 8a7.96 7.96 0 0 0 5.1-1.84l5.62 5.62 1.06-1.06ZM10 16.5A6.506 6.506 0 0 1 3.5 10c0-3.585 2.915-6.5 6.5-6.5s6.5 2.915 6.5 6.5-2.915 6.5-6.5 6.5Z" fill={color}/>
    </svg>
  ),
  balance: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.75 12.5h9.265l-.02-.77a9.99 9.99 0 0 0-9.725-9.725l-.77-.02v9.265c0 .69.56 1.25 1.25 1.25Zm7.69-1.5H13V3.56A8.493 8.493 0 0 1 20.44 11ZM3.5 12c0 4.685 3.815 8.5 8.5 8.5 3.965 0 7.345-2.785 8.255-6.5h1.535c-.94 4.545-5 8-9.79 8-5.515 0-10-4.485-10-10 0-4.83 3.44-8.87 8-9.8v1.545C6.275 4.65 3.5 8.005 3.5 12Z" fill={color}/>
    </svg>
  ),
  chat: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155ZM3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94V5.75Zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19l1.925 1.925Z" fill={color}/>
    </svg>
  ),
  clockAlert: ({ size = 24, color = "#202023" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 22C6.485 22 2 17.515 2 12S6.485 2 12 2s10 4.485 10 10-4.485 10-10 10Zm0-18.5c-4.685 0-8.5 3.815-8.5 8.5 0 4.685 3.815 8.5 8.5 8.5 4.685 0 8.5-3.815 8.5-8.5 0-4.685-3.815-8.5-8.5-8.5Zm.75 10V8h-1.5v5.5h1.5ZM13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill={color}/>
    </svg>
  ),
};

// ==================== PAGES ====================

// Landing
function Landing({ go }) {
  return <div style={base.page}>
    <Nav go={go} right={<><button style={base.btnO} onClick={()=>go("signup-role")}>Log In</button><button style={base.btnSm} onClick={()=>go("signup-role")}>Sign Up</button></>} />
    <div style={{ textAlign: "center", padding: "120px 24px 80px" }}>
      <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, color: c.black, margin: "0 0 16px", lineHeight: 1.05 }}>Find your people.<br/>Form your team.</h1>
      <p style={{ fontSize: 18, color: c.g600, maxWidth: 520, margin: "0 auto 44px", lineHeight: 1.7 }}>unitor matches you with classmates based on skills, schedules, and work style. No more blind emails or last-minute scrambles.</p>
      <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
        <button style={{ ...base.btn, padding: "14px 36px", fontSize: 16 }} onClick={()=>go("signup-role")}>Get Started — it's free</button>
        <button style={{ ...base.btn2, padding: "14px 36px", fontSize: 16 }} onClick={()=>go("signup-role")}>Log In</button>
      </div>
    </div>
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px 100px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
      {[["Discover","Browse who's available. See skills, schedules, and status at a glance."],["Compare","Check compatibility before you commit. Schedule overlap, work style, skill balance."],["Connect","Chat directly. Coordinate on your preferred platform. Form your group."]].map(([t,d],i)=>(
        <div key={i} style={{ padding: "32px 28px", borderRadius: 14, border: `1px solid ${c.g200}`, background: c.white }}>
          <div style={{ marginBottom: 14 }}>{[<Icon.search size={32} />,<Icon.balance size={32} />,<Icon.chat size={32} />][i]}</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{t}</div>
          <div style={{ fontSize: 14, color: c.g600, lineHeight: 1.6 }}>{d}</div>
        </div>
      ))}
    </div>
  </div>;
}

// Signup Role
function SignupRole({ go }) {
  return <div style={base.page}>
    <Nav go={go} />
    <div style={base.narrow}>
      <h1 style={base.h2}>Join unitor</h1>
      <p style={base.sub}>How will you use unitor?</p>
      {[{i:<Icon.graduation size={24} />,t:"Student",d:"Find and join project groups",to:"signup-s"},{i:<Icon.clipboard size={24} />,t:"TA / Instructor",d:"Create courses and manage groups",to:"signup-t"}].map(r=>(
        <div key={r.t} style={{ ...base.card, cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }} onClick={()=>go(r.to)}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: c.g50, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.i}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>{r.t}</div><div style={{ fontSize: 14, color: c.g500 }}>{r.d}</div></div>
          <span style={{ color: c.g300, fontSize: 18 }}>→</span>
        </div>
      ))}
    </div>
  </div>;
}

// Signup Form
function SignupForm({ role, go }) {
  return <div style={base.page}>
    <Nav go={go} right={<span style={{ fontSize: 13, color: c.g500 }}>{role==="t"?"TA / Instructor":"Student"}</span>} />
    <div style={base.narrow}>
      <Prog n={1} t={2} />
      <h1 style={base.h2}>Create your account</h1>
      <p style={base.sub}>We'll send a verification link to your university email.</p>
      <F l="Full Name"><input style={base.input} placeholder="e.g. John Doe" /></F>
      <F l="University"><Sel><option>Select your university...</option><option>University of Toronto</option><option>York University</option></Sel></F>
      <F l="University Email"><input style={base.input} placeholder="you@mail.utoronto.ca" /></F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <F l="Password"><input style={base.input} type="password" placeholder="Min 8 characters" /></F>
        <F l="Confirm Password"><input style={base.input} type="password" placeholder="Re-enter" /></F>
      </div>
      <button style={{ ...base.btn, width: "100%" }} onClick={()=>go("verify")}>Send Verification Email</button>
    </div>
  </div>;
}

// Email Verify
function Verify({ role, go }) {
  return <div style={base.page}>
    <Nav go={go} />
    <div style={{ ...base.narrow, textAlign: "center", paddingTop: 80 }}>
      <Prog n={2} t={2} />
      <div style={{ marginBottom: 20 }}><Icon.email size={48} /></div>
      <h1 style={{ ...base.h2, textAlign: "center" }}>Check your inbox</h1>
      <p style={{ ...base.sub, textAlign: "center" }}>We sent a link to <strong>j.doe@mail.utoronto.ca</strong></p>
      <button style={{ ...base.btn, width: "100%" }} onClick={()=>go(role==="t"?"ta-dash":"dash")}>I've Verified My Email</button>
      <div style={{ marginTop: 14 }}><button style={base.btnG}>Resend email</button></div>
    </div>
  </div>;
}

// Student Dashboard
function Dash({ go }) {
  return <div style={base.page}>
    <Nav go={go} right={<div style={{ display: "flex", alignItems: "center", gap: 16 }}><button style={{ ...base.btnO, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={()=>go("inbox")}><Icon.chat size={16} /> Messages</button><button style={base.btnO} onClick={()=>go("mygroup")}>My Group</button><span style={{ fontSize: 14, color: c.g600 }}>John</span><div style={{ ...base.av, width: 32, height: 32, fontSize: 13 }}>JD</div></div>} />
    <div style={base.medium}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><div style={{ fontSize: 14, color: c.g500, marginBottom: 2 }}>Welcome back,</div><h1 style={{ ...base.h2, margin: 0 }}>My Courses</h1></div>
        <button style={base.btnSm} onClick={()=>go("join")}>+ Join a Course</button>
      </div>
      <div style={{ ...base.card, textAlign: "center", padding: "52px 24px", borderStyle: "dashed", borderColor: c.g300 }}>
        <div style={{ marginBottom: 12 }}><Icon.books size={36} /></div>
        <p style={{ fontSize: 15, color: c.g500, marginBottom: 16 }}>No courses yet.</p>
        <button style={base.btnO} onClick={()=>go("join")}>Join your first course</button>
      </div>
      <div style={{ marginTop: 10 }} />
      <div style={{ ...base.card, cursor: "pointer" }} onClick={()=>go("board")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><div style={{ fontSize: 18, fontWeight: 600 }}>CSC318</div><div style={{ fontSize: 14, color: c.g500 }}>The Design of Interactive Computational Media</div><div style={{ fontSize: 13, color: c.g400, marginTop: 4 }}>Winter 2026 · Section 201</div></div>
          <span style={{ ...base.badge, background: c.greenBg, color: c.green }}>Active</span>
        </div>
        <hr style={{ ...base.hr, margin: "14px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: c.g500 }}>Group status</span><span style={{ fontSize: 13, fontWeight: 600 }}>Looking for group →</span></div>
      </div>
    </div>
  </div>;
}

// Join Course
function Join({ go }) {
  const [step, setStep] = useState(0);
  return <div style={base.page}>
    <Nav go={go} />
    <div style={base.narrow}>
      <button style={base.back} onClick={()=>go("dash")}>← Back to Dashboard</button>
      {step===0?<>
        <h1 style={base.h2}>Join a Course</h1>
        <p style={base.sub}>Enter the 6-character code shared by your TA.</p>
        <F l="Course Code"><input style={{ ...base.input, fontSize: 22, fontWeight: 700, letterSpacing: 6, textAlign: "center", padding: 18 }} placeholder="W543M7" /></F>
        <button style={{ ...base.btn, width: "100%" }} onClick={()=>setStep(1)}>Look Up</button>
      </>:
      <>
        <h1 style={base.h2}>Confirm Course</h1>
        <p style={base.sub}>Is this the right one?</p>
        <div style={{ ...base.card, background: c.g50 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>CSC318</div>
          <div style={{ fontSize: 15, color: c.g600 }}>The Design of Interactive Computational Media</div>
          <div style={{ fontSize: 14, color: c.g400, marginBottom: 12 }}>Winter 2026 · University of Toronto</div>
          <hr style={{ ...base.hr, margin: "12px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13, color: c.g500 }}>
            <span>Sections: 201, 202, 203</span><span>Group size: 4–6</span>
            <span>Deadline: Mar 15, 2026</span><span>Code: W543M7</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button style={{ ...base.btn2, flex: 1 }} onClick={()=>setStep(0)}>Back</button>
          <button style={{ ...base.btn, flex: 1 }} onClick={()=>go("prof-0")}>Join & Set Up Profile</button>
        </div>
      </>}
    </div>
  </div>;
}

// Profile 0 - Name & Photo
function Prof0({ go }) {
  return <div style={base.page}>
    <Nav go={go} right={<span style={base.sm}>CSC318 · Profile</span>} />
    <div style={base.narrow}>
      <button style={base.back} onClick={()=>go("join")}>← Back</button>
      <Prog n={1} t={4} />
      <h1 style={base.h2}>Your Profile</h1>
      <p style={base.sub}>This is how other students will see you in this course. You can use a different name and photo for each course.</p>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ ...base.av, width: 88, height: 88, fontSize: 28, margin: "0 auto 12px", border: `2px dashed ${c.g300}`, background: c.g50 }}><Icon.camera size={28} color={c.g300} /></div>
        <button style={base.btnO}>Upload Photo</button>
      </div>
      <F l="Display Name"><input style={base.input} placeholder="e.g. John D." /></F>
      <button style={{ ...base.btn, width: "100%" }} onClick={()=>go("prof-1")}>Next</button>
    </div>
  </div>;
}

// Profile 1 - Skills
function Prof1({ go }) {
  const pre = ["UI Design","Frontend Dev","Backend","User Research","Prototyping","Data Analysis","UX Writing","Project Mgmt"];
  const [sel, setSel] = useState(["UI Design","User Research"]);
  const [rat, setRat] = useState({"UI Design":"Awesome","User Research":"Good"});
  const lvl = ["Learning","Moderate","Good","Awesome"];
  const tog = sk => { if(sel.includes(sk)){setSel(sel.filter(x=>x!==sk));const r={...rat};delete r[sk];setRat(r);}else{setSel([...sel,sk]);setRat({...rat,[sk]:"Moderate"});} };
  return <div style={base.page}>
    <Nav go={go} right={<span style={base.sm}>CSC318 · Profile</span>} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("prof-0")}>← Back</button>
      <Prog n={2} t={4} />
      <h1 style={base.h2}>Your Skills</h1>
      <p style={base.sub}>Select relevant skills. Add custom ones if needed.</p>
      <div style={{ marginBottom: 20 }}>
        {pre.map(sk=><span key={sk} style={{ ...base.pill, ...(sel.includes(sk)?base.pOn:base.pOff) }} onClick={()=>tog(sk)}>{sk}</span>)}
        <span style={{ ...base.pill, ...base.pOff, borderStyle: "dashed" }}>+ Custom</span>
      </div>
      {sel.length>0&&<div style={{ ...base.card, padding: 0, overflow: "hidden", marginBottom: 24 }}>
        {sel.map((sk,i)=><div key={sk} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: i<sel.length-1?`1px solid ${c.g100}`:"none" }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{sk}</span>
          <div style={{ display: "flex", gap: 4 }}>{lvl.map(l=><span key={l} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: rat[sk]===l?c.black:c.g100, color: rat[sk]===l?c.white:c.g500 }} onClick={()=>setRat({...rat,[sk]:l})}>{l}</span>)}</div>
        </div>)}
      </div>}
      <button style={{ ...base.btn, width: "100%" }} onClick={()=>go("prof-2")}>Next</button>
    </div>
  </div>;
}

// Profile 2 - Section & Schedule
function Prof2({ go }) {
  const [camp, setCamp] = useState(new Set(["Mon-0","Wed-0","Mon-1","Wed-1","Fri-1"]));
  const [work, setWork] = useState(new Set(["Mon-1","Tue-1","Wed-1","Thu-2","Fri-1"]));
  return <div style={base.page}>
    <Nav go={go} right={<span style={base.sm}>CSC318 · Profile</span>} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("prof-1")}>← Back</button>
      <Prog n={3} t={4} />
      <h1 style={base.h2}>Section & Schedule</h1>
      <p style={base.sub}>This helps us find teammates with compatible availability.</p>
      <F l="Your Section"><Sel><option>Section 201</option><option>Section 202</option><option>Section 203</option></Sel></F>
      <TGrid sel={camp} set={setCamp} label="When are you on campus?" />
      <TGrid sel={work} set={setWork} label="When can you work on the project?" />
      <button style={{ ...base.btn, width: "100%" }} onClick={()=>go("prof-3")}>Next</button>
    </div>
  </div>;
}

// Profile 3 - Communication & Bio
function Prof3({ go }) {
  const plats = ["Discord","WhatsApp","Email","Instagram DM","iMessage","KakaoTalk"];
  const [sp, setSp] = useState(["Discord"]);
  const tp = p => setSp(sp.includes(p)?sp.filter(x=>x!==p):[...sp,p]);
  return <div style={base.page}>
    <Nav go={go} right={<span style={base.sm}>CSC318 · Profile</span>} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("prof-2")}>← Back</button>
      <Prog n={4} t={4} />
      <h1 style={base.h2}>Communication & About You</h1>
      <p style={base.sub}>Let potential teammates know how to reach you.</p>
      <div style={{ marginBottom: 20 }}>
        <label style={base.label}>Preferred Platforms</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{plats.map(p=><span key={p} style={{ ...base.pill, ...(sp.includes(p)?base.pOn:base.pOff), margin: 0 }} onClick={()=>tp(p)}>{p}</span>)}</div>
      </div>
      {sp.length>0&&<div style={{ display: "grid", gridTemplateColumns: sp.length>1?"1fr 1fr":"1fr", gap: 12, marginBottom: 20 }}>
        {sp.map(p=><F key={p} l={`${p} handle`}><input style={base.input} placeholder={`Your ${p} username`} /></F>)}
      </div>}
      <hr style={base.hr} />
      <F l="About You"><textarea style={base.ta} placeholder="Tell potential teammates about yourself. What kind of group are you looking for?" /><div style={{ ...base.sm, textAlign: "right", marginTop: 4 }}>0/300</div></F>
      <div style={{ marginBottom: 28 }}>
        <label style={base.label}>Links (optional)</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, alignItems: "end" }}>
          <input style={base.input} placeholder="Label" /><input style={base.input} placeholder="https://..." /><button style={base.btnO}>Add</button>
        </div>
      </div>
      <button style={{ ...base.btn, width: "100%" }} onClick={()=>go("board")}>Complete Profile</button>
    </div>
  </div>;
}

// TA Dashboard
function TADash({ go }) {
  return <div style={base.page}>
    <Nav go={go} right={<div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 14, color: c.g600 }}>Prof. Truong</span><div style={{ ...base.av, width: 32, height: 32, fontSize: 12 }}>KT</div></div>} />
    <div style={base.medium}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><div style={{ fontSize: 14, color: c.g500, marginBottom: 2 }}>TA Dashboard</div><h1 style={{ ...base.h2, margin: 0 }}>My Courses</h1></div>
        <button style={base.btnSm} onClick={()=>go("ta-create")}>+ Create Course</button>
      </div>
      <div style={base.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div><div style={{ fontSize: 18, fontWeight: 600 }}>CSC318</div><div style={{ fontSize: 14, color: c.g500 }}>Design of Interactive Media · Winter 2026</div></div>
          <span style={{ ...base.badge, background: c.greenBg, color: c.green }}>Active</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, textAlign: "center", marginBottom: 16 }}>
          {[["42","Students"],["6","Groups"],["14","Ungrouped"],["D-12","Deadline"]].map(([v,l])=><div key={l}><div style={{ fontSize: 24, fontWeight: 700 }}>{v}</div><div style={{ fontSize: 12, color: c.g500 }}>{l}</div></div>)}
        </div>
        <div style={{ height: 3, background: c.g100, borderRadius: 2, marginBottom: 4 }}><div style={{ height: "100%", width: "67%", background: c.green, borderRadius: 2 }} /></div>
        <div style={{ fontSize: 12, color: c.g500, marginBottom: 16 }}>67% of students grouped</div>
        <hr style={{ ...base.hr, margin: "14px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Invite Code</div><code style={{ padding: "8px 16px", background: c.g50, borderRadius: 6, fontSize: 18, fontWeight: 700, letterSpacing: 3, border: `1px solid ${c.g200}` }}>W543M7</code></div>
          <button style={base.btnO}>Copy</button>
        </div>
        <p style={{ ...base.sm, marginTop: 8 }}>Share this code with students via Quercus or announcements.</p>
      </div>
    </div>
  </div>;
}

// TA Create Course
function TACreate({ go }) {
  const [skills, setSkills] = useState(["UI Design","Frontend Dev","Backend","User Research","Prototyping","Data Analysis"]);
  const [secs, setSecs] = useState(["201","202","203"]);
  const [newSec, setNewSec] = useState("");
  return <div style={base.page}>
    <Nav go={go} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("ta-dash")}>← Back</button>
      <h1 style={base.h2}>Create a Course</h1>
      <p style={base.sub}>Students will use the generated code to join.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <F l="University"><input style={base.input} value="University of Toronto" readOnly /></F>
        <F l="Department"><input style={base.input} placeholder="e.g. Computer Science" /></F>
        <F l="Course Code"><input style={base.input} placeholder="e.g. CSC318" /></F>
        <F l="Semester"><Sel><option>Winter 2026</option><option>Fall 2026</option></Sel></F>
      </div>
      <F l="Course Name"><input style={base.input} placeholder="e.g. The Design of Interactive Computational Media" /></F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 4 }}>
        <F l="Min Group Size"><input style={base.input} placeholder="4" /></F>
        <F l="Max Group Size"><input style={base.input} placeholder="6" /></F>
        <F l="Deadline"><input style={base.input} type="date" /></F>
      </div>

      <hr style={base.hr} />
      <div style={{ marginBottom: 24 }}>
        <label style={base.label}>Sections</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {secs.map(sc=><span key={sc} style={{ ...base.pill, ...base.pOn, margin: 0 }}>{sc} <span style={{ marginLeft: 6, opacity: 0.6, cursor: "pointer" }} onClick={()=>setSecs(secs.filter(x=>x!==sc))}>×</span></span>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...base.input, width: 120 }} placeholder="e.g. 204" value={newSec} onChange={e=>setNewSec(e.target.value)} />
          <button style={base.btnO} onClick={()=>{if(newSec.trim()){setSecs([...secs,newSec.trim()]);setNewSec("");}}}>+ Add</button>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={base.label}>Skills for this Course</label>
        <p style={{ ...base.sm, marginBottom: 10 }}>Students will select from these when they join.</p>
        <div>{skills.map(sk=><span key={sk} style={{ ...base.pill, ...base.pOn }}>{sk} <span style={{ marginLeft: 6, opacity: 0.6, cursor: "pointer" }} onClick={()=>setSkills(skills.filter(x=>x!==sk))}>×</span></span>)}<span style={{ ...base.pill, ...base.pOff, borderStyle: "dashed" }}>+ Add Skill</span></div>
      </div>
      <button style={{ ...base.btn, width: "100%" }} onClick={()=>go("ta-dash")}>Create Course</button>
    </div>
  </div>;
}

// Student data
const STU = [
  { name: "Jesse Nguyen", sec: "202", skills: ["Frontend Dev","Prototyping"], status: "searching", overlap: "8h/wk", init: "JN", bio: "Love building things. Looking for a design-focused team.", rat: {"Frontend Dev":"Good","Prototyping":"Awesome"} },
  { name: "Priya Sharma", sec: "201", skills: ["Backend","Data Analysis"], status: "searching", overlap: "0h/wk", init: "PS", bio: "Data nerd. Prefer async work.", rat: {"Backend":"Good","Data Analysis":"Awesome"} },
  { name: "Marcus Lee", sec: "201", skills: ["UI Design","Frontend Dev"], status: "talking", overlap: "5h/wk", init: "ML", bio: "Design + code. In talks with a group.", rat: {"UI Design":"Good","Frontend Dev":"Moderate"} },
  { name: "Aisha Khan", sec: "203", skills: ["Project Mgmt","UX Writing"], status: "searching", overlap: "3h/wk", init: "AK", bio: "Organized and reliable.", rat: {"Project Mgmt":"Awesome","UX Writing":"Good"} },
  { name: "Tom Chen", sec: "201", skills: ["Backend","Prototyping"], status: "confirmed", overlap: "—", init: "TC", bio: "", rat: {} },
];
const SS = { searching: { l: "Looking", bg: c.greenBg, c: c.green }, talking: { l: "In talks", bg: c.yellowBg, c: c.yellow }, confirmed: { l: "Grouped", bg: c.g100, c: c.g500 } };

// Matching Board
function Board({ go }) {
  return <div style={base.page}>
    <Nav go={go} right={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><button style={{ ...base.btnO, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={()=>go("inbox")}><Icon.chat size={16} /> Messages</button><button style={base.btnO} onClick={()=>go("mygroup")}>My Group</button><button style={base.btnO} onClick={()=>go("dash")}>Dashboard</button><div style={{ ...base.av, width: 32, height: 32, fontSize: 12 }}>JD</div></div>} />
    <div style={base.wide}>
      <div style={{ display: "flex", gap: 32 }}>
        {/* Sidebar filters */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ ...base.card, padding: "20px 18px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Filters</div>
            <F l="Section"><Sel><option>All Sections</option><option>201</option><option>202</option><option>203</option></Sel></F>
            <F l="Skills"><Sel><option>Any skill</option><option>Frontend Dev</option><option>Backend</option><option>UI Design</option></Sel></F>
            <F l="Min Overlap"><Sel><option>Any</option><option>4+ hours</option><option>8+ hours</option></Sel></F>
            <F l="Status"><Sel><option>All</option><option>Looking</option><option>In talks</option></Sel></F>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <div><div style={{ fontSize: 13, color: c.g500 }}>CSC318 · Section 201</div><h1 style={{ ...base.h2, margin: 0 }}>Find Teammates</h1></div>
            <span style={{ fontSize: 13, color: c.g500 }}>14 students looking</span>
          </div>
          {/* Urgent banner (single merged bar) */}
          <div onClick={()=>go("urgent")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: c.redBg, borderRadius: 10, border: "1px solid #fca5a5", marginBottom: 18, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.red, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon.clockAlert size={16} color={c.red} /> D-3</span>
              <span style={{ fontSize: 13, color: "#7f1d1d" }}>4 students still ungrouped</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.red }}>View suggestions →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {STU.map((st,i)=>{const ss=SS[st.status]; const dest = st.status==="confirmed"?null:st.overlap==="0h/wk"?"snap-warn":"profile-view"; return (
              <div key={i} style={{ ...base.card, opacity: st.status==="confirmed"?0.4:1, cursor: st.status!=="confirmed"?"pointer":"default", padding: 0, overflow: "hidden" }} onClick={()=>dest&&go(dest)}>
                <div style={{ display: "flex" }}>
                  {/* Overlap highlight strip */}
                  <div style={{ width: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: st.overlap==="0h/wk"?c.redBg:c.greenBg, borderRight: `1px solid ${st.overlap==="0h/wk"?"#fca5a5":"#a7f3d0"}`, flexShrink: 0, padding: "12px 0" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: st.overlap==="0h/wk"?c.red:c.green }}>{st.overlap.replace("/wk","")}</div>
                    <div style={{ fontSize: 10, color: st.overlap==="0h/wk"?c.red:c.green, marginTop: 2 }}>/wk</div>
                  </div>
                  <div style={{ flex: 1, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{st.name}</span>
                      <span style={{ ...base.badge, background: ss.bg, color: ss.c }}>{ss.l}</span>
                    </div>
                    <div style={{ fontSize: 12, color: c.g500, marginBottom: 6 }}>Section {st.sec}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {st.skills.map(sk=><span key={sk} style={{ padding: "2px 10px", background: c.g100, borderRadius: 10, fontSize: 11, color: c.g600 }}>{sk}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            );})}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// Student Profile Detail
function ProfileView({ go }) {
  const st = STU[0];
  return <div style={base.page}>
    <Nav go={go} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("board")}>← Back to Board</button>
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 24 }}>
        <div style={{ ...base.av, width: 72, height: 72, fontSize: 24 }}>{st.init}</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...base.h2, margin: "0 0 4px" }}>{st.name}</h1>
          <div style={{ fontSize: 14, color: c.g500 }}>Section {st.sec} · <span style={{ color: c.green, fontWeight: 600 }}>Looking for group</span></div>
        </div>
        <button style={{ ...base.btn, padding: "10px 20px", fontSize: 13 }} onClick={()=>go("sent")}>Send Group Request</button>
      </div>

      {/* Compatibility Summary - top priority */}
      <div style={{ ...base.card, background: c.g50, border: `1.5px solid ${c.g200}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <label style={{ ...base.label, margin: 0 }}>Compatibility with You</label>
          <button style={{ ...base.btnG, fontSize: 12, padding: 0 }} onClick={()=>go("snap-good")}>See full comparison →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={{ padding: "12px 14px", background: c.white, borderRadius: 10, textAlign: "center", border: `1px solid ${c.g200}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.green }}>8h</div>
            <div style={{ fontSize: 11, color: c.g500, marginTop: 2 }}>Schedule overlap /wk</div>
          </div>
          <div style={{ padding: "12px 14px", background: c.white, borderRadius: 10, textAlign: "center", border: `1px solid ${c.g200}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.green }}>✓</div>
            <div style={{ fontSize: 11, color: c.g500, marginTop: 2 }}>Complementary skills</div>
          </div>
          <div style={{ padding: "12px 14px", background: c.white, borderRadius: 10, textAlign: "center", border: `1px solid ${c.g200}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.green }}>3/3</div>
            <div style={{ fontSize: 11, color: c.g500, marginTop: 2 }}>Work style match</div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div style={base.card}>
        <label style={base.label}>Skills</label>
        <div style={{ marginTop: 8 }}>{st.skills.map(sk=><div key={sk} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.g100}` }}><span style={{ fontSize: 14 }}>{sk}</span><span style={{ fontSize: 13, color: c.g500 }}>{st.rat[sk]}</span></div>)}</div>
      </div>

      {/* Availability */}
      <div style={base.card}>
        <label style={base.label}>Availability</label>
        <div style={{ marginTop: 8, fontSize: 14, color: c.g600, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 4 }}>On campus: <strong>Mon, Wed</strong> afternoons</div>
          <div>Can work: <strong>Mon, Wed</strong> afternoons, <strong>Tue</strong> evenings</div>
        </div>
      </div>

      {/* Communication */}
      <div style={base.card}>
        <label style={base.label}>Communication</label>
        <div style={{ marginTop: 8, fontSize: 14 }}>Discord: <strong>jesse.dev</strong></div>
      </div>

      {/* About */}
      <div style={base.card}>
        <label style={base.label}>About</label>
        <p style={{ fontSize: 14, color: c.g600, lineHeight: 1.6, margin: "8px 0 0" }}>{st.bio}</p>
      </div>

      {/* Actions - sticky bottom feel */}
      <div style={{ display: "flex", gap: 12, marginTop: 24, padding: "16px 0", borderTop: `1px solid ${c.g200}` }}>
        <button style={{ ...base.btn, flex: 2 }} onClick={()=>go("sent")}>Send Group Request</button>
        <button style={{ ...base.btn2, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={()=>go("chat")}><Icon.chat size={16} /> Message Jesse</button>
      </div>
    </div>
  </div>;
}

// Snapshot Good
function SnapGood({ go }) {
  const ds=["Mon","Tue","Wed","Thu","Fri"],ts=["9–12","1–5","6–9"],my=new Set(["Mon-1","Wed-1","Fri-1"]),th=new Set(["Mon-1","Wed-1","Tue-2"]);
  return <div style={base.page}>
    <Nav go={go} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("profile-view")}>← Back to Profile</button>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 28 }}>
        <div style={{ ...base.av, width: 56, height: 56, fontSize: 18 }}>JN</div>
        <div><div style={{ fontSize: 22, fontWeight: 700 }}>Jesse Nguyen</div><div style={{ fontSize: 14, color: c.g500 }}>Section 202 · Looking for group</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        <div>
          <label style={base.label}>Schedule Overlap</label>
          <div style={{ display: "grid", gridTemplateColumns: "64px repeat(5,1fr)", gap: 3 }}>
            <div />{ds.map(d=><div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: c.g500, padding: 6 }}>{d}</div>)}
            {ts.map((t,ti)=><><div key={`l${ti}`} style={{ fontSize: 11, color: c.g500, display: "flex", alignItems: "center" }}>{t}</div>
              {ds.map(d=>{const k=`${d}-${ti}`,m=my.has(k),h=th.has(k),b=m&&h;let bg=c.g50,cl=c.g300;if(b){bg=c.black;cl=c.white}else if(m){bg="#d0d0d0";cl=c.g500}else if(h){bg="#e0e0e0";cl=c.g400}return (<div key={k} style={{ padding: "10px 4px", textAlign: "center", borderRadius: 6, fontSize: 10, fontWeight: 500, background: bg, color: cl }}>{b?"✓":m?"Me":h?"JN":""}</div>);})}</>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <div style={{ fontSize: 11, color: c.g500 }}>◼ Both · <span style={{ color: c.g400 }}>◼ You</span> · <span style={{ color: c.g300 }}>◼ Jesse</span></div>
            <span style={{ fontSize: 14, fontWeight: 700, color: c.green }}>8h/wk</span>
          </div>
        </div>
        <div>
          <label style={base.label}>Skills</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ padding: 14, background: c.g50, borderRadius: 10 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>You</div><div style={{ fontSize: 13 }}>UI Design · Awesome</div><div style={{ fontSize: 13 }}>User Research · Good</div></div>
            <div style={{ padding: 14, background: c.g50, borderRadius: 10 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Jesse</div><div style={{ fontSize: 13 }}>Frontend Dev · Good</div><div style={{ fontSize: 13 }}>Prototyping · Awesome</div></div>
          </div>
          <div style={{ padding: "8px 12px", background: c.greenBg, borderRadius: 8, fontSize: 13, color: c.green, marginBottom: 16 }}>✓ Complementary — no overlap, strong coverage</div>
          <label style={base.label}>Work Style</label>
          {[["Meeting","2x/wk","2x/wk",true],["Style","In-person","In-person",true],["Platform","Discord","Discord",true]].map(([l,y,t,ok])=>(
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.g100}`, fontSize: 13 }}>
              <span style={{ color: c.g500 }}>{l}</span>
              <div style={{ display: "flex", gap: 10 }}><span>{y}</span><span style={{ color: c.g400 }}>vs</span><span>{t}</span><span style={{ color: ok?c.green:c.red }}>{ok?"✓":"⚠"}</span></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        <button style={{ ...base.btn2, flex: 1 }} onClick={()=>go("board")}>Back to Board</button>
        <button style={{ ...base.btn, flex: 1 }} onClick={()=>go("sent")}>Send Group Request</button>
      </div>
    </div>
  </div>;
}

// Snapshot Warning (Priya)
function SnapWarn({ go }) {
  const [ack, setAck] = useState(false);
  const ds=["Mon","Tue","Wed","Thu","Fri"],ts=["9–12","1–5","6–9"];
  const my=new Set(["Mon-1","Wed-1","Fri-1"]),th=new Set(["Tue-0","Thu-0"]);
  return <div style={base.page}>
    <Nav go={go} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("board")}>← Back to Board</button>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div style={{ ...base.av, width: 56, height: 56, fontSize: 18 }}>PS</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Priya Sharma</div>
          <div style={{ fontSize: 14, color: c.g500 }}>Section 201 · Looking for group</div>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ padding: "14px 18px", background: c.orangeBg, borderRadius: 10, border: `1px solid ${c.orangeBorder}`, marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: c.orange, marginBottom: 4 }}>⚠ Compatibility warnings found</div>
        <div style={{ fontSize: 13, color: "#9a3412", lineHeight: 1.5 }}>No schedule overlap detected. Meeting preferences also differ. Review the details below before you decide.</div>
      </div>

      {/* Schedule - full width */}
      <div style={{ marginBottom: 28 }}>
        <label style={base.label}>Schedule Overlap</label>
        <div style={{ display: "grid", gridTemplateColumns: "64px repeat(5,1fr)", gap: 4 }}>
          <div />{ds.map(d=><div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: c.g500, padding: 8 }}>{d}</div>)}
          {ts.map((t,ti)=><><div key={`l${ti}`} style={{ fontSize: 11, color: c.g500, display: "flex", alignItems: "center" }}>{t}</div>
            {ds.map(d=>{const k=`${d}-${ti}`,m=my.has(k),h=th.has(k);let bg=c.g50,cl=c.g300;if(m){bg="#d0d0d0";cl=c.g500}else if(h){bg="#e0e0e0";cl=c.g400}return (<div key={k} style={{ padding: "12px 4px", textAlign: "center", borderRadius: 6, fontSize: 11, fontWeight: 500, background: bg, color: cl }}>{m?"You":h?"PS":""}</div>);})}</>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div style={{ fontSize: 12, color: c.g500 }}><span style={{ color: c.g400 }}>◼ You</span> · <span style={{ color: c.g300 }}>◼ Priya</span></div>
          <div style={{ padding: "4px 12px", background: c.redBg, borderRadius: 6, border: "1px solid #fca5a5" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.red }}>0h/wk overlap</span>
          </div>
        </div>
      </div>

      {/* Skills - 2 col */}
      <div style={{ marginBottom: 28 }}>
        <label style={base.label}>Skills Comparison</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 16, background: c.g50, borderRadius: 10 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>You</div><div style={{ fontSize: 14, marginBottom: 4 }}>UI Design</div><div style={{ fontSize: 14 }}>User Research</div></div>
          <div style={{ padding: 16, background: c.g50, borderRadius: 10 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Priya</div><div style={{ fontSize: 14, marginBottom: 4 }}>Backend</div><div style={{ fontSize: 14 }}>Data Analysis</div></div>
        </div>
        <div style={{ padding: "8px 12px", background: c.greenBg, borderRadius: 8, fontSize: 13, color: c.green, marginTop: 10 }}>✓ Complementary skills. No overlap, good coverage.</div>
      </div>

      {/* Work style - with red highlight on mismatches */}
      <div style={{ marginBottom: 28 }}>
        <label style={base.label}>Work Style</label>
        <div style={{ ...base.card, padding: 0, overflow: "hidden" }}>
          {[["Meeting frequency","2x/wk","1x/wk",false],["Meeting style","In-person","Online",false],["Communication","Discord","Discord",true]].map(([l,y,t,ok],i)=>(
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i<2?`1px solid ${c.g100}`:"none", background: ok?"transparent":c.redBg }}>
              <span style={{ fontSize: 13, color: ok?c.g500:c.red, fontWeight: ok?400:600 }}>{l}</span>
              <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13 }}>
                <span>{y}</span>
                <span style={{ color: c.g400, fontSize: 11 }}>vs</span>
                <span>{t}</span>
                <span style={{ fontSize: 16, color: ok?c.green:c.red }}>{ok?"✓":"✗"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acknowledgment */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 18px", background: c.g50, borderRadius: 10, border: `1px solid ${c.g200}`, marginBottom: 20 }}>
        <input type="checkbox" checked={ack} onChange={()=>setAck(!ack)} style={{ marginTop: 3, accentColor: c.black, width: 16, height: 16 }} />
        <span style={{ fontSize: 13, color: c.g600, lineHeight: 1.6 }}>I understand that Priya and I have no schedule overlap and different meeting preferences. We will need to coordinate asynchronously.</span>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button style={{ ...base.btn2, flex: 1 }} onClick={()=>go("board")}>Back to Board</button>
        <button style={{ ...base.btn, flex: 1, opacity: ack?1:0.35, pointerEvents: ack?"auto":"none" }} onClick={()=>go("sent")}>Send Group Request</button>
      </div>
    </div>
  </div>;
}

// Request Sent
function Sent({ go }) {
  return <div style={base.page}>
    <Nav go={go} />
    <div style={{ ...base.narrow, textAlign: "center", paddingTop: 100 }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>✓</div>
      <h1 style={{ ...base.h2, textAlign: "center" }}>Request Sent!</h1>
      <p style={{ ...base.sub, textAlign: "center" }}>Jesse will be notified by email. You'll hear back soon.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button style={base.btn} onClick={()=>go("board")}>Back to Board</button>
        <button style={base.btn2} onClick={()=>go("inbox")}>Messages</button>
      </div>
    </div>
  </div>;
}

// Chat
function Chat({ go }) {
  const msgs = [
    { from: "me", text: "Hey Jesse! I saw we have 8 hours of overlap and complementary skills. Want to team up for CSC318?", time: "2:14 PM" },
    { from: "them", text: "Hey John! Yeah I checked your profile too — looks like a great fit. I'm down!", time: "2:18 PM" },
    { from: "me", text: "Awesome! Should we look for 2-3 more members? I saw Aisha Khan has project management skills.", time: "2:20 PM" },
    { from: "them", text: "Sounds good. Let's also check if anyone has backend experience.", time: "2:22 PM" },
  ];
  return <div style={{ ...base.page, display: "flex", flexDirection: "column", paddingBottom: 0 }}>
    <Nav go={go} right={<button style={base.btnO} onClick={()=>go("inbox")}>← Inbox</button>} />
    <div style={{ maxWidth: 680, margin: "0 auto", width: "100%", flex: 1, display: "flex", flexDirection: "column", padding: "0 24px" }}>
      {/* Chat header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: `1px solid ${c.g200}` }}>
        <div style={{ ...base.av, width: 40, height: 40, fontSize: 14 }}>JN</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Jesse Nguyen</div>
          <div style={{ fontSize: 12, color: c.g500 }}>CSC318 · Section 202 · Last seen 2:22 PM</div>
        </div>
        <button style={base.btnO} onClick={()=>go("snap-good")}>View Compatibility</button>
      </div>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display: "flex", justifyContent: m.from==="me"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: m.from==="me"?"12px 12px 2px 12px":"12px 12px 12px 2px", background: m.from==="me"?c.black:c.white, color: m.from==="me"?c.white:c.black, border: m.from==="me"?"none":`1px solid ${c.g200}`, fontSize: 14, lineHeight: 1.5 }}>
              {m.text}
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.5, textAlign: "right" }}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Fixed input bar */}
      <div style={{ padding: "14px 0 78px", borderTop: `1px solid ${c.g200}`, display: "flex", gap: 10 }}>
        <input style={{ ...base.input, flex: 1 }} placeholder="Type a message..." />
        <button style={base.btnSm}>Send</button>
      </div>
    </div>
  </div>;
}

// Inbox
function Inbox({ go }) {
  const convos = [
    { name: "Jesse Nguyen", init: "JN", last: "Sounds good. Let's also check if anyone has backend experience.", time: "2:22 PM", unread: false },
    { name: "Aisha Khan", init: "AK", last: "Hi! I'd love to join your group for CSC318.", time: "1:05 PM", unread: true },
  ];
  return <div style={base.page}>
    <Nav go={go} right={<button style={base.btnO} onClick={()=>go("board")}>Board</button>} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("dash")}>← Dashboard</button>
      <h1 style={base.h2}>Messages</h1>

      {/* Course tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        <span style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: c.black, color: c.white, cursor: "pointer" }}>CSC318</span>
        <span style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: c.g100, color: c.g500, cursor: "pointer" }}>CSC207</span>
      </div>

      {convos.map((cv,i)=>(
        <div key={i} style={{ ...base.card, cursor: "pointer", display: "flex", gap: 14, alignItems: "center" }} onClick={()=>go("chat")}>
          <div style={{ ...base.av, width: 44, height: 44, fontSize: 14 }}>{cv.init}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: cv.unread?700:500 }}>{cv.name}</span>
              <span style={{ fontSize: 12, color: c.g400 }}>{cv.time}</span>
            </div>
            <div style={{ fontSize: 13, color: c.g500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.last}</div>
          </div>
          {cv.unread&&<div style={{ width: 8, height: 8, borderRadius: 4, background: c.green, flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  </div>;
}

// My Group
function MyGroup({ go }) {
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
  return <div style={base.page}>
    <Nav go={go} right={<button style={base.btnO} onClick={()=>go("dash")}>Dashboard</button>} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("dash")}>← Dashboard</button>
      <h1 style={base.h2}>My Group — CSC318</h1>

      {/* Toggle for demo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={{ ...(!confirmed?base.btnSm:{...base.btnO}), fontSize: 12 }} onClick={()=>setConfirmed(false)}>Before confirm (3/4)</button>
        <button style={{ ...(confirmed?base.btnSm:{...base.btnO}), fontSize: 12 }} onClick={()=>setConfirmed(true)}>After confirm (4/4)</button>
      </div>

      {!confirmed ? (
        <>
          <p style={base.sub}>3 of 4–6 members. You need at least 1 more person.</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: c.yellowBg, borderRadius: 10, marginBottom: 20, border: "1px solid #fde68a" }}>
            <span style={{ fontSize: 13, color: c.yellow, fontWeight: 600 }}>Group not yet confirmed</span>
            <button style={{ ...base.btnSm, background: c.g500, fontSize: 12 }} onClick={()=>go("board")}>Find more members</button>
          </div>
        </>
      ) : (
        <>
          <p style={base.sub}>4 of 4–6 members. Your group is confirmed!</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: c.greenBg, borderRadius: 10, marginBottom: 20, border: "1px solid #a7f3d0" }}>
            <span style={{ fontSize: 13, color: c.green, fontWeight: 600 }}>✓ Group confirmed</span>
            <span style={{ fontSize: 12, color: c.green }}>Submitted to instructor</span>
          </div>
        </>
      )}

      {members.map((m,i)=>(
        <div key={i} style={{ ...base.card, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ ...base.av, width: 44, height: 44, fontSize: 14 }}>{m.init}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</span>
              <span style={{ fontSize: 12, color: c.g500 }}>{m.role}</span>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>{m.skills.map(sk=><span key={sk} style={{ padding: "2px 8px", background: c.g100, borderRadius: 8, fontSize: 11, color: c.g600 }}>{sk}</span>)}</div>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button style={{ ...base.btn, flex: 1 }} onClick={()=>go("inbox")}>Group Chat</button>
        {!confirmed ? (
          <button style={{ ...base.btn2, flex: 1, opacity: 0.4, pointerEvents: "none" }}>Confirm Group (need 4+)</button>
        ) : (
          <button style={{ ...base.btn2, flex: 1 }} onClick={()=>go("board")}>Find more members</button>
        )}
      </div>
    </div>
  </div>;
}

// Urgent Matching
function Urgent({ go }) {
  const recs = [
    { name: "David Park", init: "DP", skills: ["Backend","Data Analysis"], compat: "76%", overlap: "6h/wk" },
    { name: "Lisa Wang", init: "LW", skills: ["Frontend Dev","UX Writing"], compat: "68%", overlap: "4h/wk" },
    { name: "Omar Ali", init: "OA", skills: ["Project Mgmt"], compat: "52%", overlap: "2h/wk" },
  ];
  return <div style={base.page}>
    <Nav go={go} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("board")}>← Back to Board</button>
      <div style={{ padding: "14px 18px", background: c.redBg, borderRadius: 10, marginBottom: 24, border: "1px solid #fca5a5" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: c.red, display: "flex", alignItems: "center", gap: 4 }}><Icon.clockAlert size={16} color={c.red} /> Deadline in 3 days</div>
        <div style={{ fontSize: 13, color: "#7f1d1d" }}>4 students are still ungrouped. Here are your best matches.</div>
      </div>
      <h1 style={base.h2}>Suggested Matches</h1>
      <p style={base.sub}>Sorted by compatibility with your profile.</p>
      {recs.map((r,i)=>(
        <div key={i} style={{ ...base.card, display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }} onClick={()=>go("snap-good")}>
          <div style={{ ...base.av, width: 46, height: 46, fontSize: 15 }}>{r.init}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>{r.skills.map(sk=><span key={sk} style={{ padding: "2px 8px", background: c.g100, borderRadius: 8, fontSize: 11, color: c.g600 }}>{sk}</span>)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{r.compat}</div>
            <div style={{ fontSize: 11, color: c.g500 }}>overlap: {r.overlap}</div>
          </div>
        </div>
      ))}
      <hr style={base.hr} />
      <button style={{ ...base.btn2, width: "100%" }}>Ask TA for help</button>
    </div>
  </div>;
}

// Email Notification Mockup
function EmailMock({ go }) {
  return <div style={base.page}>
    <Nav go={go} />
    <div style={base.medium}>
      <button style={base.back} onClick={()=>go("dash")}>← Back</button>
      <h1 style={base.h2}>Email Notification Preview</h1>
      <p style={base.sub}>This is what students receive when someone messages them.</p>
      <div style={{ border: `1px solid ${c.g200}`, borderRadius: 12, overflow: "hidden", background: c.white }}>
        <div style={{ padding: "16px 24px", background: c.g50, borderBottom: `1px solid ${c.g200}` }}>
          <div style={{ fontSize: 12, color: c.g500, marginBottom: 4 }}>From: <strong>unitor for CSC318</strong> &lt;notify@unitor.app&gt;</div>
          <div style={{ fontSize: 12, color: c.g500, marginBottom: 4 }}>To: jesse.nguyen@mail.utoronto.ca</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Subject: [CSC318] John D. sent you a message</div>
        </div>
        <div style={{ padding: "28px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}><span style={{ fontSize: 20, fontWeight: 800 }}>unitor</span></div>
          <div style={{ fontSize: 15, marginBottom: 12 }}>Hi Jesse,</div>
          <div style={{ fontSize: 14, color: c.g600, lineHeight: 1.7, marginBottom: 20 }}>
            <strong>John D.</strong> sent you a message in <strong>CSC318</strong>:
          </div>
          <div style={{ padding: "14px 18px", background: c.g50, borderRadius: 8, fontSize: 14, color: c.g700, lineHeight: 1.5, marginBottom: 24, borderLeft: `3px solid ${c.black}` }}>
            "Hey Jesse! I saw we have 8 hours of overlap and complementary skills. Want to team up for CSC318?"
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "inline-block", padding: "12px 32px", background: c.black, color: c.white, borderRadius: 8, fontSize: 14, fontWeight: 600 }}>View on unitor →</div>
          </div>
          <hr style={{ ...base.hr, margin: "20px 0" }} />
          <div style={{ fontSize: 12, color: c.g400, textAlign: "center" }}>You received this because you're enrolled in CSC318 on unitor.<br />University of Toronto · Winter 2026</div>
        </div>
      </div>
    </div>
  </div>;
}

// ==================== APP ====================
export default function Unitor() {
  const [pg, setPg] = useState("landing");
  const [role, setRole] = useState("s");
  const go = p => { if(p==="signup-s"){setRole("s");setPg("signup")} else if(p==="signup-t"){setRole("t");setPg("signup")} else setPg(p); };

  const P = {
    landing:<Landing go={go}/>, "signup-role":<SignupRole go={go}/>, signup:<SignupForm role={role} go={go}/>, verify:<Verify role={role} go={go}/>,
    dash:<Dash go={go}/>, join:<Join go={go}/>,
    "prof-0":<Prof0 go={go}/>, "prof-1":<Prof1 go={go}/>, "prof-2":<Prof2 go={go}/>, "prof-3":<Prof3 go={go}/>,
    "ta-dash":<TADash go={go}/>, "ta-create":<TACreate go={go}/>,
    board:<Board go={go}/>, "profile-view":<ProfileView go={go}/>,
    "snap-good":<SnapGood go={go}/>, "snap-warn":<SnapWarn go={go}/>, sent:<Sent go={go}/>,
    chat:<Chat go={go}/>, inbox:<Inbox go={go}/>, mygroup:<MyGroup go={go}/>,
    urgent:<Urgent go={go}/>, email:<EmailMock go={go}/>,
  };

  const nav = [
    { g: "Onboard", p: ["landing","signup-role","signup","verify"] },
    { g: "Student", p: ["dash","join","prof-0","prof-1","prof-2","prof-3"] },
    { g: "Board", p: ["board","profile-view","snap-good","snap-warn","sent"] },
    { g: "Social", p: ["chat","inbox","mygroup","urgent","email"] },
    { g: "TA", p: ["ta-dash","ta-create"] },
  ];

  return <div>
    {P[pg]}
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: c.white, borderTop: `1px solid ${c.g200}`, padding: "8px 16px", display: "flex", gap: 16, alignItems: "center", zIndex: 999, flexWrap: "wrap" }}>
      {nav.map(n=><div key={n.g} style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: 9, color: c.g400, fontWeight: 700, textTransform: "uppercase", marginRight: 3 }}>{n.g}</span>
        {n.p.map(p=><button key={p} onClick={()=>setPg(p)} style={{ padding: "3px 7px", fontSize: 10, border: pg===p?`1.5px solid ${c.black}`:`1px solid ${c.g200}`, borderRadius: 3, background: pg===p?c.black:c.white, color: pg===p?c.white:c.g500, cursor: "pointer", fontFamily: "monospace" }}>{p}</button>)}
      </div>)}
    </div>
  </div>;
}
