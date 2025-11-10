# Service Limits Migration Plan: Count-Based → Time-Based

## Executive Summary

**Problem**: Current implementation uses COUNT-BASED limits (2건, 3건, 5건) but should use TIME-BASED limits (80분, 150분, 300분)

**Impact**: Medium - Affects API responses, limit checking logic, frontend display

**Timeline**: 2-3 days (development + testing + deployment)

---

## Current State Analysis (✅ COMPLETED)

### Production Database State

| Service Type | Current Limit (Count) | Duration | Buffer | Total Time | Equivalent Minutes |
|--------------|----------------------|----------|--------|------------|--------------------|
| WRINKLE_BOTOX | 2건 | 30min | 10min | 40min | **80분/일** |
| VOLUME_LIFTING | 3건 | 40min | 10min | 50min | **150분/일** |
| SKIN_CARE | 5건 | 50min | 10min | 60min | **300분/일** |
| REMOVAL_PROCEDURE | 3건 | 30min | 10min | 40min | **120분/일** |
| BODY_CARE | 5건 | 60min | 10min | 70min | **350분/일** |
| OTHER_CONSULTATION | 5건 | 20min | 10min | 30min | **150분/일** |

### Recent Usage Pattern (Last 7 Days)

- **2025-11-10**: 주름/보톡스 3건 (90분 소비)
- **2025-11-07**: 주름/보톡스 1건 (30분), 볼륨/리프팅 1건 (40분)
- **2025-11-06**: 주름/보톡스 3건 (90분), 제거시술 1건 (30분)
- **2025-11-05**: 주름/보톡스 2건 (60분)

**Key Insight**: 주름/보톡스 already exceeds count-based limit (2건) on multiple days, but time-based limit (80분) would also be exceeded. This validates the migration.

---

## Migration Strategy

### Phase 1: Database Schema Migration (NON-BREAKING)

**Objective**: Add new column without disrupting existing system

```sql
-- Step 1: Add new column
ALTER TABLE service_reservation_limits
ADD COLUMN daily_limit_minutes INT;

-- Step 2: Migrate data (preserve business logic)
UPDATE service_reservation_limits srl
SET daily_limit_minutes = srl."dailyLimit" * (
  SELECT (s."durationMinutes" + s."bufferMinutes")
  FROM services s
  WHERE s.id = srl."serviceId"
)
WHERE srl."serviceId" IS NOT NULL;

-- Step 3: Verify migration
SELECT
  "serviceType",
  "dailyLimit" as old_count,
  daily_limit_minutes as new_minutes,
  s.name,
  (s."durationMinutes" + s."bufferMinutes") as service_duration
FROM service_reservation_limits srl
LEFT JOIN services s ON srl."serviceId" = s.id;
```

**Expected Results**:
- WRINKLE_BOTOX: 80분
- VOLUME_LIFTING: 150분
- SKIN_CARE: 300분
- REMOVAL_PROCEDURE: 120분
- BODY_CARE: 350분
- OTHER_CONSULTATION: 150분

### Phase 2: Code Migration (BREAKING CHANGES)

#### 2.1 Update Interface (`/lib/reservations/service-limits.ts`)

**Before** (Count-Based):
```typescript
export interface LimitCheckResult {
  available: boolean;
  dailyLimit: number | null;
  currentCount: number;  // ❌ Count-based
  remaining: number;
  message?: string;
}
```

**After** (Time-Based):
```typescript
export interface LimitCheckResult {
  available: boolean;
  dailyLimitMinutes: number | null;  // ✅ Time-based
  consumedMinutes: number;           // ✅ Time-based
  remainingMinutes: number;          // ✅ Time-based
  message?: string;
}
```

#### 2.2 Rewrite `checkServiceDailyLimit()` Function

**Current Implementation** (Lines 34-112):
- Uses `prisma.reservations.count()` (❌ wrong)
- Returns count-based metrics

