# MVP 구현 계획 - 시간 기반 예약 시스템

**작성일**: 2025-11-04
**목표**: 2주 내 핵심 기능 프로덕션 배포
**원칙**: 빠른 MVP → 점진적 개선

---

## 🎯 현실 체크

### 현재 상황
- ✅ 다른 프로젝트 진행 중 (사주, 법적 분쟁 등)
- ✅ 풀타임 투입 불가능
- ✅ 빠른 검증과 피드백 필요

### 치명적 버그
```
현재 시스템:
- 주름/보톡스 10건 × 40분 = 400분 ✅ 허용
- 피부케어 5건 × 70분 = 350분 ✅ 허용
→ 총 750분 예약 가능 (실제 480분만 가능) 🔴

오버부킹: 270분 (4.5시간!) 😱
```

**결론**: 빠르게 고쳐야 함!

---

## 📅 2주 MVP 계획

### Week 1: 핵심 기능 구현

#### Day 1-2: DB 마이그레이션 + 데이터 이전

**목표**: 새 스키마 적용 및 기존 데이터 보존

```bash
# 1. 백업 (필수!)
pg_dump -h 141.164.60.51 -U misopin_user misopin_cms > backup_$(date +%Y%m%d).sql

# 2. 작업 브랜치
git checkout -b feature/time-based-reservation-mvp

# 3. 스키마 수정
# prisma/schema.prisma 편집
```

**변경 사항**:
```prisma
// 1. Service 동적 테이블 추가
model Service {
  id                String   @id @default(cuid())
  code              String   @unique
  name              String
  durationMinutes   Int      @default(30)
  bufferMinutes     Int      @default(10)
  isActive          Boolean  @default(true)
  displayOrder      Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  reservations      Reservation[]

  @@map("services")
}

// 2. ClinicTimeSlot 추가
model ClinicTimeSlot {
  id              String   @id @default(cuid())
  dayOfWeek       Int      // 0=일, 1=월, ..., 6=토
  period          Period
  startTime       String   // "09:00"
  endTime         String   // "12:00"
  totalMinutes    Int
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([dayOfWeek, period])
  @@map("clinic_time_slots")
}

enum Period {
  MORNING
  AFTERNOON
}

// 3. Reservation 수정 (additive - 기존 필드 유지!)
model Reservation {
  // ... 기존 필드들 유지 ...
  service              ServiceType?  // 기존 유지 (나중에 제거)

  // 새 필드 추가
  serviceId            String?
  serviceModel         Service?   @relation(fields: [serviceId], references: [id])
  serviceName          String?    // 스냅샷
  estimatedDuration    Int?       // 분 단위
  period               Period?    // MORNING, AFTERNOON

  // ... 기존 필드들 유지 ...
}
```

