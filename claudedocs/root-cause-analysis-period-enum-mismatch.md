# Root Cause Analysis: Period Enum Type Mismatch

**Date**: 2025-11-07
**Analyst**: Claude Code (Root Cause Analyst Mode)
**Severity**: 🔴 CRITICAL - Blocking reservation system functionality
**Status**: Investigation Complete

---

## Executive Summary

The reservation system is experiencing a critical database type mismatch error: `"연산자 없음: character varying = \"Period\""` (operator does not exist: character varying = "Period"). This error occurs when querying the `manual_time_closures` table, preventing the manual closure feature from functioning.

**Root Cause**: The `manual_time_closures` table was created with `period VARCHAR(20)` instead of the PostgreSQL enum type `"Period"`, causing a type mismatch between Prisma's expectations and the actual database schema.

---

## Investigation Timeline

### 🔍 Evidence Collection

#### 1. Database Schema Analysis
**Actual Database State** (from information_schema):
```sql
Column: period
Data Type: character varying (varchar)
UDT Name: varchar
```

**Expected Prisma Schema** (schema.prisma:203):
```prisma
period Period
```

**PostgreSQL Enum State** (verified in database):
```sql
CREATE TYPE "Period" AS ENUM ('MORNING', 'AFTERNOON')
```

#### 2. Migration History Analysis

**Manual Migration File** (`migrations/001_add_manual_time_closures.sql`):
```sql
CREATE TABLE IF NOT EXISTS manual_time_closures (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    closure_date DATE NOT NULL,
    period VARCHAR(20) NOT NULL,  -- ❌ WRONG: Should be "Period" enum type
    ...
);
```

**Key Finding**: This migration was created manually and bypassed Prisma's migration system, which would have automatically used the correct enum type.

#### 3. Comparison with Working Tables

**Working Example** - `clinic_time_slots` table:
- Prisma Schema: `period Period`
- Database Column: Uses `"Period"` enum type ✅
- No query errors ✅

**Broken Example** - `manual_time_closures` table:
- Prisma Schema: `period Period`
- Database Column: Uses `VARCHAR(20)` ❌
- Query Error: "연산자 없음: character varying = \"Period\"" ❌

---

## Root Cause Breakdown

### 1. **Why the Error Occurs**

PostgreSQL error message breakdown:
```
연산자 없음: character varying = "Period"
(operator does not exist: character varying = "Period")

힌트: 지정된 이름 및 인자 형식과 일치하는 연산자가 없습니다.
      명시적 형변환자를 추가해야 할 수도 있습니다.
(Hint: No operator matches the given name and argument types.
       You might need to add explicit type casts.)
```

**What Prisma Does**:
When Prisma generates queries for enum fields, it uses the enum type directly:
```sql
WHERE period = 'MORNING'::"Period"
```

**What Database Expects**:
Since the column is VARCHAR, it expects:
```sql
WHERE period = 'MORNING'::varchar
```

**Type Mismatch**: PostgreSQL cannot compare `VARCHAR` with `"Period"` enum without explicit casting.

### 2. **How It Happened**

**Timeline of Events**:

1. ✅ **Initial Setup** (20250916): Period enum created correctly
   ```sql
   CREATE TYPE "public"."Period" AS ENUM (...)  -- from Prisma migration
   ```

2. ✅ **Other Tables** (various dates): Used Period enum correctly
   - `clinic_time_slots.period` → Uses `"Period"` enum
   - `reservations.period` → Uses `"Period"` enum (nullable)

3. ❌ **Manual Migration** (2025-11-06): Created with wrong type
   ```sql
   -- migrations/001_add_manual_time_closures.sql
   period VARCHAR(20) NOT NULL,  -- Should have been "Period"
   ```

4. ❌ **Prisma Schema Update**: Added model expecting enum type
   ```prisma
   model manual_time_closures {
     period Period  // Expects enum, but DB has VARCHAR
   }
   ```

5. 🔴 **Runtime Failure**: Type mismatch discovered during queries

### 3. **Why Manual Migration Was Wrong**

The manual migration file (`001_add_manual_time_closures.sql`) contains:

```sql
period VARCHAR(20) NOT NULL,
```

