# ZERO-DOWNTIME MIGRATION STRATEGY
## Hospital Reservation System: ServiceType Enum → Dynamic Service Table

**Critical Context**: Production hospital data - ZERO data loss tolerance

---

## EXECUTIVE SUMMARY

### Current State Analysis
```yaml
critical_dependencies:
  - reservations.service: ServiceType enum (6 hardcoded values)
  - reservations.preferredTime: String (unstructured - "09:00", "9:00 AM", etc.)
  - service_reservation_limits.serviceType: ServiceType enum (unique key)
  - daily_limit_counter.ts: Real-time COUNT-based availability checking
  - No duration tracking anywhere in system
  - No time-slot management capability

data_at_risk:
  - Unknown number of existing reservations
  - Unknown preferredTime string formats
  - 6 service types actively in use
  - service_reservation_limits configuration (6 rows)

application_code:
  critical_paths:
    - POST /api/public/reservations/route.ts (creates reservations)
    - GET /api/public/reservations/availability/route.ts (checks availability)
    - lib/reservations/daily-limit-counter.ts (core business logic)
```

### Target State Requirements
```yaml
new_architecture:
  - Service table (dynamic, no enum)
  - Time-based scheduling with Period enum (MORNING/AFTERNOON)
  - Duration tracking (estimatedDuration in reservations)
  - ClinicTimeSlot table for time management
  - Preserve ALL existing reservations perfectly

non_negotiable_constraints:
  - ZERO data loss (every reservation preserved)
  - ZERO downtime (application keeps running)
  - Rollback capability at each phase
  - Backward compatibility during migration
```

---

## MIGRATION ARCHITECTURE

### Four-Phase Strategy

```
Phase 1: ADDITIVE CHANGES (Safe, Reversible)
├─ Add Service table (coexists with enum)
├─ Add new nullable fields to reservations
├─ Add ClinicTimeSlot table
├─ Keep old enum and fields intact
└─ Risk: MINIMAL (only adding, not changing)

Phase 2: DATA MIGRATION (Validated, Tested)
├─ Migrate ServiceType enum → Service table
├─ Parse preferredTime strings → period
├─ Calculate estimatedDuration from service
├─ Populate ClinicTimeSlot defaults
├─ Dual-write to old AND new fields
└─ Risk: MEDIUM (data transformation)

Phase 3: APPLICATION SWITCHOVER (Feature Flagged)
├─ Deploy code using new fields
├─ Feature flag controls old vs new logic
├─ Monitor and validate in production
├─ Gradual rollout percentage
└─ Risk: MEDIUM (behavioral change)

Phase 4: CLEANUP (After Validation)
├─ Remove old fields
├─ Remove old enum
├─ Remove feature flags
├─ Optimize indexes
└─ Risk: LOW (cleanup only)
```

---

## PHASE 1: ADDITIVE CHANGES (Week 1)

### Objective
Add new tables and fields WITHOUT breaking existing system.

### Database Changes

#### 1.1: Create Service Table
```sql
-- Migration: 001_add_service_table.sql
-- Timestamp: Run during low-traffic window (optional, but recommended)
-- Rollback: DROP TABLE "services" CASCADE;

CREATE TABLE "services" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "nameEn" TEXT,
  "description" TEXT,
  "category" TEXT,

  -- Duration settings
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 10,

  -- Optional pricing
  "basePrice" INTEGER,

  -- Status management
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

-- Indexes for performance
CREATE INDEX "services_isActive_isVisible_displayOrder_idx"
ON "services"("isActive", "isVisible", "displayOrder");

CREATE INDEX "services_code_idx" ON "services"("code");

-- Seed with existing ServiceType enum values
INSERT INTO "services" (id, code, name, durationMinutes, bufferMinutes, isActive, displayOrder)
VALUES
  ('srv_wrinkle_botox', 'WRINKLE_BOTOX', '주름/보톡스', 30, 10, true, 1),
  ('srv_volume_lifting', 'VOLUME_LIFTING', '볼륨/리프팅', 45, 15, true, 2),
  ('srv_skin_care', 'SKIN_CARE', '피부케어', 60, 10, true, 3),
  ('srv_removal_procedure', 'REMOVAL_PROCEDURE', '제거시술', 40, 10, true, 4),
  ('srv_body_care', 'BODY_CARE', '바디케어', 50, 10, true, 5),
  ('srv_other_consultation', 'OTHER_CONSULTATION', '기타 상담', 20, 5, true, 6);

-- Validation check
DO $$
DECLARE
  service_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO service_count FROM services;
  IF service_count != 6 THEN
    RAISE EXCEPTION 'Service seed failed: expected 6, got %', service_count;
  END IF;
END $$;
```

**Validation SQL**:
```sql
-- Verify all 6 services created
SELECT code, name, durationMinutes, bufferMinutes, isActive
FROM services
ORDER BY displayOrder;

-- Expected result: 6 rows matching enum values
```

**Rollback**:
```sql
DROP TABLE IF EXISTS "services" CASCADE;
```

---

#### 1.2: Add New Fields to Reservations (Nullable)
```sql
-- Migration: 002_add_new_reservation_fields.sql
-- Timestamp: Run during low-traffic window (optional)
-- Rollback: ALTER TABLE reservations DROP COLUMN ...

-- Add new foreign key field (nullable during transition)
ALTER TABLE "reservations"
ADD COLUMN "serviceId" TEXT;

-- Add snapshot fields (nullable during transition)
ALTER TABLE "reservations"
ADD COLUMN "serviceName" TEXT;

ALTER TABLE "reservations"
ADD COLUMN "estimatedDuration" INTEGER;

-- Add period field (nullable during transition)
ALTER TABLE "reservations"
ADD COLUMN "period" TEXT;

-- Create indexes for new fields (prepare for future queries)
CREATE INDEX "reservations_serviceId_preferredDate_status_idx"
ON "reservations"("serviceId", "preferredDate", "status");

CREATE INDEX "reservations_preferredDate_period_status_idx"
ON "reservations"("preferredDate", "period", "status");

-- Add foreign key constraint (nullable)
ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "services"("id")
ON DELETE RESTRICT;

-- Add check constraint for period (when not null)
ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_period_check"
CHECK ("period" IS NULL OR "period" IN ('MORNING', 'AFTERNOON'));
```

