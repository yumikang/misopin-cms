# ClinicInfo Implementation - Execution Script

**Purpose**: Step-by-step execution guide with copy-paste commands and validation checkpoints.

**Prerequisites**:
- [ ] PostgreSQL is running
- [ ] Terminal open in project root: `/Users/blee/Desktop/cms/misopin-cms`
- [ ] Environment variable `DATABASE_URL` is set

---

## Phase 1: Schema Design (30-45 min)

### Step 1.1: Review Current Schema (10 min)
```bash
# Open schema in your editor
code prisma/schema.prisma

# Look for these patterns:
# - Model naming: PascalCase
# - Field naming: camelCase
# - Table mapping: @@map("snake_case")
# - Timestamps: createdAt, updatedAt
```

**✓ Checkpoint**: Naming patterns documented

---

### Step 1.2: Design the Model (15 min)

**Open editor** and prepare this schema (don't add yet):

```prisma
// ============= 병원 정보 관리 모델 =============

model ClinicInfo {
  id                   String   @id @default(cuid())

  // Contact Information
  phonePrimary         String
  phoneSecondary       String?

  // Address Information
  addressFull          String
  addressFloor         String?

  // Business Hours
  hoursWeekday         String
  hoursSaturday        String
  hoursSunday          String?
  hoursHoliday         String?
  hoursLunchBreak      String?

  // SNS Links
  snsInstagram         String?
  snsKakao             String?
  snsNaverBlog         String?

  // Business Information
  businessRegistration String
  representativeName   String

  // System Fields
  version              Int      @default(1)
  isActive             Boolean  @default(true)
  lastUpdatedBy        String?

  // Timestamps
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([isActive])
  @@map("clinic_info")
}
```

**✓ Checkpoint**: Schema reviewed and ready to add

---

## Phase 2: Schema Implementation (20-30 min)

### Step 2.1: Add Model to Schema (10 min)
```bash
# Open schema file
code prisma/schema.prisma

# Scroll to the bottom (after StaticPageVersion model)
# Paste the ClinicInfo model from Step 1.2
# Save the file
```

**✓ Checkpoint**: Model added, no syntax errors (Prisma extension will highlight issues)

---

### Step 2.2: Generate Prisma Client (5 min)
```bash
npx prisma generate
```

**Expected output**:
```
✔ Generated Prisma Client (6.16.2) to ./node_modules/@prisma/client
```

**✓ Checkpoint**: Command succeeds, no errors

---

### Step 2.3: Create Migration (10 min)
```bash
npx prisma migrate dev --name add_clinic_info_table
```

**Expected output**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database

Applying migration `20250314_add_clinic_info_table`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20250314_add_clinic_info_table/
    └─ migration.sql

✔ Generated Prisma Client (6.16.2) to ./node_modules/@prisma/client
```

**✓ Checkpoint**: Migration created and applied successfully

---

### Step 2.4: Review Migration SQL (5 min)
```bash
# Find the latest migration folder
ls -lt prisma/migrations/ | head -5

# Open the migration.sql file (replace [timestamp] with your actual timestamp)
code prisma/migrations/[timestamp]_add_clinic_info_table/migration.sql
```

**Verify**:
- [ ] Table name: `clinic_info`
- [ ] Primary key: `id TEXT`
- [ ] Required fields: `NOT NULL`
- [ ] Optional fields: No `NOT NULL`
- [ ] Defaults: `version=1`, `isActive=true`
- [ ] Index: `clinic_info_isActive_idx`

**✓ Checkpoint**: SQL looks correct

---

## Phase 3: Migration Testing (15-20 min)

### Step 3.1: Verify Table in Prisma Studio (5 min)
```bash
npx prisma studio
```

**Browser opens** to http://localhost:5555

**Verify**:
- [ ] "ClinicInfo" appears in left sidebar
- [ ] Click on it → table is empty (0 records)
- [ ] All columns are visible

**✓ Checkpoint**: Table exists in database

---

### Step 3.2: Test Constraints (5 min)

**Open PostgreSQL CLI** (or use Prisma Studio):
```bash
# Get your DATABASE_URL first
echo $DATABASE_URL

# Connect to database
psql $DATABASE_URL
```

**Run test queries**:
```sql
-- Test 1: Required field violation (should FAIL)
INSERT INTO clinic_info (id) VALUES ('test-1');
-- Expected: ERROR: null value in column violates not-null constraint

-- Test 2: Minimal valid insert (should SUCCEED)
INSERT INTO clinic_info (
  id, phonePrimary, addressFull, hoursWeekday,
  hoursSaturday, businessRegistration, representativeName
) VALUES (
  'test-2', '02-1234-5678', 'Seoul Test', '09:00-18:00',
  '09:00-13:00', '123-45-67890', 'Test Name'
);
-- Expected: INSERT 0 1

-- Test 3: Verify defaults
SELECT id, version, isActive FROM clinic_info WHERE id = 'test-2';
-- Expected: version=1, isActive=t

-- Cleanup
DELETE FROM clinic_info WHERE id LIKE 'test-%';

-- Exit psql
\q
```

**✓ Checkpoint**: Constraints work as expected

---

## Phase 4: Seed Script (30-45 min)

### Step 4.1: Create Seed Script (15 min)
```bash
# Create the seed file
code prisma/seed-clinic-info.ts
```

**Paste this code**:
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
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏥 Seeding clinic information...');

  // Deactivate any existing active records (single-record pattern)
  const deactivated = await prisma.clinicInfo.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  if (deactivated.count > 0) {
    console.log(`📋 Deactivated ${deactivated.count} old record(s)`);
  }

  // Create new active clinic info
  const clinicInfo = await prisma.clinicInfo.create({
    data: {
      // Contact Information (UPDATE WITH REAL DATA)
      phonePrimary: '02-1234-5678',
      phoneSecondary: '010-9876-5432',

      // Address Information (UPDATE WITH REAL DATA)
      addressFull: '서울특별시 강남구 테헤란로 123',
      addressFloor: '5층 미소핀 피부과',

      // Business Hours (UPDATE WITH REAL DATA)
      hoursWeekday: '평일 09:00-18:00',
      hoursSaturday: '토요일 09:00-13:00',
      hoursSunday: '일요일 휴무',
      hoursHoliday: '공휴일 휴무',
      hoursLunchBreak: '점심시간 12:00-13:00',

      // SNS Links (UPDATE WITH REAL DATA)
      snsInstagram: 'https://instagram.com/misopin_clinic',
      snsKakao: 'https://pf.kakao.com/_example',
      snsNaverBlog: 'https://blog.naver.com/misopin',

      // Business Information (UPDATE WITH REAL DATA)
      businessRegistration: '123-45-67890',
      representativeName: '홍길동',

      // System Fields
      isActive: true,
      lastUpdatedBy: 'system',
    },
  });

  console.log('✅ Clinic information seeded successfully');
  console.log('📋 Active Clinic Info ID:', clinicInfo.id);
  console.log('📞 Primary Phone:', clinicInfo.phonePrimary);
  console.log('📍 Address:', clinicInfo.addressFull);
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

**Save the file**

**✓ Checkpoint**: File created with seed logic

---

### Step 4.2: Add Script to package.json (5 min)
```bash
# Open package.json
code package.json

# Find the "scripts" section
# Add this line after the existing seed scripts:
#   "db:seed:clinic": "tsx prisma/seed-clinic-info.ts",

# Save the file
```

**Verify JSON is valid** (no missing commas)

**✓ Checkpoint**: Script added to package.json

---

### Step 4.3: Run Seed Script (5 min)
```bash
npm run db:seed:clinic
```

**Expected output**:
```
🏥 Seeding clinic information...
✅ Clinic information seeded successfully
📋 Active Clinic Info ID: clw2x3y4z0000abcdef123456
📞 Primary Phone: 02-1234-5678
📍 Address: 서울특별시 강남구 테헤란로 123
```

**✓ Checkpoint**: Seed runs successfully

---

### Step 4.4: Verify Seed Data (5 min)
```bash
# Open Prisma Studio
npx prisma studio
```

**In browser**:
1. Click "ClinicInfo" in left sidebar
2. Verify: Exactly 1 record exists
3. Check: `isActive` is `true`
4. Check: All fields are populated
5. Check: Korean text displays correctly

**✓ Checkpoint**: Data is correct in database

---

### Step 4.5: Test Single-Record Pattern (5 min)
```bash
# Run seed script AGAIN
npm run db:seed:clinic
```

**Expected output**:
```
🏥 Seeding clinic information...
📋 Deactivated 1 old record(s)
✅ Clinic information seeded successfully
📋 Active Clinic Info ID: clw2x3y4z0001def987654321
...
```

**Verify in Prisma Studio**:
- [ ] Now 2 records exist
- [ ] Only latest record has `isActive = true`
- [ ] Old record has `isActive = false`

**✓ Checkpoint**: Single-record pattern works

---

## Phase 5: Testing & Documentation (20-30 min)

### Step 5.1: Create Test Script (10 min)
```bash
# Create test file
code prisma/test-clinic-info.ts
```

**Paste this code**:
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
  console.assert(activeClinic !== null, '❌ Should have active clinic');

  // Test 2: Count all records
  console.log('\nTest 2: Count all records');
  const totalCount = await prisma.clinicInfo.count();
  console.log('✓ Total records:', totalCount);
  console.assert(totalCount >= 1, '❌ Should have at least 1 record');

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
    console.assert(
      updated.version === activeClinic.version + 1,
      '❌ Version should increment'
    );
  }

  // Test 5: Verify required fields
  console.log('\nTest 5: Verify required fields');
  if (activeClinic) {
    console.assert(activeClinic.phonePrimary, '❌ phonePrimary required');
    console.assert(activeClinic.addressFull, '❌ addressFull required');
    console.assert(activeClinic.hoursWeekday, '❌ hoursWeekday required');
    console.assert(activeClinic.hoursSaturday, '❌ hoursSaturday required');
    console.assert(
      activeClinic.businessRegistration,
      '❌ businessRegistration required'
    );
    console.assert(
      activeClinic.representativeName,
      '❌ representativeName required'
    );
    console.log('✓ All required fields present');
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

**Save and run**:
```bash
npx tsx prisma/test-clinic-info.ts
```

**Expected output**:
```
🧪 Testing ClinicInfo queries...

Test 1: Find active clinic info
✓ Active clinic: 02-1234-5678

Test 2: Count all records
✓ Total records: 2

Test 3: Count active records
✓ Active records: 1

Test 4: Update clinic info with version check
✓ Updated version: 2

Test 5: Verify required fields
✓ All required fields present

✅ All tests passed!
```

**✓ Checkpoint**: All tests pass

---

### Step 5.2: Final Validation (10 min)

**Run through this checklist**:

#### Schema Validation
- [ ] ClinicInfo model exists in `prisma/schema.prisma`
- [ ] All required fields defined
- [ ] Optional fields marked with `?`
- [ ] Table mapping: `@@map("clinic_info")`
- [ ] Index on `isActive` field

#### Migration Validation
- [ ] Migration file exists in `prisma/migrations/`
- [ ] Table `clinic_info` exists in database
- [ ] All columns present with correct types
- [ ] Constraints working (tested in Phase 3.2)
- [ ] Index created successfully

#### Seed Script Validation
- [ ] `prisma/seed-clinic-info.ts` exists
- [ ] Script in `package.json`: `db:seed:clinic`
- [ ] Runs without errors
- [ ] Creates exactly 1 active record
- [ ] Single-record pattern enforced (re-run test)

#### Query Testing Validation
- [ ] Can query active clinic info
- [ ] `findFirst` with `isActive` works
- [ ] Update with version increment works
- [ ] All test scripts pass

#### Documentation
- [ ] Implementation guide created: `claudedocs/clinic-info-implementation-guide.md`
- [ ] Quick reference created: `claudedocs/clinic-info-quick-reference.md`
- [ ] This execution script: `claudedocs/clinic-info-execution-script.md`

**✓ Checkpoint**: All validations pass

---

## Phase Complete! 🎉

### What You've Built
- ✅ Database schema for clinic information
- ✅ Single-record pattern implementation
- ✅ Optimistic locking for safe updates
- ✅ Seed script for initial data
- ✅ Comprehensive tests
- ✅ Complete documentation

### Files Created/Modified
```
prisma/
├─ schema.prisma (modified - added ClinicInfo model)
├─ migrations/
│  └─ [timestamp]_add_clinic_info_table/
│     └─ migration.sql (created)
├─ seed-clinic-info.ts (created)
└─ test-clinic-info.ts (created)

package.json (modified - added db:seed:clinic script)

claudedocs/
├─ clinic-info-implementation-guide.md (created)
├─ clinic-info-quick-reference.md (created)
└─ clinic-info-execution-script.md (created)
```

### Time Taken
**Record your actual time**: _______ hours

**Compare to estimate**: 2-3 hours

---

## Next Steps

### Immediate Actions
1. **Update seed data** with real clinic information
2. **Commit changes** to version control
3. **Team review** of schema design

### Architecture Phases
- ✅ **Phase 1: Database Setup** - COMPLETE
- ⏭️ **Phase 2: API Routes** - Create `/api/admin/clinic-info` endpoints
- ⏭️ **Phase 3: Admin UI** - Build clinic info edit form
- ⏭️ **Phase 4: Frontend** - Display clinic info on website

### Quick Commands for Next Phase
```bash
# When ready for API development
mkdir -p src/app/api/admin/clinic-info
code src/app/api/admin/clinic-info/route.ts

# When ready for admin UI
mkdir -p src/app/(admin)/admin/clinic-info
code src/app/(admin)/admin/clinic-info/page.tsx
```

---

## Troubleshooting

### If seed script fails
```bash
# Check Prisma Client is up to date
npx prisma generate

# Check database connection
npx prisma studio

# Check for TypeScript errors
npx tsx --version
```

### If tests fail
```bash
# Re-run seed to reset data
npm run db:seed:clinic

# Run tests again
npx tsx prisma/test-clinic-info.ts
```

### If migration fails
```bash
# Check Prisma schema syntax
npx prisma format

# Check database connection
psql $DATABASE_URL -c "SELECT version();"

# Reset database (WARNING: deletes all data)
npx prisma migrate reset --force
```

---

## Success! 🎉

If all checkpoints passed, you've successfully completed Phase 1 of the ClinicInfo feature implementation.

**Database is ready** for API development.
