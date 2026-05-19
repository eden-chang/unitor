/**
 * Notification bell + dropdown panel.
 *
 * Stays out of the App.tsx body so the in-scope Nav file isn't dragged
 * into the dozens of icon mappings each notification type requires.
 *
 * Stage 1: notifications come from a mock array. Stage 2 wires them to
 * the ``notifications`` table (already in the schema) via Supabase
 * Realtime.
 */

import { useState, type ReactElement } from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icons";
import type { AppNotification, NotificationType } from "@/types/ui";

interface NotificationItemProps {
  notification: AppNotification;
  icon: ReactElement;
  onClick: () => void;
}

function NotificationItem({ notification: n, icon, onClick }: NotificationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex gap-3 items-start px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-100",
        !n.read && "bg-accent/30",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-[12px] leading-snug",
            !n.read ? "font-semibold text-foreground" : "text-gray-700",
          )}
        >
          {n.title}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5 truncate">{n.body}</div>
        <div className="text-[10px] text-gray-400 mt-1">{n.timestamp}</div>
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
    </button>
  );
}

interface NotificationBellProps {
  notifications: AppNotification[];
  onNotificationClick: (n: AppNotification) => void;
  onMarkAllRead: () => void;
}

export function NotificationBell({
  notifications,
  onNotificationClick,
  onMarkAllRead,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
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
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] text-primary hover:text-accent-foreground cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-gray-400">
                  No notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    icon={TYPE_ICONS[n.type]}
                    onClick={() => {
                      onNotificationClick(n);
                      setOpen(false);
                    }}
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
