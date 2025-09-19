-- Verification script for webbuilder database migration
-- This script verifies that all webbuilder models have been successfully applied to the database

-- Check if content_blocks table exists and has correct structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'content_blocks'
ORDER BY ordinal_position;

-- Check if page_blocks table exists and has correct structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'page_blocks'
ORDER BY ordinal_position;

-- Check if seo_settings table exists and has correct structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'seo_settings'
ORDER BY ordinal_position;

-- Check if content_versions table exists and has correct structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'content_versions'
ORDER BY ordinal_position;

-- Verify indexes exist
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN ('content_blocks', 'page_blocks', 'seo_settings', 'content_versions')
ORDER BY tablename, indexname;

-- Verify foreign key constraints exist
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE contype = 'f'
AND conrelid::regclass::text IN ('content_blocks', 'page_blocks', 'seo_settings', 'content_versions')
ORDER BY table_name, constraint_name;

-- Count records in each table to verify they're accessible
SELECT 'content_blocks' as table_name, COUNT(*) as record_count FROM content_blocks
UNION ALL
SELECT 'page_blocks' as table_name, COUNT(*) as record_count FROM page_blocks
UNION ALL
SELECT 'seo_settings' as table_name, COUNT(*) as record_count FROM seo_settings
UNION ALL
SELECT 'content_versions' as table_name, COUNT(*) as record_count FROM content_versions;