**Validation SQL**:
```sql
-- Verify schema changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reservations'
AND column_name IN ('serviceId', 'serviceName', 'estimatedDuration', 'period')
ORDER BY column_name;

-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'reservations'
AND indexname LIKE '%serviceId%';

-- Verify foreign key constraint
SELECT
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'reservations'::regclass
AND conname LIKE '%serviceId%';
```

**Rollback**:
```sql
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_serviceId_fkey";
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_period_check";
DROP INDEX IF EXISTS "reservations_serviceId_preferredDate_status_idx";
DROP INDEX IF EXISTS "reservations_preferredDate_period_status_idx";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "serviceId";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "serviceName";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "estimatedDuration";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "period";
```

---

#### 1.3: Create ClinicTimeSlot Table
```sql
-- Migration: 003_add_clinic_time_slots.sql
-- Timestamp: Run anytime (no dependencies)
-- Rollback: DROP TABLE clinic_time_slots;

CREATE TABLE "clinic_time_slots" (
  "id" TEXT PRIMARY KEY,
  "dayOfWeek" INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  "period" TEXT NOT NULL, -- 'MORNING' or 'AFTERNOON'
  "startTime" TEXT NOT NULL, -- "09:00"
  "endTime" TEXT NOT NULL, -- "12:00"
  "totalMinutes" INTEGER NOT NULL, -- Auto-calculated: 180
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: one slot per day+period
CREATE UNIQUE INDEX "clinic_time_slots_dayOfWeek_period_key"
ON "clinic_time_slots"("dayOfWeek", "period");

-- Index for active slots lookup
CREATE INDEX "clinic_time_slots_isActive_idx"
ON "clinic_time_slots"("isActive");

-- Add check constraints
ALTER TABLE "clinic_time_slots"
ADD CONSTRAINT "clinic_time_slots_dayOfWeek_check"
CHECK ("dayOfWeek" BETWEEN 0 AND 6);

ALTER TABLE "clinic_time_slots"
ADD CONSTRAINT "clinic_time_slots_period_check"
CHECK ("period" IN ('MORNING', 'AFTERNOON'));

-- Seed with typical clinic hours (CUSTOMIZE TO ACTUAL SCHEDULE)
-- Monday-Friday: 9am-12pm (morning), 2pm-6pm (afternoon)
-- Saturday: 9am-1pm (morning only)
-- Sunday: Closed

DO $$
DECLARE
  day INTEGER;
BEGIN
  -- Monday through Friday (1-5)
  FOR day IN 1..5 LOOP
    INSERT INTO "clinic_time_slots" (id, "dayOfWeek", period, "startTime", "endTime", "totalMinutes")
    VALUES
      (
        'slot_' || day || '_morning',
        day,
        'MORNING',
        '09:00',
        '12:00',
        180
      ),
      (
        'slot_' || day || '_afternoon',
        day,
        'AFTERNOON',
        '14:00',
        '18:00',
        240
      );
  END LOOP;

  -- Saturday (6): Morning only
  INSERT INTO "clinic_time_slots" (id, "dayOfWeek", period, "startTime", "endTime", "totalMinutes")
  VALUES ('slot_6_morning', 6, 'MORNING', '09:00', '13:00', 240);

  -- Sunday (0): Closed (no records)
END $$;

-- Validation check
DO $$
DECLARE
  slot_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO slot_count FROM clinic_time_slots;
  IF slot_count != 11 THEN
    RAISE EXCEPTION 'ClinicTimeSlot seed failed: expected 11, got %', slot_count;
  END IF;
END $$;
```

**Validation SQL**:
```sql
-- Verify clinic hours setup
SELECT
  CASE "dayOfWeek"
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END AS day,
  period,
  "startTime",
  "endTime",
  "totalMinutes",
  "isActive"
FROM "clinic_time_slots"
ORDER BY "dayOfWeek",
  CASE period WHEN 'MORNING' THEN 1 ELSE 2 END;

-- Expected: 11 rows (Mon-Fri morning+afternoon, Sat morning only)
```

**Rollback**:
```sql
DROP TABLE IF EXISTS "clinic_time_slots" CASCADE;
```

---

### Prisma Schema Updates (Phase 1)

```prisma
// Add to schema.prisma (coexists with existing enum)

model Service {
  id                String        @id
  code              String        @unique
  name              String
  nameEn            String?
  description       String?       @db.Text
  category          String?

  durationMinutes   Int           @default(30)
  bufferMinutes     Int           @default(10)

  basePrice         Int?

  isActive          Boolean       @default(true)
  isVisible         Boolean       @default(true)
  displayOrder      Int           @default(0)

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  deletedAt         DateTime?

  reservations      Reservation[] @relation("ServiceToReservation")

  @@map("services")
  @@index([isActive, isVisible, displayOrder])
  @@index([code])
}

model Reservation {
  id                String            @id
  patientName       String
  phone             String
  email             String?
  birthDate         DateTime
  gender            Gender
  treatmentType     TreatmentType
  preferredDate     DateTime          @db.Date
  preferredTime     String            // OLD - keep for now
  status            ReservationStatus @default(PENDING)
  notes             String?
  adminNotes        String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime
  service           ServiceType       // OLD - keep for now
  statusChangedAt   DateTime          @default(now())
  statusChangedBy   String?

  // NEW FIELDS (nullable during migration)
  serviceId         String?
  serviceName       String?
  estimatedDuration Int?
  period            Period?

  // Relation (optional during migration)
  serviceRelation   Service?          @relation("ServiceToReservation", fields: [serviceId], references: [id])

  @@map("reservations")
  @@index([preferredDate, service, status]) // OLD index
  @@index([status])
  @@index([serviceId, preferredDate, status]) // NEW index
  @@index([preferredDate, period, status]) // NEW index
}

model ClinicTimeSlot {
  id           String   @id
  dayOfWeek    Int      // 0=Sunday, 6=Saturday
  period       Period
  startTime    String
  endTime      String
  totalMinutes Int
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([dayOfWeek, period])
  @@map("clinic_time_slots")
  @@index([isActive])
}

enum Period {
  MORNING
  AFTERNOON
}

// Keep existing ServiceType enum (will remove in Phase 4)
enum ServiceType {
  WRINKLE_BOTOX
  VOLUME_LIFTING
  SKIN_CARE
  REMOVAL_PROCEDURE
  BODY_CARE
  OTHER_CONSULTATION
}
```