**Correct approach** would have been:
```sql
period "Period" NOT NULL,
```

**Why the developer made this mistake**:
- Manual SQL migration instead of Prisma migration
- Didn't reference existing enum type
- No validation against Prisma schema before execution
- Used generic VARCHAR type instead of project-specific enum

---

## Affected Components

### 🔴 Directly Broken
1. **`lib/reservations/time-slot-calculator.ts`** (lines 177-193)
   - Cannot query `manual_time_closures` table
   - Validation logic disabled (commented out)

2. **`app/api/public/reservations/route.ts`** (lines 167-200)
   - Manual closure validation DISABLED due to error
   - Comment: "TEMPORARILY DISABLED due to database type mismatch issue"

3. **`app/api/admin/manual-close/route.ts`**
   - All CRUD operations fail with type mismatch error
   - Cannot create, read, update, or delete closures

### ⚠️ Indirectly Impacted
1. **Reservation System**
   - No manual closure enforcement
   - Users can book time slots that should be closed
   - Admin cannot manage closures

2. **Frontend Calendar**
   - `/tmp/calendar-page-v2.html`
   - Cannot display manually closed time slots
   - No visual indication of admin closures

---

## Evidence Chain

### Evidence 1: Database Column Type
```bash
$ Database Query: information_schema.columns
Result: period column = "character varying" (VARCHAR)
```

### Evidence 2: PostgreSQL Enum Exists
```bash
$ Database Query: pg_type + pg_enum
Result: "Period" enum exists with MORNING, AFTERNOON
```

### Evidence 3: Query Failure
```bash
$ Test Query: manual_time_closures.findFirst({ where: { period: 'MORNING' } })
Error: "연산자 없음: character varying = \"Period\""
```

### Evidence 4: Commented Code
```typescript
// app/api/public/reservations/route.ts:166-200
// TEMPORARILY DISABLED due to database type mismatch issue
// TODO: Fix manual_time_closures table Period enum type
/*
  const manualClosure = await prisma.manual_time_closures.findFirst({
    where: {
      period: period,  // ❌ This fails with type mismatch
    }
  });
*/
```

### Evidence 5: Migration File Analysis
```sql
-- migrations/001_add_manual_time_closures.sql (WRONG)
period VARCHAR(20) NOT NULL

-- Compare to: migrations/20251106_add_service_id/migration.sql
-- (This would have been correct if used)
```

---

## Risk Assessment

### Current System State

| Component | Status | Impact |
|-----------|--------|--------|
| Database Schema | ❌ Incorrect | Type mismatch |
| Prisma Schema | ✅ Correct | Expects enum |
| Prisma Client | ❌ Out of sync | Cannot query table |
| Manual Closures API | 🔴 Broken | All operations fail |
| Reservation Validation | ⚠️ Disabled | No closure enforcement |
| Production Data | ⚠️ At Risk | Invalid data possible |

### Potential Data Issues

1. **Existing Data**: Any manual closures already created may have invalid period values
2. **Data Integrity**: No enum constraint = possible invalid values like "EVENING", "NIGHT", etc.
3. **Referential Integrity**: No foreign key validation on period values

---

## Safe Migration Strategy

### Option 1: ALTER COLUMN with Type Cast (RECOMMENDED)

**Advantages**:
- Preserves existing data
- Single operation
- Reversible
- Minimal downtime

**Steps**:
```sql
BEGIN;

-- Step 1: Verify existing data is valid
SELECT DISTINCT period FROM manual_time_closures;

-- Step 2: Alter column to use enum type
ALTER TABLE manual_time_closures
  ALTER COLUMN period
  TYPE "Period"
  USING period::text::"Period";

-- Step 3: Verify schema
\d manual_time_closures

COMMIT;
```

**Validation**:
```sql
-- Test query
SELECT * FROM manual_time_closures
WHERE period = 'MORNING'::"Period";
```

### Option 2: Recreate Table (ALTERNATIVE)

**Use If**: Option 1 fails due to invalid data

