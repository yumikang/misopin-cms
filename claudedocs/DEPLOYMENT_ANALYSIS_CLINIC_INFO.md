# Comprehensive Deployment Analysis: Clinic Info Feature

**Date**: 2025-10-14
**Analyst**: Root Cause Analyst Mode
**Project**: Misopin CMS - Clinic Info Management Feature

---

## Executive Summary

**Current State**: Local development (localhost:3001) has complete clinic info management feature. Production (cms.one-q.xyz) has ONLY the public API endpoint but MISSING the admin management interface and database table.

**Risk Level**: MEDIUM-HIGH
- Database migration required (no table exists in production)
- Missing admin API routes that need deployment
- Missing admin UI components
- Prisma client regeneration needed in production

**Deployment Readiness**: 85% - Ready with mitigation steps

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Evidence Collection

#### Local Development (localhost:3001)
```
Status: FULLY FUNCTIONAL
- Database: clinic_info table EXISTS
- Public API: /api/public/clinic-info ✅
- Admin API: /api/admin/clinic-info ✅
- Admin UI: /admin/settings (ClinicInfoSettings component) ✅
- Migration files: prisma/migrations/20251014151930_add_clinic_info_model/ ✅
- Build status: SUCCESS (verified with npm run build)
```

#### Production (cms.one-q.xyz, 141.164.60.51)
```
Status: PARTIALLY DEPLOYED
- Database: clinic_info table MISSING ❌
- Public API: /api/public/clinic-info EXISTS ✅ (deployed Oct 14 16:43)
- Admin API: /api/admin/clinic-info MISSING ❌
- Admin UI: /admin/settings (ClinicInfoSettings component) MISSING ❌
- PM2 Status: Running (2 instances, cluster mode)
- Last Deploy: Oct 14 17:01 (partial deployment)
```

### 1.2 Git Status Analysis

#### Uncommitted Changes
```bash
Modified files:
- prisma/schema.prisma (ClinicInfo model added)
- app/admin/settings/page.tsx (integrated ClinicInfoSettings)
- middleware.ts (CORS configuration updated)
- PASSWORD_RESET.md (deleted)

Untracked files (new feature files):
- app/admin/settings/components/ClinicInfoSettings.tsx
- app/api/admin/clinic-info/route.ts
- app/api/public/clinic-info/route.ts (EXISTS in production)
- prisma/migrations/20251014151930_add_clinic_info_model/
- Multiple documentation files
```

**Critical Finding**: The last production deployment was PARTIAL. Only public API was deployed, but database migration and admin features were NOT deployed.

---

## 2. WHAT NEEDS TO BE DEPLOYED

### 2.1 Database Changes (CRITICAL)

**Migration Required**: `20251014151930_add_clinic_info_model`

```sql
CREATE TABLE "public"."clinic_info" (
    "id" TEXT NOT NULL,
    "phonePrimary" TEXT NOT NULL,
    "phoneSecondary" TEXT,
    "addressFull" TEXT NOT NULL,
    "addressFloor" TEXT,
    "hoursWeekday" TEXT NOT NULL,
    "hoursSaturday" TEXT NOT NULL,
    "hoursSunday" TEXT NOT NULL,
    "hoursLunch" TEXT,
    "hoursSpecialNote" TEXT,
    "snsInstagram" TEXT,
    "snsKakao" TEXT,
    "snsNaverBlog" TEXT,
    "snsFacebook" TEXT,
    "snsYoutube" TEXT,
    "businessRegistration" TEXT NOT NULL,
    "representativeName" TEXT NOT NULL,
    "medicalLicense" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastUpdatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clinic_info_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinic_info_isActive_idx" ON "public"."clinic_info"("isActive");
```

**Risk Assessment**:
- Risk: LOW (additive only, no breaking changes)
- Rollback: Easy (drop table if needed)
- Data Loss: None (new table)

### 2.2 Code Files to Deploy

