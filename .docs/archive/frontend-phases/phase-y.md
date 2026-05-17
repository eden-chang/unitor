# Phase Y — Groups View 신규 구현

> **Batch 3 (병렬 가능)** | 선행 조건: phase-a, phase-b 완료 | Scenario 4

---

## 목적

현재 Groups view 없음. Discovery의 "Groups" 탭 클릭 시 placeholder만 표시.
UX 문서 Scenario 4: 모집 중인 그룹 카드 목록 + 지원 플로우.

Phase B에서 Groups tab placeholder를 심어두었으므로,
이 Phase는 그 placeholder를 실제 컴포넌트로 대체한다.

---

## 1. 정적 그룹 데이터 추가

**파일:** `src/App.tsx` — STU 데이터 근처 (line 751 근처)

```ts
interface FormingGroup {
  id: string;
  leaderName: string;
  leaderInit: string;
  members: { name: string; init: string; skills: string[] }[];
  maxSize: number;
  section: string;
  neededSkills: string[];
  description: string;
  applicationQuestions: string[];
  appliedStatus?: "none" | "applied" | "replied" | "accepted" | "declined";
}

const FORMING_GROUPS: FormingGroup[] = [
  {
    id: "group-alpha",
    leaderName: "Jesse Nguyen",
    leaderInit: "JN",
    section: "201",
    members: [
      { name: "Jesse Nguyen", init: "JN", skills: ["Frontend Dev", "Prototyping"] },
      { name: "Aisha Khan",   init: "AK", skills: ["Project Mgmt", "UX Writing"] },
    ],
    maxSize: 5,
    neededSkills: ["Backend", "Data Analysis", "UI Design"],
    description: "Building an accessibility-focused study app. Looking for someone strong in backend or data.",
    applicationQuestions: [
      "What skills can you contribute?",
      "What role do you want?",
      "When are you free to work?",
    ],
    appliedStatus: "none",
  },
  {
    id: "group-beta",
    leaderName: "Chris Lee",
    leaderInit: "CL",
    section: "202",
    members: [
      { name: "Chris Lee",   init: "CL", skills: ["Backend", "Data Analysis"] },
      { name: "Mia Torres",  init: "MT", skills: ["UI Design"] },
      { name: "Sam Park",    init: "SP", skills: ["User Research"] },
    ],
    maxSize: 5,
    neededSkills: ["Frontend Dev", "Project Mgmt"],
    description: "Working on a campus resource-sharing platform. Great schedule overlap already.",
    applicationQuestions: [
      "What skills can you contribute?",
      "What role do you want?",
      "When are you free to work?",
    ],
    appliedStatus: "none",
  },
];
```

---

## 2. GroupsView 컴포넌트

**파일:** `src/App.tsx` — Discovery 함수 근처에 추가

```tsx
interface GroupsViewProps {
  onSelectGroup: (groupId: string) => void;
}

function GroupsView({ onSelectGroup }: GroupsViewProps) {
  const [appliedGroups, setAppliedGroups] = useState<Record<string, string>>({});
  const [secFilter, setSecFilter] = useState("all");

  const filtered = FORMING_GROUPS.filter(g =>
    secFilter === "all" || g.section === secFilter
  );

  return (
    <div>
      {/* 필터 (섹션만) */}
      <div className="flex gap-2 mb-5">
        <Select value={secFilter} onValueChange={setSecFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            <SelectItem value="201">201</SelectItem>
            <SelectItem value="202">202</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 그룹 카드 목록 */}
      <div className="space-y-3">
        {filtered.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            appliedStatus={appliedGroups[group.id] || "none"}
            onClick={() => onSelectGroup(group.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">No recruiting groups found.</div>
        )}
      </div>
    </div>
  );
}
```

---

## 3. GroupCard 컴포넌트

```tsx
interface GroupCardProps {
  group: FormingGroup;
  appliedStatus: string;
  onClick: () => void;
}

function GroupCard({ group, appliedStatus, onClick }: GroupCardProps) {
  const STATUS_LABELS: Record<string, { l: string; cls: string }> = {
    "none":     { l: "",          cls: "" },
    "applied":  { l: "Applied",   cls: "bg-blue-50 text-blue-600 border-blue-200" },
    "replied":  { l: "Replied",   cls: "bg-success-bg text-success border-success-border" },
    "accepted": { l: "Accepted",  cls: "bg-success text-white border-success" },
    "declined": { l: "Declined",  cls: "bg-danger-bg text-danger border-danger-border" },
  };

  return (
    <Card
      className="p-5 shadow-none cursor-pointer hover:border-gray-300 transition-colors relative"
      onClick={onClick}
    >
      {/* 좌측 상태 스트립 */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
        appliedStatus === "accepted" ? "bg-success" :
        appliedStatus === "applied"  ? "bg-blue-400" :
        appliedStatus === "declined" ? "bg-danger" : "bg-gray-200"
      )} />

      <div className="pl-3">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-sm font-bold">{group.leaderName}'s Group</div>
            <div className="text-xs text-gray-500">
              Section {group.section} · {group.members.length}/{group.maxSize} members
            </div>
          </div>
          {appliedStatus !== "none" && (
            <span className={cn("text-[10px] font-semibold py-0.5 px-2.5 rounded-full border",
              STATUS_LABELS[appliedStatus]?.cls)}>
              {STATUS_LABELS[appliedStatus]?.l}
            </span>
          )}
        </div>

        {/* 필요 스킬 */}
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-[10px] text-gray-400 mr-1 mt-0.5">Needs:</span>
          {group.neededSkills.map(sk => (
            <span key={sk} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100">
              {sk}
            </span>
          ))}
        </div>

        {/* 설명 */}
        <p className="text-[12px] text-gray-600 line-clamp-2">{group.description}</p>
      </div>
    </Card>
  );
}
```

