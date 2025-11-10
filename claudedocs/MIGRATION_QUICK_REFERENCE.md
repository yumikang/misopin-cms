# MIGRATION QUICK REFERENCE
## Zero-Downtime ServiceType Enum → Dynamic Service Migration

**🔴 CRITICAL**: This is a production hospital reservation system. Zero data loss tolerance.

---

## PHASE OVERVIEW

```
Phase 1: ADDITIVE     → 1-2 days   → LOW RISK     → ✅ Fully reversible
Phase 2: DATA MIGRATE → 3-5 days   → HIGH RISK    → ⚠️ Requires validation
Phase 3: SWITCHOVER   → 1-2 weeks  → MEDIUM RISK  → ✅ Feature flagged
Phase 4: CLEANUP      → 1 week     → LOW RISK     → ❌ IRREVERSIBLE
```

---

## PRE-MIGRATION CHECKLIST

**DO NOT START UNTIL ALL COMPLETE**:

```
[ ] Full database backup created
[ ] Backup restore tested successfully
[ ] Staging environment matches production
[ ] All SQL scripts reviewed and tested in staging
[ ] Team trained on rollback procedures
[ ] Monitoring dashboards configured
[ ] Emergency contacts documented
[ ] Stakeholders notified of timeline
[ ] This checklist printed and available
```

---

## PHASE 1: ADDITIVE CHANGES

### Actions
```bash
# 1. Run migrations
npx prisma migrate dev --name add_service_table_phase1 --create-only
npx prisma migrate deploy

# 2. Validate
psql $DATABASE_URL -f claudedocs/migration_validation_queries.sql

# 3. Generate Prisma client
npx prisma generate
```

### Success Criteria
```
✅ Service table exists with 6 rows
✅ ClinicTimeSlot table has 11 rows
✅ Reservations has 4 new nullable fields
✅ Foreign key constraint exists
✅ Old system still works (test reservation creation)
```

### Emergency Rollback
```sql
-- Run if Phase 1 fails
BEGIN;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_serviceId_fkey;
ALTER TABLE reservations DROP COLUMN IF EXISTS serviceId, serviceName, estimatedDuration, period;
DROP TABLE IF EXISTS clinic_time_slots CASCADE;
DROP TABLE IF EXISTS services CASCADE;
COMMIT;
```

---

## PHASE 2: DATA MIGRATION

### CRITICAL FIRST STEP
```sql
-- MUST RUN THIS FIRST to understand data!
-- Save output to file for analysis
SELECT
  "preferredTime",
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pct
FROM reservations
GROUP BY "preferredTime"
ORDER BY count DESC;

-- Document results here:
-- Format 1: _________________ (count: ___, pct: ___%)
-- Format 2: _________________ (count: ___, pct: ___%)
-- Format 3: _________________ (count: ___, pct: ___%)
```

### Customize Migration SQL
```
❗ DO NOT use template migration SQL blindly!
❗ MUST customize based on above analysis
❗ Review claudedocs/MIGRATION_STRATEGY_ZERO_DOWNTIME.md Phase 2.2
```

### Actions
```bash
# 1. Analyze data (save results!)
psql $DATABASE_URL -c "SELECT preferredTime, COUNT(*) FROM reservations GROUP BY preferredTime ORDER BY COUNT(*) DESC;" > /tmp/time_formats.txt

# 2. Customize migration SQL based on actual formats
# Edit: prisma/migrations/004_migrate_existing_reservations.sql

# 3. Dry run in staging first!
psql $STAGING_DB_URL -f prisma/migrations/004_migrate_existing_reservations.sql

# 4. Validate staging results
psql $STAGING_DB_URL -f claudedocs/migration_validation_queries.sql

# 5. If staging successful, run in production
psql $DATABASE_URL -f prisma/migrations/004_migrate_existing_reservations.sql

# 6. Validate production
psql $DATABASE_URL -f claudedocs/migration_validation_queries.sql

# 7. Manual review of unparsed records
psql $DATABASE_URL -c "SELECT id, preferredTime, period FROM reservations WHERE period IS NULL;"

# 8. Apply NOT NULL constraints (only after 100% migrated!)
psql $DATABASE_URL -f prisma/migrations/005_make_new_fields_required.sql
```

