-- ===============================================
-- Supabase 데이터베이스 완전 초기화 스크립트
-- 실행 전 주의: 모든 데이터가 삭제됩니다!
-- ===============================================

-- 현재 스키마 확인
DO $$
DECLARE
    table_count INTEGER;
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    SELECT COUNT(*) INTO type_count
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typtype = 'e';

    RAISE NOTICE '현재 public 스키마에 % 개의 테이블과 % 개의 타입이 있습니다.', table_count, type_count;
END $$;

-- ===============================================
-- 1. 뷰 삭제
-- ===============================================
DROP VIEW IF EXISTS active_popups CASCADE;
DROP VIEW IF EXISTS published_posts CASCADE;
DROP VIEW IF EXISTS file_stats CASCADE;

-- ===============================================
-- 2. 모든 테이블 삭제 (CASCADE로 관련 객체도 함께 삭제)
-- ===============================================

-- 웹빌더 관련 테이블
DROP TABLE IF EXISTS content_versions CASCADE;
DROP TABLE IF EXISTS page_blocks CASCADE;
DROP TABLE IF EXISTS block_templates CASCADE;
DROP TABLE IF EXISTS content_blocks CASCADE;
DROP TABLE IF EXISTS seo_settings CASCADE;

-- 핵심 테이블
DROP TABLE IF EXISTS file_uploads CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS board_posts CASCADE;
DROP TABLE IF EXISTS popups CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Prisma 마이그레이션 테이블 (있다면)
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- ===============================================
-- 3. 모든 함수 삭제
-- ===============================================
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ===============================================
-- 4. 모든 열거형 타입 삭제
-- ===============================================

-- 웹빌더 타입
DROP TYPE IF EXISTS template_category CASCADE;
DROP TYPE IF EXISTS block_type CASCADE;

-- 핵심 타입
DROP TYPE IF EXISTS board_type CASCADE;
DROP TYPE IF EXISTS popup_position CASCADE;
DROP TYPE IF EXISTS popup_type CASCADE;
DROP TYPE IF EXISTS display_type CASCADE;
DROP TYPE IF EXISTS position_type CASCADE;
DROP TYPE IF EXISTS treatment_type CASCADE;
DROP TYPE IF EXISTS gender CASCADE;
DROP TYPE IF EXISTS reservation_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 기타 가능한 타입들
DROP TYPE IF EXISTS "BlockType" CASCADE;
DROP TYPE IF EXISTS "BoardType" CASCADE;
DROP TYPE IF EXISTS "Gender" CASCADE;
DROP TYPE IF EXISTS "PopupType" CASCADE;
DROP TYPE IF EXISTS "ReservationStatus" CASCADE;
DROP TYPE IF EXISTS "TreatmentType" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "TemplateCategory" CASCADE;

-- ===============================================
-- 5. 시퀀스 삭제 (있다면)
-- ===============================================
DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', seq.sequence_name);
    END LOOP;
END $$;

-- ===============================================
-- 6. 확장 기능 재설정
-- ===============================================
-- UUID 확장 기능은 유지 (Supabase 기본)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- 7. 정리 완료 확인
-- ===============================================
DO $$
DECLARE
    remaining_tables INTEGER;
    remaining_types INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews');

    SELECT COUNT(*) INTO remaining_types
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typtype = 'e';

    RAISE NOTICE '====================================';
    RAISE NOTICE '정리 완료!';
    RAISE NOTICE '남은 테이블: % 개', remaining_tables;
    RAISE NOTICE '남은 타입: % 개', remaining_types;
    RAISE NOTICE '====================================';
    RAISE NOTICE '이제 02_schema.sql을 실행하여 새 스키마를 생성하세요.';
END $$;