-- Migration: Simplify to single daily limit
-- Remove softLimit and hardLimit, replace with single dailyLimit column
-- Keep hardLimit value as the new dailyLimit

-- Add new dailyLimit column with values from hardLimit
ALTER TABLE "service_reservation_limits"
ADD COLUMN "dailyLimit" INTEGER NOT NULL DEFAULT 10;

-- Copy hardLimit values to dailyLimit
UPDATE "service_reservation_limits"
SET "dailyLimit" = "hardLimit";

-- Drop old columns
ALTER TABLE "service_reservation_limits"
DROP COLUMN "softLimit",
DROP COLUMN "hardLimit";
