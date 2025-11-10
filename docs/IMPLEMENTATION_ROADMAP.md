# Time-Based Reservation System - Complete Implementation Roadmap

## Executive Summary

**Project**: Transform reservation system from service-count-based limits to time-based shared resource scheduling
**Objective**: Enable dynamic service management with accurate time-pool allocation across all services
**Timeline**: 6 phases over 4-6 weeks
**Risk Level**: Medium (requires careful data migration and transaction handling)

---

## Current System Analysis

### Existing Architecture

**Database Schema**:
- `reservations` table with `service` field (ServiceType enum)
- `service_reservation_limits` table with `dailyLimit` per service
- ServiceType hardcoded enum: WRINKLE_BOTOX, VOLUME_LIFTING, SKIN_CARE, etc.

**Business Logic**:
- `/lib/reservations/daily-limit-counter.ts`: COUNT-based availability checking
- Each service has independent daily limit (e.g., 10 botox appointments per day)
- No time-based calculation or cross-service time sharing

**APIs**:
- `/api/admin/daily-limits`: Service limit management (GET/PUT/PATCH)
- `/api/reservations`: Basic CRUD with mock time-slot checking

**Current Problems**:
1. **No Shared Time Pool**: Services treated independently, not accounting for doctor's total available time
2. **Hardcoded Services**: Adding new services requires code changes, migrations, and redeployment
3. **Inaccurate Scheduling**: No consideration of actual procedure duration
4. **No Time-Based Validation**: Can't prevent overbooking doctor's actual available time

---

## Phase 1: Database Schema Migration

**Duration**: 1 week
**Risk**: HIGH (data migration required)
**Priority**: Foundation for entire system

### 1.1 New Tables Design

```prisma
// Dynamic service management (replaces ServiceType enum)
model Service {
  id                String         @id @default(cuid())
  code              String         @unique      // "WRINKLE_BOTOX" - system identifier
  name              String                      // "주름/보톡스" - display name
  nameEn            String?                     // "Wrinkle/Botox" - English name
  description       String?        @db.Text
  category          String?                     // "피부", "성형" for grouping

  // Time configuration
  durationMinutes   Int            @default(30) // Actual procedure time
  bufferMinutes     Int            @default(10) // Setup/cleanup buffer

  // Pricing (optional)
  basePrice         Int?

  // Status management
  isActive          Boolean        @default(true)
  isVisible         Boolean        @default(true)  // Show in booking form
  displayOrder      Int            @default(0)     // Sort order in UI

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  deletedAt         DateTime?                      // Soft delete support

  // Relations
  reservations      Reservation[]

  @@map("services")
  @@index([isActive, isVisible, displayOrder])
  @@index([code])
}

// Time slot configuration per day/period
model ClinicTimeSlot {
  id              String   @id @default(cuid())
  dayOfWeek       Int                  // 0=Sunday, 6=Saturday
  period          Period               // MORNING, AFTERNOON
  startTime       String               // "09:00"
  endTime         String               // "12:00"
  totalMinutes    Int                  // Calculated: 180
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([dayOfWeek, period])
  @@map("clinic_time_slots")
  @@index([dayOfWeek, isActive])
}

enum Period {
  MORNING
  AFTERNOON
}

// Updated Reservation model
model Reservation {
  id                String            @id @default(cuid())

  // Service relationship (FK instead of enum)
  serviceId         String
  service           Service           @relation(fields: [serviceId], references: [id])

  // Snapshot of service info at booking time (immutable)
  serviceName       String            // "주름/보톡스"
  estimatedDuration Int               // 40 minutes (duration + buffer)

  // Time scheduling
  period            Period            // MORNING or AFTERNOON
  preferredDate     DateTime          @db.Date
  preferredTime     String            // "09:00"

  // Patient information
  patientName       String
  phone             String
  email             String?
  birthDate         DateTime
  gender            Gender
  treatmentType     TreatmentType

  // Status management
  status            ReservationStatus @default(PENDING)
  notes             String?
  adminNotes        String?
  statusChangedAt   DateTime          @default(now())
  statusChangedBy   String?

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@map("reservations")
  @@index([serviceId, preferredDate, status])
  @@index([preferredDate, period, status])  // Critical for time calculations
  @@index([status])
}
```

