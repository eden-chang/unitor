# Phase X — 슬라이드아웃 패널 (ProfilePage 이전 + 요청 플로우)

> **Batch 3 (병렬 가능)** | 선행 조건: phase-a, phase-b 완료 | Scenario 2, 3

---

## 목적

현재 학생 카드 클릭 → 새 페이지(`profile-view-good/normal/bad`)로 이동.
UX 문서: 오른쪽에서 슬라이드인하는 패널로 표시, 현재 화면(Discovery) 유지.

이 Phase에서:
1. SlidePanel 컴포넌트 신규 작성
2. ProfilePage 내용을 패널 안으로 이전
3. 요청 수신 시스템 카드 (Scenario 3)
4. Decline 이유 드롭다운
5. 인라인 Reply 채팅 영역

---

## 1. SlidePanel 컴포넌트 신규 작성

**파일:** `src/App.tsx` (ProfilePage 위쪽에 추가)

```tsx
interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

function SlidePanel({ open, onClose, children }: SlidePanelProps) {
  return (
    <>
      {/* 배경 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-[150]"
          onClick={onClose}
        />
      )}
      {/* 패널 */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[480px] max-w-[95vw] bg-background border-l border-border z-[160]",
        "flex flex-col overflow-hidden",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-gray-600">Student Profile</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>
        {/* 스크롤 가능한 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
```

---

## 2. App에서 selectedStudent state 연결

**파일:** `src/App.tsx` App 컴포넌트

```tsx
const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
const [panelMode, setPanelMode] = useState<"view" | "received-request">("view");
```

Discovery에 props 전달:
```tsx
"board": <Discovery
  go={go}
  onSelectStudent={(name) => { setSelectedStudent(name); setPanelMode("view"); }}
  urgentMode={isUrgent}
/>,
```

App return에 SlidePanel 추가:
```tsx
return (
  <div>
    <Nav ... />
    <div>{P[pg]}</div>
    <SlidePanel
      open={selectedStudent !== null}
      onClose={() => setSelectedStudent(null)}
    >
      {selectedStudent && panelMode === "view" && (
        <ProfilePanelContent
          studentName={selectedStudent}
          go={go}
          onClose={() => setSelectedStudent(null)}
          onContactStatusChange={(name, status) => updateContactStatus(name, status)}
        />
      )}
      {selectedStudent && panelMode === "received-request" && (
        <ReceivedRequestPanel
          senderName={selectedStudent}
          go={go}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </SlidePanel>
    {/* demo nav */}
  </div>
);
```

---

## 3. ProfilePanelContent — 기존 ProfilePage 내용 이전

**현재:** `ProfilePage` 함수 (line 1045–1190) — 전체 페이지 렌더링
**변경:** `ProfilePanelContent` 함수로 rename, Nav/페이지 래퍼 제거

```tsx
interface ProfilePanelProps extends GoProps {
  studentName: string;
  onClose: () => void;
  onContactStatusChange: (name: string, status: string) => void;
}

function ProfilePanelContent({ go, studentName, onClose, onContactStatusChange }: ProfilePanelProps) {
  // 기존 ProfilePage 내용 그대로 이전
  // 단, <div className="bg-background min-h-screen pb-32"> 래퍼 제거
  // <Nav go={go} /> 제거
  // floating action bar도 패널 전용 하단 고정 영역으로 대체

  const st = STU.find(s => s.name === studentName)!;

  // forming 학생 분기 처리
  if (st.status === "forming") {
    return <FormingStudentPanel student={st} onViewGroup={() => { onClose(); /* groups view로 전환 */ }} />;
  }

  return (
    <div className="p-6">
      {/* 기존 ProfilePage 콘텐츠 */}
      {/* ... compat card, schedule grid, skills, work style ... */}

      {/* 하단 액션 (패널 내 고정) */}
    </div>
  );
}
```

패널 하단 고정 액션 영역:
```tsx
// SlidePanel의 하단 고정 영역으로 분리
<div className="border-t border-border p-4 shrink-0 bg-background">
  <div className="flex gap-3">
    <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
    <Button
      disabled={needsAck && !ack}
      className="flex-1"
      onClick={() => { onContactStatusChange(studentName, "request-sent"); go(sentKey); onClose(); }}
    >
      Send Group Request
    </Button>
  </div>
</div>
```

---

## 4. Forming 학생 패널 변형

```tsx
function FormingStudentPanel({ student, onViewGroup }) {
  return (
    <div className="p-6">
      {/* 학생 기본 정보 */}
      <div className="flex gap-4 items-center mb-5">
        <Avatar ...>{student.init}</Avatar>
        <div>
          <div className="text-[18px] font-bold">{student.name}</div>
          <div className="text-sm text-gray-500">Section {student.sec}</div>
        </div>
        <span className="ml-auto py-1 px-3 bg-warning-bg text-warning text-xs font-semibold rounded-full border border-warning-border">
          Forming
        </span>
      </div>

      {/* 안내 메시지 */}
      <div className="py-4 px-5 bg-gray-50 rounded-xl border border-gray-200 mb-5">
        <div className="text-[13px] font-semibold mb-1">{student.name.split(" ")[0]} is already forming a group</div>
        <div className="text-[12px] text-gray-600">
          You can't send a direct request. View their group to apply instead.
        </div>
      </div>

      {/* 그룹 보기 버튼 */}
      <Button className="w-full" onClick={onViewGroup}>
        View Their Group →
      </Button>
    </div>
  );
}
```

---

## 5. 요청 수신 패널 (Scenario 3)

