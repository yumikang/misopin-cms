-- Day 4 Data Migration Script
-- Purpose: Populate services and clinic_time_slots, backfill existing reservations

-- ==================================================
-- Step 1: Insert 6 services into database
-- ==================================================
INSERT INTO services (id, code, name, category, "durationMinutes", "bufferMinutes", "isActive", "displayOrder", description, "createdAt", "updatedAt")
VALUES
  ('srv_1', 'WRINKLE_BOTOX', '주름 보톡스', 'AESTHETIC', 40, 10, true, 1, '주름 개선 보톡스 시술', NOW(), NOW()),
  ('srv_2', 'VOLUME_LIFTING', '볼륨 리프팅', 'AESTHETIC', 30, 10, true, 2, '볼륨 리프팅 필러 시술', NOW(), NOW()),
  ('srv_3', 'SKIN_CARE', '피부 관리', 'SKINCARE', 60, 15, true, 3, '피부 관리 및 레이저 시술', NOW(), NOW()),
  ('srv_4', 'REMOVAL_PROCEDURE', '제거 시술', 'PROCEDURE', 30, 10, true, 4, '점, 흉터 제거 시술', NOW(), NOW()),
  ('srv_5', 'BODY_CARE', '바디 케어', 'BODY', 90, 20, true, 5, '바디 관리 시술', NOW(), NOW()),
  ('srv_6', 'OTHER_CONSULTATION', '기타 상담', 'CONSULTATION', 20, 5, true, 6, '기타 상담 및 문의', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "durationMinutes" = EXCLUDED."durationMinutes",
  "bufferMinutes" = EXCLUDED."bufferMinutes",
  "updatedAt" = NOW();

-- ==================================================
-- Step 2: Insert clinic time slots (Mon-Fri standard hours)
-- ==================================================

-- WRINKLE_BOTOX: Mon-Fri 09:00-18:00
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_wb_mon', 'srv_1', 'MONDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_mon_pm', 'srv_1', 'MONDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_tue', 'srv_1', 'TUESDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_tue_pm', 'srv_1', 'TUESDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_wed', 'srv_1', 'WEDNESDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_wed_pm', 'srv_1', 'WEDNESDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_thu', 'srv_1', 'THURSDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_thu_pm', 'srv_1', 'THURSDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_fri', 'srv_1', 'FRIDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_wb_fri_pm', 'srv_1', 'FRIDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- VOLUME_LIFTING: Mon-Fri 09:00-18:00
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_vl_mon', 'srv_2', 'MONDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_mon_pm', 'srv_2', 'MONDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_tue', 'srv_2', 'TUESDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_tue_pm', 'srv_2', 'TUESDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_wed', 'srv_2', 'WEDNESDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_wed_pm', 'srv_2', 'WEDNESDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_thu', 'srv_2', 'THURSDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_thu_pm', 'srv_2', 'THURSDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_fri', 'srv_2', 'FRIDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_vl_fri_pm', 'srv_2', 'FRIDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- SKIN_CARE: Mon-Fri 09:00-18:00 (longer sessions)
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_sc_mon', 'srv_3', 'MONDAY', 'MORNING', '09:00', '12:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_mon_pm', 'srv_3', 'MONDAY', 'AFTERNOON', '14:00', '18:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_tue', 'srv_3', 'TUESDAY', 'MORNING', '09:00', '12:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_tue_pm', 'srv_3', 'TUESDAY', 'AFTERNOON', '14:00', '18:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_wed', 'srv_3', 'WEDNESDAY', 'MORNING', '09:00', '12:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_wed_pm', 'srv_3', 'WEDNESDAY', 'AFTERNOON', '14:00', '18:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_thu', 'srv_3', 'THURSDAY', 'MORNING', '09:00', '12:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_thu_pm', 'srv_3', 'THURSDAY', 'AFTERNOON', '14:00', '18:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_fri', 'srv_3', 'FRIDAY', 'MORNING', '09:00', '12:00', 60, 1, true, NOW(), NOW()),
  ('slot_sc_fri_pm', 'srv_3', 'FRIDAY', 'AFTERNOON', '14:00', '18:00', 60, 1, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- REMOVAL_PROCEDURE: Mon-Fri 09:00-18:00
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_rp_mon', 'srv_4', 'MONDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_mon_pm', 'srv_4', 'MONDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_tue', 'srv_4', 'TUESDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_tue_pm', 'srv_4', 'TUESDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_wed', 'srv_4', 'WEDNESDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_wed_pm', 'srv_4', 'WEDNESDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_thu', 'srv_4', 'THURSDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_thu_pm', 'srv_4', 'THURSDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_fri', 'srv_4', 'FRIDAY', 'MORNING', '09:00', '12:00', 30, 2, true, NOW(), NOW()),
  ('slot_rp_fri_pm', 'srv_4', 'FRIDAY', 'AFTERNOON', '14:00', '18:00', 30, 2, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- BODY_CARE: Mon-Fri 09:00-18:00 (longer sessions)
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_bc_mon', 'srv_5', 'MONDAY', 'MORNING', '09:00', '12:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_mon_pm', 'srv_5', 'MONDAY', 'AFTERNOON', '14:00', '17:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_tue', 'srv_5', 'TUESDAY', 'MORNING', '09:00', '12:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_tue_pm', 'srv_5', 'TUESDAY', 'AFTERNOON', '14:00', '17:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_wed', 'srv_5', 'WEDNESDAY', 'MORNING', '09:00', '12:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_wed_pm', 'srv_5', 'WEDNESDAY', 'AFTERNOON', '14:00', '17:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_thu', 'srv_5', 'THURSDAY', 'MORNING', '09:00', '12:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_thu_pm', 'srv_5', 'THURSDAY', 'AFTERNOON', '14:00', '17:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_fri', 'srv_5', 'FRIDAY', 'MORNING', '09:00', '12:00', 90, 1, true, NOW(), NOW()),
  ('slot_bc_fri_pm', 'srv_5', 'FRIDAY', 'AFTERNOON', '14:00', '17:00', 90, 1, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- OTHER_CONSULTATION: Mon-Fri 09:00-18:00 (short sessions)
INSERT INTO clinic_time_slots (id, "serviceId", "dayOfWeek", period, "startTime", "endTime", "slotInterval", "maxConcurrent", "isActive", "createdAt", "updatedAt")
VALUES
  ('slot_oc_mon', 'srv_6', 'MONDAY', 'MORNING', '09:00', '12:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_mon_pm', 'srv_6', 'MONDAY', 'AFTERNOON', '14:00', '18:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_tue', 'srv_6', 'TUESDAY', 'MORNING', '09:00', '12:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_tue_pm', 'srv_6', 'TUESDAY', 'AFTERNOON', '14:00', '18:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_wed', 'srv_6', 'WEDNESDAY', 'MORNING', '09:00', '12:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_wed_pm', 'srv_6', 'WEDNESDAY', 'AFTERNOON', '14:00', '18:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_thu', 'srv_6', 'THURSDAY', 'MORNING', '09:00', '12:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_thu_pm', 'srv_6', 'THURSDAY', 'AFTERNOON', '14:00', '18:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_fri', 'srv_6', 'FRIDAY', 'MORNING', '09:00', '12:00', 20, 3, true, NOW(), NOW()),
  ('slot_oc_fri_pm', 'srv_6', 'FRIDAY', 'AFTERNOON', '14:00', '18:00', 20, 3, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- Step 3: Backfill existing reservations with NEW fields
-- ==================================================

-- Update reservations to populate NEW fields from LEGACY fields
UPDATE reservations r
SET
  "serviceId" = s.id,
  "serviceName" = s.name,
  "estimatedDuration" = s."durationMinutes",
  "timeSlotStart" = r."preferredTime",
  "timeSlotEnd" = TO_CHAR(
    (r."preferredTime"::time + (s."durationMinutes" || ' minutes')::interval),
    'HH24:MI'
  ),
  period = CASE
    WHEN r."preferredTime"::time < '12:00'::time THEN 'MORNING'::"Period"
    WHEN r."preferredTime"::time >= '12:00'::time AND r."preferredTime"::time < '18:00'::time THEN 'AFTERNOON'::"Period"
    ELSE 'EVENING'::"Period"
  END,
  "updatedAt" = NOW()
FROM services s
WHERE s.code = r.service::text
  AND r."serviceId" IS NULL;

-- ==================================================
-- Verification Queries
-- ==================================================

-- Check services inserted
SELECT 'Services Count' as check_name, COUNT(*) as count FROM services;

-- Check clinic_time_slots inserted
SELECT 'Clinic Time Slots Count' as check_name, COUNT(*) as count FROM clinic_time_slots;

-- Check reservations backfilled
SELECT
  'Reservations with serviceId' as check_name,
  COUNT(*) as count
FROM reservations
WHERE "serviceId" IS NOT NULL;

-- Check for any reservations missing serviceId (should be 0)
SELECT
  'Reservations missing serviceId' as check_name,
  COUNT(*) as count
FROM reservations
WHERE "serviceId" IS NULL;
