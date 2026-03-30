import { useState, useEffect, useRef, useCallback, Fragment, type ReactNode, type ReactElement, type Dispatch, type SetStateAction } from "react";
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

// ==================== TOAST SYSTEM ====================
type Toast = { id: number; message: string };
let toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[500] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="bg-foreground text-background px-5 py-3 rounded-xl shadow-lg text-[14px] font-medium animate-[fadeIn_0.3s_ease] cursor-pointer"
          onClick={() => onRemove(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ==================== LOCAL STORAGE HOOK ====================
const LS_PREFIX = "unitor_";

function useLocalStorage<T>(key: string, defaultValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const fullKey = LS_PREFIX + key;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch { /* ignore corrupt data */ }
    return typeof defaultValue === "function" ? (defaultValue as () => T)() : defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch { /* storage full — ignore */ }
  }, [fullKey, value]);

  return [value, setValue];
}

function clearAllLocalStorage() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

// ==================== TYPES ====================
interface GoProps {
  go: (page: string) => void;
}

interface RoleGoProps extends GoProps {
  role: string;
}

type NotificationType =
  | "group-request-received"
  | "group-application-received"
  | "request-accepted"
  | "request-declined"
  | "application-accepted"
  | "application-declined"
  | "member-left"
  | "confirm-requested"
  | "urgent-mode";

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  actionTarget?: string;
}

interface NotificationBellProps {
  notifications: AppNotification[];
  onNotificationClick: (n: AppNotification) => void;
  onMarkAllRead: () => void;
}

interface NotificationItemProps {
  notification: AppNotification;
  icon: ReactElement;
  onClick: () => void;
}

interface NavProps {
  go: (page: string) => void;
  activePage?: string;
  studentStatus?: "solo" | "open-group" | "closed";
  notifications?: AppNotification[];
  onNotificationClick?: (n: AppNotification) => void;
  onMarkAllRead?: () => void;
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
  disabled?: boolean;
}

interface IconProps {
  size?: number;
  color?: string;
}

interface Student {
  name: string;
  sec: string;
  skills: string[];
  status: "solo" | "open-group" | "closed";
  contactStatus: "none" | "request-sent" | "replied" | "declined" | "no-response";
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
function NotificationItem({ notification: n, icon, onClick }: NotificationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex gap-3 items-start px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-100",
        !n.read && "bg-accent/30"
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={cn("text-[12px] leading-snug", !n.read ? "font-semibold text-foreground" : "text-gray-700")}>
          {n.title}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5 truncate">{n.body}</div>
        <div className="text-[10px] text-gray-400 mt-1">{n.timestamp}</div>
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
    </button>
  );
}

function NotificationBell({ notifications, onNotificationClick, onMarkAllRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const TYPE_ICONS: Record<NotificationType, ReactElement> = {
    "group-request-received": <Icon.wave size={16} color="#9652ca" />,
    "group-application-received": <Icon.document size={16} color="#9652ca" />,
    "request-accepted": <Icon.checkCircle size={16} color="#16a34a" />,
    "request-declined": <Icon.xCircle size={16} color="#DC2626" />,
    "application-accepted": <Icon.checkCircle size={16} color="#16a34a" />,
    "application-declined": <Icon.xCircle size={16} color="#DC2626" />,
    "member-left": <Icon.userIcon size={16} color="#6B7280" />,
    "confirm-requested": <Icon.bellIcon size={16} color="#9652ca" />,
    "urgent-mode": <Icon.warning size={16} color="#DC2626" />,
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
          <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#DC2626] rounded-full" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[360px] bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-[200] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={onMarkAllRead} className="text-[11px] text-primary hover:text-accent-foreground cursor-pointer">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-gray-400">No notifications</div>
              ) : (
                notifications.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    icon={TYPE_ICONS[n.type]}
                    onClick={() => { onNotificationClick(n); setOpen(false); }}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const APP_PAGES = new Set(["board", "sent", "mygroup", "urgent", "profile-edit", "chats"]);
const PAGE_TO_TAB: Record<string, string> = {
  "board": "board", "sent": "board", "urgent": "board",
  "mygroup": "mygroup", "profile-edit": "profile-edit", "chats": "chats",
};

function Nav({ go, activePage = "", studentStatus = "solo", notifications = [], onNotificationClick = () => { }, onMarkAllRead = () => { }, right }: NavProps) {
  const isAppPage = APP_PAGES.has(activePage);
  const [avatarOpen, setAvatarOpen] = useState(false);

  if (!isAppPage) {
    return (
      <div className="flex justify-between items-center h-14 px-12 bg-white border-b border-[#E5E7EB] sticky top-0 z-[100]">
        <span className="text-[22px] font-extrabold text-foreground -tracking-[1px] cursor-pointer" onClick={() => go("landing")}>unitor</span>
        <div className="flex items-center gap-3">{right}</div>
      </div>
    );
  }

  const activeTab = PAGE_TO_TAB[activePage] ?? "";
  const tabs = [
    { id: "board", label: "Discovery", show: studentStatus !== "closed" },
    { id: "mygroup", label: "My Group", show: true },
    { id: "chats", label: "Chats", show: true },
    { id: "profile-edit", label: "Profile", show: true },
  ];

  return (
    <div className="flex justify-between items-stretch h-14 px-12 bg-white border-b border-[#E5E7EB] sticky top-0 z-[100]">
      <span className="flex items-center text-[22px] font-extrabold text-foreground -tracking-[1px] cursor-pointer" onClick={() => go("landing")}>unitor</span>
      <div className="flex h-full items-end gap-1" role="tablist">
        {tabs.filter(t => t.show).map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => go(t.id)}
            className={cn(
              "px-4 pb-[11px] text-[16px] border-b-[4px] transition-colors cursor-pointer",
              activeTab === t.id
                ? "font-bold text-[#111827] border-[#9652ca]"
                : "font-medium text-[#6B7280] border-transparent hover:text-[#111827] hover:border-[#9652ca]/40"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell
          notifications={notifications}
          onNotificationClick={onNotificationClick}
          onMarkAllRead={onMarkAllRead}
        />
        <div className="relative">
          {avatarOpen && <div className="fixed inset-0 z-[190]" onClick={() => setAvatarOpen(false)} />}
          <button onClick={() => setAvatarOpen(o => !o)} className="rounded-full cursor-pointer">
            <Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">JD</AvatarFallback></Avatar>
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-background border border-border rounded-xl shadow-lg z-[200] overflow-hidden py-1">
              <button onClick={() => { go("profile-edit"); setAvatarOpen(false); }} className="w-full text-left px-4 py-2.5 text-[13px] text-[#374151] hover:bg-gray-50">Edit Profile</button>
              <button onClick={() => { go("landing"); setAvatarOpen(false); }} className="w-full text-left px-4 py-2.5 text-[13px] text-[#374151] hover:bg-gray-50">Log Out</button>
            </div>
          )}
        </div>
      </div>
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

function TGrid({ sel, set, label, disabled = false }: TGridProps) {
  const ds = ["Mon", "Tue", "Wed", "Thu", "Fri"], ts = ["9am–12pm", "12–4pm", "4–8pm", "8–11pm"];
  const dragging = useRef(false);
  const didDragMultiple = useRef(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const startDrag = (k: string) => {
    if (disabled) return;
    dragging.current = true;
    didDragMultiple.current = false;
    const mode = sel.has(k) ? "remove" : "add";
    setDragMode(mode);
    const n = new Set(sel);
    mode === "add" ? n.add(k) : n.delete(k);
    set(n);
  };
  const enterDrag = (k: string) => {
    if (!dragging.current || disabled) return;
    didDragMultiple.current = true;
    const n = new Set(sel);
    dragMode === "add" ? n.add(k) : n.delete(k);
    set(n);
  };
  const stopDrag = () => { dragging.current = false; };
  return (
    <div className={cn("mb-7", disabled && "opacity-40")} onMouseUp={stopDrag} onMouseLeave={stopDrag}>
      <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">{label}</Label>
      <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]" style={{ userSelect: "none" }}>
        <div />{ds.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
        {ts.map((t, ti) => <Fragment key={ti}>
          <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
          {ds.map(d => {
            const k = `${d}-${ti}`; return <button key={k} type="button" role="checkbox" aria-checked={sel.has(k)} aria-label={`${d} ${t}`}
              onMouseDown={(e) => { e.preventDefault(); startDrag(k); }}
              onMouseEnter={() => enterDrag(k)}
              className={cn("py-2.5 px-1 text-center rounded-md text-xs font-medium transition-colors border", disabled ? "pointer-events-none cursor-default" : "cursor-pointer", sel.has(k) ? "bg-primary text-primary-foreground border-primary" : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:border-gray-300")} />;
          })}
        </Fragment>)}
      </div>
    </div>
  );
}

// ==================== ICONS ====================
const Icon: Record<string, (props: IconProps) => ReactElement> = {
  graduation: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 13c-2.755 0-5-2.245-5-5V3.5H4V2h14.75c.69 0 1.25.56 1.25 1.25V9h-1.5V3.5H17V8c0 2.755-2.245 5-5 5ZM8.5 8c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V7h-7v1Zm0-2.5h7v-2h-7v2Zm6.43 9a4.752 4.752 0 0 1 4.59 3.52l1.015 3.785-1.45.39-1.015-3.785A3.253 3.253 0 0 0 14.93 16H9.07c-1.47 0-2.76.99-3.14 2.41l-1.015 3.785-1.45-.39L4.48 18.02a4.762 4.762 0 0 1 4.59-3.52h5.86Z" fill={color} />
    </svg>
  ),
  clipboard: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.105 5H5.5v15.5h5V22H4V3.5h3V2h10v1.5h3V11h-1.5V5h-1.605c-.33 1.15-1.39 2-2.645 2h-4.5c-1.26 0-2.315-.85-2.645-2ZM15.5 3.5h-7v.75c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25V3.5Zm2.22 9.72a2.164 2.164 0 1 1 3.06 3.06l-5.125 5.125-2.22.74a1.237 1.237 0 0 1-1.28-.3c-.335-.34-.45-.83-.3-1.28l.74-2.22 5.125-5.125Zm-2.875 6.875 4.875-4.875a.664.664 0 1 0-.94-.94l-4.875 4.875-.47 1.41 1.41-.47Z" fill={color} />
    </svg>
  ),
  email: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M19.25 20H6.5v-1.5h12.75c.69 0 1.25-.56 1.25-1.25V9.46L12 14.37 2 8.595V6.75A2.755 2.755 0 0 1 4.75 4h14.5A2.755 2.755 0 0 1 22 6.75v10.5A2.755 2.755 0 0 1 19.25 20ZM3.5 7.725 12 12.63l8.5-4.905V6.75c0-.69-.56-1.25-1.25-1.25H4.75c-.69 0-1.25.56-1.25 1.25v.975ZM9 15H3.5v1.5H9V15Zm-7-3h2.5v1.5H2V12Z" fill={color} />
    </svg>
  ),
  books: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 4a3.745 3.745 0 0 0-3 1.51A3.745 3.745 0 0 0 9 4H2v16h7.5c.69 0 1.25.56 1.25 1.25h2.5c0-.69.56-1.25 1.25-1.25H22V4h-7Zm-3.75 15.13a2.726 2.726 0 0 0-1.75-.63h-6v-13H9c1.24 0 2.25 1.01 2.25 2.25v11.38Zm9.25-.63h-6c-.665 0-1.275.235-1.75.63V7.75c0-1.24 1.01-2.25 2.25-2.25h5.5v13Z" fill={color} />
    </svg>
  ),
  camera: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2 17.25A2.755 2.755 0 0 0 4.75 20h14.5A2.755 2.755 0 0 0 22 17.25v-9a2.755 2.755 0 0 0-2.75-2.75h-2.64l-2-2.5H9.39l-2 2.5H4.75A2.755 2.755 0 0 0 2 8.25v9ZM8.11 7l2-2.5h3.78l2 2.5h3.36c.69 0 1.25.56 1.25 1.25v9c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-9C3.5 7.56 4.06 7 4.75 7h3.36Zm-.61 5.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5S14.48 8 12 8s-4.5 2.02-4.5 4.5Zm1.5 0c0-1.655 1.345-3 3-3s3 1.345 3 3-1.345 3-3 3-3-1.345-3-3Z" fill={color} />
    </svg>
  ),
  search: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m21.78 20.72-5.62-5.62A7.96 7.96 0 0 0 18 10c0-4.41-3.59-8-8-8s-8 3.59-8 8 3.59 8 8 8a7.96 7.96 0 0 0 5.1-1.84l5.62 5.62 1.06-1.06ZM10 16.5A6.506 6.506 0 0 1 3.5 10c0-3.585 2.915-6.5 6.5-6.5s6.5 2.915 6.5 6.5-2.915 6.5-6.5 6.5Z" fill={color} />
    </svg>
  ),
  balance: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.75 12.5h9.265l-.02-.77a9.99 9.99 0 0 0-9.725-9.725l-.77-.02v9.265c0 .69.56 1.25 1.25 1.25Zm7.69-1.5H13V3.56A8.493 8.493 0 0 1 20.44 11ZM3.5 12c0 4.685 3.815 8.5 8.5 8.5 3.965 0 7.345-2.785 8.255-6.5h1.535c-.94 4.545-5 8-9.79 8-5.515 0-10-4.485-10-10 0-4.83 3.44-8.87 8-9.8v1.545C6.275 4.65 3.5 8.005 3.5 12Z" fill={color} />
    </svg>
  ),
  chat: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155ZM3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94V5.75Zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19l1.925 1.925Z" fill={color} />
    </svg>
  ),
  clockAlert: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 22C6.485 22 2 17.515 2 12S6.485 2 12 2s10 4.485 10 10-4.485 10-10 10Zm0-18.5c-4.685 0-8.5 3.815-8.5 8.5 0 4.685 3.815 8.5 8.5 8.5 4.685 0 8.5-3.815 8.5-8.5 0-4.685-3.815-8.5-8.5-8.5Zm.75 10V8h-1.5v5.5h1.5ZM13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill={color} />
    </svg>
  ),
  star: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  starFilled: ({ size = 24, color = "#9652ca" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  eyeOpen: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  pencil: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" />
    </svg>
  ),
  reactCheck: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" /><path d="M9 12l2 2l4 -4" />
    </svg>
  ),
  reactThumbUp: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3" />
    </svg>
  ),
  reactHeart: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
    </svg>
  ),
  reactSad: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10l.01 0" /><path d="M15 10l.01 0" /><path d="M9.5 15.25a3.5 3.5 0 0 1 5 0" /><path d="M17.566 17.606a2 2 0 1 0 2.897 .03l-1.463 -1.636l-1.434 1.606z" /><path d="M20.865 13.517a8.937 8.937 0 0 0 .135 -1.517a9 9 0 1 0 -9 9c.69 0 1.36 -.076 2 -.222" />
    </svg>
  ),
  mailSend: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" /><path d="M3 7l9 6l9 -6" />
    </svg>
  ),
  wave: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10V6a2 2 0 0 0-4 0v8c0 4.42 3.58 8 8 8h1a7 7 0 0 0 7-7v-3a2 2 0 0 0-4 0" />
    </svg>
  ),
  document: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  checkCircle: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  xCircle: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  userIcon: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  bellIcon: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" />
    </svg>
  ),
  thumbUp: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  thumbDown: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" /><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
    </svg>
  ),
  warning: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  messageCircle: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  chevronLeft: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  x: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

// ==================== PAGES ====================

// Landing
function Landing({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<><Button variant="outline" size="sm" className="px-4" onClick={() => go("login")}>Log In</Button><Button size="sm" className="px-4" onClick={() => go("signup-role")}>Sign Up</Button></>} />
    <div className="text-center pt-[120px] px-6 pb-20">
      <h1 className="text-[52px] font-extrabold -tracking-[2px] text-foreground mb-4 leading-[1.05]">Find your people.<br />Form your team.</h1>
      <p className="text-lg text-gray-600 max-w-[520px] mx-auto mb-11 leading-[1.7]">Match with classmates by skills, schedule, and work style.</p>
      <div className="flex gap-3.5 justify-center">
        <Button className="px-9 py-3.5 text-base h-auto" onClick={() => go("signup-role")}>Get Started</Button>
        <Button variant="outline" className="px-9 py-3.5 text-base h-auto" onClick={() => go("login")}>Log In</Button>
      </div>
    </div>
    <div className="max-w-[880px] mx-auto px-6 pb-[100px] grid grid-cols-3 gap-5">
      {(["Discover", "Compare", "Connect"] as const).map((t, i) => {
        const descs = ["Browse available teammates.", "Compare schedules, skills, and work style.", "Message and form your group."];
        const icons = [<Icon.search key="s" size={32} />, <Icon.balance key="b" size={32} />, <Icon.chat key="c" size={32} />];
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
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Join unitor</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">How will you use unitor?</p>
      {[{ i: <Icon.graduation size={24} />, t: "Student", d: "Find and join project groups", to: "signup-s" }, { i: <Icon.clipboard size={24} />, t: "TA / Instructor", d: "Create courses and manage groups", to: "signup-t" }].map(r => (
        <Card key={r.t} className="p-5 mb-3.5 shadow-none cursor-pointer flex-row items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-colors" onClick={() => go(r.to)}>
          <div className="w-[50px] h-[50px] rounded-xl bg-gray-50 flex items-center justify-center">{r.i}</div>
          <div className="flex-1"><div className="text-base font-semibold">{r.t}</div><div className="text-sm text-gray-500">{r.d}</div></div>
          <span className="text-gray-300 text-lg">→</span>
        </Card>
      ))}
    </div>
  </div>;
}

// Signup Form
interface SignupFormProps extends RoleGoProps {
  onSetName: (name: string) => void;
  onSetEmail: (email: string) => void;
}

function SignupForm({ role, go, onSetName, onSetEmail }: SignupFormProps) {
  const [showError, setShowError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const canSubmit = fullName.trim().length > 0 && university.length > 0 && email.trim().length > 0 && pw.length >= 8 && pw === pw2;
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
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<span className="text-[13px] text-gray-500">{role === "t" ? "TA / Instructor" : "Student"}</span>} />
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 1 of 2</div>
      <Progress value={(1 / 2) * 100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Create your account</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Verification link will be sent to your email.</p>
      <F l="Full Name" id="signup-name"><Input id="signup-name" placeholder="e.g. John Doe" value={fullName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} /></F>
      <F l="University">
        <Select value={university} onValueChange={setUniversity}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select your university..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="utoronto">University of Toronto</SelectItem>
            <SelectItem value="york">York University</SelectItem>
          </SelectContent>
        </Select>
      </F>
      <div className="mb-[18px]">
        <Label htmlFor="signup-email" className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">University Email</Label>
        <Input id="signup-email" placeholder="yourid@mail.utoronto.ca" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setEmailError(false); }} className={emailError ? "border-danger" : ""} />
        <p className="text-[13px] text-gray-500 mt-1.5">Must match your course enrollment email.</p>
        {emailError && <p className="text-[13px] text-danger mt-1">Your email was not found in this course. Contact your TA.</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-1">
        <F l="Password" id="signup-pw"><Input id="signup-pw" type="password" placeholder="Min 8 characters" value={pw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPw(e.target.value); setShowError(false); }} /></F>
        <F l="Confirm Password" id="signup-pw2"><Input id="signup-pw2" type="password" placeholder="Re-enter" className={showError ? "border-danger" : ""} value={pw2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPw2(e.target.value); setShowError(false); }} /></F>
      </div>
      {pw2.length > 0 && pw !== pw2 && <div className="text-[13px] text-danger mb-4">Passwords don't match.</div>}
      {(pw2.length === 0 || pw === pw2) && <div className="mb-5" />}
      <Button className="w-full px-7 py-3 h-auto" disabled={!canSubmit} onClick={handleSubmit}>Send Verification Email</Button>
    </div>
  </div>;
}

interface VerifyProps extends RoleGoProps {
  userEmail?: string;
}

// Email Verify
function Verify({ role, go, userEmail }: VerifyProps) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto pt-20 px-6 text-center">
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 2 of 2</div>
      <Progress value={(2 / 2) * 100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <div className="mb-5 flex justify-center"><Icon.email size={48} /></div>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px] text-center">Check your inbox</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed text-center">We sent a link to <strong>{userEmail || "j.doe@mail.utoronto.ca"}</strong></p>
      <Button className="w-full px-7 py-3 h-auto" onClick={() => go(role === "t" ? "ta-dash-empty" : "dash-empty")}>I've Verified My Email</Button>
      <div className="mt-3.5"><Button variant="link" className="text-foreground">Resend email</Button></div>
    </div>
  </div>;
}

// Student Dashboard — Empty
function DashEmpty({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">Welcome back,</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">My Courses</h1></div>
        <Button size="sm" className="px-4" onClick={() => go("join")}>+ Join a Course</Button>
      </div>
      <Card className="py-[52px] px-6 mb-3.5 gap-0 shadow-none text-center border-dashed border-gray-300">
        <div className="mb-3 flex justify-center"><Icon.books size={36} /></div>
        <p className="text-[15px] text-gray-500 mb-4">No courses yet.</p>
        <Button variant="outline" size="sm" className="px-4 mx-auto" onClick={() => go("join")}>Join your first course</Button>
      </Card>
    </div>
  </div>;
}

interface DashProps extends GoProps {
  userName?: string;
}

// Student Dashboard — With CSC318
function Dash({ go, userName }: DashProps) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<div className="flex items-center gap-4"><Button variant="outline" size="sm" className="px-4" onClick={() => go("mygroup")}>My Group</Button><span className="text-sm text-gray-600">{userName || "John"}</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-[13px] font-bold">JD</AvatarFallback></Avatar></div>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">Welcome back,</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">My Courses</h1></div>
        <Button size="sm" className="px-4" onClick={() => go("join")}>+ Join a Course</Button>
      </div>
      <Card className="p-5 mb-3.5 gap-0 shadow-none cursor-pointer hover:border-gray-300 hover:shadow-sm transition-colors" onClick={() => go("board")}>
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
  const [code, setCode] = useState("");
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("dash")}>← Back to Dashboard</Button>
      {step === 0 ? <>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Join a Course</h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">Enter course code from your TA.</p>
        <F l="Course Code"><Input className="text-[22px] font-bold tracking-[6px] text-center py-[18px] h-auto" placeholder="ABC123" value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></F>
        <Button className="w-full px-7 py-3 h-auto" disabled={!code.trim()} onClick={() => setStep(1)}>Look Up</Button>
      </> :
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
            <Button variant="outline" className="flex-1 px-7 py-3 h-auto" onClick={() => setStep(0)}>Back</Button>
            <Button className="flex-1 px-7 py-3 h-auto" onClick={() => go("prof-0")}>Join & Set Up Profile</Button>
          </div>
        </>}
    </div>
  </div>;
}

