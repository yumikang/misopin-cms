# Clinic Info Feature - Deployment Quick Start

## TL;DR - Execute Deployment

```bash
# Navigate to project
cd /Users/blee/Desktop/cms/misopin-cms

# Run automated deployment script
./scripts/deploy-clinic-info.sh
```

**Estimated Time**: 45 minutes
**Risk Level**: MEDIUM-HIGH
**Rollback**: Automatic on failure

---

## What Gets Deployed

### Database
- ✅ New table: `clinic_info`
- ✅ Migration: `20251014151930_add_clinic_info_model`
- ✅ Prisma client regeneration

### Code Files
- ✅ `/api/admin/clinic-info/route.ts` (Admin API - NEW)
- ✅ `/admin/settings/components/ClinicInfoSettings.tsx` (Admin UI - NEW)
- ✅ `/admin/settings/page.tsx` (Updated with new tab)
- ✅ `prisma/schema.prisma` (Added ClinicInfo model)

### Already in Production
- ✅ `/api/public/clinic-info/route.ts` (Deployed Oct 14)
- ✅ `middleware.ts` (CORS config OK)

---

## Pre-Flight Checklist

Before running deployment script:

- [ ] Current time is off-peak (recommended) OR monitoring available
- [ ] SSH access to production: `ssh root@141.164.60.51`
- [ ] Database credentials available
- [ ] Local build passes: `npm run build`
- [ ] Git status checked: `git status`
- [ ] Ready to monitor for 10 minutes after deployment

---

## Manual Deployment (Step-by-Step)

If you prefer manual control, follow these steps:

### Phase 1: Backup (5 mins)
```bash
# Backup production code
ssh root@141.164.60.51 "cd /var/www && tar -czf misopin-cms-backup-$(date +%Y%m%d-%H%M%S).tar.gz misopin-cms/"

# Backup database
ssh root@141.164.60.51 "PGPASSWORD='MisoPinCMS2025!@#SecurePass' pg_dump -h 127.0.0.1 -U misopin_user misopin_cms > /root/misopin_cms_backup_$(date +%Y%m%d-%H%M%S).sql"
```

### Phase 2: Database Migration (10 mins)
```bash
# Upload migration
scp -r prisma/migrations/20251014151930_add_clinic_info_model/ root@141.164.60.51:/var/www/misopin-cms/prisma/migrations/

# Upload schema
scp prisma/schema.prisma root@141.164.60.51:/var/www/misopin-cms/prisma/

# Run migration
ssh root@141.164.60.51 "cd /var/www/misopin-cms && npx prisma migrate deploy"

# Regenerate Prisma client (CRITICAL!)
ssh root@141.164.60.51 "cd /var/www/misopin-cms && npx prisma generate"
```

### Phase 3: Code Deployment (15 mins)
```bash
# Upload admin API
ssh root@141.164.60.51 "mkdir -p /var/www/misopin-cms/app/api/admin/clinic-info"
scp app/api/admin/clinic-info/route.ts root@141.164.60.51:/var/www/misopin-cms/app/api/admin/clinic-info/

# Upload admin UI
scp app/admin/settings/components/ClinicInfoSettings.tsx root@141.164.60.51:/var/www/misopin-cms/app/admin/settings/components/

# Upload settings page
scp app/admin/settings/page.tsx root@141.164.60.51:/var/www/misopin-cms/app/admin/settings/

# Build and restart
ssh root@141.164.60.51 "cd /var/www/misopin-cms && npm run build && pm2 restart misopin-cms"
```

### Phase 4: Verification (10 mins)
```bash
# Check PM2 status
ssh root@141.164.60.51 "pm2 list"

# Check logs
ssh root@141.164.60.51 "pm2 logs misopin-cms --lines 50"

# Test public API
curl https://cms.one-q.xyz/api/public/clinic-info

# Test admin login and API (get token first)
curl -X POST https://cms.one-q.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@misopin.com","password":"Misopin2025"}'
```

