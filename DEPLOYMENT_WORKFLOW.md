# Misopin Deployment Workflow

## Visual Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

Step 1: DOWNLOAD PRODUCTION FILES
┌──────────────────────────────────────────────┐
│  ./scripts/download-production.sh            │
│  ↓                                           │
│  SSH → 141.164.60.51                         │
│  ↓                                           │
│  Download /var/www/misopin.com/              │
│  ↓                                           │
│  Save to ./production-backup/                │
│  ↓                                           │
│  ✓ 13 HTML files downloaded                  │
└──────────────────────────────────────────────┘
                    ↓
Step 2: RUN DEPLOYMENT SCRIPT
┌──────────────────────────────────────────────┐
│  ./scripts/deploy.sh                         │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  PHASE 1: Pre-Deployment Checks              │
│  ├─ Test SSH connection                      │
│  ├─ Verify clinic-info.js exists             │
│  └─ Verify production backup exists          │
│  ✓ All checks passed                         │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  PHASE 2: Create Backups                     │
│  ├─ Create /var/backups/misopin-TIMESTAMP/   │
│  ├─ Copy entire site structure               │
│  ├─ Verify backup integrity                  │
│  └─ Save backup location                     │
│  ✓ Backup created: 13 files                  │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  PHASE 3: Local Modifications                │
│  ├─ Copy files to ./modified/                │
│  ├─ Apply pattern replacements:              │
│  │   • data-clinic-phone (40+ times)         │
│  │   • data-clinic-address-full (18 times)   │
│  │   • data-clinic-sns-* (45+ times)         │
│  │   • data-clinic-hours-* (26 times)        │
│  │   • data-clinic-business-reg (13 times)   │
│  │   • <script src="/js/clinic-info.js">     │
│  └─ Validate modifications                   │
│  ✓ 13 files modified                         │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  PHASE 4: Deploy JavaScript Library          │
│  ├─ Create /var/www/misopin.com/js/          │
│  ├─ Upload clinic-info.js                    │
│  └─ Verify upload                            │
│  ✓ JavaScript deployed                       │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  PHASE 5: Staging Deployment                 │
│  ├─ Deploy index.html ONLY                   │
│  ├─ Test HTTP 200 response                   │
│  ├─ Test JavaScript loading                  │
│  └─ MANUAL BROWSER VERIFICATION              │
│      [YOU TEST IN BROWSER HERE]              │
│  ✓ Staging test passed                       │
└──────────────────────────────────────────────┘
                    ↓
            ┌───────────────┐
            │ Continue? Y/N │ ← YOU DECIDE HERE
            └───────────────┘
                    ↓
        YES ↓              ↓ NO (Exit)
            ↓
┌──────────────────────────────────────────────┐
│  PHASE 6: Full Deployment                    │
│  ├─ Deploy inc01.html through inc06.html     │
│  ├─ Deploy hair01.html, hair02.html          │
│  ├─ Deploy sub01.html through sub04.html     │
│  └─ Atomic move for each file                │
│  ✓ All 12 remaining files deployed           │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  PHASE 7: Post-Deployment Verification       │
│  ├─ Test all 13 pages (HTTP 200)             │
│  ├─ Verify data attributes in production     │
│  └─ Count modifications per page             │
│  ✓ All verifications passed                  │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  PHASE 8: Documentation                      │
│  ├─ Create deployment-log.txt                │
│  ├─ Record backup location                   │
│  └─ Document changes                         │
│  ✓ Log saved                                 │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  ✅ DEPLOYMENT COMPLETED                      │
└──────────────────────────────────────────────┘
                    ↓
Step 3: MANUAL BROWSER TESTING
┌──────────────────────────────────────────────┐
│  Test all pages in browser:                  │
│  ├─ http://misopin.com/index.html            │
│  ├─ http://misopin.com/inc01.html            │
│  ├─ http://misopin.com/hair01.html           │
│  ├─ http://misopin.com/sub01.html            │
│  └─ [Test all 13 pages]                      │
│                                              │
│  Check:                                      │
│  [ ] No JavaScript console errors            │
│  [ ] Phone numbers clickable                 │
│  [ ] SNS links show alerts                   │
│  [ ] Pages load correctly                    │
│  ✓ All manual tests passed                   │
└──────────────────────────────────────────────┘
                    ↓
        ┌─────────────────────┐
        │ Issues Found? Y/N   │
        └─────────────────────┘
                    ↓
         NO ↓              ↓ YES
            ↓              ↓
            ↓     ┌──────────────────────────┐
            ↓     │ EMERGENCY ROLLBACK       │
            ↓     │ ./scripts/deploy.sh      │
            ↓     │         rollback         │
            ↓     │ ✓ Restored from backup   │
            ↓     └──────────────────────────┘
            ↓
