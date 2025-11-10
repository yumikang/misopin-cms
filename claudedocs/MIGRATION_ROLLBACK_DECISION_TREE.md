# MIGRATION ROLLBACK DECISION TREE
## Zero-Downtime Migration Emergency Response Guide

**Purpose**: Quick reference for making rollback decisions during migration

---

## DECISION FRAMEWORK

```
┌─────────────────────────────────────────────────────────────────┐
│                    ISSUE DETECTED DURING MIGRATION              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Which Phase Are We   │
                    │      Currently In?    │
                    └───────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   PHASE 1                 PHASE 2                 PHASE 3
 (ADDITIVE)             (DATA MIGRATE)           (SWITCHOVER)
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
```

---

## PHASE 1 ROLLBACK DECISION TREE

```
PHASE 1: New tables/fields added (no data changed yet)
│
├─ SYMPTOM: Services table creation failed
│  ├─ SEVERITY: 🟡 MEDIUM
│  ├─ ACTION: Check error message
│  │  ├─ "already exists" → Previous migration attempt
│  │  │  └─ FIX: DROP TABLE services CASCADE; Re-run
│  │  └─ Other error → SQL syntax or permissions
│  │     └─ FIX: Review migration SQL, check DB permissions
│  └─ ROLLBACK: DROP TABLE services CASCADE;
│
├─ SYMPTOM: Foreign key constraint failed
│  ├─ SEVERITY: 🟡 MEDIUM
│  ├─ ACTION: Verify services table exists first
│  └─ ROLLBACK: ALTER TABLE reservations DROP CONSTRAINT reservations_serviceId_fkey;
│
├─ SYMPTOM: Application won't start after schema changes
│  ├─ SEVERITY: 🔴 CRITICAL
│  ├─ ACTION: Check Prisma client generation
│  │  └─ FIX: npx prisma generate
│  └─ ROLLBACK: Full Phase 1 rollback SQL
│
├─ SYMPTOM: Existing reservations corrupted
│  ├─ SEVERITY: 🔴 CRITICAL
│  ├─ ACTION: IMMEDIATELY verify old fields intact
│  │  └─ SQL: SELECT COUNT(*) FROM reservations WHERE service IS NOT NULL;
│  ├─ IF CORRUPTED: RESTORE FROM BACKUP IMMEDIATELY
│  └─ IF INTACT: Continue, but investigate cause
│
└─ DECISION: Proceed to Phase 2 or Rollback?
   ├─ PROCEED IF:
   │  ✅ All validation queries pass
   │  ✅ Services table has 6 rows
   │  ✅ Old reservations unchanged
   │  ✅ Application starts successfully
   │
   └─ ROLLBACK IF:
      ❌ Any validation query fails
      ❌ Old data corrupted
      ❌ Cannot fix within 30 minutes
      ❌ Team lacks confidence
```

### Phase 1 Rollback Script
```sql
-- EXECUTE ONLY IF ROLLING BACK PHASE 1
BEGIN;

-- Remove foreign key
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_serviceId_fkey;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_period_check;

-- Remove indexes
DROP INDEX IF EXISTS reservations_serviceId_preferredDate_status_idx;
DROP INDEX IF EXISTS reservations_preferredDate_period_status_idx;

-- Remove columns
ALTER TABLE reservations DROP COLUMN IF EXISTS serviceId;
ALTER TABLE reservations DROP COLUMN IF EXISTS serviceName;
ALTER TABLE reservations DROP COLUMN IF EXISTS estimatedDuration;
ALTER TABLE reservations DROP COLUMN IF EXISTS period;

-- Drop new tables
DROP TABLE IF EXISTS clinic_time_slots CASCADE;
DROP TABLE IF EXISTS services CASCADE;

-- CRITICAL VALIDATION
SELECT COUNT(*) as should_match_total FROM reservations WHERE service IS NOT NULL;
-- This MUST equal total reservation count

COMMIT;

-- Post-rollback validation
SELECT 'Phase 1 rolled back successfully' as status,
       COUNT(*) as total_reservations,
       COUNT(service) as has_old_service_field
FROM reservations;
```

