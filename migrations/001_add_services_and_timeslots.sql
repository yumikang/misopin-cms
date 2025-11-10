-- ============================================================================
-- Migration: Add Services and Time Slots System
-- Database: PostgreSQL (misopin_cms)
-- Strategy: Zero-downtime, additive-first approach
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create New Enums
-- ============================================================================

-- Create Period enum for time slot categorization
DO $$ BEGIN
    CREATE TYPE "Period" AS ENUM ('MORNING', 'AFTERNOON');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create DayOfWeek enum for clinic scheduling
DO $$ BEGIN
    CREATE TYPE "DayOfWeek" AS ENUM (
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 2: Create services Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "services" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "durationMinutes" INTEGER NOT NULL,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- Create unique index on service code
CREATE UNIQUE INDEX IF NOT EXISTS "services_code_key"
ON "services"("code");

-- Create index for active services lookup
CREATE INDEX IF NOT EXISTS "services_isActive_displayOrder_idx"
ON "services"("isActive", "displayOrder");

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS "services_category_idx"
ON "services"("category");

-- ============================================================================
-- STEP 3: Create clinic_time_slots Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "clinic_time_slots" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "period" "Period" NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "slotInterval" INTEGER NOT NULL DEFAULT 30,
    "maxConcurrent" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATE,
    "effectiveUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_time_slots_pkey" PRIMARY KEY ("id")
);

-- Create index for active time slots lookup
CREATE INDEX IF NOT EXISTS "clinic_time_slots_isActive_idx"
ON "clinic_time_slots"("isActive");

-- Create composite index for day/period lookup
CREATE INDEX IF NOT EXISTS "clinic_time_slots_dayOfWeek_period_idx"
ON "clinic_time_slots"("dayOfWeek", "period");

-- Create index for service-specific time slots
CREATE INDEX IF NOT EXISTS "clinic_time_slots_serviceId_idx"
ON "clinic_time_slots"("serviceId");

-- Create index for effective date range queries
CREATE INDEX IF NOT EXISTS "clinic_time_slots_effectiveFrom_effectiveUntil_idx"
ON "clinic_time_slots"("effectiveFrom", "effectiveUntil");

-- ============================================================================
-- STEP 4: Add New Columns to reservations Table
-- ============================================================================

-- Add serviceId column (nullable for backward compatibility)
ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "serviceId" TEXT;

-- Add serviceName column for denormalization
ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "serviceName" VARCHAR(100);

-- Add estimated duration
ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "estimatedDuration" INTEGER;

-- Add period classification
ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "period" "Period";

-- Add time slot boundaries
ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "timeSlotStart" VARCHAR(5);

ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "timeSlotEnd" VARCHAR(5);

-- ============================================================================
-- STEP 5: Create Indexes on reservations New Columns
-- ============================================================================

-- Index for service-based queries
CREATE INDEX IF NOT EXISTS "reservations_serviceId_idx"
ON "reservations"("serviceId");

-- Index for period-based filtering
CREATE INDEX IF NOT EXISTS "reservations_period_idx"
ON "reservations"("period");

-- Composite index for date + period queries
CREATE INDEX IF NOT EXISTS "reservations_preferredDate_period_idx"
ON "reservations"("preferredDate", "period");

-- ============================================================================
-- STEP 6: Insert Initial Service Data
-- ============================================================================

