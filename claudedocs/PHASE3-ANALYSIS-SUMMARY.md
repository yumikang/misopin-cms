# Phase 3 Service Limits Analysis - Executive Summary

**Date**: 2025-11-07
**Analysis Status**: ✅ COMPLETE
**Implementation Status**: Ready for Development

---

## Problem Statement

**Current System**: Service limits use COUNT-BASED logic
- Example: "2건 per day" (2 appointments per day)
- Implementation: `prisma.reservations.count()`

**Intended System**: Service limits should use TIME-BASED logic
- Example: "80분 per day" (80 minutes per day)
- Reference: `time-slot-calculator.ts` already uses time-based logic correctly

**Impact**: Medium - Affects limit checking, API responses, and business logic

---

## Key Findings

### 1. Production Data Analysis

**Current Service Limits** (converted to time-based):

| Service | Count Limit | Time Equivalent |
|---------|-------------|-----------------|
| 주름/보톡스 (WRINKLE_BOTOX) | 2건 | **80분/일** |
| 볼륨/리프팅 (VOLUME_LIFTING) | 3건 | **150분/일** |
| 피부케어 (SKIN_CARE) | 5건 | **300분/일** |
| 제거시술 (REMOVAL_PROCEDURE) | 3건 | **120분/일** |
| 바디케어 (BODY_CARE) | 5건 | **350분/일** |
| 기타 상담 (OTHER_CONSULTATION) | 5건 | **150분/일** |

**Recent Usage** (Nov 5-10):
- 2025-11-10: 주름/보톡스 3건 (90분) - **Exceeds both count and time limits**
- 2025-11-06: 주름/보톡스 3건 (90분) - **Exceeds limits**
- 2025-11-05: 주름/보톡스 2건 (60분) - At count limit, within time limit

**Critical Insight**: The system is already exceeding count-based limits in production, validating the need for time-based migration.

### 2. Code Analysis

**Files Requiring Changes**:
1. `/lib/reservations/service-limits.ts` - **MAJOR REWRITE** (3 functions)
2. `/app/api/public/reservations/route.ts` - **MINOR UPDATE** (error responses)
3. `/prisma/schema.prisma` - **SCHEMA CHANGE** (add `dailyLimitMinutes` column)

**Reference Implementation**:
- `/lib/reservations/time-slot-calculator.ts` (lines 239-246) already implements time-based logic correctly
- This is the pattern to follow for `service-limits.ts`

### 3. Breaking Changes

**API Response Format**:
```json
// Before (Count-Based)
{
  "dailyLimit": 2,
  "currentCount": 3,
  "remaining": 0
}

// After (Time-Based)
{
  "dailyLimitMinutes": 80,
  "consumedMinutes": 90,
  "remainingMinutes": 0
}
```

**Interface Changes**:
```typescript
// Before
interface LimitCheckResult {
  currentCount: number;    // ❌ count
  remaining: number;       // ❌ count
}

// After
interface LimitCheckResult {
  consumedMinutes: number;     // ✅ minutes
  remainingMinutes: number;    // ✅ minutes
}
```

---

## Migration Plan

### Phase 1: Database Migration (NON-BREAKING)
**Duration**: 10 minutes
**Risk**: Low

```sql
-- Add new column
ALTER TABLE service_reservation_limits
ADD COLUMN "dailyLimitMinutes" INTEGER;

-- Migrate data
UPDATE service_reservation_limits srl
SET "dailyLimitMinutes" = srl."dailyLimit" * (
  SELECT (s."durationMinutes" + s."bufferMinutes")
  FROM services s
  WHERE s.id = srl."serviceId"
);
```

**Result**:
- WRINKLE_BOTOX: 2건 × 40분 = 80분
- VOLUME_LIFTING: 3건 × 50분 = 150분
- SKIN_CARE: 5건 × 60분 = 300분
- REMOVAL_PROCEDURE: 3건 × 40분 = 120분
- BODY_CARE: 5건 × 70분 = 350분
- OTHER_CONSULTATION: 5건 × 30분 = 150분

### Phase 2: Code Changes (BREAKING)
**Duration**: 4-6 hours
**Risk**: Medium (requires testing)

**Change 1**: Rewrite `checkServiceDailyLimit()`
```typescript
// Replace
const count = await prisma.reservations.count({ ... });

// With
const result = await prisma.reservations.aggregate({
  _sum: { estimatedDuration: true }
});
const consumedMinutes = result._sum.estimatedDuration || 0;
```

**Change 2**: Rewrite `getServiceLimitsByDateRange()`
```typescript
// Replace
_count: true

// With
_sum: { estimatedDuration: true }
```

**Change 3**: Update API error responses
```typescript
// Update all references from count to minutes
dailyLimit → dailyLimitMinutes
currentCount → consumedMinutes
remaining → remainingMinutes
```

### Phase 3: Testing & Deployment
**Duration**: 2-3 hours
**Risk**: Low (with staging validation)

1. Deploy migration to staging
2. Run comprehensive tests
3. Validate API responses
4. Deploy to production
5. Monitor for 24 hours

---

## Test Scenarios

