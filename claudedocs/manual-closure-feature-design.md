# 수동 시간 마감 기능 - 상세 설계 문서

**작성일**: 2025-11-06
**버전**: 1.0
**프로젝트**: Misopin CMS - 예약 관리 시스템

---

## 📋 목차

1. [현황 분석](#현황-분석)
2. [개선 목표](#개선-목표)
3. [UI/UX 설계](#uiux-설계)
4. [컴포넌트 구조](#컴포넌트-구조)
5. [API 명세](#api-명세)
6. [데이터 플로우](#데이터-플로우)
7. [구현 계획](#구현-계획)

---

## 현황 분석

### 기존 구현 상태

#### ✅ **구현된 기능**

1. **ManualCloseForm 컴포넌트** (`components/admin/ManualCloseForm.tsx`)
   - 기본 마감 등록/해제 기능 완성
   - 시간대별 선택 UI
   - 서비스별 필터링
   - 마감 목록 조회

2. **Manual Close API** (`app/api/admin/manual-close/route.ts`)
   - POST: 마감 등록 (복수 시간대 지원)
   - GET: 마감 목록 조회
   - DELETE: 마감 해제 (ID 또는 조건)
   - 캐시 무효화 로직 포함

3. **ReservationTimeline 컴포넌트** (`components/admin/ReservationTimeline.tsx`)
   - 시간대별 예약 타임라인 표시
   - 실시간 자동 새로고침 (30초)
   - 시간대별(오전/오후/저녁) 그룹화

4. **데이터베이스 스키마** (`prisma/schema.prisma`)
   - `manual_time_closures` 테이블
   - 제약조건: unique(closureDate, period, timeSlotStart, serviceId)
   - 인덱스: date+active, date+period+active, serviceId

#### ❌ **부족한 부분**

1. **접근성 문제**
   - ManualCloseForm이 별도 페이지/모달 없이 독립 컴포넌트로만 존재
   - `/admin/reservations` 페이지에 통합되지 않음
   - 빠른 마감 기능 없음 (클릭 10회 이상 필요)

2. **사용성 문제**
   - 타임라인에서 직접 마감 불가
   - 현재 마감 상태가 타임라인에 표시 안 됨
   - 날짜 변경 시 마감 폼이 초기화되지 않음

3. **UI/UX 문제**
   - 긴급 상황 대응 불가 (우클릭 메뉴 없음)
   - 마감된 시간대 시각적 구분 부족
   - 예약과 마감 정보 분리되어 있어 한눈에 파악 어려움

---

## 개선 목표

### 핵심 목표

**"긴급 마감 10초, 계획 마감 20초, 해제 5초"**

### 사용자 시나리오 최적화

#### 시나리오 1: 긴급 마감 (최우선)
```
상황: "원장님이 지금 당장 오후 3시에 급한 일이 생겼어요"
목표: 10초 이내 마감 완료

플로우:
1. 타임라인에서 15:00 시간대 우클릭 (2초)
2. [이 시간 마감하기] 클릭 (1초)
3. 간단한 사유 입력 (선택, 5초)
4. [마감] 버튼 클릭 (1초)
5. 즉시 UI 반영 (1초)

총 소요시간: ~10초
```

#### 시나리오 2: 계획 마감
```
상황: "다음주 화요일 오전 전체 직원 교육이 있어요"
목표: 20초 이내 마감 완료

플로우:
1. [시간 마감] 탭 클릭 (1초)
2. 달력에서 날짜 선택 (3초)
3. [오전 전체] 체크박스 (2초)
4. 사유 입력 (10초)
5. [마감 등록] 버튼 (1초)
6. 확인 (3초)

총 소요시간: ~20초
```

#### 시나리오 3: 마감 해제
```
상황: "급한 일 해결됐어요, 3시 다시 열어주세요"
목표: 5초 이내 해제 완료

플로우:
1. 타임라인에서 마감 표시 확인 (1초)
2. [해제] 버튼 클릭 (1초)
3. 확인 대화상자 (2초)
4. 즉시 UI 반영 (1초)

총 소요시간: ~5초
```

---

## UI/UX 설계

### 화면 레이아웃

#### 메인 화면 개선 (`/admin/reservations`)

```
┌──────────────────────────────────────────────────────────────┐
│  📋 예약 관리                                     2025-11-10 │
├──────────────────────────────────────────────────────────────┤
│  ┌─ 탭 네비게이션 ────────────────────────────────────┐    │
│  │ [예약 현황] [시간 마감] [통계] (미래 확장)         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ 필터 영역 ──────────────────────────────────────┐       │
│  │ [📅 날짜: 2025-11-10▼] [🏥 서비스: 전체▼] [🔄]  │       │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ 타임라인 뷰 (개선) ──────────────────────────────┐      │
│  │                                                      │      │
│  │  🌅 오전 (8건)  [대기 3] [확정 5]                  │      │
│  │  ────────────────────────────────────────────────   │      │
│  │  08:30 ░░ 김철수 - 주름 보톡스       [상세] [✓]   │      │
│  │  09:00 ░░ 이영희 - 볼륨 필러        [상세] [✓]   │      │
│  │  09:30 -- (예약 가능)                 [➕ 예약추가] │      │
│  │  10:00 ⛔ 마감됨: 원장님 미팅         [🔓 해제]    │      │
│  │        ↑ 우클릭 메뉴: [🚫 마감] [➕ 예약]          │      │
│  │  10:30 -- (예약 가능)                 [➕ 예약추가] │      │
│  │  11:00 ░░ 박민수 - 리프팅 시술       [상세] [✓]   │      │
│  │                                                      │      │
│  │  🌞 오후 (12건)  [대기 2] [확정 10]                │      │
│  │  ────────────────────────────────────────────────   │      │
│  │  13:00 ░░ 홍길동 - 피부 레이저       [상세] [✓]   │      │
│  │  ...                                                │      │
│  │                                                      │      │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ 빠른 작업 패널 (하단 고정) ─────────────────────┐       │
│  │ [➕ 예약 추가] [🚫 시간 마감] [📊 통계 보기]      │       │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 우클릭 컨텍스트 메뉴 (긴급 마감용)

```
┌──────────────────────────────┐
│  10:00 시간대               │
├──────────────────────────────┤
│  🚫 이 시간 마감하기         │
│  ➕ 예약 추가하기            │
│  📋 시간대 상세 보기         │
│  ────────────────────        │
│  ❌ 닫기                     │
└──────────────────────────────┘
```

### 빠른 마감 모달 (우클릭 → 마감)

```
┌────────────────────────────────────────┐
│  🚫 시간 마감                           │
├────────────────────────────────────────┤
│                                         │
│  📅 날짜: 2025-11-10 (오늘)            │
│  ⏰ 시간: 10:00 - 10:30                │
│  🏥 서비스: 전체                        │
│                                         │
│  ⚠️ 현재 예약 없음 (즉시 마감 가능)    │
│                                         │
│  📝 사유 (선택):                        │
│  ┌──────────────────────────────┐     │
│  │ 원장님 미팅                   │     │
│  └──────────────────────────────┘     │
│                                         │
│  💡 빠른 선택:                          │
│  [원장 일정] [기기 점검] [직접 입력]   │
│                                         │
│  [취소]              [⚡ 즉시 마감]    │
│                                         │
└────────────────────────────────────────┘
```

### 일괄 마감 모달 (계획적 마감용)

```
┌───────────────────────────────────────────────┐
│  📅 일괄 시간 마감                             │
├───────────────────────────────────────────────┤
│                                                 │
│  📅 날짜 선택:                                  │
│  ┌──────────────────────────────┐             │
│  │   2025년 11월                 │             │
│  │  월  화  수  목  금  토  일   │             │
│  │       10  11  12  13  14      │             │
│  │   ●   ○   ✓   ○   ○          │             │
│  └──────────────────────────────┘             │
│  ✓ 선택: 11/10, 11/12 (2일)                    │
│                                                 │
│  ⏰ 시간 범위:                                  │
│  ○ 전체 (하루 종일)                            │
│  ● 오전만 (08:30-12:30)                       │
│  ○ 오후만 (13:00-19:30)                       │
│  ○ 직접 입력: [09:00] ~ [11:00]              │
│                                                 │
│  🏥 대상 서비스:                               │
│  [전체 서비스              ▼]                  │
│                                                 │
│  📝 사유:                                       │
│  ┌──────────────────────────────┐             │
│  │ 직원 전체 교육                │             │
│  └──────────────────────────────┘             │
│                                                 │
│  ⚠️ 기존 예약 확인:                            │
│  • 11/10 오전: 예약 2건 있음                   │
│    → 예약 유지, 신규 예약만 차단               │
│  • 11/12 오전: 예약 없음                       │
│    → 즉시 마감 가능                            │
│                                                 │
│  [ 취소 ]                  [ 📋 마감 등록 ]    │
│                                                 │
└───────────────────────────────────────────────┘
```

### 타임라인 마감 표시 개선

```typescript
// 마감된 시간대 시각적 표현
interface TimeSlotStatus {
  type: 'available' | 'booked' | 'closed' | 'limited';
  display: {
    background: string;
    border: string;
    icon: ReactNode;
    text: string;
  };
}

const statusStyles = {
  available: {
    background: 'bg-white hover:bg-gray-50',
    border: 'border-gray-200',
    icon: <Clock className="text-gray-400" />,
    text: '예약 가능'
  },
  booked: {
    background: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <User className="text-blue-600" />,
    text: '예약됨'
  },
  closed: {
    background: 'bg-red-50',
    border: 'border-red-300',
    icon: <XCircle className="text-red-600" />,
    text: '마감됨'
  },
  limited: {
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: <AlertCircle className="text-yellow-600" />,
    text: '제한적'
  }
};
```

---

## 컴포넌트 구조

### 기존 컴포넌트 개선

#### 1. **ManualCloseForm.tsx** (기존 유지 + 개선)

```typescript
interface ManualCloseFormProps {
  date: string;                    // YYYY-MM-DD
  serviceCode?: string;             // 서비스 필터
  mode?: 'quick' | 'bulk';         // NEW: 빠른 모달 vs 일괄 등록
  preselectedSlot?: {               // NEW: 우클릭에서 전달
    period: 'MORNING' | 'AFTERNOON';
    timeSlot: string;
  };
  onUpdate?: () => void;
  onClose?: () => void;             // NEW: 모달 닫기
  className?: string;
}
```

**개선사항**:
- `mode` prop 추가: 빠른 마감 vs 일괄 마감 UI 변경
- `preselectedSlot` prop: 우클릭한 시간대 자동 선택
- 빠른 사유 선택 버튼 추가 (원장 일정, 기기 점검 등)
- 충돌 예약 확인 및 경고 표시 강화

#### 2. **ReservationTimeline.tsx** (기존 + 마감 표시)

```typescript
interface ReservationTimelineProps {
  date: string;
  service?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showClosures?: boolean;            // NEW: 마감 표시 여부
  onReservationClick?: (reservation: Reservation) => void;
  onSlotContextMenu?: (slot: TimeSlotInfo) => void;  // NEW: 우클릭
}

interface TimeSlotInfo {
  date: string;
  time: string;
  period: 'MORNING' | 'AFTERNOON' | 'EVENING';
  status: 'available' | 'booked' | 'closed';
  reservations: Reservation[];
  closures: ManualClosure[];
}
```

**개선사항**:
- 마감된 시간대 시각적 표시 (빨간 배경 + 아이콘)
- 우클릭 컨텍스트 메뉴 지원
- 마감 사유 툴팁 표시
- 빠른 해제 버튼 추가

### 새로운 컴포넌트

#### 3. **SlotContextMenu.tsx** (NEW)

```typescript
/**
 * 타임라인 우클릭 메뉴
 */
interface SlotContextMenuProps {
  slot: TimeSlotInfo;
  position: { x: number; y: number };
  onClose: () => void;
  onCloseSlot: () => void;
  onAddReservation: () => void;
  onViewDetails: () => void;
}
```

**기능**:
- 마감하기, 예약 추가, 상세 보기 옵션
- 이미 마감된 경우 "해제" 옵션 표시
- 키보드 ESC로 닫기

#### 4. **QuickCloseDialog.tsx** (NEW)

```typescript
/**
 * 빠른 마감 다이얼로그 (긴급 상황용)
 */
interface QuickCloseDialogProps {
  open: boolean;
  slot: TimeSlotInfo;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}
```

**기능**:
- 간소화된 UI (날짜/시간 확인만)
- 빠른 사유 선택 버튼
- Enter 키로 즉시 실행
- 예약 충돌 실시간 확인

#### 5. **BulkCloseDialog.tsx** (NEW)

```typescript
/**
 * 일괄 마감 다이얼로그 (계획 마감용)
 */
interface BulkCloseDialogProps {
  open: boolean;
  initialDate?: string;
  onClose: () => void;
  onConfirm: (config: BulkCloseConfig) => Promise<void>;
}

interface BulkCloseConfig {
  dates: string[];                   // 선택한 날짜들
  timeRange: TimeRangeConfig;
  serviceId?: string;
  reason: string;
}

interface TimeRangeConfig {
  type: 'all' | 'morning' | 'afternoon' | 'custom';
  customStart?: string;              // HH:mm
  customEnd?: string;                // HH:mm
}
```

**기능**:
- 달력에서 복수 날짜 선택
- 시간 범위 옵션 (전체/오전/오후/직접 입력)
- 서비스 필터
- 충돌 예약 확인 및 처리 옵션

#### 6. **ClosureIndicator.tsx** (NEW)

```typescript
/**
 * 타임라인의 마감 표시 컴포넌트
 */
interface ClosureIndicatorProps {
  closure: ManualClosure;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}
```

**기능**:
- 마감 사유 표시
- 등록자 정보 툴팁
- 빠른 해제 버튼
- 마감 유형 구분 (전체 서비스 vs 특정 서비스)

---

## API 명세

### 기존 API 개선

#### POST `/api/admin/manual-close`

**Request Body 개선**:
```typescript
interface CreateClosureRequest {
  closureDate: string;               // YYYY-MM-DD
  period: 'MORNING' | 'AFTERNOON';
  timeSlots: string[];               // ["09:00", "09:30"]
  serviceId?: string | null;
  reason?: string;

  // NEW: 옵션
  checkConflicts?: boolean;          // 기본 true
  overrideExisting?: boolean;        // 기본 false
}
```

**Response 개선**:
```typescript
interface CreateClosureResponse {
  success: boolean;
  count: number;
  message: string;

  // NEW: 충돌 정보
  conflicts?: {
    timeSlot: string;
    reservations: Array<{
      id: string;
      patientName: string;
      serviceName: string;
    }>;
  }[];

  // NEW: 생성된 마감 ID들
  closureIds?: string[];
}
```

**에러 응답 개선**:
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: 'CONFLICT' | 'INVALID_INPUT' | 'UNAUTHORIZED' | 'INTERNAL_ERROR';
  details?: Record<string, any>;
  suggestions?: string[];            // NEW: 사용자 액션 제안
}
```

### 새로운 API 엔드포인트

#### GET `/api/admin/manual-close/check-conflicts`

```typescript
/**
 * 마감 전 충돌 확인 (dry-run)
 */
interface CheckConflictsRequest {
  closureDate: string;
  period: 'MORNING' | 'AFTERNOON';
  timeSlots: string[];
  serviceId?: string;
}

interface CheckConflictsResponse {
  success: boolean;
  conflicts: Array<{
    timeSlot: string;
    hasConflict: boolean;
    reservations: Reservation[];
  }>;
  canProceed: boolean;
  warnings: string[];
}
```

#### POST `/api/admin/manual-close/bulk`

```typescript
/**
 * 일괄 마감 등록 (여러 날짜)
 */
interface BulkClosureRequest {
  dates: string[];                   // ["2025-11-10", "2025-11-12"]
  timeRange: TimeRangeConfig;
  serviceId?: string;
  reason: string;
  checkConflicts?: boolean;
}

interface BulkClosureResponse {
  success: boolean;
  summary: {
    totalDates: number;
    successfulDates: number;
    failedDates: number;
    totalSlotsAffected: number;
  };
  details: Array<{
    date: string;
    success: boolean;
    slotsCreated: number;
    conflicts?: ConflictInfo[];
    error?: string;
  }>;
}
```

---

## 데이터 플로우

### 긴급 마감 플로우

```
[사용자] 타임라인 우클릭
    ↓
[SlotContextMenu] "마감하기" 클릭
    ↓
[QuickCloseDialog] 모달 열기
    ↓
    ├─ [GET /api/admin/manual-close/check-conflicts]
    │   → 예약 충돌 확인
    │   → 경고 표시
    ↓
[사용자] 확인 버튼 클릭
    ↓
[POST /api/admin/manual-close]
    ├─ 마감 등록
    ├─ 캐시 무효화 (invalidateCache)
    └─ 응답 반환
    ↓
[QuickCloseDialog] 성공 메시지
    ↓
[ReservationTimeline] 자동 새로고침
    ↓
[UI 업데이트] 마감 표시 반영 (1초 이내)
```

### 계획 마감 플로우

```
[사용자] "시간 마감" 버튼 클릭
    ↓
[BulkCloseDialog] 모달 열기
    ↓
[사용자] 날짜/시간/서비스 선택
    ↓
[실시간 검증]
    ├─ 날짜 유효성
    ├─ 시간 범위 유효성
    └─ 충돌 확인 (debounced)
    ↓
[사용자] "마감 등록" 클릭
    ↓
[POST /api/admin/manual-close/bulk]
    ├─ 여러 날짜 처리
    ├─ 트랜잭션 처리
    └─ 캐시 무효화
    ↓
[BulkCloseDialog] 결과 요약 표시
    ↓
[페이지 새로고침] 전체 UI 업데이트
```

### 마감 해제 플로우

```
[사용자] 마감 표시에서 "해제" 클릭
    ↓
[확인 대화상자] "정말 해제하시겠습니까?"
    ↓
[DELETE /api/admin/manual-close?id={closureId}]
    ├─ isActive = false 업데이트
    ├─ 캐시 무효화
    └─ 응답 반환
    ↓
[즉시 UI 업데이트]
    ├─ 마감 표시 제거
    └─ "예약 가능" 상태로 전환
```

---

## 구현 계획

### Phase 1: 기반 구조 개선 (2-3시간)

**목표**: 타임라인에 마감 정보 통합 표시

1. **ReservationTimeline 컴포넌트 개선**
   - [ ] 마감 정보 fetch 로직 추가
   - [ ] TimeSlotInfo 인터페이스 확장
   - [ ] 마감된 시간대 시각적 표시
   - [ ] 마감 사유 툴팁 추가

2. **ClosureIndicator 컴포넌트 생성**
   - [ ] 마감 표시 UI 컴포넌트
   - [ ] 빠른 해제 버튼
   - [ ] 등록자 정보 표시

3. **API 개선**
   - [ ] GET 엔드포인트에 날짜 범위 지원 추가
   - [ ] Response에 서비스 정보 포함

**검증**:
- ✓ 타임라인에 마감된 시간대 표시
- ✓ 마감 사유 확인 가능
- ✓ 해제 버튼 동작 확인

### Phase 2: 빠른 마감 기능 (3-4시간)

**목표**: 우클릭으로 10초 이내 마감 완료

1. **SlotContextMenu 컴포넌트 생성**
   - [ ] 우클릭 위치 계산
   - [ ] 메뉴 아이템 구현
   - [ ] 키보드 ESC 처리

2. **QuickCloseDialog 컴포넌트 생성**
   - [ ] 간소화된 마감 폼
   - [ ] 빠른 사유 선택 버튼
   - [ ] Enter 키 즉시 실행

3. **충돌 확인 API 구현**
   - [ ] `/api/admin/manual-close/check-conflicts` 엔드포인트
   - [ ] 실시간 예약 확인
   - [ ] 경고 메시지 생성

4. **ReservationTimeline 통합**
   - [ ] onContextMenu 이벤트 핸들러
   - [ ] 컨텍스트 메뉴 상태 관리
   - [ ] 마감 후 자동 새로고침

**검증**:
- ✓ 우클릭 메뉴 동작
- ✓ 10초 이내 마감 가능
- ✓ 예약 충돌 확인
- ✓ 즉시 UI 반영

### Phase 3: 일괄 마감 기능 (4-5시간)

**목표**: 계획적 마감을 20초 이내 완료

1. **BulkCloseDialog 컴포넌트 생성**
   - [ ] 달력 날짜 선택 UI
   - [ ] 시간 범위 선택 옵션
   - [ ] 서비스 필터
   - [ ] 사유 입력

2. **일괄 마감 API 구현**
   - [ ] `/api/admin/manual-close/bulk` 엔드포인트
   - [ ] 트랜잭션 처리
   - [ ] 여러 날짜 병렬 처리
   - [ ] 상세 결과 반환

3. **충돌 처리 로직**
   - [ ] 날짜별 충돌 확인
   - [ ] 경고 및 진행 옵션 제공
   - [ ] 부분 성공 처리

4. **예약 관리 페이지 통합**
   - [ ] "시간 마감" 버튼 추가
   - [ ] 모달 상태 관리
   - [ ] 결과 피드백 표시

**검증**:
- ✓ 여러 날짜 선택 가능
- ✓ 시간 범위 옵션 동작
- ✓ 충돌 정보 표시
- ✓ 20초 이내 완료 가능

### Phase 4: 사용성 개선 (2-3시간)

**목표**: 전체 UX 통합 및 최적화

1. **ManualCloseForm 개선**
   - [ ] mode prop 구현 (quick/bulk)
   - [ ] preselectedSlot 지원
   - [ ] 빠른 사유 선택
   - [ ] 시각적 피드백 강화

2. **성능 최적화**
   - [ ] 마감 정보 캐싱
   - [ ] 낙관적 UI 업데이트
   - [ ] debounce 충돌 확인
   - [ ] 불필요한 re-render 방지

3. **접근성 개선**
   - [ ] 키보드 네비게이션
   - [ ] 스크린 리더 지원
   - [ ] ARIA 라벨
   - [ ] 포커스 관리

4. **모바일 반응형**
   - [ ] 터치 이벤트 지원
   - [ ] 작은 화면 레이아웃
   - [ ] 스와이프 제스처 (선택)

**검증**:
- ✓ 키보드만으로 조작 가능
- ✓ 모바일에서 정상 동작
- ✓ 1초 이내 UI 반응
- ✓ 스크린 리더 테스트

### Phase 5: 테스트 및 배포 (2-3시간)

1. **단위 테스트**
   - [ ] API 엔드포인트 테스트
   - [ ] 컴포넌트 테스트
   - [ ] 유틸 함수 테스트

2. **통합 테스트**
   - [ ] E2E 시나리오 테스트
   - [ ] 충돌 시나리오 테스트
   - [ ] 동시성 테스트

3. **사용자 테스트**
   - [ ] 실제 사용자 테스트
   - [ ] 피드백 수집
   - [ ] 개선사항 반영

4. **배포**
   - [ ] 스테이징 배포
   - [ ] 프로덕션 배포
   - [ ] 모니터링 설정

**검증**:
- ✓ 모든 시나리오 테스트 통과
- ✓ 성능 목표 달성 (10초/20초/5초)
- ✓ 에러 없이 안정적 동작

---

## 예상 일정

| Phase | 작업 내용 | 예상 시간 | 누적 시간 |
|-------|----------|----------|----------|
| 1 | 기반 구조 개선 | 2-3시간 | 2-3시간 |
| 2 | 빠른 마감 기능 | 3-4시간 | 5-7시간 |
| 3 | 일괄 마감 기능 | 4-5시간 | 9-12시간 |
| 4 | 사용성 개선 | 2-3시간 | 11-15시간 |
| 5 | 테스트 및 배포 | 2-3시간 | 13-18시간 |

**총 예상 시간**: 13-18시간 (약 2-3일)

---

## 성공 지표

### 정량적 지표

- **긴급 마감 시간**: ≤ 10초
- **계획 마감 시간**: ≤ 20초
- **마감 해제 시간**: ≤ 5초
- **UI 반응 시간**: ≤ 1초
- **API 응답 시간**: ≤ 500ms
- **에러율**: < 1%

### 정성적 지표

- 사용자가 직관적으로 사용 가능
- 긴급 상황에 신속하게 대응
- 예약 충돌 방지
- 명확한 시각적 피드백
- 모바일에서도 편리한 사용

---

## 리스크 및 대응

### 기술적 리스크

1. **동시성 문제**
   - 리스크: 여러 사용자가 동시에 같은 시간대 마감
   - 대응: DB unique 제약조건 + 낙관적 잠금

2. **캐시 무효화**
   - 리스크: 마감 후 예약 가능 시간 캐시 미반영
   - 대응: 즉시 캐시 무효화 + 짧은 TTL

3. **성능 저하**
   - 리스크: 대량 일괄 마감 시 응답 지연
   - 대응: 비동기 처리 + 진행률 표시

### 사용성 리스크

1. **실수로 마감**
   - 리스크: 우클릭으로 의도치 않은 마감
   - 대응: 확인 대화상자 + 5초 이내 취소 기능

2. **예약 충돌**
   - 리스크: 기존 예약 있는 시간대 마감
   - 대응: 명확한 경고 + 진행 옵션 제공

3. **모바일 사용성**
   - 리스크: 작은 화면에서 조작 어려움
   - 대응: 큰 터치 영역 + 간소화된 UI

---

## 다음 단계

이 설계 문서를 기반으로 단계별 구현을 진행합니다.

**첫 번째 작업**: Phase 1 - 기반 구조 개선
- ReservationTimeline에 마감 정보 통합
- ClosureIndicator 컴포넌트 생성
- API 개선

구현 준비가 완료되었습니다! 👍