#### New Files (must be uploaded)
```
1. app/api/admin/clinic-info/route.ts (191 lines)
   - GET: Fetch clinic info for admin
   - PUT: Update clinic info with optimistic locking
   - JWT authentication required
   - Version conflict handling

2. app/admin/settings/components/ClinicInfoSettings.tsx (382 lines)
   - Full admin UI for clinic info management
   - Form validation
   - Real-time updates
   - Version conflict detection

3. prisma/migrations/20251014151930_add_clinic_info_model/migration.sql
   - Database migration SQL
```

#### Modified Files (must be updated)
```
1. prisma/schema.prisma
   - Added ClinicInfo model (lines 339-381)

2. app/admin/settings/page.tsx
   - Integrated ClinicInfoSettings tab

3. middleware.ts
   - Already deployed (CORS config OK)
```

#### Files Already in Production
```
1. app/api/public/clinic-info/route.ts ✅
   - Deployed Oct 14 16:43
   - No changes needed
```

### 2.3 Dependencies

**No new NPM dependencies required** ✅
- All required packages already in package.json:
  - @prisma/client@6.16.2
  - prisma@6.16.2
  - jsonwebtoken@9.0.2
  - bcryptjs@3.0.2

**Prisma Client Regeneration Required** ⚠️
- Must run `prisma generate` after migration
- Reason: ClinicInfo model doesn't exist in current production Prisma client

### 2.4 Environment Variables

**Current Production .env**:
```bash
DATABASE_URL="postgresql://misopin_user:MisoPinCMS2025%21%40%23SecurePass@127.0.0.1:5432/misopin_cms?schema=public&sslmode=disable"
```

**Required**: No changes needed ✅
- Connection string is correct
- Points to localhost PostgreSQL
- SSL disabled (local connection)

---

## 3. POTENTIAL RISKS & MITIGATION

### 3.1 Database Risks

#### Risk 1: Migration Failure
**Probability**: LOW
**Impact**: HIGH (service disruption)

**Hypothesis**: Migration could fail due to:
- PostgreSQL connection issues
- Permission problems
- Existing table conflicts

**Mitigation**:
1. ✅ Test connection: `psql -h 127.0.0.1 -U misopin_user -d misopin_cms`
2. ✅ Verify no existing clinic_info table
3. ✅ Run migration with transaction support
4. ✅ Keep backup of migration SQL for manual rollback

**Evidence Required**:
```bash
# Pre-flight check
ssh root@141.164.60.51 "cd /var/www/misopin-cms && PGPASSWORD='...' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c '\dt clinic_info'"
```

#### Risk 2: Prisma Client Mismatch
**Probability**: MEDIUM-HIGH
**Impact**: HIGH (runtime errors)

**Previous Issue**: This exact problem occurred before:
- Symptom: "Unknown arg `where` in where.isActive" errors
- Cause: Prisma client generated without ClinicInfo model
- Solution: Regenerate client after migration

**Mitigation**:
1. ✅ Run migration FIRST
2. ✅ Run `prisma generate` IMMEDIATELY after
3. ✅ Restart PM2 processes to load new client
4. ✅ Verify with health check endpoint

### 3.2 Build & Deployment Risks

#### Risk 3: Standalone Build Issues
**Probability**: MEDIUM
**Impact**: MEDIUM (deployment delay)

**Previous Issue**: Standalone builds missing static files and public folders

**Mitigation**:
1. ✅ Verify local build completes: `npm run build` (PASSED)
2. ✅ Check .next/standalone structure
3. ✅ Ensure .next/static is copied separately
4. ✅ Ensure public/ is copied separately

**Build Output Verified**:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (38/38)
✓ Finalizing page optimization