### Success Criteria
```
✅ 100% of reservations have serviceId
✅ 100% of reservations have serviceName
✅ 100% of reservations have estimatedDuration
✅ ≥95% of reservations have period (manual review rest)
✅ Period distribution looks reasonable (not all MORNING)
✅ Service mappings correct (old enum matches new service code)
✅ Old fields still intact (dual-write ready)
```

### Emergency Rollback
```sql
-- Run if Phase 2 fails
BEGIN;
UPDATE reservations SET
  "serviceId" = NULL,
  "serviceName" = NULL,
  "estimatedDuration" = NULL,
  period = NULL;
-- Verify old fields intact
SELECT COUNT(*) FROM reservations WHERE service IS NOT NULL;
COMMIT;
```

---

## PHASE 3: APPLICATION SWITCHOVER

### Actions
```bash
# Week 1: Deploy feature flag code (disabled)
USE_DYNAMIC_SERVICES=false
DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=0
git add app/api/public/reservations/route.ts lib/feature-flags.ts
git commit -m "Add feature flag for dynamic services (disabled)"
git push && deploy

# Day 1: Enable 5%
export DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=5
# Monitor for 24 hours

# Day 2-3: Increase to 25%
export DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=25
# Monitor for 48 hours

# Day 4-5: Increase to 50%
export DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=50
# Monitor for 48 hours

# Week 2: Full rollout
export USE_DYNAMIC_SERVICES=true
export DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=100
# Monitor for 1 week

# Continuous monitoring
watch -n 60 'psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM reservations WHERE createdAt >= NOW() - INTERVAL '\''1 hour'\'' GROUP BY status;"'
```

### Monitoring Queries
```sql
-- Run every hour during rollout

-- 1. Recent reservation rate
SELECT
  DATE_TRUNC('hour', "createdAt") as hour,
  COUNT(*) as count
FROM reservations
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;

-- 2. Dual-write validation
SELECT
  COUNT(*) as total,
  COUNT(service) as old_service,
  COUNT("serviceId") as new_serviceId
FROM reservations
WHERE "createdAt" >= NOW() - INTERVAL '1 hour';
-- Should be equal during dual-write

-- 3. Error check
SELECT status, COUNT(*)
FROM reservations
WHERE "createdAt" >= NOW() - INTERVAL '1 hour'
GROUP BY status;
-- Should be mostly PENDING/CONFIRMED
```

### Success Criteria
```
✅ 5% rollout stable for 24 hours
✅ 25% rollout stable for 48 hours
✅ 50% rollout stable for 48 hours
✅ 100% rollout stable for 1 week
✅ No increase in error rate
✅ Reservation creation rate stable
✅ Dual-write working (both old and new fields populated)
```

### Emergency Rollback
```bash
# Immediate rollback if errors spike
export USE_DYNAMIC_SERVICES=false
export DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=0

# Restart application
pm2 restart all  # or your deployment method

# Verify old system working
curl -X POST http://localhost:3000/api/public/reservations \
  -H "Content-Type: application/json" \
  -d '{"patient_name":"Test","phone":"010-1234-5678","birth_date":"1990-01-01","gender":"FEMALE","treatment_type":"FIRST_VISIT","service":"WRINKLE_BOTOX","preferred_date":"2025-12-01","preferred_time":"10:00"}'
```

---

## PHASE 4: CLEANUP

### ⚠️ POINT OF NO RETURN
```
❌ Phase 4 is IRREVERSIBLE
❌ Cannot rollback after enum deletion
❌ Only proceed after weeks of Phase 3 stability
```

