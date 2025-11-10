# Phase 2 Implementation Plan: Quick Closure Feature

## 개요

**목표**: 타임라인에서 우클릭으로 10초 이내에 시간대를 마감할 수 있는 빠른 마감 기능 구현

**예상 소요 시간**: 220분 (3시간 40분)

**핵심 사용자 플로우**:
```
1. 관리자가 타임라인의 특정 시간대에 우클릭
2. 컨텍스트 메뉴가 나타남 (⚡ 빠른 마감)
3. 클릭 시 간단한 확인 대화상자
4. 사유 입력 (선택 사항)
5. "즉시 마감" 버튼 클릭
6. 마감 처리 완료 (총 10초 이내)
```

---

## Task 목록

### Task 2.1: Context Menu 컴포넌트 생성 (40분)

**목표**: 우클릭 시 나타나는 컨텍스트 메뉴 구현

**구현 내역**:
1. Shadcn Context Menu 설치
2. SlotContextMenu 컴포넌트 생성
3. 메뉴 아이템 정의 (빠른 마감, 상세 정보)
4. 위치 계산 및 표시

**기술 스택**:
- Radix UI Context Menu
- Tailwind CSS
- Lucide React Icons

**컴포넌트 구조**:
```typescript
interface SlotContextMenuProps {
  children: React.ReactNode;
  timeSlot: {
    date: string;
    period: "MORNING" | "AFTERNOON" | "EVENING";
    timeSlotStart: string;
    timeSlotEnd?: string;
    serviceId?: string;
    serviceName?: string;
  };
  onQuickClose: (slotInfo: SlotInfo) => void;
  onViewDetails: (slotInfo: SlotInfo) => void;
  disabled?: boolean;
}
```

**파일 위치**: `components/admin/SlotContextMenu.tsx`

**검증 기준**:
- ✅ 우클릭 시 메뉴가 커서 위치에 나타남
- ✅ 메뉴 외부 클릭 시 자동으로 닫힘
- ✅ 키보드 ESC로 메뉴 닫기
- ✅ 메뉴 아이템 호버 효과
- ✅ 아이콘과 텍스트가 명확하게 표시

---

### Task 2.2: Quick Close Dialog 컴포넌트 생성 (50분)

**목표**: 빠른 마감을 위한 간소화된 대화상자 구현

**구현 내역**:
1. Shadcn Dialog 컴포넌트 활용
2. QuickCloseDialog 컴포넌트 생성
3. 최소한의 입력 필드 (사유만 선택 사항)
4. 충돌 정보 표시 영역
5. 즉시 마감 버튼

**기술 스택**:
- Radix UI Dialog
- React Hook Form (간단한 폼 관리)
- Zod (검증)

**컴포넌트 구조**:
```typescript
interface QuickCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotInfo: {
    date: string;
    period: "MORNING" | "AFTERNOON" | "EVENING";
    timeSlotStart: string;
    timeSlotEnd?: string;
    serviceId?: string;
    serviceName?: string;
  };
  onConfirm: (data: QuickCloseData) => Promise<void>;
  isLoading?: boolean;
}

interface QuickCloseData {
  reason?: string;
}
```

**UI 레이아웃**:
```
┌─────────────────────────────────────┐
│  ⚡ 빠른 시간 마감                    │
├─────────────────────────────────────┤
│                                       │
│  📅 날짜: 2025-11-09                  │
│  ⏰ 시간: 오전 09:00                  │
│  🏥 서비스: 주름 보톡스              │
│                                       │
│  📝 사유 (선택):                      │
│  ┌────────────────────────────┐     │
│  │ 예: 직원 부재, 장비 점검    │     │
│  └────────────────────────────┘     │
│                                       │
│  ⚠️ 충돌 확인 중...                  │
│  ✅ 예약 없음 - 즉시 마감 가능       │
│                                       │
│  [취소]              [⚡ 즉시 마감]  │
│                                       │
└─────────────────────────────────────┘
```

**파일 위치**: `components/admin/QuickCloseDialog.tsx`

**검증 기준**:
- ✅ Dialog가 모달로 표시됨
- ✅ 마감 정보가 명확하게 표시됨
- ✅ 사유 입력 (선택 사항)
- ✅ 충돌 확인 결과 실시간 표시
- ✅ 로딩 상태 표시
- ✅ ESC 키로 닫기 가능

---

### Task 2.3: 충돌 확인 API 통합 (30분)

**목표**: 마감 전 예약 충돌 확인 로직 구현

**구현 내역**:
1. 충돌 확인 API 엔드포인트 생성 (또는 기존 활용)
2. QuickCloseDialog에서 충돌 확인 호출
3. 충돌 결과에 따른 UI 표시
4. 경고 메시지 및 권장 사항

