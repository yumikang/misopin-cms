-- =============================================================================
-- Misopin CMS - Optimistic Locking & Sync Queue Migration
-- =============================================================================
-- 날짜: 2025-10-30
-- 목적: 정적 페이지 에디터의 동시 편집 충돌 방지 및 DB-파일 동기화 개선
--
-- 실행 순서:
-- 1. migration.sql - 테이블 구조 변경
-- 2. trigger_version_increment.sql - version 자동 증가
-- 3. trigger_lock_expiry_check.sql - 잠금 만료 자동 처리
-- 4. trigger_element_change_tracking.sql - 변경 이력 추적
--
-- 주의사항:
-- - 실행 전 반드시 데이터베이스 백업 필요
-- - 트랜잭션으로 실행하여 오류 시 자동 롤백
-- - 실행 후 Prisma Client 재생성 필요: npx prisma generate
-- =============================================================================

BEGIN;

-- Step 1: 테이블 구조 변경
\echo '=== Step 1: Applying schema changes ==='
\i migration.sql

-- Step 2: Version 자동 증가 트리거
\echo '=== Step 2: Creating version increment trigger ==='
\i trigger_version_increment.sql

-- Step 3: 잠금 만료 체크 트리거
\echo '=== Step 3: Creating lock expiry check trigger ==='
\i trigger_lock_expiry_check.sql

-- Step 4: 요소 변경 추적 트리거
\echo '=== Step 4: Creating element change tracking trigger ==='
\i trigger_element_change_tracking.sql

COMMIT;

\echo '=== Migration completed successfully! ==='
\echo 'Next steps:'
\echo '1. Run: npx prisma generate'
\echo '2. Restart your application'
\echo '3. Test optimistic locking and edit locks'
