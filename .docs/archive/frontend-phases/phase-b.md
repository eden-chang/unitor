# Phase B — Discovery 재구성

> **Batch 2 (병렬 가능)** | 선행 조건: phase-1 완료 | Scenario 2, 6, 9

---

## 목적

현재 `Board` 컴포넌트:
- 좌측 사이드바 필터 (UX 문서: 상단 수평 필터바)
- People/Groups 토글 없음
- 카드에 contact status 없음, hide/star 없음
- Urgent Mode가 별도 페이지

이 Phase에서 Board를 Discovery로 완전 재구성한다.
슬라이드아웃 패널 연결은 **Phase X**에서 진행.
여기서는 카드 클릭 시 `onSelectStudent(name)` 콜백만 준비.

---

## 1. 컴포넌트명 및 인터페이스 변경

**파일:** `src/App.tsx` line 855

```tsx
// 변경 전
function Board({ go }: GoProps) {

// 변경 후
interface DiscoveryProps extends GoProps {
  onSelectStudent: (name: string) => void;
  urgentMode?: boolean;
}

function Discovery({ go, onSelectStudent, urgentMode = false }: DiscoveryProps) {
```

App의 `P` 맵도 업데이트:
```tsx
"board": <Discovery go={go} onSelectStudent={setSelectedStudent} urgentMode={isUrgent} />,
```

---

## 2. People/Groups 토글 추가

컴포넌트 상단 state:
```tsx
const [view, setView] = useState<"people" | "groups">("people");
```

토글 UI (필터바 위에):
```tsx
<div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-5">
  <button
    onClick={() => setView("people")}
    className={cn("px-5 py-1.5 rounded-md text-sm font-medium transition-colors",
      view === "people" ? "bg-white shadow-sm text-foreground" : "text-gray-500")}
  >
    People
  </button>
  <button
    onClick={() => setView("groups")}
    className={cn("px-5 py-1.5 rounded-md text-sm font-medium transition-colors",
      view === "groups" ? "bg-white shadow-sm text-foreground" : "text-gray-500")}
  >
    Groups
  </button>
</div>
```

- `view === "people"`: 기존 학생 카드 목록
- `view === "groups"`: Groups view — Phase Y에서 구현. 여기서는 placeholder:
  ```tsx
  <div className="text-gray-400 text-center py-20">Groups view — Phase Y에서 구현</div>
  ```

---

## 3. 사이드바 필터 → 상단 수평 필터바

**현재:** `<div className="w-[220px] shrink-0">` 사이드바 카드

**변경:** 상단 1행 수평 필터바

```tsx
<div className="flex flex-wrap gap-2 mb-5 items-center">
  {/* Section */}
  <Select value={secFilter} onValueChange={setSecFilter}>
    <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
    ...
  </Select>

  {/* Skills */}
  <Select value={skillFilter} onValueChange={setSkillFilter}>
    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Skills" /></SelectTrigger>
    ...
  </Select>

  {/* Min Overlap */}
  <Select value={overlapFilter} onValueChange={setOverlapFilter}>
    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Min overlap" /></SelectTrigger>
    ...
  </Select>

  {/* Status */}
  <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="searching">Searching</SelectItem>
      <SelectItem value="forming">Forming</SelectItem>
    </SelectContent>
  </Select>

  {/* My Activity (신규) */}
  <Select value={activityFilter} onValueChange={setActivityFilter}>
    <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="My Activity" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="none">No contact</SelectItem>
      <SelectItem value="request-sent">Request Sent</SelectItem>
      <SelectItem value="replied">Replied</SelectItem>
      <SelectItem value="no-response">No Response</SelectItem>
    </SelectContent>
  </Select>

  {/* Clear */}
  <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
    Clear
  </button>

  {/* Hidden count */}
  {hiddenStudents.size > 0 && (
    <button onClick={() => setHiddenStudents(new Set())} className="text-xs text-blue-500 ml-auto">
      Hidden ({hiddenStudents.size}) — Restore
    </button>
  )}
</div>
```

---

## 4. 필터 State 추가

```tsx
const [activityFilter, setActivityFilter] = useState("all");
const [hiddenStudents, setHiddenStudents] = useState<Set<string>>(new Set());
const [starredStudents, setStarredStudents] = useState<Set<string>>(new Set());
const [contactStatuses, setContactStatuses] = useState<Record<string, string>>({});
```

필터 적용 로직에 추가:
```tsx
// grouped 학생 자동 제거
if (st.status === "grouped") return false;

// 숨김 처리
if (hiddenStudents.has(st.name)) return false;

// My Activity 필터
if (activityFilter !== "all") {
  const cs = contactStatuses[st.name] || "none";
  if (cs !== activityFilter) return false;
}
```

---

## 5. 학생 카드에 contact status 태그 + 액션 버튼

**현재 카드 위치:** Board 내 `filteredStudents.map(...)` (line 1012~)

각 카드에 추가:

```tsx
// 카드 우상단 액션 버튼
<div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
    onClick={(e) => { e.stopPropagation(); toggleStar(st.name); }}
    className={cn("p-1 rounded text-sm", starredStudents.has(st.name) ? "text-yellow-500" : "text-gray-300 hover:text-gray-500")}
  >★</button>
  <button
    onClick={(e) => { e.stopPropagation(); hideStudent(st.name); }}
    className="p-1 rounded text-gray-300 hover:text-gray-500 text-sm"
  >✕</button>
</div>

// 카드 하단 contact status 태그
{contactStatuses[st.name] && contactStatuses[st.name] !== "none" && (
  <span className={cn("text-[10px] font-semibold py-0.5 px-2 rounded-full",
    CONTACT_STATUS_LABELS[contactStatuses[st.name]].cls
  )}>
    {CONTACT_STATUS_LABELS[contactStatuses[st.name]].l}
  </span>
)}
```

카드에 `relative group` 클래스 추가.

---

## 6. Urgent Mode 배너 — Discovery 상단 통합

**현재:** `Urgent` 별도 페이지 (line 1426)

**변경:** Discovery 상단 조건부 배너

```tsx
{urgentMode && (
  <div className="flex items-center gap-3 px-5 py-3 bg-danger-bg border border-danger-border rounded-xl mb-5">
    <span className="text-danger text-lg">⚠</span>
    <div className="flex-1">
      <div className="text-[13px] font-bold text-danger">Deadline in 3 days</div>
      <div className="text-[12px] text-danger">12 students still ungrouped. Respond quickly — No Response triggers after 24h.</div>
    </div>
    <Button size="sm" variant="destructive" className="text-xs px-3" onClick={() => go("email")}>
      View Email
    </Button>
  </div>
)}
```

Urgent mode에서 카드 "Send Request" 버튼 크기 확대:
```tsx
// urgentMode prop을 ProfilePage/패널로 전달
// 버튼 className에 조건부 py-3 → py-4, text-sm → text-base
```

데모 컨트롤에 Urgent Mode 토글 추가 (기존 `demoTier` 대체).

---

## 완료 기준

- [ ] People/Groups 토글 표시 및 전환
- [ ] 상단 수평 필터바 (Section, Skills, Overlap, Status, My Activity)
- [ ] "Hidden (N) — Restore" 링크 동작
- [ ] 카드 hover 시 X(숨기기), ★(즐겨찾기) 버튼 표시
- [ ] contact status 태그 카드에 표시
- [ ] `grouped` 학생 카드 자동 미표시
- [ ] Urgent Mode 배너 표시
- [ ] 카드 클릭 시 `onSelectStudent(name)` 호출 (패널은 Phase X)
- [ ] 빌드 에러 없음
