-- Migration: Change service from String to ServiceType enum
-- Date: 2025-10-16

-- Step 1: Create ServiceType enum
CREATE TYPE "ServiceType" AS ENUM (
  'WRINKLE_BOTOX',
  'VOLUME_LIFTING',
  'SKIN_CARE',
  'REMOVAL_PROCEDURE',
  'BODY_CARE',
  'OTHER_CONSULTATION'
);

-- Step 2: Delete existing test reservations (since we're changing the schema significantly)
DELETE FROM reservations;

-- Step 3: Drop the old service column
ALTER TABLE reservations DROP COLUMN service;

-- Step 4: Add new service column with ServiceType enum
ALTER TABLE reservations ADD COLUMN service "ServiceType" NOT NULL DEFAULT 'OTHER_CONSULTATION';

-- Step 5: Remove the default (we only needed it for the ALTER TABLE)
ALTER TABLE reservations ALTER COLUMN service DROP DEFAULT;
