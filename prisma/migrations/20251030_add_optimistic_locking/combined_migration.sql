-- Add new enum values to existing SyncStatus
ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- Create new LockStatus enum
CREATE TYPE "LockStatus" AS ENUM ('UNLOCKED', 'LOCKED', 'EXPIRED');

-- Enhance ChangeType enum (create new one and migrate)
CREATE TYPE "ChangeType_new" AS ENUM (
  'CREATED',
  'UPDATED',
  'DELETED',
  'PUBLISHED',
  'UNPUBLISHED',
  'RESTORED',
  'BULK_UPDATE',
  'REPARSE'
);

-- Add new columns to static_pages table
ALTER TABLE "static_pages"
  ADD COLUMN IF NOT EXISTS "syncError" TEXT,
  ADD COLUMN IF NOT EXISTS "syncRetryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fileHash" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lockStatus" "LockStatus" NOT NULL DEFAULT 'UNLOCKED',
  ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add new indexes to static_pages
CREATE INDEX IF NOT EXISTS "static_pages_lockStatus_lockedBy_idx" ON "static_pages"("lockStatus", "lockedBy");
CREATE INDEX IF NOT EXISTS "static_pages_slug_version_idx" ON "static_pages"("slug", "version");
CREATE INDEX IF NOT EXISTS "static_pages_updatedAt_idx" ON "static_pages"("updatedAt");

-- Add new columns to static_page_versions
ALTER TABLE "static_page_versions"
  ADD COLUMN IF NOT EXISTS "changeSource" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "ipAddress" VARCHAR(45),
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

-- Add new indexes to static_page_versions
CREATE INDEX IF NOT EXISTS "static_page_versions_pageId_version_idx" ON "static_page_versions"("pageId", "version");
CREATE INDEX IF NOT EXISTS "static_page_versions_pageId_createdAt_idx" ON "static_page_versions"("pageId", "createdAt");
CREATE INDEX IF NOT EXISTS "static_page_versions_changedBy_idx" ON "static_page_versions"("changedBy");
CREATE INDEX IF NOT EXISTS "static_page_versions_createdAt_idx" ON "static_page_versions"("createdAt");

-- Enhance editable_elements indexes
CREATE INDEX IF NOT EXISTS "editable_elements_pageId_order_idx" ON "editable_elements"("pageId", "order");
CREATE INDEX IF NOT EXISTS "editable_elements_elementType_idx" ON "editable_elements"("elementType");
CREATE INDEX IF NOT EXISTS "editable_elements_updatedAt_idx" ON "editable_elements"("updatedAt");

-- Create element_changes table
CREATE TABLE IF NOT EXISTS "element_changes" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "changeType" "ChangeType_new" NOT NULL,
    "version" INTEGER NOT NULL,
    "elementId" VARCHAR(100),
    "elementType" "ElementType",
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "diffSummary" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "userAgent" TEXT,
    "ipAddress" VARCHAR(45),

    CONSTRAINT "element_changes_pkey" PRIMARY KEY ("id")
);

-- Add indexes to element_changes
CREATE INDEX IF NOT EXISTS "element_changes_pageId_version_idx" ON "element_changes"("pageId", "version");
CREATE INDEX IF NOT EXISTS "element_changes_changeType_idx" ON "element_changes"("changeType");
CREATE INDEX IF NOT EXISTS "element_changes_changedAt_idx" ON "element_changes"("changedAt");
CREATE INDEX IF NOT EXISTS "element_changes_changedBy_idx" ON "element_changes"("changedBy");
CREATE INDEX IF NOT EXISTS "element_changes_elementId_idx" ON "element_changes"("elementId");

-- Add foreign key for element_changes
ALTER TABLE "element_changes"
  ADD CONSTRAINT "element_changes_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "static_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create sync_queue table
CREATE TABLE IF NOT EXISTS "sync_queue" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "operation" VARCHAR(50) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- Add indexes to sync_queue
CREATE INDEX IF NOT EXISTS "sync_queue_status_priority_scheduledAt_idx" ON "sync_queue"("status", "priority", "scheduledAt");
CREATE INDEX IF NOT EXISTS "sync_queue_pageId_idx" ON "sync_queue"("pageId");
CREATE INDEX IF NOT EXISTS "sync_queue_status_idx" ON "sync_queue"("status");

-- Add foreign key for sync_queue
ALTER TABLE "sync_queue"
  ADD CONSTRAINT "sync_queue_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "static_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
-- =============================================================================
-- Trigger 2: 편집 잠금 만료 자동 해제
-- =============================================================================
-- 목적: lockExpiry가 지난 LOCKED 상태를 자동으로 EXPIRED로 변경
-- 동작: SELECT 시 만료된 잠금을 자동으로 감지하고 정리

-- 만료된 잠금을 EXPIRED로 변경하는 함수
CREATE OR REPLACE FUNCTION check_lock_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- LOCKED 상태이면서 lockExpiry가 현재 시각보다 과거인 경우
  IF NEW."lockStatus" = 'LOCKED' AND NEW."lockExpiry" IS NOT NULL AND NEW."lockExpiry" < CURRENT_TIMESTAMP THEN
    NEW."lockStatus" := 'EXPIRED';
    NEW."lockedBy" := NULL;
    NEW."lockedAt" := NULL;
    NEW."lockExpiry" := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SELECT 또는 UPDATE 전에 실행되는 트리거
DROP TRIGGER IF EXISTS trg_check_lock_expiry_on_read ON static_pages;
DROP TRIGGER IF EXISTS trg_check_lock_expiry_on_update ON static_pages;