---

## PHASE 2 ROLLBACK DECISION TREE

```
PHASE 2: Migrating data to new fields (CRITICAL PHASE!)
│
├─ SYMPTOM: preferredTime parsing produces unrealistic results
│  ├─ SEVERITY: 🔴 CRITICAL
│  ├─ INDICATORS:
│  │  ├─ All periods = MORNING (or all = AFTERNOON)
│  │  ├─ Period distribution: 95%+ in one period
│  │  └─ Same preferredTime maps to multiple periods
│  ├─ ACTION: HALT MIGRATION
│  │  └─ STEPS:
│  │     1. Rollback data migration (set new fields to NULL)
│  │     2. Re-analyze preferredTime formats in production
│  │     3. Customize parsing logic based on actual data
│  │     4. Test in staging environment
│  │     5. Re-attempt migration
│  └─ ROLLBACK: Reset new fields to NULL (see script below)
│
├─ SYMPTOM: Service mapping incorrect
│  ├─ SEVERITY: 🔴 CRITICAL
│  ├─ INDICATORS:
│  │  ├─ serviceId references wrong service
│  │  ├─ serviceName doesn't match service code
│  │  └─ Validation query finds mismatches
│  ├─ ACTION: HALT MIGRATION
│  │  └─ INVESTIGATION:
│  │     ├─ Check: SELECT service::text, s.code FROM reservations r JOIN services s ON r.serviceId = s.id WHERE r.service::text != s.code;
│  │     └─ If ANY mismatches: ROLLBACK IMMEDIATELY
│  └─ ROLLBACK: Reset new fields to NULL
│
├─ SYMPTOM: Some reservations not migrated
│  ├─ SEVERITY: 🔴 CRITICAL
│  ├─ INDICATORS:
│  │  ├─ COUNT(serviceId) < COUNT(*)
│  │  ├─ NULL values in new fields
│  │  └─ Validation query shows incomplete migration
│  ├─ ACTION: Depends on percentage
│  │  ├─ <1% unmigrated → Acceptable for manual review
│  │  │  └─ PROCEED: Manually fix unmigrated records
│  │  └─ >1% unmigrated → UNACCEPTABLE
│  │     └─ ROLLBACK: Fix migration SQL and re-run
│  └─ DECISION MATRIX:
│     ├─ 0% unmigrated → ✅ Perfect, proceed
│     ├─ 0.1-1% unmigrated → ⚠️ Manual review, then proceed
│     ├─ 1-5% unmigrated → 🔴 Rollback, fix logic
│     └─ >5% unmigrated → 🔴 CRITICAL, immediate rollback
│
├─ SYMPTOM: Duration calculations wrong
│  ├─ SEVERITY: 🟡 MEDIUM
│  ├─ INDICATORS:
│  │  └─ estimatedDuration != (service.durationMinutes + service.bufferMinutes)
│  ├─ ACTION: Investigate cause
│  │  ├─ Expected for old reservations (before duration changes)
│  │  └─ Unexpected for all reservations → Fix calculation logic
│  └─ ROLLBACK: Only if systematic calculation error
│
├─ SYMPTOM: Old fields corrupted during migration
│  ├─ SEVERITY: 🔴🔴🔴 CATASTROPHIC
│  ├─ INDICATORS:
│  │  ├─ service field = NULL
│  │  ├─ preferredTime field = NULL
│  │  └─ Any old data changed/lost
│  ├─ ACTION: IMMEDIATE EMERGENCY RESPONSE
│  │  └─ STEPS:
│  │     1. HALT all migration activity
│  │     2. RESTORE from backup immediately
│  │     3. Investigate root cause
│  │     4. Do NOT re-attempt until cause understood
│  │     5. Consider external DBA consultation
│  └─ ROLLBACK: RESTORE FROM BACKUP (cannot rollback, data lost)
│
└─ DECISION: Apply NOT NULL constraints or Rollback?
   ├─ APPLY NOT NULL IF:
   │  ✅ 100% of reservations migrated (or 99%+ with manual review plan)
   │  ✅ All validation queries pass
   │  ✅ Period distribution reasonable
   │  ✅ Service mappings 100% correct
   │  ✅ Old fields 100% intact
   │  ✅ Team has reviewed unparsed records (if any)
   │
   └─ ROLLBACK IF:
      ❌ <95% reservations migrated
      ❌ Any service mapping incorrect
      ❌ Period parsing clearly wrong
      ❌ Old fields corrupted
      ❌ Cannot explain anomalies
```

