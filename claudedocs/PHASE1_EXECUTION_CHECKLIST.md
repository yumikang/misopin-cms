# Phase 1 실행 체크리스트
**인원 검증 로직 제거 → 시간 기반 검증 전환**

Quick Action Guide | 2025-11-05

---

## 📋 코드 변경 사항

### 1. /app/api/public/reservations/route.ts 수정

#### 제거할 코드
```typescript
// Line 4 - import 제거
import { canCreateReservation } from '@/lib/reservations/daily-limit-counter';

// Line 134-173 - 트랜잭션 래핑 제거
const reservation = await prisma.$transaction(async (tx) => {
  // 1. Check if reservation can be created (LEGACY)
  const canCreate = await canCreateReservation(tx, preferredDate, serviceType);

  if (!canCreate) {
    throw new Error('RESERVATION_FULL');
  }

  // 2. Create reservation
  const newReservation = await tx.reservations.create({
    data: { /* ... */ }
  });

  return newReservation;
});

// Line 198-212 - 에러 핸들링 제거
if (error instanceof Error && error.message === 'RESERVATION_FULL') {
  return NextResponse.json(
    {
      error: 'Reservation limit reached',
      message: '해당 날짜의 예약이 마감되었습니다. 다른 날짜를 선택해 주세요.'
    },
    { status: 409 }
  );
}
```

#### 변경 후 코드
```typescript
// ✅ import 제거 (Line 4 삭제)
// import { canCreateReservation } from '@/lib/reservations/daily-limit-counter'; // REMOVED

// ✅ Line 69-131: 시간 기반 검증은 그대로 유지 (이미 작동 중)
try {
  await validateTimeSlotAvailability(
    serviceType,
    preferredDate.toISOString().split('T')[0],
    timeSlotStart,
    period
  );
} catch (validationError: any) {
  if (validationError.code === 'TIME_SLOT_FULL') {
    return NextResponse.json(
      {
        error: 'Time slot not available',
        message: validationError.message,
        code: validationError.code,
        suggestedTimes: validationError.metadata?.suggestedTimes || []
      },
      { status: 409 }
    );
  }
  // Other errors: log but continue
  console.warn('Time-based validation failed:', validationError);
}

// ✅ 트랜잭션 제거, 일반 create로 변경 (Line 134 이후)
const reservation = await prisma.reservations.create({
  data: {
    id: crypto.randomUUID(),
    patientName: body.patient_name,
    phone: body.phone,
    email: body.email || null,
    birthDate: birthDate,
    gender: body.gender as Gender,
    treatmentType: body.treatment_type as TreatmentType,
    // LEGACY FIELDS (keep for compatibility)
    service: serviceType,
    preferredDate: preferredDate,
    preferredTime: body.preferred_time,
    // NEW TIME-BASED FIELDS
    serviceId: serviceId,
    serviceName: serviceName,
    estimatedDuration: estimatedDuration,
    period: period,
    timeSlotStart: timeSlotStart,
    timeSlotEnd: timeSlotEnd,
    // STATUS FIELDS
    status: 'PENDING' as ReservationStatus,
    notes: body.notes || null,
    adminNotes: null,
    statusChangedAt: new Date(),
    updatedAt: new Date()
  }
});

// ✅ RESERVATION_FULL 에러 핸들링 제거 (Line 198-212 삭제)
// Time-based validation already handles all availability checks
```

**변경 요약**:
- [ ] Line 4: canCreateReservation import 제거
- [ ] Line 134-173: 트랜잭션 제거, prisma.create()로 변경
- [ ] Line 198-212: RESERVATION_FULL 에러 핸들링 제거
- [ ] 시간 기반 검증 (Line 99-126): **유지** (이미 작동 중)

---

### 2. /app/api/public/reservations/availability/route.ts 전체 교체

#### 현재 코드 (96줄)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ServiceType } from '@prisma/client';
import { checkAvailability } from '@/lib/reservations/daily-limit-counter';