### Pre-Cleanup Checklist
```
[ ] Phase 3 stable for minimum 2 weeks
[ ] Zero production issues
[ ] Feature flags removed from code
[ ] Application running 100% on new system
[ ] Team approval obtained
[ ] Final backup created
```

### Actions
```sql
-- 1. Remove old fields
BEGIN;
DROP INDEX IF EXISTS "reservations_preferredDate_service_status_idx";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "service";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "preferredTime";
COMMIT;

-- 2. Remove old enum and table
BEGIN;
DROP TABLE IF EXISTS "service_reservation_limits" CASCADE;
DROP TYPE IF EXISTS "ServiceType" CASCADE;
COMMIT;

-- 3. Optimize indexes
CREATE INDEX CONCURRENTLY "reservations_preferredDate_period_serviceId_status_idx"
ON "reservations"("preferredDate", "period", "serviceId", "status");

ANALYZE reservations;
ANALYZE services;
ANALYZE clinic_time_slots;
```

### Validation
```bash
# Run full validation
psql $DATABASE_URL -f claudedocs/migration_validation_queries.sql

# Application smoke test
npm run test:e2e

# Performance check
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM reservations WHERE preferredDate = CURRENT_DATE AND period = 'MORNING' AND status = 'CONFIRMED';"
```

### Success Criteria
```
✅ Old fields removed from schema
✅ ServiceType enum deleted
✅ service_reservation_limits table deleted
✅ Application still works (E2E tests pass)
✅ Performance same or better
✅ Zero production errors
```

### No Rollback Available
```
❌ Phase 4 cleanup is IRREVERSIBLE
❌ If application breaks, must fix forward
❌ Database restore is only option (loses recent data)
```

---

## RISK MATRIX

| Phase | Risk Level | Reversibility | Downtime |
|-------|-----------|---------------|----------|
| Phase 1 | 🟢 LOW | ✅ Fully reversible | 0 sec |
| Phase 2 | 🔴 CRITICAL | ⚠️ Reversible with data reset | 0 sec |
| Phase 3 | 🟡 MEDIUM | ✅ Feature flag rollback | 0 sec |
| Phase 4 | 🟡 MEDIUM | ❌ IRREVERSIBLE | 0 sec |

---

## EMERGENCY CONTACTS

**Fill in before starting**:

```
Database Admin: _________________ (Phone: _______________)
Application Owner: _________________ (Phone: _______________)
Backup Location: _________________
Emergency Rollback Authority: _________________
Maintenance Window: _________________ (if needed)
```

---

## VALIDATION COMMAND REFERENCE

### Quick Health Check
```bash
# Overall system health
psql $DATABASE_URL -c "
SELECT
  (SELECT COUNT(*) FROM services WHERE isActive = true) as active_services,
  (SELECT COUNT(*) FROM reservations) as total_reservations,
  (SELECT COUNT(*) FROM reservations WHERE serviceId IS NOT NULL) as migrated_reservations,
  (SELECT COUNT(*) FROM clinic_time_slots WHERE isActive = true) as active_time_slots;
"
```

### Recent Activity
```bash
# Last hour's reservations
psql $DATABASE_URL -c "
SELECT
  COUNT(*) as count,
  MIN(createdAt) as first,
  MAX(createdAt) as last
FROM reservations
WHERE createdAt >= NOW() - INTERVAL '1 hour';
"
```

### Data Integrity
```bash
# Check for orphaned records
psql $DATABASE_URL -c "
SELECT COUNT(*) as orphaned_reservations
FROM reservations r
LEFT JOIN services s ON r.serviceId = s.id
WHERE r.serviceId IS NOT NULL AND s.id IS NULL;
"
# Expected: 0
```

---

## TROUBLESHOOTING

### Issue: Migration fails with "duplicate key value"
```
Cause: Service codes already exist
Fix: Check for existing services table from previous attempt
Action: DROP TABLE services CASCADE; then re-run Phase 1
```