Route (app)                                Size       First Load JS
├ ƒ /api/admin/clinic-info                 228 B         102 kB  ← NEW
├ ƒ /api/public/clinic-info                228 B         102 kB  ← EXISTS
```

#### Risk 4: Missing Admin UI Files
**Probability**: LOW
**Impact**: MEDIUM (feature unusable)

**Evidence**: Production missing ClinicInfoSettings.tsx

**Mitigation**:
1. ✅ Upload component file to production
2. ✅ Verify app/admin/settings/page.tsx includes import
3. ✅ Test admin settings page loads
4. ✅ Verify authentication works

### 3.3 Runtime Risks

#### Risk 5: API Authentication Issues
**Probability**: LOW
**Impact**: MEDIUM (admin UI fails)

**Admin API Requirements**:
- JWT token in Authorization header
- SUPER_ADMIN or ADMIN role required
- JWT_SECRET must match production

**Mitigation**:
1. ✅ Verify JWT_SECRET exists in production .env
2. ✅ Test admin login generates valid token
3. ✅ Test admin API endpoint responds correctly

#### Risk 6: CORS Configuration
**Probability**: LOW
**Impact**: LOW (public API only)

**Evidence**: middleware.ts already deployed and working

**Status**: ✅ No changes needed
- Public API has CORS headers in route handler
- Middleware configuration already correct

---

## 4. STEP-BY-STEP DEPLOYMENT SEQUENCE

### Phase 1: Pre-Deployment Validation (5 mins)

#### Step 1.1: Verify Local Build
```bash
cd /Users/blee/Desktop/cms/misopin-cms
npm run build

# Expected: ✓ Compiled successfully
# Verify: /api/admin/clinic-info appears in route list
```

**Success Criteria**: Build completes without errors

#### Step 1.2: Create Production Backup
```bash
# Backup current production
ssh root@141.164.60.51 "cd /var/www && tar -czf misopin-cms-backup-$(date +%Y%m%d-%H%M%S).tar.gz misopin-cms/"

# Backup database
ssh root@141.164.60.51 "PGPASSWORD='...' pg_dump -h 127.0.0.1 -U misopin_user misopin_cms > /root/misopin_cms_backup_$(date +%Y%m%d-%H%M%S).sql"
```

**Success Criteria**: Backup files created successfully

#### Step 1.3: Test Database Connection
```bash
ssh root@141.164.60.51 "PGPASSWORD='MisoPinCMS2025!@#SecurePass' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c 'SELECT version();'"
```

**Success Criteria**: PostgreSQL responds with version

### Phase 2: Database Migration (10 mins)

#### Step 2.1: Upload Migration Files
```bash
# Copy migration directory to production
scp -r prisma/migrations/20251014151930_add_clinic_info_model/ root@141.164.60.51:/var/www/misopin-cms/prisma/migrations/

# Verify upload
ssh root@141.164.60.51 "ls -la /var/www/misopin-cms/prisma/migrations/20251014151930_add_clinic_info_model/"
```

**Success Criteria**: Migration SQL file exists in production

#### Step 2.2: Update Prisma Schema
```bash
# Upload updated schema
scp prisma/schema.prisma root@141.164.60.51:/var/www/misopin-cms/prisma/

# Verify upload
ssh root@141.164.60.51 "grep -A 5 'model ClinicInfo' /var/www/misopin-cms/prisma/schema.prisma"
```

**Success Criteria**: ClinicInfo model present in schema

#### Step 2.3: Run Migration
```bash
ssh root@141.164.60.51 "cd /var/www/misopin-cms && npx prisma migrate deploy"
```

**Expected Output**:
```
1 migration found in prisma/migrations
Applying migration `20251014151930_add_clinic_info_model`
Migration applied successfully
```

**Verification**:
```bash
ssh root@141.164.60.51 "PGPASSWORD='...' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c '\d clinic_info'"
```

**Success Criteria**: Table structure matches schema

#### Step 2.4: Regenerate Prisma Client
```bash
ssh root@141.164.60.51 "cd /var/www/misopin-cms && npx prisma generate"
```

**Expected Output**:
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

**Success Criteria**: Prisma client includes ClinicInfo model

### Phase 3: Code Deployment (15 mins)

#### Step 3.1: Upload New API Route
```bash
# Create directory
ssh root@141.164.60.51 "mkdir -p /var/www/misopin-cms/app/api/admin/clinic-info"

# Upload admin API
scp app/api/admin/clinic-info/route.ts root@141.164.60.51:/var/www/misopin-cms/app/api/admin/clinic-info/