// Profile 0 - Name & Photo
interface Prof0Props extends GoProps {
  initialName?: string;
  onSaveName?: (name: string) => void;
}

function Prof0({ go, initialName, onSaveName }: Prof0Props) {
  const [name, setName] = useState(initialName ?? "");
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<span className="text-[13px] text-gray-500 leading-relaxed">CSC318 · Profile</span>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("join")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 1 of 4</div>
      <Progress value={(1 / 4) * 100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Your Profile</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">How teammates will see you.</p>
      <div className="text-center mb-7">
        <Avatar className="size-[88px] mx-auto mb-3 border-2 border-dashed border-gray-300 bg-gray-50">
          <AvatarFallback className="bg-gray-50"><Icon.camera size={28} color="var(--gray-300)" /></AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm" className="px-4">Upload Photo</Button>
      </div>
      <F l="Display Name"><Input placeholder="e.g. John D." value={name} onChange={e => setName(e.target.value)} /></F>
      <Button className="w-full px-7 py-3 h-auto" disabled={!name.trim()} onClick={() => { onSaveName?.(name); go("prof-1"); }}>Next</Button>
    </div>
  </div>;
}

// Profile 1 - Skills
function Prof1({ go }: GoProps) {
  const pre = ["UI Design", "Frontend Dev", "Backend", "User Research", "Prototyping", "Data Analysis", "UX Writing", "Project Mgmt"];
  const [sel, setSel] = useState<string[]>([]);
  const [rat, setRat] = useState<Record<string, string>>({});
  const lvl = ["Beginner", "Intermediate", "Proficient", "Expert"];
  const tog = (sk: string) => { if (sel.includes(sk)) { setSel(sel.filter(x => x !== sk)); const r = { ...rat }; delete r[sk]; setRat(r); } else { setSel([...sel, sk]); setRat({ ...rat, [sk]: "Intermediate" }); } };
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<span className="text-[13px] text-gray-500 leading-relaxed">CSC318 · Profile</span>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("prof-0")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 2 of 4</div>
      <Progress value={(2 / 4) * 100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Your Skills</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Select at least 2 skills.</p>
      <div className="mb-5">
        {pre.map(sk => <button key={sk} type="button" aria-pressed={sel.includes(sk)} className={cn("inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] transition-colors", sel.includes(sk) ? "bg-primary text-primary-foreground border-primary" : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300")} onClick={() => tog(sk)}>{sk}</button>)}
        <button type="button" className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-gray-100 text-gray-600 border-gray-200 border-dashed">+ Custom</button>
      </div>
      {sel.length > 0 && <Card className="p-0 mb-6 gap-0 shadow-none overflow-hidden">
        {sel.map((sk, i) => <div key={sk} className={cn("flex justify-between items-center px-5 py-3", i < sel.length - 1 && "border-b border-gray-100")}>
          <span className="text-sm font-medium">{sk}</span>
          <div className="flex gap-1">{lvl.map(l => <button key={l} type="button" aria-pressed={rat[sk] === l} className={cn("py-1 px-2.5 rounded-md text-xs font-medium cursor-pointer transition-colors", rat[sk] === l ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-500 hover:bg-gray-200")} onClick={() => setRat({ ...rat, [sk]: l })}>{l}</button>)}</div>
        </div>)}
      </Card>}
      {sel.length < 2 && sel.length > 0 && <p className="text-[13px] text-danger mb-3">Select at least one more skill.</p>}
      <Button className="w-full px-7 py-3 h-auto" disabled={sel.length < 2} onClick={() => go("prof-2")}>Next</Button>
    </div>
  </div>;
}

// Profile 2 - Section & Schedule
function Prof2({ go }: GoProps) {
  const [sched, setSched] = useState<Set<string>>(new Set(["Mon-1", "Tue-1", "Wed-1", "Thu-2", "Fri-1"]));
  const [flexible, setFlexible] = useState(false);
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<span className="text-[13px] text-gray-500 leading-relaxed">CSC318 · Profile</span>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("prof-1")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 3 of 4</div>
      <Progress value={(3 / 4) * 100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Section & Schedule</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">For matching compatible schedules.</p>
      <div className="mb-[18px]">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Your Section</Label>
        <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
          <span className="text-sm font-medium">L0201</span>
          <span className="text-[11px] text-gray-400 ml-auto">Pre-filled from enrollment</span>
        </div>
      </div>
      <p className="text-[13px] text-gray-500 mb-3">Click or drag to select available times.</p>
      <TGrid sel={sched} set={setSched} label="When can you work on the project?" disabled={flexible} />
      <label className="flex items-center gap-2 -mt-4 mb-7 cursor-pointer">
        <Checkbox checked={flexible} onCheckedChange={(v) => setFlexible(v === true)} />
        <span className="text-[13px] text-gray-600">Flexible / Not sure</span>
      </label>
      <Button className="w-full px-7 py-3 h-auto" onClick={() => go("prof-3")}>Next</Button>
    </div>
  </div>;
}

// Profile 3 - Communication & Bio
function Prof3({ go }: GoProps) {
  const plats = ["Discord", "WhatsApp", "Email", "Instagram DM", "iMessage", "KakaoTalk"];
  const [sp, setSp] = useState<string[]>(["Discord"]);
  const [bio, setBio] = useState("");
  const tp = (p: string) => setSp(sp.includes(p) ? sp.filter(x => x !== p) : [...sp, p]);
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<span className="text-[13px] text-gray-500 leading-relaxed">CSC318 · Profile</span>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("prof-2")}>← Back</Button>
      <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">Step 4 of 4</div>
      <Progress value={(4 / 4) * 100} className="h-[3px] bg-gray-100 rounded-sm mb-8" />
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Communication & About You</h1>
      <div className="mb-5">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Preferred Platforms</Label>
        <div className="flex flex-wrap gap-1.5">{plats.map(p => <button key={p} type="button" aria-pressed={sp.includes(p)} className={cn("inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer border-[1.5px] transition-colors", sp.includes(p) ? "bg-primary text-primary-foreground border-primary" : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300")} onClick={() => tp(p)}>{p}</button>)}</div>
      </div>
      {sp.length > 0 && <div className={cn("grid gap-3 mb-5", sp.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {sp.map(p => <F key={p} l={`${p} handle`}><Input placeholder={`Your ${p} username`} /></F>)}
      </div>}
      <Separator className="my-6 bg-gray-100" />
      <F l="About You"><Textarea className="min-h-[100px] resize-y" placeholder="About you and your ideal group" value={bio} onChange={e => setBio(e.target.value.slice(0, 300))} /><div className={cn("text-[13px] leading-relaxed text-right mt-1", bio.length >= 300 ? "text-danger" : "text-gray-500")}>{bio.length}/300</div></F>
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Links (optional)</Label>
        <p className="text-[13px] text-gray-500 mb-2">Add portfolio, GitHub, LinkedIn, or any relevant links.</p>
        <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
          <Input placeholder="Label" /><Input placeholder="https://..." /><Button variant="outline" size="sm" className="px-4">Add</Button>
        </div>
      </div>
      <Button className="w-full px-7 py-3 h-auto" disabled={!bio.trim()} onClick={() => go("prof-done")}>Complete Profile</Button>
    </div>
  </div>;
}

// Profile Complete Confirmation
function ProfDone({ go, onJoinCourse }: GoProps & { onJoinCourse: () => void }) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto pt-[100px] px-6 text-center">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#9652ca]/15 flex items-center justify-center"><span className="text-3xl text-[#9652ca]">✓</span></div>
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Profile Complete!</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">You're ready to find teammates.</p>
      <Button className="px-9 py-3.5 text-base h-auto" onClick={() => { onJoinCourse(); go("board"); }}>Go to Matching Board</Button>
    </div>
  </div>;
}

// TA Admin Data
const ADMIN_DATA = {
  atRisk: [
    { name: "Priya Sharma", sec: "201", init: "PS", daysSinceActivity: 8, skills: ["Backend", "Data Analysis"] },
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
    { section: "201", total: 18, grouped: 12, ungrouped: 6, searching: 4, forming: 2 },
    { section: "202", total: 14, grouped: 10, ungrouped: 4, searching: 2, forming: 2 },
    { section: "203", total: 10, grouped: 6, ungrouped: 4, searching: 3, forming: 1 },
  ],
  skillDemand: [
    { skill: "Frontend Dev", seekers: 12, available: 5 },
    { skill: "Backend", seekers: 14, available: 3 },
    { skill: "UI Design", seekers: 8, available: 7 },
    { skill: "User Research", seekers: 6, available: 9 },
  ],
};

const UNGROUPED_STUDENTS = [
  { name: "Omar Ali", sec: "L0101", requestsSent: 0, requestsReceived: 1, lastActive: "3 days ago" },
  { name: "Priya S.", sec: "L0201", requestsSent: 2, requestsReceived: 0, lastActive: "1 day ago" },
  { name: "Chris Lee", sec: "L0101", requestsSent: 0, requestsReceived: 0, lastActive: "5 days ago" },
];

const POST_DEADLINE_GROUPS = [
  { id: "G1", members: ["Jesse Nguyen", "Sofia Rodriguez", "David Park"], autoAssigned: false },
  { id: "G2", members: ["Marcus Lee", "Lisa Wang", "Kai Tanaka"], autoAssigned: false },
  { id: "G3", members: ["Omar Ali", "Chris Lee", "Priya S.", "Elena Popov"], autoAssigned: true },
  { id: "G4", members: ["Wei Zhang", "Aisha Khan"], autoAssigned: true },
];

// TA Dashboard — Empty
function TADashEmpty({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<div className="flex items-center gap-2.5"><span className="text-sm text-gray-600">Prof. Truong</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">KT</AvatarFallback></Avatar></div>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">Welcome back,</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">My Courses</h1></div>
        <Button size="sm" className="px-4" onClick={() => go("ta-create")}>+ Create Course</Button>
      </div>
      <Card className="py-[52px] px-6 mb-3.5 gap-0 shadow-none text-center border-dashed border-gray-300">
        <div className="mb-3 flex justify-center"><Icon.books size={36} /></div>
        <p className="text-[15px] text-gray-500 mb-4">No courses yet.</p>
        <Button variant="outline" size="sm" className="px-4 mx-auto" onClick={() => go("ta-create")}>Create your first course</Button>
      </Card>
    </div>
  </div>;
}

// TA Dashboard — With CSC318
function TADash({ go }: GoProps) {
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<div className="flex items-center gap-2.5"><span className="text-sm text-gray-600">Prof. Truong</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">KT</AvatarFallback></Avatar></div>} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">Welcome back,</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">My Courses</h1></div>
        <Button size="sm" className="px-4" onClick={() => go("ta-create")}>+ Create Course</Button>
      </div>
      <Card className="p-5 mb-3.5 gap-0 shadow-none cursor-pointer hover:border-gray-300 hover:shadow-sm transition-colors" onClick={() => go("ta-course-dash")}>
        <div className="flex justify-between items-start">
          <div><div className="text-lg font-semibold">CSC318</div><div className="text-sm text-gray-500">The Design of Interactive Computational Media</div><div className="text-[13px] text-gray-400 mt-1">Winter 2026 · 42 students</div></div>
          <Badge variant="success">Active</Badge>
        </div>
        <Separator className="my-3.5 bg-gray-100" />
        <div className="flex justify-between"><span className="text-[13px] text-gray-500">Group formation</span><span className="text-[13px] font-semibold">14 ungrouped →</span></div>
      </Card>
    </div>
  </div>;
}

function TACourseDash({ go, showToast }: GoProps & { showToast?: (msg: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "students" | "alerts">("overview");
  const [studentFilter, setStudentFilter] = useState("all");
  const [postDeadline, setPostDeadline] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText("W543M7").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const filteredAdminStudents = STU.filter(s => {
    if (studentFilter === "ungrouped") return s.status === "solo" || s.status === "open-group";
    if (studentFilter === "atrisk") return ADMIN_DATA.atRisk.some(r => r.name === s.name);
    return true;
  });
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} right={<div className="flex items-center gap-2.5"><span className="text-sm text-gray-600">Prof. Truong</span><Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">KT</AvatarFallback></Avatar></div>} />
    <div className="max-w-[780px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("ta-dash")}>← Back to Courses</Button>
      <div className="flex justify-between items-center mb-7">
        <div><div className="text-sm text-gray-500 mb-0.5">TA Dashboard</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">CSC318</h1></div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6" role="tablist">
        {(["overview", "students", "alerts"] as const).map(t => (
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
            {([["42", "Students"], ["6", "Groups"], ["14", "Ungrouped"], ["12 days left", "Deadline"]] as const).map(([v, l]) => <div key={l}><div className={cn("font-bold", v === "12 days left" ? "text-base" : "text-2xl")}>{v}</div><div className="text-xs text-gray-500">{l}</div></div>)}
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[13px] font-medium">Group confirmation progress</span>
              <span className="text-[13px] font-bold text-success">21%</span>
            </div>
            <Progress value={21} className="h-2" />
            <div className="text-[11px] text-gray-500 mt-1">10 of 45 students confirmed</div>
          </div>
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
          <div className="flex flex-col gap-3">
            {ADMIN_DATA.sectionBreakdown.map((s) => (
              <div key={s.section} className="rounded-lg border border-gray-200 p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Section {s.section}</span>
                  <span className="text-xs text-gray-500">{s.total} students</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Solo", count: s.searching, cls: "text-danger" },
                    { label: "Open Group", count: s.forming, cls: "text-warning" },
                    { label: "Grouped", count: s.grouped, cls: "text-success" },
                  ].map(({ label, count, cls }) => (
                    <div key={label} className="text-center py-2 bg-gray-50 rounded-lg">
                      <div className={cn("text-lg font-bold", cls)}>{count}</div>
                      <div className="text-[10px] text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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

        {/* Ungrouped Students */}
        <Card className="p-5 gap-0 shadow-none mt-4">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Ungrouped Students</Label>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500">Name</th>
                  <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Section</th>
                  <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Sent</th>
                  <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Received</th>
                  <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500">Last Active</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {UNGROUPED_STUDENTS.map((st, i) => {
                  const inactive = parseActivityMinutes(st.lastActive) > 3 * 24 * 60;
                  return (
                    <tr key={st.name} className={i < UNGROUPED_STUDENTS.length - 1 ? "border-b border-gray-100" : ""}>
                      <td className="py-2 px-3 font-medium">{st.name}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{st.sec}</td>
                      <td className="py-2 px-3 text-center">{st.requestsSent}</td>
                      <td className="py-2 px-3 text-center">{st.requestsReceived}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{st.lastActive}</td>
                      <td className="py-2 px-3 text-right">
                        {inactive && <Badge variant="warning" className="text-[10px]">Inactive</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Post-deadline demo toggle */}
        <div className="flex justify-end mt-4">
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setPostDeadline(pd => !pd)}>
            {postDeadline ? "Normal View" : "Post-deadline View"}
          </Button>
        </div>

        {/* Post-deadline group list */}
        {postDeadline && (
          <Card className="p-5 gap-0 shadow-none mt-3">
            <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">All Groups (confirmed + auto-assigned)</Label>
            <div className="flex flex-col gap-2">
              {POST_DEADLINE_GROUPS.map((g) => (
                <div key={g.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Group {g.id}</span>
                      {g.autoAssigned && <Badge variant="warning" className="text-[10px]">Auto-assigned</Badge>}
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={() => window.alert("Move student — stub")}>Move student</Button>
                  </div>
                  <div className="text-xs text-gray-500">{g.members.join(", ")}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
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
          const ss = SS[st.status] ?? { l: st.status, variant: "secondary" as const };
          return <Card key={i} className="p-4 mb-2.5 shadow-none flex-row items-center gap-3">
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
            <Button size="sm" className="text-xs px-4" onClick={() => showToast?.("Provisional groups generated")}>Review provisional groups</Button>
            <Button variant="outline" size="sm" className="text-xs px-4" onClick={() => showToast?.("Deadline extended by 3 days")}>Extend deadline</Button>
            <Button variant="outline" size="sm" className="text-xs px-4" onClick={() => showToast?.("Email sent to all ungrouped students")}>Email all ungrouped</Button>
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
              <Button size="sm" variant="outline" className="text-xs px-4" onClick={() => showToast?.("Reminder email sent to " + st.name)}>Send reminder email</Button>
              <Button size="sm" variant="outline" className="text-xs px-4" onClick={() => showToast?.("Match suggestion sent to " + st.name)}>Suggest match</Button>
            </div>
          </Card>
        ))}

        <Separator className="my-5 bg-gray-100" />
        <Button className="w-full px-7 py-3 h-auto" onClick={() => showToast?.("Bulk reminder sent to all ungrouped students")}>Send bulk reminder to all ungrouped</Button>
      </>}
    </div>
  </div>;
}

// TA Create Course
function TACreate({ go, onCreateCourse, showToast }: GoProps & { onCreateCourse: () => void; showToast?: (msg: string) => void }) {
  const [skills, setSkills] = useState<string[]>(["UI Design", "Frontend Dev", "Backend", "User Research", "Prototyping", "Data Analysis"]);
  const [secs, setSecs] = useState<string[]>(["201", "202", "203"]);
  const [newSec, setNewSec] = useState("");
  const [uploaded, setUploaded] = useState(false);
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} />
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("ta-dash")}>← Back</Button>
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
          {secs.map(sc => <span key={sc} className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium border-[1.5px] bg-primary text-primary-foreground border-primary">{sc} <span className="ml-1.5 opacity-60 cursor-pointer" onClick={() => setSecs(secs.filter(x => x !== sc))}>×</span></span>)}
        </div>
        <div className="flex gap-2">
          <Input className="w-[120px]" placeholder="e.g. 204" value={newSec} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSec(e.target.value)} />
          <Button variant="outline" size="sm" className="px-4" onClick={() => { if (newSec.trim()) { setSecs([...secs, newSec.trim()]); setNewSec(""); } }}>+ Add</Button>
        </div>
      </div>

      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills for this Course</Label>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-2.5">Students pick from these.</p>
        <div>{skills.map(sk => <span key={sk} className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-primary text-primary-foreground border-primary">{sk} <span className="ml-1.5 opacity-60 cursor-pointer" onClick={() => setSkills(skills.filter(x => x !== sk))}>×</span></span>)}<span className="inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] bg-gray-100 text-gray-600 border-gray-200 border-dashed">+ Add Skill</span></div>
      </div>
      <Separator className="my-6 bg-gray-100" />
      <div className="mb-7">
        <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Import Student Roster (Optional)</Label>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-3">Upload a CSV with columns: name, email, section.</p>
        <Input type="file" accept=".csv" className="text-sm" onChange={() => setUploaded(true)} />
        {uploaded && (
          <div className="py-3 px-4 bg-success-bg rounded-lg border border-success-border mt-3">
            <div className="text-[13px] font-bold text-success mb-1">✓ 45 students imported</div>
            <div className="text-[12px] text-success">L0101: 23 students · L0201: 22 students</div>
          </div>
        )}
      </div>
      <Button className="w-full px-7 py-3 h-auto" onClick={() => { onCreateCourse(); showToast?.("Course created!"); go("ta-dash"); }}>Create Course</Button>
    </div>
  </div>;
}

// Student data
const STU: Student[] = [
  { name: "Jesse Nguyen", sec: "202", skills: ["Frontend Dev", "Prototyping"], status: "solo", contactStatus: "none", overlap: "8h/wk", init: "JN", bio: "Love building things. Looking for a design-focused team.", rat: { "Frontend Dev": "Proficient", "Prototyping": "Expert" }, lastActive: "5 min ago", compatScore: 87, scheduleOverlapHrs: 8 },
  { name: "Priya Sharma", sec: "201", skills: ["Backend", "Data Analysis"], status: "solo", contactStatus: "none", overlap: "0h/wk", init: "PS", bio: "Data nerd. Prefer async work.", rat: { "Backend": "Proficient", "Data Analysis": "Expert" }, lastActive: "8 days ago", compatScore: 41, scheduleOverlapHrs: 0 },
  { name: "Marcus Lee", sec: "201", skills: ["UI Design", "Frontend Dev"], status: "open-group", contactStatus: "none", overlap: "5h/wk", init: "ML", bio: "Design + code. Currently forming a group.", rat: { "UI Design": "Proficient", "Frontend Dev": "Intermediate" }, lastActive: "20 min ago", compatScore: 72, scheduleOverlapHrs: 5 },
  { name: "Aisha Khan", sec: "203", skills: ["Project Mgmt", "UX Writing"], status: "solo", contactStatus: "none", overlap: "3h/wk", init: "AK", bio: "Organized and reliable.", rat: { "Project Mgmt": "Expert", "UX Writing": "Proficient" }, lastActive: "1 hour ago", compatScore: 65, scheduleOverlapHrs: 3 },
  { name: "Tom Chen", sec: "201", skills: ["Backend", "Prototyping"], status: "closed", contactStatus: "none", overlap: "—", init: "TC", bio: "Backend dev and creative prototyper.", rat: { "Backend": "Intermediate", "Prototyping": "Proficient" }, lastActive: "2 days ago", compatScore: 0, scheduleOverlapHrs: 0 },
  { name: "David Park", sec: "202", skills: ["Backend", "Data Analysis"], status: "solo", contactStatus: "none", overlap: "6h/wk", init: "DP", bio: "Full-stack developer interested in data-driven projects.", rat: { "Backend": "Expert", "Data Analysis": "Proficient" }, lastActive: "15 min ago", compatScore: 76, scheduleOverlapHrs: 6 },
  { name: "Lisa Wang", sec: "201", skills: ["Frontend Dev", "UX Writing"], status: "solo", contactStatus: "none", overlap: "4h/wk", init: "LW", bio: "I bridge the gap between design and development.", rat: { "Frontend Dev": "Proficient", "UX Writing": "Intermediate" }, lastActive: "2 hours ago", compatScore: 68, scheduleOverlapHrs: 4 },
  { name: "Omar Ali", sec: "203", skills: ["Project Mgmt"], status: "solo", contactStatus: "none", overlap: "2h/wk", init: "OA", bio: "Experienced PM looking for a motivated team.", rat: { "Project Mgmt": "Expert" }, lastActive: "5 days ago", compatScore: 52, scheduleOverlapHrs: 2 },
  { name: "Sofia Rodriguez", sec: "202", skills: ["UI Design", "User Research"], status: "open-group", contactStatus: "none", overlap: "7h/wk", init: "SR", bio: "UX researcher passionate about accessible design.", rat: { "UI Design": "Intermediate", "User Research": "Expert" }, lastActive: "10 min ago", compatScore: 81, scheduleOverlapHrs: 7 },
  { name: "Wei Zhang", sec: "202", skills: ["Frontend Dev", "Backend"], status: "solo", contactStatus: "none", overlap: "9h/wk", init: "WZ", bio: "Full-stack dev. Strong in React and Node.", rat: { "Frontend Dev": "Expert", "Backend": "Proficient" }, lastActive: "12 days ago", compatScore: 79, scheduleOverlapHrs: 9 },
  { name: "Elena Popov", sec: "203", skills: ["Data Analysis", "UX Writing"], status: "solo", contactStatus: "none", overlap: "5h/wk", init: "EP", bio: "Research-oriented. Love working with data.", rat: { "Data Analysis": "Expert", "UX Writing": "Intermediate" }, lastActive: "30 min ago", compatScore: 63, scheduleOverlapHrs: 5 },
  { name: "Nadia Kim", sec: "202", skills: ["UX Writing", "User Research"], status: "open-group", contactStatus: "none", overlap: "6h/wk", init: "NK", bio: "UX writer building a team around accessibility.", rat: { "UX Writing": "Expert", "User Research": "Proficient" }, lastActive: "25 min ago", compatScore: 74, scheduleOverlapHrs: 6 },
  { name: "Ben Okafor", sec: "203", skills: ["Backend", "Project Mgmt"], status: "closed", contactStatus: "none", overlap: "—", init: "BO", bio: "Systems thinker and natural team organizer.", rat: { "Backend": "Expert", "Project Mgmt": "Proficient" }, lastActive: "4 days ago", compatScore: 0, scheduleOverlapHrs: 0 },
  { name: "Kai Tanaka", sec: "201", skills: ["Prototyping", "UI Design"], status: "closed", contactStatus: "none", overlap: "—", init: "KT", bio: "Figma wizard.", rat: { "Prototyping": "Expert", "UI Design": "Proficient" }, lastActive: "3 days ago", compatScore: 0, scheduleOverlapHrs: 0 },
];
const SS: Record<string, StatusInfo> = {
  solo: { l: "Solo", variant: "success" },
  "open-group": { l: "Open Group", variant: "warning" },
  // legacy removed, variant: "warning" },
  closed: { l: "Closed", cls: "bg-gray-100 text-gray-500 border-transparent" },
  // legacy removed, cls: "bg-gray-100 text-gray-500 border-transparent" },
};

const COMPAT: Record<string, CompatibilityBreakdown> = {
  "Jesse Nguyen": {
    overall: 87, scheduleScore: 90, skillScore: 95, workStyleScore: 100,
    matchReasons: ["Strong schedule overlap (8h/wk)", "Complementary skills — no redundancy", "Same meeting preference (in-person, 2x/wk)"],
    warnings: [],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "Prototyping", coveredBy: "them" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Priya Sharma": {
    overall: 41, scheduleScore: 0, skillScore: 90, workStyleScore: 33,
    matchReasons: ["Complementary skills — good coverage"],
    warnings: ["No schedule overlap detected", "Different meeting frequency (2x/wk vs 1x/wk)", "Different meeting style (in-person vs online)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Backend", coveredBy: "them" }, { skill: "Data Analysis", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "David Park": {
    overall: 76, scheduleScore: 75, skillScore: 85, workStyleScore: 67,
    matchReasons: ["Good schedule overlap (6h/wk)", "Complementary skills"],
    warnings: ["Different meeting style (in-person vs hybrid)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Backend", coveredBy: "them" }, { skill: "Data Analysis", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Sofia Rodriguez": {
    overall: 81, scheduleScore: 85, skillScore: 70, workStyleScore: 100,
    matchReasons: ["Strong schedule overlap (7h/wk)", "Same work style preferences"],
    warnings: ["Overlapping skill sets — both do UI Design"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "both" }, { skill: "User Research", coveredBy: "both" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Marcus Lee": {
    overall: 72, scheduleScore: 70, skillScore: 80, workStyleScore: 67,
    matchReasons: ["Good schedule overlap (5h/wk)", "Complementary skills"],
    warnings: ["Different communication tools (Discord vs Slack)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "both" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Aisha Khan": {
    overall: 65, scheduleScore: 50, skillScore: 90, workStyleScore: 56,
    matchReasons: ["Strong skill complementarity", "Different strengths"],
    warnings: ["Limited schedule overlap (3h/wk)", "Different meeting style (in-person vs online)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Project Mgmt", coveredBy: "them" }, { skill: "UX Writing", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
    ],
  },
  "Lisa Wang": {
    overall: 68, scheduleScore: 60, skillScore: 75, workStyleScore: 67,
    matchReasons: ["Decent overlap (4h/wk)", "Frontend + UX Writing complement your research"],
    warnings: ["Both lack backend skills", "Different meeting frequency (2x vs 3x/wk)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "UX Writing", coveredBy: "them" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Omar Ali": {
    overall: 52, scheduleScore: 35, skillScore: 85, workStyleScore: 33,
    matchReasons: ["Project Mgmt fills a clear gap in your team"],
    warnings: ["Very limited schedule overlap (2h/wk)", "Different communication style", "Rarely active (5 days ago)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Project Mgmt", coveredBy: "them" }, { skill: "Backend", coveredBy: "gap" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "UX Writing", coveredBy: "gap" }, { skill: "Prototyping", coveredBy: "gap" },
    ],
  },
  "Wei Zhang": {
    overall: 79, scheduleScore: 85, skillScore: 90, workStyleScore: 56,
    matchReasons: ["Strong schedule overlap (9h/wk)", "Full-stack covers frontend + backend gaps"],
    warnings: ["Different meeting style (in-person vs hybrid)", "Rarely active (12 days ago)"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Frontend Dev", coveredBy: "them" }, { skill: "Backend", coveredBy: "them" },
      { skill: "Data Analysis", coveredBy: "gap" }, { skill: "UX Writing", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Elena Popov": {
    overall: 63, scheduleScore: 60, skillScore: 80, workStyleScore: 44,
    matchReasons: ["Data Analysis + UX Writing complement your design skills"],
    warnings: ["Work style differences", "Different meeting frequency"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "you" },
      { skill: "Data Analysis", coveredBy: "them" }, { skill: "UX Writing", coveredBy: "them" },
      { skill: "Frontend Dev", coveredBy: "gap" }, { skill: "Backend", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
  "Nadia Kim": {
    overall: 74, scheduleScore: 70, skillScore: 75, workStyleScore: 78,
    matchReasons: ["Good schedule overlap (6h/wk)", "UX Writing + Research complement UI skills"],
    warnings: ["Both forming groups — coordination needed"],
    skillComplementarity: [
      { skill: "UI Design", coveredBy: "you" }, { skill: "User Research", coveredBy: "both" },
      { skill: "UX Writing", coveredBy: "them" }, { skill: "Frontend Dev", coveredBy: "gap" },
      { skill: "Backend", coveredBy: "gap" }, { skill: "Data Analysis", coveredBy: "gap" },
      { skill: "Prototyping", coveredBy: "gap" }, { skill: "Project Mgmt", coveredBy: "gap" },
    ],
  },
};

const PROFILE_TIERS = {
  good: { bg: "bg-success-bg", border: "border-success-border", text: "text-success", darkText: "text-success", trackBg: "bg-success-border", label: "Excellent Match", subtitle: "" },
  normal: { bg: "bg-warning-bg", border: "border-warning-border", text: "text-warning", darkText: "text-warning", trackBg: "bg-warning-border", label: "Moderate Match", subtitle: "Some differences to discuss." },
  bad: { bg: "bg-danger-bg", border: "border-danger-border", text: "text-danger", darkText: "text-danger-dark", trackBg: "bg-danger-border", label: "Low Compatibility", subtitle: "Schedule and work style conflicts." },
} as const;

const SCHEDULE_DATA: Record<string, { my: Set<string>; theirs: Set<string>; overlapHrs: number }> = {
  "Jesse Nguyen": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Wed-1", "Tue-2"]), overlapHrs: 8 },
  "David Park": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Tue-1", "Wed-1", "Thu-2"]), overlapHrs: 6 },
  "Priya Sharma": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Tue-0", "Thu-0"]), overlapHrs: 0 },
  "Marcus Lee": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Tue-1", "Wed-1"]), overlapHrs: 5 },
  "Aisha Khan": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Fri-2"]), overlapHrs: 3 },
  "Lisa Wang": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Wed-1", "Fri-2"]), overlapHrs: 4 },
  "Omar Ali": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Thu-0", "Fri-0"]), overlapHrs: 2 },
  "Wei Zhang": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Tue-1", "Wed-1", "Thu-1", "Fri-1"]), overlapHrs: 9 },
  "Elena Popov": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-0", "Wed-1", "Fri-1"]), overlapHrs: 5 },
  "Nadia Kim": { my: new Set(["Mon-1", "Wed-1", "Fri-1"]), theirs: new Set(["Mon-1", "Wed-1", "Fri-2"]), overlapHrs: 6 },
};

const WORK_STYLE_DATA: Record<string, [string, string, string, boolean][]> = {
  "Jesse Nguyen": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Discord", true]],
  "David Park": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "Hybrid", false], ["Communication", "Discord", "Discord", true]],
  "Priya Sharma": [["Meeting frequency", "2x/wk", "1x/wk", false], ["Meeting style", "In-person", "Online", false], ["Communication", "Discord", "Discord", true]],
  "Marcus Lee": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Slack", false]],
  "Aisha Khan": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "Online", false], ["Communication", "Discord", "Email", false]],
  "Lisa Wang": [["Meeting frequency", "2x/wk", "3x/wk", false], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Discord", true]],
  "Omar Ali": [["Meeting frequency", "2x/wk", "1x/wk", false], ["Meeting style", "In-person", "Online", false], ["Communication", "Discord", "Slack", false]],
  "Wei Zhang": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "Hybrid", false], ["Communication", "Discord", "Discord", true]],
  "Elena Popov": [["Meeting frequency", "2x/wk", "3x/wk", false], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Slack", false]],
  "Nadia Kim": [["Meeting frequency", "2x/wk", "2x/wk", true], ["Meeting style", "In-person", "In-person", true], ["Communication", "Discord", "Slack", false]],
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

// ==================== GROUPS DATA ====================
interface FormingGroup {
  id: string;
  leaderName: string;
  leaderInit: string;
  members: { name: string; init: string; skills: string[] }[];
  maxSize: number;
  section: string;
  neededSkills: string[];
  description: string;
  applicationQuestions: string[];
}

interface Conversation {
  id: string;
  targetName: string;
  targetInit: string;
  type: "request-sent" | "request-received" | "application-sent" | "application-received" | "group-chat";
  status: "pending" | "replied" | "accepted" | "declined" | "active";
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  isGroup?: boolean;
  groupMembers?: { name: string; init: string }[];
}

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-group", targetName: "CSC318 Group", targetInit: "G", type: "group-chat", status: "active", lastMessage: "Aisha: I set up the shared doc", timestamp: "10m ago", unread: true, isGroup: true, groupMembers: [
      { name: "Jesse Nguyen", init: "JN" },
      { name: "Aisha Khan", init: "AK" },
      { name: "David Park", init: "DP" },
    ]
  },
  { id: "conv-1", targetName: "David Park", targetInit: "DP", type: "request-sent", status: "replied", lastMessage: "Sounds great! When are you free this week?", timestamp: "2h ago", unread: true },
  { id: "conv-2", targetName: "Priya Sharma", targetInit: "PS", type: "application-received", status: "pending", lastMessage: "I applied to your group.", timestamp: "15m ago", unread: true },
  { id: "conv-3", targetName: "Jesse Nguyen", targetInit: "JN", type: "request-received", status: "accepted", lastMessage: "Welcome to the team!", timestamp: "1d ago", unread: false },
  { id: "conv-4", targetName: "Aisha Khan", targetInit: "AK", type: "request-sent", status: "pending", lastMessage: "Sent a group request.", timestamp: "3h ago", unread: false },
  { id: "conv-5", targetName: "Wei Zhang", targetInit: "WZ", type: "request-sent", status: "declined", lastMessage: "Sorry, I found another group.", timestamp: "2d ago", unread: false },
];

const FORMING_GROUPS: FormingGroup[] = [
  {
    id: "group-alpha",
    leaderName: "Jesse Nguyen",
    leaderInit: "JN",
    section: "201",
    members: [
      { name: "Jesse Nguyen", init: "JN", skills: ["Frontend Dev", "Prototyping"] },
      { name: "Aisha Khan", init: "AK", skills: ["Project Mgmt", "UX Writing"] },
    ],
    maxSize: 5,
    neededSkills: ["Backend", "Data Analysis", "UI Design"],
    description: "Building an accessibility-focused study app. Looking for someone strong in backend or data.",
    applicationQuestions: [
      "What skills can you contribute?",
      "What role do you want?",
      "When are you free to work?",
    ],
  },
  {
    id: "group-beta",
    leaderName: "Chris Lee",
    leaderInit: "CL",
    section: "202",
    members: [
      { name: "Chris Lee", init: "CL", skills: ["Backend", "Data Analysis"] },
      { name: "Mia Torres", init: "MT", skills: ["UI Design"] },
      { name: "Sam Park", init: "SP", skills: ["User Research"] },
    ],
    maxSize: 5,
    neededSkills: ["Frontend Dev", "Project Mgmt"],
    description: "Working on a campus resource-sharing platform. Great schedule overlap already.",
    applicationQuestions: [
      "What skills can you contribute?",
      "What role do you want?",
      "When are you free to work?",
    ],
  },
];

// ==================== CONFIRM DIALOG ====================
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-6">
      <div className="bg-white rounded-[12px] p-6 w-full max-w-[400px] shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        <h2 className="text-[18px] font-semibold text-[#111827] mb-2">{title}</h2>
        <p className="text-[14px] text-[#374151] mb-5 leading-relaxed">{body}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-10 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[14px] hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-[8px] bg-[#DC2626] text-white text-[14px] font-medium hover:bg-[#B91C1C] cursor-pointer">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== SLIDE PANEL ====================
interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  title?: string;
}

function SlidePanel({ open, onClose, children, footer, title = "Details" }: SlidePanelProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-foreground/20 z-[150]" onClick={onClose} />
      )}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[480px] max-w-[95vw] bg-background border-l border-border z-[160]",
        "flex flex-col overflow-hidden",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between h-14 px-5 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-gray-600">{title}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 leading-none"><Icon.x size={18} color="#9CA3AF" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </>
  );
}

// ==================== GROUP COMPONENTS ====================
interface GroupCardProps {
  group: FormingGroup;
  appliedStatus: string;
  onClick: () => void;
}

function GroupCard({ group, appliedStatus, onClick }: GroupCardProps) {
  const STATUS_LABELS: Record<string, { l: string; cls: string }> = {
    "applied": { l: "Applied", cls: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]" },
    "accepted": { l: "Accepted", cls: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]" },
    "declined": { l: "Declined", cls: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]" },
  };

  return (
    <Card
      className="p-4 gap-0 bg-white border-0 rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
      onClick={onClick}
    >
      {/* Row 1: Group name + member count pill */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[15px] font-semibold text-[#111827]">{group.leaderName}'s Group</span>
        <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[12px] bg-[#9652ca]/10 text-[#9652ca]">
          {group.members.length}/{group.maxSize}
        </span>
      </div>

      {/* Row 2: Section */}
      <div className="text-[12px] text-[#6B7280] mb-2.5">Section {group.section}</div>

      {/* Row 3: Skills needed */}
      <div className="flex flex-wrap items-center gap-1 mb-2.5">
        <span className="text-[12px] text-[#6B7280] mr-0.5">Looking for:</span>
        {group.neededSkills.slice(0, 3).map(sk => (
          <span key={sk} className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]">
            {sk}
          </span>
        ))}
        {group.neededSkills.length > 3 && (
          <span className="text-[12px] text-[#6B7280]">+{group.neededSkills.length - 3}</span>
        )}
      </div>

      {/* Row 4: Overlap bar (avg) */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[12px] text-[#6B7280]">Avg. overlap</span>
          <span className="text-[13px] font-semibold text-[#9652ca]">
            {Math.round(group.members.reduce((acc, m) => {
              const s = STU.find(s => s.name === m.name);
              return acc + (s?.scheduleOverlapHrs ?? 0);
            }, 0) / Math.max(group.members.length, 1))}h/wk
          </span>
        </div>
        <div className="h-1 rounded-full bg-[#E5E7EB] overflow-hidden">
          <div className="h-full rounded-full bg-[#9652ca]" style={{
            width: `${Math.min(100, (group.members.reduce((acc, m) => acc + (STU.find(s => s.name === m.name)?.scheduleOverlapHrs ?? 0), 0) / Math.max(group.members.length, 1) / 10) * 100)}%`
          }} />
        </div>
      </div>

      {/* Row 5: Application status (conditional) */}
      {appliedStatus && appliedStatus !== "none" && STATUS_LABELS[appliedStatus] && (
        <div className="mt-2 pt-2 border-t border-[#F3F4F6]">
          <span className={cn("inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium border", STATUS_LABELS[appliedStatus].cls)}>
            {STATUS_LABELS[appliedStatus].l}
          </span>
        </div>
      )}
    </Card>
  );
}

interface GroupsViewProps {
  onSelectGroup: (groupId: string) => void;
  appliedGroups: Record<string, string>;
  filterRecruiting?: boolean;
}

function GroupsView({ onSelectGroup, appliedGroups, filterRecruiting = false }: GroupsViewProps) {
  const [secFilter, setSecFilter] = useState("all");
  const filtered = FORMING_GROUPS.filter(g => {
    if (secFilter !== "all" && g.section !== secFilter) return false;
    if (filterRecruiting && g.members.length >= g.maxSize) return false;
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <Select value={secFilter} onValueChange={setSecFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            <SelectItem value="201">201</SelectItem>
            <SelectItem value="202">202</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            appliedStatus={appliedGroups[group.id] || "none"}
            onClick={() => onSelectGroup(group.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">No recruiting groups found.</div>
        )}
      </div>
    </div>
  );
}

interface GroupDetailPanelProps extends GoProps {
  groupId: string;
  onClose: () => void;
  onApplied: (groupId: string) => void;
  onOpenChat?: (name: string) => void;
}

function GroupDetailPanel({ groupId, onClose, onApplied, onOpenChat }: GroupDetailPanelProps) {
  const group = FORMING_GROUPS.find(g => g.id === groupId)!;
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [answers, setAnswers] = useState<string[]>(group.applicationQuestions.map(() => ""));

  if (submitted) {
    return (
      <div className="p-6 text-center pt-16">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success-bg flex items-center justify-center">
          <span className="text-2xl text-success">✓</span>
        </div>
        <div className="text-lg font-bold mb-2">Application Sent!</div>
        <p className="text-[13px] text-gray-600 mb-6">{group.leaderName} will review your application.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-5">
          <div className="text-lg font-bold mb-1">{group.leaderName}'s Group</div>
          <div className="text-xs text-gray-500 mb-3">Section {group.section} · {group.members.length}/{group.maxSize} members</div>
          <p className="text-[13px] text-gray-700">{group.description}</p>
          <Button className="w-full mt-3 gap-2 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5" variant="outline" onClick={() => { if (onOpenChat) onOpenChat(group.leaderName); onClose(); }}>
            <Icon.mailSend size={18} color="#9652ca" />
            Message {group.leaderName.split(" ")[0]}
          </Button>
        </div>
        <div className="mb-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Members</Label>
          {group.members.map((m, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <Avatar className="size-7"><AvatarFallback className="text-xs bg-gray-200">{m.init}</AvatarFallback></Avatar>
              <span className="text-[12px] font-medium">{m.name}</span>
              <div className="flex gap-1 ml-auto">
                {m.skills.map(sk => (
                  <span key={sk} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">{sk}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Skills Composition</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Has</div>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(group.members.flatMap(m => m.skills))).map(sk => (
                  <span key={sk} className="text-[11px] bg-success-bg text-success px-2 py-0.5 rounded-lg border border-success-border">{sk}</span>
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Needs</div>
              <div className="flex flex-wrap gap-1">
                {group.neededSkills.map(sk => (
                  <span key={sk} className="text-[11px] bg-accent text-accent-foreground px-2 py-0.5 rounded-lg border border-border">{sk}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mb-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Combined Schedule</Label>
          <div className="grid grid-cols-[48px_repeat(5,1fr)] gap-[2px]">
            <div />{["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1">{d}</div>)}
            {["9a–12p", "1–5p", "6–9p"].map((t, ti) => <Fragment key={ti}>
              <div className="text-[10px] text-gray-500 flex items-center">{t}</div>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => {
                const counts: Record<string, number> = { "Mon-0": 1, "Mon-1": 2, "Tue-1": 1, "Wed-0": 1, "Wed-1": 2, "Thu-2": 1, "Fri-1": 2 };
                const c = counts[`${d}-${ti}`] || 0;
                const total = group.members.length;
                return <div key={d} className={cn("py-2 text-center rounded text-[10px] font-medium",
                  c >= total ? "bg-primary text-primary-foreground" :
                    c >= total / 2 ? "bg-success-bg text-success" :
                      c > 0 ? "bg-gray-100 text-gray-500" :
                        "bg-gray-50 text-gray-300"
                )}>{c > 0 ? `${c}/${total}` : ""}</div>;
              })}
            </Fragment>)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1.5">Darker = more members available</div>
        </div>
        <div className="border-t border-gray-100 pt-5">
          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3 block">Application Questions</Label>
          {!showForm ? (
            group.applicationQuestions.map((q, i) => (
              <div key={i} className="mb-3">
                <div className="text-[13px] font-medium text-gray-700 mb-1">{i + 1}. {q}</div>
              </div>
            ))
          ) : (
            group.applicationQuestions.map((q, i) => (
              <div key={i} className="mb-4">
                <Label className="text-[11px] font-bold text-gray-600 mb-[6px] block uppercase tracking-[1px]">{i + 1}. {q}</Label>
                <Textarea
                  value={answers[i]}
                  onChange={(e) => {
                    if (e.target.value.length > 300) return;
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  className="text-[12px] resize-none h-16"
                  placeholder="Your answer..."
                />
                <div className="text-[11px] text-gray-400 text-right mt-0.5">{answers[i].length}/300</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="border-t border-border p-4">
        {!showForm ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => setShowForm(true)}>Apply to Group</Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Back</Button>
            <Button
              className="flex-1"
              disabled={answers.some(a => a.trim() === "")}
              onClick={() => {
                setSubmitted(true);
                onApplied(group.id);
              }}
            >
              Send Application
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// Matching Board
const DEMO_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", type: "group-request-received", title: "Group Request from David Park", body: "David wants to team up for CSC318.", timestamp: "2 min ago", read: false, actionTarget: "David Park" },
  { id: "n2", type: "group-application-received", title: "New Application from Priya Sharma", body: "Priya applied to your group.", timestamp: "15 min ago", read: false, actionTarget: "mygroup" },
  { id: "n3", type: "request-accepted", title: "Jesse Nguyen accepted your request", body: "You're now forming a group together.", timestamp: "1 hour ago", read: true, actionTarget: "Jesse Nguyen" },
  { id: "n4", type: "confirm-requested", title: "Group confirmation requested", body: "Jesse is requesting everyone to confirm.", timestamp: "3 hours ago", read: true, actionTarget: "mygroup" },
  { id: "n5", type: "urgent-mode", title: "Urgent Mode activated", body: "Deadline in 3 days. 12 students still ungrouped.", timestamp: "1 day ago", read: true, actionTarget: "board" },
];

const CONTACT_STATUS_LABELS: Record<string, { l: string; cls: string }> = {
  "request-sent": { l: "Request Sent", cls: "bg-accent text-accent-foreground" },
  "replied": { l: "Replied", cls: "bg-primary/15 text-primary" },
  "no-response": { l: "No Response", cls: "bg-gray-100 text-gray-500" },
  "declined": { l: "Declined", cls: "bg-danger-bg text-danger" },
};

interface FilterDropdownProps {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}

function FilterDropdown({ label, active, open, onToggle, onClose, children }: FilterDropdownProps) {
  return (
    <div className="relative shrink-0">
      {open && <div className="fixed inset-0 z-[190]" onClick={onClose} />}
      <button onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 h-[34px] px-[14px] rounded-[20px] text-[13px] border transition-colors cursor-pointer whitespace-nowrap",
          active
            ? "bg-[#9652ca]/10 border-[#9652ca] text-[#9652ca]"
            : "bg-white border-[#D1D5DB] text-[#374151] hover:border-gray-400"
        )}>
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M1 3l4 4 4-4" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-white border border-border rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-[200] overflow-hidden w-[200px]">
          {children}
        </div>
      )}
    </div>
  );
}



interface DiscoveryProps extends GoProps {
  onSelectStudent: (name: string) => void;
  urgentMode?: boolean;
  onSelectGroup?: (id: string) => void;
  appliedGroups?: Record<string, string>;
  contactStatuses?: Record<string, string>;
  onContactStatusChange?: (name: string, status: string) => void;
  onOpenChat?: (name: string) => void;
}

function Discovery({ go, onSelectStudent, urgentMode = false, onSelectGroup, appliedGroups = {}, contactStatuses = {}, onContactStatusChange, onOpenChat }: DiscoveryProps) {
  const [view, setView] = useState<"people" | "groups">("people");
  const [urgentDismissed, setUrgentDismissed] = useState(false);
  const [secFilter, setSecFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("any");
  const [sortBy, setSortBy] = useState("best");
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenStudents, setHiddenStudents] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem(LS_PREFIX + "hidden"); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [starredStudents, setStarredStudents] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem(LS_PREFIX + "starred"); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [filterSolo, setFilterSolo] = useState(false);
  const [filterOpenGroup, setFilterOpenGroup] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterRecruiting, setFilterRecruiting] = useState(false);
  const [hideConfirmTarget, setHideConfirmTarget] = useState<string | null>(null);
  const [hiddenPopover, setHiddenPopover] = useState(false);
  const [sectionPopover, setSectionPopover] = useState(false);
  const [skillsPopover, setSkillsPopover] = useState(false);
  const [overlapPopover, setOverlapPopover] = useState(false);
  const [activityPopover, setActivityPopover] = useState(false);
  const [spotsPopover, setSpotsPopover] = useState(false);
  const [minOverlapPct, setMinOverlapPct] = useState(0);
  const [activityFilter2, setActivityFilter2] = useState("all");
  const [spotsFilter, setSpotsFilter] = useState("any");

  useEffect(() => { localStorage.setItem(LS_PREFIX + "starred", JSON.stringify([...starredStudents])); }, [starredStudents]);
  useEffect(() => { localStorage.setItem(LS_PREFIX + "hidden", JSON.stringify([...hiddenStudents])); }, [hiddenStudents]);

  useEffect(() => {
    if (urgentMode) {
      setFilterSolo(true);
      setFilterOpenGroup(false);
    } else {
      setFilterSolo(false);
    }
  }, [urgentMode]);

  const toggleStar = (name: string) => setStarredStudents(prev => {
    const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n;
  });

  const filteredStudents = STU.filter(st => {
    if (st.status === "closed") return false;
    if (secFilter !== "all" && st.sec !== secFilter) return false;
    if (skillFilter !== "any") {
      const target = skillFilter === "frontend" ? "Frontend Dev" : skillFilter === "backend" ? "Backend" : skillFilter === "ui" ? "UI Design" : skillFilter === "research" ? "User Research" : skillFilter === "proto" ? "Prototyping" : skillFilter === "data" ? "Data Analysis" : skillFilter === "ux" ? "UX Writing" : "Project Mgmt";
      if (!st.skills.includes(target)) return false;
    }
    if (minOverlapPct > 0 && (st.scheduleOverlapHrs / 10) * 100 < minOverlapPct) return false;
    if (filterSolo && !filterOpenGroup && st.status !== "solo") return false;
    if (filterOpenGroup && !filterSolo && st.status !== "open-group") return false;
    if (filterSolo && filterOpenGroup && st.status !== "solo" && st.status !== "open-group") return false;
    if (filterFavorites && !starredStudents.has(st.name)) return false;
    if (activityFilter2 !== "all") {
      const cs = contactStatuses[st.name] || "none";
      if (cs !== activityFilter2) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!st.name.toLowerCase().includes(q) && !st.skills.some(sk => sk.toLowerCase().includes(q)) && !st.bio.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const hidA = hiddenStudents.has(a.name) ? 1 : 0;
    const hidB = hiddenStudents.has(b.name) ? 1 : 0;
    if (hidA !== hidB) return hidA - hidB;
    const aS = starredStudents.has(a.name) ? 1 : 0;
    const bS = starredStudents.has(b.name) ? 1 : 0;
    if (bS !== aS) return bS - aS;
    switch (sortBy) {
      case "best": return b.compatScore - a.compatScore;
      case "overlap": return b.scheduleOverlapHrs - a.scheduleOverlapHrs;
      case "active": return parseActivityMinutes(a.lastActive) - parseActivityMinutes(b.lastActive);
      case "name": return a.name.localeCompare(b.name);
      case "newest": return STU.indexOf(b) - STU.indexOf(a);
      default: return 0;
    }
  });

  const clearFilters = () => {
    setSecFilter("all"); setSkillFilter("any"); setSearchQuery(""); setSortBy("best");
    setFilterSolo(false); setFilterOpenGroup(false); setFilterFavorites(false);
    setMinOverlapPct(0); setActivityFilter2("all");
  };

  return <div className="bg-background min-h-screen pb-6">
    <div className="max-w-[1120px] mx-auto py-10 px-12">
      <div className="flex justify-between items-end mb-4">
        <div><div className="text-[13px] text-gray-500">CSC318 · Section 201</div><h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">Find Teammates</h1></div>
        {view === "people"
          ? <span className="text-[13px] text-gray-500">{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found</span>
          : <span className="text-[13px] text-gray-500">{FORMING_GROUPS.length} group{FORMING_GROUPS.length !== 1 ? "s" : ""} recruiting</span>
        }
      </div>

      {urgentMode && !urgentDismissed && (
        <div className="flex items-center gap-3 px-5 py-3 bg-danger-bg border border-danger-border rounded-xl mb-5">
          <span className="text-danger text-lg">⚠</span>
          <div className="flex-1">
            <div className="text-[13px] font-bold text-danger">Deadline in 3 days</div>
            <div className="text-[12px] text-danger">12 students still ungrouped. Respond quickly — No Response triggers after 24h.</div>
          </div>
          <Button size="sm" variant="destructive" className="text-xs px-3" onClick={() => go("urgent")}>View Details</Button>
          <button onClick={() => setUrgentDismissed(true)} className="text-[12px] text-[#6B7280] hover:underline cursor-pointer shrink-0">Dismiss</button>
        </div>
      )}

      {/* Layer 1: View Toggle */}
      <div className="flex items-end justify-between border-b border-border h-12 px-0 mb-0">
        <div className="flex h-full items-end gap-6">
          {(["people", "groups"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn(
                "pb-[14px] text-[14px] border-b-2 capitalize transition-colors cursor-pointer",
                view === v
                  ? "font-semibold text-[#111827] border-[#9652ca]"
                  : "font-normal text-[#9CA3AF] border-transparent hover:border-[#9652ca]/40"
              )}>
              {v === "people" ? "People" : "Groups"}
            </button>
          ))}
        </div>
      </div>

      {/* Layer 2: Filter Bar */}
      <div className="flex items-center gap-2.5 py-3 border-b border-border flex-wrap">
        {view === "people" ? (<>
          {[
            { label: "Solo", active: filterSolo, toggle: () => setFilterSolo(v => !v) },
            { label: "Open Group", active: filterOpenGroup, toggle: () => setFilterOpenGroup(v => !v) },
            { label: "Favorites", active: filterFavorites, toggle: () => setFilterFavorites(v => !v) },
          ].map(({ label, active, toggle }) => (
            <button key={label} onClick={toggle}
              className={cn(
                "flex items-center gap-1.5 h-[34px] px-[14px] rounded-[20px] text-[13px] border shrink-0 transition-colors cursor-pointer whitespace-nowrap",
                active
                  ? "bg-[#9652ca]/10 border-[#9652ca] text-[#9652ca]"
                  : "bg-white border-[#D1D5DB] text-[#374151] hover:border-gray-400"
              )}>
              {active && <span className="text-[11px]">✓</span>}
              {label}
            </button>
          ))}

          <FilterDropdown
            label={secFilter !== "all" ? secFilter : "Section"}
            active={secFilter !== "all"}
            open={sectionPopover}
            onToggle={() => setSectionPopover(o => !o)}
            onClose={() => setSectionPopover(false)}
          >
            <div className="py-1">
              {["all", "201", "202", "203"].map(s => (
                <button key={s} onClick={() => { setSecFilter(s); setSectionPopover(false); }}
                  className={cn("w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50", secFilter === s && "text-[#9652ca] font-medium")}>
                  {s === "all" ? "All Sections" : `Section ${s}`}
                </button>
              ))}
            </div>
          </FilterDropdown>

          <FilterDropdown
            label={skillFilter !== "any" ? `Skills (1)` : "Skills"}
            active={skillFilter !== "any"}
            open={skillsPopover}
            onToggle={() => setSkillsPopover(o => !o)}
            onClose={() => setSkillsPopover(false)}
          >
            <div className="py-1 min-w-[200px]">
              {["any", "frontend", "backend", "ui", "research", "proto", "data", "ux", "pm"].map(s => (
                <button key={s} onClick={() => { setSkillFilter(s); setSkillsPopover(false); }}
                  className={cn("w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50", skillFilter === s && "text-[#9652ca] font-medium")}>
                  {s === "any" ? "Any skill" : s === "frontend" ? "Frontend Dev" : s === "backend" ? "Backend" : s === "ui" ? "UI Design" : s === "research" ? "User Research" : s === "proto" ? "Prototyping" : s === "data" ? "Data Analysis" : s === "ux" ? "UX Writing" : "Project Mgmt"}
                </button>
              ))}
            </div>
          </FilterDropdown>

          <FilterDropdown
            label={minOverlapPct > 0 ? `Overlap ≥${minOverlapPct}%` : "Overlap"}
            active={minOverlapPct > 0}
            open={overlapPopover}
            onToggle={() => setOverlapPopover(o => !o)}
            onClose={() => setOverlapPopover(false)}
          >
            <div className="p-4 w-56">
              <div className="flex justify-between text-[12px] text-[#6B7280] mb-2">
                <span>0%</span><span className="font-semibold text-[#111827]">{minOverlapPct}%+</span><span>100%</span>
              </div>
              <input type="range" min={0} max={100} step={10} value={minOverlapPct}
                onChange={e => setMinOverlapPct(Number(e.target.value))}
                className="w-full accent-[#9652ca]" />
              {minOverlapPct > 0 && (
                <button onClick={() => setMinOverlapPct(0)} className="mt-2 text-[12px] text-[#9652ca] hover:underline">Clear</button>
              )}
            </div>
          </FilterDropdown>

          <FilterDropdown
            label={activityFilter2 !== "all" ? ({ "none": "No contact yet", "request-sent": "Request Sent", "replied": "Replied", "no-response": "No Response", "declined": "Declined" }[activityFilter2] ?? activityFilter2) : "My Activity"}
            active={activityFilter2 !== "all"}
            open={activityPopover}
            onToggle={() => setActivityPopover(o => !o)}
            onClose={() => setActivityPopover(false)}
          >
            <div className="py-1">
              {[["all", "All"], ["none", "No contact yet"], ["request-sent", "Request Sent"], ["replied", "Replied"], ["no-response", "No Response"], ["declined", "Declined"]].map(([v, l]) => (
                <button key={v} onClick={() => { setActivityFilter2(v); setActivityPopover(false); }}
                  className={cn("w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50 whitespace-nowrap", activityFilter2 === v && "text-[#9652ca] font-medium")}>
                  {l}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {hiddenStudents.size > 0 && (
            <FilterDropdown
              label={`Hidden (${hiddenStudents.size})`}
              active={true}
              open={hiddenPopover}
              onToggle={() => setHiddenPopover(o => !o)}
              onClose={() => setHiddenPopover(false)}
            >
              <div className="py-1 min-w-[180px]">
                {[...hiddenStudents].map(name => (
                  <div key={name} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[13px]">{name}</span>
                    <button onClick={() => {
                      setHiddenStudents(prev => { const n = new Set(prev); n.delete(name); return n; });
                    }} className="text-[12px] text-[#9652ca] hover:underline cursor-pointer">Restore</button>
                  </div>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-1">
                  <button onClick={() => { setHiddenStudents(new Set()); setHiddenPopover(false); }}
                    className="text-[12px] text-[#991B1B] hover:underline cursor-pointer">Restore All</button>
                </div>
              </div>
            </FilterDropdown>
          )}
        </>) : (<>
          <button onClick={() => setFilterRecruiting(v => !v)}
            className={cn(
              "flex items-center gap-1.5 h-[34px] px-[14px] rounded-[20px] text-[13px] border shrink-0 transition-colors cursor-pointer whitespace-nowrap",
              filterRecruiting ? "bg-[#9652ca]/10 border-[#9652ca] text-[#9652ca]" : "bg-white border-[#D1D5DB] text-[#374151] hover:border-gray-400"
            )}>
            {filterRecruiting && <span className="text-[11px]">✓</span>}
            Recruiting
          </button>

          <FilterDropdown
            label={secFilter !== "all" ? secFilter : "Section"}
            active={secFilter !== "all"}
            open={sectionPopover}
            onToggle={() => setSectionPopover(o => !o)}
            onClose={() => setSectionPopover(false)}
          >
            <div className="py-1">
              {["all", "201", "202", "203"].map(s => (
                <button key={s} onClick={() => { setSecFilter(s); setSectionPopover(false); }}
                  className={cn("w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50", secFilter === s && "text-[#9652ca] font-medium")}>
                  {s === "all" ? "All Sections" : `Section ${s}`}
                </button>
              ))}
            </div>
          </FilterDropdown>

          <FilterDropdown
            label="Spots Open"
            active={spotsFilter !== "any"}
            open={spotsPopover}
            onToggle={() => setSpotsPopover(o => !o)}
            onClose={() => setSpotsPopover(false)}
          >
            <div className="py-1">
              {[["any", "Any"], ["1+", "1+"], ["2+", "2+"], ["3+", "3+"]].map(([v, l]) => (
                <button key={v} onClick={() => { setSpotsFilter(v); setSpotsPopover(false); }}
                  className={cn("w-full text-left px-3 py-2 text-[13px] rounded hover:bg-gray-50", spotsFilter === v && "text-[#9652ca] font-medium")}>
                  {l}
                </button>
              ))}
            </div>
          </FilterDropdown>
        </>)}
      </div>

      <ConfirmDialog
        open={hideConfirmTarget !== null}
        title="Hide this student?"
        body="They'll be moved to the bottom of the list and grayed out. You can restore them anytime."
        confirmLabel="Hide"
        onConfirm={() => {
          if (hideConfirmTarget) {
            setHiddenStudents(prev => new Set([...prev, hideConfirmTarget]));
          }
          setHideConfirmTarget(null);
        }}
        onCancel={() => setHideConfirmTarget(null)}
      />

      {view === "groups" ? (
        <GroupsView
          onSelectGroup={onSelectGroup ?? (() => { })}
          appliedGroups={appliedGroups}
          filterRecruiting={filterRecruiting}
        />
      ) : (<>
        {/* Layer 3: Sort Control */}
        <div className="flex justify-end items-center py-2">
          <div className="flex items-center gap-1 text-[13px] text-[#6B7280]">
            <span>Sort:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-7 border-none shadow-none text-[13px] text-[#6B7280] w-auto gap-1 px-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best Match</SelectItem>
                <SelectItem value="overlap">Most Overlap</SelectItem>
                <SelectItem value="active">Recently Active</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-[15px] font-semibold text-gray-500 mb-2">No students match your filters</div>
            <p className="text-[13px] text-gray-400 mb-4">Try adjusting your criteria.</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((st, i) => {
              const cs = contactStatuses[st.name];
              return (
                <Card
                  key={i}
                  className={cn(
                    "p-4 gap-0 bg-white border-0 rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer relative group",
                    hiddenStudents.has(st.name) && "opacity-40 pointer-events-none select-none"
                  )}
                  onClick={() => !hiddenStudents.has(st.name) && onSelectStudent(st.name)}
                >
                  {/* Row 1: Name + Actions */}
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-[15px] font-semibold text-[#111827] leading-snug">{st.name}</span>
                    <div className="flex gap-1 ml-2 shrink-0 items-center pointer-events-auto relative z-10">
                      <button onClick={(e) => { e.stopPropagation(); toggleStar(st.name); }}
                        className="p-0.5 rounded transition-colors cursor-pointer" aria-label="Toggle favorite">
                        {starredStudents.has(st.name)
                          ? <Icon.starFilled size={14} color="#9652ca" />
                          : <Icon.star size={14} color="#D1D5DB" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setHideConfirmTarget(st.name); }}
                        className="p-0.5 rounded transition-all cursor-pointer" aria-label="Toggle visibility">
                        {hiddenStudents.has(st.name)
                          ? <Icon.eyeOff size={14} color="#9CA3AF" />
                          : <Icon.eyeOpen size={14} color="#D1D5DB" />}
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Status + Section */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={cn(
                      "inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium",
                      st.status === "solo" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"
                    )}>
                      {st.status === "solo" ? "Solo" : "Open Group"}
                    </span>
                    <span className="text-[12px] text-[#6B7280]">{st.sec}</span>
                    {isRecentlyActive(st.lastActive) && <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto" />}
                  </div>

                  {/* Row 3: Skills (max 3 + overflow) */}
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {st.skills.slice(0, 3).map(sk => (
                      <span key={sk} className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]">
                        {sk}
                      </span>
                    ))}
                    {st.skills.length > 3 && (
                      <span className="text-[12px] text-[#6B7280]">+{st.skills.length - 3}</span>
                    )}
                  </div>

                  {/* Row 4: Schedule Overlap bar */}
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[12px] text-[#6B7280]">Overlap</span>
                      <span className={cn("text-[13px] font-semibold",
                        st.scheduleOverlapHrs >= 6 ? "text-[#9652ca]" : "text-[#9CA3AF]"
                      )}>
                        {st.overlap}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min(100, (st.scheduleOverlapHrs / 10) * 100)}%`,
                        backgroundColor: st.scheduleOverlapHrs >= 7 ? "#22C55E" : st.scheduleOverlapHrs >= 4 ? "#9652ca" : "#9CA3AF"
                      }} />
                    </div>
                  </div>

                  {/* Row 5: Contact Status (conditional) */}
                  {cs && cs !== "none" && CONTACT_STATUS_LABELS[cs] && (
                    <div className="mt-2 pt-2 border-t border-[#F3F4F6]">
                      <span className={cn("inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium", CONTACT_STATUS_LABELS[cs].cls)}>
                        {CONTACT_STATUS_LABELS[cs].l}
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </>)}
    </div>
  </div>;
}

// FormingStudentPanel
function FormingStudentPanel({ student, onViewGroup }: { student: Student; onViewGroup: () => void }) {
  return (
    <div className="p-6">
      <div className="flex gap-4 items-center mb-5">
        <Avatar className="size-12"><AvatarFallback className="bg-gray-200 text-gray-500 text-base font-bold">{student.init}</AvatarFallback></Avatar>
        <div className="flex-1">
          <div className="text-[18px] font-bold">{student.name}</div>
          <div className="text-sm text-gray-500">Section {student.sec}</div>
        </div>
        <span className="ml-auto py-1 px-3 bg-warning-bg text-warning text-xs font-semibold rounded-full border border-warning-border">Formed</span>
      </div>
      <div className="py-4 px-5 bg-gray-50 rounded-xl border border-gray-200 mb-5">
        <div className="text-[13px] font-semibold mb-1">{student.name.split(" ")[0]} is already in a formed group</div>
        <div className="text-[12px] text-gray-600">You can’t send a direct request, but you can apply to join their group.</div>
      </div>
      <Button className="w-full" onClick={onViewGroup}>Join Their Group →</Button>
    </div>
  );
}

// ReceivedRequestPanel
interface ReceivedRequestPanelProps {
  senderName: string;
  onClose: () => void;
  onAccept?: () => void;
  onReply?: () => void;
}

function ReceivedRequestPanel({ senderName, onClose, onAccept, onReply }: ReceivedRequestPanelProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const sender = STU.find(s => s.name === senderName);
  const DECLINE_REASONS = ["Already found a group", "Schedules do not overlap enough", "Looking for different skills"];

  if (!sender) return null;
  return (
    <div className="p-6">
      <div className="py-4 px-5 bg-accent border border-border rounded-xl mb-5">
        <div className="text-[11px] font-bold text-primary uppercase tracking-wide mb-2">Group Request</div>
        <div className="text-[13px] font-semibold mb-2">From {senderName}</div>
        <div className="text-[12px] text-gray-700 mb-1">
          <span className="font-semibold">Why work together?</span>
          <p className="mt-0.5">I think our skills complement each other well — I cover frontend and you have backend.</p>
        </div>
        <div className="text-[12px] text-gray-700">
          <span className="font-semibold">Their question:</span>
          <p className="mt-0.5">What’s your preferred working style — async or sync collaboration?</p>
        </div>
      </div>
      <div className="flex gap-3 items-center mb-5 pb-5 border-b border-gray-100">
        <Avatar className="size-10"><AvatarFallback className="bg-gray-200 text-gray-500 text-sm font-bold">{sender.init}</AvatarFallback></Avatar>
        <div>
          <div className="text-sm font-semibold">{sender.name}</div>
          <div className="text-xs text-gray-500">Section {sender.sec} · {sender.overlap} overlap</div>
        </div>
      </div>
      {!replyOpen && !declineOpen && (
        <div className="flex gap-2">
          <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => { onAccept?.(); onClose(); }}>Accept</Button>
          <Button variant="outline" className="flex-1" onClick={() => { onReply?.(); }}>Reply</Button>
          <Button variant="outline" className="flex-1 text-danger border-danger hover:bg-danger-bg" onClick={() => setDeclineOpen(true)}>Decline</Button>
        </div>
      )}
      {replyOpen && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-3 max-h-[200px] overflow-y-auto flex flex-col gap-2">
            {messages.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-3">Start a conversation to help decide.</p>
            ) : messages.map((m, i) => (
              <div key={i} className={cn("text-[12px] py-1.5 px-3 rounded-lg max-w-[85%]", m.from === "me" ? "bg-primary text-primary-foreground ml-auto" : "bg-gray-100 text-gray-700")}>{m.text}</div>
            ))}
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-100">
            <Input ref={replyInputRef} className="flex-1 text-[12px] h-8" placeholder="Type a message..." />
            <Button size="sm" className="h-8 px-3 text-xs" onClick={() => {
              if (replyInputRef.current?.value) { setMessages(m => [...m, { from: "me", text: replyInputRef.current!.value }]); replyInputRef.current!.value = ""; }
            }}>Send</Button>
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-100">
            <Button size="sm" className="flex-1 text-xs bg-success hover:bg-success/90" onClick={() => { onAccept?.(); onClose(); }}>Accept</Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs text-danger" onClick={() => { setReplyOpen(false); setDeclineOpen(true); }}>Decline</Button>
          </div>
        </div>
      )}
      {declineOpen && (
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="text-[13px] font-semibold mb-3">Select a reason</div>
          <div className="space-y-2 mb-3">
            {DECLINE_REASONS.map(r => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="decline-reason" value={r} checked={declineReason === r} onChange={() => setDeclineReason(r)} className="accent-primary" />
                <span className="text-[12px] text-gray-700">{r}</span>
              </label>
            ))}
          </div>
          <Textarea placeholder="Optional note (one line)..." className="text-[12px] mb-3 h-16 resize-none" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setDeclineOpen(false)}>Back</Button>
            <Button size="sm" className="flex-1 text-xs bg-danger hover:bg-danger/90 text-white" onClick={onClose}>Send Decline</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ProfilePanelContent (panel version of ProfilePage)
interface ProfilePanelProps extends GoProps {
  studentName: string;
  onClose: () => void;
  onContactStatusChange: (name: string, status: string) => void;
  urgentMode?: boolean;
  contactStatus?: string;
  onOpenChat?: (name: string) => void;
  onSelectGroup?: (groupId: string) => void;
}

function ProfilePanelContent({ go, studentName, onClose, onContactStatusChange, urgentMode = false, contactStatus = "none", onOpenChat, onSelectGroup }: ProfilePanelProps) {
  const [ack, setAck] = useState(false);
  const [requestStep, setRequestStep] = useState<"view" | "confirm" | "form">("view");
  const [requestWhy, setRequestWhy] = useState("");
  const [requestQuestion, setRequestQuestion] = useState("");
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const st = STU.find(s => s.name === studentName);

  if (!st) return null;

  if (st.status === "closed") {
    return (
      <div className="p-6">
        <div className="flex gap-4 items-center mb-5">
          <Avatar className="size-12"><AvatarFallback className="bg-gray-200 text-gray-500 text-base font-bold">{st.init}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="text-[18px] font-bold">{st.name}</div>
            <div className="text-sm text-gray-500">Section {st.sec}</div>
          </div>
          <span className="py-1 px-3 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">Grouped</span>
        </div>
        <div className="py-4 px-5 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-[13px] font-semibold mb-1">{st.name.split(" ")[0]} is already in a confirmed group</div>
          <div className="text-[12px] text-gray-600">They are no longer available for new group requests.</div>
        </div>
      </div>
    );
  }

  if (st.status === "open-group") {
    const studentGroup = FORMING_GROUPS.find(g => g.members.some(m => m.name === st.name) || g.leaderName === st.name);
    return <FormingStudentPanel student={st} onViewGroup={() => {
      onClose();
      if (studentGroup && onSelectGroup) onSelectGroup(studentGroup.id);
    }} />;
  }

  const c = COMPAT[studentName];
  const sched = SCHEDULE_DATA[studentName];
  const workRows = WORK_STYLE_DATA[studentName];

  if (!c || !sched || !workRows) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[200px] text-gray-400">
        <div className="text-[13px]">No compatibility data available.</div>
      </div>
    );
  }

  const ds = ["Mon", "Tue", "Wed", "Thu", "Fri"], ts = ["9am–12pm", "12–4pm", "4–8pm", "8–11pm"];
  const firstName = studentName.split(" ")[0];
  const tier: "good" | "normal" | "bad" = c.overall >= 80 ? "good" : c.overall >= 50 ? "normal" : "bad";
  const t = PROFILE_TIERS[tier];
  const hasWarnings = c.warnings.length > 0;
  const needsAck = tier === "bad" || tier === "normal";
  const sentKey = `sent-${firstName.toLowerCase()}`;

  return (
    <div>
      <div className="p-6 pb-2">
        <div className="flex gap-4 items-center mb-4">
          <Avatar className="size-14"><AvatarFallback className="bg-gray-200 text-gray-500 text-lg font-bold">{st.init}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="text-[22px] font-bold">{st.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "inline-flex items-center justify-center h-[26px] px-2.5 rounded-[12px] leading-none text-[12px] font-medium",
                st.status === "solo" ? "bg-[#DCFCE7] text-[#166534]" :
                  st.status === "open-group" ? "bg-[#FEF3C7] text-[#92400E]" :
                    "bg-gray-100 text-gray-500"
              )}>
                {st.status === "solo" ? "Solo" : st.status === "open-group" ? "Open Group" : "Closed"}
              </span>
              <span className="text-[14px] text-[#6B7280]">Section {st.sec}</span>
            </div>
          </div>
        </div>
        <Card className={cn("p-5 mb-5 gap-0 shadow-none", t.bg, t.border)}>
          <div className="flex items-center gap-5 mb-3">
            <div className={cn("text-[42px] font-extrabold", t.text)}>{c.overall}%</div>
            <div>
              <div className={cn("text-[15px] font-bold", t.text)}>{t.label}</div>
              {t.subtitle && <div className={cn("text-[13px]", t.darkText)}>{t.subtitle}</div>}
            </div>
          </div>
          {([["Schedule", c.scheduleScore], ["Skills", c.skillScore], ["Work Style", c.workStyleScore]] as const).map(([label, score]) => (
            <div key={label} className="flex items-center gap-2 mb-1">
              <span className={cn("text-[11px] w-16", t.darkText)}>{label}</span>
              <div className={cn("flex-1 h-2 rounded-full overflow-hidden", t.trackBg)}>
                <div className={cn("h-full rounded-full", score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.max(score, 3)}%` }} />
              </div>
              <span className={cn("text-[11px] font-semibold w-8 text-right", t.darkText)}>{score}%</span>
            </div>
          ))}
        </Card>

        {!hasWarnings ? (
          <div className="py-3.5 px-[18px] bg-success-bg rounded-[10px] border border-success-border mb-7">
            <div className="text-[15px] font-bold text-success mb-1">Strong compatibility</div>
            <div className="text-[13px] text-success leading-relaxed">No warnings — schedules, skills, and work styles align well.</div>
          </div>
        ) : (
          <div className="py-3.5 px-[18px] rounded-[10px] border bg-caution-bg border-caution-border mb-7">
            <div className="text-[15px] font-bold text-caution mb-1">⚠ Compatibility warnings found</div>
            <div className="text-[13px] text-caution-dark leading-relaxed">{c.warnings.join(". ")}.</div>
          </div>
        )}


        {/* Section B: All Skills */}
        <div className="mb-5">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills</Label>
          <div className="flex flex-wrap gap-1">
            {st.skills.map(sk => (
              <span key={sk} className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]">{sk}</span>
            ))}
          </div>
        </div>

        {/* Section D: Bio */}
        <div className="mb-5">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">About</Label>
          <p className="text-[13px] text-gray-600 leading-relaxed">{st.bio || "No bio yet."}</p>
        </div>

        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Schedule Overlap</Label>
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-1">
            <div />{ds.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 p-2">{d}</div>)}
            {ts.map((t2, ti) => <Fragment key={ti}><div className="text-[11px] text-gray-500 flex items-center">{t2}</div>
              {ds.map(d => { const k = `${d}-${ti}`, m = sched.my.has(k), h = sched.theirs.has(k), b = m && h; return (<div key={k} className={cn("py-3 px-1 text-center rounded-md text-[11px] font-medium", b ? "bg-primary text-primary-foreground" : m ? "bg-schedule-self text-gray-500" : h ? "bg-schedule-other text-gray-400" : "bg-gray-50 text-gray-300")}>{b ? "✓" : m ? "You" : h ? st.init : ""}</div>); })}</Fragment>)}
          </div>
          <div className="flex justify-between items-center mt-2.5">
            <div className="text-xs text-gray-500"><span className="text-gray-400">◼ You</span> · <span className="text-gray-300">◼ {firstName}</span></div>
            <div className={cn("py-1 px-3 rounded-md border", sched.overlapHrs > 0 ? "bg-success-bg border-success-border" : "bg-danger-bg border-danger-border")}>
              <span className={cn("text-[13px] font-bold", sched.overlapHrs > 0 ? "text-success" : "text-danger")}>{sched.overlapHrs}h/wk overlap</span>
            </div>
          </div>
        </div>

        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills Comparison</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-gray-50 rounded-[10px]"><div className="text-xs font-semibold mb-2">You</div><div className="text-sm mb-1">UI Design</div><div className="text-sm">User Research</div></div>
            <div className="p-4 bg-gray-50 rounded-[10px]"><div className="text-xs font-semibold mb-2">{firstName}</div>{st.skills.map(sk => <div key={sk} className="text-sm mb-1">{sk}</div>)}</div>
          </div>
          <div className="py-2 px-3 bg-success-bg rounded-lg text-[13px] text-success mt-2.5">✓ Complementary skills</div>
        </div>

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
        </div>

        <div className="mb-7">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Work Style</Label>
          <Card className="p-0 gap-0 shadow-none overflow-hidden">
            {workRows.map(([l, y, t2, ok], i) => (
              <div key={l} className={cn("flex justify-between items-center px-4 py-3", i < workRows.length - 1 && "border-b border-gray-100", !ok && "bg-danger-bg")}>
                <span className={cn("text-[13px]", ok ? "text-gray-500" : "text-danger font-semibold")}>{l}</span>
                <div className="flex gap-3 items-center text-[13px]">
                  <span>{y}</span><span className="text-gray-400 text-[11px]">vs</span><span>{t2}</span>
                  <span className={cn("text-base", ok ? "text-success" : "text-danger")}>{ok ? "✓" : "✗"}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>

      </div>

      {requestStep === "confirm" && (
        <div className="fixed inset-0 bg-foreground/40 z-[300] flex items-end sm:items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 w-full max-w-[380px] shadow-xl text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-lg font-bold mb-2">Compatibility Warning</div>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-5">
              {tier === "bad"
                ? `Your compatibility with ${firstName} is low. There are significant differences in schedule, skills, or work style that may require extra coordination.`
                : `You and ${firstName} have some differences in schedule or work style. You may need to discuss and align on expectations.`}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRequestStep("view")}>Cancel</Button>
              <Button className="flex-1" onClick={() => setRequestStep("form")}>Send Anyway</Button>
            </div>
          </div>
        </div>
      )}

      {requestStep === "form" && (
        <div className="fixed inset-0 bg-foreground/40 z-[300] flex items-end sm:items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 w-full max-w-[420px] shadow-xl">
            <div className="text-[11px] font-bold text-primary uppercase tracking-wide mb-1">{urgentMode ? "Quick Request" : "Group Request"}</div>
            <div className="text-lg font-bold mb-1">To {st.name}</div>
            <p className="text-[13px] text-gray-500 mb-5">Introduce yourself and give them a reason to say yes.</p>
            <div className="mb-4">
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-[7px] block">Why work together?</Label>
              <Textarea
                value={requestWhy}
                onChange={e => setRequestWhy(e.target.value)}
                className="resize-none h-20 text-sm"
                placeholder={`Explain why you and ${st.name.split(" ")[0]} would make a strong team...`}
              />
            </div>
            {!urgentMode && (
              <div className="mb-5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-[7px] block">A question for them</Label>
                <Input
                  value={requestQuestion}
                  onChange={e => setRequestQuestion(e.target.value)}
                  placeholder="Ask something to start the conversation..."
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRequestStep("view")}>Back</Button>
              <Button
                className="flex-1"
                disabled={urgentMode ? requestWhy.trim() === "" : (requestWhy.trim() === "" || requestQuestion.trim() === "")}
                onClick={() => {
                  onContactStatusChange(studentName, "request-sent");
                  go(sentKey);
                  onClose();
                }}
              >
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 border-t border-border p-4 bg-background z-10">
        {contactStatus === "request-sent" ? (
          <div className="text-center">
            <div className="text-[14px] text-[#6B7280] mb-2">Request Sent</div>
            {!withdrawConfirm ? (
              <button onClick={() => setWithdrawConfirm(true)} className="text-[13px] text-[#991B1B] hover:underline cursor-pointer">
                Withdraw Request
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-[13px] text-gray-600">Are you sure?</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setWithdrawConfirm(false)}>Cancel</Button>
                  <Button size="sm" className="text-xs bg-danger hover:bg-danger/90 text-white" onClick={() => { onContactStatusChange(studentName, "none"); setWithdrawConfirm(false); }}>Yes, Withdraw</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
            <Button variant="outline" className="flex-1 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5 gap-1.5" onClick={() => { if (onOpenChat) onOpenChat(studentName); onClose(); }}>
              <Icon.mailSend size={14} color="#9652ca" /> Chat
            </Button>
            <Button className="flex-1" onClick={() => needsAck ? setRequestStep("confirm") : setRequestStep("form")}>
              Group Request
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}



// Request Sent
function Sent({ go, targetName }: SentProps) {
  return <div className="bg-background min-h-screen pb-6">
    <div className="max-w-[500px] mx-auto pt-10 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("board")}>← Back to Board</Button>
      <div className="text-center pt-12">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-success-bg flex items-center justify-center"><span className="text-3xl text-success">✓</span></div>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px] text-center">Request Sent!</h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed text-center">{targetName} will be notified by email. You'll hear back soon.</p>
        <div className="flex gap-3 justify-center">
          <Button className="px-7 py-3 h-auto" onClick={() => go("board")}>Back to Board</Button>
          <Button variant="outline" className="px-7 py-3 h-auto" onClick={() => go("mygroup")}>View My Group</Button>
        </div>
      </div>
    </div>
  </div>;
}

const MOCK_REPLIES = [
  "That sounds great! When would you like to meet?",
  "I'm interested! Let me check my schedule.",
  "Thanks for reaching out! What part of the project excites you most?",
  "Sure, I think we'd work well together. Let's discuss more!",
];

interface ApplicationCardProps {
  applicant: {
    name: string;
    init: string;
    sec: string;
    skills: string[];
    scheduleOverlap: string;
    formAnswers: { q: string; a: string }[];
    votes: { up: number; down: number };
  };
  isLeader: boolean;
  onReply?: (name: string) => void;
  onAccept?: () => void;
}

function ApplicationCard({ applicant, isLeader, onReply, onAccept }: ApplicationCardProps) {
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);
  return (
    <Card className="p-5 mb-3.5 shadow-none gap-0">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="size-10"><AvatarFallback className="bg-gray-200 text-gray-500 text-sm font-bold">{applicant.init}</AvatarFallback></Avatar>
        <div>
          <div className="text-sm font-semibold">{applicant.name}</div>
          <div className="text-xs text-gray-500">Section {applicant.sec} · {applicant.scheduleOverlap} overlap</div>
        </div>
        <div className="ml-auto flex gap-1 flex-wrap justify-end">
          {applicant.skills.map(sk => <span key={sk} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-lg">{sk}</span>)}
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {applicant.formAnswers.map((fa, j) => (
          <div key={j} className="text-[12px]">
            <span className="font-semibold text-gray-500">{fa.q}</span>
            <p className="text-gray-700 mt-0.5">{fa.a}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <span className="text-[11px] text-gray-500">Member votes:</span>
        <button
          onClick={() => setMyVote(v => v === "up" ? null : "up")}
          className={cn("px-3 py-1 rounded-lg text-sm border flex items-center gap-1", myVote === "up" ? "bg-success-bg border-success text-success" : "border-gray-200 text-gray-400")}
        >
          <Icon.thumbUp size={14} /> {applicant.votes.up + (myVote === "up" ? 1 : 0)}
        </button>
        <button
          onClick={() => setMyVote(v => v === "down" ? null : "down")}
          className={cn("px-3 py-1 rounded-lg text-sm border flex items-center gap-1", myVote === "down" ? "bg-danger-bg border-danger text-danger" : "border-gray-200 text-gray-400")}
        >
          <Icon.thumbDown size={14} /> {applicant.votes.down + (myVote === "down" ? 1 : 0)}
        </button>
        {isLeader && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" className="text-xs px-3 bg-success hover:bg-success/90 text-white" onClick={onAccept}>Accept</Button>
            <Button size="sm" variant="outline" className="text-xs px-3" onClick={() => onReply?.(applicant.name)}>Reply</Button>
            <Button size="sm" variant="outline" className="text-xs px-3 text-danger border-danger hover:bg-danger-bg">Decline</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// My Group
type ConfirmStage = "idle" | "pending" | "confirmed";

interface MyGroupProps extends GoProps {
  studentStatus?: "solo" | "open-group" | "closed";
  onAcceptRequest?: () => void;
  onLeaveGroup?: () => void;
  onOpenChat?: (name: string) => void;
}

function MyGroup({ go, studentStatus = "open-group", onAcceptRequest, onLeaveGroup, onOpenChat }: MyGroupProps) {
  const [accepted, setAccepted] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [confirmStage, setConfirmStage] = useState<ConfirmStage>("idle");
  const [recruiting, setRecruiting] = useState(false);
  const membersPartial = [
    { name: "John D.", init: "JD", skills: ["UI Design", "User Research"], role: "You", platform: "Discord", handle: "john.d" },
    { name: "Jesse Nguyen", init: "JN", skills: ["Frontend Dev", "Prototyping"], role: "Member", platform: "Discord", handle: "jesse.dev" },
    { name: "Aisha Khan", init: "AK", skills: ["Project Mgmt", "UX Writing"], role: "Member", platform: "WhatsApp", handle: "+1 (647) 555-0123" },
  ];
  const membersFull = [
    ...membersPartial,
    { name: "Priya Sharma", init: "PS", skills: ["Backend", "Data Analysis"], role: "Member", platform: "Discord", handle: "priya.s" },
  ];
  const members = accepted ? membersFull : membersPartial;
  const pendingApplicants = accepted ? [] : [
    {
      name: "Priya Sharma", init: "PS", sec: "201",
      skills: ["Backend", "Data Analysis"],
      scheduleOverlap: "6h/wk",
      formAnswers: [
        { q: "What skills can you contribute?", a: "Backend APIs and data pipelines." },
        { q: "What role do you want?", a: "Backend lead." },
        { q: "When are you free to work?", a: "Evenings and weekends." },
      ],
      votes: { up: 1, down: 0 },
    },
  ];
  const minSize = 4, maxSize = 6;
  const canConfirm = members.length >= minSize && members.length <= maxSize;
  const markConfirmed = (_name: string) => setConfirmStage("confirmed");

  if (studentStatus === "solo") {
    return <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[680px] mx-auto py-14 px-6">
        <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("board")}>← Dashboard</Button>
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">My Group — CSC318</h1>
        <Card className="py-[52px] px-6 gap-0 shadow-none text-center border-dashed border-gray-300">
          <div className="text-4xl mb-4">👥</div>
          <div className="text-[17px] font-semibold mb-2">You're not in a group yet</div>
          <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">Find teammates on the Discovery board and send a group request to get started.</p>
          <Button onClick={() => go("board")}>Browse Discovery →</Button>
        </Card>
      </div>
    </div>;
  }

  return <div className="bg-background min-h-screen pb-6">

    <div className="max-w-[680px] mx-auto py-14 px-6">
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
        Your Group — CSC318
        {confirmStage === "confirmed" && <span className="inline-flex items-center justify-center h-[26px] px-3 rounded-full leading-none text-[12px] font-medium bg-[#DCFCE7] text-[#166534] ml-2 align-middle">✓ Confirmed</span>}
      </h1>
      {confirmStage !== "confirmed" && (
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium bg-[#FEF3C7] text-[#92400E]">Formed</span>
          <span className="text-[14px] text-[#6B7280]">{members.length}/{maxSize} members</span>
        </div>
      )}

      {/* Confirm Group button — prominent at top when group is full */}
      {canConfirm && confirmStage === "idle" && (
        <div className="flex justify-between items-center px-4 py-3 bg-success-bg rounded-[10px] mb-5 mt-3 border border-success-border">
          <span className="text-[13px] text-success font-semibold">Group is full — ready to confirm!</span>
          <Button size="sm" className="text-xs px-5 bg-success hover:bg-success/90 text-white" onClick={() => setConfirmStage("pending")}>Confirm Group</Button>
        </div>
      )}

      {/* Confirm stage banners */}
      {confirmStage === "pending" && (
        <div className="py-4 px-5 bg-warning-bg border border-warning-border rounded-xl mb-5 mt-3">
          <div className="text-[13px] font-bold text-warning mb-1">
            Waiting for all members to confirm (24h window)
          </div>
          <div className="text-[12px] text-warning mb-3">
            Each member must confirm below. Members who don't respond will be removed.
          </div>
          {members.map((m, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-[12px]">{m.name}</span>
              {m.role === "You"
                ? <Button size="sm" className="text-xs px-3 h-7" onClick={() => markConfirmed(m.name)}>Confirm</Button>
                : <span className="text-[11px] text-gray-400">Waiting...</span>
              }
            </div>
          ))}
        </div>
      )}

      {confirmStage === "confirmed" && (
        <div className="py-3 px-5 bg-success-bg border border-success-border rounded-xl mb-5 mt-3">
          <div className="text-[13px] font-bold text-success">✓ Group confirmed — submitted to instructor</div>
        </div>
      )}

      {!canConfirm && confirmStage === "idle" && (
        <>
          <p className="text-base text-gray-600 mb-5 mt-3 leading-relaxed">{members.length}/{minSize}–{maxSize} members — need {minSize - members.length} more.</p>
          <div className="flex justify-between items-center px-4 py-3 bg-warning-bg rounded-[10px] mb-5 border border-warning-border">
            <span className="text-[13px] text-warning font-semibold">Group not yet confirmed</span>
            <Button size="sm" variant="outline" className="text-xs px-4 border-[#f59e0b] bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]" onClick={() => go("board")}>Find more members</Button>
          </div>
        </>
      )}

      {pendingApplicants.length > 0 && (
        <section className="mb-8">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">
            Pending Applications ({pendingApplicants.length})
          </Label>
          {pendingApplicants.map((ap, i) => (
            <ApplicationCard key={i} applicant={ap} isLeader onReply={onOpenChat} onAccept={() => { setAccepted(true); onAcceptRequest?.(); }} />
          ))}
        </section>
      )}

      {members.map((m, i) => (
        <Card key={i} className="p-5 mb-3.5 shadow-none flex-row items-center gap-3.5">
          <Avatar className="size-11"><AvatarFallback className="bg-gray-200 text-gray-500 text-sm font-bold">{m.init}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="text-sm font-semibold">{m.name}</span>
              <span className="text-xs text-gray-500">{m.role}</span>
            </div>
            <div className="flex gap-1 mt-1">{m.skills.map(sk => <span key={sk} className="py-0.5 px-2 bg-gray-100 rounded-lg text-[11px] text-gray-600">{sk}</span>)}</div>
          </div>
        </Card>
      ))}

      {/* Skills composition */}
      {confirmStage !== "confirmed" && (
        <div className="mb-6 mt-2">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Group Skills</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Has</div>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(members.flatMap(m => m.skills))).map(sk => (
                  <span key={sk} className="text-[11px] bg-success-bg text-success px-2 py-0.5 rounded-lg border border-success-border">{sk}</span>
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Still Needed</div>
              <div className="flex flex-wrap gap-1">
                {["Backend", "Data Analysis"].filter(sk => !members.flatMap(m => m.skills).includes(sk)).map(sk => (
                  <span key={sk} className="text-[11px] bg-accent text-accent-foreground px-2 py-0.5 rounded-lg border border-border">{sk}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group schedule grid */}
      {confirmStage !== "confirmed" && (
        <Card className="p-5 mb-3.5 gap-0 shadow-none">
          <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">Group Schedule</Label>
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]">
            <div />{["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
            {["9am–12pm", "12–4pm", "4–8pm", "8–11pm"].map((t, ti) => <Fragment key={ti}>
              <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => {
                const total = members.length;
                const counts3: Record<string, number> = { "Mon-0": 2, "Mon-1": 3, "Tue-1": 2, "Wed-0": 1, "Wed-1": 3, "Thu-2": 1, "Fri-1": 2 };
                const counts4: Record<string, number> = { "Mon-0": 2, "Mon-1": 4, "Tue-1": 2, "Tue-2": 1, "Wed-0": 2, "Wed-1": 3, "Thu-2": 1, "Fri-1": 3 };
                const cmap = accepted ? counts4 : counts3;
                const c = cmap[`${d}-${ti}`] || 0;
                return <div key={d} className={cn("py-2.5 px-1 text-center rounded-md text-[10px] font-medium",
                  c >= total ? "bg-primary text-primary-foreground" :
                    c >= total / 2 ? "bg-success-bg text-success" :
                      c >= 1 ? "bg-gray-100 text-gray-500" :
                        "bg-gray-50 text-gray-300"
                )}>{c > 0 ? `${c}/${total}` : ""}</div>;
              })}
            </Fragment>)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2">Darker = more members available</div>
        </Card>
      )}

      {/* Workspace cards (confirmed only) */}
      {confirmStage === "confirmed" && <>
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
            <div />{["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
            {["9am–12pm", "12–4pm", "4–8pm", "8–11pm"].map((t, ti) => <Fragment key={ti}>
              <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => {
                const counts: Record<string, number> = { "Mon-0": 2, "Mon-1": 4, "Tue-1": 2, "Tue-2": 1, "Wed-0": 2, "Wed-1": 3, "Thu-2": 1, "Fri-1": 3 };
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
        <Button variant="outline" className="flex-1 px-7 py-3 h-auto" onClick={() => go("board")}>Discover Members</Button>
        {!recruiting ? (
          <Button variant="outline" className="flex-1 px-7 py-3 h-auto border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5" onClick={() => setRecruiting(true)}>List Group for Recruiting</Button>
        ) : (
          <Button variant="outline" className="flex-1 px-7 py-3 h-auto border-[#f59e0b] text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a]" onClick={() => setRecruiting(false)}>Delist from Recruiting</Button>
        )}
      </div>
      <div className="text-center mt-3">
        <button onClick={() => setShowLeaveDialog(true)} className="text-[13px] text-[#991B1B] hover:underline cursor-pointer">
          Leave Group
        </button>
      </div>

      <ConfirmDialog
        open={showLeaveDialog}
        title="Leave this group?"
        body="The remaining members will be notified. You'll return to searching status."
        confirmLabel="Leave Group"
        onConfirm={() => { setShowLeaveDialog(false); onLeaveGroup?.(); go("board"); }}
        onCancel={() => setShowLeaveDialog(false)}
      />
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
    { name: "David Park", init: "DP", skills: ["Backend", "Data Analysis"], compat: "76%", overlap: "6h/wk" },
    { name: "Lisa Wang", init: "LW", skills: ["Frontend Dev", "UX Writing"], compat: "68%", overlap: "4h/wk" },
    { name: "Omar Ali", init: "OA", skills: ["Project Mgmt"], compat: "52%", overlap: "2h/wk" },
  ];
  const provisionalMembers = [
    { name: "You (John D.)", init: "JD", skills: ["UI Design", "User Research"] },
    { name: "Omar Ali", init: "OA", skills: ["Project Mgmt"] },
    { name: "Wei Zhang", init: "WZ", skills: ["Frontend Dev", "Backend"] },
    { name: "Elena Popov", init: "EP", skills: ["Data Analysis", "UX Writing"] },
  ];
  return <div className="bg-background min-h-screen pb-6">
    <div className="max-w-[680px] mx-auto py-14 px-6">
      <Button variant="ghost" className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm" onClick={() => go("board")}>← Back to Board</Button>

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
      {recs.map((r, i) => (
        <Card key={i} className="p-5 mb-3.5 shadow-none flex-row items-center gap-3.5">
          <Avatar className="size-[46px]"><AvatarFallback className="bg-gray-200 text-gray-500 text-[15px] font-bold">{r.init}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{r.name}</div>
            <div className="flex gap-1 mt-1">{r.skills.map(sk => <span key={sk} className="py-0.5 px-2 bg-gray-100 rounded-lg text-[11px] text-gray-600">{sk}</span>)}</div>
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
            <Avatar className="size-8"><AvatarFallback className="bg-caution-bg text-caution text-xs font-bold">{m.init}</AvatarFallback></Avatar>
            <span className="text-sm font-medium flex-1">{m.name}</span>
            <div className="flex gap-1">{m.skills.map(sk => <span key={sk} className="py-0.5 px-2 bg-caution-bg rounded-lg text-[10px] text-caution-dark">{sk}</span>)}</div>
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
        <Button variant="outline" className="w-full px-7 py-3 h-auto" onClick={() => setTaSent(true)}>Ask TA for help</Button>
      )}
    </div>
  </div>;
}

// Email Notification Mockup
// Login Page
interface LoginProps extends GoProps {
  onLogin?: () => void;
  showToast?: (message: string) => void;
}

function Login({ go, onLogin, showToast }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = email.trim().length > 0 && password.length > 0;
  const handleLogin = () => {
    if (!canSubmit) return;
    if (onLogin) onLogin();
    else go("dash");
  };
  return <div className="bg-background min-h-screen pb-6">
    <Nav go={go} />
    <div className="max-w-[500px] mx-auto py-14 px-6">
      <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">Welcome back</h1>
      <p className="text-base text-gray-600 mb-9 leading-relaxed">Log in with your university email.</p>
      <F l="University Email" id="login-email"><Input id="login-email" placeholder="you@mail.utoronto.ca" value={email} onChange={e => setEmail(e.target.value)} /></F>
      <F l="Password" id="login-password"><Input id="login-password" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} /></F>
      <Button className="w-full px-7 py-3 h-auto" disabled={!canSubmit} onClick={handleLogin}>Log In</Button>
      <div className="mt-3.5 text-center"><Button variant="link" className="text-foreground" onClick={() => showToast?.("Check your email for password reset instructions")}>Forgot password?</Button></div>
      <div className="mt-5 text-center text-sm text-gray-500">Don't have an account? <Button variant="link" className="text-foreground p-0 h-auto" onClick={() => go("signup-role")}>Sign up</Button></div>
    </div>
  </div>;
}

// Profile View + Edit
function ProfileEdit({ go: _go, showToast }: GoProps & { showToast?: (msg: string) => void }) {
  const ALL_SKILLS = ["Frontend Dev", "Backend", "UI Design", "User Research", "Prototyping", "Data Analysis", "UX Writing", "Project Mgmt"];
  const PROFICIENCY = ["Beginner", "Intermediate", "Proficient", "Expert"];
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useLocalStorage<string>("profileBio", "UX designer focused on accessible, user-centered products.");
  const [selectedSkills, setSelectedSkills] = useLocalStorage<string[]>("profileSkills", ["UI Design", "User Research"]);
  const [skillRatings, setSkillRatings] = useLocalStorage<Record<string, string>>("profileSkillRatings", { "UI Design": "Proficient", "User Research": "Expert" });
  const [meetFreq, setMeetFreq] = useLocalStorage<string>("profileMeetFreq", "2x/wk");
  const [meetStyle, setMeetStyle] = useLocalStorage<string>("profileMeetStyle", "In-person");
  const [commTool, setCommTool] = useLocalStorage<string>("profileCommTool", "Discord");
  const [scheduleArr, setScheduleArr] = useLocalStorage<string[]>("profileSchedule", ["Mon-1", "Wed-1", "Fri-1"]);
  const schedule = new Set(scheduleArr);
  const setSchedule = (s: Set<string>) => setScheduleArr([...s]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ bio: string; skills: string[]; ratings: Record<string, string>; freq: string; style: string; tool: string; sched: string[] } | null>(null);

  const toggleSkill = (sk: string) => {
    if (selectedSkills.includes(sk)) {
      setSelectedSkills(prev => prev.filter(s => s !== sk));
      setSkillRatings(prev => { const n = { ...prev }; delete n[sk]; return n; });
    } else {
      setSelectedSkills(prev => [...prev, sk]);
      setSkillRatings(prev => ({ ...prev, [sk]: "Intermediate" }));
    }
  };

  const enterEdit = () => {
    setSnapshot({ bio, skills: selectedSkills, ratings: skillRatings, freq: meetFreq, style: meetStyle, tool: commTool, sched: scheduleArr });
    setEditing(true);
  };

  const handleCancel = () => {
    if (snapshot) {
      setBio(snapshot.bio);
      setSelectedSkills(snapshot.skills);
      setSkillRatings(snapshot.ratings);
      setMeetFreq(snapshot.freq);
      setMeetStyle(snapshot.style);
      setCommTool(snapshot.tool);
      setScheduleArr(snapshot.sched);
    }
    setEditing(false);
  };

  const handleSave = () => {
    setEditing(false);
    setSnapshot(null);
    showToast?.("Profile saved!");
  };

  const ds = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const ts = ["9am–12pm", "12–4pm", "4–8pm", "8–11pm"];

  if (!editing) {
    return (
      <div className="bg-background min-h-screen pb-6">
        <div className="max-w-[680px] mx-auto py-10 px-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="size-20">
              {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover rounded-full" /> : <AvatarFallback className="bg-gray-200 text-gray-500 text-2xl font-bold">JD</AvatarFallback>}
            </Avatar>
            <div>
              <h1 className="text-[24px] font-bold text-foreground -tracking-[0.5px]">John Doe</h1>
              <div className="text-[13px] text-gray-500">Section 201 · CSC318</div>
              <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium bg-[#DCFCE7] text-[#166534] mt-1">Solo</span>
            </div>
          </div>

          <div className="mb-5">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">About</Label>
            <p className="text-[14px] text-gray-700 leading-relaxed">{bio || "No bio yet."}</p>
          </div>

          <div className="mb-5">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills</Label>
            <div className="flex flex-wrap gap-1.5">
              {selectedSkills.map(sk => (
                <span key={sk} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]">
                  {sk} <span className="text-[10px] opacity-70">· {skillRatings[sk]}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Work Style</Label>
            <Card className="p-0 gap-0 shadow-none overflow-hidden">
              {[["Meeting frequency", meetFreq], ["Meeting style", meetStyle], ["Communication", commTool]].map(([label, value], i) => (
                <div key={label} className={cn("flex justify-between items-center px-4 py-3", i < 2 && "border-b border-gray-100")}>
                  <span className="text-[13px] text-gray-500">{label}</span>
                  <span className="text-[13px] font-medium">{value}</span>
                </div>
              ))}
            </Card>
          </div>

          <div className="mb-7">
            <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Weekly Availability</Label>
            <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-[3px]">
              <div />{ds.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 p-1.5">{d}</div>)}
              {ts.map((t, ti) => <Fragment key={ti}>
                <div className="text-[11px] text-gray-500 flex items-center">{t}</div>
                {ds.map(d => {
                  const k = `${d}-${ti}`;
                  return <div key={k} className={cn("py-2.5 px-1 text-center rounded-md text-xs font-medium border", schedule.has(k) ? "bg-primary text-primary-foreground border-primary" : "bg-gray-50 text-gray-300 border-gray-200")} />;
                })}
              </Fragment>)}
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5" onClick={() => enterEdit()}>
            <Icon.pencil size={16} color="#9652ca" />
            Edit Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[680px] mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover rounded-full" /> : <AvatarFallback className="bg-gray-200 text-gray-500 text-xl font-bold">JD</AvatarFallback>}
            </Avatar>
            <div>
              <h1 className="text-[24px] font-bold text-foreground -tracking-[0.5px]">John Doe</h1>
              <div className="text-[13px] text-gray-500">Section 201 · CSC318</div>
              <input type="file" accept="image/*" className="hidden" id="profile-photo" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPhotoUrl(URL.createObjectURL(file));
              }} />
              <label htmlFor="profile-photo" className="text-[13px] text-primary hover:underline cursor-pointer">Change Photo</label>
            </div>
          </div>
          <Button variant="ghost" className="text-gray-500 text-sm" onClick={handleCancel}>Cancel</Button>
        </div>

        <F l="Bio">
          <Textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="resize-none h-20 text-sm"
            placeholder="Tell teammates about yourself..."
          />
        </F>

        <div className="mb-[18px]">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Skills</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {ALL_SKILLS.map(sk => (
              <button
                key={sk}
                type="button"
                onClick={() => toggleSkill(sk)}
                className={cn(
                  "py-1.5 px-3.5 rounded-full text-[13px] font-medium border transition-colors",
                  selectedSkills.includes(sk)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-gray-500 border-gray-200 hover:border-gray-400"
                )}
              >
                {sk}
              </button>
            ))}
          </div>
          {selectedSkills.length > 0 && (
            <div className="space-y-2">
              {selectedSkills.map(sk => (
                <div key={sk} className="flex items-center gap-3">
                  <span className="text-[13px] text-gray-700 w-32 shrink-0">{sk}</span>
                  <Select value={skillRatings[sk] ?? "Intermediate"} onValueChange={v => setSkillRatings(prev => ({ ...prev, [sk]: v }))}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-[18px]">
          <Label className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]">Work Style</Label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Meeting frequency</div>
              <Select value={meetFreq} onValueChange={setMeetFreq}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1x/wk", "2x/wk", "3x/wk", "As needed"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Meeting style</div>
              <Select value={meetStyle} onValueChange={setMeetStyle}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["In-person", "Online", "Hybrid"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Communication</div>
              <Select value={commTool} onValueChange={setCommTool}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Discord", "Slack", "Email", "iMessage"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <TGrid sel={schedule} set={setSchedule} label="Weekly Availability" />

        <Button className="w-full" onClick={handleSave}>Save Profile</Button>
      </div>
    </div>
  );
}

// ==================== CHATS PAGE ====================
type ChatMessages = Record<string, { from: string; text: string; time: string }[]>;

interface ChatsPageProps extends GoProps {
  conversations: Conversation[];
  contactStatuses: Record<string, string>;
  onContactStatusChange: (name: string, status: string) => void;
  onAccept?: (name: string) => void;
  msgs: ChatMessages;
  onMsgsChange: Dispatch<SetStateAction<ChatMessages>>;
  initialSelectedConv?: string | null;
  onClearInitialConv?: () => void;
  reactions: Record<string, string | null>;
  onReactionsChange: Dispatch<SetStateAction<Record<string, string | null>>>;
  onUpdateConvStatus?: (name: string, status: string) => void;
  onMarkRead?: (name: string) => void;
}

type ReactionType = "check" | "thumbUp" | "heart" | "sad";
const REACTION_ICONS: { type: ReactionType; icon: (p: IconProps) => ReactElement; emoji: string }[] = [
  { type: "check", icon: Icon.reactCheck, emoji: "✓" },
  { type: "thumbUp", icon: Icon.reactThumbUp, emoji: "👍" },
  { type: "heart", icon: Icon.reactHeart, emoji: "❤" },
  { type: "sad", icon: Icon.reactSad, emoji: "😢" },
];
const REACTION_COLORS: Record<ReactionType, string> = {
  check: "#16a34a",
  thumbUp: "#eab308",
  heart: "#dc2626",
  sad: "#3b82f6",
};

function ChatsPage({ go, conversations, contactStatuses, onContactStatusChange, onAccept, msgs, onMsgsChange, initialSelectedConv, onClearInitialConv, reactions: reactionsFromProps, onReactionsChange, onUpdateConvStatus, onMarkRead }: ChatsPageProps) {
  const [selectedConv, setSelectedConv] = useState<string | null>(initialSelectedConv ?? (conversations.length > 0 ? conversations[0].targetName : null));

  useEffect(() => {
    if (initialSelectedConv) {
      setSelectedConv(initialSelectedConv);
      onClearInitialConv?.();
    }
  }, [initialSelectedConv, onClearInitialConv]);
  const [convTab, setConvTab] = useState<"all" | "sent" | "received">("all");
  const setMsgs = onMsgsChange;
  const [input, setInput] = useState("");
  const [showDeclineMenu, setShowDeclineMenu] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineNote, setDeclineNote] = useState("");
  const [requestExpanded, setRequestExpanded] = useState(true);
  const reactions = reactionsFromProps;
  const setReactions = onReactionsChange;
  const toggleReaction = (msgKey: string, type: ReactionType) => {
    setReactions(prev => ({ ...prev, [msgKey]: prev[msgKey] === type ? null : type }));
  };

  const groupConv = conversations.find(c => c.isGroup);
  const individualConvs = conversations.filter(c => !c.isGroup);
  const filteredConvs = individualConvs.filter(c => {
    if (convTab === "sent") return c.type === "request-sent" || c.type === "application-sent";
    if (convTab === "received") return c.type === "request-received" || c.type === "application-received";
    return true;
  });

  const conv = conversations.find(c => c.targetName === selectedConv);
  const isGroupChat = conv?.isGroup === true;
  const student = selectedConv && !isGroupChat ? STU.find(s => s.name === selectedConv) : null;
  const currentMsgs = selectedConv ? (msgs[selectedConv] || []) : [];
  const isEnded = conv?.status === "accepted" || conv?.status === "declined";

  const sendMsg = () => {
    if (!input.trim() || !selectedConv) return;
    setMsgs(prev => ({
      ...prev,
      [selectedConv]: [...(prev[selectedConv] || []), { from: "me", text: input.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }],
    }));
    setInput("");
    // Auto-reply after 1.5s
    if (selectedConv) {
      const convName = selectedConv;
      const isGroup = conversations.find(c => c.targetName === convName)?.isGroup;
      setTimeout(() => {
        const replyText = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
        const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const replyFrom = isGroup
          ? (conversations.find(c => c.targetName === convName)?.groupMembers?.[Math.floor(Math.random() * (conversations.find(c => c.targetName === convName)?.groupMembers?.length ?? 1))]?.name ?? "them")
          : "them";
        setMsgs(prev => ({
          ...prev,
          [convName]: [...(prev[convName] || []), { from: replyFrom, text: replyText, time: replyTime }],
        }));
      }, 1500);
    }
  };

  const handleDecline = () => {
    if (!selectedConv) return;
    onContactStatusChange(selectedConv, "declined");
    onUpdateConvStatus?.(selectedConv, "declined");
    setMsgs(prev => ({
      ...prev,
      [selectedConv]: [...(prev[selectedConv] || []), { from: "me", text: `Declined: ${declineReason}${declineNote ? ` — ${declineNote}` : ""}`, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }],
    }));
    setShowDeclineMenu(false);
    setDeclineReason("");
    setDeclineNote("");
  };

  const STATUS_PILL: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#92400E]" },
    replied: { label: "Replied", cls: "bg-[#9652ca]/15 text-[#9652ca]" },
    accepted: { label: "Accepted", cls: "bg-[#DCFCE7] text-[#166534]" },
    declined: { label: "Declined", cls: "bg-[#FEE2E2] text-[#991B1B]" },
    active: { label: "Active", cls: "bg-[#DCFCE7] text-[#166534]" },
  };

  const DECLINE_REASONS = ["Already found a group", "Schedules do not overlap enough", "Looking for different skills"];

  const stages = conv?.type.includes("application")
    ? ["Applied", "Replied", conv?.status === "accepted" ? "Accepted" : conv?.status === "declined" ? "Declined" : "Pending"]
    : ["Request Sent", "Replied", conv?.status === "accepted" ? "Accepted" : conv?.status === "declined" ? "Declined" : "Pending"];
  const currentStageIdx = conv?.status === "accepted" || conv?.status === "declined" ? 2 : conv?.status === "replied" ? 1 : 0;

  void contactStatuses;

  return (
    <div className="flex justify-center h-full bg-background">
      <div className="flex w-full max-w-[1400px] h-full">

        {/* LEFT PANEL: Conversation List */}
        <div className="w-[280px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
          {/* Header + tabs */}
          <div className="px-4 pt-4 pb-2 border-b border-[#E5E7EB] shrink-0">
            <div className="text-[16px] font-semibold mb-3">Messages</div>
            <div className="flex h-8 items-end gap-5">
              {(["all", "sent", "received"] as const).map(t => (
                <button key={t} onClick={() => setConvTab(t)}
                  className={cn(
                    "pb-[6px] text-[13px] border-b-2 capitalize transition-colors cursor-pointer",
                    convTab === t
                      ? "font-semibold text-[#111827] border-[#9652ca]"
                      : "font-normal text-[#9CA3AF] border-transparent hover:border-[#9652ca]/40"
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-16 px-4 text-center">
                <div>
                  <div className="text-4xl mb-3">💬</div>
                  <div className="text-[15px] font-semibold text-gray-500 mb-2">No conversations yet</div>
                  <p className="text-[13px] text-gray-400">Start by messaging someone on the Discovery board.</p>
                </div>
              </div>
            )}
            {/* Pinned group chat */}
            {groupConv && (
              <button
                onClick={() => { setSelectedConv(groupConv.targetName); setShowDeclineMenu(false); onMarkRead?.(groupConv.targetName); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors border-b-2 border-[#E5E7EB] cursor-pointer",
                  selectedConv === groupConv.targetName
                    ? "bg-[#F3F4F6] border-l-[3px] border-l-[#9652ca]"
                    : "hover:bg-[#FAFAFA] border-l-[3px] border-l-transparent bg-[#FAFAFA]"
                )}
              >
                {groupConv.unread && <div className="w-1.5 h-1.5 rounded-full bg-[#9652ca] shrink-0" />}
                {!groupConv.unread && <div className="w-1.5 shrink-0" />}
                <div className="size-9 shrink-0 rounded-full bg-[#9652ca]/15 flex items-center justify-center">
                  <Icon.chat size={16} color="#9652ca" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("text-[13px] truncate", groupConv.unread ? "font-semibold text-[#111827]" : "font-medium text-[#374151]")}>{groupConv.targetName}</span>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">{groupConv.timestamp}</span>
                  </div>
                  <div className="text-[12px] text-[#6B7280] truncate">{groupConv.lastMessage}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-[#9652ca] font-medium">{groupConv.groupMembers?.length ?? 0} members</span>
                    <span className="inline-flex items-center justify-center h-[16px] px-1 rounded leading-none text-[9px] font-medium bg-[#9652ca]/10 text-[#9652ca]">Group</span>
                  </div>
                </div>
              </button>
            )}

            {/* Individual conversations */}
            {filteredConvs.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[#9CA3AF]">No conversations</div>
            ) : (
              filteredConvs.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedConv(c.targetName); setShowDeclineMenu(false); onMarkRead?.(c.targetName); }}
                  className={cn(
                    "w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors border-b border-[#F3F4F6] cursor-pointer",
                    selectedConv === c.targetName
                      ? "bg-[#F3F4F6] border-l-[3px] border-l-[#9652ca]"
                      : "hover:bg-[#FAFAFA] border-l-[3px] border-l-transparent"
                  )}
                >
                  {/* Unread dot */}
                  <div className="w-2 shrink-0 pt-3">
                    {c.unread && <div className="w-1.5 h-1.5 rounded-full bg-[#9652ca]" />}
                  </div>
                  <Avatar className="size-9 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-gray-200 text-gray-500 text-[11px] font-bold">{c.targetInit}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn("text-[13px] truncate", c.unread ? "font-semibold text-[#111827]" : "font-medium text-[#374151]")}>{c.targetName}</span>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0">{c.timestamp}</span>
                    </div>
                    <div className="text-[12px] text-[#6B7280] truncate mb-1">{c.lastMessage}</div>
                    <span className={cn("inline-flex items-center justify-center h-[18px] px-1.5 rounded-full leading-none text-[10px] font-medium", STATUS_PILL[c.status]?.cls)}>
                      {STATUS_PILL[c.status]?.label}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CENTER PANEL: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#E5E7EB] bg-white">
          {selectedConv && conv && (isGroupChat || student) ? (
            <>
              {/* Top bar */}
              <div className="flex items-center gap-3 h-14 px-5 border-b border-[#E5E7EB] shrink-0">
                {isGroupChat ? (
                  <>
                    <div className="size-8 rounded-full bg-[#9652ca]/15 flex items-center justify-center shrink-0">
                      <Icon.chat size={14} color="#9652ca" />
                    </div>
                    <span className="text-[15px] font-semibold">{conv.targetName}</span>
                    <span className="text-[12px] text-[#6B7280]">{conv.groupMembers?.length ?? 0} members</span>
                  </>
                ) : (
                  <>
                    <span className="text-[15px] font-semibold">{conv.targetName}</span>
                    <span className={cn("inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium", STATUS_PILL[conv.status]?.cls)}>
                      {STATUS_PILL[conv.status]?.label}
                    </span>
                  </>
                )}
              </div>

              {/* Scrollable chat content */}
              <div className="flex-1 overflow-y-auto">
                {/* Chat messages */}
                <div className="flex flex-col gap-2.5 p-5">
                  {/* System card — only for 1:1 conversations */}
                  {!isGroupChat && student && (() => {
                    const iSent = conv.type === "request-sent" || conv.type === "application-sent";
                    return (
                      <div className={cn("flex flex-col", iSent ? "items-end" : "items-start")}>
                        <div className={cn("max-w-[85%] rounded-[12px] border border-[#E5E7EB] overflow-hidden", iSent ? "rounded-br-[4px]" : "rounded-bl-[4px]")}>
                          {/* Compact header — always visible */}
                          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#FAFAFA]">
                            <Avatar className="size-7"><AvatarFallback className="bg-gray-200 text-gray-500 text-[10px] font-bold">{student.init}</AvatarFallback></Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-[#9652ca]">
                                  {conv.type.includes("request") ? "Group Request" : "Group Application"}
                                </span>
                                <span className="text-[11px] text-[#9CA3AF]">{conv.timestamp}</span>
                              </div>
                              <div className="text-[12px] text-[#6B7280]">
                                {iSent ? `You sent to ${student.name}` : `From ${student.name} · Section ${student.sec}`}
                              </div>
                            </div>
                            <button onClick={() => setRequestExpanded(v => !v)} className="text-[12px] text-[#9652ca] font-medium hover:underline cursor-pointer shrink-0">
                              {requestExpanded ? "Hide" : "Details"}
                            </button>
                          </div>

                          {/* Expanded details */}
                          {requestExpanded && (
                            <div className="px-4 py-3 border-t border-[#F3F4F6] bg-white">
                              {/* Profile + skills */}
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                {student.skills.slice(0, 3).map(sk => (
                                  <span key={sk} className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-[#9652ca]/10 text-[#9652ca]">{sk}</span>
                                ))}
                                <span className="text-[11px] text-[#6B7280] ml-1">Overlap: <strong className="text-[#9652ca]">{student.overlap}</strong></span>
                              </div>
                              {/* Form answers */}
                              <div className="space-y-2 mb-3">
                                <div>
                                  <div className="text-[11px] text-[#6B7280]">Why work together:</div>
                                  <div className="text-[13px] text-[#111827] mt-0.5">I think our skills complement each other well — I cover frontend and you have design + research skills.</div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-[#6B7280]">Their question:</div>
                                  <div className="text-[13px] text-[#111827] mt-0.5">What's your preferred working style — async or sync collaboration?</div>
                                </div>
                              </div>
                              {/* Action buttons — only for received requests */}
                              {!isEnded && !iSent && (
                                <div className="flex gap-2 pt-3 border-t border-[#F3F4F6]">
                                  <button onClick={() => { onContactStatusChange(conv.targetName, "accepted"); if (onAccept) onAccept(conv.targetName); onUpdateConvStatus?.(conv.targetName, "accepted"); }}
                                    className="flex-1 h-8 rounded-[8px] bg-[#9652ca] text-white text-[13px] font-medium hover:bg-[#7a4a9e] cursor-pointer transition-colors">Accept</button>
                                  <button className="flex-1 h-8 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[13px] font-medium hover:bg-[#F9FAFB] cursor-pointer transition-colors">Reply</button>
                                  <button onClick={() => setShowDeclineMenu(v => !v)}
                                    className="flex-1 h-8 rounded-[8px] border border-[#D1D5DB] text-[#991B1B] text-[13px] font-medium hover:bg-[#FEE2E2]/30 cursor-pointer transition-colors">Decline</button>
                                </div>
                              )}
                              {/* Decline dropdown */}
                              {showDeclineMenu && !isEnded && !iSent && (
                                <div className="mt-3 p-3 border border-[#E5E7EB] rounded-[8px] bg-[#F9FAFB]">
                                  <div className="text-[13px] font-medium mb-2">Select a reason:</div>
                                  <div className="space-y-1.5 mb-3">
                                    {DECLINE_REASONS.map(r => (
                                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="decline" value={r} checked={declineReason === r} onChange={() => setDeclineReason(r)} className="accent-[#9652ca]" />
                                        <span className="text-[13px] text-[#374151]">{r}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <input value={declineNote} onChange={e => setDeclineNote(e.target.value)} placeholder="Optional note..."
                                    className="w-full h-8 rounded-[6px] border border-[#D1D5DB] px-3 text-[13px] mb-3 outline-none focus:border-[#9652ca]" />
                                  <div className="flex gap-2">
                                    <button onClick={() => setShowDeclineMenu(false)} className="flex-1 h-8 rounded-[6px] border border-[#D1D5DB] text-[13px] text-[#374151] cursor-pointer hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleDecline} disabled={!declineReason} className={cn("flex-1 h-8 rounded-[6px] text-[13px] font-medium cursor-pointer transition-colors", declineReason ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]" : "bg-gray-200 text-gray-400")}>Confirm Decline</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-[#9CA3AF] mt-1">{conv.timestamp}</span>
                      </div>
                    );
                  })()}

                  {/* Empty conversation hint */}
                  {currentMsgs.length === 0 && !isGroupChat && (
                    <p className="text-[13px] text-[#9CA3AF] italic text-center py-6">Say hello to start chatting!</p>
                  )}

                  {/* Chat messages */}
                  {currentMsgs.map((m, i) => {
                    const msgKey = `${selectedConv}-${i}`;
                    const myReaction = reactions[msgKey];
                    return (
                      <div key={i} className={cn("flex flex-col", m.from === "me" ? "items-end" : "items-start")}>
                        {isGroupChat && m.from !== "me" && (
                          <span className="text-[11px] font-medium text-[#9652ca] mb-0.5 ml-1">{m.from}</span>
                        )}
                        <div className="relative group">
                          <div
                            className={cn(
                              "px-[14px] py-[10px] text-[14px] leading-relaxed",
                              m.from === "me"
                                ? "bg-[#9652ca] text-white rounded-[16px_16px_4px_16px]"
                                : "bg-[#F3F4F6] text-[#111827] rounded-[16px_16px_16px_4px]"
                            )}
                          >{m.text}</div>
                          {/* Reaction picker — hover-based, bottom-right of bubble */}
                          {m.from !== "me" && (
                            <div className="absolute right-0 hidden group-hover:flex gap-0.5 bg-white border border-[#E5E7EB] rounded-full shadow-sm px-1 py-0.5 z-10" style={{ bottom: "-25px" }}>
                              {REACTION_ICONS.map(r => (
                                <button key={r.type} onClick={() => toggleReaction(msgKey, r.type)}
                                  className={cn("w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#F3F4F6] transition-colors cursor-pointer", myReaction === r.type && "bg-opacity-15")}>
                                  <r.icon size={13} color={myReaction === r.type ? REACTION_COLORS[r.type] : "#6B7280"} />
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Active reaction badge */}
                          {myReaction && (
                            <div
                              className="absolute -bottom-2.5 left-1 bg-white border border-[#E5E7EB] rounded-full px-1.5 h-5 flex items-center justify-center shadow-sm cursor-pointer text-[11px]"
                              onClick={() => toggleReaction(msgKey, myReaction)}
                            >
                              {REACTION_ICONS.find(r => r.type === myReaction)?.emoji}
                            </div>
                          )}
                        </div>
                        <span className={cn("text-[11px] text-[#9CA3AF]", myReaction ? "mt-3.5" : "mt-1")}>{m.time}</span>
                      </div>
                    );
                  })}
                  {conv.status === "accepted" && (
                    <p className="text-[13px] text-[#6B7280] italic text-center py-3">
                      Request accepted — you're forming a group!
                    </p>
                  )}
                  {conv.status === "declined" && (
                    <p className="text-[13px] text-[#991B1B] italic text-center py-3">
                      Request declined.
                    </p>
                  )}
                </div>
              </div>

              {/* Input area */}
              {!isEnded ? (
                <div className="flex items-center gap-2 h-14 px-5 border-t border-[#E5E7EB] shrink-0 bg-white">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMsg()}
                    placeholder="Type a message..."
                    className="flex-1 h-9 rounded-[20px] border border-[#D1D5DB] px-4 text-[14px] outline-none focus:border-[#9652ca] bg-white"
                  />
                  <button onClick={sendMsg} disabled={!input.trim()}
                    className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                      input.trim() ? "bg-[#9652ca] text-white" : "bg-gray-200 text-gray-400"
                    )}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              ) : (
                <div className="h-14 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center gap-3 shrink-0">
                  <span className="text-[13px] text-[#6B7280]">This conversation has ended.</span>
                  <button onClick={() => go("mygroup")} className="text-[13px] text-[#9652ca] font-medium hover:underline cursor-pointer">My Group</button>
                  <span className="text-[#D1D5DB]">·</span>
                  <button onClick={() => go("dash")} className="text-[13px] text-[#9652ca] font-medium hover:underline cursor-pointer">Dashboard</button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#9CA3AF] text-[14px]">
              Select a conversation to start chatting
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Profile + Timeline */}
        <div className="w-[320px] shrink-0 bg-white overflow-y-auto">
          {/* Group chat: show member list */}
          {isGroupChat && conv ? (
            <div className="p-5">
              <div className="text-[16px] font-semibold mb-1">Group Chat</div>
              <div className="text-[13px] text-[#6B7280] mb-5">CSC318 · Section 201</div>

              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-3">Members ({(conv.groupMembers?.length ?? 0) + 1})</div>
                {/* Current user */}
                <div className="flex items-center gap-2.5 py-2 border-b border-[#F3F4F6]">
                  <Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-[11px] font-bold">JD</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">John Doe (You)</div>
                    <div className="text-[11px] text-[#6B7280]">UI Design, User Research</div>
                  </div>
                </div>
                {conv.groupMembers?.map(m => {
                  const s = STU.find(st => st.name === m.name);
                  return (
                    <div key={m.name} className="flex items-center gap-2.5 py-2 border-b border-[#F3F4F6]">
                      <Avatar className="size-8"><AvatarFallback className="bg-gray-200 text-gray-500 text-[11px] font-bold">{m.init}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="text-[13px] font-medium">{m.name}</div>
                        <div className="text-[11px] text-[#6B7280]">{s?.skills.join(", ") ?? ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Group Skills</div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(["UI Design", "User Research", ...(conv.groupMembers?.flatMap(m => STU.find(s => s.name === m.name)?.skills ?? []) ?? [])])).map(sk => (
                    <span key={sk} className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]">{sk}</span>
                  ))}
                </div>
              </div>

              <button onClick={() => go("mygroup")} className="w-full h-10 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[13px] font-medium hover:bg-[#F9FAFB] cursor-pointer transition-colors">
                Go to My Group
              </button>
            </div>
          ) : student && conv ? (
            <div className="p-5">
              {/* Profile header */}
              <div className="flex flex-col items-center text-center mb-5 pb-5 border-b border-[#E5E7EB]">
                <Avatar className="size-16 mb-3">
                  <AvatarFallback className="bg-gray-200 text-gray-500 text-xl font-bold">{student.init}</AvatarFallback>
                </Avatar>
                <div className="text-[18px] font-bold">{student.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn(
                    "inline-flex items-center justify-center h-[22px] px-2 rounded-[12px] leading-none text-[11px] font-medium",
                    student.status === "solo" ? "bg-[#DCFCE7] text-[#166534]" :
                      student.status === "open-group" ? "bg-[#FEF3C7] text-[#92400E]" :
                        "bg-gray-100 text-gray-500"
                  )}>
                    {student.status === "solo" ? "Solo" : student.status === "open-group" ? "Open Group" : "Closed"}
                  </span>
                  <span className="text-[13px] text-[#6B7280]">Section {student.sec}</span>
                </div>
                <button onClick={() => go("board")} className="text-[12px] text-[#9652ca] hover:underline cursor-pointer mt-2">View Full Profile →</button>
              </div>

              {/* Vertical timeline */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-3">Progress</div>
                <div className="flex flex-col gap-0">
                  {stages.map((label, i) => {
                    const isComplete = i <= currentStageIdx;
                    const isCurrent = i === currentStageIdx;
                    const isLast = i === stages.length - 1;
                    const timestamps = ["Mar 22, 2:14 PM", "Mar 22, 2:18 PM", ""];
                    return (
                      <div key={label} className="flex gap-3">
                        {/* Circle + line */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0 mt-1",
                            isComplete ? "bg-[#9652ca]" : "border-2 border-[#D1D5DB] bg-white",
                            isCurrent && "ring-2 ring-[#9652ca]/30"
                          )} />
                          {!isLast && <div className={cn("w-px flex-1 min-h-[28px]", isComplete && i < currentStageIdx ? "bg-[#9652ca]" : "bg-[#E5E7EB]")} />}
                        </div>
                        {/* Label + time */}
                        <div className="pb-4">
                          <div className={cn(
                            "text-[13px]",
                            isCurrent ? "font-semibold text-[#9652ca]" :
                              isComplete ? "font-medium text-[#9652ca]" :
                                "text-[#9CA3AF]"
                          )}>{label}</div>
                          {isComplete && timestamps[i] && (
                            <div className="text-[11px] text-[#9CA3AF] mt-0.5">{timestamps[i]}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bio */}
              {student.bio && (
                <div className="mb-5">
                  <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">About</div>
                  <p className="text-[13px] text-[#374151] leading-relaxed">{student.bio}</p>
                </div>
              )}

              {/* Skills */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Skills</div>
                <div className="flex flex-wrap gap-1">
                  {student.skills.map(sk => (
                    <span key={sk} className="inline-flex items-center h-6 px-2 rounded-[6px] text-[12px] font-medium bg-[#9652ca]/10 text-[#9652ca]">{sk}</span>
                  ))}
                </div>
              </div>

              {/* Schedule overlap */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Schedule Overlap</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                    <div className="h-full rounded-full bg-[#9652ca]" style={{ width: `${Math.min(100, (student.scheduleOverlapHrs / 10) * 100)}%` }} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#9652ca] shrink-0">{student.overlap}</span>
                </div>
              </div>

              {/* Skill ratings */}
              {Object.keys(student.rat).length > 0 && (
                <div className="mb-5">
                  <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Skill Ratings</div>
                  {Object.entries(student.rat).map(([skill, level]) => (
                    <div key={skill} className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] last:border-0">
                      <span className="text-[13px] text-[#374151]">{skill}</span>
                      <span className="text-[12px] text-[#6B7280]">{level}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Last active */}
              <div className="text-[12px] text-[#9CA3AF] mb-5">Last active: {student.lastActive}</div>

              {/* Send Group Request button — only when no request sent yet */}
              {contactStatuses[student.name] === "none" && (
                <Button variant="outline" className="w-full gap-2 border-[#9652ca] text-[#9652ca] hover:bg-[#9652ca]/5" onClick={() => { onContactStatusChange(student.name, "request-sent"); go("board"); }}>
                  <Icon.mailSend size={16} color="#9652ca" />
                  Send Group Request
                </Button>
              )}
              {contactStatuses[student.name] === "request-sent" && (
                <div className="text-center text-[13px] text-[#6B7280]">Group request sent</div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#9CA3AF] text-[13px] p-5">
              Select a conversation to see profile
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==================== APP ====================
const DEFAULT_CHAT_MSGS: ChatMessages = {
  "CSC318 Group": [
    { from: "Jesse Nguyen", text: "Hey everyone! Excited to work together.", time: "Mar 22, 10:00 AM" },
    { from: "Aisha Khan", text: "Same here! I set up the shared doc.", time: "Mar 22, 10:05 AM" },
    { from: "me", text: "Great, let's set up a meeting time.", time: "Mar 22, 10:12 AM" },
    { from: "David Park", text: "I'm free Tuesday and Thursday afternoons.", time: "Mar 22, 10:15 AM" },
  ],
  "David Park": [
    { from: "them", text: "Hey! I saw we have great schedule overlap. Want to form a group?", time: "Mar 22, 2:14 PM" },
    { from: "me", text: "Sounds great! When are you free this week?", time: "Mar 22, 2:18 PM" },
  ],
  "Priya Sharma": [
    { from: "them", text: "I'd love to join your group. I have strong backend skills.", time: "Mar 23, 3:30 PM" },
  ],
  "Jesse Nguyen": [
    { from: "them", text: "I think our skills complement each other well.", time: "Mar 21, 10:05 AM" },
    { from: "me", text: "Agreed! Let's do it.", time: "Mar 21, 10:12 AM" },
    { from: "them", text: "Welcome to the team!", time: "Mar 21, 10:15 AM" },
  ],
};

export default function Unitor() {
  const [pg, setPg] = useState("landing");
  const [role, setRole] = useState("s");
  const [showDemoBar, setShowDemoBar] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); setShowDemoBar(v => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const [sentTarget, setSentTarget] = useState("Jesse");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [userName, setUserName] = useLocalStorage<string>("userName", "");
  const [userEmail, setUserEmail] = useLocalStorage<string>("userEmail", "");
  const [hasJoinedCourse, setHasJoinedCourse] = useLocalStorage<boolean>("hasJoinedCourse", false);
  const [hasCreatedCourse, setHasCreatedCourse] = useLocalStorage<boolean>("hasCreatedCourse", false);
  const [appliedGroups, setAppliedGroups] = useLocalStorage<Record<string, string>>("appliedGroups", {});
  const [studentStatus, setStudentStatus] = useLocalStorage<"solo" | "open-group" | "closed">("studentStatus", "solo");
  const [notifications, setNotifications] = useState<AppNotification[]>(DEMO_NOTIFICATIONS);
  const [panelMode, setPanelMode] = useState<"view" | "received-request">("view");
  const [contactStatuses, setContactStatuses] = useLocalStorage<Record<string, string>>(
    "contactStatuses",
    () => Object.fromEntries(STU.map(s => [s.name, s.contactStatus]))
  );
  const [chatMsgs, setChatMsgs] = useLocalStorage<ChatMessages>("chatMsgs", DEFAULT_CHAT_MSGS);
  const [conversations, setConversations] = useLocalStorage<Conversation[]>("conversations", DEMO_CONVERSATIONS);
  const [initialSelectedConv, setInitialSelectedConv] = useState<string | null>(null);
  const [chatReactions, setChatReactions] = useLocalStorage<Record<string, string | null>>("chatReactions", {});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const addNotification = useCallback((type: NotificationType, title: string, body: string, actionTarget?: string) => {
    const n: AppNotification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      body,
      timestamp: "Just now",
      read: false,
      actionTarget,
    };
    setNotifications(prev => [n, ...prev]);
  }, []);

  const updateContactStatus = useCallback((name: string, status: string) =>
    setContactStatuses(prev => ({ ...prev, [name]: status })), [setContactStatuses]);

  const openChatWith = useCallback((name: string) => {
    const existing = conversations.find(c => c.targetName === name);
    if (!existing) {
      const stu = STU.find(s => s.name === name);
      const newConv: Conversation = {
        id: `conv-new-${Date.now()}`,
        targetName: name,
        targetInit: stu?.init ?? name.split(" ").map(w => w[0]).join(""),
        type: "request-sent",
        status: "pending",
        lastMessage: "Start a conversation",
        timestamp: "now",
        unread: false,
      };
      setConversations(prev => [...prev, newConv]);
    }
    setInitialSelectedConv(name);
    setPg("chats");
    window.scrollTo(0, 0);
  }, [conversations, setConversations]);

  const go = (p: string) => {
    if (p === "signup-s") { setRole("s"); setPg("signup") }
    else if (p === "signup-t") { setRole("t"); setPg("signup") }
    else if (p.startsWith("sent-")) {
      const name = p.slice(5);
      const fullName = STU.find(s => s.name.toLowerCase().startsWith(name))?.name ?? name.charAt(0).toUpperCase() + name.slice(1);
      setSentTarget(fullName);
      setPg("sent");
      setStudentStatus("open-group");
      showToast("Group request sent!");
      setTimeout(() => addNotification("request-accepted", `${fullName} responded`, `${fullName} replied to your group request.`, "chats"), 3000);
    }
    else if (p === "sent") { setPg("sent") }
    else setPg(p);
    window.scrollTo(0, 0);
  };



  const handleNotificationClick = (n: AppNotification) => {
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
    if (!n.actionTarget) return;
    if (n.type === "group-request-received") {
      go("chats");
    } else if (n.type === "request-accepted" || n.type === "request-declined") {
      go("chats");
    } else if (n.type === "group-application-received") {
      go("mygroup");
    } else {
      go(n.actionTarget);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  const P: Record<string, ReactNode> = {
    landing: <Landing go={go} />, "signup-role": <SignupRole go={go} />, signup: <SignupForm role={role} go={go} onSetName={setUserName} onSetEmail={setUserEmail} />, verify: <Verify role={role} go={go} userEmail={userEmail} />,
    login: <Login go={go} onLogin={() => go(hasJoinedCourse ? "dash" : "dash-empty")} showToast={showToast} />,
    "dash-empty": <DashEmpty go={go} />, dash: <Dash go={go} userName={userName} />, join: <Join go={go} />,
    "prof-0": <Prof0 go={go} initialName={userName} onSaveName={setUserName} />, "prof-1": <Prof1 go={go} />, "prof-2": <Prof2 go={go} />, "prof-3": <Prof3 go={go} />, "prof-done": <ProfDone go={go} onJoinCourse={() => setHasJoinedCourse(true)} />,
    "ta-dash-empty": <TADashEmpty go={go} />, "ta-dash": <TADash go={go} />, "ta-course-dash": <TACourseDash go={go} showToast={showToast} />, "ta-create": <TACreate go={go} onCreateCourse={() => setHasCreatedCourse(true)} showToast={showToast} />,
    board: <Discovery go={go} onSelectStudent={(name) => {
      const cs = contactStatuses[name];
      if (cs === "replied") { go("chats"); return; }
      setSelectedStudent(name); setPanelMode("view");
    }} urgentMode={isUrgent} onSelectGroup={setSelectedGroup} appliedGroups={appliedGroups} contactStatuses={contactStatuses} onContactStatusChange={updateContactStatus} onOpenChat={(name) => openChatWith(name)} />,
    chats: <ChatsPage go={go} conversations={conversations} contactStatuses={contactStatuses} onContactStatusChange={updateContactStatus} onAccept={(name) => { updateContactStatus(name, "accepted"); setStudentStatus("open-group"); }} msgs={chatMsgs} onMsgsChange={setChatMsgs} initialSelectedConv={initialSelectedConv} onClearInitialConv={() => setInitialSelectedConv(null)} reactions={chatReactions} onReactionsChange={setChatReactions} onUpdateConvStatus={(name, status) => setConversations(prev => prev.map(c => c.targetName === name ? { ...c, status: status as Conversation["status"] } : c))} onMarkRead={(name) => setConversations(prev => prev.map(c => c.targetName === name ? { ...c, unread: false } : c))} />,
    sent: <Sent go={go} targetName={sentTarget} />,
    mygroup: <MyGroup go={go} studentStatus={studentStatus} onAcceptRequest={() => setStudentStatus("open-group")} onLeaveGroup={() => setStudentStatus("solo")} onOpenChat={(name) => openChatWith(name)} />,
    urgent: <Urgent go={go} />,
    "profile-edit": <ProfileEdit go={go} showToast={showToast} />,
  };

  const nav = [
    { g: "Onboard", p: ["landing", "login", "signup-role", "signup", "verify"] },
    { g: "Student", p: ["dash-empty", "dash", "join", "prof-0", "prof-1", "prof-2", "prof-3", "prof-done"] },
    { g: "Board", p: ["board", "sent", "profile-edit"] },
    { g: "Social", p: ["mygroup", "urgent", "chats"] },
    { g: "TA", p: ["ta-dash-empty", "ta-dash", "ta-course-dash", "ta-create"] },
  ];

  // demo status switcher
  const statusCycle: ("solo" | "open-group" | "closed")[] = ["solo", "open-group", "closed"];

  return <div className="flex flex-col h-screen">
    {APP_PAGES.has(pg) && (
      <Nav go={go} activePage={pg} studentStatus={studentStatus} notifications={notifications} onNotificationClick={handleNotificationClick} onMarkAllRead={handleMarkAllRead} />
    )}
    <div className="flex-1 overflow-y-auto">
      {P[pg]}
    </div>

    <SlidePanel
      open={selectedGroup !== null}
      onClose={() => setSelectedGroup(null)}
      title="Group Details"
    >
      {selectedGroup && (
        <GroupDetailPanel
          key={selectedGroup}
          go={go}
          groupId={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onApplied={(id) => {
            setAppliedGroups(prev => ({ ...prev, [id]: "applied" }));
          }}
          onOpenChat={(name) => { setSelectedGroup(null); openChatWith(name); }}
        />
      )}
    </SlidePanel>

    <SlidePanel
      open={selectedStudent !== null && (panelMode === "view" || panelMode === "received-request")}
      onClose={() => setSelectedStudent(null)}
      title={panelMode === "received-request" ? "Group Request" : "Student Profile"}
    >
      {selectedStudent && panelMode === "view" && (
        <ProfilePanelContent studentName={selectedStudent} go={go} onClose={() => setSelectedStudent(null)} onContactStatusChange={updateContactStatus} urgentMode={isUrgent} contactStatus={contactStatuses[selectedStudent] ?? "none"} onOpenChat={(name) => { setSelectedStudent(null); openChatWith(name); }} onSelectGroup={(id) => { setSelectedStudent(null); setSelectedGroup(id); }} />
      )}
      {selectedStudent && panelMode === "received-request" && (
        <ReceivedRequestPanel
          senderName={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onAccept={() => {
            updateContactStatus(selectedStudent, "accepted");
            setStudentStatus("open-group");
            go("mygroup");
            setSelectedStudent(null);
          }}
          onReply={() => {
            if (selectedStudent) updateContactStatus(selectedStudent, "replied");
            setSelectedStudent(null);
            go("chats");
          }}
        />
      )}
    </SlidePanel>

    <ToastContainer toasts={toasts} onRemove={removeToast} />

    {/* Demo controls — 2 rows */}
    {showDemoBar && (
      <div className="shrink-0 bg-card border-t border-border py-1.5 px-4 flex flex-col gap-1">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-[3px] border-r border-gray-200 pr-3">
            <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">Status</span>
            {statusCycle.map(s => (
              <button key={s} onClick={() => setStudentStatus(s)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", studentStatus === s ? "border-[1.5px] border-primary bg-primary text-primary-foreground" : "border-gray-200 bg-card text-gray-500")}>{s}</button>
            ))}
          </div>
          {nav.slice(0, 3).map(n => <div key={n.g} className="flex items-center gap-[3px]">
            <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">{n.g}</span>
            {n.p.map(p => <button key={p} onClick={() => setPg(p)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", pg === p ? "border-[1.5px] border-primary bg-primary text-primary-foreground" : "border-gray-200 bg-card text-gray-500")}>{p}</button>)}
          </div>)}
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {nav.slice(3).map(n => <div key={n.g} className="flex items-center gap-[3px]">
            <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">{n.g}</span>
            {n.p.map(p => <button key={p} onClick={() => setPg(p)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", pg === p ? "border-[1.5px] border-primary bg-primary text-primary-foreground" : "border-gray-200 bg-card text-gray-500")}>{p}</button>)}
          </div>)}
          <div className="flex items-center gap-[3px] ml-auto">
            <span className="text-[9px] text-gray-400 font-bold uppercase mr-[3px]">Demo</span>
            <button onClick={() => setIsUrgent(v => !v)} className={cn("py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border", isUrgent ? "border-[1.5px] border-danger bg-danger text-white" : "border-gray-200 bg-card text-gray-500")}>urgent</button>
            <button onClick={() => updateContactStatus("Jesse Nguyen", "no-response")} className="py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border border-gray-200 bg-card text-gray-500">no-resp</button>
            <button onClick={() => { clearAllLocalStorage(); window.location.reload(); }} className="py-[3px] px-[7px] text-[10px] rounded-[3px] cursor-pointer font-mono border border-danger bg-danger/10 text-danger font-bold">reset</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}