**API 스펙**:
```typescript
// GET /api/admin/manual-close/check-conflict
interface ConflictCheckRequest {
  date: string;
  period: "MORNING" | "AFTERNOON" | "EVENING";
  timeSlotStart: string;
  timeSlotEnd?: string;
  serviceId?: string;
}

interface ConflictCheckResponse {
  success: boolean;
  hasConflict: boolean;
  conflictCount: number;
  conflicts: {
    id: string;
    patient_name: string;
    reservation_time: string;
    status: string;
  }[];
  recommendation: string;
}
```

**충돌 시나리오**:
1. **충돌 없음**: "✅ 예약 없음 - 즉시 마감 가능"
2. **충돌 있음**: "⚠️ 예약 2건 있음 - 마감 시 신규 예약만 차단됨"

**파일 위치**:
- API: `app/api/admin/manual-close/check-conflict/route.ts` (신규 또는 기존 활용)
- Hook: `hooks/useConflictCheck.ts` (신규)

**검증 기준**:
- ✅ 충돌 확인이 1초 이내에 완료
- ✅ 충돌 결과가 명확하게 표시
- ✅ 네트워크 에러 처리
- ✅ 로딩 상태 표시

---

### Task 2.4: 우클릭 이벤트 핸들링 (30분)

**목표**: 타임라인의 예약 카드 또는 빈 시간대에 우클릭 이벤트 추가

**구현 내역**:
1. ReservationCard에 우클릭 이벤트 추가
2. 빈 시간대 슬롯 컴포넌트 생성 (필요시)
3. 우클릭 시 SlotContextMenu 표시
4. 클릭 좌표 계산 및 메뉴 위치 조정

**통합 위치**:
- `components/admin/ReservationCard.tsx` (기존 수정)
- `components/admin/ReservationTimeline.tsx` (이벤트 핸들러 추가)

**이벤트 핸들러 구조**:
```typescript
const handleContextMenu = (event: React.MouseEvent, slotInfo: SlotInfo) => {
  event.preventDefault();
  setContextMenuPosition({ x: event.clientX, y: event.clientY });
  setSelectedSlot(slotInfo);
  setShowContextMenu(true);
};
```

**검증 기준**:
- ✅ 예약 카드 우클릭 시 메뉴 표시
- ✅ 빈 시간대 우클릭 시 메뉴 표시 (해당되는 경우)
- ✅ 메뉴가 화면 밖으로 나가지 않음
- ✅ 좌클릭은 기존 동작 유지

---

### Task 2.5: 빠른 마감 생성 로직 구현 (40분)

**목표**: QuickCloseDialog에서 확인 시 마감 생성 API 호출 및 UI 업데이트

**구현 내역**:
1. 마감 생성 API 호출 로직
2. 낙관적 UI 업데이트
3. 성공/실패 메시지 표시
4. 타임라인 자동 새로고침

**API 호출**:
```typescript
const handleQuickClose = async (data: QuickCloseData) => {
  try {
    setIsLoading(true);

    const token = localStorage.getItem("accessToken");
    const response = await fetch("/api/admin/manual-close", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        closureDate: selectedSlot.date,
        period: selectedSlot.period,
        timeSlotStart: selectedSlot.timeSlotStart,
        timeSlotEnd: selectedSlot.timeSlotEnd,
        serviceId: selectedSlot.serviceId,
        reason: data.reason || "빠른 마감",
      }),
    });

    if (!response.ok) {
      throw new Error("마감 생성에 실패했습니다");
    }

    // 성공 메시지
    toast.success("시간대가 즉시 마감되었습니다");

    // 타임라인 새로고침
    await refreshTimeline();

    // 다이얼로그 닫기
    onOpenChange(false);
  } catch (err) {
    toast.error(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

**검증 기준**:
- ✅ 마감 생성이 2초 이내에 완료
- ✅ 성공 시 타임라인에 즉시 반영
- ✅ 실패 시 에러 메시지 표시
- ✅ 로딩 중 중복 클릭 방지
- ✅ Dialog 자동으로 닫힘

---

### Task 2.6: 통합 테스트 및 검증 (30분)

**목표**: Phase 2 전체 플로우 테스트 및 성능 검증

**테스트 시나리오**:

1. **기본 빠른 마감 플로우**
   - 타임라인에서 시간대 우클릭
   - 컨텍스트 메뉴에서 "빠른 마감" 클릭
   - 사유 입력 (선택 사항)
   - "즉시 마감" 클릭
   - 타임라인에 마감 표시 확인

2. **충돌 있는 경우**
   - 예약이 있는 시간대 우클릭
   - 충돌 경고 메시지 확인
   - 마감 진행 시 동작 확인

3. **에러 처리**
   - 네트워크 에러 시나리오
   - 권한 없는 경우
   - 잘못된 데이터 입력

4. **성능 측정**
   - 우클릭 → 메뉴 표시: < 100ms
   - 충돌 확인: < 1초
   - 마감 생성: < 2초
   - 전체 플로우: < 10초

**검증 체크리스트**:
- ✅ 우클릭 메뉴가 정상 작동
- ✅ Dialog가 올바르게 표시
- ✅ 충돌 확인이 실시간으로 작동
- ✅ 마감 생성이 성공적으로 완료
- ✅ 타임라인이 즉시 업데이트
- ✅ 에러 처리가 적절함
- ✅ 성능 목표 달성 (10초 이내)
- ✅ UX가 직관적이고 빠름

---

## 기술 스택 및 의존성

### 새로 설치할 패키지
```bash
# Shadcn Context Menu 설치
npx shadcn@latest add context-menu