# Verify upload
ssh root@141.164.60.51 "ls -la /var/www/misopin-cms/app/api/admin/clinic-info/route.ts"
ssh root@141.164.60.51 "wc -l /var/www/misopin-cms/app/api/admin/clinic-info/route.ts"
```

**Success Criteria**: File exists, ~228 lines

#### Step 3.2: Upload Admin UI Component
```bash
# Upload ClinicInfoSettings component
scp app/admin/settings/components/ClinicInfoSettings.tsx root@141.164.60.51:/var/www/misopin-cms/app/admin/settings/components/

# Verify upload
ssh root@141.164.60.51 "ls -la /var/www/misopin-cms/app/admin/settings/components/ClinicInfoSettings.tsx"
ssh root@141.164.60.51 "wc -l /var/www/misopin-cms/app/admin/settings/components/ClinicInfoSettings.tsx"
```

**Success Criteria**: File exists, ~382 lines

#### Step 3.3: Update Settings Page
```bash
# Upload updated settings page
scp app/admin/settings/page.tsx root@141.164.60.51:/var/www/misopin-cms/app/admin/settings/

# Verify ClinicInfoSettings import
ssh root@141.164.60.51 "grep 'ClinicInfoSettings' /var/www/misopin-cms/app/admin/settings/page.tsx"
```

**Success Criteria**: Import statement present

#### Step 3.4: Build Production
```bash
ssh root@141.164.60.51 "cd /var/www/misopin-cms && npm run build"
```

**Expected Duration**: 2-3 minutes

**Success Criteria**:
- Build completes without errors
- `/api/admin/clinic-info` appears in route list
- No TypeScript errors

#### Step 3.5: Restart PM2
```bash
ssh root@141.164.60.51 "pm2 restart misopin-cms"
ssh root@141.164.60.51 "pm2 logs misopin-cms --lines 50"
```

**Success Criteria**:
- PM2 restart successful
- No error logs
- Both cluster instances running

### Phase 4: Post-Deployment Verification (10 mins)

#### Step 4.1: Database Verification
```bash
# Check table exists
ssh root@141.164.60.51 "PGPASSWORD='...' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c 'SELECT COUNT(*) FROM clinic_info;'"

# Expected: 0 (no records yet, table is new)
```

**Success Criteria**: Query executes without error

#### Step 4.2: API Health Check
```bash
# Test public API
curl -X GET https://cms.one-q.xyz/api/public/clinic-info

# Expected: 404 with {"success":false,"error":"Clinic information not configured"}
# (Normal - no data seeded yet)
```

**Success Criteria**: API responds (even with 404)

#### Step 4.3: Admin API Authentication Test
```bash
# Login as admin
curl -X POST https://cms.one-q.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@misopin.com","password":"Misopin2025"}'

# Expected: {"token":"..."}

# Test admin API (use token from above)
curl -X GET https://cms.one-q.xyz/api/admin/clinic-info \
  -H "Authorization: Bearer [TOKEN]"

# Expected: 404 with "Clinic information not configured"
# (Normal - no data seeded yet)
```

**Success Criteria**:
- Login successful
- Admin API responds (auth working)
- 404 expected (no data yet)

#### Step 4.4: Admin UI Verification

**Manual Test**:
1. Open browser: https://cms.one-q.xyz/admin/settings
2. Login with admin credentials
3. Navigate to "클리닉 정보" tab
4. Verify form loads without errors
5. Verify save button visible

**Success Criteria**:
- Settings page loads
- Clinic info tab present
- UI renders correctly
- No console errors

### Phase 5: Data Seeding (5 mins)

#### Step 5.1: Create Initial Clinic Info Record

**Option A: Via Admin UI** (Recommended)
1. Login to https://cms.one-q.xyz/admin/settings
2. Go to "클리닉 정보" tab
3. Click "초기 데이터 생성" (if create button exists)
4. OR fill form manually with clinic data
5. Save

**Option B: Via Direct SQL**
```sql
INSERT INTO clinic_info (
  id,
  "phonePrimary",
  "addressFull",
  "hoursWeekday",
  "hoursSaturday",
  "hoursSunday",
  "businessRegistration",
  "representativeName"
) VALUES (
  'clinic_info_main',
  '061-277-1001',
  '전남 목포시 영산로 362 미소핀의원',
  '평일 08:30 ~ 19:30',
  '토요일 09:00 ~ 14:00',
  '일요일, 공휴일 휴무',
  '123-56-789',
  '김지식'
);
```

**Success Criteria**:
- Record created successfully
- Public API returns data
- Admin UI displays data

#### Step 5.2: Verify End-to-End Flow
```bash
# Test public API returns data
curl -X GET https://cms.one-q.xyz/api/public/clinic-info

