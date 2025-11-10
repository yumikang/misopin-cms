# 예약 시스템 종합 분석 리포트
**작성일**: 2025-11-05
**분석 대상**: 미소핀 클리닉 예약 시스템 (misopin.one-q.xyz ↔ cms.one-q.xyz)

## 📋 개요

미소핀 클리닉 예약 시스템 전체 분석 결과 보고서입니다. 정적 페이지(misopin.one-q.xyz)와 CMS 관리 시스템(cms.one-q.xyz) 간의 연동 상태 및 현재 문제점을 파악했습니다.

---

## ✅ 정상 작동 중인 부분

### 1. **시술별 한도 시스템** (`daily-limit-counter.ts`)
- **위치**: `/lib/reservations/daily-limit-counter.ts`
- **상태**: ✅ 완전히 구현됨
- **기능**:
  - `service_reservation_limits` 테이블에서 시술별 일일 한도 조회
  - 실시간 COUNT 방식으로 예약 수 계산
  - PENDING, CONFIRMED 상태의 예약만 카운트
  - `checkAvailability()`: 날짜+시술 기준 예약 가능 여부 확인
  - `canCreateReservation()`: 트랜잭션 내에서 예약 생성 가능 검증

### 2. **타임슬롯 계산 시스템** (`time-slot-calculator.ts`)
- **위치**: `/lib/reservations/time-slot-calculator.ts`
- **상태**: ✅ 완전히 구현됨
- **기능**:
  - `clinic_time_slots` 테이블에서 요일별 진료 시간 조회
  - `services` 테이블에서 시술 소요 시간 (`durationMinutes` + `bufferMinutes`) 가져옴
  - 30분 간격으로 슬롯 생성
  - 기존 예약과 겹치는지 확인 (시간 중복 방지)
  - 5분 캐시로 성능 최적화
  - `calculateAvailableTimeSlots()`: 예약 가능 시간 목록 반환
  - `validateTimeSlotAvailability()`: 특정 시간 예약 가능 검증

### 3. **Time Slots API** (`/api/public/reservations/time-slots`)
- **위치**: `/app/api/public/reservations/time-slots/route.ts`
- **상태**: ✅ 완전히 구현됨
- **기능**:
  - 특정 날짜 + 시술에 대한 예약 가능 시간대 반환
  - `time-slot-calculator.ts` 사용하여 정확한 계산
  - CORS 헤더 설정 완료
  - 캐시 헤더 (60초) 설정

### 4. **Availability API** (`/api/public/reservations/availability`)
- **위치**: `/app/api/public/reservations/availability/route.ts`
- **상태**: ✅ 완전히 구현됨
- **기능**:
  - 날짜 + 시술 기준 한도 체크
  - `daily-limit-counter.ts` 사용
  - 남은 예약 가능 수 반환

### 5. **Prisma 스키마**
- **상태**: ✅ 이중 시스템 설계 완료
- **Legacy 필드** (하위 호환):
  - `preferredTime`: "09:30" 형식
  - `service`: ServiceType enum
- **New 필드** (시간 기반 시스템):
  - `timeSlotStart`, `timeSlotEnd`: "09:00" 형식
  - `serviceId`: services 테이블 FK
  - `estimatedDuration`: 소요 시간(분)
  - `period`: MORNING/AFTERNOON

---

## ❌ 현재 문제점

### 🔴 **Critical Issue 1: 정적 페이지가 OLD API만 사용**

#### 문제 상황:
`calendar-page.html`의 예약 폼이 하드코딩된 시간대만 표시하고, 새로운 타임슬롯 API를 호출하지 못함

#### 증거:
**calendar-page.html:735-749**
```html
<select name="sh_checktime" id="sh_checktime" required>
    <option value="">예약 시간을 선택해주세요.</option>
    <option value="09:00">오전 09:00</option>
    <option value="09:30">오전 09:30</option>
    <!-- ... 중략 ... -->
    <option value="16:30">오후 04:30</option>
</select>
```