### Phase 2 Rollback Script
```sql
-- EXECUTE ONLY IF ROLLING BACK PHASE 2
BEGIN;

-- Reset new fields to NULL (preserves old data)
UPDATE reservations SET
  "serviceId" = NULL,
  "serviceName" = NULL,
  "estimatedDuration" = NULL,
  period = NULL;

-- CRITICAL VALIDATION: Verify old fields still intact
DO $$
DECLARE
  total_count INTEGER;
  old_service_count INTEGER;
  old_time_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM reservations;
  SELECT COUNT(service) INTO old_service_count FROM reservations;
  SELECT COUNT("preferredTime") INTO old_time_count FROM reservations;

  IF total_count != old_service_count OR total_count != old_time_count THEN
    RAISE EXCEPTION 'CRITICAL: Old data corrupted! Total: %, Service: %, Time: %',
                    total_count, old_service_count, old_time_count;
  END IF;

  RAISE NOTICE 'Rollback successful: % reservations preserved', total_count;
END $$;

COMMIT;

-- Post-rollback validation
SELECT
  'Phase 2 rolled back' as status,
  COUNT(*) as total_reservations,
  COUNT(service) as old_service_preserved,
  COUNT("preferredTime") as old_time_preserved,
  COUNT("serviceId") as new_serviceId_nulled
FROM reservations;
-- Expected: new_serviceId_nulled = 0, others equal to total
```

### Phase 2 Data Loss Recovery
```sql
-- ONLY IF OLD DATA CORRUPTED (CATASTROPHIC SCENARIO)
-- DO NOT USE unless old fields actually lost!

-- 1. STOP ALL OPERATIONS
-- 2. RESTORE DATABASE FROM BACKUP

-- Option A: Full database restore
-- (Use your backup tool)

-- Option B: Table-level restore (if available)
-- pg_restore --data-only --table=reservations backup.dump

-- 3. After restore, verify data integrity
SELECT
  COUNT(*) as total_after_restore,
  COUNT(service) as has_service_field,
  COUNT("preferredTime") as has_time_field,
  MIN("createdAt") as oldest_reservation,
  MAX("createdAt") as newest_reservation
FROM reservations;

-- 4. Check for data loss (reservations created after backup)
-- Compare newest_reservation to current time
-- Manual recovery may be needed for recent reservations
```

---

## PHASE 3 ROLLBACK DECISION TREE