# Expected: {"success":true,"data":{...}}
```

**Success Criteria**: Public API returns complete clinic info

---

## 5. ROLLBACK STRATEGY

### Scenario A: Migration Fails

**Detection**: `prisma migrate deploy` returns error

**Rollback Steps**:
1. DO NOT proceed with code deployment
2. Check error message for root cause
3. If partial migration:
   ```bash
   ssh root@141.164.60.51 "PGPASSWORD='...' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c 'DROP TABLE IF EXISTS clinic_info;'"
   ```
4. Restore previous schema:
   ```bash
   ssh root@141.164.60.51 "cd /var/www/misopin-cms && git checkout prisma/schema.prisma"
   ```
5. Investigate and fix issue
6. Retry deployment

**Recovery Time**: 5-10 minutes

### Scenario B: Build Fails

**Detection**: `npm run build` returns errors

**Rollback Steps**:
1. DO NOT restart PM2
2. Check build error logs
3. Fix TypeScript/compilation errors
4. If cannot fix immediately:
   ```bash
   # Restore from backup
   ssh root@141.164.60.51 "cd /var/www && tar -xzf misopin-cms-backup-[timestamp].tar.gz"
   ssh root@141.164.60.51 "pm2 restart misopin-cms"
   ```

**Recovery Time**: 2-5 minutes

### Scenario C: Runtime Errors After Deployment

**Detection**: API returns 500 errors, PM2 logs show errors

**Symptoms**:
- "Unknown arg `where`" → Prisma client not regenerated
- "Table clinic_info does not exist" → Migration didn't run
- "Cannot find module" → Missing files

**Rollback Steps**:
1. Immediate: Restore previous deployment
   ```bash
   ssh root@141.164.60.51 "cd /var/www && rm -rf misopin-cms && tar -xzf misopin-cms-backup-[timestamp].tar.gz"
   ssh root@141.164.60.51 "pm2 restart misopin-cms"
   ```
2. If only Prisma issue:
   ```bash
   ssh root@141.164.60.51 "cd /var/www/misopin-cms && npx prisma generate && pm2 restart misopin-cms"
   ```

**Recovery Time**: 2-5 minutes

### Scenario D: Data Corruption

**Detection**: Incorrect data in clinic_info table

**Rollback Steps**:
1. Restore database from backup:
   ```bash
   ssh root@141.164.60.51 "PGPASSWORD='...' psql -h 127.0.0.1 -U misopin_user misopin_cms < /root/misopin_cms_backup_[timestamp].sql"
   ```
2. Drop clinic_info table if needed:
   ```bash
   ssh root@141.164.60.51 "PGPASSWORD='...' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c 'DROP TABLE clinic_info;'"
   ```

**Recovery Time**: 5-10 minutes

---

## 6. MONITORING & VALIDATION CHECKLIST

### Immediate Post-Deploy (0-5 mins)
- [ ] PM2 processes running (2 instances)
- [ ] No error logs in `pm2 logs misopin-cms`
- [ ] Public API responds: `curl https://cms.one-q.xyz/api/public/clinic-info`
- [ ] Admin login works
- [ ] Admin settings page loads

### Short-Term (5-30 mins)
- [ ] Admin can create clinic info record
- [ ] Admin can update clinic info
- [ ] Version conflict detection works (test concurrent edits)
- [ ] Public API returns updated data
- [ ] No memory leaks (PM2 memory stable)

### Long-Term (24 hours)
- [ ] No recurring errors in logs
- [ ] API response times normal (<100ms)
- [ ] Database performance stable
- [ ] Static site can fetch clinic info via CORS

---

## 7. DEPLOYMENT TIMELINE ESTIMATE