**하드코딩된 시간대**:
- 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
- 14:00, 14:30, 15:00, 15:30, 16:00, 16:30

**실제 진료 시간** (footer에 표시됨):
- 월/화/목/금: 08:30 ~ 19:30
- 수요일: 08:30 ~ 12:00
- 토요일: 09:00 ~ 14:00

#### 발견된 시도:
calendar-page.html에 `TimeSlotLoader` JavaScript 클래스가 있음 (1223-1416행):
```javascript
class TimeSlotLoader {
  constructor(config) {
    this.apiBaseURL = config.apiBaseURL || '';
    // ...
  }

  async loadTimeSlots() {
    const url = `${this.apiBaseURL}/api/public/reservations/time-slots?service=${service}&date=${date}`;
    const response = await fetch(url);
    // ...
  }
}
```

**하지만**:
1. **초기화 코드 존재** (1390-1415행):
   ```javascript
   const timeSlotLoader = new TimeSlotLoader({
       apiBaseURL: 'https://cms.one-q.xyz',
       debug: true
   });
   timeSlotLoader.init();
   ```

2. **문제**: API 호출이 **시술 선택(`sh_service`) 후**에만 실행됨
   - 날짜 선택 시: ❌ 하드코딩된 옵션 표시
   - 시술 선택 시: ✅ API 호출 시도

3. **UX 문제**:
   - 사용자가 날짜 먼저 선택 → 잘못된 시간대 표시
   - 시술 선택 후에야 → 올바른 시간대 로드

#### 영향:
- 사용자는 실제 진료 시간과 다른 옵션만 볼 수 있음
- 08:30, 17:00 이후 시간대는 아예 선택 불가
- 수요일/토요일 특별 진료 시간 미반영

---

### 🔴 **Critical Issue 2: Public Reservation API가 NEW 필드 미사용**

#### 문제 상황:
`/api/public/reservations` POST 메서드가 예약 생성 시 **LEGACY 필드만** 채움

#### 증거:
**public/reservations/route.ts:48-64**
```typescript
const reservation = await prisma.reservations.create({
  data: {
    id: `rsv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    patientName: body.patient_name,
    phone: body.phone,
    // ... 중략 ...

    // ✅ LEGACY FIELDS (채워짐)
    preferredTime: body.preferred_time,  // "09:30"
    service: body.service as ServiceType,  // "WRINKLE_BOTOX"

    // ❌ NEW FIELDS (NULL로 남음)
    serviceId: null,  // ← 채워야 함
    serviceName: null,  // ← 채워야 함
    estimatedDuration: null,  // ← 채워야 함
    period: null,  // ← MORNING/AFTERNOON 채워야 함
    timeSlotStart: null,  // ← "09:00" 채워야 함
    timeSlotEnd: null,  // ← "10:00" 채워야 함
  }
});
```

#### 필요한 수정:
1. `body.service` (ServiceType) → `services` 테이블 조회하여 `serviceId` 가져오기
2. `services.durationMinutes + bufferMinutes` → `estimatedDuration`에 저장
3. `body.preferred_time` 파싱:
   - 시간 < 12:00 → `period = MORNING`
   - 시간 ≥ 12:00 → `period = AFTERNOON`
4. `timeSlotStart` = `body.preferred_time`
5. `timeSlotEnd` = `preferred_time + estimatedDuration`

#### 영향:
- 새로 생성된 예약이 타임슬롯 계산에 **반영되지 않음**
- `time-slot-calculator.ts`는 `timeSlotStart`, `timeSlotEnd`, `estimatedDuration`을 읽음
- 이 필드들이 NULL이면 → 예약이 있어도 "예약 가능"으로 표시됨

---

### 🟡 **Medium Issue 1: Admin 페이지 OPTIONS 메서드 문제**

#### 문제 상황:
`/app/api/reservations/route.ts`의 OPTIONS 메서드가 **mock 데이터** 사용

#### 증거:
**reservations/route.ts:362-392**
```typescript
export async function OPTIONS(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const department = searchParams.get('department');

  if (!date || !department) {
    return NextResponse.json({ error: 'Date and department are required' }, { status: 400 });
  }

  // ❌ USES MOCK DATA
  const occupiedSlots = mockReservations  // ← Mock array
    .filter(r =>
      r.reservation_date === date &&
      r.department === department &&
      r.status !== 'CANCELLED'
    )
    .map(r => r.reservation_time);

  // ❌ USES HARDCODED ARRAY
  const availableSlots = timeSlots.filter(slot => !occupiedSlots.includes(slot));

  return NextResponse.json({
    date,
    department,
    availableSlots,
    totalSlots: timeSlots.length,
    occupiedSlots: occupiedSlots.length
  });
}
```

---

## 🛠️ 우선순위별 해결 방안

### **🔴 Priority 1: Public Reservation API 수정**
**파일**: `/app/api/public/reservations/route.ts`
**목표**: 예약 생성 시 NEW 필드 모두 채우기

### **🔴 Priority 2: calendar-page.html TimeSlotLoader 수정**
**파일**: `/public/static-pages/calendar-page.html`
**목표**: 날짜 선택 시에도 올바른 시간대 표시

### **🟡 Priority 3: Admin OPTIONS 메서드 수정**
**파일**: `/app/api/reservations/route.ts`
**목표**: Mock 데이터 제거, 실제 타임슬롯 API 사용

---

## 📊 시스템 아키텍처 요약

### **3-Tier 설계**:

```
┌─────────────────────────────────────────────────────┐
│ 1️⃣ Presentation Layer (Static Pages)                │
│ - calendar-page.html (misopin.one-q.xyz)            │
│ - admin/reservations/page.tsx (cms.one-q.xyz)      │
└─────────────────────────────────────────────────────┘
                      ↓ HTTP/CORS