---

### Phase 1 Deployment Steps

```bash
# 1. Update Prisma schema (add new models, keep old enum)
# Edit: prisma/schema.prisma

# 2. Generate migration files
npx prisma migrate dev --name add_service_table_phase1 --create-only

# 3. Review generated SQL carefully
cat prisma/migrations/*/migration.sql

# 4. Apply migration to development database first
npx prisma migrate dev

# 5. Validate data in dev
psql $DEV_DATABASE_URL -f validation_queries_phase1.sql

# 6. Apply to production (during low-traffic window - optional)
npx prisma migrate deploy

# 7. Validate production data
psql $DATABASE_URL -f validation_queries_phase1.sql

# 8. Generate Prisma Client
npx prisma generate
```

---

### Phase 1 Validation Checklist

**Post-Migration Checks**:
```sql
-- 1. Verify Service table populated
SELECT COUNT(*) as service_count FROM services;
-- Expected: 6

-- 2. Verify all service codes match enum
SELECT code FROM services ORDER BY code;
-- Expected: BODY_CARE, OTHER_CONSULTATION, REMOVAL_PROCEDURE, SKIN_CARE, VOLUME_LIFTING, WRINKLE_BOTOX

-- 3. Verify reservations table has new nullable fields
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'reservations'
AND column_name IN ('serviceId', 'serviceName', 'estimatedDuration', 'period')
AND is_nullable = 'YES';
-- Expected: 4

-- 4. Verify foreign key exists but allows NULL
SELECT COUNT(*) FROM reservations WHERE "serviceId" IS NULL;
-- Expected: (total reservation count - all should be NULL initially)

-- 5. Verify ClinicTimeSlot populated
SELECT COUNT(*) as slot_count FROM clinic_time_slots;
-- Expected: 11 (or based on your clinic schedule)

-- 6. Verify old system still works (critical!)
SELECT COUNT(*) FROM reservations WHERE service IS NOT NULL;
-- Expected: (total reservation count - old field still populated)
```

**Application Smoke Test**:
```bash
# Critical: Existing reservation creation MUST still work
curl -X POST http://localhost:3000/api/public/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Test Patient",
    "phone": "010-1234-5678",
    "birth_date": "1990-01-01",
    "gender": "FEMALE",
    "treatment_type": "FIRST_VISIT",
    "service": "WRINKLE_BOTOX",
    "preferred_date": "2025-12-01",
    "preferred_time": "10:00"
  }'

# Expected: 200 OK, reservation created with OLD fields only
```

---

### Phase 1 Rollback Plan

**If anything goes wrong**:
```sql
-- Emergency rollback (run in order)
BEGIN;

-- 1. Drop new foreign key
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_serviceId_fkey;

-- 2. Drop new indexes
DROP INDEX IF EXISTS reservations_serviceId_preferredDate_status_idx;
DROP INDEX IF EXISTS reservations_preferredDate_period_status_idx;

-- 3. Drop new columns
ALTER TABLE reservations DROP COLUMN IF EXISTS serviceId;
ALTER TABLE reservations DROP COLUMN IF EXISTS serviceName;
ALTER TABLE reservations DROP COLUMN IF EXISTS estimatedDuration;
ALTER TABLE reservations DROP COLUMN IF EXISTS period;

-- 4. Drop new tables
DROP TABLE IF EXISTS clinic_time_slots CASCADE;
DROP TABLE IF EXISTS services CASCADE;

-- 5. Verify old system intact
SELECT COUNT(*) FROM reservations WHERE service IS NOT NULL;

COMMIT;
```

---

### Phase 1 Success Criteria

✅ **Phase 1 Complete When**:
- [ ] Service table exists with 6 rows
- [ ] ClinicTimeSlot table exists with clinic hours
- [ ] Reservations has 4 new nullable fields
- [ ] Foreign key constraint exists (nullable)
- [ ] Old enum field `service` still works
- [ ] Old field `preferredTime` still works
- [ ] Existing reservation creation API works unchanged
- [ ] Zero production errors
- [ ] Application runs normally (no code changes yet)

**Timeline**: 1-2 days (mostly validation time)

---

## PHASE 2: DATA MIGRATION (Week 2)

### Objective
Populate new fields for ALL existing reservations using old field values.

### Critical Analysis: preferredTime Parsing

**Unknown Format Risk**:
```javascript
// We don't know the actual format of preferredTime in production!
// Possible formats seen in wild:
// - "09:00" (24-hour)
// - "9:00 AM" (12-hour with AM/PM)
// - "오전 9시" (Korean format)
// - "9:00" (ambiguous - morning or afternoon?)
// - "morning" (text only)
// - "10시" (Korean hour)
```

**Safe Parsing Strategy**:
```sql
-- Step 1: Analyze existing preferredTime values
SELECT
  "preferredTime",
  COUNT(*) as count
FROM reservations
GROUP BY "preferredTime"
ORDER BY count DESC;

-- Step 2: Create mapping logic based on ACTUAL data
-- (Customize based on Step 1 results)
```

---

### 2.1: Analyze Existing Data (DO THIS FIRST!)