```
PHASE 3: Application switchover (feature flagged)
│
├─ SYMPTOM: Error rate spike during rollout
│  ├─ SEVERITY: 🔴 CRITICAL if >10%, 🟡 MEDIUM if 5-10%
│  ├─ ACTION: Immediate percentage reduction
│  │  └─ STEPS:
│  │     ├─ >10% increase → Set rollout to 0% immediately
│  │     ├─ 5-10% increase → Reduce rollout by 50%
│  │     └─ <5% increase → Monitor closely, may be acceptable
│  └─ ROLLBACK: Set DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=0
│
├─ SYMPTOM: Reservation creation failures
│  ├─ SEVERITY: 🔴 CRITICAL
│  ├─ INDICATORS:
│  │  ├─ 400/500 errors in API
│  │  ├─ Reservation count dropping
│  │  └─ User complaints
│  ├─ ACTION: IMMEDIATE ROLLBACK
│  │  └─ STEPS:
│  │     1. Set USE_DYNAMIC_SERVICES=false
│  │     2. Set DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=0
│  │     3. Restart application
│  │     4. Verify old system working
│  │     5. Investigate cause before re-attempting
│  └─ ROLLBACK: Feature flag to old system
│
├─ SYMPTOM: Dual-write failure
│  ├─ SEVERITY: 🟡 MEDIUM (data consistency issue)
│  ├─ INDICATORS:
│  │  ├─ New reservations missing old fields
│  │  ├─ New reservations missing new fields
│  │  └─ Validation query shows mismatch
│  ├─ ACTION: Investigate and fix code
│  │  ├─ Check reservation creation logic
│  │  └─ Verify both old and new fields written
│  └─ ROLLBACK: If cannot fix quickly (<1 hour)
│
├─ SYMPTOM: Availability check failures
│  ├─ SEVERITY: 🔴 CRITICAL (blocks new reservations)
│  ├─ INDICATORS:
│  │  ├─ "Reservation full" errors when slots available
│  │  ├─ Overbooking (more reservations than capacity)
│  │  └─ ClinicTimeSlot logic errors
│  ├─ ACTION: IMMEDIATE ROLLBACK
│  │  └─ STEPS:
│  │     1. Rollback feature flag
│  │     2. Fix availability logic
│  │     3. Test in staging
│  │     4. Re-deploy with fix
│  └─ ROLLBACK: Feature flag to old system
│
├─ SYMPTOM: Performance degradation
│  ├─ SEVERITY: 🟡 MEDIUM if <2x slowdown, 🔴 CRITICAL if >2x
│  ├─ INDICATORS:
│  │  ├─ Reservation API response time >1s
│  │  ├─ Database query time >500ms
│  │  └─ User complaints of slowness
│  ├─ ACTION: Analyze query performance
│  │  ├─ Check EXPLAIN ANALYZE output
│  │  ├─ Verify index usage
│  │  └─ Monitor database load
│  └─ ROLLBACK: If >2x slowdown and cannot fix quickly
│
└─ DECISION: Continue rollout or Rollback?
   ├─ CONTINUE ROLLOUT IF:
   │  ✅ Error rate increase <5%
   │  ✅ Reservation creation working
   │  ✅ Dual-write functioning
   │  ✅ Availability checks correct
   │  ✅ Performance acceptable
   │  ✅ No user complaints
   │
   └─ ROLLBACK IF:
      ❌ Error rate increase >10%
      ❌ Reservation creation failing
      ❌ Dual-write broken
      ❌ Availability logic wrong
      ❌ Performance degraded >2x
      ❌ Cannot diagnose issue within 1 hour
```

### Phase 3 Rollback Script
```bash
#!/bin/bash
# EXECUTE ONLY IF ROLLING BACK PHASE 3

echo "🔄 Rolling back Phase 3 (Application Switchover)..."

# 1. Set environment variables back to old system
export USE_DYNAMIC_SERVICES=false
export DYNAMIC_SERVICES_ROLLOUT_PERCENTAGE=0

echo "✅ Environment variables set"

# 2. Restart application (adjust for your deployment)
# Option A: PM2
pm2 restart all

# Option B: Systemd
# systemctl restart your-app

# Option C: Kubernetes
# kubectl rollout restart deployment/your-app

echo "✅ Application restarted"

# 3. Wait for application to be ready
sleep 10

# 4. Verify old system working
echo "🔍 Testing old system..."

curl -X POST http://localhost:3000/api/public/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Rollback Test",
    "phone": "010-1234-5678",
    "birth_date": "1990-01-01",
    "gender": "FEMALE",
    "treatment_type": "FIRST_VISIT",
    "service": "WRINKLE_BOTOX",
    "preferred_date": "2025-12-01",
    "preferred_time": "10:00"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# 5. Validate in database
psql $DATABASE_URL -c "
SELECT
  'Rollback validation' as check_type,
  COUNT(*) FILTER (WHERE createdAt >= NOW() - INTERVAL '5 minutes') as recent_reservations,
  CASE
    WHEN COUNT(*) FILTER (WHERE createdAt >= NOW() - INTERVAL '5 minutes') > 0
    THEN '✅ Old system working'
    ELSE '⚠️ No recent reservations (may need time)'
  END as status
FROM reservations;
"

echo "✅ Phase 3 rollback complete"
echo "⚠️ Investigate root cause before re-attempting rollout"
```