**Steps**:
```sql
BEGIN;

-- Backup data
CREATE TEMP TABLE manual_time_closures_backup AS
  SELECT * FROM manual_time_closures;

-- Drop and recreate
DROP TABLE manual_time_closures;

-- Use Prisma migration to recreate correctly
-- (Run: npx prisma migrate dev --create-only)

-- Restore data
INSERT INTO manual_time_closures
  SELECT * FROM manual_time_closures_backup;

COMMIT;
```

### Option 3: Prisma Migration (CLEANEST)

**Advantages**:
- Official Prisma workflow
- Tracked in migration history
- Automatic type detection
- Rollback capability

**Steps**:
```bash
# 1. Create migration
npx prisma migrate dev --name fix_manual_closures_period_type --create-only

# 2. Edit generated migration to include data preservation
# migrations/YYYYMMDDHHMMSS_fix_manual_closures_period_type/migration.sql

# 3. Apply migration
npx prisma migrate deploy

# 4. Regenerate Prisma Client
npx prisma generate
```

---

## Recommended Fix (Step-by-Step)

### Pre-Migration Checklist
- [ ] Backup database
- [ ] Document current data state
- [ ] Verify Prisma schema is correct
- [ ] Test in development environment first
- [ ] Schedule maintenance window

### Migration Execution

**File**: `prisma/migrations/YYYYMMDD_fix_period_enum_type/migration.sql`

```sql
-- Migration: Fix manual_time_closures.period type mismatch
-- Date: 2025-11-07
-- Issue: Column is VARCHAR but should be Period enum

BEGIN;

-- Validate existing data before migration
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM manual_time_closures
  WHERE period NOT IN ('MORNING', 'AFTERNOON');

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % rows with invalid period values. Fix before migration.', invalid_count;
  END IF;
END $$;

-- Alter column to use Period enum type
ALTER TABLE manual_time_closures
  ALTER COLUMN period
  TYPE "Period"
  USING period::text::"Period";

-- Verify the change
DO $$
DECLARE
  column_type TEXT;
BEGIN
  SELECT udt_name INTO column_type
  FROM information_schema.columns
  WHERE table_name = 'manual_time_closures'
    AND column_name = 'period';

  IF column_type != 'Period' THEN
    RAISE EXCEPTION 'Migration failed: column type is still %', column_type;
  END IF;

  RAISE NOTICE 'Migration successful: period column is now Period enum type';
END $$;

COMMIT;
```

### Post-Migration Verification

```bash
# 1. Verify database schema
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const result = await prisma.\$queryRaw\`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'manual_time_closures'
      AND column_name = 'period'
  \`;
  console.log('Column info:', result);

  // Test query
  const closure = await prisma.manual_time_closures.findFirst({
    where: { period: 'MORNING' }
  });
  console.log('Query test:', closure ? 'SUCCESS' : 'No data');
}

verify().finally(() => prisma.\$disconnect());
"

# 2. Regenerate Prisma Client
npx prisma generate

# 3. Run test suite
npm test -- lib/reservations/time-slot-calculator

# 4. Enable commented code
# Edit: app/api/public/reservations/route.ts (uncomment lines 167-200)
```

---

## Prevention Measures

### 1. Process Improvements
- ✅ Always use `npx prisma migrate dev` for schema changes
- ✅ Never create manual SQL migrations for Prisma-managed tables
- ✅ Require code review for all migration files
- ✅ Run `prisma validate` before applying migrations

### 2. Validation Gates
```json
// package.json - Add pre-migration validation
{
  "scripts": {
    "migrate:validate": "npx prisma validate && npx prisma migrate diff",
    "migrate:dev": "npm run migrate:validate && npx prisma migrate dev",
    "migrate:deploy": "npm run migrate:validate && npx prisma migrate deploy"
  }
}
```

### 3. CI/CD Checks
```yaml
# .github/workflows/validate-schema.yml
- name: Validate Prisma Schema
  run: npx prisma validate

- name: Check Migration Drift
  run: npx prisma migrate diff
```

### 4. Developer Guidelines
```markdown
# MIGRATION_GUIDELINES.md

## Creating Migrations

### ✅ CORRECT
npx prisma migrate dev --name add_feature

### ❌ WRONG
- Manual SQL files
- Direct database edits
- Skipping Prisma migration system

## Type References

When referencing enums in migrations:
- Use quoted type names: "Period", "ServiceType"
- Never use VARCHAR for enum fields
- Check existing enums: \dT in psql
```