### 1.2 Migration Strategy

**Step 1: Create New Tables** (Additive - Zero Risk)
```sql
-- Migration: 001_add_services_table.sql
CREATE TABLE "services" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "nameEn" TEXT,
  "description" TEXT,
  "category" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
  "basePrice" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP
);

CREATE INDEX "services_code_idx" ON "services"("code");
CREATE INDEX "services_active_visible_order_idx" ON "services"("isActive", "isVisible", "displayOrder");

-- Migration: 002_add_clinic_time_slots.sql
CREATE TABLE "clinic_time_slots" (
  "id" TEXT PRIMARY KEY,
  "dayOfWeek" INTEGER NOT NULL,
  "period" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "totalMinutes" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "clinic_time_slots_day_period_idx" ON "clinic_time_slots"("dayOfWeek", "period");
CREATE INDEX "clinic_time_slots_active_idx" ON "clinic_time_slots"("dayOfWeek", "isActive");
```

**Step 2: Seed Initial Data** (Populate from current enum)
```sql
-- Migration: 003_seed_services.sql
INSERT INTO "services" (id, code, name, durationMinutes, bufferMinutes, isActive, displayOrder)
VALUES
  (gen_random_uuid(), 'WRINKLE_BOTOX', '주름/보톡스', 30, 10, true, 1),
  (gen_random_uuid(), 'VOLUME_LIFTING', '볼륨/리프팅', 45, 15, true, 2),
  (gen_random_uuid(), 'SKIN_CARE', '피부케어', 60, 10, true, 3),
  (gen_random_uuid(), 'REMOVAL_PROCEDURE', '제거시술', 40, 10, true, 4),
  (gen_random_uuid(), 'BODY_CARE', '바디케어', 50, 10, true, 5),
  (gen_random_uuid(), 'OTHER_CONSULTATION', '기타 상담', 20, 5, true, 6);

-- Seed clinic time slots (Monday-Friday)
-- Morning: 09:00-12:00 (180 minutes)
INSERT INTO "clinic_time_slots" (id, "dayOfWeek", period, "startTime", "endTime", "totalMinutes", "isActive")
SELECT
  gen_random_uuid(),
  dow,
  'MORNING',
  '09:00',
  '12:00',
  180,
  true
FROM generate_series(1, 5) dow;  -- Monday to Friday

-- Afternoon: 13:00-18:00 (300 minutes)
INSERT INTO "clinic_time_slots" (id, "dayOfWeek", period, "startTime", "endTime", "totalMinutes", "isActive")
SELECT
  gen_random_uuid(),
  dow,
  'AFTERNOON',
  '13:00',
  '18:00',
  300,
  true
FROM generate_series(1, 5) dow;  -- Monday to Friday
```

**Step 3: Add New Columns to Reservations** (Nullable - Zero Risk)
```sql
-- Migration: 004_add_reservation_fields.sql
ALTER TABLE "reservations" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "serviceName" TEXT;
ALTER TABLE "reservations" ADD COLUMN "estimatedDuration" INTEGER;
ALTER TABLE "reservations" ADD COLUMN "period" TEXT;

-- Create indexes for new columns
CREATE INDEX "reservations_serviceId_date_status_idx" ON "reservations"("serviceId", "preferredDate", "status");
CREATE INDEX "reservations_date_period_status_idx" ON "reservations"("preferredDate", "period", "status");
```

