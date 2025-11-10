-- Rollback Migration: Remove manual_time_closures table
-- Date: 2025-11-06
-- Use only if migration needs to be reverted

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_closures_service;
DROP INDEX IF EXISTS idx_closures_date_period_active;
DROP INDEX IF EXISTS idx_closures_date_active;

-- Drop table (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS manual_time_closures CASCADE;

COMMIT;
