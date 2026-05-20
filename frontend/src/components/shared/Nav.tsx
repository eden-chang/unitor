/**
 * Top navigation bar.
 *
 * Two visual modes:
 *   - **Marketing** (landing, signup, login): just the unitor wordmark
 *     and right-side CTAs passed via ``right``.
 *   - **App** (board, mygroup, chats, profile-edit): wordmark + tab
 *     strip + notification bell + avatar dropdown.
 *
 * The page-id-to-tab-id mapping (e.g. ``urgent → board``) is kept here
 * because the highlight reflects the *visual* tab, not the literal page
 * id. Adding a new tabbed page means adding it to both ``APP_PAGES``
 * and ``PAGE_TO_TAB``.
 */

import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { APP_PAGES, PAGE_TO_TAB } from "@/components/shared/nav-config";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/avatar";
import { useAuth } from "@/context/auth-context";
import type { AppNotification, StudentStatus } from "@/types/ui";

interface NavProps {
  go: (page: string) => void;
  activePage?: string;
  studentStatus?: StudentStatus;
  notifications?: AppNotification[];
  onNotificationClick?: (n: AppNotification) => void;
  onMarkAllRead?: () => void;
  right?: ReactNode;
  userName?: string;
  /** Hook for the parent shell to clear demo-state on sign out. */
  onSignOut?: () => void;
}

export function Nav({
  go,
  activePage = "",
  studentStatus = "solo",
  notifications = [],
  onNotificationClick = () => {},
  onMarkAllRead = () => {},
  right,
  userName = "",
  onSignOut,
}: NavProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  // Real name from the backend wins over the demo-bar shim. Falling back
  // to `userName` keeps the ctrl+d flow + the not-yet-signed-in prototype
  // pages rendering with whatever the local-storage shim has.
  const displayName = user?.display_name || userName;
  const isAppPage = APP_PAGES.has(activePage);
  const [avatarOpen, setAvatarOpen] = useState(false);

  if (!isAppPage) {
    return (
      <div className="flex justify-between items-center h-14 px-12 bg-white border-b border-[#E5E7EB] sticky top-0 z-[100]">
        <span
          className="text-[22px] font-extrabold text-foreground -tracking-[1px] cursor-pointer"
          onClick={() => go("landing")}
        >
          unitor
        </span>
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
      <span
        className="flex items-center text-[22px] font-extrabold text-foreground -tracking-[1px] cursor-pointer"
        onClick={() => go("landing")}
      >
        unitor
      </span>
      <div className="flex h-full items-end gap-1" role="tablist">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => go(t.id)}
              className={cn(
                "px-4 pb-[11px] text-[16px] border-b-[4px] transition-colors cursor-pointer",
                activeTab === t.id
                  ? "font-bold text-[#111827] border-[#9652ca]"
                  : "font-medium text-[#6B7280] border-transparent hover:text-[#111827] hover:border-[#9652ca]/40",
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
          {avatarOpen && (
            <div className="fixed inset-0 z-[190]" onClick={() => setAvatarOpen(false)} />
          )}
          <button
            onClick={() => setAvatarOpen((o) => !o)}
            className="rounded-full cursor-pointer"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-xl shadow-lg z-[200] overflow-hidden py-1">
              {displayName && (
                <div className="px-4 py-2 text-[12px] text-gray-500 border-b border-gray-100 truncate">
                  {displayName}
                </div>
              )}
              <button
                onClick={() => {
                  go("profile-edit");
                  setAvatarOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-[13px] text-[#374151] hover:bg-gray-50"
              >
                Edit Profile
              </button>
              <button
                onClick={async () => {
                  setAvatarOpen(false);
                  if (isAuthenticated) {
                    await signOut();
                  }
                  onSignOut?.();
                  go("landing");
                }}
                className="w-full text-left px-4 py-2.5 text-[13px] text-[#374151] hover:bg-gray-50"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