**Step 4: Data Migration** (Backfill existing reservations)
```sql
-- Migration: 005_migrate_reservation_data.sql

-- Update serviceId and serviceName from service enum
UPDATE "reservations" r
SET
  "serviceId" = s.id,
  "serviceName" = s.name,
  "estimatedDuration" = s."durationMinutes" + s."bufferMinutes"
FROM "services" s
WHERE r.service::text = s.code;

-- Calculate period based on preferredTime
UPDATE "reservations"
SET "period" = CASE
  WHEN CAST(SPLIT_PART("preferredTime", ':', 1) AS INTEGER) < 12 THEN 'MORNING'
  ELSE 'AFTERNOON'
END
WHERE "period" IS NULL;

-- Verify migration (should return 0)
SELECT COUNT(*) FROM "reservations" WHERE "serviceId" IS NULL OR "serviceName" IS NULL OR "estimatedDuration" IS NULL OR "period" IS NULL;
```

**Step 5: Add Constraints** (After verification)
```sql
-- Migration: 006_add_constraints.sql

-- Make new columns non-nullable
ALTER TABLE "reservations" ALTER COLUMN "serviceId" SET NOT NULL;
ALTER TABLE "reservations" ALTER COLUMN "serviceName" SET NOT NULL;
ALTER TABLE "reservations" ALTER COLUMN "estimatedDuration" SET NOT NULL;
ALTER TABLE "reservations" ALTER COLUMN "period" SET NOT NULL;

-- Add foreign key
ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "services"("id")
ON DELETE RESTRICT;  -- Prevent service deletion if reservations exist
```

**Step 6: Remove Old Enum** (Final step - after full testing)
```sql
-- Migration: 007_cleanup_old_service_enum.sql

-- Drop old service column
ALTER TABLE "reservations" DROP COLUMN "service";

-- Drop old service_reservation_limits table
DROP TABLE "service_reservation_limits";

-- Drop ServiceType enum
DROP TYPE "ServiceType";
```

### 1.3 Rollback Strategy

```sql
-- Rollback script (if needed before Step 6)
-- Can restore service column from serviceId mapping

UPDATE "reservations" r
SET "service" = s.code::ServiceType
FROM "services" s
WHERE r."serviceId" = s.id;

-- Then drop new columns
ALTER TABLE "reservations" DROP COLUMN "serviceId";
ALTER TABLE "reservations" DROP COLUMN "serviceName";
ALTER TABLE "reservations" DROP COLUMN "estimatedDuration";
ALTER TABLE "reservations" DROP COLUMN "period";

-- Drop new tables
DROP TABLE "clinic_time_slots";
DROP TABLE "services";
```

### 1.4 Testing Checkpoints

**After Each Migration Step**:
```typescript
// Test script: test-migration.ts
import { prisma } from '@/lib/prisma';

async function verifyMigration() {
  // 1. Verify services table populated
  const serviceCount = await prisma.service.count();
  console.log(`Services: ${serviceCount} (expected: 6)`);

  // 2. Verify time slots created
  const timeSlotCount = await prisma.clinicTimeSlot.count();
  console.log(`Time slots: ${timeSlotCount} (expected: 10)`);

  // 3. Verify reservations migrated
  const reservationCount = await prisma.reservation.count({
    where: {
      serviceId: { not: null },
      serviceName: { not: null },
      estimatedDuration: { not: null },
      period: { not: null }
    }
  });
  const totalReservations = await prisma.reservation.count();
  console.log(`Migrated reservations: ${reservationCount}/${totalReservations}`);

  // 4. Verify data integrity
  const orphanedReservations = await prisma.reservation.findMany({
    where: {
      serviceId: { not: null },
      service: { is: null }
    }
  });
  console.log(`Orphaned reservations: ${orphanedReservations.length} (expected: 0)`);
}
```

### 1.5 Deployment Plan

**Zero-Downtime Deployment**:

1. **Deploy migrations 001-005** (additive only, backward compatible)
2. **Deploy application code** (dual-read: old enum + new serviceId)
3. **Verify data migration** (100% reservations migrated)
4. **Deploy final code** (read only from new schema)
5. **Deploy migrations 006-007** (cleanup old schema)

**Estimated Time**:
- Migration development: 2 days
- Testing: 2 days
- Deployment: 1 day
- Buffer: 2 days

---

## Phase 2: Core Time-Based Business Logic

