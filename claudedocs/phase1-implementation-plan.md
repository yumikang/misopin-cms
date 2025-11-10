# Phase 1 구현 계획서: 타임라인 마감 정보 통합

**작성일**: 2025-11-06
**목표**: 타임라인에 마감 정보를 통합 표시하여 사용자가 한눈에 마감 상태를 파악
**예상 소요 시간**: 2-3시간
**우선순위**: HIGH (긴급 마감 기능의 기반)

---

## 📋 목차

1. [아키텍처 분석](#아키텍처-분석)
2. [작업 분해 (Task Breakdown)](#작업-분해)
3. [기술 스택 및 패턴](#기술-스택-및-패턴)
4. [리스크 분석](#리스크-분석)
5. [검증 계획](#검증-계획)
6. [타임라인](#타임라인)

---

## 아키텍처 분석

### 현재 상태 분석

#### ReservationTimeline 컴포넌트 구조
```typescript
// 현재 데이터 플로우
1. fetchReservations() → /api/reservations?date={date}&department={service}
2. 예약 데이터를 period별로 그룹화 (MORNING, AFTERNOON, EVENING)
3. renderPeriodSection()으로 각 period 렌더링
4. ReservationCard 컴포넌트로 개별 예약 표시
5. 30초마다 자동 새로고침
```

**현재 타임라인 구조**:
- 예약이 있는 시간대만 표시
- 예약 없는 시간대는 표시하지 않음
- 마감 정보와 완전히 분리됨

**문제점**:
1. 마감된 시간대가 보이지 않음
2. 전체 시간대 그리드가 없어 빈 시간 파악 어려움
3. 예약과 마감 정보를 동시에 볼 수 없음

### 개선 아키텍처

#### 새로운 데이터 플로우
```typescript
// Phase 1: 통합된 데이터 플로우
1. 병렬 데이터 fetch
   ├─ fetchReservations() → 예약 데이터
   └─ fetchClosures() → 마감 데이터

2. 데이터 통합 및 시간대 생성
   ├─ generateTimeSlots() → 전체 시간대 배열 생성
   ├─ mapReservationsToSlots() → 예약을 시간대에 매핑
   └─ mapClosuresToSlots() → 마감을 시간대에 매핑

3. TimeSlotInfo 인터페이스
   interface TimeSlotInfo {
     time: string;              // "09:00"
     period: PeriodType;
     status: 'available' | 'booked' | 'closed' | 'limited';
     reservations: Reservation[];
     closures: ManualClosure[];
     hasConflict: boolean;
   }

4. 렌더링
   └─ renderTimeSlot() → ClosureIndicator 또는 ReservationCard
```

#### 컴포넌트 계층 구조
```
ReservationTimeline (개선)
├─ Header (날짜, 새로고침)
├─ FilterBar (서비스 필터)
└─ PeriodSection[]
    ├─ PeriodHeader (오전/오후/저녁)
    └─ TimeSlot[]
        ├─ 마감된 경우: ClosureIndicator (NEW)
        │   ├─ 마감 아이콘 + 사유
        │   ├─ Tooltip (상세 정보)
        │   └─ QuickReleaseButton
        │
        └─ 예약된 경우: ReservationCard (기존)
            ├─ 환자 정보
            └─ 상태 변경 버튼
```

---

## 작업 분해

### Task 1.1: Tooltip 컴포넌트 생성
**우선순위**: HIGH (ClosureIndicator의 의존성)
**예상 시간**: 20분

#### 체크리스트
- [ ] `/components/ui/tooltip.tsx` 파일 생성
- [ ] Radix UI Tooltip 설치 확인 (이미 설치됨)
- [ ] TooltipProvider, Tooltip, TooltipTrigger, TooltipContent 구현
- [ ] TypeScript 타입 정의
- [ ] Tailwind 스타일링 적용
- [ ] 테스트: hover 및 포커스 동작 확인

#### 구현 패턴
```typescript
// Shadcn/ui 패턴 참조
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipContent = React.forwardRef<...>((props, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    className="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
    {...props}
  />
))
```

#### 검증 기준
- Tooltip이 트리거 요소 위에 정확히 표시됨
- 키보드 접근 가능 (Tab + Enter/Space)
- 모바일에서는 탭으로 표시
- z-index 충돌 없음

---

### Task 1.2: ClosureIndicator 컴포넌트 생성
**우선순위**: HIGH
**예상 시간**: 40분
**의존성**: Task 1.1 (Tooltip)

#### 체크리스트
- [ ] `/components/admin/ClosureIndicator.tsx` 파일 생성
- [ ] ManualClosure 인터페이스 import
- [ ] Props 인터페이스 정의 (closure, onRemove, size)
- [ ] 마감 상태 시각적 표시 (빨간 배경 + XCircle 아이콘)
- [ ] Tooltip으로 상세 정보 표시
- [ ] 빠른 해제 버튼 구현
- [ ] 서비스별 마감 구분 (전체 vs 특정 서비스)
- [ ] 로딩 상태 처리

#### 컴포넌트 구조
```typescript
interface ClosureIndicatorProps {
  closure: ManualClosure;
  onRemove?: (closureId: string) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  showQuickRelease?: boolean;
}

// 기능
1. 마감 사유 표시 (기본: "마감됨")
2. Tooltip에 상세 정보
   - 등록자: {closure.createdBy}
   - 사유: {closure.reason}
   - 대상: {closure.service?.name || "전체 서비스"}
   - 시간: {closure.timeSlotStart}
3. 빠른 해제 버튼 (권한 체크)
4. 낙관적 UI 업데이트
```

#### 상태 관리
```typescript
const [isRemoving, setIsRemoving] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleQuickRelease = async () => {
  if (!confirm("이 시간대 마감을 해제하시겠습니까?")) return;

  setIsRemoving(true);
  setError(null);

  try {
    await onRemove?.(closure.id);
    // 부모 컴포넌트에서 데이터 새로고침
  } catch (err) {
    setError(err.message);
    setIsRemoving(false);
  }
};
```

#### 검증 기준
- 마감된 시간대가 시각적으로 명확히 구분됨
- Tooltip에 모든 정보가 정확히 표시됨
- 해제 버튼 클릭 시 확인 대화상자 표시
- 해제 중 로딩 상태 표시
- 에러 발생 시 적절한 메시지 표시

---

### Task 1.3: ReservationTimeline - 마감 데이터 Fetch 로직 추가
**우선순위**: HIGH
**예상 시간**: 30분
**의존성**: API 엔드포인트 (이미 구현됨)

#### 체크리스트
- [ ] ManualClosure 인터페이스 추가
- [ ] fetchClosures() 함수 구현
- [ ] useEffect에 병렬 fetch 로직 추가
- [ ] 에러 처리 및 로딩 상태 관리
- [ ] 캐시 무효화 후 자동 새로고침 트리거

#### 구현 코드
```typescript
// 1. 인터페이스 추가
interface ManualClosure {
  id: string;
  closureDate: string;
  period: 'MORNING' | 'AFTERNOON';
  timeSlotStart: string;
  timeSlotEnd?: string;
  serviceId?: string;
  reason?: string;
  createdBy: string;
  isActive: boolean;
  service?: {
    id: string;
    code: string;
    name: string;
  };
}

// 2. State 추가
const [closures, setClosures] = useState<ManualClosure[]>([]);

// 3. Fetch 함수
const fetchClosures = useCallback(async () => {
  try {
    const token = localStorage.getItem("accessToken");
    const params = new URLSearchParams({ date });

    if (service && service !== 'ALL') {
      params.append('serviceId', service);
    }

    const response = await fetch(
      `/api/admin/manual-close?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) throw new Error('마감 정보를 불러오지 못했습니다');

    const data = await response.json();
    if (data.success) {
      setClosures(data.closures || []);
    }
  } catch (err) {
    console.error('Error fetching closures:', err);
    // 마감 정보 로드 실패는 치명적이지 않음 (예약은 표시)
    setClosures([]);
  }
}, [date, service]);

// 4. 병렬 Fetch
useEffect(() => {
  Promise.all([
    fetchReservations(),
    fetchClosures()
  ]);
}, [fetchReservations, fetchClosures]);
```

#### 성능 최적화
```typescript
// useCallback으로 함수 메모이제이션
const fetchClosures = useCallback(async () => { ... }, [date, service]);

// 병렬 fetch로 로딩 시간 단축
Promise.all([fetchReservations(), fetchClosures()]);

// 에러 발생 시 예약 표시는 유지 (독립적 실패)
```

#### 검증 기준
- 마감 데이터가 정확히 로드됨
- 예약 데이터와 독립적으로 실패 처리
- 병렬 fetch로 로딩 시간 최소화
- 서비스 필터 변경 시 재로드

---

### Task 1.4: 타임라인에 마감 상태 시각화
**우선순위**: HIGH
**예상 시간**: 50분
**의존성**: Task 1.2 (ClosureIndicator)

#### 체크리스트
- [ ] 전체 시간대 배열 생성 함수 (generateTimeSlots)
- [ ] TimeSlotInfo 인터페이스 정의
- [ ] 예약/마감 데이터를 시간대에 매핑
- [ ] renderTimeSlot() 함수 구현
- [ ] 마감된 시간대에 ClosureIndicator 표시
- [ ] 예약 없고 마감 없는 시간대 표시 방식 결정
- [ ] Period 섹션 헤더에 마감 카운트 추가

#### 핵심 로직
```typescript
// 1. 시간대 생성
const generateTimeSlots = (period: 'MORNING' | 'AFTERNOON' | 'EVENING'): string[] => {
  const slots = {
    MORNING: ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
    AFTERNOON: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'],
    EVENING: ['18:30', '19:00', '19:30']
  };
  return slots[period] || [];
};

// 2. 시간대 정보 구성
interface TimeSlotInfo {
  time: string;
  period: 'MORNING' | 'AFTERNOON' | 'EVENING';
  status: 'available' | 'booked' | 'closed' | 'limited';
  reservations: Reservation[];
  closures: ManualClosure[];
  hasConflict: boolean;
}

const buildTimeSlotInfo = (time: string, period: string): TimeSlotInfo => {
  const slotReservations = reservations.filter(
    r => r.timeSlotStart === time && r.period === period
  );

  const slotClosures = closures.filter(
    c => c.timeSlotStart === time && c.period === period
  );

  let status: TimeSlotInfo['status'] = 'available';
  if (slotClosures.length > 0) status = 'closed';
  else if (slotReservations.length > 0) status = 'booked';

  return {
    time,
    period: period as any,
    status,
    reservations: slotReservations,
    closures: slotClosures,
    hasConflict: slotReservations.length > 0 && slotClosures.length > 0
  };
};

// 3. 렌더링 로직
const renderTimeSlot = (slotInfo: TimeSlotInfo) => {
  if (slotInfo.status === 'closed') {
    return (
      <ClosureIndicator
        key={`closure-${slotInfo.time}`}
        closure={slotInfo.closures[0]}
        onRemove={handleRemoveClosure}
        showQuickRelease={true}
      />
    );
  }

  if (slotInfo.status === 'booked') {
    return slotInfo.reservations.map(reservation => (
      <ReservationCard
        key={reservation.id}
        reservation={reservation}
        onStatusChange={handleStatusChange}
        onView={onReservationClick}
      />
    ));
  }

  // 빈 시간대는 표시하지 않음 (Phase 2에서 추가 예약 버튼 추가 예정)
  return null;
};

// 4. Period 섹션 렌더링
const renderPeriodSection = (period: 'MORNING' | 'AFTERNOON' | 'EVENING') => {
  const timeSlots = generateTimeSlots(period);
  const slotInfos = timeSlots.map(time => buildTimeSlotInfo(time, period));

  // 예약 또는 마감이 있는 시간대만 표시
  const activeSlots = slotInfos.filter(
    info => info.status === 'booked' || info.status === 'closed'
  );

  if (activeSlots.length === 0) return null;

  const closedCount = activeSlots.filter(s => s.status === 'closed').length;

  return (
    <div key={period} className="mb-6">
      <div className="flex items-center gap-3 mb-3 pb-2 border-b">
        <Badge variant="outline">{getPeriodLabel(period)}</Badge>
        <span className="text-sm text-muted-foreground">
          총 {activeSlots.length}건
        </span>
        {closedCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            마감 {closedCount}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {activeSlots.map(slotInfo => renderTimeSlot(slotInfo))}
      </div>
    </div>
  );
};
```

#### UI/UX 고려사항
1. **시각적 구분**
   - 마감: 빨간 배경 (`bg-red-50 border-red-300`)
   - 예약: 파란 배경 (`bg-blue-50 border-blue-200`)
   - 빈 시간: Phase 2에서 추가 예약 버튼으로 표시

2. **정보 밀도**
   - 한 시간대에 예약 + 마감이 동시에 있을 수 있음 (충돌)
   - 충돌 시 경고 표시 필요

3. **반응형**
   - 모바일: 세로 스크롤
   - 데스크톱: 넓은 카드 레이아웃

#### 검증 기준
- 전체 시간대가 올바르게 생성됨
- 마감된 시간대가 정확히 표시됨
- 예약과 마감이 동시에 표시됨
- Period 헤더에 마감 카운트 정확히 표시

---

### Task 1.5: 빠른 해제 버튼 기능 구현
**우선순위**: HIGH
**예상 시간**: 30분
**의존성**: Task 1.2 (ClosureIndicator)

#### 체크리스트
- [ ] handleRemoveClosure() 함수 구현
- [ ] DELETE API 호출 로직
- [ ] 낙관적 UI 업데이트 (즉시 UI에서 제거)
- [ ] 에러 시 롤백 로직
- [ ] 성공 시 토스트 메시지
- [ ] 캐시 무효화 트리거

#### 구현 코드
```typescript
const handleRemoveClosure = async (closureId: string) => {
  if (!confirm("정말로 이 시간대 마감을 해제하시겠습니까?")) {
    return;
  }

  // 낙관적 UI 업데이트
  const previousClosures = closures;
  setClosures(prev => prev.filter(c => c.id !== closureId));

  try {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(
      `/api/admin/manual-close?id=${closureId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      throw new Error('마감 해제에 실패했습니다');
    }

    // 성공 메시지
    setStatusMessage({
      type: 'success',
      message: '마감이 해제되었습니다.'
    });

    // 자동 사라짐
    setTimeout(() => setStatusMessage(null), 3000);

  } catch (err) {
    console.error('Error removing closure:', err);

    // 롤백
    setClosures(previousClosures);

    setStatusMessage({
      type: 'error',
      message: err instanceof Error ? err.message : '마감 해제에 실패했습니다'
    });

    setTimeout(() => setStatusMessage(null), 5000);
  }
};
```

#### 성능 최적화
```typescript
// 낙관적 업데이트로 즉각적인 피드백
// 1. UI에서 즉시 제거
// 2. API 호출
// 3. 실패 시 롤백

// 이점:
// - 사용자 경험 향상 (즉시 반응)
// - 네트워크 지연 숨김
// - 실패 시에만 복구 비용
```

#### 검증 기준
- 해제 버튼 클릭 시 확인 대화상자 표시
- 즉시 UI에서 마감 표시 제거
- 성공 메시지 표시 (3초 후 사라짐)
- 실패 시 원래 상태로 롤백
- 에러 메시지 명확히 표시

---

### Task 1.6: 통합 테스트 및 검증
**우선순위**: HIGH
**예상 시간**: 30분
**의존성**: 모든 이전 Task

#### 체크리스트
- [ ] 마감 등록 → 타임라인 반영 테스트
- [ ] 빠른 해제 → 타임라인 업데이트 테스트
- [ ] 서비스 필터 변경 테스트
- [ ] 날짜 변경 테스트
- [ ] 자동 새로고침 테스트 (30초)
- [ ] 에러 시나리오 테스트
- [ ] 성능 테스트 (렌더링 시간)
- [ ] 접근성 테스트 (키보드 네비게이션)

#### 테스트 시나리오

**시나리오 1: 마감 등록 플로우**
```
1. ManualCloseForm에서 시간대 마감 등록
2. ReservationTimeline에 즉시 반영되는지 확인
3. ClosureIndicator가 올바르게 표시되는지 확인
4. Tooltip에 정보가 정확한지 확인
```

**시나리오 2: 빠른 해제 플로우**
```
1. 타임라인에서 마감된 시간대 찾기
2. 해제 버튼 클릭
3. 확인 대화상자 확인
4. 즉시 UI에서 제거되는지 확인
5. 성공 메시지 표시 확인
```

**시나리오 3: 에러 처리**
```
1. 네트워크 오프라인 상태에서 해제 시도
2. 에러 메시지 표시 확인
3. UI 롤백 확인
4. 사용자가 재시도 가능한지 확인
```

**시나리오 4: 성능 테스트**
```
1. 50개 예약 + 10개 마감이 있는 날짜
2. 타임라인 로딩 시간 < 2초
3. 해제 버튼 클릭 → UI 반응 < 100ms
4. 불필요한 리렌더링 없음 (React DevTools 확인)
```

#### 검증 기준
- 모든 시나리오가 예상대로 동작
- 에러 처리가 적절함
- 성능 목표 달성 (로딩 < 2초)
- 접근성 표준 준수

---

## 기술 스택 및 패턴

### 사용 라이브러리

#### 1. React Hooks
```typescript
// State Management
useState<T>() // 컴포넌트 상태
useEffect() // 사이드 이펙트 (데이터 fetch)
useCallback() // 함수 메모이제이션 (불필요한 리렌더링 방지)
useMemo() // 계산 결과 메모이제이션 (시간대 생성 등)

// 사용 패턴
const fetchClosures = useCallback(async () => {
  // ...
}, [date, service]); // 의존성 배열

const timeSlots = useMemo(() =>
  generateTimeSlots(period),
  [period]
);
```

#### 2. Shadcn/ui 컴포넌트
```typescript
// 이미 설치된 컴포넌트
Badge // 상태 표시 (오전/오후, 마감 카운트)
Button // 액션 버튼
Alert // 성공/에러 메시지
Card // 컨테이너
Dialog // 모달 (Phase 2)

// 새로 설치 필요
Tooltip // 마감 정보 상세 표시

// 설치 명령
npx shadcn-ui@latest add tooltip
```

#### 3. Lucide-react 아이콘
```typescript
import {
  XCircle,      // 마감 아이콘
  AlertCircle,  // 경고 아이콘
  Unlock,       // 해제 버튼 아이콘
  Clock,        // 시간 아이콘
  User,         // 사용자 아이콘
  Calendar      // 날짜 아이콘
} from 'lucide-react';
```

### React 패턴

#### 1. 컴포지션 패턴
```typescript
// 작은 컴포넌트를 조합하여 복잡한 UI 구성
<ReservationTimeline>
  <PeriodSection>
    <TimeSlot>
      <ClosureIndicator /> // 또는
      <ReservationCard />
    </TimeSlot>
  </PeriodSection>
</ReservationTimeline>
```

#### 2. 제어 역전 (Inversion of Control)
```typescript
// 부모가 자식의 동작을 제어
<ClosureIndicator
  closure={closure}
  onRemove={handleRemoveClosure} // 부모가 정의
/>

// 자식은 이벤트만 발생
const ClosureIndicator = ({ onRemove }) => {
  return (
    <Button onClick={() => onRemove?.(closure.id)}>
      해제
    </Button>
  );
};
```

#### 3. 낙관적 UI 업데이트
```typescript
// 1. UI 먼저 업데이트 (즉각적 피드백)
setClosures(prev => prev.filter(c => c.id !== closureId));

// 2. API 호출
await fetch(...)

// 3. 실패 시 롤백
catch (err) {
  setClosures(previousClosures);
}
```

#### 4. 에러 경계 (Error Boundary)
```typescript
// Phase 2에서 추가 고려
// 컴포넌트 에러 시 전체 앱 크래시 방지
<ErrorBoundary fallback={<ErrorMessage />}>
  <ReservationTimeline />
</ErrorBoundary>
```

### TypeScript 패턴

#### 1. 인터페이스 확장
```typescript
// 기존 인터페이스 확장
interface Reservation {
  // 기존 필드들...
}

interface ReservationWithClosureInfo extends Reservation {
  isClosed: boolean;
  closureInfo?: ManualClosure;
}
```

#### 2. Union 타입
```typescript
type TimeSlotStatus = 'available' | 'booked' | 'closed' | 'limited';

type PeriodType = 'MORNING' | 'AFTERNOON' | 'EVENING';
```

#### 3. 옵셔널 체이닝
```typescript
// null/undefined 안전하게 접근
closure.service?.name || "전체 서비스"
onRemove?.(closureId)
```

#### 4. 타입 가드
```typescript
const isClosure = (item: any): item is ManualClosure => {
  return 'closureDate' in item && 'isActive' in item;
};
```

### 성능 최적화 패턴

#### 1. 메모이제이션
```typescript
// 계산 결과 캐싱
const timeSlots = useMemo(() =>
  generateTimeSlots(period),
  [period]
);

// 함수 참조 안정화
const fetchClosures = useCallback(async () => {
  // ...
}, [date, service]);
```

#### 2. 조건부 렌더링
```typescript
// 불필요한 렌더링 방지
{activeSlots.length > 0 && (
  <PeriodSection slots={activeSlots} />
)}

// 빈 배열 체크
if (closures.length === 0) return null;
```

#### 3. 병렬 데이터 로딩
```typescript
// 여러 API 동시 호출
await Promise.all([
  fetchReservations(),
  fetchClosures()
]);
```

#### 4. 디바운싱 (Phase 2)
```typescript
// 빠른 연속 호출 방지
const debouncedFetch = debounce(fetchClosures, 300);
```

### API 통신 패턴

#### 1. 에러 처리 표준화
```typescript
try {
  const response = await fetch(...);

  if (!response.ok) {
    throw new Error('API 호출 실패');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || '알 수 없는 오류');
  }

  return data;
} catch (err) {
  console.error('Error:', err);
  setError(err.message);
}
```

#### 2. Authorization 헤더 추가
```typescript
const token = localStorage.getItem("accessToken");

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

#### 3. 캐시 무효화
```typescript
// 마감 변경 시 예약 가능 시간 캐시 무효화
// API에서 자동 처리됨 (invalidateCache 함수)
```

---

## 리스크 분석

### 기술적 리스크

#### 1. 성능 저하 (중요도: HIGH)
**리스크**: 많은 예약과 마감 데이터로 인한 렌더링 지연

**영향**:
- 타임라인 로딩 시간 > 2초
- 스크롤 lag
- 불필요한 리렌더링

**대응 전략**:
```typescript
// 1. useMemo로 계산 결과 캐싱
const slotInfos = useMemo(() =>
  timeSlots.map(time => buildTimeSlotInfo(time, period)),
  [timeSlots, period, reservations, closures]
);

// 2. useCallback로 함수 안정화
const fetchClosures = useCallback(async () => { ... }, [date, service]);

// 3. 조건부 렌더링으로 DOM 최소화
{activeSlots.length > 0 && <PeriodSection />}

// 4. React.memo로 컴포넌트 메모이제이션 (필요 시)
const ClosureIndicator = React.memo(({ closure, onRemove }) => {
  // ...
});
```

**검증**:
- React DevTools Profiler로 렌더링 시간 측정
- 50개 예약 + 10개 마감 시나리오 테스트
- 목표: 로딩 < 2초, 해제 반응 < 100ms

---

#### 2. 데이터 동기화 문제 (중요도: HIGH)
**리스크**: 예약과 마감 데이터 불일치

**시나리오**:
```
1. 사용자 A가 09:00 마감 해제
2. 동시에 사용자 B가 09:00 예약 등록
3. 타임라인에 충돌 상태 표시 안 됨
```

**대응 전략**:
```typescript
// 1. 자동 새로고침 (30초)
useEffect(() => {
  const interval = setInterval(() => {
    fetchReservations();
    fetchClosures();
  }, 30000);
  return () => clearInterval(interval);
}, [fetchReservations, fetchClosures]);

// 2. 낙관적 업데이트 + 서버 검증
const handleRemoveClosure = async (id) => {
  // 즉시 UI 업데이트
  setClosures(prev => prev.filter(c => c.id !== id));

  try {
    await fetch(...); // 서버 검증
  } catch (err) {
    // 실패 시 롤백
    setClosures(previousClosures);
  }
};

// 3. 마감 후 즉시 새로고침 트리거
if (onUpdate) {
  onUpdate(); // 부모에게 알림
}
```

**검증**:
- 여러 탭에서 동시 작업 테스트
- 네트워크 지연 시뮬레이션
- 충돌 시나리오 테스트

---

#### 3. API 에러 처리 (중요도: MEDIUM)
**리스크**: 네트워크 오류 또는 인증 실패

**대응 전략**:
```typescript
// 독립적 실패 처리
const fetchClosures = async () => {
  try {
    // ...
  } catch (err) {
    console.error('Closures fetch failed:', err);
    // 마감 로드 실패는 치명적이지 않음
    // 예약은 여전히 표시됨
    setClosures([]);
  }
};

// 사용자에게 명확한 피드백
setStatusMessage({
  type: 'error',
  message: '마감 정보를 불러올 수 없습니다. 나중에 다시 시도해주세요.'
});
```

**Fallback 옵션**:
1. 마감 정보 없이 예약만 표시
2. 재시도 버튼 제공
3. 에러 상태를 명확히 표시

---

#### 4. Tooltip 컴포넌트 누락 (중요도: LOW)
**리스크**: Shadcn/ui에 Tooltip이 없을 수 있음

**대응 전략**:
```bash
# 1. Tooltip 설치
npx shadcn-ui@latest add tooltip

# 2. 실패 시 직접 구현
# Radix UI는 이미 설치되어 있음 (package.json 확인됨)
# @radix-ui/react-tooltip 사용
```

**Fallback**:
- Tooltip 없이 클릭 시 모달로 정보 표시
- 또는 항상 정보 표시 (공간 허용 시)

---

### 사용성 리스크

#### 1. 실수로 마감 해제 (중요도: MEDIUM)
**리스크**: 클릭 한 번으로 마감 해제 → 의도치 않은 예약 가능

**대응 전략**:
```typescript
// 확인 대화상자 필수
if (!confirm("정말로 이 시간대 마감을 해제하시겠습니까?")) {
  return;
}

// Phase 2: 취소 기능 추가 (5초 이내)
// "방금 해제한 마감을 복구하시겠습니까?"
```

**검증**:
- 사용자 테스트로 확인
- 확인 메시지 명확성 검증

---

#### 2. 정보 과부하 (중요도: LOW)
**리스크**: 타임라인에 너무 많은 정보 표시

**대응 전략**:
```typescript
// 1. 핵심 정보만 항상 표시
<ClosureIndicator>
  <XCircle /> 마감됨
</ClosureIndicator>

// 2. 상세 정보는 Tooltip
<Tooltip>
  <TooltipContent>
    등록자: {closure.createdBy}
    사유: {closure.reason}
    대상: {closure.service?.name}
  </TooltipContent>
</Tooltip>

// 3. 시각적 계층 구조
// 마감 > 예약 > 빈 시간 (크기, 색상으로 구분)
```

---

## 검증 계획

### 단위 테스트

#### 1. generateTimeSlots() 함수
```typescript
describe('generateTimeSlots', () => {
  test('오전 시간대 생성', () => {
    const slots = generateTimeSlots('MORNING');
    expect(slots).toContain('09:00');
    expect(slots).toContain('11:30');
    expect(slots.length).toBeGreaterThan(5);
  });

  test('오후 시간대 생성', () => {
    const slots = generateTimeSlots('AFTERNOON');
    expect(slots).toContain('14:00');
    expect(slots).toContain('18:00');
  });
});
```

#### 2. buildTimeSlotInfo() 함수
```typescript
describe('buildTimeSlotInfo', () => {
  test('마감된 시간대 상태', () => {
    const info = buildTimeSlotInfo('09:00', 'MORNING', [], [closure]);
    expect(info.status).toBe('closed');
    expect(info.closures.length).toBe(1);
  });

  test('예약된 시간대 상태', () => {
    const info = buildTimeSlotInfo('09:00', 'MORNING', [reservation], []);
    expect(info.status).toBe('booked');
    expect(info.reservations.length).toBe(1);
  });

  test('빈 시간대 상태', () => {
    const info = buildTimeSlotInfo('09:00', 'MORNING', [], []);
    expect(info.status).toBe('available');
  });
});
```

### 통합 테스트

#### 1. 데이터 Fetch 플로우
```typescript
describe('ReservationTimeline - 데이터 로드', () => {
  test('예약과 마감 데이터 병렬 로드', async () => {
    render(<ReservationTimeline date="2025-11-10" />);

    // 로딩 표시 확인
    expect(screen.getByText(/로딩/i)).toBeInTheDocument();

    // 데이터 로드 대기
    await waitFor(() => {
      expect(screen.queryByText(/로딩/i)).not.toBeInTheDocument();
    });

    // 예약과 마감 모두 표시 확인
    expect(screen.getByText(/예약/i)).toBeInTheDocument();
    expect(screen.getByText(/마감/i)).toBeInTheDocument();
  });
});
```

#### 2. 마감 해제 플로우
```typescript
describe('ClosureIndicator - 빠른 해제', () => {
  test('해제 버튼 클릭 플로우', async () => {
    const onRemove = jest.fn();
    render(<ClosureIndicator closure={closure} onRemove={onRemove} />);

    // 해제 버튼 클릭
    const button = screen.getByRole('button', { name: /해제/i });
    fireEvent.click(button);

    // 확인 대화상자 (jsdom에서는 mock 필요)
    window.confirm = jest.fn(() => true);

    // onRemove 호출 확인
    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith(closure.id);
    });
  });
});
```

### E2E 테스트 (Phase 2)

#### 1. 전체 사용자 플로우
```typescript
// Playwright 또는 Cypress
test('마감 등록 및 해제 E2E', async () => {
  // 1. 로그인
  await page.goto('/admin/login');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password');
  await page.click('button[type=submit]');

  // 2. 예약 관리 페이지
  await page.goto('/admin/reservations');

  // 3. 마감 등록
  await page.click('text=시간 마감');
  await page.selectOption('select[name=period]', 'MORNING');
  await page.click('text=09:00');
  await page.click('button:has-text("마감하기")');

  // 4. 타임라인에서 확인
  await expect(page.locator('text=마감됨')).toBeVisible();

  // 5. 빠른 해제
  await page.click('button:has-text("해제")');
  await page.click('button:has-text("확인")');

  // 6. 마감 해제 확인
  await expect(page.locator('text=마감됨')).not.toBeVisible();
});
```

### 성능 테스트

#### 1. 렌더링 성능
```typescript
// React DevTools Profiler 사용
test('타임라인 렌더링 성능', () => {
  const { rerender } = render(
    <Profiler id="timeline" onRender={onRenderCallback}>
      <ReservationTimeline date="2025-11-10" />
    </Profiler>
  );

  // 초기 렌더링 시간 < 2초
  expect(renderTime).toBeLessThan(2000);

  // 재렌더링 시간 < 500ms
  rerender(<ReservationTimeline date="2025-11-10" />);
  expect(rerenderTime).toBeLessThan(500);
});
```

#### 2. 네트워크 성능
```typescript
// API 응답 시간 측정
test('마감 데이터 로드 성능', async () => {
  const startTime = performance.now();

  const response = await fetch('/api/admin/manual-close?date=2025-11-10');
  const data = await response.json();

  const endTime = performance.now();

  // 응답 시간 < 500ms
  expect(endTime - startTime).toBeLessThan(500);
});
```

### 접근성 테스트

#### 1. 키보드 네비게이션
```typescript
test('키보드로 해제 버튼 조작', async () => {
  render(<ClosureIndicator closure={closure} onRemove={onRemove} />);

  // Tab으로 포커스
  const button = screen.getByRole('button', { name: /해제/i });
  button.focus();

  // Enter 또는 Space로 클릭
  fireEvent.keyDown(button, { key: 'Enter' });

  // 확인 대화상자 표시
  expect(window.confirm).toHaveBeenCalled();
});
```

#### 2. 스크린 리더 테스트
```typescript
test('ARIA 라벨 및 역할', () => {
  render(<ClosureIndicator closure={closure} />);

  // 버튼 역할 확인
  expect(screen.getByRole('button')).toBeInTheDocument();

  // aria-label 확인
  expect(screen.getByLabelText(/마감 해제/i)).toBeInTheDocument();

  // Tooltip 접근성
  const trigger = screen.getByRole('button');
  fireEvent.focus(trigger);

  expect(screen.getByRole('tooltip')).toBeInTheDocument();
});
```

---

## 타임라인

### Phase 1 상세 일정

```
Day 1 (3시간)
├─ 09:00 - 09:20 (20분) Task 1.1: Tooltip 컴포넌트 생성
├─ 09:20 - 10:00 (40분) Task 1.2: ClosureIndicator 컴포넌트 생성
├─ 10:00 - 10:30 (30분) Task 1.3: 마감 데이터 Fetch 로직
├─ 10:30 - 11:20 (50분) Task 1.4: 타임라인 시각화
├─ 11:20 - 11:50 (30분) Task 1.5: 빠른 해제 버튼
└─ 11:50 - 12:20 (30분) Task 1.6: 통합 테스트

총 소요 시간: 3시간 20분
버퍼: 40분 (예상치 못한 문제 대응)
```

### 마일스톤

**M1.1: Tooltip 및 ClosureIndicator (1시간)**
- Tooltip 컴포넌트 완성
- ClosureIndicator 기본 UI 완성
- 검증: 마감 정보 표시 가능

**M1.2: 데이터 통합 (1시간 30분)**
- 마감 데이터 fetch 로직 완성
- 타임라인에 마감 상태 시각화 완성
- 검증: 예약과 마감 동시 표시

**M1.3: 인터랙션 및 검증 (1시간)**
- 빠른 해제 기능 완성
- 통합 테스트 완료
- 검증: 모든 플로우 정상 동작

### 체크포인트

**CP 1 (1시간 후)**: ClosureIndicator 컴포넌트 완성
- 마감 표시 UI 확인
- Tooltip 동작 확인
- 다음 단계로 진행 가능 여부 판단

**CP 2 (2시간 후)**: 타임라인 통합 완성
- 전체 데이터 플로우 동작 확인
- 시각적 표시 검증
- 성능 이슈 확인

**CP 3 (3시간 후)**: 기능 완성 및 테스트
- 모든 기능 동작 확인
- 사용성 검증
- Phase 2 준비 완료

---

## 다음 단계 (Phase 2 준비)

Phase 1 완료 후 다음 작업 준비:

1. **SlotContextMenu 컴포넌트** (우클릭 메뉴)
2. **QuickCloseDialog 컴포넌트** (빠른 마감 모달)
3. **우클릭 이벤트 처리**
4. **충돌 확인 API**

Phase 2 목표: **긴급 마감 10초 이내 완료**

---

## 부록

### 코드 스니펫 모음

#### 1. 전체 시간대 생성
```typescript
const TIME_SLOTS = {
  MORNING: ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
  AFTERNOON: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'],
  EVENING: ['18:30', '19:00', '19:30']
} as const;

const generateTimeSlots = (period: keyof typeof TIME_SLOTS): string[] => {
  return TIME_SLOTS[period];
};
```

#### 2. 낙관적 UI 업데이트 헬퍼
```typescript
const withOptimisticUpdate = async <T,>(
  optimisticUpdate: () => void,
  apiCall: () => Promise<T>,
  rollback: () => void
): Promise<T> => {
  optimisticUpdate();

  try {
    return await apiCall();
  } catch (err) {
    rollback();
    throw err;
  }
};

// 사용
await withOptimisticUpdate(
  () => setClosures(prev => prev.filter(c => c.id !== id)),
  () => deleteClosureAPI(id),
  () => setClosures(previousClosures)
);
```

#### 3. 병렬 Fetch 헬퍼
```typescript
const useCombinedData = (date: string, service?: string) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [closures, setClosures] = useState<ManualClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [reservationsRes, closuresRes] = await Promise.all([
          fetchReservations(date, service),
          fetchClosures(date, service)
        ]);

        setReservations(reservationsRes);
        setClosures(closuresRes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date, service]);

  return { reservations, closures, loading, error };
};
```

---

## 참고 자료

### 내부 문서
- [설계 문서](/Users/blee/Desktop/cms/misopin-cms/claudedocs/manual-closure-feature-design.md)
- [API 문서](/Users/blee/Desktop/cms/misopin-cms/app/api/admin/manual-close/route.ts)
- [ReservationTimeline 컴포넌트](/Users/blee/Desktop/cms/misopin-cms/components/admin/ReservationTimeline.tsx)
- [ManualCloseForm 컴포넌트](/Users/blee/Desktop/cms/misopin-cms/components/admin/ManualCloseForm.tsx)

### 외부 문서
- [React Hooks Documentation](https://react.dev/reference/react)
- [Shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Radix UI Tooltip](https://www.radix-ui.com/docs/primitives/components/tooltip)
- [Lucide React Icons](https://lucide.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**문서 버전**: 1.0
**마지막 업데이트**: 2025-11-06
**작성자**: Claude (Sonnet 4.5)
**검토 상태**: 준비 완료 ✅