# Shadcn Dialog (이미 설치되어 있을 수 있음)
npx shadcn@latest add dialog

# Toast 알림 (선택 사항)
npx shadcn@latest add toast
```

### 사용할 MCP 도구
1. **Sequential Thinking**: 복잡한 로직 분석 및 설계
2. **Context7**: React, Radix UI 패턴 참조
3. **Native Tools**: 컴포넌트 생성 및 수정

---

## 파일 구조

```
components/admin/
├── SlotContextMenu.tsx          (신규 - 40분)
├── QuickCloseDialog.tsx         (신규 - 50분)
├── ReservationCard.tsx          (수정 - 우클릭 이벤트)
└── ReservationTimeline.tsx      (수정 - 이벤트 핸들러)

hooks/
└── useConflictCheck.ts          (신규 - 30분)

app/api/admin/manual-close/
├── route.ts                     (기존 - POST 이미 있음)
└── check-conflict/
    └── route.ts                 (신규 또는 기존 활용 - 30분)

components/ui/
├── context-menu.tsx             (Shadcn 설치)
└── dialog.tsx                   (이미 있을 수 있음)

claudedocs/
├── phase2-implementation-plan.md (이 문서)
└── phase2-test-results.md       (테스트 후 생성)
```

---

## 구현 순서

### Step 1: 기반 설치 (10분)
1. Shadcn Context Menu 설치
2. Shadcn Dialog 확인/설치
3. Shadcn Toast 설치 (선택)

### Step 2: Context Menu 구현 (40분)
1. SlotContextMenu 컴포넌트 생성
2. 메뉴 아이템 정의
3. 스타일링 및 아이콘

### Step 3: Quick Close Dialog 구현 (50분)
1. QuickCloseDialog 컴포넌트 생성
2. 폼 필드 구성
3. 충돌 확인 영역 추가

### Step 4: API 통합 (30분)
1. 충돌 확인 API 구현/활용
2. useConflictCheck Hook 생성
3. API 응답 처리

### Step 5: 이벤트 통합 (30분)
1. ReservationCard에 우클릭 이벤트
2. ReservationTimeline에 핸들러 추가
3. 컨텍스트 메뉴 연결

### Step 6: 마감 생성 로직 (40분)
1. handleQuickClose 함수 구현
2. 낙관적 UI 업데이트
3. 에러 처리

### Step 7: 통합 테스트 (30분)
1. 전체 플로우 테스트
2. 성능 측정
3. 버그 수정

---

## 예상 결과

### 사용자 경험
```
🎯 목표 시간: 10초 이내
├─ 우클릭 (0초)
├─ 메뉴 표시 (0.1초)
├─ "빠른 마감" 클릭 (2초)
├─ Dialog 표시 (0.1초)
├─ 충돌 확인 (1초)
├─ 사유 입력 (선택, 3초)
├─ "즉시 마감" 클릭 (0.5초)
├─ 마감 생성 (1.5초)
└─ 타임라인 업데이트 (0.5초)

총: 약 8.7초 (목표 달성 ✅)
```

### 성능 목표
- **우클릭 → 메뉴**: < 100ms
- **충돌 확인**: < 1초
- **마감 생성**: < 2초
- **전체 플로우**: < 10초

### 품질 목표
- ✅ TypeScript strict 모드 준수
- ✅ 제로 컴파일 에러
- ✅ 제로 런타임 에러
- ✅ 직관적인 UX
- ✅ 접근성 준수 (키보드 네비게이션)

---

## Phase 1과의 통합

Phase 2는 Phase 1에서 구현한 컴포넌트들을 활용합니다:

1. **ClosureIndicator**: 빠른 마감 후 타임라인에 표시
2. **fetchClosures**: 마감 생성 후 자동 새로고침
3. **handleRemoveClosure**: 빠른 마감으로 생성된 마감도 해제 가능
4. **ManualClosure 인터페이스**: 동일한 타입 사용

**Phase 2에서 추가되는 것**:
- 우클릭 컨텍스트 메뉴
- 빠른 마감 다이얼로그
- 10초 이내 마감 생성 플로우

---

## 다음 단계 (Phase 3 미리보기)

Phase 3에서는 **일괄 마감 기능** (20초 작업)을 구현합니다:
- 날짜 범위 선택 (Date Range Picker)
- 여러 날짜 동시 마감
- 일괄 충돌 확인
- 마감 일정 미리보기

---

**문서 작성**: 2025-11-06
**예상 소요 시간**: 220분 (3시간 40분)
**난이도**: 중 (Phase 1보다 약간 복잡)