**Duration**: 1 week
**Risk**: MEDIUM (complex calculations, concurrency handling)
**Priority**: Critical path

### 2.1 Time Availability Calculator

Create `/lib/reservations/time-based-availability.ts`:

```typescript
import { prisma } from '@/lib/prisma';
import { Period, ReservationStatus, Prisma } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

interface TimeSlotAvailability {
  date: Date;
  period: Period;
  totalMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
  isAvailable: boolean;
  currentReservations: number;
}

interface ServiceAvailability {
  serviceId: string;
  serviceName: string;
  code: string;
  durationMinutes: number;
  bufferMinutes: number;
  requiredMinutes: number;
  available: boolean;
  message: string;
}

/**
 * Calculate time slot availability for specific date/period
 * Uses real-time SUM of estimatedDuration for all active reservations
 */
export async function calculateTimeSlotAvailability(
  date: Date,
  period: Period
): Promise<TimeSlotAvailability> {
  const dayOfWeek = date.getDay();

  // 1. Get time slot configuration
  const timeSlot = await prisma.clinicTimeSlot.findUnique({
    where: {
      dayOfWeek_period: {
        dayOfWeek,
        period
      }
    }
  });

  if (!timeSlot || !timeSlot.isActive) {
    throw new Error(`Clinic is closed on ${getPeriodName(period)} for day ${dayOfWeek}`);
  }

  // 2. Calculate consumed time from active reservations
  const reservations = await prisma.reservation.findMany({
    where: {
      preferredDate: {
        gte: startOfDay(date),
        lt: endOfDay(date)
      },
      period: period,
      status: {
        in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED]
      }
    },
    select: {
      id: true,
      estimatedDuration: true,
      serviceName: true
    }
  });

  // 3. Sum total consumed minutes
  const consumedMinutes = reservations.reduce(
    (sum, res) => sum + res.estimatedDuration,
    0
  );

  const remainingMinutes = Math.max(0, timeSlot.totalMinutes - consumedMinutes);

  return {
    date,
    period,
    totalMinutes: timeSlot.totalMinutes,
    consumedMinutes,
    remainingMinutes,
    isAvailable: remainingMinutes > 0,
    currentReservations: reservations.length
  };
}

/**
 * Check if specific service can be booked in time slot
 * Accounts for cross-service time sharing
 */
export async function canBookService(
  date: Date,
  period: Period,
  serviceId: string
): Promise<ServiceAvailability> {
  // 1. Get service configuration
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      code: true,
      name: true,
      durationMinutes: true,
      bufferMinutes: true,
      isActive: true,
      isVisible: true
    }
  });

  if (!service) {
    throw new Error('Service not found');
  }

  if (!service.isActive || !service.isVisible) {
    return {
      serviceId: service.id,
      serviceName: service.name,
      code: service.code,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      requiredMinutes: 0,
      available: false,
      message: `${service.name} is currently not available for booking`
    };
  }

  const requiredMinutes = service.durationMinutes + service.bufferMinutes;

  // 2. Get time slot availability
  try {
    const availability = await calculateTimeSlotAvailability(date, period);

    const available = availability.remainingMinutes >= requiredMinutes;

    return {
      serviceId: service.id,
      serviceName: service.name,
      code: service.code,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      requiredMinutes,
      available,
      message: available
        ? `Available (${availability.remainingMinutes} minutes remaining)`
        : `Insufficient time (need ${requiredMinutes} min, ${availability.remainingMinutes} min available)`
    };
  } catch (error) {
    return {
      serviceId: service.id,
      serviceName: service.name,
      code: service.code,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      requiredMinutes,
      available: false,
      message: error instanceof Error ? error.message : 'Time slot unavailable'
    };
  }
}

/**
 * Get all available services for specific time slot
 * Returns services sorted by duration (shortest first)
 */
export async function getAvailableServices(
  date: Date,
  period: Period
): Promise<ServiceAvailability[]> {
  // 1. Get time slot availability
  const availability = await calculateTimeSlotAvailability(date, period);

  // 2. Get all active services
  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      isVisible: true,
      deletedAt: null
    },
    orderBy: [
      { displayOrder: 'asc' },
      { durationMinutes: 'asc' }
    ]
  });

  // 3. Check each service against remaining time
  return services.map(service => {
    const requiredMinutes = service.durationMinutes + service.bufferMinutes;
    const available = availability.remainingMinutes >= requiredMinutes;

    return {
      serviceId: service.id,
      serviceName: service.name,
      code: service.code,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      requiredMinutes,
      available,
      message: available
        ? `Available (${requiredMinutes} minutes required)`
        : `Not enough time (need ${requiredMinutes} min, ${availability.remainingMinutes} min left)`
    };
  });
}

/**
 * Transaction-safe reservation creation check
 * Uses Prisma transaction with pessimistic locking
 */
export async function canCreateReservationWithTimeCheck(
  tx: Prisma.TransactionClient,
  date: Date,
  period: Period,
  serviceId: string
): Promise<boolean> {
  const dayOfWeek = date.getDay();

  // 1. Get service with lock
  const service = await tx.service.findUnique({
    where: { id: serviceId }
  });

  if (!service || !service.isActive) {
    return false;
  }

  const requiredMinutes = service.durationMinutes + service.bufferMinutes;

  // 2. Get time slot configuration
  const timeSlot = await tx.clinicTimeSlot.findUnique({
    where: {
      dayOfWeek_period: {
        dayOfWeek,
        period
      }
    }
  });

  if (!timeSlot || !timeSlot.isActive) {
    return false;
  }

  // 3. Calculate current consumption with row-level lock
  const reservations = await tx.reservation.findMany({
    where: {
      preferredDate: {
        gte: startOfDay(date),
        lt: endOfDay(date)
      },
      period: period,
      status: {
        in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED]
      }
    },
    select: {
      estimatedDuration: true
    }
  });

  const consumedMinutes = reservations.reduce(
    (sum, res) => sum + res.estimatedDuration,
    0
  );

  const remainingMinutes = timeSlot.totalMinutes - consumedMinutes;

  // 4. Check if enough time remains
  return remainingMinutes >= requiredMinutes;
}

/**
 * Get daily availability summary (morning + afternoon)
 */
export async function getDailyAvailability(date: Date) {
  const [morning, afternoon] = await Promise.all([
    calculateTimeSlotAvailability(date, Period.MORNING).catch(() => null),
    calculateTimeSlotAvailability(date, Period.AFTERNOON).catch(() => null)
  ]);

  return {
    date,
    morning,
    afternoon,
    totalRemaining: (morning?.remainingMinutes || 0) + (afternoon?.remainingMinutes || 0),
    totalCapacity: (morning?.totalMinutes || 0) + (afternoon?.totalMinutes || 0)
  };
}

// Helper functions
function getPeriodName(period: Period): string {
  return period === Period.MORNING ? 'morning' : 'afternoon';
}
```

