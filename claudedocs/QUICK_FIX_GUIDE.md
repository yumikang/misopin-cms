# Quick Fix Guide: Period Enum Type Mismatch

**Issue**: Database type mismatch preventing manual closure queries
**Root Cause**: `manual_time_closures.period` is VARCHAR instead of Period enum
**Fix Time**: ~5 minutes
**Risk**: Low (with backup)

---

## TL;DR - Execute This

```bash
# 1. Backup database (REQUIRED)
pg_dump $DATABASE_URL > backup_before_period_fix_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migration
psql $DATABASE_URL -f migrations/002_fix_period_enum_type.sql

# 3. Regenerate Prisma Client
npx prisma generate

# 4. Test the fix
node scripts/check-closures.js

# Done! (See below for validation steps)
```

---

## Detailed Steps

### Step 1: Pre-Migration Backup

```bash
# Create backup
pg_dump $DATABASE_URL > backup_before_period_fix_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_before_period_fix_*.sql
```

### Step 2: Check Current State

```bash
# Verify current broken state
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const result = await prisma.manual_time_closures.findFirst({
      where: { period: 'MORNING' }
    });
    console.log('❌ Unexpected: Query should fail but succeeded');
  } catch (error) {
    console.log('✓ Expected error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}
check();
"
```

Expected output:
```
✓ Expected error: 연산자 없음: character varying = "Period"
```

### Step 3: Apply Migration

```bash
# Apply the fix
psql $DATABASE_URL -f migrations/002_fix_period_enum_type.sql
```

Expected output:
```
NOTICE:  ✓ Validation passed: All period values are valid
NOTICE:  Starting migration: Converting period column...
NOTICE:  ✓ Column type altered successfully
NOTICE:  ✓ Verification passed: column type is now Period enum
NOTICE:  ✓ Query test passed: Found X rows with MORNING period
NOTICE:  ========================================
NOTICE:  Migration completed successfully!
...
COMMIT
```

### Step 4: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 5: Verify Fix Works

```bash
# Test 1: Check database schema
psql $DATABASE_URL -c "
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_name = 'manual_time_closures'
    AND column_name = 'period';
"
```

Expected output:
```
 column_name | data_type | udt_name
-------------+-----------+----------
 period      | USER-DEFINED | Period
```

```bash
# Test 2: Test Prisma query
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.manual_time_closures.findFirst({
      where: { period: 'MORNING' }
    });
    console.log('✅ SUCCESS: Query works! Result:', result ? 'Found data' : 'No data');
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}
test();
"
```

Expected output:
```
✅ SUCCESS: Query works! Result: Found data (or No data)
```

```bash
# Test 3: Run closure check script
node scripts/check-closures.js
```

Should show closure data without errors.

---

## Post-Migration: Re-enable Commented Code

### File: `app/api/public/reservations/route.ts`

**Current state** (lines 163-200):
```typescript
// TEMPORARILY DISABLED due to database type mismatch issue
// TODO: Fix manual_time_closures table Period enum type
/*
const manualClosure = await prisma.manual_time_closures.findFirst({
  ...
});
*/
```

**After migration**, uncomment:
```typescript
// DOUBLE VALIDATION: Check manual closures one more time with transaction
if (period && timeSlotStart) {
  const manualClosure = await prisma.manual_time_closures.findFirst({
    where: {
      closureDate: preferredDate,
      period: period,
      timeSlotStart: timeSlotStart,
      isActive: true,
      OR: [
        { serviceId: null },
        { serviceId: serviceId }
      ]
    }
  });

  if (manualClosure) {
    return NextResponse.json(
      {
        error: 'Time slot manually closed',
        message: '해당 시간대는 관리자에 의해 마감되었습니다.',
        code: 'TIME_SLOT_MANUALLY_CLOSED',
        isManualClosed: true,
        closureReason: manualClosure.reason
      },
      {
        status: 409,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
```

---

## Validation Checklist

After migration, verify:

- [ ] Database column type = `Period` (not VARCHAR)
- [ ] Prisma queries work without errors
- [ ] Manual closure API works (GET /api/admin/manual-close)
- [ ] Can create manual closures (POST /api/admin/manual-close)
- [ ] Reservation validation blocks closed slots
- [ ] Frontend calendar shows closed slots
- [ ] No errors in application logs
- [ ] All existing data preserved

---

## Rollback Procedure (If Needed)

If the migration causes unexpected issues:

```bash
# 1. Rollback the migration
psql $DATABASE_URL -f migrations/ROLLBACK_002.sql

# 2. Restore from backup (alternative)
psql $DATABASE_URL < backup_before_period_fix_YYYYMMDD_HHMMSS.sql

# 3. Re-comment the validation code
# Edit: app/api/public/reservations/route.ts (add /* */ around lines 167-200)

# 4. Regenerate Prisma Client
npx prisma generate
```

---

## Success Indicators

✅ **You know it worked when:**

1. No PostgreSQL errors in logs
2. `node scripts/check-closures.js` runs without errors
3. Admin panel can create/view/delete closures
4. Reservation API correctly blocks closed time slots
5. Database schema shows `Period` enum type (not VARCHAR)

❌ **You know it failed if:**

1. Still seeing "연산자 없음: character varying = \"Period\"" error
2. Cannot query `manual_time_closures` table
3. Prisma Client generation fails
4. Database column still shows VARCHAR type

---

## Common Issues

### Issue: Migration fails with "invalid period values"

**Cause**: Existing data has values other than 'MORNING' or 'AFTERNOON'

**Fix**:
```sql
-- Find invalid values
SELECT DISTINCT period FROM manual_time_closures
WHERE period NOT IN ('MORNING', 'AFTERNOON');

-- Fix them manually
UPDATE manual_time_closures
SET period = 'MORNING'  -- or 'AFTERNOON'
WHERE period = 'INVALID_VALUE';

-- Then re-run migration
```

### Issue: Prisma Client still fails after migration

**Cause**: Need to regenerate Prisma Client

**Fix**:
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: "EVENING" period errors

**Cause**: Code references EVENING but enum only has MORNING/AFTERNOON

**Fix Option 1** - Add EVENING to enum:
```sql
ALTER TYPE "Period" ADD VALUE 'EVENING';
```

**Fix Option 2** - Remove EVENING from code:
```typescript
// app/api/admin/manual-close/route.ts
if (!['MORNING', 'AFTERNOON'].includes(period)) {  // Remove EVENING
  return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
}
```

---

## Additional Resources

- **Full Analysis**: `/Users/blee/Desktop/cms/misopin-cms/claudedocs/root-cause-analysis-period-enum-mismatch.md`
- **Migration File**: `/Users/blee/Desktop/cms/misopin-cms/migrations/002_fix_period_enum_type.sql`
- **Rollback File**: `/Users/blee/Desktop/cms/misopin-cms/migrations/ROLLBACK_002.sql`

---

## Timeline Estimate

| Step | Duration | Cumulative |
|------|----------|------------|
| Backup database | 30 seconds | 0:30 |
| Apply migration | 10 seconds | 0:40 |
| Regenerate Prisma | 20 seconds | 1:00 |
| Verification | 2 minutes | 3:00 |
| Re-enable code | 1 minute | 4:00 |
| Final testing | 2 minutes | 6:00 |
| **Total** | **~6 minutes** | |

---

**Last Updated**: 2025-11-07
**Status**: Ready to execute
**Risk Level**: Low (with backup)