---

## Related Issues

### Discovered During Investigation

1. **Missing EVENING Period Value**
   - Code references 'EVENING' in admin API (line 193, 229)
   - Enum only has MORNING, AFTERNOON
   - **Impact**: Runtime errors when EVENING is used

2. **Inconsistent Period Handling**
   - Some code expects 3 periods (MORNING, AFTERNOON, EVENING)
   - Database enum only has 2 values
   - **Recommendation**: Add EVENING to enum or remove from code

3. **No Migration Rollback Plan**
   - Manual migration has no corresponding rollback
   - **File**: `migrations/ROLLBACK_001.sql` exists but may be outdated

---

## Files Requiring Updates Post-Fix

### 1. Enable Commented Validation
**File**: `app/api/public/reservations/route.ts`
```typescript
// Lines 167-200: UNCOMMENT after migration
const manualClosure = await prisma.manual_time_closures.findFirst({
  where: {
    closureDate: preferredDate,
    period: period,  // ✅ Will work after fix
    timeSlotStart: timeSlotStart,
    isActive: true,
    OR: [
      { serviceId: null },
      { serviceId: serviceId }
    ]
  }
});
```

### 2. Remove EVENING References (if not adding to enum)
**File**: `app/api/admin/manual-close/route.ts`
```typescript
// Lines 193, 229: Either add EVENING to enum or change validation
if (!['MORNING', 'AFTERNOON'].includes(period)) {  // Remove 'EVENING'
  return NextResponse.json(
    { error: 'Period must be MORNING or AFTERNOON' },
    { status: 400 }
  );
}
```

### 3. Update Tests
**Files**:
- `__tests__/api/admin/manual-close.test.ts`
- `__tests__/lib/time-slot-calculator.test.ts`

Add validation tests for enum type safety.

---

## Success Criteria

✅ Migration applied successfully
✅ Database column type = `"Period"` enum
✅ Prisma queries execute without errors
✅ Manual closure API fully functional
✅ Reservation validation re-enabled
✅ Frontend displays closed slots correctly
✅ All tests passing
✅ No data loss
✅ Performance maintained

---

## Appendix: Technical Details

### A. Type System Comparison

| Aspect | VARCHAR(20) | "Period" ENUM |
|--------|-------------|---------------|
| Storage | Variable length string | Integer (4 bytes) |
| Validation | None | Database-enforced |
| Performance | Slower comparisons | Faster (integer compare) |
| Type Safety | Runtime only | Compile + Runtime |
| Prisma Support | Manual casting required | Native support |
| Query Generation | String literal | Enum type cast |

### B. PostgreSQL Enum Internals

```sql
-- View enum definition
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'Period'::regtype
ORDER BY enumsortorder;

-- View enum OID
SELECT oid, typname
FROM pg_type
WHERE typname = 'Period';
```

### C. Prisma Type Mapping

```typescript
// Generated by Prisma Client
export enum Period {
  MORNING = "MORNING",
  AFTERNOON = "AFTERNOON"
}

// Database representation
CREATE TYPE "Period" AS ENUM ('MORNING', 'AFTERNOON');
```

---

## Conclusion

The Period enum type mismatch is a critical but easily fixable issue caused by a manual migration that bypassed Prisma's type system. The recommended fix is a simple ALTER COLUMN statement that preserves data while correcting the type mismatch.

**Estimated Fix Time**: 15 minutes
**Complexity**: Low
**Risk Level**: Low (with proper backup)
**Impact**: High (unblocks entire manual closure feature)

**Next Steps**:
1. Review and approve migration strategy
2. Backup production database
3. Execute migration in development
4. Validate fix works correctly
5. Deploy to production during maintenance window
6. Re-enable commented validation code
7. Update documentation and tests

---

**Report Generated**: 2025-11-07
**Analysis Depth**: Comprehensive
**Evidence Level**: High (direct database inspection + code analysis)
**Confidence**: 100% (root cause definitively identified)
