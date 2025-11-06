# 예약 관리 시스템 전체 분석

**생성일**: 2025-11-06
**분석 대상**: 미소핀의원 CMS 예약 관리 시스템
**목적**: 신규 타임라인 뷰 및 시술 관리 개선 구현을 위한 현황 분석

---

## 📑 목차

1. [시스템 개요](#1-시스템-개요)
2. [현재 시스템 구조](#2-현재-시스템-구조)
3. [각 화면별 상세 분석](#3-각-화면별-상세-분석)
4. [API 및 데이터 플로우](#4-api-및-데이터-플로우)
5. [재사용 가능 코드](#5-재사용-가능-코드)
6. [신규 구현 필요 사항](#6-신규-구현-필요-사항)
7. [영향도 분석](#7-영향도-분석)
8. [데이터베이스 분석](#8-데이터베이스-분석)
9. [구현 권장사항](#9-구현-권장사항)

---

## 1. 시스템 개요

### 1.1 현재 시스템 (Admin)

**주요 화면**:
- 리스트 뷰 (`/admin/reservations/page.tsx`)
  - 통계 카드: 전체, 대기중, 확정, 완료, 취소/미방문
  - 필터: 날짜, 검색(환자명/전화번호), 진료분류, 상태
  - 테이블: 예약일시, 환자정보, 진료정보, 상태, 작업버튼

- 한도 관리 화면 (`/admin/reservations/daily-limits/page.tsx`)
  - 시술별 일일 인원 한도 설정 (현재)
  - 활성화/비활성화 토글

**모달 컴포넌트**:
- 예약 수정 모달 (시간대 선택 포함)
- 상세 정보 모달

### 1.2 공개 예약 페이지

**파일**: `/public/static-pages/calendar-page.html`

**특징**:
- 정적 HTML 페이지
- 달력 기반 날짜 선택
- JavaScript 기반 예약 폼
- API 연동:
  - `/api/public/reservations` (POST)
  - `/api/public/reservations/time-slots` (GET)
  - `/api/public/services` (GET)

**주요 기능**:
- 월별 달력 표시
- 예약 가능 날짜 표시
- 시간대 동적 로딩 (TimeSlotLoader 클래스)
- 예약 제출

---

## 2. 현재 시스템 구조

### 2.1 디렉토리 구조

```
misopin-cms/
├── app/
│   ├── admin/
│   │   └── reservations/
│   │       ├── page.tsx                    # 리스트 뷰 (메인)
│   │       └── daily-limits/
│   │           └── page.tsx                # 한도 관리 (변경 예정)
│   └── api/
│       ├── reservations/
│       │   └── route.ts                    # Admin 예약 CRUD
│       ├── admin/
│       │   └── daily-limits/
│       │       └── route.ts                # 한도 관리 API
│       └── public/
│           ├── reservations/
│           │   ├── route.ts                # 공개 예약 제출
│           │   ├── time-slots/
│           │   │   └── route.ts            # 시간대 조회
│           │   └── availability/
│           │       └── route.ts            # 예약 가능 여부
│           └── services/
│               └── route.ts                # 시술 정보 조회
│
├── components/
│   └── admin/
│       ├── TimeSlotGrid.tsx                # 시간대 그리드 (재사용)
│       ├── ServiceSelector.tsx             # 시술 선택기 (재사용)
│       └── CapacityIndicator.tsx           # 용량 표시기 (재사용)
│
├── lib/
│   └── reservations/
│       ├── time-slot-calculator.ts         # 시간대 계산 로직 (핵심)
│       ├── types.ts                        # 타입 정의
│       └── daily-limit-counter.ts          # 한도 카운터
│
├── public/
│   └── static-pages/
│       └── calendar-page.html              # 공개 예약 페이지
│
└── prisma/
    └── schema.prisma                       # 데이터베이스 스키마
```

### 2.2 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Reservations Page                   │
│  /admin/reservations/page.tsx                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ 통계 카드 (5개) │  │   필터 영역    │  │  예약 테이블  │ │
│  │ - 전체          │  │ - 날짜         │  │  - 시간       │ │
│  │ - 대기중        │  │ - 검색         │  │  - 환자정보   │ │
│  │ - 확정          │  │ - 진료분류     │  │  - 진료정보   │ │
│  │ - 완료          │  │ - 상태         │  │  - 상태       │ │
│  │ - 취소/미방문   │  │                │  │  - 작업버튼   │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            예약 수정 모달 (Dialog)                      │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  환자 정보                                              │ │
│  │  - 이름, 전화번호, 이메일                               │ │
│  │  - 생년월일, 성별                                       │ │
│  │                                                          │ │
│  │  예약 정보                                              │ │
│  │  - 예약일                                               │ │
│  │  - <ServiceSelector />      (재사용 가능)              │ │
│  │  - <TimeSlotGrid />         (재사용 가능)              │ │
│  │  - 진료 목적, 메모                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               TimeSlotGrid Component (재사용)                │
│  /components/admin/TimeSlotGrid.tsx                         │
├─────────────────────────────────────────────────────────────┤
│  API: GET /api/reservations?date=X&service=Y (OPTIONS)      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  오전 (MORNING)                   6/6 가능          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  [08:30] [09:00] [09:30] [10:00] [10:30] [11:00]   │   │
│  │   100%    86%    100%    100%     50%    마감      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  오후 (AFTERNOON)                12/12 가능         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  [13:00] [13:30] ... [18:30]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  색상 코드:                                                  │
│  - 녹색 (>60%): 여유                                        │
│  - 노란색 (20-60%): 제한적                                  │
│  - 빨간색 (<20%): 마감                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 각 화면별 상세 분석

### 3.1 리스트 뷰 (`/admin/reservations/page.tsx`)

**상태 관리**:
```typescript
const [reservations, setReservations] = useState<Reservation[]>([]);
const [loading, setLoading] = useState(true);
const [selectedDate, setSelectedDate] = useState("");
const [filterStatus, setFilterStatus] = useState<string>("all");
const [filterDepartment, setFilterDepartment] = useState<string>("all");
const [searchTerm, setSearchTerm] = useState("");
const [stats, setStats] = useState({
  total: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0
});
```

**주요 기능**:

1. **데이터 로딩**:
```typescript
const fetchReservations = useCallback(async () => {
  const params = new URLSearchParams();
  params.append("date", selectedDate);
  if (filterStatus !== "all") params.append("status", filterStatus);
  if (filterDepartment !== "all") params.append("department", filterDepartment);
  if (searchTerm) params.append("search", searchTerm);

  const response = await fetch(`/api/reservations?${params}`);
  const data = await response.json();
  setReservations(data);
}, [selectedDate, filterStatus, filterDepartment, searchTerm]);
```

2. **상태 변경**:
```typescript
const handleStatusUpdate = async (reservation: Reservation, newStatus: Status) => {
  const updateData = { status: newStatus };
  if (newStatus === 'CANCELLED') {
    const reason = prompt('취소 사유를 입력하세요:');
    updateData.cancel_reason = reason;
  }

  await fetch(`/api/reservations?id=${reservation.id}`, {
    method: "PUT",
    body: JSON.stringify(updateData)
  });
};
```

3. **시간대 선택 (모달)**:
```typescript
// 날짜와 진료 항목이 선택되면 TimeSlotGrid 표시
{formData.reservation_date && formData.department && (
  <TimeSlotGrid
    date={formData.reservation_date}
    service={formData.department}
    selectedSlot={selectedTimeSlot}
    onSelect={(slot) => {
      setSelectedTimeSlot(slot);
      setFormData({ ...formData, reservation_time: slot.time });
    }}
  />
)}
```

**UI 구성**:
- 통계 카드: `<Card>` 5개 (전체, 대기중, 확정, 완료, 취소/미방문)
- 필터 영역: 날짜, 검색, 진료분류 셀렉트, 상태 셀렉트
- 테이블: `<Table>` with 예약 목록
- 작업 버튼:
  - 자세히: 상세 정보 모달
  - 확정 (대기중일 때)
  - 수정 (대기중일 때)
  - 완료 (확정일 때)
  - 취소 (대기중/확정일 때)

### 3.2 한도 관리 화면 (`/admin/reservations/daily-limits/page.tsx`)

**현재 구조**:
```typescript
interface ServiceLimit {
  id: string;
  serviceType: ServiceType;
  dailyLimit: number;      // 일일 인원 한도
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const serviceTypeLabels: Record<ServiceType, string> = {
  'WRINKLE_BOTOX': '주름/보톡스',
  'VOLUME_LIFTING': '볼륨/리프팅',
  'SKIN_CARE': '피부케어',
  'REMOVAL_PROCEDURE': '제거시술',
  'BODY_CARE': '바디케어',
  'OTHER_CONSULTATION': '기타 상담'
};
```

**주요 기능**:
1. 시술별 일일 한도 수정 (숫자 입력)
2. 활성화/비활성화 토글 (`<Switch>`)

**변경 필요사항**:
- **현재**: `dailyLimit: number` (일일 인원 한도)
- **신규**: 시술 시간 + 정리 시간 설정
- 경로 변경: `/admin/reservations/daily-limits` → `/admin/services`

### 3.3 공개 예약 페이지 (`/public/static-pages/calendar-page.html`)

**페이지 구조**:
```html
<!-- 캘린더 영역 -->
<div id="mara_cal_view">
  <div class="title">2025년 09월</div>
  <p class="stit">원하시는 예약 날짜를 선택해주세요.</p>

  <!-- 예약 확인 버튼 -->
  <button class="rsv_btn_t rsv_sch">예약확인</button>

  <!-- 달력 테이블 -->
  <div class="tbl_mara">
    <table>
      <thead>
        <tr><th>일요일</th><th>월요일</th>...</tr>
      </thead>
      <tbody>
        <!-- 날짜별 예약가능/예약종료 표시 -->
      </tbody>
    </table>
  </div>
</div>

<!-- 예약 모달 -->
<div id="calendar_form">
  <form name="inq_popup">
    <input name="sh_checkday" />      <!-- 예약일 -->
    <select name="sh_checktime" />     <!-- 예약 시간 (동적 로딩) -->
    <input name="wr_name" />           <!-- 이름 -->
    <input name="sh_phone" />          <!-- 연락처 -->
    <input name="sh_email" />          <!-- 이메일 -->
    <input name="sh_birth" />          <!-- 생년월일 -->
    <input name="sh_sex" />            <!-- 성별 -->
    <input name="sh_type" />           <!-- 진료종류 -->
    <select name="sh_service" />       <!-- 진료 항목 -->
    <textarea name="wr_content" />     <!-- 희망진료사항 -->
  </form>
</div>
```

**JavaScript 기능**:

1. **TimeSlotLoader 클래스** (인라인):
```javascript
class TimeSlotLoader {
  constructor(config) {
    this.serviceSelect = document.querySelector('#sh_service');
    this.dateInput = document.querySelector('#sh_checkday');
    this.timeSelect = document.querySelector('#sh_checktime');
    this.apiBaseURL = 'https://cms.one-q.xyz';
  }

  async loadTimeSlots() {
    const url = `${this.apiBaseURL}/api/public/reservations/time-slots?service=${service}&date=${date}`;
    const response = await fetch(url);
    const data = await response.json();
    this.renderTimeSlots(data.slots);
  }

  renderTimeSlots(slots) {
    this.timeSelect.innerHTML = '<option>예약 시간을 선택해주세요.</option>';
    slots.forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.time;
      option.textContent = this.formatSlotLabel(slot);
      if (!slot.available) {
        option.disabled = true;
        option.textContent += ' (마감)';
      }
      this.timeSelect.appendChild(option);
    });
  }
}
```

2. **예약 제출 함수**:
```javascript
async function submitReservation(event) {
  event.preventDefault();

  const reservationData = {
    patient_name: formData.get('wr_name'),
    phone: formData.get('sh_phone'),
    email: formData.get('sh_email'),
    birth_date: formData.get('sh_birth'),
    gender: formData.get('sh_sex') === '남' ? 'MALE' : 'FEMALE',
    treatment_type: formData.get('sh_type') === '초진' ? 'FIRST_VISIT' : 'FOLLOW_UP',
    service: formData.get('sh_service'),
    preferred_date: formData.get('sh_checkday'),
    preferred_time: formData.get('sh_checktime'),
    notes: formData.get('wr_content')
  };

  const api = new MisopinAPI();
  const result = await api.submitReservation(reservationData);
}
```

**API 의존성**:
- `GET /api/public/services` - 시술 목록 (현재 하드코딩)
- `GET /api/public/reservations/time-slots` - 시간대 조회 (동적)
- `POST /api/public/reservations` - 예약 제출

---

## 4. API 및 데이터 플로우

### 4.1 Admin API (`/api/reservations/route.ts`)

**GET** - 예약 목록 조회:
```typescript
// Query Parameters
date: string          // YYYY-MM-DD
status: string        // PENDING|CONFIRMED|COMPLETED|CANCELLED|NO_SHOW
department: string    // ServiceType (legacy field: service)
search: string        // 환자명 또는 전화번호

// Response
[
  {
    id: string,
    patient_name: string,
    patient_phone: string,
    patient_email?: string,
    reservation_date: string,
    reservation_time: string,
    department: string,        // service (legacy)
    doctor_name?: string,
    purpose: string,
    status: string,
    notes?: string,
    created_at: string,
    updated_at: string,
    // NEW FIELDS (시간대 기반)
    period?: 'MORNING'|'AFTERNOON',
    time_slot_start?: string,
    time_slot_end?: string,
    service_duration?: number
  }
]
```

**OPTIONS** - 시간대 조회:
```typescript
// Query Parameters
date: string
service: string (or department)

// Response
{
  success: true,
  date: string,
  service: string,
  serviceName: string,
  slots: TimeSlot[],
  slotsByPeriod: {
    MORNING: TimeSlot[],
    AFTERNOON: TimeSlot[]
  },
  summary: {
    totalSlots: number,
    availableSlots: number,
    occupiedSlots: number,
    availabilityRate: string
  }
}
```

**POST** - 예약 생성:
```typescript
// Body
{
  patient_name: string,
  patient_phone: string,
  patient_email?: string,
  birth_date?: string,
  gender?: 'MALE'|'FEMALE',
  reservation_date: string,
  reservation_time: string,
  department: string,           // ServiceType
  doctor_name?: string,
  purpose: string,
  notes?: string
}

// Response
{
  reservation: Reservation,
  message: "예약이 접수되었습니다."
}
```

**PUT** - 예약 수정:
```typescript
// Query Parameters
id: string

// Body (partial)
{
  status?: ReservationStatus,
  cancel_reason?: string,
  patient_name?: string,
  patient_phone?: string,
  // ... 기타 필드
}
```

**DELETE** - 예약 취소:
```typescript
// Query Parameters
id: string

// Response
{
  success: true,
  message: "예약이 취소되었습니다."
}
```

### 4.2 Public API

**1. `/api/public/services/route.ts`** - 시술 정보 조회:
```typescript
// GET
// Query Parameters (optional)
code?: string        // 특정 시술 코드
active?: boolean     // 활성 시술만 (default: true)

// Response
{
  success: true,
  services: [
    {
      id: string,
      code: string,              // "WRINKLE_BOTOX"
      name: string,              // "주름 보톡스"
      description?: string,
      category?: string,
      durationMinutes: number,   // 시술 시간
      bufferMinutes: number,     // 정리 시간
      totalMinutes: number,      // 총 시간
      displayOrder: number,
      isActive: boolean
    }
  ],
  count: number
}
```

**2. `/api/public/reservations/time-slots/route.ts`** - 시간대 조회:
```typescript
// GET
// Query Parameters
service: string      // required (e.g., "WRINKLE_BOTOX")
date: string         // required (YYYY-MM-DD)
debug?: string       // "true"로 설정 시 디버깅 정보

// Response
{
  success: true,
  slots: [
    {
      time: string,           // "09:00"
      period: "MORNING"|"AFTERNOON",
      available: boolean,
      remaining: number,      // 남은 시간(분)
      total: number,          // 총 가용 시간(분)
      status: "available"|"limited"|"full"
    }
  ],
  metadata: {
    date: string,
    service: string,
    serviceName: string,
    totalSlots: number,
    availableSlots: number,
    bookedSlots: number
  }
}
```

**3. `/api/public/reservations/route.ts`** - 공개 예약 제출:
```typescript
// POST
// Body
{
  patient_name: string,
  phone: string,
  email?: string,
  birth_date: string,
  gender: 'MALE'|'FEMALE',
  treatment_type: 'FIRST_VISIT'|'FOLLOW_UP',
  service: ServiceType,
  preferred_date: string,
  preferred_time: string,
  notes?: string
}

// Response
{
  reservation: {
    id: string,
    // ... 예약 정보
  },
  message: "예약이 접수되었습니다. 확인 후 연락드리겠습니다."
}
```

### 4.3 시간대 계산 로직

**핵심 파일**: `/lib/reservations/time-slot-calculator.ts`

**함수**: `calculateAvailableTimeSlots(serviceCode, dateString, debug)`

**처리 흐름**:
```
1. 입력 검증 (날짜 형식, 서비스 코드)
   ↓
2. 서비스 정보 조회 (services 테이블)
   - durationMinutes + bufferMinutes = totalDuration
   ↓
3. 진료 시간 조회 (clinic_time_slots 테이블)
   - 요일(dayOfWeek) 및 서비스별 진료 시간
   ↓
4. 기존 예약 조회 (캐시 우선, 5분 TTL)
   - 해당 날짜의 PENDING, CONFIRMED 예약
   ↓
5. 시간대별 예약 그룹화 (Map)
   - key: `${period}-${time}` (예: "MORNING-09:00")
   ↓
6. 시간대 생성 (30분 간격)
   - clinicSlot.startTime ~ endTime
   - 각 시간대별:
     * consumedMinutes 계산 (기존 예약 소요 시간)
     * remainingMinutes = totalPeriodMinutes - consumedMinutes
     * available = remainingMinutes >= totalDuration
     * status 결정:
       - >60%: available
       - 20-60%: limited
       - <20%: full
   ↓
7. 결과 반환
   - slots: TimeSlot[]
   - metadata: 통계 정보
```

**캐시 전략**:
```typescript
const reservationCache = new Map<string, CachedReservationData>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

function getCachedReservations(dateString: string): ReservationForTimeSlot[] | null {
  const cached = reservationCache.get(dateString);
  if (!cached || Date.now() - cached.timestamp > cached.ttl) {
    return null;
  }
  return cached.reservations;
}
```

**성능**:
- 시간 복잡도: O(n) (n = 예약 수)
- 단일 DB 쿼리
- 5분 캐시

---

## 5. 재사용 가능 코드

### 5.1 TimeSlotGrid 컴포넌트

**파일**: `/components/admin/TimeSlotGrid.tsx`

**Props**:
```typescript
interface TimeSlotGridProps {
  date: string;              // YYYY-MM-DD
  service: string;           // ServiceType code
  selectedSlot?: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  disabled?: boolean;
  className?: string;
}
```

**기능**:
- API 호출: `GET /api/reservations?date=X&service=Y` (OPTIONS method)
- 시간대 그룹화: 오전, 오후, 저녁
- 색상 코딩:
  - 녹색 (>60%): 여유
  - 노란색 (20-60%): 제한적
  - 빨간색 (<20%): 마감
- 용량 표시: `{remaining}/{total}` 퍼센트
- 선택 상태 관리
- 로딩/에러 상태

**UI 구조**:
```tsx
<div className="space-y-6">
  {/* 범례 */}
  <div className="flex gap-4">
    <div>녹색: 여유</div>
    <div>노란색: 제한적</div>
    <div>빨간색: 마감</div>
  </div>

  {/* 오전 */}
  <div>
    <Badge>오전</Badge>
    <span>6 / 6 가능</span>
    <div className="grid grid-cols-4 gap-2">
      {morningSlots.map(slot => (
        <Button
          variant={isSelected ? "default" : "outline"}
          className={getStatusColor(slot.status)}
          onClick={() => onSelect(slot)}
        >
          <Clock /> {slot.time}
          <div>{Math.round(slot.remaining/slot.total*100)}%</div>
        </Button>
      ))}
    </div>
  </div>

  {/* 오후 */}
  {/* ... */}
</div>
```

**재사용 가능성**: ★★★★★
- Admin 예약 수정 모달: 현재 사용 중
- 타임라인 뷰: 왼쪽 시간대 선택 영역으로 재사용 가능
- 공개 예약 페이지: React로 전환 시 사용 가능

### 5.2 ServiceSelector 컴포넌트

**파일**: `/components/admin/ServiceSelector.tsx`

**Props**:
```typescript
interface ServiceSelectorProps {
  value?: string;
  onChange: (serviceCode: string) => void;
  disabled?: boolean;
  showLabel?: boolean;
  label?: string;
  showDetails?: boolean;
  className?: string;
  required?: boolean;
}
```

**기능**:
- 6개 시술 타입 하드코딩
- 시술별 시간 표시 (duration)
- 상세 정보 토글 (설명, 예상 시간)

**데이터**:
```typescript
const SERVICES: Service[] = [
  {
    code: 'WRINKLE_BOTOX',
    label: '주름/보톡스',
    duration: 30,
    description: '주름 개선 및 보톡스 시술'
  },
  // ... 6개
];
```

**재사용 가능성**: ★★★★☆
- Admin 예약 폼: 현재 사용 중
- 타임라인 뷰: 필터로 사용 가능
- 시술 관리 화면: 시술 선택 시 사용 가능

**개선 필요사항**:
- 현재 하드코딩 → DB 기반으로 변경 (`/api/public/services` 활용)

### 5.3 CapacityIndicator 컴포넌트

**파일**: `/components/admin/CapacityIndicator.tsx`

**Props**:
```typescript
interface CapacityIndicatorProps {
  remaining: number;
  total: number;
  percentage?: number;
  status?: 'available' | 'limited' | 'full';
  compact?: boolean;
  showProgress?: boolean;
  className?: string;
}
```

**기능**:
- 퍼센트 계산
- 상태 결정 (>60% available, 20-60% limited, <20% full)
- 색상 및 아이콘 표시
- Progress bar (optional)
- Compact mode (아이콘만)

**UI 예시**:
```tsx
{/* Full mode */}
<CapacityIndicator
  remaining={120}
  total={180}
  showProgress={true}
/>
// → [✓ 여유] 67% | Progress bar | 120분 / 180분 남음

{/* Compact mode */}
<CapacityIndicator
  remaining={30}
  total={180}
  compact={true}
/>
// → [!] 17%
```

**재사용 가능성**: ★★★★☆
- 타임라인 뷰: 카드 헤더에 용량 표시
- 통계 카드: 시간대별 전체 용량 표시

### 5.4 시간대 계산 로직

**파일**: `/lib/reservations/time-slot-calculator.ts`

**핵심 함수**:
```typescript
export async function calculateAvailableTimeSlots(
  serviceCode: string,
  dateString: string,
  debug: boolean = false
): Promise<TimeSlotResult>
```

**재사용 가능성**: ★★★★★
- Admin API: OPTIONS 엔드포인트에서 사용 중
- Public API: `/api/public/reservations/time-slots`에서 사용 중
- 타임라인 뷰: 시간대 계산에 그대로 사용 가능

**검증 함수**:
```typescript
export async function validateTimeSlotAvailability(
  serviceCode: string,
  dateString: string,
  timeString: string,
  period: Period
): Promise<void>
```

**재사용 가능성**: ★★★★☆
- 예약 생성 시 유효성 검증
- 타임라인 뷰에서 예약 가능 여부 확인

---

## 6. 신규 구현 필요 사항

### 6.1 타임라인 뷰 페이지

**경로**: `/admin/reservations/timeline` (신규)

**레이아웃**:
```
┌─────────────────────────────────────────────────────────────┐
│  [📋 리스트] [📅 타임라인] [📊 통계]                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  날짜 네비게이션: [◀ 이전] [2025-11-06] [다음 ▶] [오늘]    │
│                                                               │
│  ┌─────────────┬─────────────────────────────────────────┐  │
│  │ 시간대 그리드│         타임라인 카드                    │  │
│  │  (2/5 폭)   │          (3/5 폭)                        │  │
│  ├─────────────┼─────────────────────────────────────────┤  │
│  │             │                                          │  │
│  │ [오전]      │  08:30 ┌────────────────┐              │  │
│  │ 6/6 가능    │        │ 김환자          │              │  │
│  │             │        │ 주름/보톡스     │              │  │
│  │ [08:30] ✓  │        │ 상태: 확정      │              │  │
│  │ [09:00] ⚠  │        │ [확인][수정]    │              │  │
│  │ [09:30] ✓  │        └────────────────┘              │  │
│  │ [10:00] ✓  │                                          │  │
│  │ [10:30] ⚠  │  09:00 ┌────────────────┐              │  │
│  │ [11:00] ✕  │        │ 이환자          │              │  │
│  │             │        │ 피부케어        │              │  │
│  │ [오후]      │        │ 상태: 대기중    │              │  │
│  │ 12/12 가능  │        │ [확정][수정]    │              │  │
│  │             │        └────────────────┘              │  │
│  │ [13:00] ✓  │                                          │  │
│  │ [13:30] ✓  │  ... (시간순 정렬)                       │  │
│  │ ...         │                                          │  │
│  │             │                                          │  │
│  │ [수동 마감] │  18:00 (빈 시간대)                      │  │
│  │ ☐ 09:00    │                                          │  │
│  │ ☐ 14:00    │                                          │  │
│  │             │                                          │  │
│  └─────────────┴─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**필요한 컴포넌트**:

1. **TimelineLayout** (신규):
```tsx
interface TimelineLayoutProps {
  date: string;
  onDateChange: (date: string) => void;
}

const TimelineLayout = ({ date, onDateChange }: TimelineLayoutProps) => {
  return (
    <div className="flex gap-4">
      {/* 왼쪽: 시간대 그리드 (2/5) */}
      <div className="w-2/5">
        <TimeSlotGrid
          date={date}
          service={selectedService}
          onSelect={(slot) => {/* 해당 시간으로 스크롤 */}}
        />

        {/* 수동 마감 UI */}
        <ManualCloseForm
          date={date}
          availableSlots={availableSlots}
          onClose={(slots) => {/* API 호출 */}}
        />
      </div>

      {/* 오른쪽: 타임라인 카드 (3/5) */}
      <div className="w-3/5 overflow-y-auto">
        <ReservationTimeline
          date={date}
          reservations={reservations}
          onUpdate={() => fetchReservations()}
        />
      </div>
    </div>
  );
};
```

2. **ReservationTimeline** (신규):
```tsx
interface ReservationTimelineProps {
  date: string;
  reservations: Reservation[];
  onUpdate: () => void;
}

const ReservationTimeline = ({ date, reservations, onUpdate }: Props) => {
  // 시간순 정렬
  const sortedReservations = reservations.sort((a, b) =>
    a.reservation_time.localeCompare(b.reservation_time)
  );

  return (
    <div className="space-y-2">
      {sortedReservations.map(reservation => (
        <ReservationCard
          key={reservation.id}
          reservation={reservation}
          onStatusChange={(newStatus) => {
            handleStatusUpdate(reservation, newStatus);
            onUpdate();
          }}
        />
      ))}
    </div>
  );
};
```

3. **ReservationCard** (신규):
```tsx
const ReservationCard = ({ reservation, onStatusChange }: Props) => {
  return (
    <Card className="relative">
      {/* 시간 표시 (왼쪽 상단) */}
      <div className="absolute top-2 left-2 text-xs text-muted-foreground">
        {reservation.reservation_time}
      </div>

      <CardContent className="pt-8">
        {/* 환자 정보 */}
        <div className="font-semibold">{reservation.patient_name}</div>
        <div className="text-sm text-muted-foreground">
          {reservation.patient_phone}
        </div>

        {/* 진료 정보 */}
        <div className="mt-2">
          <Badge>{serviceTypeLabels[reservation.department]}</Badge>
          <span className="ml-2 text-sm">{reservation.purpose}</span>
        </div>

        {/* 상태 배지 */}
        <div className="mt-2">
          <Badge variant={statusInfo[reservation.status].color}>
            {statusInfo[reservation.status].label}
          </Badge>
        </div>

        {/* 작업 버튼 */}
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline">자세히</Button>
          {reservation.status === 'PENDING' && (
            <>
              <Button size="sm" onClick={() => onStatusChange('CONFIRMED')}>
                확정
              </Button>
              <Button size="sm" variant="destructive">취소</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

4. **ManualCloseForm** (신규):
```tsx
interface ManualCloseFormProps {
  date: string;
  availableSlots: TimeSlot[];
  onClose: (slots: string[]) => void;
}

const ManualCloseForm = ({ date, availableSlots, onClose }: Props) => {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">수동 마감</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {availableSlots.map(slot => (
            <div key={slot.time} className="flex items-center">
              <Checkbox
                id={slot.time}
                checked={selectedSlots.includes(slot.time)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedSlots([...selectedSlots, slot.time]);
                  } else {
                    setSelectedSlots(selectedSlots.filter(t => t !== slot.time));
                  }
                }}
              />
              <Label htmlFor={slot.time} className="ml-2">
                {slot.time} ({getPeriodLabel(slot.period)})
              </Label>
            </div>
          ))}
        </div>

        <Button
          className="mt-4 w-full"
          onClick={() => onClose(selectedSlots)}
          disabled={selectedSlots.length === 0}
        >
          선택한 시간대 마감
        </Button>
      </CardContent>
    </Card>
  );
};
```

5. **DateNavigation** (신규):
```tsx
const DateNavigation = ({ date, onChange }: Props) => {
  const handlePrevDay = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    onChange(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    onChange(next.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onChange(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" onClick={handlePrevDay}>
        <ChevronLeft /> 이전
      </Button>

      <Input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        className="w-[200px]"
      />

      <Button variant="outline" onClick={handleNextDay}>
        다음 <ChevronRight />
      </Button>

      <Button variant="outline" onClick={handleToday}>
        오늘
      </Button>
    </div>
  );
};
```

**API 연동**:
- 기존 `/api/reservations` API 활용 (date 필터)
- 기존 `TimeSlotGrid` 컴포넌트의 OPTIONS 호출 활용

**수동 마감 API** (신규 필요):
```typescript
// POST /api/admin/manual-close
{
  date: string,
  slots: string[],      // ["09:00", "14:00"]
  period: Period
}
```

### 6.2 탭 네비게이션 추가

**위치**: `/admin/reservations/page.tsx` 상단

**컴포넌트**:
```tsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, usePathname } from "next/navigation";

const ReservationTabs = () => {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { label: '📋 리스트', value: '/admin/reservations' },
    { label: '📅 타임라인', value: '/admin/reservations/timeline' },
    { label: '📊 통계', value: '/admin/reservations/stats' }
  ];

  return (
    <Tabs value={pathname} onValueChange={(value) => router.push(value)}>
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
```

**통합 방법**:
```tsx
// /admin/reservations/layout.tsx (신규)
export default function ReservationsLayout({ children }: Props) {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">예약 관리</h1>
        <p className="text-gray-600 mt-1">진료 예약을 관리합니다</p>
      </div>

      <ReservationTabs />

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
```

### 6.3 시술 관리 화면

**경로**: `/admin/services` (신규) 또는 `/admin/services/page.tsx`

**기능**:
1. 시술 목록 표시
2. 시술별 시간 설정:
   - 시술 시간 (durationMinutes)
   - 정리 시간 (bufferMinutes)
   - 총 시간 (자동 계산)
3. 활성화/비활성화
4. 표시 순서 조정

**UI 구조**:
```tsx
const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">시술 관리</h1>
        <p className="text-gray-600 mt-1">시술별 시간 및 설정을 관리합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시술 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시술명</TableHead>
                <TableHead>시술 시간</TableHead>
                <TableHead>정리 시간</TableHead>
                <TableHead>총 시간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map(service => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  onUpdate={handleUpdate}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

**ServiceRow 컴포넌트**:
```tsx
const ServiceRow = ({ service, onUpdate }: Props) => {
  const [editing, setEditing] = useState(false);
  const [duration, setDuration] = useState(service.durationMinutes);
  const [buffer, setBuffer] = useState(service.bufferMinutes);

  const handleSave = async () => {
    await fetch(`/api/admin/services/${service.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        durationMinutes: duration,
        bufferMinutes: buffer
      })
    });
    setEditing(false);
    onUpdate();
  };

  return (
    <TableRow>
      <TableCell>{service.name}</TableCell>

      {editing ? (
        <>
          <TableCell>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="ml-1">분</span>
          </TableCell>
          <TableCell>
            <Input
              type="number"
              value={buffer}
              onChange={(e) => setBuffer(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="ml-1">분</span>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell>{service.durationMinutes}분</TableCell>
          <TableCell>{service.bufferMinutes}분</TableCell>
        </>
      )}

      <TableCell className="font-semibold">
        {service.durationMinutes + service.bufferMinutes}분
      </TableCell>

      <TableCell>
        <Switch
          checked={service.isActive}
          onCheckedChange={(checked) => {
            handleToggleActive(service.id, checked);
          }}
        />
      </TableCell>

      <TableCell>
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave}>저장</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              취소
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            수정
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};
```

**API** (신규 필요):

1. **GET /api/admin/services**:
```typescript
// Response
{
  success: true,
  services: Service[],
  count: number
}
```

2. **PATCH /api/admin/services/:id**:
```typescript
// Body
{
  durationMinutes?: number,
  bufferMinutes?: number,
  isActive?: boolean,
  displayOrder?: number
}
```

### 6.4 진료 시간 설정 화면

**경로**: `/admin/clinic-hours` (신규)

**기능**:
- 요일별 진료 시간 설정
- 오전/오후 시간대 설정
- 서비스별 특별 진료 시간 (선택적)

**DB 테이블**: `clinic_time_slots` (이미 존재)

**UI 구조**:
```tsx
const ClinicHoursPage = () => {
  const [timeSlots, setTimeSlots] = useState<ClinicTimeSlot[]>([]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">진료 시간 관리</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>요일별 진료 시간</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>요일</TableHead>
                <TableHead>시간대</TableHead>
                <TableHead>시작 시간</TableHead>
                <TableHead>종료 시간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DAYS_OF_WEEK.map(day => (
                <ClinicHourRow
                  key={day}
                  day={day}
                  slots={timeSlots.filter(s => s.dayOfWeek === day)}
                  onUpdate={fetchTimeSlots}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## 7. 영향도 분석

### 7.1 공개 예약 페이지 영향도

**현재 사용 중인 API**:
1. `GET /api/public/services` - 시술 목록 조회
2. `GET /api/public/reservations/time-slots` - 시간대 조회
3. `POST /api/public/reservations` - 예약 제출

**변경 사항이 미치는 영향**:

#### ✅ 영향 없음
- **시간대 조회 API**:
  - `/api/public/reservations/time-slots`는 이미 `services` 테이블 기반
  - `durationMinutes`, `bufferMinutes` 사용 중
  - 변경 없이 그대로 사용 가능

- **예약 제출 API**:
  - 기존 필드 (`service`, `preferred_date`, `preferred_time`) 유지
  - 호환성 유지

#### ⚠️ 영향 있음 (개선 필요)

1. **ServiceSelector 컴포넌트** (Admin):
   - 현재: 하드코딩된 6개 시술
   - 개선: `GET /api/public/services` 활용하여 DB 기반으로 변경

   ```tsx
   // BEFORE
   const SERVICES: Service[] = [
     { code: 'WRINKLE_BOTOX', label: '주름/보톡스', duration: 30 },
     // ... 하드코딩
   ];

   // AFTER
   const [services, setServices] = useState<Service[]>([]);

   useEffect(() => {
     fetch('/api/public/services')
       .then(res => res.json())
       .then(data => setServices(data.services));
   }, []);
   ```

2. **calendar-page.html의 시술 옵션**:
   - 현재: HTML에 하드코딩
   ```html
   <select name="sh_service">
     <option value="WRINKLE_BOTOX">주름 보톡스</option>
     <option value="VOLUME_LIFTING">볼륨 리프팅</option>
     <!-- ... -->
   </select>
   ```

   - 개선: JavaScript로 동적 로딩
   ```javascript
   async function loadServices() {
     const response = await fetch('/api/public/services');
     const data = await response.json();
     const select = document.querySelector('#sh_service');

     data.services.forEach(service => {
       const option = document.createElement('option');
       option.value = service.code;
       option.textContent = service.name;
       select.appendChild(option);
     });
   }
   ```

### 7.2 호환성 유지 방안

**데이터베이스 레벨**:
- `reservations` 테이블:
  - **LEGACY 필드 유지**: `service`, `preferredTime`
  - **NEW 필드 추가**: `serviceId`, `period`, `timeSlotStart`, `timeSlotEnd`
  - 양쪽 필드 모두 채워서 호환성 유지

**API 레벨**:
- 기존 `/api/reservations` 엔드포인트:
  - `department` 파라미터 지원 (legacy)
  - `service` 파라미터 지원 (legacy)
  - Response에 legacy 필드 포함

**마이그레이션 전략**:
```typescript
// 예약 생성 시 양쪽 필드 모두 채우기
const newReservation = await prisma.reservations.create({
  data: {
    // LEGACY (backward compatibility)
    service: body.department,        // ServiceType enum
    preferredTime: body.reservation_time,  // "09:00"

    // NEW (time-based system)
    serviceId: service.id,
    serviceName: service.name,
    period: determinePeriod(body.reservation_time),
    timeSlotStart: body.reservation_time,
    timeSlotEnd: calculateEndTime(body.reservation_time, service.durationMinutes),
    estimatedDuration: service.durationMinutes + service.bufferMinutes
  }
});
```

### 7.3 변경 사항 요약

| 대상 | 변경 유형 | 호환성 영향 | 우선순위 |
|------|----------|------------|---------|
| **Admin 리스트 뷰** | 탭 추가 | 없음 | 중 |
| **Admin 타임라인 뷰** | 신규 페이지 | 없음 | 높음 |
| **한도 관리 화면** | 경로 변경 + 기능 개선 | 기존 API deprecated | 중 |
| **시술 관리 화면** | 신규 페이지 | Admin 전용, 공개 API 영향 없음 | 높음 |
| **ServiceSelector** | DB 기반으로 변경 | Admin 전용, 공개 페이지 영향 없음 | 중 |
| **calendar-page.html** | 시술 옵션 동적 로딩 | 개선 사항 (필수 아님) | 낮음 |
| **시간대 계산 로직** | 변경 없음 | 없음 | - |
| **Public APIs** | 변경 없음 | 없음 | - |

---

## 8. 데이터베이스 분석

### 8.1 주요 테이블

#### reservations
```prisma
model reservations {
  id            String        @id
  patientName   String
  phone         String
  email         String?
  birthDate     DateTime
  gender        Gender
  treatmentType TreatmentType
  preferredDate DateTime      @db.Date

  // LEGACY FIELDS (backward compatibility)
  preferredTime String        // "09:30" format - DEPRECATED
  service       ServiceType   // DEPRECATED, use serviceId

  // NEW TIME-BASED FIELDS
  serviceId         String?
  serviceName       String? @db.VarChar(100)
  estimatedDuration Int?
  period            Period?
  timeSlotStart     String? @db.VarChar(5)
  timeSlotEnd       String? @db.VarChar(5)

  status          ReservationStatus @default(PENDING)
  notes           String?
  adminNotes      String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime
  statusChangedAt DateTime          @default(now())
  statusChangedBy String?

  serviceRecord services? @relation(fields: [serviceId], references: [id])

  @@index([preferredDate, service, status])
  @@index([preferredDate, serviceId, status])
  @@index([preferredDate, period, status])
}
```

**특징**:
- Legacy 필드 (`service`, `preferredTime`) 유지
- New 필드 (`serviceId`, `period`, `timeSlotStart`) 추가
- 이중 인덱스로 양쪽 시스템 지원

#### services
```prisma
model services {
  id                String              @id
  code              String              @unique @db.VarChar(50)
  name              String              @db.VarChar(100)
  description       String?
  category          String?             @db.VarChar(50)
  durationMinutes   Int
  bufferMinutes     Int                 @default(10)
  isActive          Boolean             @default(true)
  displayOrder      Int                 @default(0)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime

  reservations      reservations[]
  clinic_time_slots clinic_time_slots[]

  @@index([code])
  @@index([isActive])
  @@index([displayOrder])
}
```

**활용**:
- 시술별 시간 설정 (durationMinutes, bufferMinutes)
- 시간대 계산에 사용
- 시술 관리 화면의 데이터 소스

#### clinic_time_slots
```prisma
model clinic_time_slots {
  id             String    @id
  serviceId      String?
  dayOfWeek      DayOfWeek
  period         Period
  startTime      String    @db.VarChar(5)
  endTime        String    @db.VarChar(5)
  slotInterval   Int       @default(30)
  maxConcurrent  Int       @default(1)
  isActive       Boolean   @default(true)
  effectiveFrom  DateTime? @db.Date
  effectiveUntil DateTime? @db.Date
  createdAt      DateTime  @default(now())
  updatedAt      DateTime

  service        services? @relation(fields: [serviceId], references: [id])

  @@unique([dayOfWeek, period, serviceId, startTime, endTime])
  @@index([dayOfWeek, period, isActive])
}
```

**활용**:
- 요일별 진료 시간 정의
- 시간대 계산의 기준
- 진료 시간 관리 화면의 데이터 소스

#### service_reservation_limits
```prisma
model service_reservation_limits {
  id          String      @id
  serviceType ServiceType @unique
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime
  dailyLimit  Int         @default(10)
}
```

**상태**: **DEPRECATED**
- 현재 한도 관리 화면에서 사용 중
- 신규 시스템에서는 `services` 테이블로 통합
- 마이그레이션 후 삭제 예정

### 8.2 필요한 마이그레이션

#### 1. services 테이블 데이터 초기화

**목적**: 하드코딩된 6개 시술을 DB에 저장

```sql
-- 기존 데이터 삭제 (있다면)
DELETE FROM services WHERE code IN (
  'WRINKLE_BOTOX',
  'VOLUME_LIFTING',
  'SKIN_CARE',
  'REMOVAL_PROCEDURE',
  'BODY_CARE',
  'OTHER_CONSULTATION'
);

-- 시술 데이터 삽입
INSERT INTO services (id, code, name, description, category, durationMinutes, bufferMinutes, isActive, displayOrder, createdAt, updatedAt)
VALUES
  (gen_random_uuid(), 'WRINKLE_BOTOX', '주름/보톡스', '주름 개선 및 보톡스 시술', 'WRINKLE', 30, 10, true, 1, NOW(), NOW()),
  (gen_random_uuid(), 'VOLUME_LIFTING', '볼륨/리프팅', '볼륨 충전 및 리프팅 시술', 'VOLUME', 40, 10, true, 2, NOW(), NOW()),
  (gen_random_uuid(), 'SKIN_CARE', '피부케어', '피부 관리 및 케어 시술', 'SKIN', 50, 15, true, 3, NOW(), NOW()),
  (gen_random_uuid(), 'REMOVAL_PROCEDURE', '제거시술', '점, 사마귀 등 제거 시술', 'REMOVAL', 30, 10, true, 4, NOW(), NOW()),
  (gen_random_uuid(), 'BODY_CARE', '바디케어', '바디 관리 및 케어 시술', 'BODY', 60, 15, true, 5, NOW(), NOW()),
  (gen_random_uuid(), 'OTHER_CONSULTATION', '기타 상담', '기타 상담 및 문의', 'OTHER', 20, 5, true, 6, NOW(), NOW());
```

#### 2. clinic_time_slots 테이블 초기화

**목적**: 기본 진료 시간 설정

```sql
-- 월요일 오전 (08:30-12:00)
INSERT INTO clinic_time_slots (id, serviceId, dayOfWeek, period, startTime, endTime, slotInterval, maxConcurrent, isActive, createdAt, updatedAt)
VALUES (gen_random_uuid(), NULL, 'MONDAY', 'MORNING', '08:30', '12:00', 30, 1, true, NOW(), NOW());

-- 월요일 오후 (13:00-19:30)
INSERT INTO clinic_time_slots (id, serviceId, dayOfWeek, period, startTime, endTime, slotInterval, maxConcurrent, isActive, createdAt, updatedAt)
VALUES (gen_random_uuid(), NULL, 'MONDAY', 'AFTERNOON', '13:00', '19:30', 30, 1, true, NOW(), NOW());

-- 화요일 오전/오후
-- ... (월요일과 동일)

-- 수요일 오전만 (08:30-12:00)
INSERT INTO clinic_time_slots (id, serviceId, dayOfWeek, period, startTime, endTime, slotInterval, maxConcurrent, isActive, createdAt, updatedAt)
VALUES (gen_random_uuid(), NULL, 'WEDNESDAY', 'MORNING', '08:30', '12:00', 30, 1, true, NOW(), NOW());

-- 목요일/금요일 (월요일과 동일)
-- ...

-- 토요일 오전만 (09:00-14:00)
INSERT INTO clinic_time_slots (id, serviceId, dayOfWeek, period, startTime, endTime, slotInterval, maxConcurrent, isActive, createdAt, updatedAt)
VALUES (gen_random_uuid(), NULL, 'SATURDAY', 'MORNING', '09:00', '14:00', 30, 1, true, NOW(), NOW());

-- 일요일 휴진 (데이터 없음)
```

#### 3. 기존 예약 데이터 마이그레이션

**목적**: `service` (enum) → `serviceId` (foreign key) 변환

```sql
-- services 테이블의 ID를 기준으로 업데이트
UPDATE reservations r
SET
  serviceId = s.id,
  serviceName = s.name,
  estimatedDuration = s.durationMinutes + s.bufferMinutes,
  period = CASE
    WHEN EXTRACT(HOUR FROM r.preferredTime::time) < 12 THEN 'MORNING'::period
    ELSE 'AFTERNOON'::period
  END,
  timeSlotStart = r.preferredTime,
  timeSlotEnd = (r.preferredTime::time + (s.durationMinutes || ' minutes')::interval)::text
FROM services s
WHERE s.code = r.service::text
  AND r.serviceId IS NULL;
```

#### 4. service_reservation_limits 테이블 deprecated 처리

**목적**: 신규 시스템으로 완전히 전환 후 삭제

```sql
-- 1단계: 주석 추가 (마이그레이션 스크립트)
COMMENT ON TABLE service_reservation_limits IS 'DEPRECATED: 신규 시스템에서는 services 테이블 사용';

-- 2단계: 나중에 테이블 삭제 (모든 참조 제거 후)
-- DROP TABLE service_reservation_limits;
```

### 8.3 데이터 무결성 검증

**검증 쿼리**:
```sql
-- 1. 모든 예약이 유효한 serviceId를 가지는지 확인
SELECT COUNT(*)
FROM reservations r
LEFT JOIN services s ON r.serviceId = s.id
WHERE r.serviceId IS NOT NULL AND s.id IS NULL;
-- 결과: 0 (모든 예약이 유효한 서비스 참조)

-- 2. period 값이 올바른지 확인
SELECT COUNT(*)
FROM reservations
WHERE period NOT IN ('MORNING', 'AFTERNOON')
  AND period IS NOT NULL;
-- 결과: 0

-- 3. 시간대 정합성 확인
SELECT COUNT(*)
FROM reservations
WHERE timeSlotStart IS NOT NULL
  AND timeSlotEnd IS NOT NULL
  AND timeSlotStart >= timeSlotEnd;
-- 결과: 0 (종료 시간이 시작 시간보다 늦음)

-- 4. 진료 시간 슬롯 중복 확인
SELECT dayOfWeek, period, COUNT(*)
FROM clinic_time_slots
WHERE isActive = true
GROUP BY dayOfWeek, period
HAVING COUNT(*) > 1;
-- 결과: 빈 결과 (중복 없음)
```

---

## 9. 구현 권장사항

### 9.1 구현 우선순위

**Phase 1: 기반 작업** (1-2일)
1. ✅ DB 마이그레이션
   - `services` 테이블 데이터 초기화
   - `clinic_time_slots` 기본 데이터 생성
   - 기존 예약 데이터 마이그레이션
2. ✅ API 준비
   - `GET /api/admin/services` (신규)
   - `PATCH /api/admin/services/:id` (신규)
3. ✅ ServiceSelector 개선
   - DB 기반으로 변경

**Phase 2: 시술 관리 화면** (1-2일)
1. ✅ `/admin/services/page.tsx` 생성
2. ✅ ServiceRow 컴포넌트 구현
3. ✅ 시간 설정 UI 구현
4. ✅ 활성화/비활성화 토글
5. ✅ 네비게이션 연결

**Phase 3: 타임라인 뷰** (2-3일)
1. ✅ `/admin/reservations/layout.tsx` 생성
2. ✅ ReservationTabs 컴포넌트
3. ✅ `/admin/reservations/timeline/page.tsx` 생성
4. ✅ TimelineLayout 컴포넌트
5. ✅ ReservationTimeline 컴포넌트
6. ✅ ReservationCard 컴포넌트
7. ✅ DateNavigation 컴포넌트
8. ✅ ManualCloseForm 컴포넌트
9. ✅ 수동 마감 API 구현

**Phase 4: 통합 및 테스트** (1일)
1. ✅ 기능 테스트
2. ✅ UI/UX 개선
3. ✅ 버그 수정
4. ✅ 문서 업데이트

### 9.2 코드 재사용 전략

**재사용 가능한 컴포넌트**:
1. ✅ `TimeSlotGrid` - 타임라인 뷰 왼쪽 영역
2. ✅ `ServiceSelector` - 시술 선택 (DB 기반으로 개선 후)
3. ✅ `CapacityIndicator` - 용량 표시
4. ⚠️ 예약 테이블 행 - 리스트 뷰와 타임라인 카드 간 공통 로직

**재사용 가능한 로직**:
1. ✅ `time-slot-calculator.ts` - 시간대 계산
2. ✅ `types.ts` - 타입 정의
3. ⚠️ 상태 변경 로직 - `handleStatusUpdate` 함수를 공통 훅으로 분리 가능

**공통 훅 제안**:
```typescript
// /hooks/useReservations.ts
export const useReservations = (date: string) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReservations = useCallback(async () => {
    // ... 로직
  }, [date]);

  const updateStatus = async (id: string, status: ReservationStatus) => {
    // ... 로직
  };

  return { reservations, loading, fetchReservations, updateStatus };
};
```

### 9.3 성능 최적화

**1. 시간대 조회 캐싱**:
- 현재: 5분 TTL 서버 캐시
- 개선: React Query 도입으로 클라이언트 캐싱 추가
```tsx
import { useQuery } from '@tanstack/react-query';

const useTimeSlots = (date: string, service: string) => {
  return useQuery({
    queryKey: ['timeSlots', date, service],
    queryFn: () => fetchTimeSlots(date, service),
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
  });
};
```

**2. 예약 목록 페이지네이션**:
- 현재: 전체 로딩
- 개선: 무한 스크롤 또는 페이지네이션
```typescript
// API 수정 필요
GET /api/reservations?date=X&page=1&limit=20
```

**3. 타임라인 뷰 가상화**:
- 많은 예약이 있을 때 성능 개선
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const ReservationTimeline = ({ reservations }: Props) => {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: reservations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // 카드 높이
    overscan: 5
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(item => (
          <ReservationCard
            key={item.key}
            reservation={reservations[item.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translateY(${item.start}px)`
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

### 9.4 에러 처리 및 사용자 피드백

**1. 낙관적 업데이트**:
```tsx
const handleStatusUpdate = async (id: string, newStatus: Status) => {
  // 즉시 UI 업데이트 (낙관적)
  setReservations(prev =>
    prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
  );

  try {
    await updateReservationStatus(id, newStatus);
  } catch (error) {
    // 실패 시 롤백
    setReservations(prev =>
      prev.map(r => r.id === id ? { ...r, status: originalStatus } : r)
    );
    toast.error("상태 변경에 실패했습니다.");
  }
};
```

**2. 토스트 알림**:
```tsx
import { toast } from 'sonner';

// 성공
toast.success("예약이 확정되었습니다.");

// 에러
toast.error("예약 확정에 실패했습니다.", {
  description: error.message,
  action: {
    label: "다시 시도",
    onClick: () => handleRetry()
  }
});

// 로딩
const toastId = toast.loading("예약을 처리하는 중...");
// ... API 호출
toast.success("완료되었습니다.", { id: toastId });
```

**3. 에러 바운더리**:
```tsx
// /components/ErrorBoundary.tsx
export const ReservationErrorBoundary = ({ children }: Props) => {
  return (
    <ErrorBoundary
      fallback={
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류 발생</AlertTitle>
          <AlertDescription>
            예약 정보를 불러오는 중 오류가 발생했습니다.
            <Button onClick={() => window.location.reload()}>
              새로고침
            </Button>
          </AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
};
```

### 9.5 접근성 (Accessibility)

**1. 키보드 네비게이션**:
```tsx
const TimeSlotButton = ({ slot, onSelect }: Props) => {
  return (
    <Button
      onClick={() => onSelect(slot)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(slot);
        }
      }}
      aria-label={`${slot.time} 예약하기 (${slot.status})`}
      aria-pressed={isSelected}
    >
      {slot.time}
    </Button>
  );
};
```

**2. 스크린 리더 지원**:
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {loading && <span className="sr-only">예약 정보를 불러오는 중...</span>}
  {reservations.length === 0 && <span className="sr-only">예약이 없습니다</span>}
</div>
```

**3. 색상 대비**:
```tsx
// 색상만으로 상태 표시하지 않기
<Badge variant={statusConfig.variant}>
  <Icon className="mr-1" /> {/* 아이콘 추가 */}
  {statusConfig.label}
</Badge>
```

---

## 10. 체크리스트

### 10.1 구현 체크리스트

**데이터베이스**:
- [ ] services 테이블 데이터 초기화
- [ ] clinic_time_slots 기본 데이터 생성
- [ ] 기존 예약 데이터 마이그레이션
- [ ] 데이터 무결성 검증

**API**:
- [ ] GET /api/admin/services
- [ ] PATCH /api/admin/services/:id
- [ ] POST /api/admin/manual-close (수동 마감)

**시술 관리 화면**:
- [ ] /admin/services/page.tsx 생성
- [ ] ServiceRow 컴포넌트
- [ ] 시간 설정 UI
- [ ] 활성화/비활성화 토글

**타임라인 뷰**:
- [ ] /admin/reservations/layout.tsx
- [ ] ReservationTabs 컴포넌트
- [ ] /admin/reservations/timeline/page.tsx
- [ ] TimelineLayout
- [ ] ReservationTimeline
- [ ] ReservationCard
- [ ] DateNavigation
- [ ] ManualCloseForm

**컴포넌트 개선**:
- [ ] ServiceSelector DB 기반 변경
- [ ] TimeSlotGrid 타임라인 뷰 통합

**테스트**:
- [ ] 시간대 계산 로직 검증
- [ ] 예약 생성/수정/취소 플로우
- [ ] 타임라인 뷰 날짜 네비게이션
- [ ] 수동 마감 기능
- [ ] 반응형 UI (모바일)

**문서**:
- [ ] API 문서 업데이트
- [ ] 컴포넌트 사용 가이드
- [ ] DB 스키마 문서

### 10.2 테스트 시나리오

**시술 관리**:
1. 시술 시간 수정 (30분 → 40분)
2. 정리 시간 수정 (10분 → 15분)
3. 총 시간 자동 계산 확인 (50분 → 55분)
4. 활성화/비활성화 토글
5. 변경사항이 시간대 조회에 반영되는지 확인

**타임라인 뷰**:
1. 날짜 선택 (이전/다음/오늘)
2. 시간대 그리드 표시 확인
3. 예약 카드 시간순 정렬 확인
4. 예약 상태 변경 (대기중 → 확정)
5. 수동 마감 선택 및 적용
6. 마감된 시간대가 그리드에 반영되는지 확인

**데이터 일관성**:
1. Admin에서 예약 생성
2. 공개 페이지에서 동일 시간대 예약 시도 (충돌 확인)
3. 시간대 계산이 정확한지 검증
4. Legacy 필드와 New 필드가 모두 채워지는지 확인

---

## 결론

### 현재 시스템 강점
1. ✅ 견고한 시간대 계산 로직 (`time-slot-calculator.ts`)
2. ✅ 재사용 가능한 컴포넌트들 (TimeSlotGrid, ServiceSelector, CapacityIndicator)
3. ✅ 명확한 API 구조
4. ✅ Legacy/New 필드 병행으로 호환성 유지
5. ✅ 캐싱 전략 (5분 TTL)

### 개선 필요 사항
1. ⚠️ ServiceSelector 하드코딩 → DB 기반 변경
2. ⚠️ 타임라인 뷰 신규 구현
3. ⚠️ 시술 관리 화면 신규 구현
4. ⚠️ 한도 관리 방식 변경 (인원 → 시간)

### 구현 시 주의사항
1. 🔴 데이터 무결성 유지 (마이그레이션 스크립트 검증)
2. 🔴 Legacy 필드 제거 금지 (하위 호환성)
3. 🟡 성능 최적화 (React Query, 가상화)
4. 🟡 에러 처리 및 사용자 피드백
5. 🟢 접근성 (키보드 네비게이션, 스크린 리더)

### 예상 개발 기간
- **Phase 1 (기반 작업)**: 1-2일
- **Phase 2 (시술 관리)**: 1-2일
- **Phase 3 (타임라인 뷰)**: 2-3일
- **Phase 4 (통합 테스트)**: 1일
- **총 예상 기간**: 5-8일

---

**문서 버전**: 1.0
**작성자**: Claude (AI Assistant)
**검토 필요**: 데이터베이스 마이그레이션 스크립트, API 스펙