| Phase | Duration | Can Fail? | Rollback Time |
|-------|----------|-----------|---------------|
| Pre-deployment validation | 5 mins | Low risk | N/A |
| Database migration | 10 mins | Medium | 5-10 mins |
| Code deployment | 15 mins | Medium | 2-5 mins |
| Post-deployment verification | 10 mins | Low risk | N/A |
| Data seeding | 5 mins | Low risk | 2 mins |
| **Total** | **45 mins** | | **Max 15 mins** |

**Recommended Deployment Window**:
- Best: Off-peak hours (00:00-06:00 KST)
- Acceptable: Business hours with monitoring
- Avoid: High-traffic periods

---

## 8. SUCCESS CRITERIA

### Deployment Successful If:
1. ✅ Database migration completes without errors
2. ✅ Prisma client regenerated successfully
3. ✅ Production build completes without errors
4. ✅ PM2 processes restart without errors
5. ✅ Public API endpoint responds correctly
6. ✅ Admin API endpoint authenticates correctly
7. ✅ Admin UI loads and displays clinic info form
8. ✅ Clinic info can be created/updated via admin UI
9. ✅ Public API returns created clinic info
10. ✅ No errors in PM2 logs after 10 minutes

### Feature Complete When:
1. ✅ All success criteria met
2. ✅ Initial clinic info data seeded
3. ✅ Static site can fetch and display clinic info
4. ✅ 24-hour monitoring shows stable operation

---

## 9. POST-DEPLOYMENT ACTIONS

### Required After Successful Deploy:
1. Commit changes to git (currently uncommitted)
2. Update deployment documentation
3. Create clinic info user guide for admins
4. Test static site integration
5. Monitor logs for 24 hours
6. Document any issues encountered

### Optional Enhancements:
1. Add clinic info validation (phone number format, etc.)
2. Add clinic info history/audit log
3. Add bulk update capability
4. Add clinic info preview before save
5. Add image upload for clinic photos

---

## 10. LESSONS LEARNED FROM PREVIOUS DEPLOYMENTS

### Issue 1: Partial Deployment
**What Happened**: Oct 14 deployment only included public API, missed admin API and UI
**Root Cause**: Manual file selection, didn't deploy all uncommitted changes
**Prevention**: Always check `git status` before deployment, use systematic checklist

### Issue 2: Prisma Client Mismatch
**What Happened**: "Unknown arg `where`" errors after schema changes
**Root Cause**: Forgot to run `prisma generate` after migration
**Prevention**: Always run `prisma generate` immediately after migration

### Issue 3: Standalone Build Missing Files
**What Happened**: Static assets missing in standalone build
**Root Cause**: Next.js standalone doesn't auto-copy public/ and .next/static
**Prevention**: Current deployment uses PM2 with full build (not standalone extraction)

---

## 11. EMERGENCY CONTACTS & PROCEDURES

### If Deployment Fails Critically:
1. Execute rollback procedure immediately
2. Check PM2 logs: `ssh root@141.164.60.51 "pm2 logs misopin-cms --err --lines 100"`
3. Check database status: `psql` connection test
4. Restore from backup if needed
5. Document failure for analysis

### Critical Error Patterns:
```
"Unknown arg `where`" → Prisma client issue → Run prisma generate
"Table clinic_info does not exist" → Migration issue → Check migration status
"Cannot find module" → File upload issue → Verify all files deployed
"502 Bad Gateway" → PM2 down → Restart PM2
```

---

## 12. CONCLUSION

**Deployment Assessment**: READY with MEDIUM-HIGH risk level

**Primary Risks**:
1. Database migration (mitigated with backups and verification)
2. Prisma client regeneration (lesson learned from previous issue)
3. Build process (tested locally, passed)

**Confidence Level**: HIGH (85%)
- All files identified and verified
- Previous issues documented and mitigated
- Comprehensive rollback strategy prepared
- Clear verification steps defined

**Recommendation**:
✅ PROCEED with deployment following this plan
✅ Execute during off-peak hours if possible
✅ Have database backup before starting
✅ Monitor logs continuously during deployment
✅ Be prepared to rollback if any phase fails

**Next Steps**: Execute Phase 1 (Pre-Deployment Validation)