┌──────────────────────────────────────────────┐
│  🎉 DEPLOYMENT SUCCESSFUL                     │
│                                              │
│  Monitor for 24 hours:                       │
│  - Server logs                               │
│  - User reports                              │
│  - Contact form submissions                  │
│  - Browser compatibility                     │
└──────────────────────────────────────────────┘
```

---

## File Modification Flow

```
Before Deployment:
┌───────────────────────────────────────────────────────────┐
│ <a href="tel:061-277-1001">061-277-1001</a>              │
│ <span>부산 해운대구 센텀동로 41</span>                       │
│ <a href="https://www.instagram.com/misopin_">             │
│ <span>사업자등록번호 : 123-56-789</span>                    │
│ </body>                                                   │
└───────────────────────────────────────────────────────────┘
                         ↓
                  sed Pattern Matching
                         ↓
After Deployment:
┌───────────────────────────────────────────────────────────┐
│ <a href="tel:061-277-1001" data-clinic-phone>061-277-1001│
│ </a>                                                      │
│ <span data-clinic-address-full>부산 해운대구 센텀동로 41    │
│ </span>                                                   │
│ <a href="#" data-clinic-sns-instagram>                    │
│ <span data-clinic-business-reg>사업자등록번호 : 123-56-789│
│ </span>                                                   │
│ <script src="/js/clinic-info.js"></script>                │
│ </body>                                                   │
└───────────────────────────────────────────────────────────┘
```

---

## JavaScript Library Flow

```
Local Development:
┌─────────────────────────────────────┐
│  ./js/clinic-info.js                │
│  (Created with clinic data)         │
└─────────────────────────────────────┘
              ↓ SCP Upload
              ↓
Production Server:
┌─────────────────────────────────────┐
│  /var/www/misopin.com/js/           │
│  └─ clinic-info.js                  │
└─────────────────────────────────────┘
              ↓ Referenced by
              ↓
All HTML Pages:
┌─────────────────────────────────────┐
│  <script src="/js/clinic-info.js">  │
│  </script>                          │
└─────────────────────────────────────┘
              ↓ Executes on page load
              ↓
Browser:
┌─────────────────────────────────────┐
│  Updates all [data-clinic-*]        │
│  elements with centralized data     │
└─────────────────────────────────────┘
```

---

## Backup & Rollback Flow

```
Production Site:
┌────────────────────────────────────┐
│  /var/www/misopin.com/             │
│  ├─ index.html                     │
│  ├─ inc01.html ... inc06.html      │
│  ├─ hair01.html, hair02.html       │
│  └─ sub01.html ... sub04.html      │
└────────────────────────────────────┘
              ↓
    Backup Before Deployment
              ↓
┌────────────────────────────────────┐
│  /var/backups/misopin-20250314/    │
│  └─ misopin.com/                   │
│     ├─ index.html (ORIGINAL)       │
│     ├─ inc*.html (ORIGINAL)        │
│     └─ ... all files               │
└────────────────────────────────────┘
              ↓
         Deployment
              ↓
┌────────────────────────────────────┐
│  /var/www/misopin.com/             │
│  ├─ index.html (MODIFIED)          │
│  ├─ inc01.html (MODIFIED)          │
│  └─ js/clinic-info.js (NEW)        │
└────────────────────────────────────┘

If Issues Occur:
              ↓
    ./scripts/deploy.sh rollback
              ↓
