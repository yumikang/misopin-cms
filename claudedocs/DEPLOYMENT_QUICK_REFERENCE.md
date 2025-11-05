# Calendar Integration - Deployment Quick Reference

**Quick Start**: For experienced operators who need immediate deployment steps

---

## Pre-Flight Checklist (2 minutes)

```bash
# 1. Verify you're in project root
cd /Users/blee/Desktop/cms/misopin-cms

# 2. Verify files exist
ls -l public/static-pages/calendar-page.html
ls -l public/static-pages/js/time-slot-loader.js
ls -l public/static-pages/css/time-slot-styles.css

# 3. Test CMS is running
curl https://misopin.one-q.xyz/api/health

# 4. (Optional) Dry run
./deploy-calendar-integration.sh --dry-run
```

✅ **All checks pass?** → Proceed to deployment
❌ **Any check fails?** → Stop and investigate

---

## Deployment (10 minutes)

```bash
# Execute deployment
sudo ./deploy-calendar-integration.sh

# The script will:
# ✓ Create backup at /var/www/backups/[timestamp]/
# ✓ Deploy JS to /var/www/misopin.com/js/
# ✓ Deploy CSS to /var/www/misopin.com/css/
# ✓ Deploy HTML to /var/www/misopin-cms/.next/standalone/public/static-pages/
# ✓ Verify each step
```

### Watch for these outputs:
- ✅ `All source files present` → Good
- ✅ `JavaScript deployed and verified` → Good
- ✅ `CSS deployed and verified` → Good
- ✅ `HTML deployed to CMS` → Good
- ✅ `DEPLOYMENT SUCCESSFUL` → **SUCCESS!**

### If you see errors:
- Script will auto-stop on first error
- Check error message
- Rollback if needed: `sudo ./rollback-calendar.sh`

---

## Verification (5 minutes)

```bash
# Run automated tests
./verify-deployment.sh

# Expected output:
# Passed: 25+/30
# Warned: 0-5/30
# Failed: 0/30
# ✅ ALL TESTS PASSED
```

### Manual Browser Test
1. Open: https://misopin.one-q.xyz/calendar-page.html
2. F12 → Console (should be no red errors)
3. Select service: "WRINKLE_BOTOX"
4. Select date: Future date
5. Check time dropdown: Should show dynamic times with ✓ ⚠ ✕ indicators
6. (Optional) Submit test reservation

✅ **All working?** → Deployment successful
❌ **Issues?** → Rollback immediately

---

## Rollback (2 minutes)

```bash
# Emergency rollback
sudo ./rollback-calendar.sh

# Script will:
# ✓ Find most recent backup
# ✓ Restore calendar-page.html
# ✓ Verify restoration
# ✓ Monitor for 5 minutes

# Expected output:
# ✅ ROLLBACK SUCCESSFUL
```

---

## File Locations Reference

### Source (Dev)
```
/Users/blee/Desktop/cms/misopin-cms/public/static-pages/
├── calendar-page.html
├── js/time-slot-loader.js
└── css/time-slot-styles.css
```

### Destination (Prod)
```
/var/www/misopin.com/               # Static assets
├── js/time-slot-loader.js          ← NEW
└── css/time-slot-styles.css        ← NEW

/var/www/misopin-cms/.next/standalone/public/static-pages/
└── calendar-page.html              ← MODIFIED
```

### Backups
```
/var/www/backups/[timestamp]/
└── calendar-page.html.bak
```

---

## Troubleshooting Quick Fixes

### Issue: Page loads but no styles
```bash
# Check CSS accessible
curl -I https://misopin.one-q.xyz/css/time-slot-styles.css

# If 404, redeploy CSS
sudo cp public/static-pages/css/time-slot-styles.css /var/www/misopin.com/css/
```

### Issue: Time slots not loading
```bash
# Check API
curl "https://misopin.one-q.xyz/api/public/reservations/time-slots?service=BOTOX&date=2025-12-01"

# Check CMS running
pm2 list
pm2 restart misopin-cms  # if needed
```

### Issue: Other pages broken
```bash
# This should NOT happen, but if it does:
# 1. Immediate rollback
sudo ./rollback-calendar.sh

# 2. Check Caddy config
cat /etc/caddy/Caddyfile

# 3. Restart Caddy
sudo systemctl restart caddy
```

---

## Monitoring Checklist (First 24h)

### Hour 1
- [ ] Check page loads
- [ ] No console errors
- [ ] Time slots loading
- [ ] Form submission works

### Hour 6
- [ ] Check server logs: `tail -f /var/log/caddy/access.log`
- [ ] Check CMS logs: `pm2 logs misopin-cms`
- [ ] Check API response times

### Hour 24
- [ ] No user reports of issues
- [ ] API call success rate > 95%
- [ ] Page load time < 2s
- [ ] Form submission success rate > 95%

---

## Emergency Contacts

**If deployment fails catastrophically:**

1. **Immediate**: `sudo ./rollback-calendar.sh`
2. **Verify rollback**: `./verify-deployment.sh`
3. **Check logs**: `pm2 logs misopin-cms --lines 100`
4. **Test manually**: Open calendar page in browser

**Expected recovery time**: < 5 minutes

---

## Success Criteria

✅ **Deployment Successful** when:
- Verification script passes (0 failures)
- Browser console shows no errors
- Time slots load dynamically
- Form submission works
- Other pages unchanged
- No performance degradation

---

## Common Commands

```bash
# Status check
curl -I https://misopin.one-q.xyz/calendar-page.html

# Full verification
./verify-deployment.sh

# View backups
ls -ltr /var/www/backups/

# Latest backup
ls -t /var/www/backups/ | head -1

# Rollback to specific backup
sudo ./rollback-calendar.sh 20251104-143022

# Check Caddy logs
sudo tail -f /var/log/caddy/access.log

# Check CMS logs
pm2 logs misopin-cms --lines 50

# Restart CMS
pm2 restart misopin-cms

# Restart Caddy
sudo systemctl restart caddy
```

---

## Architecture Summary

```
User Request: calendar-page.html
│
├─→ Caddy: Serves HTML from CMS
│   Location: /var/www/misopin-cms/.next/standalone/public/static-pages/
│
├─→ Browser loads CSS/JS (relative paths)
│   ├─→ css/time-slot-styles.css → Static site
│   └─→ js/time-slot-loader.js → Static site
│       Location: /var/www/misopin.com/
│
└─→ TimeSlotLoader makes API calls
    └─→ /api/public/reservations/time-slots → CMS API
        Location: Next.js on localhost:3001
```

**Key Insight**: HTML from CMS, assets from static site, API from CMS
**Why it works**: Same domain = no CORS, Caddy routing handles everything

---

## What Changed vs What Didn't

### Changed (0.1% of site)
- ✏️ calendar-page.html (modified, moved to CMS)
- ➕ time-slot-loader.js (new)
- ➕ time-slot-styles.css (new)

### Unchanged (99.9% of site)
- ✅ All 28 other HTML pages
- ✅ All existing CSS files
- ✅ All existing JS files
- ✅ All images
- ✅ All calendar-assets/
- ✅ Navigation
- ✅ Caddy configuration

**Risk Level**: LOW (minimal changes, extensive fallbacks)

---

**Full Documentation**: See `MINIMAL_INTEGRATION_ANALYSIS.md`
