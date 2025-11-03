-- =============================================================================
-- Trigger 1: Optimistic Locking - Version 자동 증가
-- =============================================================================
-- 목적: static_pages 업데이트 시 version을 자동으로 +1 증가
-- 동작: UPDATE 작업 전에 version 값을 원자적으로 증가시킴

CREATE OR REPLACE FUNCTION increment_static_page_version()
RETURNS TRIGGER AS $$
BEGIN
  -- version 필드가 명시적으로 변경되지 않은 경우에만 자동 증가
  IF NEW.version = OLD.version THEN
    NEW.version := OLD.version + 1;
  END IF;

  -- updatedAt도 자동으로 현재 시각으로 설정
  NEW."updatedAt" := CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (이미 존재하면 먼저 삭제)
DROP TRIGGER IF EXISTS trg_increment_static_page_version ON static_pages;

CREATE TRIGGER trg_increment_static_page_version
  BEFORE UPDATE ON static_pages
  FOR EACH ROW
  WHEN (
    -- sections, editMode, 또는 주요 컨텐츠 필드가 변경된 경우에만 실행
    OLD.sections IS DISTINCT FROM NEW.sections OR
    OLD."editMode" IS DISTINCT FROM NEW."editMode" OR
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD."filePath" IS DISTINCT FROM NEW."filePath"
  )
  EXECUTE FUNCTION increment_static_page_version();

-- 설명:
-- 1. version 충돌 감지: 클라이언트가 이전 version으로 업데이트 시도하면 PostgreSQL constraint로 실패
-- 2. 원자성 보장: BEFORE UPDATE 트리거로 트랜잭션 내에서 원자적 증가
-- 3. 조건부 실행: 실제 컨텐츠 변경 시에만 version 증가 (메타데이터 변경은 제외)
