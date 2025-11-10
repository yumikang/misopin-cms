-- Migration: Fix manual_time_closures.period type mismatch
-- Date: 2025-11-07
-- Issue: Column is VARCHAR but should be Period enum
-- Root Cause: Manual migration used VARCHAR(20) instead of "Period" enum type
--
-- This migration fixes the type mismatch between Prisma schema (expects Period enum)
-- and actual database schema (has VARCHAR).

BEGIN;

-- ============================================================================
-- VALIDATION: Check for invalid data before migration
-- ============================================================================

DO $$
DECLARE
  invalid_count INTEGER;
  invalid_values TEXT;
BEGIN
  -- Count rows with invalid period values
  SELECT COUNT(*) INTO invalid_count
  FROM manual_time_closures
  WHERE period NOT IN ('MORNING', 'AFTERNOON');

  -- If invalid data exists, show what it is and abort
  IF invalid_count > 0 THEN
    SELECT STRING_AGG(DISTINCT period, ', ') INTO invalid_values
    FROM manual_time_closures
    WHERE period NOT IN ('MORNING', 'AFTERNOON');

    RAISE EXCEPTION 'Found % rows with invalid period values: %. Fix these before migration.',
      invalid_count, invalid_values;
  END IF;

  RAISE NOTICE '✓ Validation passed: All period values are valid (MORNING or AFTERNOON)';
END $$;

-- ============================================================================
-- MIGRATION: Alter column to use Period enum type
-- ============================================================================

RAISE NOTICE 'Starting migration: Converting period column from VARCHAR to Period enum...';

-- Alter the column type with explicit casting
-- The USING clause tells PostgreSQL how to convert existing VARCHAR values to enum
ALTER TABLE manual_time_closures
  ALTER COLUMN period
  TYPE "Period"
  USING period::text::"Period";

RAISE NOTICE '✓ Column type altered successfully';

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  column_type TEXT;
  column_udt TEXT;
  test_query_count INTEGER;
BEGIN
  -- Verify column type changed correctly
  SELECT data_type, udt_name INTO column_type, column_udt
  FROM information_schema.columns
  WHERE table_name = 'manual_time_closures'
    AND column_name = 'period';

  -- Check if type is now correct
  IF column_udt != 'Period' THEN
    RAISE EXCEPTION 'Migration verification failed: column type is still % (udt: %)',
      column_type, column_udt;
  END IF;

  RAISE NOTICE '✓ Verification passed: column type is now Period enum';

  -- Test a query to ensure Prisma can query correctly
  SELECT COUNT(*) INTO test_query_count
  FROM manual_time_closures
  WHERE period = 'MORNING'::"Period";

  RAISE NOTICE '✓ Query test passed: Found % rows with MORNING period', test_query_count;

  -- Summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Column: manual_time_closures.period';
  RAISE NOTICE 'Old Type: character varying (VARCHAR)';
  RAISE NOTICE 'New Type: Period enum';
  RAISE NOTICE 'Data Preserved: All existing rows maintained';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- NEXT STEPS (Manual Actions Required)
-- ============================================================================

-- 1. Regenerate Prisma Client
--    $ npx prisma generate

-- 2. Re-enable commented validation code
--    File: app/api/public/reservations/route.ts (lines 167-200)
--    Uncomment the manual closure validation block

-- 3. Run tests to verify fix
--    $ npm test -- lib/reservations/time-slot-calculator

-- 4. Verify API works
--    $ node scripts/check-closures.js

-- 5. Test manual closure creation
--    Use admin panel to create a test closure