export async function GET(request: NextRequest) {
  // ... checkAvailability() 사용 중
  const availability = await checkAvailability(date, serviceTypeParam as ServiceType);

  return NextResponse.json({
    date: dateParam,
    serviceType: serviceTypeParam,
    available: availability.available,
    remaining: availability.remaining,
    currentCount: availability.currentCount,
    limit: availability.dailyLimit,
    level: availability.level,
    message,
  });
}
```

#### 변경 후 코드 (전체)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ServiceType } from '@prisma/client';
import { calculateAvailableTimeSlots } from '@/lib/reservations/time-slot-calculator';

/**
 * GET /api/public/reservations/availability
 * Check time-based availability for a specific date and service
 *
 * Query params:
 * - date: YYYY-MM-DD format
 * - serviceType: ServiceType enum value
 *
 * Returns:
 * - available: boolean (any time slots available)
 * - totalSlots: number of total time slots
 * - availableSlots: number of available time slots
 * - slots: array of time slot details
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const serviceTypeParam = searchParams.get('serviceType');

    // Validation
    if (!dateParam || !serviceTypeParam) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          details: 'Both date and serviceType are required',
        },
        { status: 400 }
      );
    }

    // Validate serviceType
    const validServiceTypes = Object.values(ServiceType);
    if (!validServiceTypes.includes(serviceTypeParam as ServiceType)) {
      return NextResponse.json(
        {
          error: 'Invalid serviceType',
          details: `serviceType must be one of: ${validServiceTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Parse date
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid date format',
          details: 'Date must be in YYYY-MM-DD format',
        },
        { status: 400 }
      );
    }

    // ✅ Use time-based calculation
    const serviceCode = serviceTypeParam as string;
    const result = await calculateAvailableTimeSlots(serviceCode, dateParam);

    const hasAvailableSlots = result.metadata.availableSlots > 0;

    // Generate user-friendly message
    const message = hasAvailableSlots
      ? `예약 가능한 시간대가 ${result.metadata.availableSlots}개 있습니다.`
      : '해당 날짜는 예약이 마감되었습니다. 다른 날짜를 선택해 주세요.';

    // Return time-based availability info
    return NextResponse.json({
      date: dateParam,
      serviceType: serviceTypeParam,
      available: hasAvailableSlots,
      totalSlots: result.metadata.totalSlots,
      availableSlots: result.metadata.availableSlots,
      bookedSlots: result.metadata.bookedSlots,
      // ✅ Include time slot details
      slots: result.slots.map(slot => ({
        time: slot.time,
        period: slot.period,
        available: slot.available,
        remaining: slot.remaining,
        total: slot.total,
        status: slot.status
      })),
      message,
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

**변경 요약**:
- [ ] import 변경: checkAvailability → calculateAvailableTimeSlots
- [ ] 전체 로직 교체: 인원 한도 → 시간대별 가용성
- [ ] 응답 구조 변경: available, remaining → available, slots[]

**⚠️ 주의**: 프론트엔드 호환성 확인 필요!

---

## 🧪 테스트 시나리오

### 테스트 1: 기본 예약 생성
```bash
curl -X POST http://localhost:3000/api/public/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "테스트환자",
    "phone": "010-1234-5678",
    "birth_date": "1990-01-01",
    "gender": "MALE",
    "treatment_type": "FIRST_VISIT",
    "service": "WRINKLE_BOTOX",
    "preferred_date": "2025-11-20",
    "preferred_time": "10:00",
    "notes": "Phase 1 테스트"
  }'

# 예상 결과: 201 Created
# { "success": true, "reservation": { "id": "...", ... } }
```
- [ ] 성공 응답 확인 (201)
- [ ] reservation.id 생성 확인
- [ ] 신규 필드 저장 확인 (serviceId, period, timeSlotStart)

---

### 테스트 2: 마감된 시간대 예약 차단
```bash
# Step 1: 특정 시간대를 capacity까지 채우기
# (clinic_time_slots 설정에 따라 다름, 예: 오전 180분, 시술 60분 → 3개까지)

# Step 2: 추가 예약 시도
curl -X POST http://localhost:3000/api/public/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "preferred_date": "2025-11-20",
    "preferred_time": "10:00",
    ...
  }'

# 예상 결과: 409 Conflict
# {
#   "error": "Time slot not available",
#   "message": "해당 시간대 예약이 마감되었습니다",
#   "code": "TIME_SLOT_FULL",
#   "suggestedTimes": ["10:30", "11:00", ...]
# }
```
- [ ] 409 에러 반환
- [ ] suggestedTimes 배열 포함
- [ ] 명확한 에러 메시지

---

### 테스트 3: 동시 예약 경쟁 상태
```bash
# 동일 시간대 3개 동시 요청 (capacity=2 가정)
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/public/reservations \
    -H "Content-Type: application/json" \
    -d '{
      "patient_name": "동시테스트'$i'",
      "preferred_date": "2025-11-21",
      "preferred_time": "14:00",
      ...
    }' &
done
wait

# 예상 결과: 2개 성공(201), 1개 실패(409)
```
- [ ] 정확히 capacity만큼 성공
- [ ] 초과 요청은 409 에러
- [ ] 중복 예약 없음

---

### 테스트 4: 가용성 조회 (API 응답 변경)
```bash
curl -X GET "http://localhost:3000/api/public/reservations/availability?date=2025-11-20&serviceType=WRINKLE_BOTOX"

# 예상 결과: 200 OK
# {
#   "date": "2025-11-20",
#   "serviceType": "WRINKLE_BOTOX",
#   "available": true,
#   "totalSlots": 12,
#   "availableSlots": 8,
#   "bookedSlots": 4,
#   "slots": [
#     {
#       "time": "09:00",
#       "period": "MORNING",
#       "available": true,
#       "remaining": 140,
#       "total": 180,
#       "status": "available"
#     },
#     ...
#   ],
#   "message": "예약 가능한 시간대가 8개 있습니다."
# }
```
- [ ] 응답 구조 변경 확인
- [ ] slots 배열 포함
- [ ] totalSlots, availableSlots 계산 정확성

---

### 테스트 5: 기존 예약 조회 (레거시 호환성)
```sql
-- 기존 예약 데이터 조회
SELECT id, service, preferredDate, preferredTime, status
FROM reservations
WHERE status IN ('PENDING', 'CONFIRMED')
  AND preferredDate >= CURRENT_DATE
ORDER BY preferredDate, preferredTime
LIMIT 10;

-- 예상 결과: 모든 레코드 정상 조회
-- service (enum) 필드 정상 표시
```
- [ ] 기존 예약 데이터 100% 조회 가능
- [ ] service enum 필드 정상 작동

---

### 테스트 6: 신규 예약 필드 저장
```sql
-- Phase 1 이후 생성된 예약 검증
SELECT
  id,
  service,              -- 레거시 필드
  serviceId,            -- 신규 필드
  serviceName,          -- 신규 필드
  period,               -- 신규 필드
  timeSlotStart,        -- 신규 필드
  timeSlotEnd,          -- 신규 필드
  estimatedDuration,    -- 신규 필드
  createdAt
FROM reservations
WHERE createdAt > NOW() - INTERVAL '1 hour'
ORDER BY createdAt DESC;

-- 예상 결과: 모든 신규 필드 NULL 아님
```
- [ ] 신규 필드 모두 저장됨
- [ ] 레거시 필드도 함께 저장됨 (dual-write)

---

### 테스트 7: 캐시 효과 측정
```bash
# 동일 날짜 100번 조회
for i in {1..100}; do
  curl -X GET "http://localhost:3000/api/public/reservations/availability?date=2025-11-20&serviceType=WRINKLE_BOTOX"
done

# 로그 확인: 데이터베이스 쿼리 횟수 체크
# 예상: ~20회 쿼리 (캐시 TTL=5분, 100회 중 80회 캐시 히트)
```
- [ ] 캐시 히트율 > 80%
- [ ] 평균 응답 시간 < 50ms

---

## 📊 모니터링 포인트

### 배포 후 1시간
- [ ] 예약 생성 성공률 체크 (목표: >99%)
- [ ] 에러 로그 확인 (409 TIME_SLOT_FULL 외 에러 없음)
- [ ] 응답 시간 측정 (목표: <200ms)

### 배포 후 24시간
- [ ] 일일 예약 건수 집계
- [ ] 동시 예약 충돌 건수 (목표: 0건)
- [ ] 고객 불만 티켓 확인 (목표: 0건)

### 배포 후 7일
- [ ] 주간 성공률 평균 (목표: >99%)
- [ ] 캐시 히트율 평균 (목표: >80%)
- [ ] Phase 1 완료 평가 회의 (11/15)

---

## 🔴 Rollback 트리거

즉시 Rollback이 필요한 상황:
- [ ] 예약 생성 성공률 < 90% (1시간 기준)
- [ ] 중복 예약 발견 (2건 이상)
- [ ] 시스템 오류로 인한 서비스 중단
- [ ] 데이터 손실 징후 발견

Rollback 고려가 필요한 상황:
- [ ] 예약 성공률 95-98% (24시간 기준)
- [ ] 고객 불만 > 5건/일
- [ ] 응답 시간 > 500ms 지속

---

## 📝 변경 사항 요약

| 파일 | 변경 내용 | 영향도 |
|------|-----------|--------|
| `/app/api/public/reservations/route.ts` | canCreateReservation() 제거, 트랜잭션 제거 | 🔴 High |
| `/app/api/public/reservations/availability/route.ts` | 전체 로직 교체 (인원→시간 기반) | 🔴 High |
| `lib/reservations/daily-limit-counter.ts` | 사용 중단 (파일 유지) | 🟢 Low |
| 프론트엔드 | API 응답 구조 변경 대응 필요 | 🟡 Medium |

---

## ✅ 배포 전 최종 체크리스트

- [ ] 코드 리뷰 완료 (2명 승인)
- [ ] 단위 테스트 통과 (npm test)
- [ ] Staging 환경 배포 완료
- [ ] 테스트 시나리오 1-7 모두 통과
- [ ] 모니터링 대시보드 구성
- [ ] Rollback 절차 숙지 (팀 전체)
- [ ] 고객 지원팀 상황 공유
- [ ] 배포 시간 확정 (11/12 화 08:00)

---

## 📞 비상 연락망

**개발팀**
- Lead: [이름] - [연락처]
- Backend: [이름] - [연락처]

**DevOps**
- [이름] - [연락처]

**고객 지원**
- [이름] - [연락처]

**배포 당일 On-call**
- 08:00-12:00: [이름]
- 12:00-18:00: [이름]

---

**작성**: Claude (Phase 1 Execution Guide)
**날짜**: 2025-11-05
**상태**: ✅ 실행 준비 완료
**다음 단계**: 코드 변경 PR 생성 → 팀 리뷰 → Staging 배포