```sql
-- CRITICAL: Run this in production to understand data formats
-- Save results before proceeding

-- 1. Analyze preferredTime formats
SELECT
  "preferredTime",
  COUNT(*) as reservation_count,
  MIN("preferredDate") as earliest_date,
  MAX("preferredDate") as latest_date
FROM reservations
WHERE status NOT IN ('CANCELLED', 'NO_SHOW')
GROUP BY "preferredTime"
ORDER BY reservation_count DESC
LIMIT 50;

-- 2. Analyze service distribution
SELECT
  service,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM reservations
GROUP BY service
ORDER BY count DESC;

-- 3. Check for data anomalies
SELECT
  id,
  "patientName",
  service,
  "preferredDate",
  "preferredTime"
FROM reservations
WHERE
  "preferredTime" IS NULL
  OR "preferredTime" = ''
  OR service IS NULL;

-- 4. Total reservation count
SELECT
  COUNT(*) as total_reservations,
  COUNT(DISTINCT "preferredTime") as distinct_time_formats,
  COUNT(DISTINCT service) as distinct_services
FROM reservations;
```

**Expected Output Analysis**:
```
Save the results to:
  claudedocs/PRODUCTION_DATA_ANALYSIS_$(date +%Y%m%d).txt

Then create custom migration based on ACTUAL formats.
```

---

### 2.2: Data Migration SQL (Template - CUSTOMIZE!)

```sql
-- Migration: 004_migrate_existing_reservations.sql
-- WARNING: This is a TEMPLATE. Customize based on Phase 2.1 analysis!
-- Rollback: UPDATE reservations SET serviceId=NULL, serviceName=NULL, estimatedDuration=NULL, period=NULL;

BEGIN;

-- Step 1: Populate serviceId and serviceName
UPDATE reservations r
SET
  "serviceId" = s.id,
  "serviceName" = s.name
FROM services s
WHERE r.service::text = s.code
AND r."serviceId" IS NULL; -- Only update rows not yet migrated

-- Validation checkpoint
DO $$
DECLARE
  unmigrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM reservations
  WHERE "serviceId" IS NULL;

  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Service migration failed: % reservations not migrated', unmigrated_count;
  END IF;
END $$;

-- Step 2: Populate estimatedDuration from service
UPDATE reservations r
SET "estimatedDuration" = s."durationMinutes" + s."bufferMinutes"
FROM services s
WHERE r."serviceId" = s.id
AND r."estimatedDuration" IS NULL;

-- Step 3: Parse preferredTime → period
-- CRITICAL: This logic MUST be customized based on Phase 2.1 analysis!
-- Example logic (VERIFY AGAINST YOUR DATA):

UPDATE reservations
SET period =
  CASE
    -- Strategy 1: HH:MM format (24-hour)
    WHEN "preferredTime" ~ '^\d{1,2}:\d{2}$' THEN
      CASE
        WHEN CAST(SPLIT_PART("preferredTime", ':', 1) AS INTEGER) < 12 THEN 'MORNING'
        ELSE 'AFTERNOON'
      END

    -- Strategy 2: "9:00 AM" / "2:00 PM" format
    WHEN "preferredTime" ILIKE '%AM%' OR "preferredTime" ILIKE '%오전%' THEN 'MORNING'
    WHEN "preferredTime" ILIKE '%PM%' OR "preferredTime" ILIKE '%오후%' THEN 'AFTERNOON'

    -- Strategy 3: Text-based
    WHEN "preferredTime" ILIKE 'morning%' OR "preferredTime" ILIKE '오전%' THEN 'MORNING'
    WHEN "preferredTime" ILIKE 'afternoon%' OR "preferredTime" ILIKE '오후%' THEN 'AFTERNOON'

    -- Strategy 4: Default fallback (DANGEROUS - review these manually!)
    ELSE 'MORNING' -- Default to morning if unparseable
  END
WHERE period IS NULL;

-- Validation: Check for unparsed periods
DO $$
DECLARE
  unparsed_count INTEGER;
  sample_unparsed TEXT;
BEGIN
  SELECT COUNT(*) INTO unparsed_count
  FROM reservations
  WHERE period IS NULL;

  IF unparsed_count > 0 THEN
    SELECT "preferredTime" INTO sample_unparsed
    FROM reservations
    WHERE period IS NULL
    LIMIT 1;

    RAISE WARNING 'Found % reservations with unparsed period. Example: %',
                  unparsed_count,
                  sample_unparsed;
  END IF;
END $$;

COMMIT;

-- Post-migration validation (critical!)
SELECT
  'Migration Summary' as check_type,
  COUNT(*) as total_reservations,
  COUNT("serviceId") as migrated_serviceId,
  COUNT("serviceName") as migrated_serviceName,
  COUNT("estimatedDuration") as migrated_duration,
  COUNT(period) as migrated_period,
  COUNT(*) - COUNT(period) as failed_period_parse
FROM reservations;
```

---

### 2.3: Manual Review Required

```sql
-- Find reservations that need manual review
SELECT
  id,
  "patientName",
  service::text as old_service,
  "preferredTime" as old_time,
  "serviceId" as new_service_id,
  period as new_period,
  "estimatedDuration" as new_duration
FROM reservations
WHERE
  "serviceId" IS NULL
  OR period IS NULL
  OR "estimatedDuration" IS NULL
ORDER BY "preferredDate" DESC
LIMIT 100;

-- Export to CSV for manual correction
\copy (SELECT id, service, "preferredTime", period FROM reservations WHERE period IS NULL) TO '/tmp/needs_manual_review.csv' CSV HEADER;
```

**Manual Correction Process**:
1. Review `/tmp/needs_manual_review.csv`
2. Determine correct period for each row
3. Update manually:
```sql
UPDATE reservations
SET period = 'MORNING' -- or 'AFTERNOON'
WHERE id = 'xxx';
```

---

### 2.4: Add NOT NULL Constraints (After Validation)

**ONLY run this after 100% data migration confirmed!**

