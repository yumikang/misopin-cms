-- Add serviceId column and related fields to service_reservation_limits

-- Step 1: Add new columns (nullable)
ALTER TABLE "service_reservation_limits"
ADD COLUMN IF NOT EXISTS "serviceId" TEXT,
ADD COLUMN IF NOT EXISTS "reason" TEXT,
ADD COLUMN IF NOT EXISTS "updatedBy" VARCHAR(255);

-- Step 2: Create index on serviceId
CREATE INDEX IF NOT EXISTS "service_reservation_limits_serviceId_idx" ON "service_reservation_limits"("serviceId");

-- Step 3: Create index on isActive (if not exists)
CREATE INDEX IF NOT EXISTS "service_reservation_limits_isActive_idx" ON "service_reservation_limits"("isActive");

-- Note: Foreign key constraint will be added after data migration
-- Note: UNIQUE constraint on serviceId will be added after data migration
