# Phase 2 — 온보딩 플로우 정리

> **Batch 1 (병렬 가능)** | 의존성 없음 | 독립 플로우 (Scenario 1)

---

## 목적

현재 온보딩은 UX 문서와 두 가지 불일치:
1. 일정 그리드가 2개 (문서는 1개)
2. 이메일 매칭 로직/안내 없음, Section이 수동 입력

---

## 1. Prof2 — 일정 그리드 1개로 축소

**파일:** `src/App.tsx` line 408–436

### 변경 사항
- "Your schedule" 그리드 1개만 유지
- 두 번째 그리드 (상대방 또는 "preferred hours" 용) 제거
- 그리드 상단에 힌트 텍스트 추가:
  ```
  "When can you work on the project? Click or drag to select."
  ```
- 그리드 하단에 "Flexible / Not sure" 체크박스 추가:
  - 체크 시 그리드 비활성화 + 연한 회색 처리
  - 체크 시 저장값: 전체 슬롯 선택으로 처리 (최대 겹침 허용)

### 구현
```tsx
const [flexible, setFlexible] = useState(false);

// 그리드 위
<p className="text-[13px] text-gray-500 mb-3">
  Click or drag to select available times.
</p>

// TGrid에 disabled prop 추가
<TGrid sel={sched} set={setSched} label="When can you work?" disabled={flexible} />

// 그리드 아래
<label className="flex items-center gap-2 mt-3 cursor-pointer">
  <Checkbox checked={flexible} onCheckedChange={(v) => setFlexible(v === true)} />
  <span className="text-[13px] text-gray-600">Flexible / Not sure</span>
</label>
```

### TGrid 컴포넌트 수정
- `disabled?: boolean` prop 추가
- disabled일 때 버튼 pointer-events-none + opacity-40

---

## 2. SignupForm — 이메일 검증 안내

**파일:** `src/App.tsx` line 237–277

### 변경 사항
- Email 필드 label 변경: `"Email"` → `"University Email"`
- placeholder: `"yourid@mail.utoronto.ca"`
- 필드 하단 안내 텍스트:
  ```
  Must match your course enrollment email.
  ```
- 데모용 에러 시뮬레이션 추가:
  - 특정 이메일(예: `unknown@mail.utoronto.ca`) 입력 시 에러 표시
  - 에러 메시지: `"Your email was not found in this course. Contact your TA."`

```tsx
const [emailError, setEmailError] = useState(false);

const handleSubmit = () => {
  if (email === "unknown@mail.utoronto.ca") {
    setEmailError(true);
    return;
  }
  go("verify");
};

// 에러 표시
{emailError && (
  <p className="text-[13px] text-danger mt-1">
    Your email was not found in this course. Contact your TA.
  </p>
)}
```

---

## 3. SignupForm — Section 필드 read-only pre-filled

**파일:** `src/App.tsx` line 237–277

### 변경 사항
- Section Select → read-only display (수동 선택 불가)
- CSV에서 자동 매칭되었음을 나타내는 잠금 아이콘 또는 안내

```tsx
// 변경 전: Select 드롭다운
<Select value={section} onValueChange={setSection}>...</Select>

// 변경 후: 읽기 전용 표시
<div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
  <span className="text-sm font-medium">L0201</span>
  <span className="text-[11px] text-gray-400 ml-auto">Pre-filled from enrollment</span>
</div>
```

---

## 4. 온보딩 흐름 라우팅 확인

**파일:** `src/App.tsx` line 1603–1609

현재 온보딩 라우트:
```
landing → login → signup-role → signup → verify → dash → join → prof-0 → prof-1 → prof-2 → prof-3 → prof-done
```

변경 없음. 순서 유지.

---

## 완료 기준

- [ ] Prof2에 그리드 1개만 존재
- [ ] "Flexible / Not sure" 체크박스 동작
- [ ] 이메일 미매칭 에러 메시지 표시
- [ ] Section 필드 수동 변경 불가
- [ ] 빌드 에러 없음
