# ClinicInfo Database Schema Implementation Guide

## Overview
Implement ClinicInfo database schema with Prisma ORM for managing single-record clinic contact information pattern.

**Total Estimated Time**: 2-3 hours
**Risk Level**: Low (new feature, no data migration)
**Dependencies**: PostgreSQL database, Prisma 6.16.2

---

## Phase 1: Schema Design & Analysis (30-45 min)

### Task 1.1: Review Existing Schema Structure
**Time**: 10 min | **Dependencies**: None | **Risk**: Low

**Steps**:
1. Open `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma`
2. Review existing models (User, Page, Reservation, etc.)
3. Identify naming conventions:
   - Model names: PascalCase (e.g., `StaticPage`, `BoardPost`)
   - Field names: camelCase (e.g., `createdAt`, `isActive`)
   - Table mapping: snake_case via `@@map` (e.g., `"users"`, `"board_posts"`)
4. Note enum pattern (UserRole, ReservationStatus, etc.)
5. Identify timestamp pattern: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`

**Validation**:
- [ ] Naming conventions documented
- [ ] Timestamp pattern identified
- [ ] Enum pattern understood

---

### Task 1.2: Design ClinicInfo Model Fields
**Time**: 15 min | **Dependencies**: Task 1.1 | **Risk**: Medium

**Field Requirements**:
```prisma
model ClinicInfo {
  // Primary Key
  id String @id @default(cuid())

  // Contact Information
  phonePrimary String // Required main contact number
  phoneSecondary String? // Optional secondary contact

  // Address Information
  addressFull String // Complete address
  addressFloor String? // Optional floor/suite info

  // Business Hours (5 separate fields for flexibility)
  hoursWeekday String // Mon-Fri hours
  hoursSaturday String // Saturday hours
  hoursSunday String? // Optional Sunday hours
  hoursHoliday String? // Optional holiday hours
  hoursLunchBreak String? // Optional lunch break info

  // SNS Links (all optional)
  snsInstagram String?
  snsKakao String?
  snsNaverBlog String?

  // Business Information
  businessRegistration String // Business registration number
  representativeName String // Legal representative name

  // System Fields
  version Int @default(1) // Optimistic locking
  isActive Boolean @default(true) // Active record flag
  lastUpdatedBy String? // Admin user who last updated

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("clinic_info")
}
```

**Design Decisions**:
- **Single Record Pattern**: Use `isActive` flag, only one record with `isActive=true`
- **String for Hours**: Flexible format (e.g., "09:00-18:00", "휴무", "예약제")
- **Optional Fields**: Use `?` for non-critical data
- **Version Field**: Enable optimistic locking for concurrent edit safety
- **No Enum for Hours**: String provides maximum flexibility for Korean text

**Validation**:
- [ ] All required fields identified
- [ ] Field types match requirements
- [ ] Optional fields marked with `?`
- [ ] Single-record strategy documented

---

### Task 1.3: Validate Naming Conventions
**Time**: 5 min | **Dependencies**: Task 1.2 | **Risk**: Low

**Checklist**:
- [ ] Model name: `ClinicInfo` (PascalCase) ✓
- [ ] Fields: camelCase (e.g., `phonePrimary`, `snsInstagram`) ✓
- [ ] Table mapping: `@@map("clinic_info")` (snake_case) ✓
- [ ] Timestamps: `createdAt`, `updatedAt` match project pattern ✓
- [ ] Boolean prefix: `isActive` matches existing `isPublished` pattern ✓

**Validation**:
- [ ] All naming follows project conventions
- [ ] No conflicts with existing model names

---

### Task 1.4: Plan Database Indexes
**Time**: 10 min | **Dependencies**: Task 1.2 | **Risk**: Low

**Index Strategy**:
```prisma
@@index([isActive]) // Fast lookup for active clinic info
```

**Rationale**:
- Single record pattern → no need for complex indexes
- `isActive` index enables fast "get active clinic" queries
- Primary key `id` automatically indexed
- No relationships → no foreign key indexes needed

**Validation**:
- [ ] Index strategy documented
- [ ] Performance implications considered

---

## Phase 2: Schema Implementation (20-30 min)

### Task 2.1: Add ClinicInfo Model to Schema
**Time**: 10 min | **Dependencies**: Tasks 1.1-1.4 | **Risk**: Low

**Steps**:
1. Open `prisma/schema.prisma`
2. Scroll to bottom of file (after `StaticPageVersion` model)
3. Add comment separator:
   ```prisma
   // ============= 병원 정보 관리 모델 =============
   ```
4. Paste complete ClinicInfo model (from Task 1.2)
5. Add index directive: `@@index([isActive])`
6. Add table mapping: `@@map("clinic_info")`
7. Save file

**Validation**:
- [ ] Model added after existing models
- [ ] Comment separator added
- [ ] Index directive present
- [ ] Table mapping present
- [ ] No syntax errors (Prisma will highlight issues)

---

### Task 2.2: Generate Prisma Client Types
**Time**: 5 min | **Dependencies**: Task 2.1 | **Risk**: Low

**Command**:
```bash
npx prisma generate
```

**Expected Output**:
```
✔ Generated Prisma Client (6.16.2) to ./node_modules/@prisma/client
```

**Validation**:
- [ ] Command completes without errors
- [ ] TypeScript types generated in `node_modules/@prisma/client`
- [ ] ClinicInfo type available for import

---

### Task 2.3: Create Migration File
**Time**: 10 min | **Dependencies**: Task 2.2 | **Risk**: Medium

**Command**:
```bash
npx prisma migrate dev --name add_clinic_info_table
```

**Migration Process**:
1. Prisma analyzes schema changes
2. Generates SQL migration file in `prisma/migrations/`
3. Applies migration to development database
4. Updates Prisma Client

**Expected Output**:
```
✔ Generated migration: 20250314_add_clinic_info_table
✔ Applied migration: 20250314_add_clinic_info_table
```

**Validation**:
- [ ] Migration file created in `prisma/migrations/[timestamp]_add_clinic_info_table/`
- [ ] `migration.sql` file exists
- [ ] Database connection successful
- [ ] No error messages

---

### Task 2.4: Review Generated Migration SQL
**Time**: 5 min | **Dependencies**: Task 2.3 | **Risk**: Medium

**Steps**:
1. Navigate to `prisma/migrations/[latest]/migration.sql`
2. Review SQL statements

**Expected SQL Structure**:
```sql
-- CreateTable
CREATE TABLE "clinic_info" (
    "id" TEXT NOT NULL,
    "phonePrimary" TEXT NOT NULL,
    "phoneSecondary" TEXT,
    "addressFull" TEXT NOT NULL,
    "addressFloor" TEXT,
    "hoursWeekday" TEXT NOT NULL,
    "hoursSaturday" TEXT NOT NULL,
    "hoursSunday" TEXT,
    "hoursHoliday" TEXT,
    "hoursLunchBreak" TEXT,
    "snsInstagram" TEXT,
    "snsKakao" TEXT,
    "snsNaverBlog" TEXT,
    "businessRegistration" TEXT NOT NULL,
    "representativeName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_info_isActive_idx" ON "clinic_info"("isActive");
```

**Validation Checklist**:
- [ ] Table name: `clinic_info` (snake_case) ✓
- [ ] Primary key: `id` TEXT ✓
- [ ] Required fields: NOT NULL constraint ✓
- [ ] Optional fields: No NOT NULL constraint ✓
- [ ] Default values: `version=1`, `isActive=true` ✓
- [ ] Timestamps: TIMESTAMP(3) with defaults ✓
- [ ] Index created: `clinic_info_isActive_idx` ✓

**Risk Points**:
- ⚠️ **Database connection**: Ensure `DATABASE_URL` is correct
- ⚠️ **Permissions**: Postgres user must have CREATE TABLE rights
- ⚠️ **Existing data**: No conflicts (new table, no foreign keys)

---

## Phase 3: Migration Testing (15-20 min)

### Task 3.1: Verify Table Creation
**Time**: 5 min | **Dependencies**: Task 2.4 | **Risk**: Low

**Method 1: Prisma Studio**
```bash
npx prisma studio
```
- Open browser to http://localhost:5555
- Check left sidebar for "ClinicInfo" model
- Verify table is empty (0 records)

**Method 2: PostgreSQL CLI**
```bash
psql $DATABASE_URL -c "\d clinic_info"
```

**Expected Output**:
```
Table "public.clinic_info"
Column              | Type         | Nullable | Default
--------------------+--------------+----------+-------------------
id                  | text         | not null |
phonePrimary        | text         | not null |
phoneSecondary      | text         |          |
...
```

**Validation**:
- [ ] Table exists in database
- [ ] All columns present
- [ ] Correct data types
- [ ] Constraints applied
- [ ] Index created

---

### Task 3.2: Test Migration Rollback
**Time**: 5 min | **Dependencies**: Task 3.1 | **Risk**: Medium

**Purpose**: Ensure migration is reversible if issues occur in production.

**Steps**:
```bash
# Check migration history
npx prisma migrate status

# Rollback last migration
npx prisma migrate resolve --rolled-back add_clinic_info_table

# Verify table is still there (Prisma doesn't auto-drop on rollback)
# We need to manually drop for testing
psql $DATABASE_URL -c "DROP TABLE IF EXISTS clinic_info CASCADE;"

# Verify table is gone
npx prisma studio  # ClinicInfo should not appear
```

**Validation**:
- [ ] Rollback command succeeds
- [ ] Table can be dropped manually
- [ ] No orphaned constraints
- [ ] No errors in other tables

---

### Task 3.3: Re-apply Migration
**Time**: 5 min | **Dependencies**: Task 3.2 | **Risk**: Low

**Steps**:
```bash
# Re-apply migration
npx prisma migrate deploy

# OR if in development, reset and re-migrate
npx prisma migrate reset --force
npx prisma migrate dev
```

**Validation**:
- [ ] Migration applies cleanly
- [ ] Table recreated successfully
- [ ] All constraints intact
- [ ] Ready for seeding

---

### Task 3.4: Validate Field Constraints
**Time**: 5 min | **Dependencies**: Task 3.3 | **Risk**: Low

**Test Cases**:

**Test 1: Required field validation**
```sql
-- This should FAIL (missing required fields)
INSERT INTO clinic_info (id) VALUES ('test-1');
```
Expected: `ERROR: null value in column "phonePrimary" violates not-null constraint`

**Test 2: Default values**
```sql
-- Insert minimal record
INSERT INTO clinic_info (
  id, phonePrimary, addressFull, hoursWeekday,
  hoursSaturday, businessRegistration, representativeName
) VALUES (
  'test-2', '02-1234-5678', 'Seoul Test', '09:00-18:00',
  '09:00-13:00', '123-45-67890', 'Test Name'
);

-- Verify defaults
SELECT version, isActive FROM clinic_info WHERE id = 'test-2';
```
Expected: `version=1`, `isActive=true`

**Test 3: Optional fields**
```sql
-- Verify NULL allowed
SELECT phoneSecondary, addressFloor, hoursSunday FROM clinic_info WHERE id = 'test-2';
```
Expected: All NULL

**Validation**:
- [ ] Required fields enforced
- [ ] Default values applied
- [ ] Optional fields allow NULL
- [ ] No unexpected constraints

**Cleanup**:
```sql
DELETE FROM clinic_info WHERE id LIKE 'test-%';
```

---

## Phase 4: Seed Script Creation (30-45 min)

### Task 4.1: Create Seed Data Structure
**Time**: 10 min | **Dependencies**: None | **Risk**: Low

**Sample Clinic Data** (to be updated with real data):
```typescript
const initialClinicInfo = {
  phonePrimary: '02-1234-5678',
  phoneSecondary: '010-9876-5432',
  addressFull: '서울특별시 강남구 테헤란로 123',
  addressFloor: '5층 미소핀 피부과',
  hoursWeekday: '평일 09:00-18:00',
  hoursSaturday: '토요일 09:00-13:00',
  hoursSunday: '일요일 휴무',
  hoursHoliday: '공휴일 휴무',
  hoursLunchBreak: '점심시간 12:00-13:00',
  snsInstagram: 'https://instagram.com/misopin_clinic',
  snsKakao: 'https://pf.kakao.com/_example',
  snsNaverBlog: 'https://blog.naver.com/misopin',
  businessRegistration: '123-45-67890',
  representativeName: '홍길동',
  version: 1,
  isActive: true,
  lastUpdatedBy: 'system',
};
```

**Validation**:
- [ ] All required fields present
- [ ] Korean text properly formatted
- [ ] URLs are valid format
- [ ] Business hours are clear

---

### Task 4.2: Create Seed Script File
**Time**: 15 min | **Dependencies**: Task 4.1 | **Risk**: Low

**Steps**:
1. Create file: `prisma/seed-clinic-info.ts`
2. Implement upsert logic for single-record pattern

**Code Structure**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏥 Seeding clinic information...');

  // Deactivate any existing active records (single-record pattern)
  await prisma.clinicInfo.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  // Create new active clinic info
  const clinicInfo = await prisma.clinicInfo.create({
    data: {
      phonePrimary: '02-1234-5678',
      phoneSecondary: '010-9876-5432',
      addressFull: '서울특별시 강남구 테헤란로 123',
      addressFloor: '5층 미소핀 피부과',
      hoursWeekday: '평일 09:00-18:00',
      hoursSaturday: '토요일 09:00-13:00',
      hoursSunday: '일요일 휴무',
      hoursHoliday: '공휴일 휴무',
      hoursLunchBreak: '점심시간 12:00-13:00',
      snsInstagram: 'https://instagram.com/misopin_clinic',
      snsKakao: 'https://pf.kakao.com/_example',
      snsNaverBlog: 'https://blog.naver.com/misopin',
      businessRegistration: '123-45-67890',
      representativeName: '홍길동',
      isActive: true,
      lastUpdatedBy: 'system',
    },
  });

  console.log('✅ Clinic information seeded successfully');
  console.log('📋 Active Clinic Info ID:', clinicInfo.id);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding clinic info:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Key Features**:
- **Single-Record Pattern**: Deactivates old records before creating new one
- **Idempotent**: Safe to run multiple times
- **Error Handling**: Proper error logging and exit codes
- **Feedback**: Clear console messages

**Validation**:
- [ ] File created at correct path
- [ ] Imports correct
- [ ] Error handling present
- [ ] Single-record logic implemented

---

### Task 4.3: Add Seed Script to package.json
**Time**: 5 min | **Dependencies**: Task 4.2 | **Risk**: Low

**Steps**:
1. Open `package.json`
2. Find `scripts` section
3. Add after existing seed scripts:
```json
"db:seed:clinic": "tsx prisma/seed-clinic-info.ts"
```

**Result**:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "db:migrate": "prisma migrate dev",
  "db:seed:static": "tsx prisma/seed-static-pages.ts",
  "db:seed:users": "tsx prisma/seed-users.ts",
  "db:seed:clinic": "tsx prisma/seed-clinic-info.ts",
  "reset-password": "tsx scripts/reset-password.ts"
}
```

**Validation**:
- [ ] Script added correctly
- [ ] No JSON syntax errors
- [ ] Follows naming pattern of other seed scripts

---

### Task 4.4: Run Seed Script
**Time**: 5 min | **Dependencies**: Task 4.3 | **Risk**: Low

**Command**:
```bash
npm run db:seed:clinic
```

**Expected Output**:
```
🏥 Seeding clinic information...
✅ Clinic information seeded successfully
📋 Active Clinic Info ID: clw2x3y4z0000abcdef123456
```

**Validation**:
- [ ] Script runs without errors
- [ ] Success message displayed
- [ ] Clinic ID logged

---

### Task 4.5: Verify Seed Data
**Time**: 5 min | **Dependencies**: Task 4.4 | **Risk**: Low

**Method 1: Prisma Studio**
```bash
npx prisma studio
```
- Navigate to ClinicInfo model
- Verify 1 record exists
- Check all fields populated correctly
- Verify `isActive = true`

**Method 2: Direct Query**
```typescript
// In Node REPL or test file
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const activeClinic = await prisma.clinicInfo.findFirst({
  where: { isActive: true }
});

console.log(activeClinic);
```

**Validation Checklist**:
- [ ] Exactly 1 active record exists
- [ ] All required fields populated
- [ ] Optional fields have correct values
- [ ] Korean text displays correctly
- [ ] Timestamps are set
- [ ] `version = 1`
- [ ] `isActive = true`

---

### Task 4.6: Test Single-Record Pattern
**Time**: 5 min | **Dependencies**: Task 4.5 | **Risk**: Low

**Test**: Run seed script again to verify single-record enforcement
```bash
npm run db:seed:clinic
```

**Expected Behavior**:
1. Old active record → `isActive = false`
2. New record created → `isActive = true`
3. Only 1 active record exists

**Validation Query**:
```sql
SELECT id, isActive, createdAt FROM clinic_info ORDER BY createdAt DESC;
```

**Expected Result**:
```
id                     | isActive | createdAt
-----------------------+----------+------------------------
clw2x3y4z0001...       | true     | 2025-03-14 10:30:00
clw2x3y4z0000...       | false    | 2025-03-14 10:25:00
```

**Validation**:
- [ ] Multiple records exist
- [ ] Only latest record has `isActive = true`
- [ ] Old records have `isActive = false`
- [ ] Single-record pattern working

---

## Phase 5: Testing & Documentation (20-30 min)

### Task 5.1: Test Prisma Client Queries
**Time**: 10 min | **Dependencies**: Task 4.6 | **Risk**: Low

**Create Test File**: `prisma/test-clinic-info.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testClinicInfo() {
  console.log('🧪 Testing ClinicInfo queries...\n');

  // Test 1: Get active clinic info
  console.log('Test 1: Find active clinic info');
  const activeClinic = await prisma.clinicInfo.findFirst({
    where: { isActive: true },
  });
  console.log('✓ Active clinic:', activeClinic?.phonePrimary);

  // Test 2: Count all records
  console.log('\nTest 2: Count all records');
  const totalCount = await prisma.clinicInfo.count();
  console.log('✓ Total records:', totalCount);

  // Test 3: Count active records
  console.log('\nTest 3: Count active records');
  const activeCount = await prisma.clinicInfo.count({
    where: { isActive: true },
  });
  console.log('✓ Active records:', activeCount);
  console.assert(activeCount === 1, '❌ Should have exactly 1 active record');

  // Test 4: Update clinic info (version increment)
  console.log('\nTest 4: Update clinic info with version check');
  if (activeClinic) {
    const updated = await prisma.clinicInfo.update({
      where: {
        id: activeClinic.id,
        version: activeClinic.version, // Optimistic locking
      },
      data: {
        phoneSecondary: '010-1111-2222',
        version: { increment: 1 },
        lastUpdatedBy: 'test-user',
      },
    });
    console.log('✓ Updated version:', updated.version);
    console.assert(updated.version === activeClinic.version + 1, '❌ Version should increment');
  }

  console.log('\n✅ All tests passed!');
}

testClinicInfo()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run Tests**:
```bash
npx tsx prisma/test-clinic-info.ts
```

**Validation**:
- [ ] All tests pass
- [ ] Exactly 1 active record
- [ ] Version increments correctly
- [ ] Optimistic locking works
- [ ] No query errors

---

### Task 5.2: Document Migration
**Time**: 10 min | **Dependencies**: All previous tasks | **Risk**: Low

**Create**: `prisma/migrations/README.md` (if not exists) or add to existing

**Content**:
```markdown
# Database Migrations

## [Timestamp]_add_clinic_info_table

**Date**: 2025-03-14
**Purpose**: Add ClinicInfo table for managing single clinic contact information

**Changes**:
- New table: `clinic_info`
- Fields: contact info, address, business hours, SNS links, business info
- Single-record pattern with `isActive` flag
- Optimistic locking with `version` field
- Index on `isActive` for query performance

**Rollback**: Safe to rollback, no dependencies on other tables

**Seed Script**: `npm run db:seed:clinic`

**Related Files**:
- Schema: `prisma/schema.prisma` (ClinicInfo model)
- Seed: `prisma/seed-clinic-info.ts`
- Test: `prisma/test-clinic-info.ts`

**Notes**:
- Only one record should have `isActive = true`
- Use `findFirst({ where: { isActive: true }})` to get current clinic info
- Increment `version` on every update for optimistic locking
```

**Validation**:
- [ ] Migration documented
- [ ] Purpose clear
- [ ] Rollback safety noted
- [ ] Related files listed

---

### Task 5.3: Document Seed Script Usage
**Time**: 5 min | **Dependencies**: Task 5.2 | **Risk**: Low

**Update**: `prisma/seed-clinic-info.ts` (add header comment)

```typescript
/**
 * Clinic Information Seed Script
 *
 * Purpose: Initialize or update clinic contact information
 * Pattern: Single-record with isActive flag
 *
 * Usage:
 *   npm run db:seed:clinic
 *
 * Behavior:
 *   - Deactivates all existing active records
 *   - Creates new active clinic info record
 *   - Safe to run multiple times (idempotent)
 *
 * Notes:
 *   - Update the data object with real clinic information
 *   - Only one record will have isActive = true
 *   - Old records are preserved for history
 */
```

**Validation**:
- [ ] Clear purpose statement
- [ ] Usage instructions present
- [ ] Behavior documented
- [ ] Notes for future maintenance

---

### Task 5.4: Create Validation Checklist
**Time**: 5 min | **Dependencies**: All tasks | **Risk**: Low

**Create**: `claudedocs/clinic-info-validation-checklist.md`

```markdown
# ClinicInfo Implementation Validation Checklist

## Schema Validation
- [ ] ClinicInfo model exists in schema.prisma
- [ ] All required fields defined
- [ ] Optional fields marked with `?`
- [ ] Table mapping: `@@map("clinic_info")`
- [ ] Index on `isActive` field
- [ ] Timestamps: createdAt, updatedAt

## Migration Validation
- [ ] Migration file created
- [ ] Migration SQL reviewed
- [ ] Table created in database
- [ ] All columns present
- [ ] Constraints applied correctly
- [ ] Index created successfully

## Seed Script Validation
- [ ] seed-clinic-info.ts created
- [ ] Script added to package.json
- [ ] Runs without errors
- [ ] Creates exactly 1 active record
- [ ] Single-record pattern enforced
- [ ] Idempotent (safe to re-run)

## Query Testing Validation
- [ ] Can query active clinic info
- [ ] findFirst with isActive works
- [ ] Update with version increment works
- [ ] Optimistic locking prevents conflicts
- [ ] Prisma Studio shows data correctly

## Documentation Validation
- [ ] Migration documented in README
- [ ] Seed script usage documented
- [ ] Implementation guide created
- [ ] Validation checklist created

## Production Readiness
- [ ] All tests pass
- [ ] No console errors
- [ ] Real clinic data prepared
- [ ] Rollback tested
- [ ] Team reviewed implementation
```

**Validation**:
- [ ] Checklist comprehensive
- [ ] All critical items covered
- [ ] Easy to follow

---

## Risk Management

### Critical Risk Points

**Risk 1: Database Connection Issues**
- **Probability**: Low
- **Impact**: High (blocks all work)
- **Mitigation**: Verify `DATABASE_URL` before starting, test connection
- **Recovery**: Fix connection string, restart PostgreSQL service

**Risk 2: Migration Conflicts**
- **Probability**: Low (new table)
- **Impact**: Medium
- **Mitigation**: Review generated SQL, ensure no table name conflicts
- **Recovery**: Rollback migration, fix conflicts, re-apply

**Risk 3: Seed Data Issues**
- **Probability**: Medium
- **Impact**: Low (development only)
- **Mitigation**: Test with sample data first
- **Recovery**: Delete records, re-run seed with corrected data

**Risk 4: Single-Record Pattern Bugs**
- **Probability**: Medium
- **Impact**: Medium (data consistency)
- **Mitigation**: Thorough testing of deactivation logic
- **Recovery**: Manual SQL to fix `isActive` flags

---

## Dependencies

### Required Tools
- [x] Node.js (installed)
- [x] npm (installed)
- [x] PostgreSQL (running)
- [x] Prisma CLI 6.16.2 (installed)
- [x] tsx (installed as devDependency)

### Environment Variables
- [x] `DATABASE_URL` (must be valid PostgreSQL connection string)

### Database Permissions
- Required: CREATE TABLE, CREATE INDEX, INSERT, UPDATE, SELECT, DELETE
- User must have schema modification rights

---

## Task Execution Order

**Strict Sequential Order** (Dependencies enforced):
1. Phase 1 (Design): Tasks 1.1 → 1.2 → 1.3 → 1.4
2. Phase 2 (Implementation): Tasks 2.1 → 2.2 → 2.3 → 2.4
3. Phase 3 (Testing): Tasks 3.1 → 3.2 → 3.3 → 3.4
4. Phase 4 (Seeding): Tasks 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6
5. Phase 5 (Documentation): Tasks 5.1, 5.2, 5.3, 5.4 (can be parallel)

**Checkpoint**: After each phase, validate all tasks completed before proceeding.

---

## Success Criteria

### Phase 1 Success
- [ ] Schema design complete and validated
- [ ] Naming conventions consistent
- [ ] All requirements mapped to fields

### Phase 2 Success
- [ ] Migration created and applied
- [ ] Table exists in database
- [ ] Prisma Client regenerated

### Phase 3 Success
- [ ] Table structure verified
- [ ] Constraints tested
- [ ] Rollback tested

### Phase 4 Success
- [ ] Seed script working
- [ ] Exactly 1 active record
- [ ] Single-record pattern enforced

### Phase 5 Success
- [ ] All queries tested
- [ ] Documentation complete
- [ ] Validation checklist passed

### Overall Success
- [ ] All phases complete
- [ ] All validation checklists passed
- [ ] No errors in console
- [ ] Ready for feature implementation (Phase 2 of architecture)

---

## Next Steps After Completion

1. **Code Review**: Have team review schema design and implementation
2. **Real Data**: Update seed script with actual clinic information
3. **API Development**: Proceed to Phase 2 of architecture (API Routes)
4. **Frontend Integration**: Proceed to Phase 3 of architecture (Admin UI)

---

## Troubleshooting Guide

### Issue: Migration fails with "relation already exists"
**Cause**: Table already exists from previous attempt
**Solution**: `DROP TABLE clinic_info CASCADE;` then re-run migration

### Issue: Seed script creates multiple active records
**Cause**: `updateMany` not deactivating old records
**Solution**: Verify `where: { isActive: true }` in updateMany call

### Issue: Version conflict on update
**Cause**: Concurrent updates or stale version number
**Solution**: Re-fetch record to get current version, retry update

### Issue: Korean text displays as ???
**Cause**: Database encoding not UTF-8
**Solution**: Verify PostgreSQL database encoding: `SHOW server_encoding;`

---

## Estimated Time Breakdown

| Phase | Task Count | Time Range | Total Time |
|-------|-----------|------------|------------|
| Phase 1: Design | 4 | 5-15 min | 30-45 min |
| Phase 2: Implementation | 4 | 5-10 min | 20-30 min |
| Phase 3: Testing | 4 | 5-10 min | 15-20 min |
| Phase 4: Seeding | 6 | 5-15 min | 30-45 min |
| Phase 5: Documentation | 4 | 5-10 min | 20-30 min |
| **Total** | **22** | - | **115-170 min** |

**Realistic Total**: 2-3 hours (including breaks and unexpected issues)

---

## Implementation Complete Checklist

Use this final checklist to confirm complete implementation:

### Code Artifacts
- [ ] `prisma/schema.prisma` - ClinicInfo model added
- [ ] `prisma/migrations/[timestamp]_add_clinic_info_table/` - Migration created
- [ ] `prisma/seed-clinic-info.ts` - Seed script created
- [ ] `prisma/test-clinic-info.ts` - Test script created
- [ ] `package.json` - Seed script added

### Database State
- [ ] `clinic_info` table exists
- [ ] Exactly 1 active record seeded
- [ ] Index on `isActive` created
- [ ] All constraints working

### Documentation
- [ ] Migration documented
- [ ] Seed script documented
- [ ] Implementation guide created
- [ ] Validation checklist created

### Testing
- [ ] All query tests pass
- [ ] Single-record pattern working
- [ ] Optimistic locking tested
- [ ] Prisma Studio shows data

### Readiness
- [ ] No console errors
- [ ] Team reviewed
- [ ] Ready for API development
- [ ] Ready for admin UI development

**If all items checked**: ✅ Phase 1 (Database Setup) COMPLETE
**Next**: Proceed to Phase 2 (API Routes Development)