### Scenario 1: Within Limit ✅
- Service: WRINKLE_BOTOX (80분 limit)
- Consumed: 30분
- Request: 30분
- **Result**: Available (20분 remaining)

### Scenario 2: Exceeds Limit ❌
- Service: WRINKLE_BOTOX (80분 limit)
- Consumed: 60분
- Request: 30분
- **Result**: Not available (only 20분 remaining, need 40분 total)

### Scenario 3: Edge Case ⚠️
- Service: WRINKLE_BOTOX (80분 limit)
- Consumed: 79분
- Request: 40분 appointment
- **Result**: Not available (1분 < 40분 required)

---

## Risk Assessment

### High Risk (Mitigated)
- ❌ **Data Loss**: Backup + non-destructive migration
- ❌ **Downtime**: Fast deployment (<10 min)

### Medium Risk (Manageable)
- ⚠️ **Frontend Breaking**: Coordinate API changes with frontend team
- ⚠️ **Business Logic Change**: Comprehensive testing required

### Low Risk (Acceptable)
- ✅ **Performance**: Same query complexity (aggregate vs count)
- ✅ **Rollback**: Simple (drop column + redeploy old code)

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Analysis & Planning | 4 hours | ✅ COMPLETE |
| Database Migration | 10 min | ⏳ Ready |
| Code Development | 4-6 hours | ⏳ Ready |
| Testing | 2-3 hours | ⏳ Pending |
| Staging Deploy | 1 hour | ⏳ Pending |
| Production Deploy | 1 hour | ⏳ Pending |
| Monitoring | 24 hours | ⏳ Pending |
| **Total** | **2-3 days** | **33% Complete** |

---

## Deliverables

### ✅ Completed
1. Production database analysis (current state, usage patterns)
2. Time-based limit calculations (80분, 150분, etc.)
3. Migration script (`prisma/migrations/.../migration.sql`)
4. Comprehensive analysis document (`service-limits-conversion-analysis.md`)
5. Migration plan document (`service-limits-migration-plan.md`)
6. Test scenarios and validation checklist

### ⏳ Ready for Development
1. Rewrite `service-limits.ts` functions
2. Update API route error responses
3. Write comprehensive unit tests
4. Deploy to staging environment
5. Execute production migration

---

## Recommendations

### Immediate Actions (Now)
1. **Review analysis documents** with team
2. **Coordinate with frontend** team for API changes
3. **Schedule deployment window** (low-traffic period)
4. **Backup production database** before migration

### Short-term (This Week)
1. **Implement code changes** following the migration plan
2. **Test thoroughly** in staging environment
3. **Deploy to production** with monitoring
4. **Validate** with real-world usage

### Long-term (After 2 Weeks)
1. **Drop old column** (`dailyLimit`) after verification
2. **Update documentation** with new time-based system
3. **Monitor metrics** for business insights

---

## Key Metrics to Monitor

### Before Migration
- Count-based: "2건/일", "3건/일", "5건/일"
- Calculation: `prisma.reservations.count()`
- Message: "하루 한도: 2건"

### After Migration
- Time-based: "80분/일", "150분/일", "300분/일"
- Calculation: `aggregate({ _sum: { estimatedDuration } })`
- Message: "하루 한도: 80분"

### Success Indicators
- ✅ Zero API errors related to limits
- ✅ Error messages show minutes not counts
- ✅ Frontend displays correct remaining capacity
- ✅ Business logic correctly enforces time-based limits
- ✅ No production downtime or data loss

---

## Rollback Plan

**If Migration Fails**:
```sql
ALTER TABLE service_reservation_limits DROP COLUMN "dailyLimitMinutes";
```

**If Code Fails**:
```bash
git revert HEAD
npm run build && npm run start
```

**Recovery Time**: <5 minutes

---

## Conclusion

**Status**: Analysis Complete ✅
**Risk Level**: Low-Medium (manageable)
**Recommendation**: Proceed with migration
**Timeline**: 2-3 days (development + testing + deployment)

**Key Success Factor**: The reference implementation (`time-slot-calculator.ts`) already demonstrates the correct time-based pattern. Following this pattern for `service-limits.ts` ensures consistency and correctness.

**Next Step**: Begin code development following the detailed migration plan.

---

## Appendix: Quick Reference

### Database Connection
```
Host: 141.164.60.51:5432
Database: misopin_cms
User: misopin_user
```

### Key Files
- Migration: `/prisma/migrations/20251107103926_add_daily_limit_minutes/migration.sql`
- Analysis: `/claudedocs/service-limits-conversion-analysis.md`
- Plan: `/claudedocs/service-limits-migration-plan.md`
- Reference: `/lib/reservations/time-slot-calculator.ts` (lines 239-246)

### Commands
```bash
# Analyze current state
npx tsx scripts/analyze-service-limits.ts

# Run migration
npx prisma migrate deploy

# Test API
curl -X POST http://localhost:3000/api/public/reservations \
  -H "Content-Type: application/json" \
  -d '{"service":"WRINKLE_BOTOX","preferred_date":"2025-11-15",...}'
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-07 10:45 KST
**Author**: Claude (Analysis Engine)
