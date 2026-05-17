# Phase A — Nav 3탭 + 라우팅 구조

> **Batch 2 (병렬 가능)** | 선행 조건: phase-1 완료 | Scenario 구조 전반

---

## 목적

현재 Nav는 로고 + 우측 컨텍스트 버튼만 존재.
각 페이지마다 다른 버튼이 붙어 있어 일관성 없음.
UX 문서 기준: Discovery / My Group / Profile 3탭 + 알림 아이콘.

---

## 1. Nav 컴포넌트 — 3탭 구조로 교체

**파일:** `src/App.tsx` line 96–105

### 변경 전
```tsx
function Nav({ go, right }: NavProps) {
  return (
    <div className="flex justify-between items-center h-14 px-12 ...">
      <span onClick={() => go("landing")}>unitor</span>
      <div>{right}</div>
    </div>
  );
}
```

### 변경 후
```tsx
interface NavProps {
  go: (page: string) => void;
  activePage: string;
  studentStatus: "searching" | "forming" | "grouped";
}

function Nav({ go, activePage, studentStatus }: NavProps) { ... }
```

### 탭 구성
```tsx
const tabs = [
  { id: "board",   label: "Discovery",  show: studentStatus !== "grouped" },
  { id: "mygroup", label: "My Group",   show: true },
  { id: "profile-edit", label: "Profile", show: true },
];
```

- 각 탭: 클릭 시 `go(id)` 호출
- 활성 탭: 하단 2px 선 또는 배경 강조
- `grouped` 상태: Discovery 탭 숨김 (My Group이 default landing)
- 알림 벨 아이콘: 우측에 배치 (Phase Z에서 기능 구현, 여기서는 아이콘+뱃지 stub만)

---

## 2. NavProps 인터페이스 업데이트

**파일:** `src/App.tsx` line 24–27

```tsx
// 변경 전
interface NavProps {
  go: (page: string) => void;
  right?: ReactNode;
}

// 변경 후
interface NavProps {
  go: (page: string) => void;
  activePage: string;
  studentStatus?: "searching" | "forming" | "grouped";
}
```

- `right` prop 제거 (각 페이지에서 커스텀 버튼 주입하던 방식 폐기)
- `studentStatus` default: `"searching"`

---

## 3. App 컴포넌트 — studentStatus state 추가

**파일:** `src/App.tsx` line 1572+ (App function)

```tsx
const [studentStatus, setStudentStatus] = useState<"searching" | "forming" | "grouped">("searching");
```

- 데모 컨트롤에 status 전환 버튼 추가 (기존 `demoTier` 토글 방식과 동일)
- `go()` 함수가 특정 페이지로 이동할 때 status 자동 전환 로직:
  - `go("sent-*")` 호출 시 → `setStudentStatus("forming")`
  - MyGroup에서 Confirm 완료 시 → `setStudentStatus("grouped")`

---

## 4. 각 페이지에서 Nav 호출 방식 변경

**영향받는 함수:** Board, MyGroup, Chat, Inbox, ProfilePage, Sent 등 Nav를 사용하는 모든 컴포넌트

현재:
```tsx
<Nav go={go} right={<Button onClick={...}>My Group</Button>} />
```

변경 후:
```tsx
<Nav go={go} activePage="board" studentStatus={studentStatus} />
```

- 각 함수에 `studentStatus` prop 추가 필요
- 또는 App 레벨에서 Nav를 한 번만 렌더링하고 페이지 컴포넌트는 Nav 없이 구성 (권장)

### 권장 방식: App 레벨에서 Nav 분리
```tsx
// App return
return (
  <div>
    <Nav go={go} activePage={pg} studentStatus={studentStatus} />
    <div>{P[pg]}</div>
    {/* demo nav */}
  </div>
);
```
각 페이지 컴포넌트에서 `<Nav />` 호출 제거.

---

## 5. 라우팅 규칙 — studentStatus별 기본 페이지

**파일:** `src/App.tsx` App 컴포넌트

```tsx
// grouped 상태에서 board 접근 시 mygroup으로 리다이렉트
useEffect(() => {
  if (studentStatus === "grouped" && pg === "board") {
    setPg("mygroup");
  }
}, [studentStatus, pg]);
```

---

## 6. profile-edit 페이지 stub

현재 Profile 탭 클릭 대상 페이지가 없음.
간단한 stub 추가:

```tsx
function ProfileEdit({ go }: GoProps) {
  return (
    <div className="bg-background min-h-screen pb-32">
      <div className="max-w-[680px] mx-auto py-14 px-6">
        <h1 className="text-[28px] font-bold mb-6">My Profile</h1>
        <p className="text-gray-500">Profile editing — Phase 2 온보딩 완료 후 연결</p>
      </div>
    </div>
  );
}
```

`P` 맵에 `"profile-edit": <ProfileEdit go={go} />` 추가.

---

## 완료 기준

- [ ] Nav에 Discovery / My Group / Profile 3탭 표시
- [ ] 활성 탭 시각적 강조
- [ ] `grouped` 상태에서 Discovery 탭 숨김
- [ ] 각 탭 클릭 시 올바른 페이지로 이동
- [ ] App에 `studentStatus` state 존재
- [ ] 알림 벨 아이콘 + 뱃지 stub 표시 (기능은 Phase Z)
- [ ] 빌드 에러 없음