### 2.2 Transaction Safety Implementation

```typescript
// lib/reservations/create-reservation.ts
import { prisma } from '@/lib/prisma';
import { canCreateReservationWithTimeCheck } from './time-based-availability';
import { Period, ReservationStatus } from '@prisma/client';

interface CreateReservationInput {
  serviceId: string;
  preferredDate: Date;
  preferredTime: string;
  patientName: string;
  phone: string;
  email?: string;
  birthDate: Date;
  gender: string;
  treatmentType: string;
  notes?: string;
}

export async function createReservationSafely(input: CreateReservationInput) {
  // Determine period from time
  const hour = parseInt(input.preferredTime.split(':')[0]);
  const period: Period = hour < 12 ? Period.MORNING : Period.AFTERNOON;

  return await prisma.$transaction(async (tx) => {
    // 1. Final time-based availability check (with lock)
    const canCreate = await canCreateReservationWithTimeCheck(
      tx,
      input.preferredDate,
      period,
      input.serviceId
    );

    if (!canCreate) {
      throw new Error('Insufficient time available for this service');
    }

    // 2. Get service details for snapshot
    const service = await tx.service.findUnique({
      where: { id: input.serviceId },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        bufferMinutes: true
      }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    const estimatedDuration = service.durationMinutes + service.bufferMinutes;

    // 3. Create reservation with snapshot
    const reservation = await tx.reservation.create({
      data: {
        serviceId: input.serviceId,
        serviceName: service.name,
        estimatedDuration,
        period,
        preferredDate: input.preferredDate,
        preferredTime: input.preferredTime,
        patientName: input.patientName,
        phone: input.phone,
        email: input.email,
        birthDate: input.birthDate,
        gender: input.gender as any,
        treatmentType: input.treatmentType as any,
        notes: input.notes,
        status: ReservationStatus.PENDING,
        statusChangedAt: new Date()
      }
    });

    return reservation;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000,
    timeout: 10000
  });
}
```