┌─────────────────────────────────────────────────────┐
│ 2️⃣ API Layer (Next.js API Routes)                   │
│ - /api/public/reservations/* (Public APIs)         │
│ - /api/reservations (Admin APIs)                   │
│ - /api/admin/* (Admin Management)                  │
└─────────────────────────────────────────────────────┘
                      ↓ Prisma ORM
┌─────────────────────────────────────────────────────┐
│ 3️⃣ Business Logic Layer (Lib Functions)             │
│ - daily-limit-counter.ts (한도 시스템)               │
│ - time-slot-calculator.ts (타임슬롯 계산)            │
└─────────────────────────────────────────────────────┘
                      ↓ Prisma Client
┌─────────────────────────────────────────────────────┐
│ 4️⃣ Data Layer (PostgreSQL)                          │
│ - reservations (예약 정보)                           │
│ - services (시술 정보)                               │
│ - clinic_time_slots (진료 시간)                      │
│ - service_reservation_limits (한도 설정)             │
└─────────────────────────────────────────────────────┘
```

---

## 📝 결론

### **핵심 문제**:
1. 정적 페이지가 하드코딩된 시간대 사용
2. 예약 생성 시 NEW 필드 미사용
3. 타임슬롯 계산이 NEW 필드를 읽음
4. → **예약이 있어도 "예약 가능"으로 표시됨**

### **해결책**:
1. Public Reservation API에서 NEW 필드 채우기
2. calendar-page.html에서 API 호출 로직 개선
3. Admin 페이지에서 실제 API 사용 (Mock 제거)

### **기술적 우수성**:
- ✅ 시술별 한도 시스템 완벽 구현
- ✅ 타임슬롯 계산 로직 완벽 구현
- ✅ Dual Schema 설계 (하위 호환 + 신규 기능)
- ❌ 연동 부분만 미완성

이 시스템은 **설계는 탁월하지만 연동이 미완료된 상태**입니다. 위 수정사항만 적용하면 완전히 작동하는 예약 시스템이 됩니다.
