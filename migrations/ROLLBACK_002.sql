-- Rollback Migration: Revert manual_time_closures.period back to VARCHAR
-- Date: 2025-11-07
-- Purpose: Emergency rollback if migration 002 causes issues
--
-- WARNING: This should only be used if the migration causes production issues
--          and you need to quickly restore the previous (broken) state.

BEGIN;

RAISE NOTICE 'Starting rollback: Converting period column from Period enum back to VARCHAR...';

-- Revert column type back to VARCHAR
ALTER TABLE manual_time_closures
  ALTER COLUMN period
  TYPE VARCHAR(20)
  USING period::text;

RAISE NOTICE '✓ Column type reverted to VARCHAR(20)';

-- Verification
DO $$
DECLARE
  column_type TEXT;
  column_udt TEXT;
BEGIN
  SELECT data_type, udt_name INTO column_type, column_udt
  FROM information_schema.columns
  WHERE table_name = 'manual_time_closures'
    AND column_name = 'period';

  IF column_type != 'character varying' THEN
    RAISE EXCEPTION 'Rollback verification failed: column type is %', column_type;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Rollback completed';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Column: manual_time_closures.period';
  RAISE NOTICE 'Reverted To: VARCHAR(20)';
  RAISE NOTICE 'Status: Back to broken state (type mismatch exists again)';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- NEXT STEPS AFTER ROLLBACK
-- 1. Re-comment the validation code in app/api/public/reservations/route.ts
-- 2. Investigate why the migration failed
-- 3. Fix the root cause before attempting migration again