### 2.3 Testing Strategy

```typescript
// tests/time-availability.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { calculateTimeSlotAvailability, canBookService } from '@/lib/reservations/time-based-availability';
import { Period } from '@prisma/client';

describe('Time-Based Availability', () => {
  describe('calculateTimeSlotAvailability', () => {
    it('should return correct remaining time with no reservations', async () => {
      const date = new Date('2025-11-15'); // Friday
      const result = await calculateTimeSlotAvailability(date, Period.MORNING);

      expect(result.totalMinutes).toBe(180);
      expect(result.consumedMinutes).toBe(0);
      expect(result.remainingMinutes).toBe(180);
      expect(result.isAvailable).toBe(true);
    });

    it('should calculate consumed time correctly', async () => {
      // Setup: Create 3 reservations totaling 120 minutes
      const date = new Date('2025-11-15');
      // ... create test reservations

      const result = await calculateTimeSlotAvailability(date, Period.MORNING);

      expect(result.consumedMinutes).toBe(120);
      expect(result.remainingMinutes).toBe(60);
    });

    it('should handle fully booked time slots', async () => {
      // Setup: Book entire 180-minute slot
      const date = new Date('2025-11-15');
      // ... create reservations totaling 180 minutes

      const result = await calculateTimeSlotAvailability(date, Period.MORNING);

      expect(result.remainingMinutes).toBe(0);
      expect(result.isAvailable).toBe(false);
    });
  });

  describe('canBookService', () => {
    it('should allow booking when sufficient time remains', async () => {
      const date = new Date('2025-11-15');
      const serviceId = 'botox-service-id';

      const result = await canBookService(date, Period.MORNING, serviceId);

      expect(result.available).toBe(true);
      expect(result.requiredMinutes).toBe(40); // 30 + 10 buffer
    });

    it('should prevent booking when insufficient time', async () => {
      // Setup: Only 30 minutes remaining, need 70-minute service
      const date = new Date('2025-11-15');
      const serviceId = 'skin-care-service-id'; // 60 + 10 = 70 minutes

      const result = await canBookService(date, Period.MORNING, serviceId);

      expect(result.available).toBe(false);
      expect(result.message).toContain('Insufficient time');
    });
  });

  describe('Concurrent booking safety', () => {
    it('should handle race condition correctly', async () => {
      // Simulate 2 simultaneous bookings for last 40 minutes
      // Only one should succeed

      const promises = [
        createReservationSafely({ /* booking 1 */ }),
        createReservationSafely({ /* booking 2 */ })
      ];

      const results = await Promise.allSettled(promises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(1);
      expect(failed).toBe(1);
    });
  });
});
```

### 2.4 Performance Optimization

```typescript
// Add database indexes for query performance
// Migration: 008_add_performance_indexes.sql

-- Optimize time slot availability queries
CREATE INDEX "reservations_date_period_status_duration_idx"
ON "reservations"("preferredDate", "period", "status", "estimatedDuration");

-- Optimize service lookups
CREATE INDEX "services_active_visible_idx"
ON "services"("isActive", "isVisible")
WHERE "deletedAt" IS NULL;

-- Add partial index for active reservations only
CREATE INDEX "reservations_active_idx"
ON "reservations"("preferredDate", "period", "estimatedDuration")
WHERE "status" IN ('PENDING', 'CONFIRMED');
```