**마이그레이션 스크립트**:
```sql
-- 1단계: 새 테이블 생성
CREATE TABLE "services" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 2단계: 기존 enum 데이터 → 새 테이블로 시드
INSERT INTO "services" (id, code, name, "durationMinutes", "bufferMinutes", "displayOrder")
VALUES
  (gen_random_uuid(), 'WRINKLE_BOTOX', '주름/보톡스', 30, 10, 1),
  (gen_random_uuid(), 'VOLUME_LIFTING', '볼륨/리프팅', 45, 15, 2),
  (gen_random_uuid(), 'SKIN_CARE', '피부케어', 60, 10, 3),
  (gen_random_uuid(), 'REMOVAL_PROCEDURE', '제거시술', 40, 10, 4),
  (gen_random_uuid(), 'BODY_CARE', '바디케어', 50, 10, 5),
  (gen_random_uuid(), 'OTHER_CONSULTATION', '기타 상담', 20, 5, 6);

-- 3단계: 진료 시간대 설정 (월-금 기준)
CREATE TABLE "clinic_time_slots" (
  "id" TEXT PRIMARY KEY,
  "dayOfWeek" INTEGER NOT NULL,
  "period" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "totalMinutes" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("dayOfWeek", "period")
);

-- 월요일 ~ 금요일 오전/오후
INSERT INTO "clinic_time_slots" (id, "dayOfWeek", period, "startTime", "endTime", "totalMinutes")
VALUES
  -- 월요일
  (gen_random_uuid(), 1, 'MORNING', '09:00', '12:00', 180),
  (gen_random_uuid(), 1, 'AFTERNOON', '13:00', '18:00', 300),
  -- 화요일
  (gen_random_uuid(), 2, 'MORNING', '09:00', '12:00', 180),
  (gen_random_uuid(), 2, 'AFTERNOON', '13:00', '18:00', 300),
  -- 수요일
  (gen_random_uuid(), 3, 'MORNING', '09:00', '12:00', 180),
  (gen_random_uuid(), 3, 'AFTERNOON', '13:00', '18:00', 300),
  -- 목요일
  (gen_random_uuid(), 4, 'MORNING', '09:00', '12:00', 180),
  (gen_random_uuid(), 4, 'AFTERNOON', '13:00', '18:00', 300),
  -- 금요일
  (gen_random_uuid(), 5, 'MORNING', '09:00', '12:00', 180),
  (gen_random_uuid(), 5, 'AFTERNOON', '13:00', '18:00', 300);

-- 4단계: Reservation 테이블에 새 컬럼 추가 (nullable!)
ALTER TABLE "reservations" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "serviceName" TEXT;
ALTER TABLE "reservations" ADD COLUMN "estimatedDuration" INTEGER;
ALTER TABLE "reservations" ADD COLUMN "period" TEXT;

-- 5단계: 기존 예약 데이터 마이그레이션
UPDATE "reservations" r
SET
  "serviceId" = s.id,
  "serviceName" = s.name,
  "estimatedDuration" = s."durationMinutes" + s."bufferMinutes",
  "period" = CASE
    WHEN EXTRACT(HOUR FROM r."preferredTime"::time) < 12 THEN 'MORNING'
    ELSE 'AFTERNOON'
  END
FROM "services" s
WHERE r.service::text = s.code;

-- 6단계: 외래 키 추가 (nullable - 기존 데이터 보호)
ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "services"("id");

-- 7단계: 인덱스 추가 (성능)
CREATE INDEX "reservations_serviceId_preferredDate_status_idx"
ON "reservations"("serviceId", "preferredDate", "status");

CREATE INDEX "reservations_preferredDate_period_status_idx"
ON "reservations"("preferredDate", "period", "status");
```

**롤백 스크립트** (문제 시):
```sql
-- 1. 외래 키 제거
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_serviceId_fkey";

-- 2. 인덱스 제거
DROP INDEX IF EXISTS "reservations_serviceId_preferredDate_status_idx";
DROP INDEX IF EXISTS "reservations_preferredDate_period_status_idx";

-- 3. 새 컬럼 제거
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "serviceId";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "serviceName";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "estimatedDuration";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "period";

-- 4. 새 테이블 제거
DROP TABLE IF EXISTS "clinic_time_slots";
DROP TABLE IF EXISTS "services";

-- 5. Enum 제거 (나중에)
-- DROP TYPE IF EXISTS "Period";
```

**검증 체크리스트**:
```sql
-- ✅ 시술 데이터 확인
SELECT * FROM services ORDER BY "displayOrder";
-- 결과: 6개 행

-- ✅ 시간대 데이터 확인
SELECT * FROM clinic_time_slots ORDER BY "dayOfWeek", period;
-- 결과: 10개 행 (월~금 × 오전/오후)

-- ✅ 기존 예약 마이그레이션 확인
SELECT
  id,
  service,           -- 기존 enum
  "serviceId",       -- 새 FK
  "serviceName",     -- 스냅샷
  "estimatedDuration",
  period
FROM reservations
WHERE "serviceId" IS NULL;
-- 결과: 0개 행 (모두 마이그레이션됨)

-- ✅ 데이터 무결성 확인
SELECT COUNT(*) FROM reservations WHERE service IS NOT NULL AND "serviceId" IS NULL;
-- 결과: 0 (모든 기존 예약에 serviceId 매핑됨)
```

**예상 시간**: 6-8시간 (신중하게!)

---

#### Day 3-4: 핵심 로직 구현 + 테스트

**목표**: 시간 기반 가용성 계산 로직 완성

**파일 생성**: `lib/reservations/time-based-availability.ts`