```sql
-- Migration: 005_make_new_fields_required.sql
-- WARNING: Only run after Phase 2 validation complete!
-- Rollback: Reverse each ALTER TABLE statement

BEGIN;

-- Make serviceId required
ALTER TABLE reservations
ALTER COLUMN "serviceId" SET NOT NULL;

-- Make serviceName required
ALTER TABLE reservations
ALTER COLUMN "serviceName" SET NOT NULL;

-- Make estimatedDuration required
ALTER TABLE reservations
ALTER COLUMN "estimatedDuration" SET NOT NULL;

-- Make period required
ALTER TABLE reservations
ALTER COLUMN period SET NOT NULL;

-- Update period to use enum (convert TEXT to Period enum)
-- First create the enum if not exists
CREATE TYPE "Period" AS ENUM ('MORNING', 'AFTERNOON');

-- Then convert the column
ALTER TABLE reservations
ALTER COLUMN period TYPE "Period" USING period::text::"Period";

COMMIT;
```

---

### Phase 2 Validation Checklist

```sql
-- 1. Verify all reservations migrated
SELECT
  COUNT(*) as total,
  COUNT("serviceId") as has_serviceId,
  COUNT("serviceName") as has_serviceName,
  COUNT("estimatedDuration") as has_duration,
  COUNT(period) as has_period
FROM reservations;
-- Expected: All counts should be equal

-- 2. Verify period distribution makes sense
SELECT
  period,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM reservations
GROUP BY period;
-- Expected: Reasonable MORNING/AFTERNOON split (roughly 50/50 or based on clinic hours)

-- 3. Verify service mapping correct
SELECT
  r.service::text as old_service,
  s.code as new_service_code,
  COUNT(*) as count
FROM reservations r
JOIN services s ON r."serviceId" = s.id
GROUP BY r.service, s.code
HAVING r.service::text != s.code;
-- Expected: 0 rows (all mappings should match)

-- 4. Verify duration calculations
SELECT
  s.code,
  s."durationMinutes",
  s."bufferMinutes",
  r."estimatedDuration",
  COUNT(*) as count
FROM reservations r
JOIN services s ON r."serviceId" = s.id
WHERE r."estimatedDuration" != (s."durationMinutes" + s."bufferMinutes")
GROUP BY s.code, s."durationMinutes", s."bufferMinutes", r."estimatedDuration";
-- Expected: 0 rows (or only old reservations before duration changes)

-- 5. Data integrity check
SELECT
  'Old fields intact' as check_type,
  COUNT(*) as total,
  COUNT(service) as has_old_service,
  COUNT("preferredTime") as has_old_time
FROM reservations;
-- Expected: All old fields still populated (dual-write period)
```

---

### Phase 2 Rollback Plan

```sql
-- Emergency rollback (if data migration failed)
BEGIN;

-- Reset all new fields to NULL
UPDATE reservations
SET
  "serviceId" = NULL,
  "serviceName" = NULL,
  "estimatedDuration" = NULL,
  period = NULL;

-- Verify old fields intact
SELECT COUNT(*) FROM reservations WHERE service IS NOT NULL AND "preferredTime" IS NOT NULL;

COMMIT;
```

---

### Phase 2 Success Criteria

✅ **Phase 2 Complete When**:
- [ ] 100% of reservations have serviceId populated
- [ ] 100% of reservations have serviceName populated
- [ ] 100% of reservations have estimatedDuration populated
- [ ] ≥95% of reservations have period parsed (manual review for rest)
- [ ] Period distribution looks reasonable (not all MORNING or all AFTERNOON)
- [ ] Old fields (service, preferredTime) still intact
- [ ] Zero data corruption detected
- [ ] Manual review completed for unparsed records
- [ ] NOT NULL constraints applied successfully

**Timeline**: 3-5 days (including manual review and validation)

---

## PHASE 3: APPLICATION SWITCHOVER (Week 3-4)

### Objective
Update application code to use new fields while maintaining rollback capability.

### 3.1: Feature Flag System

**Environment Variable**:
```env
# .env.production
USE_DYNAMIC_SERVICES=false  # Start with false
DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=0  # Gradual rollout
```

**Feature Flag Helper**:
```typescript
// lib/feature-flags.ts

export function useDynamicServices(): boolean {
  // Check environment variable
  if (process.env.USE_DYNAMIC_SERVICES === 'true') {
    return true;
  }

  // Check rollout percentage (for gradual migration)
  const rolloutPercentage = parseInt(process.env.DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE || '0');

  if (rolloutPercentage > 0) {
    // Use session-based consistent hashing for gradual rollout
    const random = Math.random() * 100;
    return random < rolloutPercentage;
  }

  return false;
}
```

---

### 3.2: Update Reservation Creation API

