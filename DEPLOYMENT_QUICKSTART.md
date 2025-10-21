# Misopin Deployment Quick Start Guide

## Prerequisites
- SSH access to 141.164.60.51
- clinic-info.js created and ready
- Terminal with bash

## Quick Deployment (3 Commands)

### Step 1: Download Production Files (5 minutes)
```bash
chmod +x ./scripts/download-production.sh
./scripts/download-production.sh
```

### Step 2: Run Deployment Script (15 minutes)
```bash
chmod +x ./scripts/deploy.sh
./scripts/deploy.sh
```

The script will:
- ✅ Create automatic backups
- ✅ Apply all HTML modifications
- ✅ Deploy JavaScript library
- ✅ Test staging deployment
- ✅ Prompt for confirmation
- ✅ Deploy all files
- ✅ Verify everything works

### Step 3: Manual Browser Testing (10 minutes)
Open these pages and verify:
- http://misopin.com
- http://misopin.com/inc01.html
- http://misopin.com/hair01.html
- http://misopin.com/sub01.html

Check:
- [ ] No JavaScript console errors (F12)
- [ ] Phone numbers are clickable
- [ ] SNS links show alerts with URLs
- [ ] Page loads normally

---

## Emergency Rollback

If something goes wrong:

```bash
./scripts/deploy.sh rollback
```

This instantly restores from backup.

---

## What Gets Modified?

### All 13 HTML Files:
1. `index.html`
2. `inc01.html` through `inc06.html` (6 files)
3. `hair01.html`, `hair02.html` (2 files)
4. `sub01.html` through `sub04.html` (4 files)

### Changes Applied:
- ✏️ Phone numbers: `<a href="tel:061-277-1001" data-clinic-phone>`
- ✏️ Addresses: `<span data-clinic-address-full>`
- ✏️ SNS links: `<a href="#" data-clinic-sns-instagram>`
- ✏️ Business hours: `<span data-clinic-hours-weekday>`
- ✏️ Business reg: `<span data-clinic-business-reg>`
- ✏️ Script tag: `<script src="/js/clinic-info.js"></script>` before `</body>`

### New File Deployed:
- `/var/www/misopin.com/js/clinic-info.js`

---

## Safety Features

The deployment script includes:
- 🛡️ Automatic server-side backup before changes
- 🛡️ Local backup for safety
- 🛡️ Staging test (index.html only) before full deployment
- 🛡️ HTTP status verification for all pages
- 🛡️ Confirmation prompts at critical steps
- 🛡️ Atomic file operations (no partial updates)
- 🛡️ Detailed logging
- 🛡️ One-command rollback

---

## Deployment Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Download | 5 min | Get production files |
| Checks | 2 min | Verify prerequisites |
| Backup | 3 min | Create safety backups |
| Modify | 5 min | Apply HTML changes |
| Deploy JS | 2 min | Upload clinic-info.js |
| Staging | 3 min | Test on index.html |
| **Manual Check** | **5 min** | **Browser verification** |
| Full Deploy | 5 min | Deploy all files |
| Verify | 5 min | Test all pages |
| Total | **35 min** | Including manual testing |

---

## Manual Commands (If Script Fails)

### Manual Backup
```bash
ssh root@141.164.60.51 "mkdir -p /var/backups/misopin-backup && cp -r /var/www/misopin.com /var/backups/misopin-backup/"
```

### Manual Deploy Single File
```bash
scp index.html root@141.164.60.51:/var/www/misopin.com/index.html.new
ssh root@141.164.60.51 "mv /var/www/misopin.com/index.html.new /var/www/misopin.com/index.html"
```

### Manual Rollback
```bash
ssh root@141.164.60.51 "cp -r /var/backups/misopin-TIMESTAMP/misopin.com/* /var/www/misopin.com/"
```

### Check Page Status
```bash
curl -I http://misopin.com/index.html
```

---

## Troubleshooting

### Issue: SSH Connection Failed
```bash
# Test connection
ssh root@141.164.60.51 "echo 'test'"

# Check SSH key
ls -la ~/.ssh/
```

### Issue: Script Permission Denied
```bash
chmod +x ./scripts/*.sh
```

### Issue: clinic-info.js Not Found
```bash
# Check file exists
ls -la ./js/clinic-info.js

# Update path in deploy.sh if needed
```

### Issue: sed Command Not Working
```bash
# macOS uses different sed syntax
# Script is designed for macOS sed
# For Linux, remove .bak from sed -i.bak
```

### Issue: Page Returns 404 After Deployment
```bash
# Check file exists on server
ssh root@141.164.60.51 "ls -la /var/www/misopin.com/*.html"

# Check file permissions
ssh root@141.164.60.51 "chmod 644 /var/www/misopin.com/*.html"

# Rollback if needed
./scripts/deploy.sh rollback
```

### Issue: JavaScript Not Loading
```bash
# Check file exists
ssh root@141.164.60.51 "ls -la /var/www/misopin.com/js/clinic-info.js"

# Check permissions
ssh root@141.164.60.51 "chmod 644 /var/www/misopin.com/js/clinic-info.js"

# Re-upload
scp ./js/clinic-info.js root@141.164.60.51:/var/www/misopin.com/js/
```

---

## Post-Deployment Checklist

### Immediate (Within 1 hour)
- [ ] All 13 pages load without errors
- [ ] JavaScript console shows no errors
- [ ] Phone numbers clickable on mobile
- [ ] SNS links functional
- [ ] Desktop browser testing complete
- [ ] Mobile browser testing complete

### 24-Hour Monitoring
- [ ] Monitor server logs for errors
- [ ] Check for user-reported issues
- [ ] Verify contact form submissions working
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Test on different devices (iOS, Android)

### 7-Day Follow-up
- [ ] No performance degradation reported
- [ ] No functionality issues reported
- [ ] Analytics show normal traffic patterns
- [ ] Consider removing old backup if stable

---

## Files Reference

### Deployment Files
- `scripts/download-production.sh` - Download current production files
- `scripts/deploy.sh` - Main deployment script
- `js/clinic-info.js` - JavaScript library to deploy
- `deployment-plan.md` - Detailed deployment plan (90 pages)

### Generated During Deployment
- `production-backup/` - Local copy of production files
- `modified/` - Modified HTML files ready for deployment
- `.backup_location` - Server backup path for rollback
- `deployment-log.txt` - Deployment record

---

## Success Criteria

✅ Deployment is successful if:
1. All 13 HTML files return HTTP 200
2. clinic-info.js loads (HTTP 200)
3. No JavaScript console errors
4. Phone numbers clickable (tel: links work)
5. SNS links trigger alerts with correct URLs
6. All data attributes present
7. Page rendering unchanged
8. No user-reported issues within 24 hours

---

## Contact Information

### Server Details
- **Server IP**: 141.164.60.51
- **User**: root
- **Site Path**: /var/www/misopin.com/
- **Backup Path**: /var/backups/

### Important URLs
- **Live Site**: http://misopin.com
- **Main Page**: http://misopin.com/index.html
- **JavaScript**: http://misopin.com/js/clinic-info.js

---

## Best Practices

1. **Always test locally first** - Never deploy untested code
2. **Create backups** - Always have a rollback plan
3. **Deploy during off-peak hours** - Minimize user impact
4. **Test staging first** - Verify with index.html before full deployment
5. **Monitor after deployment** - Watch for issues in first 24 hours
6. **Document everything** - Keep deployment logs
7. **Have rollback ready** - Be prepared to revert quickly

---

**Remember**: The deployment script is designed for safety. If anything feels wrong during the process, stop and rollback immediately.

Good luck with your deployment! 🚀