```typescript
// lib/reservations/time-based-availability.ts

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

export type Period = 'MORNING' | 'AFTERNOON';

interface TimeSlotAvailability {
  date: Date;
  period: Period;
  totalMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
  isAvailable: boolean;
}

/**
 * 특정 날짜/시간대의 실시간 가용 시간 계산
 */
export async function calculateTimeSlotAvailability(
  date: Date,
  period: Period
): Promise<TimeSlotAvailability> {
  const dayOfWeek = date.getDay();

  // 1. 해당 시간대 설정 가져오기
  const timeSlot = await prisma.clinicTimeSlot.findUnique({
    where: {
      dayOfWeek_period: {
        dayOfWeek,
        period
      }
    }
  });

  if (!timeSlot || !timeSlot.isActive) {
    throw new Error(`${period === 'MORNING' ? '오전' : '오후'} 진료 시간이 아닙니다`);
  }

  // 2. 해당 날짜/시간대의 모든 확정된 예약 가져오기
  const reservations = await prisma.reservation.findMany({
    where: {
      preferredDate: {
        gte: startOfDay(date),
        lt: endOfDay(date)
      },
      period: period,
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    },
    select: {
      estimatedDuration: true
    }
  });

  // 3. 이미 소비된 시간 합산
  const consumedMinutes = reservations.reduce(
    (sum, res) => sum + (res.estimatedDuration || 0),
    0
  );

  const remainingMinutes = timeSlot.totalMinutes - consumedMinutes;

  return {
    date,
    period,
    totalMinutes: timeSlot.totalMinutes,
    consumedMinutes,
    remainingMinutes,
    isAvailable: remainingMinutes > 0
  };
}

/**
 * 특정 시술이 예약 가능한지 체크
 */
export async function canBookService(
  date: Date,
  period: Period,
  serviceId: string
): Promise<{
  available: boolean;
  remainingMinutes: number;
  requiredMinutes: number;
  message: string;
}> {
  // 1. 시술 소요 시간 가져오기
  const service = await prisma.service.findUnique({
    where: { id: serviceId }
  });

  if (!service || !service.isActive) {
    return {
      available: false,
      remainingMinutes: 0,
      requiredMinutes: 0,
      message: '해당 시술은 현재 제공하지 않습니다'
    };
  }

  const requiredMinutes = service.durationMinutes + service.bufferMinutes;

  // 2. 현재 시간대 가용성 체크
  const availability = await calculateTimeSlotAvailability(date, period);

  // 3. 남은 시간으로 이 시술이 가능한가?
  const available = availability.remainingMinutes >= requiredMinutes;

  return {
    available,
    remainingMinutes: availability.remainingMinutes,
    requiredMinutes,
    message: available
      ? `예약 가능합니다 (남은 시간: ${availability.remainingMinutes}분)`
      : `시간이 부족합니다 (필요: ${requiredMinutes}분, 남음: ${availability.remainingMinutes}분)`
  };
}

/**
 * 트랜잭션 내에서 예약 생성 전 최종 체크 (동시성 안전)
 */
export async function canCreateReservationWithTimeCheck(
  tx: Prisma.TransactionClient,
  date: Date,
  period: Period,
  serviceId: string
): Promise<boolean> {
  // 시술 정보
  const service = await tx.service.findUnique({
    where: { id: serviceId }
  });

  if (!service || !service.isActive) return false;

  const requiredMinutes = service.durationMinutes + service.bufferMinutes;
  const dayOfWeek = date.getDay();

  // 시간대 설정
  const timeSlot = await tx.clinicTimeSlot.findUnique({
    where: {
      dayOfWeek_period: { dayOfWeek, period }
    }
  });

  if (!timeSlot || !timeSlot.isActive) return false;

  // 현재 소비된 시간 계산 (트랜잭션 내에서 락)
  const reservations = await tx.reservation.findMany({
    where: {
      preferredDate: {
        gte: startOfDay(date),
        lt: endOfDay(date)
      },
      period: period,
      status: { in: ['PENDING', 'CONFIRMED'] }
    },
    select: {
      estimatedDuration: true
    }
  });

  const consumedMinutes = reservations.reduce(
    (sum, res) => sum + (res.estimatedDuration || 0),
    0
  );

  const remainingMinutes = timeSlot.totalMinutes - consumedMinutes;

  return remainingMinutes >= requiredMinutes;
}
```