---

## 4. GroupDetailPanel 컴포넌트 (슬라이드아웃 패널 내 콘텐츠)

Phase X의 SlidePanel에 그룹 상세 + 지원 폼을 넣는다.

```tsx
interface GroupDetailPanelProps extends GoProps {
  groupId: string;
  onClose: () => void;
  onApplied: (groupId: string) => void;
}

function GroupDetailPanel({ go, groupId, onClose, onApplied }: GroupDetailPanelProps) {
  const group = FORMING_GROUPS.find(g => g.id === groupId)!;
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<string[]>(group.applicationQuestions.map(() => ""));

  if (submitted) {
    return (
      <div className="p-6 text-center pt-16">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success-bg flex items-center justify-center">
          <span className="text-2xl text-success">✓</span>
        </div>
        <div className="text-lg font-bold mb-2">Application Sent!</div>
        <p className="text-[13px] text-gray-600 mb-6">
          {group.leaderName} will review your application.
        </p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 그룹 기본 정보 */}
      <div className="mb-5">
        <div className="text-lg font-bold mb-1">{group.leaderName}'s Group</div>
        <div className="text-xs text-gray-500 mb-3">
          Section {group.section} · {group.members.length}/{group.maxSize} members
        </div>
        <p className="text-[13px] text-gray-700">{group.description}</p>
      </div>

      {/* 멤버 목록 */}
      <div className="mb-5">
        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Members</Label>
        {group.members.map((m, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Avatar className="size-7"><AvatarFallback className="text-xs bg-gray-200">{m.init}</AvatarFallback></Avatar>
            <span className="text-[12px] font-medium">{m.name}</span>
            <div className="flex gap-1 ml-auto">
              {m.skills.map(sk => (
                <span key={sk} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">{sk}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 필요 스킬 */}
      <div className="mb-5">
        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Skills Needed</Label>
        <div className="flex flex-wrap gap-1">
          {group.neededSkills.map(sk => (
            <span key={sk} className="text-[11px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-100">
              {sk}
            </span>
          ))}
        </div>
      </div>

      {/* 지원 폼 */}
      <div className="border-t border-gray-100 pt-5">
        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3 block">
          Application
        </Label>
        {group.applicationQuestions.map((q, i) => (
          <F key={i} l={q}>
            <Textarea
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
              className="text-[12px] resize-none h-16"
              placeholder="Your answer..."
            />
          </F>
        ))}
      </div>
    </div>
  );
}
```

패널 하단 고정 버튼:
```tsx
// SlidePanel footer (Phase X의 구조에 맞춰 패널 하단에 배치)
<div className="border-t border-border p-4 shrink-0">
  <div className="flex gap-3">
    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
    <Button
      className="flex-1"
      disabled={answers.some(a => a.trim() === "")}
      onClick={() => {
        setSubmitted(true);
        onApplied(group.id);
      }}
    >
      Submit Application
    </Button>
  </div>
</div>
```

---

## 5. Discovery에 GroupsView 연결

**파일:** `src/App.tsx` Discovery 컴포넌트 (Phase B에서 Groups placeholder 위치)

```tsx
// 변경 전 (Phase B placeholder)
{view === "groups" && (
  <div className="text-gray-400 text-center py-20">Groups view — Phase Y에서 구현</div>
)}

// 변경 후
{view === "groups" && (
  <GroupsView onSelectGroup={(id) => { setSelectedGroup(id); }} />
)}
```

App에 `selectedGroup` state 추가:
```tsx
const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
```

SlidePanel에 GroupDetailPanel도 연결:
```tsx
{selectedGroup && (
  <SlidePanel open={selectedGroup !== null} onClose={() => setSelectedGroup(null)}>
    <GroupDetailPanel
      go={go}
      groupId={selectedGroup}
      onClose={() => setSelectedGroup(null)}
      onApplied={(id) => { /* appliedGroups 상태 업데이트 */ setSelectedGroup(null); }}
    />
  </SlidePanel>
)}
```

---

## 6. Forming 학생 → Groups view 연결

Phase X에서 forming 학생 패널의 "View Their Group" 버튼:
```tsx
onClick={() => {
  onClose();                        // 학생 패널 닫기
  setDiscoveryView("groups");       // Groups 탭으로 전환
  setSelectedGroup("group-alpha");  // 해당 그룹 패널 열기
}}
```

이 콜백을 App에서 내려줘야 하므로 `Discovery`에 `onViewGroup?: (groupId: string) => void` prop 추가.

---

## 완료 기준

- [ ] GroupsView: 그룹 카드 목록 표시
- [ ] 카드: 리더명, 인원, 필요 스킬, 섹션 표시
- [ ] 카드 클릭 → 슬라이드 패널에서 그룹 상세 표시
- [ ] 지원 폼 3개 질문 pre-filled
- [ ] 모든 질문 답변 시 Submit 버튼 활성화
- [ ] 제출 후 카드에 "Applied" 태그 표시
- [ ] forming 학생 패널 "View Their Group" → Groups 탭으로 전환
- [ ] 섹션 필터 동작
- [ ] 빌드 에러 없음