**신규:** `ReceivedRequestPanel` 컴포넌트

```tsx
interface ReceivedRequestPanelProps extends GoProps {
  senderName: string;
  onClose: () => void;
}

function ReceivedRequestPanel({ go, senderName, onClose }: ReceivedRequestPanelProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const sender = STU.find(s => s.name === senderName)!;

  const DECLINE_REASONS = [
    "Already found a group",
    "Schedules do not overlap enough",
    "Looking for different skills",
  ];

  return (
    <div className="p-6">
      {/* 시스템 카드 — 요청 내용 */}
      <div className="py-4 px-5 bg-blue-50 border border-blue-200 rounded-xl mb-5">
        <div className="text-[11px] font-bold text-blue-500 uppercase tracking-wide mb-2">Group Request</div>
        <div className="text-[13px] font-semibold mb-1">From {senderName}</div>

        {/* 요청 폼 답변 */}
        <div className="text-[12px] text-gray-700 mb-1">
          <span className="font-semibold">Why work together?</span>
          <p className="mt-0.5">I think our skills complement each other well — I cover frontend and you have backend.</p>
        </div>
        <div className="text-[12px] text-gray-700">
          <span className="font-semibold">Their question:</span>
          <p className="mt-0.5">What's your preferred working style — async or sync collaboration?</p>
        </div>
      </div>

      {/* 발신자 프로필 요약 (간략) */}
      <div className="flex gap-3 items-center mb-5 pb-5 border-b border-gray-100">
        <Avatar className="size-10"><AvatarFallback>{sender.init}</AvatarFallback></Avatar>
        <div>
          <div className="text-sm font-semibold">{sender.name}</div>
          <div className="text-xs text-gray-500">Section {sender.sec} · {sender.overlap} overlap</div>
        </div>
      </div>

      {/* 3가지 액션 */}
      {!replyOpen && !declineOpen && (
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-success hover:bg-success/90"
            onClick={() => { go("mygroup"); onClose(); }}
          >
            Accept
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setReplyOpen(true)}>
            Reply
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-danger border-danger hover:bg-danger-bg"
            onClick={() => setDeclineOpen(true)}
          >
            Decline
          </Button>
        </div>
      )}

      {/* Reply — 인라인 채팅 */}
      {replyOpen && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-3 max-h-[200px] overflow-y-auto flex flex-col gap-2">
            {messages.map((m, i) => (
              <div key={i} className={cn("text-[12px] py-1.5 px-3 rounded-lg max-w-[85%]",
                m.from === "me" ? "bg-primary text-white ml-auto" : "bg-gray-100 text-gray-700")}>
                {m.text}
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-3">Start a conversation to help decide.</p>
            )}
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-100">
            <Input className="text-[12px] h-8" placeholder="Type a message..." id="reply-input" />
            <Button size="sm" className="h-8 px-3 text-xs"
              onClick={() => {
                const el = document.getElementById("reply-input") as HTMLInputElement;
                if (el?.value) { setMessages(m => [...m, { from: "me", text: el.value }]); el.value = ""; }
              }}>
              Send
            </Button>
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-100">
            <Button size="sm" className="flex-1 text-xs bg-success hover:bg-success/90" onClick={() => { go("mygroup"); onClose(); }}>Accept</Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs text-danger" onClick={() => { setReplyOpen(false); setDeclineOpen(true); }}>Decline</Button>
          </div>
        </div>
      )}

      {/* Decline — 이유 선택 */}
      {declineOpen && (
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="text-[13px] font-semibold mb-3">Select a reason</div>
          <div className="space-y-2 mb-3">
            {DECLINE_REASONS.map(r => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio" name="decline-reason" value={r}
                  checked={declineReason === r}
                  onChange={() => setDeclineReason(r)}
                  className="accent-primary"
                />
                <span className="text-[12px] text-gray-700">{r}</span>
              </label>
            ))}
          </div>
          <Textarea placeholder="Optional note (one line)..." className="text-[12px] mb-3 h-16 resize-none" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setDeclineOpen(false)}>Back</Button>
            <Button size="sm" className="flex-1 text-xs bg-danger hover:bg-danger/90" onClick={onClose}>
              Send Decline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 6. profile-view-* 라우트 제거

**파일:** `src/App.tsx` App 컴포넌트 (line 1593–1595)

```tsx
// 제거
"profile-view-good": <ProfilePage go={go} studentName="Jesse Nguyen" />,
"profile-view-normal": <ProfilePage go={go} studentName="David Park" />,
"profile-view-bad": <ProfilePage go={go} studentName="Priya Sharma" />,
```

demo nav에서도 제거:
```tsx
{ g: "Board", p: ["board", "sent"] },  // profile-view-* 제거
```

`ProfilePage` 함수 자체는 제거하고 `ProfilePanelContent`로 대체.

---

## 완료 기준

- [ ] SlidePanel 컴포넌트: 오른쪽에서 슬라이드인/아웃
- [ ] 배경 오버레이 클릭 시 패널 닫힘
- [ ] 카드 클릭 → 패널 열림 (페이지 이동 없음)
- [ ] ProfilePage 내용이 패널 안에서 정상 렌더링
- [ ] forming 학생 클릭 → "View Their Group" 메시지
- [ ] 요청 수신 패널: Accept/Reply/Decline 동작
- [ ] Decline: 이유 선택 → 완료
- [ ] Reply: 인라인 채팅 → Accept/Decline 전환
- [ ] profile-view-* 라우트 제거
- [ ] 빌드 에러 없음
