# Phase Z — 알림 드롭다운 시스템

> **Batch 3 (병렬 가능)** | 선행 조건: phase-a 완료 | Scenario 3, 5, 7, 9

---

## 목적

현재 알림 기능 없음. Phase A에서 Nav에 벨 아이콘 stub만 심어두었음.
이 Phase에서 실제 알림 드롭다운을 구현한다.

알림은 별도 페이지가 아닌 드롭다운 목록.
각 항목은 관련 패널/페이지로 직접 연결된다.

---

## 1. 알림 데이터 타입 정의

**파일:** `src/App.tsx` — 타입 섹션 (line 15 근처)

```ts
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
  actionTarget?: string;  // 클릭 시 이동할 대상 (페이지명 or 학생명)
}
```

---

## 2. 알림 정적 데이터 (데모용)

**파일:** `src/App.tsx` — FORMING_GROUPS 근처

```ts
const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    type: "group-request-received",
    title: "Group Request from David Park",
    body: "David wants to team up for CSC318.",
    timestamp: "2 min ago",
    read: false,
    actionTarget: "David Park",  // 패널에서 ReceivedRequestPanel 열기
  },
  {
    id: "n2",
    type: "group-application-received",
    title: "New Application from Priya Sharma",
    body: "Priya applied to your group.",
    timestamp: "15 min ago",
    read: false,
    actionTarget: "mygroup",
  },
  {
    id: "n3",
    type: "request-accepted",
    title: "Jesse Nguyen accepted your request",
    body: "You're now forming a group together.",
    timestamp: "1 hour ago",
    read: true,
    actionTarget: "mygroup",
  },
  {
    id: "n4",
    type: "confirm-requested",
    title: "Group confirmation requested",
    body: "Jesse is requesting everyone to confirm.",
    timestamp: "3 hours ago",
    read: true,
    actionTarget: "mygroup",
  },
  {
    id: "n5",
    type: "urgent-mode",
    title: "Urgent Mode activated",
    body: "Deadline in 3 days. 12 students still ungrouped.",
    timestamp: "1 day ago",
    read: true,
    actionTarget: "board",
  },
];
```

---

## 3. NotificationBell 컴포넌트

**파일:** `src/App.tsx` — Nav 컴포넌트 근처에 추가

```tsx
interface NotificationBellProps {
  notifications: AppNotification[];
  onNotificationClick: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
}

function NotificationBell({ notifications, onNotificationClick, onMarkAllRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const TYPE_ICONS: Record<NotificationType, string> = {
    "group-request-received":     "👋",
    "group-application-received": "📝",
    "request-accepted":           "✅",
    "request-declined":           "❌",
    "application-accepted":       "✅",
    "application-declined":       "❌",
    "member-left":                "👤",
    "confirm-requested":          "🔔",
    "urgent-mode":                "⚠",
  };

  return (
    <div className="relative">
      {/* 벨 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        {/* 벨 아이콘 (SVG) */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M12 2a7 7 0 0 0-7 7v3.586l-1.707 1.707A1 1 0 0 0 4 16h16a1 1 0 0 0 .707-1.707L19 12.586V9a7 7 0 0 0-7-7Zm0 18a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2Z"
            fill="currentColor" />
        </svg>
        {/* 뱃지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {open && (
        <>
          {/* 닫기용 배경 */}
          <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-[340px] bg-background border border-border rounded-xl shadow-lg z-[200] overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] text-blue-500 hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* 알림 목록 */}
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-gray-400">
                  No notifications
                </div>
              ) : (
                notifications.map(n => (
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
```

---

## 4. NotificationItem 컴포넌트

```tsx
interface NotificationItemProps {
  notification: AppNotification;
  icon: string;
  onClick: () => void;
}

function NotificationItem({ notification: n, icon, onClick }: NotificationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex gap-3 items-start px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-50",
        !n.read && "bg-blue-50/50"
      )}
    >
      {/* 아이콘 */}
      <span className="text-base mt-0.5 shrink-0">{icon}</span>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <div className={cn("text-[12px] leading-snug", !n.read ? "font-semibold text-foreground" : "text-gray-700")}>
          {n.title}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5 truncate">{n.body}</div>
        <div className="text-[10px] text-gray-400 mt-1">{n.timestamp}</div>
      </div>

      {/* 미읽음 점 */}
      {!n.read && (
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </button>
  );
}
```

---

## 5. App 레벨에서 알림 state 관리

**파일:** `src/App.tsx` App 컴포넌트

```tsx
const [notifications, setNotifications] = useState<AppNotification[]>(DEMO_NOTIFICATIONS);

const handleNotificationClick = (n: AppNotification) => {
  // 읽음 처리
  setNotifications(prev => prev.map(item =>
    item.id === n.id ? { ...item, read: true } : item
  ));

  // 액션 실행
  if (!n.actionTarget) return;

  if (n.type === "group-request-received") {
    // 요청 수신 패널 열기
    setSelectedStudent(n.actionTarget);
    setPanelMode("received-request");
  } else if (n.type === "group-application-received") {
    go("mygroup");
  } else {
    go(n.actionTarget);
  }
};

const handleMarkAllRead = () => {
  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
};
```

---

## 6. Nav에 NotificationBell 연결

**파일:** `src/App.tsx` Nav 컴포넌트 (Phase A에서 stub으로 만든 자리)

```tsx
// Phase A에서 stub으로 심어둔 벨 아이콘 자리를 실제 컴포넌트로 교체
function Nav({ go, activePage, studentStatus, notifications, onNotificationClick, onMarkAllRead }: NavProps) {
  return (
    <div className="flex justify-between items-center h-14 px-12 bg-card border-b border-border sticky top-0 z-[100]">
      {/* 로고 */}
      <span ...>unitor</span>

      {/* 중앙 탭 */}
      <div className="flex gap-1">
        {tabs.map(tab => tab.show && (
          <button key={tab.id} onClick={() => go(tab.id)} className={cn(...)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 우측: 알림 + 아바타 */}
      <div className="flex items-center gap-2">
        <NotificationBell
          notifications={notifications}
          onNotificationClick={onNotificationClick}
          onMarkAllRead={onMarkAllRead}
        />
        <Avatar className="size-8">
          <AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">JD</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
```

NavProps에 추가:
```ts
notifications: AppNotification[];
onNotificationClick: (n: AppNotification) => void;
onMarkAllRead: () => void;
```

---

## 완료 기준

- [ ] Nav 우측에 벨 아이콘 표시
- [ ] 미읽음 알림 수 뱃지 표시
- [ ] 벨 클릭 시 드롭다운 열림
- [ ] 드롭다운 외부 클릭 시 닫힘
- [ ] 각 알림 클릭 시 읽음 처리 + 올바른 대상으로 이동
- [ ] "Group Request received" 알림 → ReceivedRequestPanel 열림
- [ ] "New Application" 알림 → My Group으로 이동
- [ ] Mark all read 동작
- [ ] 모든 알림 읽음 시 뱃지 사라짐
- [ ] 빌드 에러 없음
