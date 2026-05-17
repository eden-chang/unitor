# Phase 1 — 데이터 모델 & 타입 정의

> **Batch 1 (병렬 가능)** | 의존성 없음 | 다른 모든 Phase의 기반

---

## 목적

현재 타입/데이터가 UX 문서의 상태 체계와 불일치함.
이 Phase는 UI를 건드리지 않고 **타입과 정적 데이터만** 수정한다.
다른 Phase가 이 결과를 import해서 사용.

---

## 1. Student 인터페이스 수정

**파일:** `src/App.tsx` line 54–66

### 변경 전
```ts
status: "searching" | "talking" | "confirmed";
```

### 변경 후
```ts
status: "searching" | "forming" | "grouped";
contactStatus: "none" | "request-sent" | "replied" | "declined" | "no-response";
```

- `talking` → `forming` (그룹이 존재하지만 미확정)
- `confirmed` → `grouped` (그룹 확정 완료)
- `contactStatus` 신규 추가: 카드에 표시되는 별도 상태 (학생 상태와 독립적)

---

## 2. STU 데이터 업데이트

**파일:** `src/App.tsx` line 751–846

- 각 학생의 `status` 값 변경:
  - `"talking"` → `"forming"`
  - `"confirmed"` → `"grouped"`
- 각 학생에 `contactStatus: "none"` 기본값 추가
- `"grouped"` 상태 학생 1~2명 추가 (Discovery에서 숨겨지는 케이스 데모용)
- `"forming"` 상태 학생 2~3명 추가 (Groups view 연결 데모용)

### 현재 status 값 확인 필요 항목
```
grep -n "status:" src/App.tsx
```
(line 1012 근처 Board 렌더링 분기도 함께 수정)

---

## 3. StatusInfo 레이블 업데이트

**파일:** `src/App.tsx` — `SS` 또는 status label 매핑 객체

```ts
// 변경 전
"talking": { l: "In talks", ... }
"confirmed": { l: "Confirmed", ... }

// 변경 후
"forming": { l: "Forming", variant: "warning" }
"grouped": { l: "Grouped", variant: "success" }
```

---

## 4. contact status 레이블 상수 추가

새 상수 객체 추가 (line 84 `HELPERS` 섹션 근처):

```ts
const CONTACT_STATUS_LABELS: Record<string, { l: string; cls: string }> = {
  "none":          { l: "No contact",    cls: "text-gray-400" },
  "request-sent":  { l: "Request Sent",  cls: "text-blue-600 bg-blue-50" },
  "replied":       { l: "Replied",       cls: "text-success bg-success-bg" },
  "declined":      { l: "Declined",      cls: "text-danger bg-danger-bg" },
  "no-response":   { l: "No Response",   cls: "text-warning bg-warning-bg" },
};
```

---

## 5. Board 렌더링 분기 수정

**파일:** `src/App.tsx` line 1012 근처

```ts
// 변경 전
const dest = st.status === "confirmed" ? null
           : st.compatScore >= 80 ? "profile-view-good"
           : ...

// 변경 후
const dest = st.status === "grouped" ? null : st.name;
// (슬라이드 패널은 Phase X에서 구현 — 여기서는 null 처리만)
```

---

## 완료 기준

- [ ] TypeScript 빌드 에러 없음 (`npm run build`)
- [ ] `"talking"`, `"confirmed"` 문자열이 코드에 남아있지 않음
- [ ] 모든 STU 항목에 `contactStatus` 필드 존재