### Phase 5: Data Seeding (5 mins)
```bash
# Option A: Via Admin UI (recommended)
# 1. Open https://cms.one-q.xyz/admin/settings
# 2. Login
# 3. Go to "클리닉 정보" tab
# 4. Fill form and save

# Option B: Direct SQL
ssh root@141.164.60.51 "PGPASSWORD='MisoPinCMS2025!@#SecurePass' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c \"
INSERT INTO clinic_info (
  id, \"phonePrimary\", \"addressFull\",
  \"hoursWeekday\", \"hoursSaturday\", \"hoursSunday\",
  \"businessRegistration\", \"representativeName\"
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
\""
```

---

## Rollback Procedure

### If Migration Fails
```bash
# Drop table
ssh root@141.164.60.51 "PGPASSWORD='MisoPinCMS2025!@#SecurePass' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c 'DROP TABLE IF EXISTS clinic_info;'"

# Restore schema
ssh root@141.164.60.51 "cd /var/www/misopin-cms && git checkout prisma/schema.prisma"
```

### If Build Fails or Runtime Errors
```bash
# Find latest backup
ssh root@141.164.60.51 "ls -lt /var/www/misopin-cms-backup-*.tar.gz | head -1"

# Restore from backup
ssh root@141.164.60.51 "cd /var/www && rm -rf misopin-cms && tar -xzf misopin-cms-backup-[timestamp].tar.gz"

# Restart PM2
ssh root@141.164.60.51 "pm2 restart misopin-cms"
```

---

## Post-Deployment Verification Checklist

Within 10 minutes after deployment:

- [ ] PM2 shows 2 instances running
- [ ] No errors in `pm2 logs misopin-cms`
- [ ] Public API responds: `curl https://cms.one-q.xyz/api/public/clinic-info`
- [ ] Admin login works
- [ ] Admin settings page loads
- [ ] "클리닉 정보" tab visible
- [ ] Can create clinic info record
- [ ] Can update clinic info record
- [ ] Public API returns created data

Within 24 hours:

- [ ] No recurring errors in logs
- [ ] API response times normal
- [ ] Memory usage stable in PM2
- [ ] Static site can fetch clinic info (if integrated)

---

## Troubleshooting

### Error: "Unknown arg `where` in where.isActive"
**Cause**: Prisma client not regenerated
**Fix**: `ssh root@141.164.60.51 "cd /var/www/misopin-cms && npx prisma generate && pm2 restart misopin-cms"`

### Error: "Table clinic_info does not exist"
**Cause**: Migration didn't run
**Fix**: `ssh root@141.164.60.51 "cd /var/www/misopin-cms && npx prisma migrate deploy"`

### Error: "Cannot find module 'ClinicInfoSettings'"
**Cause**: Component file not uploaded
**Fix**: Re-upload component file

### 502 Bad Gateway
**Cause**: PM2 processes down
**Fix**: `ssh root@141.164.60.51 "pm2 restart misopin-cms"`

### Admin API returns 401
**Cause**: Token authentication issue
**Fix**: Check JWT_SECRET in production .env, re-login to get fresh token

---

## Important Notes

1. **Prisma Generate is CRITICAL**: Always run after migration or schema changes
2. **Backup Before Deploy**: Automated script does this, manual process must too
3. **Monitor Logs**: Watch `pm2 logs` for at least 10 minutes after deployment
4. **Version Conflicts**: If multiple admins edit simultaneously, version conflict detection will prevent data loss
5. **CORS Already Configured**: Public API has CORS headers for static site integration

---

## Success Indicators

Deployment is successful when:
- ✅ All phases complete without errors
- ✅ PM2 processes running stably
- ✅ Public API returns data (after seeding)
- ✅ Admin UI functional and can CRUD clinic info
- ✅ No errors in logs after 10 minutes

---

## Need Help?

1. Check comprehensive analysis: `/Users/blee/Desktop/cms/misopin-cms/claudedocs/DEPLOYMENT_ANALYSIS_CLINIC_INFO.md`
2. Review deployment script logs for specific error messages
3. Check PM2 logs: `ssh root@141.164.60.51 "pm2 logs misopin-cms --lines 100"`
4. Verify database state: `ssh root@141.164.60.51 "PGPASSWORD='MisoPinCMS2025!@#SecurePass' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c '\d clinic_info'"`

---

**Last Updated**: 2025-10-14
**Deployment Target**: Production (cms.one-q.xyz, 141.164.60.51)
**Feature**: Clinic Info Management System