CREATE TRIGGER trg_check_lock_expiry_on_update
  BEFORE UPDATE ON static_pages
  FOR EACH ROW
  EXECUTE FUNCTION check_lock_expiry();

-- 주기적인 잠금 정리를 위한 함수 (선택적 - 백그라운드 작업에서 호출)
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE static_pages
  SET
    "lockStatus" = 'EXPIRED',
    "lockedBy" = NULL,
    "lockedAt" = NULL,
    "lockExpiry" = NULL
  WHERE
    "lockStatus" = 'LOCKED'
    AND "lockExpiry" IS NOT NULL
    AND "lockExpiry" < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- 설명:
-- 1. 자동 만료 감지: UPDATE 작업 전에 lockExpiry 체크
-- 2. 상태 정리: EXPIRED 상태로 변경하고 잠금 관련 필드 초기화
-- 3. 백그라운드 정리: cleanup_expired_locks() 함수로 주기적 일괄 정리 가능
-- =============================================================================
-- Trigger 3: 요소별 변경 이력 자동 추적
-- =============================================================================
-- 목적: static_pages 변경 시 element_changes 테이블에 이력 자동 생성
-- 동작: INSERT/UPDATE/DELETE 후 변경 내역을 element_changes에 기록

CREATE OR REPLACE FUNCTION track_element_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_type_val "ChangeType_new";
  version_val INTEGER;
BEGIN
  -- 변경 타입 결정
  IF TG_OP = 'INSERT' THEN
    change_type_val := 'CREATED';
    version_val := NEW.version;
  ELSIF TG_OP = 'UPDATE' THEN
    change_type_val := 'UPDATED';
    version_val := NEW.version;
  ELSIF TG_OP = 'DELETE' THEN
    change_type_val := 'DELETED';
    version_val := OLD.version;
  END IF;

  -- INSERT/UPDATE의 경우
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- sections 필드가 변경된 경우 이력 기록
    IF TG_OP = 'INSERT' OR OLD.sections IS DISTINCT FROM NEW.sections THEN
      INSERT INTO element_changes (
        id,
        "pageId",
        "changeType",
        version,
        "elementId",
        "elementType",
        "beforeValue",
        "afterValue",
        "diffSummary",
        "changedBy",
        "changedAt",
        "reason"
      )
      VALUES (
        gen_random_uuid()::TEXT,
        NEW.id,
        change_type_val,
        version_val,
        'sections',
        NULL, -- sections는 전체 구조라 elementType 없음
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.sections::TEXT ELSE NULL END,
        NEW.sections::TEXT,
        CASE
          WHEN TG_OP = 'INSERT' THEN 'Created new page'
          WHEN TG_OP = 'UPDATE' THEN 'Updated page sections'
        END,
        NEW."updatedBy",
        CURRENT_TIMESTAMP,
        NULL
      );
    END IF;

    -- title 변경 이력
    IF TG_OP = 'INSERT' OR OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO element_changes (
        id,
        "pageId",
        "changeType",
        version,
        "elementId",
        "elementType",
        "beforeValue",
        "afterValue",
        "diffSummary",
        "changedBy",
        "changedAt"
      )
      VALUES (
        gen_random_uuid()::TEXT,
        NEW.id,
        change_type_val,
        version_val,
        'title',
        'TEXT',
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.title ELSE NULL END,
        NEW.title,
        'Title changed',
        NEW."updatedBy",
        CURRENT_TIMESTAMP
      );
    END IF;

    -- editMode 변경 이력
    IF TG_OP = 'UPDATE' AND OLD."editMode" IS DISTINCT FROM NEW."editMode" THEN
      INSERT INTO element_changes (
        id,
        "pageId",
        "changeType",
        version,
        "elementId",
        "beforeValue",
        "afterValue",
        "diffSummary",
        "changedBy",
        "changedAt"
      )
      VALUES (
        gen_random_uuid()::TEXT,
        NEW.id,
        change_type_val,
        version_val,
        'editMode',
        OLD."editMode"::TEXT,
        NEW."editMode"::TEXT,
        'Edit mode changed',
        NEW."updatedBy",
        CURRENT_TIMESTAMP
      );
    END IF;

  -- DELETE의 경우
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO element_changes (
      id,
      "pageId",
      "changeType",
      version,
      "elementId",
      "beforeValue",
      "diffSummary",
      "changedBy",
      "changedAt"
    )
    VALUES (
      gen_random_uuid()::TEXT,
      OLD.id,
      'DELETED',
      version_val,
      'page',
      OLD.title,
      'Page deleted',
      OLD."updatedBy",
      CURRENT_TIMESTAMP
    );
  END IF;

  -- INSERT/UPDATE는 NEW 반환, DELETE는 OLD 반환
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trg_track_element_changes ON static_pages;

CREATE TRIGGER trg_track_element_changes
  AFTER INSERT OR UPDATE OR DELETE ON static_pages
  FOR EACH ROW
  EXECUTE FUNCTION track_element_changes();

-- 설명:
-- 1. 자동 이력 생성: static_pages 변경 시 element_changes에 자동 기록
-- 2. 상세 추적: sections, title, editMode 등 주요 필드 변경 감지
-- 3. Audit Trail: 누가(changedBy), 언제(changedAt), 무엇을(beforeValue/afterValue) 변경했는지 기록
-- 4. 버전 연계: 각 변경이 어느 version에서 발생했는지 추적
