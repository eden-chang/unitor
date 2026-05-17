# Phase 3 — TA 대시보드 개선

> **Batch 1 (병렬 가능)** | 의존성 없음 | 독립 플로우 (Scenario 10)

---

## 목적

현재 TA 대시보드에 UX 문서에서 요구하는 항목들이 빠져있음:
- CSV 업로드 확인 메시지
- 섹션별 상태 세분화
- Ungrouped 학생 목록 (활동 수준 포함)
- 마감 후 그룹 조회 및 수동 조정

---

## 1. TACreate — CSV 업로드 확인 메시지

**파일:** `src/App.tsx` line 697–750

### 변경 사항
CSV 업로드 후 결과 요약 메시지 추가:

```tsx
// 현재: 업로드 버튼만 있음
// 변경: 업로드 시뮬레이션 후 결과 표시

const [uploaded, setUploaded] = useState(false);

// 업로드 후 표시
{uploaded && (
  <div className="py-3 px-4 bg-success-bg rounded-lg border border-success-border mt-3">
    <div className="text-[13px] font-bold text-success mb-1">✓ 45 students imported</div>
    <div className="text-[12px] text-success">L0101: 23 students · L0201: 22 students</div>
  </div>
)}
```

---

## 2. TADash — 섹션별 상태 세분화

**파일:** `src/App.tsx` line 509–696

### 현재 구조 파악
현재 TADash는 전체 통계와 섹션별 카드를 보여줌.

### 변경 사항
각 섹션 카드에 3가지 상태 카운트 추가:

```tsx
// 각 섹션 카드에 추가
<div className="grid grid-cols-3 gap-2 mt-3">
  {[
    { label: "Searching", count: 8, cls: "text-danger" },
    { label: "Forming",   count: 10, cls: "text-warning" },
    { label: "Grouped",   count: 5,  cls: "text-success" },
  ].map(({ label, count, cls }) => (
    <div key={label} className="text-center py-2 bg-gray-50 rounded-lg">
      <div className={cn("text-lg font-bold", cls)}>{count}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  ))}
</div>
```

---

## 3. TADash — 전체 진행률 Progress Bar

**파일:** `src/App.tsx` line 509–696

### 변경 사항
상단 요약 영역에 Progress bar 추가:

```tsx
// "X% confirmed" 진행률
<div className="mb-6">
  <div className="flex justify-between text-[13px] mb-2">
    <span className="font-medium">Group confirmation progress</span>
    <span className="font-bold text-success">21%</span>
  </div>
  <Progress value={21} className="h-2" />
  <div className="text-[11px] text-gray-500 mt-1">10 of 45 students confirmed</div>
</div>
```

---

## 4. TADash — Ungrouped 학생 목록 (활동 수준 포함)

**파일:** `src/App.tsx` line 509–696

### 변경 사항
대시보드 하단에 "Ungrouped Students" 섹션 추가:

```tsx
const ungrouped = [
  { name: "Omar Ali",    sec: "L0101", requestsSent: 0, requestsReceived: 1, lastActive: "3 days ago" },
  { name: "Priya S.",    sec: "L0201", requestsSent: 2, requestsReceived: 0, lastActive: "1 day ago" },
  { name: "Chris Lee",   sec: "L0101", requestsSent: 0, requestsReceived: 0, lastActive: "5 days ago" },
];
```

각 행: 이름 / 섹션 / 발신 요청 수 / 수신 요청 수 / 마지막 활동 / 활동 없음 경고 배지

활동 없음 기준: `lastActive > 3 days` → 주황색 배지 "Inactive"

---

## 5. TADash — 마감 후 그룹 목록 (데모 토글)

**파일:** `src/App.tsx` line 509–696

### 변경 사항
데모 컨트롤에 "Post-deadline" 토글 추가.
활성화 시:
- "All Groups (confirmed + auto-assigned)" 섹션 표시
- 자동 배정 그룹에 "Auto-assigned" 뱃지
- 각 그룹 행에 "Move student" 버튼 (클릭 시 토스트 or 모달 stub)

```tsx
const [postDeadline, setPostDeadline] = useState(false);

// Demo control
<Button onClick={() => setPostDeadline(!postDeadline)}>
  {postDeadline ? "Normal View" : "Post-deadline View"}
</Button>

// 조건부 섹션
{postDeadline && <GroupListSection />}
```

---

## 완료 기준

- [ ] CSV 업로드 후 섹션별 인원 요약 메시지 표시
- [ ] 섹션 카드에 searching / forming / grouped 카운트 표시
- [ ] Progress bar 표시
- [ ] Ungrouped 학생 목록 (활동 수준 포함)
- [ ] Post-deadline 토글로 그룹 목록 조회 가능
- [ ] 빌드 에러 없음