### Issue: preferredTime parsing produces all MORNING or all AFTERNOON
```
Cause: Parsing logic doesn't match actual data format
Fix: Re-analyze preferredTime formats
Action: Run Phase 2.1 analysis again, customize parsing logic
```

### Issue: Foreign key constraint violation
```
Cause: serviceId references non-existent service
Fix: Ensure services table populated before migration
Action: Verify SELECT COUNT(*) FROM services; returns 6
```

### Issue: Application errors during Phase 3 rollout
```
Cause: Code bug or unexpected data format
Fix: Immediate rollback via feature flag
Action: Set DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=0
```

### Issue: Performance degradation after Phase 4
```
Cause: Missing indexes or query plan changed
Fix: Re-analyze tables and check index usage
Action: ANALYZE reservations; Check EXPLAIN ANALYZE output
```

---

## SUCCESS INDICATORS

**Migration Complete When**:
```
✅ All 4 phases completed
✅ Services table manages 6+ dynamic services
✅ Time-based scheduling active (MORNING/AFTERNOON)
✅ Duration tracking operational
✅ ClinicTimeSlot defines clinic hours
✅ Old enum and fields removed
✅ Zero data loss confirmed
✅ Application performance stable
✅ 2+ weeks of production stability
```

---

## FINAL VALIDATION

```bash
# Run this after Phase 4 complete
psql $DATABASE_URL <<EOF
-- Print migration success summary
SELECT '╔════════════════════════════════════════════════════════╗' as summary;
SELECT '║     MIGRATION COMPLETE - VALIDATION SUMMARY           ║' as summary;
SELECT '╠════════════════════════════════════════════════════════╣' as summary;

SELECT
  '║ Services table: ' ||
  LPAD((SELECT COUNT(*)::text FROM services WHERE isActive = true), 3, ' ') ||
  ' active services                      ║' as summary;

SELECT
  '║ Reservations: ' ||
  LPAD((SELECT COUNT(*)::text FROM reservations), 5, ' ') ||
  ' total preserved                  ║' as summary;

SELECT
  '║ Time slots: ' ||
  LPAD((SELECT COUNT(*)::text FROM clinic_time_slots WHERE isActive = true), 3, ' ') ||
  ' active periods                     ║' as summary;

SELECT
  '║ Old enum removed: ' ||
  CASE WHEN (SELECT COUNT(*) FROM pg_type WHERE typname = 'ServiceType') = 0
    THEN 'YES ✅                                   '
    ELSE 'NO ❌ (still exists!)                    '
  END || '║' as summary;

SELECT
  '║ Data integrity: ' ||
  CASE WHEN (
    SELECT COUNT(*) FROM reservations
    WHERE serviceId IS NOT NULL
    AND period IS NOT NULL
    AND estimatedDuration IS NOT NULL
  ) = (SELECT COUNT(*) FROM reservations)
    THEN 'PERFECT ✅                              '
    ELSE 'ISSUES DETECTED ❌                      '
  END || '║' as summary;

SELECT '╠════════════════════════════════════════════════════════╣' as summary;
SELECT '║                                                        ║' as summary;
SELECT '║  🎉 ZERO-DOWNTIME MIGRATION SUCCESSFUL! 🎉            ║' as summary;
SELECT '║                                                        ║' as summary;
SELECT '║  Hospital reservation system now supports:            ║' as summary;
SELECT '║  ✅ Dynamic service management                         ║' as summary;
SELECT '║  ✅ Time-based scheduling                              ║' as summary;
SELECT '║  ✅ Duration tracking                                  ║' as summary;
SELECT '║  ✅ Flexible clinic hours                              ║' as summary;
SELECT '║                                                        ║' as summary;
SELECT '╚════════════════════════════════════════════════════════╝' as summary;

-- Show timestamp
SELECT NOW() as migration_completed_at;
EOF
```

---

**END OF QUICK REFERENCE**