**New Implementation** (Follow `time-slot-calculator.ts` pattern):
```typescript
export async function checkServiceDailyLimit(
  serviceId: string,
  date: Date
): Promise<LimitCheckResult> {
  try {
    // 1. Get limit configuration
    const limit = await prisma.service_reservation_limits.findUnique({
      where: { serviceId },
      include: {
        service: {
          select: { name: true }
        }
      }
    });

    // No limit or inactive → unlimited
    if (!limit || !limit.isActive || !limit.daily_limit_minutes) {
      return {
        available: true,
        dailyLimitMinutes: null,
        consumedMinutes: 0,
        remainingMinutes: Infinity
      };
    }

    // 2. Calculate consumed minutes for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ TIME-BASED: Sum estimatedDuration (follows time-slot-calculator.ts pattern)
    const result = await prisma.reservations.aggregate({
      where: {
        serviceId,
        preferredDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED']
        }
      },
      _sum: {
        estimatedDuration: true
      }
    });

    const consumedMinutes = result._sum.estimatedDuration || 0;
    const remainingMinutes = limit.daily_limit_minutes - consumedMinutes;

    // 3. Check availability
    if (remainingMinutes <= 0) {
      return {
        available: false,
        dailyLimitMinutes: limit.daily_limit_minutes,
        consumedMinutes,
        remainingMinutes: 0,
        message: `죄송합니다. ${limit.service?.name || '해당 시술'}은(는) ${date.toLocaleDateString('ko-KR')} 날짜의 예약이 마감되었습니다. (하루 한도: ${limit.daily_limit_minutes}분)`
      };
    }

    return {
      available: true,
      dailyLimitMinutes: limit.daily_limit_minutes,
      consumedMinutes,
      remainingMinutes
    };

  } catch (error) {
    console.error('Error checking service daily limit:', error);

    // Safe fallback
    return {
      available: true,
      dailyLimitMinutes: null,
      consumedMinutes: 0,
      remainingMinutes: Infinity,
      message: 'Limit check failed, allowing reservation'
    };
  }
}
```

#### 2.3 Rewrite `getServiceLimitsByDateRange()` Function

**Current Implementation** (Lines 134-195):
- Uses `groupBy` with `_count` (❌ wrong)

**New Implementation**:
```typescript
export async function getServiceLimitsByDateRange(
  serviceId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, LimitCheckResult>> {
  try {
    // 1. Get limit configuration
    const limit = await prisma.service_reservation_limits.findUnique({
      where: { serviceId },
      include: {
        service: {
          select: { name: true }
        }
      }
    });

    const result = new Map<string, LimitCheckResult>();

    // No limit → empty result
    if (!limit || !limit.isActive || !limit.daily_limit_minutes) {
      return result;
    }

    // 2. ✅ TIME-BASED: Group by date and sum estimatedDuration
    const reservations = await prisma.reservations.groupBy({
      by: ['preferredDate'],
      where: {
        serviceId,
        preferredDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED']
        }
      },
      _sum: {
        estimatedDuration: true
      }
    });

    // 3. Generate results
    for (const reservation of reservations) {
      const dateKey = reservation.preferredDate.toISOString().split('T')[0];
      const consumedMinutes = reservation._sum.estimatedDuration || 0;
      const remainingMinutes = limit.daily_limit_minutes - consumedMinutes;
      const available = remainingMinutes > 0;

      result.set(dateKey, {
        available,
        dailyLimitMinutes: limit.daily_limit_minutes,
        consumedMinutes,
        remainingMinutes: Math.max(0, remainingMinutes),
        message: available ? undefined : `예약 마감 (${consumedMinutes}분/${limit.daily_limit_minutes}분)`
      });
    }

    return result;

  } catch (error) {
    console.error('Error getting service limits by date range:', error);
    return new Map();
  }
}
```

#### 2.4 Update API Route (`/app/api/public/reservations/route.ts`)

**Lines 107-128**: Update error response format

**Before**:
```typescript
return NextResponse.json({
  error: 'Daily limit exceeded',
  message: limitCheck.message,
  details: {
    dailyLimit: limitCheck.dailyLimit,      // ❌ count
    currentCount: limitCheck.currentCount,  // ❌ count
    date: preferredDate.toISOString().split('T')[0]
  }
}, { status: 409 });
```

**After**:
```typescript
return NextResponse.json({
  error: 'Daily limit exceeded',
  message: limitCheck.message,
  details: {
    dailyLimitMinutes: limitCheck.dailyLimitMinutes,  // ✅ minutes
    consumedMinutes: limitCheck.consumedMinutes,      // ✅ minutes
    remainingMinutes: limitCheck.remainingMinutes,    // ✅ minutes
    date: preferredDate.toISOString().split('T')[0]
  }
}, { status: 409 });
```