**테스트 파일**: `lib/reservations/__tests__/time-based-availability.test.ts`

```typescript
import { calculateTimeSlotAvailability, canBookService } from '../time-based-availability';
import { prisma } from '@/lib/prisma';

describe('Time-Based Availability', () => {
  beforeEach(async () => {
    // 테스트 데이터 초기화
    await prisma.reservation.deleteMany({});
  });

  describe('calculateTimeSlotAvailability', () => {
    it('빈 시간대는 전체 시간이 가용해야 함', async () => {
      const date = new Date('2025-11-15'); // 금요일
      const result = await calculateTimeSlotAvailability(date, 'MORNING');

      expect(result.totalMinutes).toBe(180);
      expect(result.consumedMinutes).toBe(0);
      expect(result.remainingMinutes).toBe(180);
      expect(result.isAvailable).toBe(true);
    });

    it('예약된 시간은 차감되어야 함', async () => {
      const date = new Date('2025-11-15');
      const serviceId = await getServiceId('WRINKLE_BOTOX');

      // 40분 예약 생성
      await prisma.reservation.create({
        data: {
          serviceId,
          serviceName: '주름/보톡스',
          estimatedDuration: 40,
          period: 'MORNING',
          preferredDate: date,
          preferredTime: '09:00',
          status: 'CONFIRMED',
          // ... 필수 필드들
        }
      });

      const result = await calculateTimeSlotAvailability(date, 'MORNING');

      expect(result.consumedMinutes).toBe(40);
      expect(result.remainingMinutes).toBe(140);
    });

    it('취소된 예약은 시간에 포함하지 않아야 함', async () => {
      const date = new Date('2025-11-15');
      const serviceId = await getServiceId('WRINKLE_BOTOX');

      await prisma.reservation.create({
        data: {
          serviceId,
          serviceName: '주름/보톡스',
          estimatedDuration: 40,
          period: 'MORNING',
          preferredDate: date,
          preferredTime: '09:00',
          status: 'CANCELLED', // 취소됨
          // ...
        }
      });

      const result = await calculateTimeSlotAvailability(date, 'MORNING');

      expect(result.consumedMinutes).toBe(0); // 취소는 카운트 안 됨
      expect(result.remainingMinutes).toBe(180);
    });
  });

  describe('canBookService', () => {
    it('시간이 충분하면 예약 가능해야 함', async () => {
      const date = new Date('2025-11-15');
      const serviceId = await getServiceId('WRINKLE_BOTOX');

      const result = await canBookService(date, 'MORNING', serviceId);

      expect(result.available).toBe(true);
      expect(result.requiredMinutes).toBe(40); // 30 + 10
    });

    it('시간이 부족하면 예약 불가해야 함', async () => {
      const date = new Date('2025-11-15');
      const serviceId = await getServiceId('SKIN_CARE');

      // 오전 시간 거의 다 채우기 (140분 사용)
      await createMultipleReservations(date, 'MORNING', 140);

      const result = await canBookService(date, 'MORNING', serviceId);

      expect(result.available).toBe(false); // 70분 필요한데 40분만 남음
      expect(result.remainingMinutes).toBe(40);
      expect(result.requiredMinutes).toBe(70);
    });
  });
});

// Helper functions
async function getServiceId(code: string): Promise<string> {
  const service = await prisma.service.findUnique({
    where: { code }
  });
  return service!.id;
}
```

**수동 테스트 스크립트**: `scripts/test-time-availability.ts`

