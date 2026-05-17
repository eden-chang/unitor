# Phase C — My Group 플로우 강화

> **Batch 2 (병렬 가능)** | 선행 조건: phase-1 완료 | Scenario 5, 7, 8

---

## 목적

현재 MyGroup은 멤버 목록과 확인/미확인 토글만 있음.
UX 문서에 필요한 항목:
- Pending Applications 섹션 (멤버 투표 포함)
- Leave Group 플로우
- Confirm Group 플로우 (min/max 인원, 24h 확인 창)

---

## 1. Pending Applications 섹션

**파일:** `src/App.tsx` line 1291–1423 (`MyGroup` 함수)

### 위치: 멤버 목록 위에 배치 (가장 먼저 확인해야 하므로)

```tsx
const pendingApplicants = [
  {
    name: "Priya Sharma", init: "PS", sec: "201",
    skills: ["Backend", "Data Analysis"],
    scheduleOverlap: "6h/wk",
    formAnswers: [
      { q: "What skills can you contribute?", a: "Backend APIs and data pipelines." },
      { q: "What role do you want?",          a: "Backend lead." },
      { q: "When are you free to work?",       a: "Evenings and weekends." },
    ],
    votes: { up: 1, down: 0 },
  },
];
```

### 섹션 UI

```tsx
{pendingApplicants.length > 0 && (
  <section className="mb-8">
    <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-3 block">
      Pending Applications ({pendingApplicants.length})
    </Label>

    {pendingApplicants.map((ap, i) => (
      <ApplicationCard key={i} applicant={ap} isLeader={isLeader} />
    ))}
  </section>
)}
```

### ApplicationCard 컴포넌트 (별도 내부 함수)

```tsx
function ApplicationCard({ applicant, isLeader }) {
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);

  return (
    <Card className="p-5 mb-3.5 shadow-none gap-0">
      {/* 지원자 요약 */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar ...>{ap.init}</Avatar>
        <div>
          <div className="text-sm font-semibold">{ap.name}</div>
          <div className="text-xs text-gray-500">Section {ap.sec} · {ap.scheduleOverlap} overlap</div>
        </div>
        <div className="ml-auto flex gap-1">
          {ap.skills.map(sk => <span key={sk} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-lg">{sk}</span>)}
        </div>
      </div>

      {/* 폼 답변 */}
      <div className="space-y-2 mb-4">
        {ap.formAnswers.map((fa, j) => (
          <div key={j} className="text-[12px]">
            <span className="font-semibold text-gray-500">{fa.q}</span>
            <p className="text-gray-700 mt-0.5">{fa.a}</p>
          </div>
        ))}
      </div>

      {/* 투표 */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <span className="text-[11px] text-gray-500">Member votes:</span>
        <button onClick={() => setMyVote("up")}
          className={cn("px-3 py-1 rounded-lg text-sm border", myVote === "up" ? "bg-success-bg border-success text-success" : "border-gray-200 text-gray-400")}>
          👍 {ap.votes.up + (myVote === "up" ? 1 : 0)}
        </button>
        <button onClick={() => setMyVote("down")}
          className={cn("px-3 py-1 rounded-lg text-sm border", myVote === "down" ? "bg-danger-bg border-danger text-danger" : "border-gray-200 text-gray-400")}>
          👎 {ap.votes.down + (myVote === "down" ? 1 : 0)}
        </button>

        {/* 리더 전용 결정 버튼 */}
        {isLeader && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" className="text-xs px-3 bg-success hover:bg-success/90">Accept</Button>
            <Button size="sm" variant="outline" className="text-xs px-3">Reply</Button>
            <Button size="sm" variant="outline" className="text-xs px-3 text-danger border-danger hover:bg-danger-bg">Decline</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

## 2. Leave Group 플로우

**파일:** `src/App.tsx` MyGroup 함수

### State 추가
```tsx
const [showLeaveDialog, setShowLeaveDialog] = useState(false);
```

### Leave 버튼 (하단 액션 영역에 추가)
```tsx
<Button
  variant="outline"
  className="text-danger border-danger hover:bg-danger-bg px-5 py-3 h-auto"
  onClick={() => setShowLeaveDialog(true)}
>
  Leave Group
</Button>
```

### 확인 다이얼로그
```tsx
{showLeaveDialog && (
  <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-6">
    <div className="bg-background rounded-2xl p-6 max-w-[380px] w-full shadow-xl">
      <h2 className="text-lg font-bold mb-2">Leave this group?</h2>
      <p className="text-[13px] text-gray-600 mb-5">
        The remaining members will be notified. You'll return to searching status.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setShowLeaveDialog(false)}>
          Cancel
        </Button>
        <Button
          className="flex-1 bg-danger hover:bg-danger/90"
          onClick={() => { setShowLeaveDialog(false); go("board"); }}
        >
          Leave Group
        </Button>
      </div>
    </div>
  </div>
)}
```

---

## 3. Confirm Group 플로우

**파일:** `src/App.tsx` MyGroup 함수

### 현재 상태
`confirmed` boolean 토글 + 비활성화 버튼만 있음.

### 변경 — 3단계 플로우

**Stage 1: 인원 충족 시 버튼 활성화**
```tsx
const minSize = 4, maxSize = 6;
const canConfirm = members.length >= minSize && members.length <= maxSize;

<Button
  disabled={!canConfirm}
  className="flex-1 px-7 py-3 h-auto"
  onClick={() => setConfirmStage("pending")}
>
  {canConfirm ? "Confirm Group" : `Confirm Group (need ${minSize - members.length} more)`}
</Button>
```

**Stage 2: 확인 대기 화면**
```tsx
type ConfirmStage = "idle" | "pending" | "confirmed";
const [confirmStage, setConfirmStage] = useState<ConfirmStage>("idle");

{confirmStage === "pending" && (
  <div className="py-4 px-5 bg-warning-bg border border-warning-border rounded-xl mb-5">
    <div className="text-[13px] font-bold text-warning mb-1">
      Waiting for all members to confirm (24h window)
    </div>
    <div className="text-[12px] text-warning mb-3">
      Each member must confirm below. Members who don't respond will be removed.
    </div>
    {/* 멤버별 확인 상태 */}
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
```

**Stage 3: 모든 멤버 확인 완료**
```tsx
{confirmStage === "confirmed" && (
  <div className="py-3 px-5 bg-success-bg border border-success-border rounded-xl mb-5">
    <div className="text-[13px] font-bold text-success">✓ Group confirmed — submitted to instructor</div>
  </div>
)}
```

---

## 4. isLeader 상태 추가

```tsx
const [isLeader, setIsLeader] = useState(true); // 데모: 현재 사용자가 리더

// 데모 컨트롤에 토글 추가
<Button size="sm" variant={isLeader ? "default" : "outline"} onClick={() => setIsLeader(!isLeader)}>
  {isLeader ? "Leader view" : "Member view"}
</Button>
```

리더가 아닌 경우: Pending Applications에서 투표만 가능, Accept/Decline 버튼 숨김

---

## 완료 기준

- [ ] Pending Applications 섹션 표시 (지원자 카드 + 폼 답변)
- [ ] 멤버 thumbs up/down 투표 동작
- [ ] 리더 전용 Accept/Reply/Decline 버튼 표시
- [ ] Leave Group 버튼 → 확인 다이얼로그 → board로 이동
- [ ] Confirm Group: 인원 충족 전 비활성, 충족 후 활성
- [ ] Confirm 클릭 시 멤버별 확인 대기 UI 표시
- [ ] isLeader 토글로 리더/멤버 뷰 전환
- [ ] 빌드 에러 없음
