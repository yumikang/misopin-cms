-- ============================================================================
-- Day 1: DB Migration - Time-Based Reservation System
-- ============================================================================
-- Created: 2025-11-06
-- Purpose: Migrate from people-count based to time-based reservation system
-- ============================================================================

BEGIN;

-- ============================================================================
-- Task 1.8: INSERT services table data (6 services)
-- ============================================================================
-- Service codes match ServiceType enum from Prisma schema

INSERT INTO services (id, code, name, "durationMinutes", "bufferMinutes", "isActive", "displayOrder", "createdAt", "updatedAt")
VALUES
  -- 주름 보톡스 (40분 시술 + 10분 정리)
  ('service_wrinkle_botox', 'WRINKLE_BOTOX', '주름 보톡스', 40, 10, true, 1, NOW(), NOW()),

  -- 볼륨 리프팅 (60분 시술 + 15분 정리)
  ('service_volume_lifting', 'VOLUME_LIFTING', '볼륨 리프팅', 60, 15, true, 2, NOW(), NOW()),

  -- 피부관리 (45분 시술 + 10분 정리)
  ('service_skin_care', 'SKIN_CARE', '피부 관리', 45, 10, true, 3, NOW(), NOW()),

  -- 제거 시술 (30분 시술 + 10분 정리)
  ('service_removal', 'REMOVAL_PROCEDURE', '제거 시술', 30, 10, true, 4, NOW(), NOW()),

  -- 바디 케어 (50분 시술 + 10분 정리)
  ('service_body_care', 'BODY_CARE', '바디 케어', 50, 10, true, 5, NOW(), NOW()),

  -- 기타 상담 (20분 상담 + 5분 정리)
  ('service_other', 'OTHER_CONSULTATION', '기타 상담', 20, 5, true, 6, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  "durationMinutes" = EXCLUDED."durationMinutes",
  "bufferMinutes" = EXCLUDED."bufferMinutes",
  "isActive" = EXCLUDED."isActive",
  "displayOrder" = EXCLUDED."displayOrder",
  "updatedAt" = NOW();

-- ============================================================================
-- Task 1.9: INSERT clinic_time_slots data
-- ============================================================================
-- Operating hours:
-- - MORNING: 08:30-12:00 (weekdays), 08:30-11:00 (Saturday)
-- - AFTERNOON: 13:00-18:30 (weekdays), closed (Saturday)
-- - Sunday: closed

-- Weekdays (Monday-Friday) - Morning
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_weekday_morning_mon', NULL, 'MONDAY', 'MORNING', '08:30', '12:00', 30, 1, true, NOW(), NOW()),
  ('slot_weekday_morning_tue', NULL, 'TUESDAY', 'MORNING', '08:30', '12:00', 30, 1, true, NOW(), NOW()),
  ('slot_weekday_morning_wed', NULL, 'WEDNESDAY', 'MORNING', '08:30', '12:00', 30, 1, true, NOW(), NOW()),
  ('slot_weekday_morning_thu', NULL, 'THURSDAY', 'MORNING', '08:30', '12:00', 30, 1, true, NOW(), NOW()),
  ('slot_weekday_morning_fri', NULL, 'FRIDAY', 'MORNING', '08:30', '12:00', 30, 1, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Weekdays (Monday-Friday) - Afternoon
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_weekday_afternoon_mon', NULL, 'MONDAY', 'AFTERNOON', '13:00', '18:30', 30, 1, true, NOW(), NOW()),
  ('slot_weekday_afternoon_tue', NULL, 'TUESDAY', 'AFTERNOON', '13:00', '18:30', 30, 1, true, NOW(), NOW()),
  ('slot_weekday_afternoon_wed', NULL, 'WEDNESDAY', 'AFTERNOON', '13:00', '18:30', 30, 1, true, NOW(), NOW()),
  ('slot_weekday_afternoon_thu', NULL, 'THURSDAY', 'AFTERNOON', '13:00', '18:30', 30, 1, true, NOW(), NOW()),
  ('slot_weekday_afternoon_fri', NULL, 'FRIDAY', 'AFTERNOON', '13:00', '18:30', 30, 1, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Saturday - Morning only (shortened hours)
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_saturday_morning', NULL, 'SATURDAY', 'MORNING', '08:30', '11:00', 30, 1, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Sunday: no clinic_time_slots (closed)

-- ============================================================================
-- Task 1.10: UPDATE reservations data (populate NEW fields)
-- ============================================================================
-- DUAL-WRITE strategy: populate serviceId, serviceName, estimatedDuration,
-- period, timeSlotStart, timeSlotEnd for existing reservations

UPDATE reservations r
SET
  "serviceId" = s.id,
  "serviceName" = s.name,
  "estimatedDuration" = s."durationMinutes",
  "period" = CASE
    WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(r."preferredTime", 'HH24:MI')::TIME) < 12 THEN 'MORNING'::\"Period\"
    ELSE 'AFTERNOON'::\"Period\"
  END,
  "timeSlotStart" = r."preferredTime",
  "timeSlotEnd" = TO_CHAR(
    TO_TIMESTAMP(r."preferredTime", 'HH24:MI')::TIME + (s."durationMinutes" || ' minutes')::INTERVAL,
    'HH24:MI'
  ),
  "updatedAt" = NOW()
FROM services s
WHERE r.service::TEXT = s.code
  AND r."serviceId" IS NULL; -- Only update if not already populated

-- ============================================================================
-- Task 1.11: DB Integrity Validation
-- ============================================================================

-- Verify all services inserted (should return 6)
SELECT 'Services Count' AS check_name, COUNT(*) AS result
FROM services
WHERE "isActive" = true;

-- Verify all clinic_time_slots inserted (should return 11)
SELECT 'Clinic Slots Count' AS check_name, COUNT(*) AS result
FROM clinic_time_slots
WHERE "isActive" = true;

-- Verify all reservations have serviceId populated (should return 0)
SELECT 'Reservations Missing serviceId' AS check_name, COUNT(*) AS result
FROM reservations
WHERE "serviceId" IS NULL
  AND status IN ('PENDING', 'CONFIRMED');

-- Verify referential integrity (should return 0)
SELECT 'Orphaned Reservations' AS check_name, COUNT(*) AS result
FROM reservations r
LEFT JOIN services s ON r."serviceId" = s.id
WHERE r."serviceId" IS NOT NULL
  AND s.id IS NULL;

-- Verify period values are valid (should return 0)
SELECT 'Invalid Period Values' AS check_name, COUNT(*) AS result
FROM reservations
WHERE period IS NOT NULL
  AND period NOT IN ('MORNING', 'AFTERNOON', 'EVENING');

-- Verify time slot consistency (should return 0)
SELECT 'Inconsistent Time Slots' AS check_name, COUNT(*) AS result
FROM reservations
WHERE "timeSlotStart" IS NOT NULL
  AND "timeSlotEnd" IS NOT NULL
  AND TO_TIMESTAMP("timeSlotEnd", 'HH24:MI')::TIME <= TO_TIMESTAMP("timeSlotStart", 'HH24:MI')::TIME;

COMMIT;

-- ============================================================================
-- Post-Migration Notes
-- ============================================================================
-- 1. LEGACY table `service_reservation_limits` is NO LONGER USED
-- 2. Time-based validation is now PRIMARY (not fallback)
-- 3. All new reservations MUST have serviceId populated
-- 4. Admin "예약 한도 수정" button has been removed
-- 5. Availability API now returns time slots, not people count
-- ============================================================================