---

## PHASE 4 ROLLBACK DECISION TREE

```
PHASE 4: Cleanup (IRREVERSIBLE!)
│
⚠️  WARNING: POINT OF NO RETURN
│
├─ SYMPTOM: Application crashes after enum deletion
│  ├─ SEVERITY: 🔴🔴🔴 CATASTROPHIC
│  ├─ ROLLBACK: ❌ NOT POSSIBLE (enum deleted)
│  ├─ ACTION: EMERGENCY FIX FORWARD
│  │  └─ STEPS:
│  │     1. Check for code still referencing old enum
│  │     2. Deploy hotfix to use new fields only
│  │     3. If unfixable: RESTORE FROM BACKUP (data loss!)
│  └─ PREVENTION:
│     ✅ Run full E2E tests before Phase 4
│     ✅ Grep codebase for ServiceType references
│     ✅ Ensure feature flags fully removed
│
├─ SYMPTOM: Database queries fail referencing old fields
│  ├─ SEVERITY: 🔴 CRITICAL
│  ├─ ROLLBACK: ❌ NOT POSSIBLE (fields deleted)
│  ├─ ACTION: FIX CODE IMMEDIATELY
│  │  └─ STEPS:
│  │     1. Find code referencing service or preferredTime
│  │     2. Update to use serviceId and period
│  │     3. Deploy emergency hotfix
│  └─ PREVENTION:
│     ✅ Grep codebase for old field references before Phase 4
│     ✅ Test all API endpoints after cleanup
│
├─ SYMPTOM: Reports or analytics broken
│  ├─ SEVERITY: 🟡 MEDIUM (non-critical functionality)
│  ├─ ROLLBACK: ❌ NOT POSSIBLE
│  ├─ ACTION: Update queries to use new schema
│  │  └─ Example:
│  │     Old: WHERE service = 'WRINKLE_BOTOX'
│  │     New: WHERE s.code = 'WRINKLE_BOTOX' (JOIN services s)
│  └─ PREVENTION:
│     ✅ Document all queries using old schema
│     ✅ Update before Phase 4
│
└─ DECISION: Emergency Database Restore?
   ├─ RESTORE ONLY IF:
   │  🔴 Application completely broken
   │  🔴 Cannot fix code within 4 hours
   │  🔴 Business impact critical (no reservations possible)
   │  🔴 Team exhausted all fix-forward options
   │
   └─ CONSEQUENCES OF RESTORE:
      ⚠️  Lose all reservations created after backup
      ⚠️  Restore to Phase 3 state (before cleanup)
      ⚠️  Must re-plan Phase 4 approach
      ⚠️  Significant business disruption
```

