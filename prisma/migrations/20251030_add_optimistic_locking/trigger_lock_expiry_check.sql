-- =============================================================================
-- Trigger 2: 편집 잠금 만료 자동 해제
-- =============================================================================
-- 목적: lockExpiry가 지난 LOCKED 상태를 자동으로 EXPIRED로 변경
-- 동작: SELECT 시 만료된 잠금을 자동으로 감지하고 정리

-- 만료된 잠금을 EXPIRED로 변경하는 함수
CREATE OR REPLACE FUNCTION check_lock_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- 새로 잠금을 획득하는 경우가 아니고 (OLD가 이미 LOCKED 상태)
  -- LOCKED 상태이면서 lockExpiry가 현재 시각보다 과거인 경우에만
  IF TG_OP = 'UPDATE'
     AND OLD."lockStatus" = 'LOCKED'
     AND NEW."lockStatus" = 'LOCKED'
     AND NEW."lockExpiry" IS NOT NULL
     AND NEW."lockExpiry" < CURRENT_TIMESTAMP THEN
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
