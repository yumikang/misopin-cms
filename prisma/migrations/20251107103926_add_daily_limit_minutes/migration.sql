-- Add daily_limit_minutes column for time-based service limits
-- Migration from count-based (dailyLimit: 2건) to time-based (dailyLimitMinutes: 80분)

-- Step 1: Add new column (nullable initially)
ALTER TABLE "service_reservation_limits"
ADD COLUMN "dailyLimitMinutes" INTEGER;

-- Step 2: Migrate data from count-based to time-based
-- Formula: dailyLimitMinutes = dailyLimit × (durationMinutes + bufferMinutes)
UPDATE "service_reservation_limits" srl
SET "dailyLimitMinutes" = srl."dailyLimit" * (
  SELECT (s."durationMinutes" + s."bufferMinutes")
  FROM "services" s
  WHERE s.id = srl."serviceId"
)
WHERE srl."serviceId" IS NOT NULL;

-- Step 3: Add index for performance
CREATE INDEX "idx_service_limits_minutes" ON "service_reservation_limits"("dailyLimitMinutes");

-- Step 4: Add comment for documentation
COMMENT ON COLUMN "service_reservation_limits"."dailyLimitMinutes" IS 'Daily limit in minutes (time-based). Replaces count-based dailyLimit.';

-- Verification query (run manually to verify migration)
-- SELECT
--   "serviceType",
--   "dailyLimit" as old_count_based,
--   "dailyLimitMinutes" as new_time_based,
--   s.name as service_name,
--   (s."durationMinutes" + s."bufferMinutes") as service_total_duration
-- FROM "service_reservation_limits" srl
-- LEFT JOIN "services" s ON srl."serviceId" = s.id
-- ORDER BY "serviceType";

-- Expected results:
-- WRINKLE_BOTOX: 2건 × 40분 = 80분
-- VOLUME_LIFTING: 3건 × 50분 = 150분
-- SKIN_CARE: 5건 × 60분 = 300분
-- REMOVAL_PROCEDURE: 3건 × 40분 = 120분
-- BODY_CARE: 5건 × 70분 = 350분
-- OTHER_CONSULTATION: 5건 × 30분 = 150분