**Estimated Time**:
- Core logic development: 3 days
- Unit tests: 2 days
- Integration tests: 1 day
- Performance tuning: 1 day

---

## Phase 3: Dynamic Service Management

**Duration**: 1 week
**Risk**: LOW (new feature, no breaking changes)
**Priority**: High (enables zero-deployment service updates)

### 3.1 Admin Service Management API

Create `/app/api/admin/services/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/services - List all services
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('includeInactive') === 'true';

  try {
    const services = await prisma.service.findMany({
      where: includeInactive ? {} : {
        isActive: true,
        deletedAt: null
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      services,
      total: services.length
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST /api/admin/services - Create new service
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validation
    const errors = validateServiceData(body);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Check code uniqueness
    const existing = await prisma.service.findUnique({
      where: { code: body.code }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Service code already exists' },
        { status: 409 }
      );
    }

    // Create service
    const service = await prisma.service.create({
      data: {
        code: body.code,
        name: body.name,
        nameEn: body.nameEn,
        description: body.description,
        category: body.category,
        durationMinutes: body.durationMinutes,
        bufferMinutes: body.bufferMinutes || 10,
        basePrice: body.basePrice,
        isActive: body.isActive ?? true,
        isVisible: body.isVisible ?? true,
        displayOrder: body.displayOrder || 0
      }
    });

    return NextResponse.json({
      success: true,
      service,
      message: `${service.name} service created successfully`
    }, { status: 201 });

  } catch (error) {
    console.error('Service creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function validateServiceData(data: any): string[] {
  const errors: string[] = [];

  if (!data.code || typeof data.code !== 'string') {
    errors.push('Code is required and must be a string');
  } else if (!/^[A-Z_]+$/.test(data.code)) {
    errors.push('Code must contain only uppercase letters and underscores');
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required');
  }

  if (typeof data.durationMinutes !== 'number' || data.durationMinutes < 1 || data.durationMinutes > 480) {
    errors.push('Duration must be between 1 and 480 minutes');
  }

  if (data.bufferMinutes && (typeof data.bufferMinutes !== 'number' || data.bufferMinutes < 0 || data.bufferMinutes > 60)) {
    errors.push('Buffer time must be between 0 and 60 minutes');
  }

  return errors;
}
```

Create `/app/api/admin/services/[id]/route.ts`:

```typescript
// PATCH /api/admin/services/[id] - Update service
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    // Check existence
    const existing = await prisma.service.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Build update data (only allowed fields)
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameEn !== undefined) updateData.nameEn = body.nameEn;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.durationMinutes !== undefined) {
      if (body.durationMinutes < 1 || body.durationMinutes > 480) {
        return NextResponse.json(
          { success: false, error: 'Duration must be between 1 and 480 minutes' },
          { status: 400 }
        );
      }
      updateData.durationMinutes = body.durationMinutes;
    }
    if (body.bufferMinutes !== undefined) updateData.bufferMinutes = body.bufferMinutes;
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;

    // Update service
    const service = await prisma.service.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      service,
      message: 'Service updated successfully'
    });

  } catch (error) {
    console.error('Service update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/services/[id] - Soft delete service
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check for active reservations
    const activeReservations = await prisma.reservation.count({
      where: {
        serviceId: id,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    });

    if (activeReservations > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete service with ${activeReservations} active reservation(s). Please deactivate instead.`
      }, { status: 409 });
    }

    // Soft delete
    const service = await prisma.service.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        isVisible: false
      }
    });

    return NextResponse.json({
      success: true,
      service,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Service deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3.2 Admin UI for Service Management

*(Full implementation in next message due to length constraints)*

**Estimated Time**:
- API development: 2 days
- Admin UI development: 3 days
- Testing: 2 days

---

*Continuing in next response with Phases 4-6...*