```typescript
// scripts/test-time-availability.ts
import { calculateTimeSlotAvailability, canBookService } from '../lib/reservations/time-based-availability';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('🧪 시간 기반 가용성 테스트\n');

  const testDate = new Date('2025-11-15'); // 금요일

  // Test 1: 빈 시간대
  console.log('Test 1: 빈 오전 시간대');
  const morning = await calculateTimeSlotAvailability(testDate, 'MORNING');
  console.log(morning);
  console.log('✅ 예상: 180분 전체 가용\n');

  // Test 2: 예약 생성 후
  console.log('Test 2: 주름/보톡스 3건 예약 후');
  const service = await prisma.service.findUnique({
    where: { code: 'WRINKLE_BOTOX' }
  });

  // 3건 예약 (각 40분 = 120분)
  for (let i = 0; i < 3; i++) {
    await prisma.reservation.create({
      data: {
        serviceId: service!.id,
        serviceName: service!.name,
        estimatedDuration: 40,
        period: 'MORNING',
        preferredDate: testDate,
        preferredTime: `09:${i * 45}`,
        status: 'CONFIRMED',
        name: `테스트 환자 ${i + 1}`,
        phone: '010-0000-0000',
        // ... 필수 필드
      }
    });
  }

  const morningAfter = await calculateTimeSlotAvailability(testDate, 'MORNING');
  console.log(morningAfter);
  console.log('✅ 예상: 120분 사용, 60분 남음\n');

  // Test 3: 각 시술 예약 가능 여부 체크
  console.log('Test 3: 각 시술 예약 가능 여부');
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' }
  });

  for (const svc of services) {
    const check = await canBookService(testDate, 'MORNING', svc.id);
    console.log(`${svc.name} (${check.requiredMinutes}분): ${check.available ? '✅ 가능' : '❌ 불가'} - ${check.message}`);
  }

  console.log('\n🎉 테스트 완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**실행**:
```bash
# 단위 테스트
npm run test -- time-based-availability