-- Insert WRINKLE_BOTOX service
INSERT INTO "services" (
    "id",
    "code",
    "name",
    "description",
    "category",
    "durationMinutes",
    "bufferMinutes",
    "isActive",
    "displayOrder",
    "createdAt",
    "updatedAt"
) VALUES (
    'srv_wrinkle_botox_001',
    'WRINKLE_BOTOX',
    '주름 보톡스',
    '얼굴 주름 개선을 위한 보톡스 시술',
    'BOTOX',
    30,
    10,
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;

-- ============================================================================
-- STEP 7: Insert Clinic Time Slots (Monday-Friday, Morning/Afternoon)
-- ============================================================================

-- Helper function to generate time slot IDs
CREATE OR REPLACE FUNCTION generate_timeslot_id(day TEXT, period TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN 'ts_' || LOWER(day) || '_' || LOWER(period);
END;
$$ LANGUAGE plpgsql;

-- Monday Morning (09:00-12:00)
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('MONDAY', 'MORNING'),
    NULL, -- NULL = applies to all services
    'MONDAY',
    'MORNING',
    '09:00',
    '12:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Monday Afternoon (14:00-18:00)
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('MONDAY', 'AFTERNOON'),
    NULL,
    'MONDAY',
    'AFTERNOON',
    '14:00',
    '18:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Tuesday Morning
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('TUESDAY', 'MORNING'),
    NULL,
    'TUESDAY',
    'MORNING',
    '09:00',
    '12:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Tuesday Afternoon
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('TUESDAY', 'AFTERNOON'),
    NULL,
    'TUESDAY',
    'AFTERNOON',
    '14:00',
    '18:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Wednesday Morning
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('WEDNESDAY', 'MORNING'),
    NULL,
    'WEDNESDAY',
    'MORNING',
    '09:00',
    '12:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Wednesday Afternoon
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('WEDNESDAY', 'AFTERNOON'),
    NULL,
    'WEDNESDAY',
    'AFTERNOON',
    '14:00',
    '18:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Thursday Morning
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('THURSDAY', 'MORNING'),
    NULL,
    'THURSDAY',
    'MORNING',
    '09:00',
    '12:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Thursday Afternoon
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('THURSDAY', 'AFTERNOON'),
    NULL,
    'THURSDAY',
    'AFTERNOON',
    '14:00',
    '18:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Friday Morning
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('FRIDAY', 'MORNING'),
    NULL,
    'FRIDAY',
    'MORNING',
    '09:00',
    '12:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Friday Afternoon
INSERT INTO "clinic_time_slots" (
    "id", "serviceId", "dayOfWeek", "period", "startTime", "endTime",
    "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt"
) VALUES (
    generate_timeslot_id('FRIDAY', 'AFTERNOON'),
    NULL,
    'FRIDAY',
    'AFTERNOON',
    '14:00',
    '18:00',
    30,
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- STEP 8: Backfill Existing Reservations with New Fields
-- ============================================================================

-- Update all existing WRINKLE_BOTOX reservations with service information
UPDATE "reservations"
SET
    "serviceId" = 'srv_wrinkle_botox_001',
    "serviceName" = '주름 보톡스',
    "estimatedDuration" = 30,
    "period" = CASE
        WHEN CAST(SPLIT_PART("preferredTime", ':', 1) AS INTEGER) < 12 THEN 'MORNING'::"Period"
        ELSE 'AFTERNOON'::"Period"
    END,
    "timeSlotStart" = "preferredTime",
    "timeSlotEnd" = TO_CHAR(
        TO_TIMESTAMP("preferredTime", 'HH24:MI') + INTERVAL '30 minutes',
        'HH24:MI'
    )
WHERE
    "service" = 'WRINKLE_BOTOX'
    AND "serviceId" IS NULL; -- Only update rows that haven't been updated yet

-- ============================================================================
-- STEP 9: Add Foreign Key Constraints
-- ============================================================================

-- Add foreign key from clinic_time_slots to services (optional relationship)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clinic_time_slots_serviceId_fkey'
    ) THEN
        ALTER TABLE "clinic_time_slots"
        ADD CONSTRAINT "clinic_time_slots_serviceId_fkey"
        FOREIGN KEY ("serviceId")
        REFERENCES "services"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key from reservations to services (optional relationship)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'reservations_serviceId_fkey'
    ) THEN
        ALTER TABLE "reservations"
        ADD CONSTRAINT "reservations_serviceId_fkey"
        FOREIGN KEY ("serviceId")
        REFERENCES "services"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- STEP 10: Cleanup Temporary Functions
-- ============================================================================

DROP FUNCTION IF EXISTS generate_timeslot_id(TEXT, TEXT);

-- ============================================================================
-- Migration Summary
-- ============================================================================

DO $$
DECLARE
    service_count INTEGER;
    timeslot_count INTEGER;
    updated_reservations INTEGER;
BEGIN
    SELECT COUNT(*) INTO service_count FROM "services";
    SELECT COUNT(*) INTO timeslot_count FROM "clinic_time_slots";
    SELECT COUNT(*) INTO updated_reservations FROM "reservations" WHERE "serviceId" IS NOT NULL;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Services created: %', service_count;
    RAISE NOTICE 'Time slots created: %', timeslot_count;
    RAISE NOTICE 'Reservations updated: %', updated_reservations;
    RAISE NOTICE '============================================================================';
END $$;

COMMIT;

-- ============================================================================
-- Rollback Script (for emergency use only)
-- ============================================================================
-- UNCOMMENT AND RUN ONLY IF ROLLBACK IS NEEDED
--
-- BEGIN;
--
-- -- Remove foreign keys
-- ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_serviceId_fkey";
-- ALTER TABLE "clinic_time_slots" DROP CONSTRAINT IF EXISTS "clinic_time_slots_serviceId_fkey";
--
-- -- Remove new columns from reservations
-- ALTER TABLE "reservations" DROP COLUMN IF EXISTS "serviceId";
-- ALTER TABLE "reservations" DROP COLUMN IF EXISTS "serviceName";
-- ALTER TABLE "reservations" DROP COLUMN IF EXISTS "estimatedDuration";
-- ALTER TABLE "reservations" DROP COLUMN IF EXISTS "period";
-- ALTER TABLE "reservations" DROP COLUMN IF EXISTS "timeSlotStart";
-- ALTER TABLE "reservations" DROP COLUMN IF EXISTS "timeSlotEnd";
--
-- -- Drop new tables
-- DROP TABLE IF EXISTS "clinic_time_slots";
-- DROP TABLE IF EXISTS "services";
--
-- -- Drop enums
-- DROP TYPE IF EXISTS "Period";
-- DROP TYPE IF EXISTS "DayOfWeek";
--
-- COMMIT;