---

## Testing Strategy

### Test Scenario 1: Within Limit
**Setup**:
- Service: WRINKLE_BOTOX (limit: 80분)
- Existing: 1건 (30분 consumed)
- New request: 30분

**Expected**:
- ✅ `available: true`
- `consumedMinutes: 30`
- `remainingMinutes: 50`
- Reservation created successfully

### Test Scenario 2: Exceeds Limit
**Setup**:
- Service: WRINKLE_BOTOX (limit: 80분)
- Existing: 2건 (60분 consumed)
- New request: 30분

**Expected**:
- ❌ `available: false`
- `consumedMinutes: 60`
- `remainingMinutes: 20`
- Error: "Daily limit exceeded" (409 status)

### Test Scenario 3: No Limit
**Setup**:
- Service has no limit or isActive=false

**Expected**:
- ✅ `available: true`
- `dailyLimitMinutes: null`
- `remainingMinutes: Infinity`

### Test Scenario 4: Date Range Query
**Setup**:
- Query limits for 2025-11-05 to 2025-11-10

**Expected**:
- Map with keys: "2025-11-05", "2025-11-06", "2025-11-07", "2025-11-10"
- Each entry shows consumed/remaining minutes

---

## Deployment Plan

### Step 1: Pre-Deployment (30 minutes)
1. ✅ Backup production database
2. ✅ Create staging environment snapshot
3. ✅ Deploy migration script to staging
4. ✅ Run validation queries

### Step 2: Database Migration (10 minutes)
```bash
# Run migration
npx prisma migrate dev --name add_daily_limit_minutes

# Or manual SQL (safer for production)
psql -h 141.164.60.51 -p 5432 -U misopin_user -d misopin_cms < migration.sql
```

### Step 3: Code Deployment (15 minutes)
1. Deploy updated code to production
2. Restart application
3. Monitor logs for errors

### Step 4: Validation (30 minutes)
1. Test each service type reservation
2. Verify limit checking works correctly
3. Monitor real-world usage

### Step 5: Cleanup (Optional, after 2 weeks)
```sql
-- After verification period, drop old column
ALTER TABLE service_reservation_limits
DROP COLUMN "dailyLimit";
```

---

## Rollback Plan

### If Migration Fails
```sql
-- Drop new column
ALTER TABLE service_reservation_limits
DROP COLUMN daily_limit_minutes;

-- Redeploy previous code version
git revert <commit-hash>
```

### If Code Deployment Fails
1. Revert to previous deployment
2. New column remains (harmless)
3. Retry after fixing issues

---

## Risk Assessment

### High Risk
- ❌ **Data loss**: Mitigated by backup + non-destructive migration
- ❌ **Downtime**: Mitigated by fast deployment (<10 min)

### Medium Risk
- ⚠️ **Frontend breaking**: API response format changes
- ⚠️ **Business logic change**: Different limit calculation

### Low Risk
- ✅ **Database schema change**: Additive, non-breaking
- ✅ **Performance impact**: Same query complexity (aggregate vs count)

---

## Success Criteria

1. ✅ All service limits calculated in minutes
2. ✅ API returns time-based metrics
3. ✅ Existing reservations unaffected
4. ✅ New reservations checked against time limits
5. ✅ Frontend displays correct remaining capacity
6. ✅ No production errors or downtime

---

## Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Analysis | ✅ Complete | Database state analysis |
| Migration Script | 2 hours | Write and test SQL migration |
| Code Changes | 4 hours | Rewrite service-limits.ts and tests |
| Testing | 4 hours | Comprehensive test scenarios |
| Staging Deploy | 1 hour | Deploy to staging environment |
| Production Deploy | 1 hour | Execute production migration |
| Monitoring | 24 hours | Watch for issues |
| **Total** | **2-3 days** | Including buffer time |

---

## Next Steps

1. ✅ Create Prisma migration file
2. ✅ Rewrite service-limits.ts functions
3. ✅ Update API route responses
4. ✅ Write comprehensive tests
5. ✅ Deploy to staging
6. ✅ Execute production migration