### Phase 4 Emergency Response (No Rollback Available!)
```bash
#!/bin/bash
# PHASE 4 EMERGENCY - FIX FORWARD ONLY

echo "🚨 PHASE 4 EMERGENCY - NO ROLLBACK POSSIBLE"
echo "⚠️  Must fix forward or restore from backup"

# 1. Immediate triage
echo "1️⃣ Checking application status..."

curl -s http://localhost:3000/health || echo "❌ Application down!"

# 2. Database connectivity
echo "2️⃣ Checking database..."

psql $DATABASE_URL -c "SELECT 1;" || echo "❌ Database connection failed!"

# 3. Quick fix attempts
echo "3️⃣ Attempting quick fixes..."

# Check for code still using old enum
echo "Checking for ServiceType references..."
grep -r "ServiceType" app/ lib/ --exclude-dir=node_modules

# Check for old field references
echo "Checking for old field references..."
grep -r "\.service[^I]" app/ lib/ --exclude-dir=node_modules
grep -r "preferredTime" app/ lib/ --exclude-dir=node_modules

# 4. Decision point
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          PHASE 4 EMERGENCY DECISION POINT             ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║                                                        ║"
echo "║  Option A: FIX FORWARD (Recommended)                   ║"
echo "║  - Update code to use new schema                       ║"
echo "║  - Deploy hotfix                                       ║"
echo "║  - Test and validate                                   ║"
echo "║                                                        ║"
echo "║  Option B: DATABASE RESTORE (Last Resort)              ║"
echo "║  - Restore from pre-Phase-4 backup                     ║"
echo "║  - Lose recent reservations                            ║"
echo "║  - Re-plan Phase 4                                     ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

read -p "Choose option (A/B): " choice

if [ "$choice" = "B" ]; then
  echo "⚠️  DATABASE RESTORE INITIATED"
  echo "⚠️  Manual intervention required - contact DBA"
  echo ""
  echo "Restore command:"
  echo "pg_restore -d $DATABASE_URL /path/to/backup.dump"
  echo ""
  echo "After restore, verify:"
  psql $DATABASE_URL -c "
    SELECT
      EXISTS(SELECT 1 FROM pg_type WHERE typname = 'ServiceType') as enum_exists,
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'service') as old_field_exists;
  "
else
  echo "✅ FIX FORWARD selected"
  echo "📝 Steps:"
  echo "  1. Update code to use serviceId and period"
  echo "  2. Remove ServiceType enum references"
  echo "  3. Test locally"
  echo "  4. Deploy hotfix"
  echo "  5. Monitor production"
fi
```

---

## ROLLBACK SEVERITY MATRIX

| Symptom | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---------|---------|---------|---------|---------|
| Schema creation error | 🟡 Easy rollback | N/A | N/A | N/A |
| Data corruption | 🔴 Restore backup | 🔴🔴 Restore backup | 🟡 Feature flag | 🔴🔴🔴 Restore or fix |
| Application error | 🟢 Schema rollback | 🟡 Data rollback | 🟢 Feature flag | 🔴 Fix forward only |
| Performance issue | 🟢 Schema rollback | 🟡 Acceptable | 🟡 Feature flag | 🟡 Optimize queries |
| Parsing error | N/A | 🔴 Fix logic, re-run | N/A | N/A |
| User impact | 🟢 None (additive) | 🟢 None (transparent) | 🟡 Some (if errors) | 🔴 High (if broken) |

**Legend**:
- 🟢 LOW: Easy rollback, minimal risk
- 🟡 MEDIUM: Rollback possible, requires validation
- 🔴 HIGH: Difficult rollback, significant risk
- 🔴🔴 CRITICAL: Very difficult, possible data loss
- 🔴🔴🔴 CATASTROPHIC: No rollback, fix forward only

---

## CONTACT ESCALATION PATH

**Use this escalation path when making rollback decisions**:

```
Level 1: Developer/Engineer (0-30 min)
├─ Try quick fixes
├─ Check obvious errors
└─ Escalate if unresolved

Level 2: Tech Lead/Senior Engineer (30-60 min)
├─ Analyze root cause
├─ Decide rollback vs fix forward
└─ Escalate if critical

Level 3: Database Admin + CTO (60+ min)
├─ Database restore decisions
├─ Business impact assessment
└─ External expert consultation if needed

Emergency Contact Sheet:
┌─────────────────────────────────────────┐
│ Developer: ___________________          │
│ Tech Lead: ___________________          │
│ DBA: __________________________         │
│ CTO: __________________________         │
│ Backup Location: ______________         │
└─────────────────────────────────────────┘
```

---

## DECISION CHECKLIST

**Before executing any rollback**, verify:

```
[ ] Issue clearly identified and documented
[ ] Severity level determined
[ ] Impact to users assessed
[ ] Rollback script reviewed
[ ] Team notified
[ ] Backup status confirmed
[ ] Rollback authority obtained (if required)
[ ] Post-rollback validation plan ready
```

**After executing rollback**, verify:

```
[ ] Application functional
[ ] Data integrity confirmed
[ ] Users can create reservations
[ ] No error rate spike
[ ] Team debriefed on root cause
[ ] Migration plan updated based on learnings
```

---

**END OF ROLLBACK DECISION TREE**
