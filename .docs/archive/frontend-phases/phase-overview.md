# EASEA Prototype — Implementation Plan Overview

## 병렬 작업 구조

```
Batch 1 (동시 작업 가능)
├── phase-1.md  →  데이터 모델 & 타입 정의
├── phase-2.md  →  온보딩 플로우 정리
└── phase-3.md  →  TA 대시보드 개선

          ↓ 모두 완료 후

Batch 2 (동시 작업 가능)
├── phase-a.md  →  Nav 3탭 + 라우팅 구조
├── phase-b.md  →  Discovery (Board 재구성)
└── phase-c.md  →  My Group 플로우 강화

          ↓ 모두 완료 후

Batch 3 (동시 작업 가능)
├── phase-x.md  →  슬라이드아웃 패널 (ProfilePage 이전)
├── phase-y.md  →  Groups View 신규 구현
└── phase-z.md  →  알림 드롭다운 시스템
```

## 의존성 요약

| 파일 | 의존 | 비고 |
|------|------|------|
| phase-1 | 없음 | 모든 파일의 기반 |
| phase-2 | 없음 | 온보딩 독립 플로우 |
| phase-3 | 없음 | TA 독립 플로우 |
| phase-a | phase-1 | 라우팅에 status 타입 필요 |
| phase-b | phase-1 | contact status 타입 필요 |
| phase-c | phase-1 | forming/grouped 상태 필요 |
| phase-x | phase-a, phase-b | 패널은 Discovery 위에 얹힘 |
| phase-y | phase-a, phase-b | Groups tab은 Discovery 내부 |
| phase-z | phase-a | Nav 구조 위에 알림 추가 |

## 관련 문서
- UX 흐름 원본: `easea-scenario-ux-flows.md`