**Modified: app/api/public/reservations/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Gender, TreatmentType, ReservationStatus, ServiceType } from '@prisma/client';
import { canCreateReservation } from '@/lib/reservations/daily-limit-counter';
import { useDynamicServices } from '@/lib/feature-flags';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const useDynamic = useDynamicServices();

    // Validate required fields
    const requiredFields = [
      'patient_name',
      'phone',
      'birth_date',
      'gender',
      'treatment_type',
      'service',
      'preferred_date',
      useDynamic ? 'period' : 'preferred_time' // Different validation based on flag
    ];

    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    const birthDate = new Date(body.birth_date);
    const preferredDate = new Date(body.preferred_date);

    if (isNaN(birthDate.getTime()) || isNaN(preferredDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Create reservation with feature flag logic
    const reservation = await prisma.$transaction(async (tx) => {
      if (useDynamic) {
        // NEW: Dynamic service logic
        const service = await tx.service.findUnique({
          where: { code: body.service }
        });

        if (!service || !service.isActive) {
          throw new Error('INVALID_SERVICE');
        }

        // Check availability using new logic (TBD in Phase 3.3)
        const canCreate = await canCreateReservationDynamic(
          tx,
          preferredDate,
          service.id,
          body.period
        );

        if (!canCreate) {
          throw new Error('RESERVATION_FULL');
        }

        // Create with NEW fields
        return await tx.reservation.create({
          data: {
            id: crypto.randomUUID(),
            patientName: body.patient_name,
            phone: body.phone,
            email: body.email || null,
            birthDate: birthDate,
            gender: body.gender as Gender,
            treatmentType: body.treatment_type as TreatmentType,
            preferredDate: preferredDate,
            status: 'PENDING' as ReservationStatus,
            notes: body.notes || null,
            adminNotes: null,
            statusChangedAt: new Date(),
            updatedAt: new Date(),

            // NEW fields
            serviceId: service.id,
            serviceName: service.name,
            estimatedDuration: service.durationMinutes + service.bufferMinutes,
            period: body.period,

            // OLD fields (dual-write for rollback safety)
            service: body.service as ServiceType,
            preferredTime: body.period === 'MORNING' ? '09:00' : '14:00',
          }
        });
      } else {
        // OLD: Enum-based logic (existing code)
        const serviceType = body.service as ServiceType;

        const canCreate = await canCreateReservation(tx, preferredDate, serviceType);

        if (!canCreate) {
          throw new Error('RESERVATION_FULL');
        }

        // Lookup service for dual-write
        const service = await tx.service.findUnique({
          where: { code: body.service }
        });

        return await tx.reservation.create({
          data: {
            id: crypto.randomUUID(),
            patientName: body.patient_name,
            phone: body.phone,
            email: body.email || null,
            birthDate: birthDate,
            gender: body.gender as Gender,
            treatmentType: body.treatment_type as TreatmentType,
            preferredDate: preferredDate,
            status: 'PENDING' as ReservationStatus,
            notes: body.notes || null,
            adminNotes: null,
            statusChangedAt: new Date(),
            updatedAt: new Date(),

            // OLD fields
            service: serviceType,
            preferredTime: body.preferred_time,

            // NEW fields (dual-write)
            serviceId: service?.id,
            serviceName: service?.name,
            estimatedDuration: service ? service.durationMinutes + service.bufferMinutes : null,
            period: parsePreferredTimeToPeriod(body.preferred_time),
          }
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        reservation: {
          id: reservation.id,
          status: reservation.status,
          preferred_date: reservation.preferredDate.toISOString().split('T')[0],
          preferred_time: useDynamic ? reservation.period : reservation.preferredTime
        },
        message: '예약이 성공적으로 접수되었습니다.'
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  } catch (error) {
    console.error('Reservation error:', error);

    if (error instanceof Error && error.message === 'RESERVATION_FULL') {
      return NextResponse.json(
        {
          error: 'Reservation limit reached',
          message: '해당 날짜/시간대의 예약이 마감되었습니다.'
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === 'INVALID_SERVICE') {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function for parsing old preferredTime to period
function parsePreferredTimeToPeriod(preferredTime: string): 'MORNING' | 'AFTERNOON' {
  const timeStr = preferredTime.toLowerCase();

  if (timeStr.includes('am') || timeStr.includes('오전')) {
    return 'MORNING';
  }

  if (timeStr.includes('pm') || timeStr.includes('오후')) {
    return 'AFTERNOON';
  }

  // Parse HH:MM format
  const match = timeStr.match(/(\d{1,2}):?\d{0,2}/);
  if (match) {
    const hour = parseInt(match[1]);
    return hour < 12 ? 'MORNING' : 'AFTERNOON';
  }

  // Default fallback
  return 'MORNING';
}
```

---

### 3.3: Update Availability Checker

**Modified: lib/reservations/daily-limit-counter.ts**

```typescript
import { prisma } from '@/lib/prisma';
import { Prisma, ServiceType, ReservationStatus, Period } from '@prisma/client';
import { useDynamicServices } from '@/lib/feature-flags';

// NEW: Dynamic service availability check
export async function canCreateReservationDynamic(
  tx: Prisma.TransactionClient,
  date: Date,
  serviceId: string,
  period: Period
): Promise<boolean> {
  // 1. Get service details
  const service = await tx.service.findUnique({
    where: { id: serviceId },
    select: {
      durationMinutes: true,
      bufferMinutes: true,
      isActive: true
    }
  });

  if (!service || !service.isActive) {
    return false;
  }

  // 2. Get clinic time slot for this day+period
  const dayOfWeek = date.getDay();

  const timeSlot = await tx.clinicTimeSlot.findUnique({
    where: {
      dayOfWeek_period: {
        dayOfWeek,
        period
      }
    },
    select: {
      totalMinutes: true,
      isActive: true
    }
  });

  if (!timeSlot || !timeSlot.isActive) {
    return false; // Clinic closed for this period
  }

  // 3. Calculate total booked time for this date+period
  const existingReservations = await tx.reservation.findMany({
    where: {
      preferredDate: date,
      period: period,
      status: {
        in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED]
      }
    },
    select: {
      estimatedDuration: true
    }
  });

  const totalBookedMinutes = existingReservations.reduce(
    (sum, r) => sum + (r.estimatedDuration || 0),
    0
  );

  // 4. Calculate if this service fits
  const serviceMinutes = service.durationMinutes + service.bufferMinutes;
  const totalWithNewReservation = totalBookedMinutes + serviceMinutes;

  return totalWithNewReservation <= timeSlot.totalMinutes;
}

// OLD: Keep existing enum-based function for backward compatibility
export async function canCreateReservation(
  tx: Prisma.TransactionClient,
  date: Date,
  serviceType: ServiceType
): Promise<boolean> {
  const limit = await tx.service_reservation_limits.findUnique({
    where: { serviceType },
    select: {
      dailyLimit: true,
      isActive: true
    }
  });

  if (!limit || !limit.isActive) {
    return false;
  }

  const currentCount = await tx.reservations.count({
    where: {
      preferredDate: date,
      service: serviceType,
      status: { in: ['PENDING', 'CONFIRMED'] }
    }
  });

  return currentCount < limit.dailyLimit;
}

// Wrapper function with feature flag
export async function checkAvailabilityWrapper(
  date: Date,
  serviceCodeOrId: string,
  period?: Period
) {
  const useDynamic = useDynamicServices();

  if (useDynamic && period) {
    // NEW: Dynamic logic
    const service = await prisma.service.findUnique({
      where: { code: serviceCodeOrId }
    });

    if (!service) {
      return { available: false, reason: 'Invalid service' };
    }

    return await prisma.$transaction(async (tx) => {
      const canCreate = await canCreateReservationDynamic(tx, date, service.id, period);
      return {
        available: canCreate,
        // Add more details as needed
      };
    });
  } else {
    // OLD: Enum logic
    const availability = await checkAvailability(date, serviceCodeOrId as ServiceType);
    return availability;
  }
}
```

---

### 3.4: Gradual Rollout Strategy

```bash
# Week 3: Start rollout

# Day 1: Enable for 5% of traffic
USE_DYNAMIC_SERVICES=false
DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=5

# Monitor metrics:
# - Error rate
# - Reservation creation success rate
# - Response time
# - Database query performance

# Day 2-3: If stable, increase to 25%
DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=25

# Day 4-5: Increase to 50%
DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=50

# Week 4: Full rollout
USE_DYNAMIC_SERVICES=true
DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=100
```

---

### Phase 3 Monitoring

**Key Metrics to Watch**:
```sql
-- 1. Reservation creation rate (should not drop)
SELECT
  DATE_TRUNC('hour', "createdAt") as hour,
  COUNT(*) as reservations_created
FROM reservations
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;

-- 2. Dual-write validation (both old and new fields populated)
SELECT
  COUNT(*) as total,
  COUNT(service) as has_old_service,
  COUNT("serviceId") as has_new_serviceId,
  COUNT("preferredTime") as has_old_time,
  COUNT(period) as has_new_period
FROM reservations
WHERE "createdAt" >= NOW() - INTERVAL '1 hour';
-- Expected: All counts should be equal during dual-write

-- 3. Error tracking
-- (Monitor application logs for errors)
```

---

### Phase 3 Rollback Plan

**Immediate Rollback** (if errors spike):
```bash
# Set environment variables back
USE_DYNAMIC_SERVICES=false
DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=0

# Restart application
pm2 restart all  # or your deployment method

# Verify old logic working
curl -X POST http://localhost:3000/api/public/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Test",
    "phone": "010-1234-5678",
    "birth_date": "1990-01-01",
    "gender": "FEMALE",
    "treatment_type": "FIRST_VISIT",
    "service": "WRINKLE_BOTOX",
    "preferred_date": "2025-12-01",
    "preferred_time": "10:00"
  }'
```

---

### Phase 3 Success Criteria

✅ **Phase 3 Complete When**:
- [ ] Feature flag system implemented
- [ ] Code supports both old and new logic paths
- [ ] Dual-write to both old and new fields working
- [ ] Gradual rollout to 5% → 25% → 50% → 100% successful
- [ ] Zero increase in error rate
- [ ] Reservation creation rate stable or increased
- [ ] All monitoring dashboards green
- [ ] 1 week of stable 100% traffic on new system

**Timeline**: 1-2 weeks (including gradual rollout and monitoring)

---

## PHASE 4: CLEANUP (Week 5-6)

### Objective
Remove old enum and fields after new system proven stable.

### 4.1: Remove Old Fields from Reservations

```sql
-- Migration: 006_remove_old_reservation_fields.sql
-- WARNING: Only run after Phase 3 success criteria met!
-- Rollback: NOT POSSIBLE - data will be lost! Ensure Phase 3 stability first!

BEGIN;

-- 1. Drop old index
DROP INDEX IF EXISTS "reservations_preferredDate_service_status_idx";

-- 2. Remove old enum field
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "service";

-- 3. Remove old preferredTime field
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "preferredTime";

-- 4. Verify new fields are required
SELECT
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations'
AND column_name IN ('serviceId', 'serviceName', 'estimatedDuration', 'period');
-- Expected: All should be 'NO'

COMMIT;
```

---

### 4.2: Remove ServiceType Enum

```sql
-- Migration: 007_remove_service_type_enum.sql
-- WARNING: This is IRREVERSIBLE! Ensure all dependencies removed first!

BEGIN;

-- 1. Drop service_reservation_limits table (no longer needed)
DROP TABLE IF EXISTS "service_reservation_limits" CASCADE;

-- 2. Drop ServiceType enum
DROP TYPE IF EXISTS "ServiceType" CASCADE;

-- 3. Verify enum removed
SELECT typname
FROM pg_type
WHERE typname = 'ServiceType';
-- Expected: 0 rows

COMMIT;
```

---

### 4.3: Update Prisma Schema (Final)

```prisma
// Remove old enum and fields

model Reservation {
  id                String            @id
  patientName       String
  phone             String
  email             String?
  birthDate         DateTime
  gender            Gender
  treatmentType     TreatmentType
  preferredDate     DateTime          @db.Date
  status            ReservationStatus @default(PENDING)
  notes             String?
  adminNotes        String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime
  statusChangedAt   DateTime          @default(now())
  statusChangedBy   String?

  // NEW fields (now required)
  serviceId         String
  serviceName       String
  estimatedDuration Int
  period            Period

  // Relation
  service           Service           @relation("ServiceToReservation", fields: [serviceId], references: [id])

  @@map("reservations")
  @@index([status])
  @@index([serviceId, preferredDate, status])
  @@index([preferredDate, period, status])
}

// Remove ServiceType enum entirely
// (Delete enum ServiceType { ... } block)

// Remove service_reservation_limits model entirely
// (Delete model service_reservation_limits { ... } block)
```

---

### 4.4: Remove Feature Flags from Code

**Update: app/api/public/reservations/route.ts**

```typescript
// Remove useDynamicServices() checks
// Remove dual-write logic
// Keep only NEW field logic
// Simplify to single code path
```

**Delete: lib/feature-flags.ts**

```bash
rm lib/feature-flags.ts
```

---

### 4.5: Optimize Indexes

```sql
-- Migration: 008_optimize_indexes.sql

-- Add composite indexes for common queries
CREATE INDEX CONCURRENTLY "reservations_preferredDate_period_serviceId_status_idx"
ON "reservations"("preferredDate", "period", "serviceId", "status");

-- Add index for admin queries
CREATE INDEX CONCURRENTLY "reservations_createdAt_status_idx"
ON "reservations"("createdAt", "status");

-- Analyze tables for query planner
ANALYZE reservations;
ANALYZE services;
ANALYZE clinic_time_slots;
```

---

### Phase 4 Validation Checklist

```sql
-- 1. Verify old fields removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'reservations'
AND column_name IN ('service', 'preferredTime');
-- Expected: 0 rows

-- 2. Verify enum removed
SELECT typname
FROM pg_type
WHERE typname = 'ServiceType';
-- Expected: 0 rows

-- 3. Verify old table removed
SELECT tablename
FROM pg_tables
WHERE tablename = 'service_reservation_limits';
-- Expected: 0 rows

-- 4. Verify application still works
-- (Run full E2E test suite)

-- 5. Performance check
EXPLAIN ANALYZE
SELECT * FROM reservations
WHERE "preferredDate" = '2025-12-01'
AND period = 'MORNING'
AND status = 'CONFIRMED';
-- Expected: Should use new indexes efficiently
```

---

### Phase 4 Success Criteria

✅ **Phase 4 Complete When**:
- [ ] Old fields (`service`, `preferredTime`) removed from schema
- [ ] ServiceType enum deleted from database
- [ ] service_reservation_limits table deleted
- [ ] Feature flag code removed
- [ ] Application runs on single code path (new system only)
- [ ] All tests passing
- [ ] Performance metrics stable or improved
- [ ] Documentation updated

**Timeline**: 1 week (mostly testing and validation)

---

## RISK ASSESSMENT MATRIX

### High-Risk Operations

| Operation | Phase | Risk Level | Mitigation |
|-----------|-------|-----------|------------|
| preferredTime parsing | 2 | 🔴 CRITICAL | Manual analysis + review unparsed rows |
| Data migration | 2 | 🔴 CRITICAL | Dry run in staging + manual validation |
| NOT NULL constraints | 2 | 🟡 HIGH | Only after 100% data migrated |
| Application switchover | 3 | 🟡 HIGH | Feature flags + gradual rollout |
| Old field removal | 4 | 🟡 HIGH | Only after weeks of stability |
| Enum deletion | 4 | 🔴 CRITICAL | IRREVERSIBLE - ensure all deps removed |

---

## ROLLBACK DECISION TREE

```
Issue Detected?
├─ Phase 1: Data corruption?
│  ├─ YES → Run Phase 1 rollback SQL immediately
│  └─ NO → Continue to Phase 2
│
├─ Phase 2: Migration failed?
│  ├─ Parsing errors → Fix parsing logic, re-run
│  ├─ Data loss → HALT! Restore from backup
│  └─ Success → Continue to Phase 3
│
├─ Phase 3: Error rate spike?
│  ├─ >5% increase → Rollback feature flag to 0%
│  ├─ >10% increase → HALT! Investigate before proceeding
│  └─ <5% increase → Monitor, may be acceptable
│
└─ Phase 4: Application broken?
   ├─ Cannot rollback (irreversible!)
   └─ Must fix forward (restore from backup if catastrophic)
```

---

## SUCCESS METRICS

### Business Metrics (Track Throughout)
- **Reservation Success Rate**: Should maintain ≥98%
- **User Complaint Rate**: Should not increase
- **Booking Response Time**: Should stay <500ms
- **Data Accuracy**: 100% reservation data preserved

### Technical Metrics
- **Database Query Time**: <50ms for availability checks
- **Migration Duration**: Phase 2 should complete in <5 minutes
- **Rollback Time**: <30 seconds to revert feature flag
- **Downtime**: 0 seconds

---

## TIMELINE SUMMARY

```
Week 1: Phase 1 - Additive Changes
├─ Day 1-2: Create new tables and fields
├─ Day 3: Validate schema changes
├─ Day 4-5: Monitor production stability
└─ Status: LOW RISK - only adding, not changing

Week 2: Phase 2 - Data Migration
├─ Day 1: Analyze production data formats
├─ Day 2: Customize migration SQL based on analysis
├─ Day 3: Run migration + validation
├─ Day 4-5: Manual review and corrections
└─ Status: HIGH RISK - data transformation

Week 3-4: Phase 3 - Application Switchover
├─ Week 3: Gradual rollout (5% → 25% → 50%)
├─ Week 4: Full rollout (100%)
└─ Status: MEDIUM RISK - behavioral change

Week 5-6: Phase 4 - Cleanup
├─ Week 5: Remove old fields and enum
├─ Week 6: Remove feature flags and optimize
└─ Status: LOW RISK - cleanup after stability proven

Total: 6 weeks for complete migration
```

---

## EMERGENCY CONTACTS

**Before starting migration, document**:
- Database admin: [Name, Phone, Email]
- Application owner: [Name, Phone, Email]
- Backup location: [Path/URL]
- Rollback authority: [Who can approve emergency rollback]
- Maintenance window: [Preferred time for risky operations]

---

## FINAL CHECKLIST BEFORE STARTING

**Pre-Migration Requirements**:
- [ ] Full database backup created
- [ ] Backup restoration tested successfully
- [ ] Staging environment mirrors production
- [ ] All migrations tested in staging
- [ ] Team trained on rollback procedures
- [ ] Monitoring dashboards configured
- [ ] Emergency contacts documented
- [ ] Stakeholders notified of timeline
- [ ] Feature flag system tested
- [ ] Code review completed
- [ ] This migration plan reviewed by team

**DO NOT PROCEED UNTIL ALL CHECKBOXES CHECKED!**

---

## CONCLUSION

This migration strategy prioritizes **safety over speed** with:

✅ **Zero Data Loss**: Dual-write period ensures old data preserved
✅ **Zero Downtime**: Additive changes + feature flags enable live migration
✅ **Rollback Capability**: Every phase has defined rollback procedures
✅ **Gradual Validation**: 4 phases with extensive validation between each
✅ **Production-Safe**: Designed for live hospital reservation system

**Critical Success Factor**: NEVER skip validation steps. Each phase builds on the previous phase's success.

**Next Step**: Review this plan with team, customize Phase 2 migration SQL based on production data analysis, then execute Phase 1 in staging environment.