┌────────────────────────────────────┐
│  Restore from backup               │
│  cp -r backup/* production/        │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│  /var/www/misopin.com/             │
│  ├─ index.html (RESTORED)          │
│  ├─ inc01.html (RESTORED)          │
│  └─ Back to original state         │
└────────────────────────────────────┘
```

---

## Decision Points in Workflow

### Decision Point 1: Pre-Deployment
```
Ready to start deployment?
├─ YES → Continue to Phase 1
└─ NO  → Exit (nothing happens)
```

### Decision Point 2: After Staging Test
```
Manual browser test passed?
├─ YES → Continue to full deployment
└─ NO  → Stop (only index.html modified, easy to rollback)
```

### Decision Point 3: Post-Deployment
```
All verification tests passed?
├─ YES → Complete deployment, create log
└─ NO  → Rollback immediately
```

### Decision Point 4: 24-Hour Monitoring
```
Issues reported within 24 hours?
├─ NO  → Deployment successful, clean up old backups
└─ YES → Assess severity:
         ├─ Minor → Fix in next update
         └─ Major → Rollback immediately
```

---

## Risk Levels by Phase

```
Phase 1: Pre-Checks
Risk: ⚪ NONE (read-only)

Phase 2: Backup
Risk: ⚪ NONE (creating backup)

Phase 3: Local Modifications
Risk: ⚪ NONE (local only)

Phase 4: Deploy JavaScript
Risk: 🟢 LOW (new file, doesn't affect existing)

Phase 5: Staging (index.html only)
Risk: 🟡 MEDIUM (1 page affected)
       ↑ MANUAL VERIFICATION HERE

Phase 6: Full Deployment
Risk: 🟠 ELEVATED (all pages affected)
       ↑ But staging already verified

Phase 7: Verification
Risk: ⚪ NONE (read-only testing)

Phase 8: Documentation
Risk: ⚪ NONE (logging only)
```

---

## Parallel vs Sequential Operations

### Parallel Operations (Faster)
```
Multiple independent reads:
├─ Read index.html
├─ Read inc01.html    } Can happen simultaneously
├─ Read hair01.html
└─ Read sub01.html

Multiple HTTP checks:
├─ Test index.html
├─ Test inc01.html    } Can happen simultaneously
└─ Test hair01.html
```

### Sequential Operations (Required)
```
Deployment must be sequential:
1. Backup first (MUST complete)
2. Then modify locally (depends on backup)
3. Then deploy JS (MUST complete)
4. Then staging test (depends on JS)
5. Then full deployment (depends on staging success)
6. Then verification (depends on deployment)

Each step depends on previous success!
```

---

## Timeline Visualization

```
Time: 0min        5min       10min      15min      20min      25min      30min      35min
      │           │          │          │          │          │          │          │
      ├─ Phase 1 ─┤
      │ Checks    │
                  ├─ Phase 2 ─┤
                  │  Backup   │
                              ├──── Phase 3 ────┤
                              │  Modifications   │
                                                 ├─ Phase 4 ─┤
                                                 │ Deploy JS │
                                                             ├─ Phase 5 ──┤
                                                             │  Staging   │
                                                             │ YOU TEST!  │
                                                                          ├─ Phase 6 ──┤
                                                                          │ Full Deploy│
                                                                                       ├─ Phase 7 ─┤
                                                                                       │ Verify    │
                                                                                                   ├ Phase 8
                                                                                                   │ Log

Total: ~35 minutes (including your manual testing time)
```

---

## Success Metrics Dashboard

After deployment, check these metrics:

```
┌────────────────────────────────────────────────────┐
│  DEPLOYMENT SUCCESS DASHBOARD                      │
├────────────────────────────────────────────────────┤
│  ✓ HTTP Status:           13/13 pages return 200   │
│  ✓ JavaScript:            clinic-info.js loads     │
│  ✓ Console Errors:        0 errors                 │
│  ✓ Phone Links:           40+ working              │
│  ✓ SNS Links:             45+ working              │
│  ✓ Data Attributes:       100+ present             │
│  ✓ Page Load Time:        No degradation           │
│  ✓ Mobile Rendering:      Verified                 │
│  ✓ Desktop Rendering:     Verified                 │
│  ✓ Backup Available:      Yes                      │
└────────────────────────────────────────────────────┘

Status: 🟢 ALL SYSTEMS OPERATIONAL
```

---

## Command Quick Reference

### Essential Commands
```bash
# Download production files
./scripts/download-production.sh

# Run deployment
./scripts/deploy.sh

# Emergency rollback
./scripts/deploy.sh rollback

# Test single page
curl -I http://misopin.com/index.html

# Test JavaScript
curl -I http://misopin.com/js/clinic-info.js

# Check all pages
for p in index inc01 inc02 inc03 inc04 inc05 inc06 hair01 hair02 sub01 sub02 sub03 sub04; do
  curl -s -o /dev/null -w "%{http_code} ${p}.html\n" "http://misopin.com/${p}.html"
done
```

### Troubleshooting Commands
```bash
# Check backup exists
ssh root@141.164.60.51 "ls -la /var/backups/"

# Verify JavaScript on server
ssh root@141.164.60.51 "ls -la /var/www/misopin.com/js/"

# Check file permissions
ssh root@141.164.60.51 "ls -la /var/www/misopin.com/*.html"

# View deployment log
cat deployment-log.txt
```

---

## What Could Go Wrong (and Solutions)

| Issue | Symptom | Solution |
|-------|---------|----------|
| SSH timeout | Connection refused | Check VPN, verify IP, check SSH key |
| Script fails | Permission denied | Run `chmod +x scripts/*.sh` |
| sed errors | Syntax error | macOS vs Linux sed syntax, check script |
| Missing JS | 404 error | Re-upload: `scp js/clinic-info.js root@...` |
| HTML broken | Page not rendering | Rollback: `./scripts/deploy.sh rollback` |
| Data attributes missing | JS not updating | Verify sed patterns applied correctly |
| Page 404 | File not found | Check deployment completed, verify paths |
| JS console errors | Script error | Check JS syntax, verify file loaded |

---

This workflow ensures safe, reliable deployment with multiple verification points and easy rollback capability. Follow the visual flow, and you'll have a successful deployment! 🚀
