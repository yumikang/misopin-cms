-- Step 1: Create new service_reservation_limits table
CREATE TABLE IF NOT EXISTS "service_reservation_limits" (
    "id" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "softLimit" INTEGER NOT NULL DEFAULT 8,
    "hardLimit" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_reservation_limits_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique index on serviceType
CREATE UNIQUE INDEX IF NOT EXISTS "service_reservation_limits_serviceType_key" ON "service_reservation_limits"("serviceType");

-- Step 3: Migrate data from daily_reservation_limits to service_reservation_limits
-- Take the most recent/highest limits for each service type
INSERT INTO "service_reservation_limits" ("id", "serviceType", "softLimit", "hardLimit", "isActive", "createdAt", "updatedAt")
SELECT
    'limit_' || "serviceType"::text AS "id",
    "serviceType",
    MAX("softLimit") AS "softLimit",
    MAX("hardLimit") AS "hardLimit",
    true AS "isActive",
    NOW() AS "createdAt",
    NOW() AS "updatedAt"
FROM "daily_reservation_limits"
WHERE "isActive" = true
GROUP BY "serviceType"
ON CONFLICT ("serviceType") DO NOTHING;

-- Step 4: Ensure all service types have limits (insert defaults for missing ones)
INSERT INTO "service_reservation_limits" ("id", "serviceType", "softLimit", "hardLimit", "isActive", "createdAt", "updatedAt")
VALUES
    ('limit_WRINKLE_BOTOX', 'WRINKLE_BOTOX', 8, 10, true, NOW(), NOW()),
    ('limit_VOLUME_LIFTING', 'VOLUME_LIFTING', 8, 10, true, NOW(), NOW()),
    ('limit_SKIN_CARE', 'SKIN_CARE', 8, 10, true, NOW(), NOW()),
    ('limit_REMOVAL_PROCEDURE', 'REMOVAL_PROCEDURE', 8, 10, true, NOW(), NOW()),
    ('limit_BODY_CARE', 'BODY_CARE', 8, 10, true, NOW(), NOW()),
    ('limit_OTHER_CONSULTATION', 'OTHER_CONSULTATION', 8, 10, true, NOW(), NOW())
ON CONFLICT ("serviceType") DO NOTHING;

-- Step 5: Backup old table (rename instead of drop)
ALTER TABLE IF EXISTS "daily_reservation_limits" RENAME TO "_daily_reservation_limits_backup";

-- Step 6: Remove dailyLimitSnapshot column from reservations (if exists)
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "dailyLimitSnapshot";

-- Step 7: Optimize reservations table - Change preferredDate to DATE type if not already
-- This may fail if data type is already correct, which is fine
DO $$
BEGIN
    ALTER TABLE "reservations" ALTER COLUMN "preferredDate" TYPE DATE;
EXCEPTION
    WHEN others THEN
        -- Ignore errors if column is already DATE type
        NULL;
END $$;