# 수동 테스트
npx tsx scripts/test-time-availability.ts
```

**예상 시간**: 8-10시간

---

#### Day 5: 예약 API 통합 + 검증

**목표**: 실제 예약 생성 시 시간 검증 적용

**파일 수정**: `app/api/public/reservations/route.ts`

```typescript
// app/api/public/reservations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canCreateReservationWithTimeCheck } from '@/lib/reservations/time-based-availability';
import { startOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      service_code,  // "WRINKLE_BOTOX" 같은 코드
      preferred_date,
      preferred_time,
      name,
      phone,
      // ... 나머지 필드들
    } = body;

    // 1. 날짜/시간 파싱
    const date = new Date(preferred_date);
    const hour = parseInt(preferred_time.split(':')[0]);
    const period = hour < 12 ? 'MORNING' : 'AFTERNOON';

    // 2. 시술 정보 조회
    const service = await prisma.service.findUnique({
      where: { code: service_code }
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 시술입니다' },
        { status: 400 }
      );
    }

    // 3. 트랜잭션으로 예약 생성 (동시성 안전)
    const reservation = await prisma.$transaction(async (tx) => {
      // 시간 기반 가용성 최종 체크
      const canBook = await canCreateReservationWithTimeCheck(
        tx,
        date,
        period,
        service.id
      );

      if (!canBook) {
        throw new Error('해당 시간대에 예약 가능한 시간이 부족합니다');
      }

      // 예약 생성
      return await tx.reservation.create({
        data: {
          serviceId: service.id,
          serviceName: service.name,
          estimatedDuration: service.durationMinutes + service.bufferMinutes,
          period,
          preferredDate: date,
          preferredTime: preferred_time,
          name,
          phone,
          status: 'PENDING',
          // ... 나머지 필드들
        }
      });
    }, {
      isolationLevel: 'Serializable', // 최고 수준 격리
      timeout: 10000, // 10초 타임아웃
    });

    return NextResponse.json(
      {
        success: true,
        reservation,
        message: '예약이 성공적으로 접수되었습니다'
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Reservation error:', error);

    // 시간 부족 에러
    if (error.message?.includes('시간이 부족')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 } // Conflict
      );
    }

    // 일반 에러
    return NextResponse.json(
      { success: false, error: '예약 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

**검증 테스트**:
```bash
# Postman / curl로 테스트
curl -X POST http://localhost:3002/api/public/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "service_code": "WRINKLE_BOTOX",
    "preferred_date": "2025-11-15",
    "preferred_time": "09:00",
    "name": "홍길동",
    "phone": "010-1234-5678"
  }'

# 예상 응답
{
  "success": true,
  "reservation": { ... },
  "message": "예약이 성공적으로 접수되었습니다"
}
```

**동시성 테스트** (중요!):
```typescript
// scripts/test-concurrent-booking.ts
async function testConcurrentBooking() {
  const date = '2025-11-15';
  const time = '09:00';

  // 동시에 10건 예약 시도
  const promises = Array(10).fill(null).map((_, i) =>
    fetch('http://localhost:3002/api/public/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_code: 'WRINKLE_BOTOX',
        preferred_date: date,
        preferred_time: time,
        name: `테스트${i}`,
        phone: `010-0000-000${i}`
      })
    })
  );

  const results = await Promise.all(promises);
  const successes = results.filter(r => r.status === 201);
  const conflicts = results.filter(r => r.status === 409);

  console.log(`✅ 성공: ${successes.length}건`);
  console.log(`❌ 시간 부족: ${conflicts.length}건`);
  console.log('예상: 4-5건 성공 (180분 / 40분), 나머지 실패');
}
```

**예상 시간**: 6-8시간

---

### Week 2: Admin 기능 (최소)

#### Day 1-2: 시술 CRUD API

**목표**: 시술 추가/수정/삭제 API만 구현 (Admin UI는 간단하게)

**파일 생성**: `app/api/admin/services/route.ts`

```typescript
// app/api/admin/services/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 전체 시술 목록
export async function GET(request: NextRequest) {
  try {
    const services = await prisma.service.findMany({
      where: { },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      services
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 새 시술 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      durationMinutes,
      bufferMinutes = 10,
      displayOrder = 0
    } = body;

    // Validation
    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: '코드와 이름은 필수입니다' },
        { status: 400 }
      );
    }

    if (durationMinutes < 1 || durationMinutes > 480) {
      return NextResponse.json(
        { success: false, error: '시술 시간은 1~480분이어야 합니다' },
        { status: 400 }
      );
    }

    // 중복 체크
    const existing = await prisma.service.findUnique({
      where: { code }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 시술 코드입니다' },
        { status: 409 }
      );
    }

    const service = await prisma.service.create({
      data: {
        code,
        name,
        durationMinutes,
        bufferMinutes,
        displayOrder
      }
    });

    return NextResponse.json({
      success: true,
      service,
      message: `${name} 시술이 추가되었습니다`
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**파일 생성**: `app/api/admin/services/[id]/route.ts`

```typescript
// 단일 시술 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      service,
      message: '시술 정보가 수정되었습니다'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 시술 비활성화 (삭제 아님!)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 예약 확인
    const count = await prisma.reservation.count({
      where: {
        serviceId: id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    if (count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `진행 중인 예약이 ${count}건 있습니다. 비활성화만 가능합니다.`
        },
        { status: 409 }
      );
    }

    // 비활성화
    const service = await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      service,
      message: '시술이 비활성화되었습니다'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**예상 시간**: 4-6시간

---

#### Day 3-4: 간단한 Admin UI

**목표**: 시술 추가/수정만 가능한 최소 UI

**파일 생성**: `app/admin/services/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface Service {
  id: string;
  code: string;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  displayOrder: number;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const res = await fetch('/api/admin/services');
    const data = await res.json();
    if (data.success) {
      setServices(data.services);
    }
  };

  const handleSave = async (formData: Partial<Service>) => {
    try {
      const url = editing
        ? `/api/admin/services/${editing.id}`
        : '/api/admin/services';

      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setShowForm(false);
        setEditing(null);
        fetchServices();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">시술 관리</h1>
        <Button onClick={() => {
          setEditing(null);
          setShowForm(true);
        }}>
          새 시술 추가
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>시술명</TableHead>
            <TableHead>코드</TableHead>
            <TableHead className="text-right">시술시간</TableHead>
            <TableHead className="text-right">준비시간</TableHead>
            <TableHead className="text-right">총 소요</TableHead>
            <TableHead className="text-center">상태</TableHead>
            <TableHead className="text-center">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {service.code}
                </code>
              </TableCell>
              <TableCell className="text-right">{service.durationMinutes}분</TableCell>
              <TableCell className="text-right">{service.bufferMinutes}분</TableCell>
              <TableCell className="text-right font-semibold">
                {service.durationMinutes + service.bufferMinutes}분
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={service.isActive}
                  onCheckedChange={async (checked) => {
                    const res = await fetch(`/api/admin/services/${service.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isActive: checked })
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast.success(checked ? '활성화됨' : '비활성화됨');
                      fetchServices();
                    }
                  }}
                />
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(service);
                    setShowForm(true);
                  }}
                >
                  수정
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 간단한 모달 폼 (Dialog 사용) */}
      {showForm && (
        <ServiceFormDialog
          service={editing}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// 간단한 폼 컴포넌트
function ServiceFormDialog({ service, onSave, onClose }) {
  const [formData, setFormData] = useState({
    code: service?.code || '',
    name: service?.name || '',
    durationMinutes: service?.durationMinutes || 30,
    bufferMinutes: service?.bufferMinutes || 10,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">
          {service ? '시술 수정' : '새 시술 추가'}
        </h2>

        <div className="space-y-4">
          <div>
            <Label>시술 코드</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              disabled={!!service}
              placeholder="WRINKLE_BOTOX"
            />
          </div>

          <div>
            <Label>시술명</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="주름/보톡스"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>시술 시간 (분)</Label>
              <Input
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>준비 시간 (분)</Label>
              <Input
                type="number"
                value={formData.bufferMinutes}
                onChange={(e) => setFormData({ ...formData, bufferMinutes: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => onSave(formData)}>
            {service ? '수정' : '추가'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**예상 시간**: 6-8시간

---

#### Day 5: 프로덕션 배포 + 모니터링

**목표**: 스테이징 검증 → 프로덕션 배포

**배포 체크리스트**:
```bash
# 1. 로컬 테스트 완료
✅ 단위 테스트 통과
✅ 통합 테스트 통과
✅ 수동 시나리오 테스트
✅ 동시성 테스트

# 2. 스테이징 배포 (있다면)
✅ DB 마이그레이션 성공
✅ 시드 데이터 확인
✅ API 동작 확인
✅ Admin UI 동작 확인

# 3. 프로덕션 배포
✅ DB 백업 완료
✅ 롤백 스크립트 준비
✅ 점검 시간 공지
✅ 마이그레이션 실행
✅ 검증 테스트
✅ 모니터링 설정
```

**프로덕션 배포 순서**:
```bash
# 1. SSH 접속
ssh root@cms.one-q.xyz

# 2. 백업
pg_dump -h 141.164.60.51 -U misopin_user misopin_cms > backup_production_$(date +%Y%m%d_%H%M%S).sql

# 3. 코드 배포
cd /var/www/misopin-cms
git pull origin main
npm install
npm run build

# 4. 마이그레이션 실행
npx prisma migrate deploy

# 5. PM2 재시작
pm2 restart misopin-cms

# 6. 검증
curl http://localhost:3001/api/admin/services
# 예상: 6개 시술 데이터

# 7. 모니터링
pm2 logs misopin-cms --lines 100
```

**모니터링 포인트**:
- ❌ 에러 로그 확인
- ⏱️ API 응답 시간 (<100ms 목표)
- 📊 예약 생성 성공률 (>95% 목표)
- 🔒 동시성 충돌 빈도

**예상 시간**: 4-6시간 (신중하게!)

---

## ✅ MVP 완성 체크리스트

### Week 1 완료 기준
- [x] DB 마이그레이션 성공
- [x] Service 테이블에 6개 시술 존재
- [x] ClinicTimeSlot 테이블에 시간대 설정됨
- [x] calculateTimeSlotAvailability() 함수 동작
- [x] canBookService() 함수 동작
- [x] 예약 API에 시간 검증 통합
- [x] 단위 테스트 5개 이상 통과
- [x] 동시성 테스트 통과

### Week 2 완료 기준
- [x] 시술 CRUD API 동작
- [x] Admin UI에서 시술 추가 가능
- [x] Admin UI에서 시술 수정 가능
- [x] Admin UI에서 시술 활성화/비활성화 가능
- [x] 프로덕션 배포 성공
- [x] 실제 예약 1건 테스트 성공
- [x] 오버부킹 발생하지 않음 확인

---

## 🚀 Week 3-4: 점진적 개선 (여유 있을 때)

### 우선순위 1: 실시간 대시보드 (선택)
```typescript
// app/admin/reservations/availability/page.tsx
export default function AvailabilityDashboard() {
  return (
    <div>
      {/* 오늘 오전/오후 진행바 */}
      {/* 이번 주 통계 */}
      {/* 예약 가능한 시술 목록 */}
    </div>
  );
}
```

### 우선순위 2: 시간대 설정 UI (선택)
```typescript
// app/admin/clinic/time-slots/page.tsx
export default function TimeSlotSettings() {
  return (
    <div>
      {/* 요일별 시간대 설정 */}
      {/* 휴무일 설정 */}
    </div>
  );
}
```

### 우선순위 3: 통계 및 분석 (선택)
- 시술별 예약 추이
- 시간대별 이용률
- 의사 가용 시간 통계

---

## ⚠️ 주의사항 및 위험 관리

### Critical ⛔
1. **절대 기존 예약 데이터 손실 금지**
   - 마이그레이션 전 백업 필수
   - 롤백 스크립트 테스트 필수

2. **점진적 배포**
   - 기존 service enum 필드 유지 (당분간)
   - 새 serviceId 필드 nullable 유지
   - Feature flag로 전환 (환경변수)

3. **동시성 보장**
   - Serializable 트랜잭션 필수
   - 타임아웃 10초 설정
   - 실패 시 명확한 에러 메시지

### Important 🟡
1. **성능 모니터링**
   - calculateTimeSlotAvailability() < 50ms
   - 예약 생성 API < 200ms
   - DB 쿼리 인덱스 확인

2. **사용자 피드백**
   - 의사 선생님 테스트 기간 설정
   - 실제 사용자 피드백 수렴
   - 빠른 버그 픽스

### Recommended 🟢
1. **점진적 개선**
   - MVP 먼저 완성
   - 실제 사용하면서 개선점 발견
   - 우선순위 재조정

2. **문서화**
   - API 사용법 간단히 정리
   - 운영 가이드 작성
   - 트러블슈팅 가이드

---

## 📊 성공 지표

### Week 1 목표
- ✅ 오버부킹 0건
- ✅ 마이그레이션 에러 0건
- ✅ 기존 예약 데이터 100% 보존

### Week 2 목표
- ✅ 시술 관리 개발자 개입 0회
- ✅ 프로덕션 배포 성공
- ✅ 실제 예약 테스트 성공

### Long-term 목표
- 📈 시스템 가용률 99.9%
- 📉 예약 실패율 <1%
- ⚡ API 응답 시간 <100ms

---

## 🎯 다음 단계

**지금 시작한다면**:
```bash
# 1. 브랜치 생성 (5분)
git checkout -b feature/time-based-reservation-mvp

# 2. 백업 (10분)
pg_dump ... > backup.sql

# 3. 스키마 수정 (30분)
# prisma/schema.prisma 편집

# 4. 마이그레이션 생성 (10분)
npx prisma migrate dev --name add_time_based_system

# 5. 검증 (30분)
# SQL 쿼리로 데이터 확인
```

**첫 커밋 목표**: "DB migration for time-based system"

---

## 📝 체크포인트

매일 저녁 5분 체크:
- [ ] 오늘 목표 달성했는가?
- [ ] 블로커 있는가?
- [ ] 내일 우선순위는?
- [ ] 도움 필요한 부분은?

매주 금요일 회고:
- [ ] 이번 주 성과는?
- [ ] 어려웠던 점은?
- [ ] 다음 주 계획은?
- [ ] 피드백 반영할 점은?

---

## 🚨 롤백 시나리오

**문제 발생 시**:
```bash
# 1. PM2 중지
pm2 stop misopin-cms

# 2. 백업 복원
psql -h 141.164.60.51 -U misopin_user -d misopin_cms < backup.sql

# 3. 이전 버전 배포
git checkout main
npm run build
pm2 restart misopin-cms

# 4. 검증
curl http://localhost:3001/api/health
```

**예상 롤백 시간**: 15분 이내

---

## 💡 Tips

1. **작은 커밋, 자주 커밋**
   - 기능 단위로 커밋
   - 롤백 포인트 명확하게

2. **테스트는 계속**
   - 코드 작성 → 즉시 테스트
   - 문제 발견 즉시 수정

3. **문서는 간단하게**
   - 핵심만 기록
   - 나중에 보완

4. **의사소통**
   - 의사 선생님께 진행 상황 공유
   - 피드백 빠르게 반영

---

**작성일**: 2025-11-04
**예상 완료**: 2025-11-18 (2주)
**실제 투입 시간**: 40-60시간
**위험도**: Medium (백업 철저히 하면 Low)
