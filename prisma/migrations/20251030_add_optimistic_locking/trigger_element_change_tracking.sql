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
