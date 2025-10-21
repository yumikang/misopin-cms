# Production Deployment Plan: Misopin Static Site Update

## 1. RISK ASSESSMENT

### High-Risk Areas
- **Production Downtime**: Direct modification of live HTML files
- **Syntax Errors**: Malformed HTML breaking page rendering
- **JavaScript Errors**: clinic-info.js failing to load or execute
- **Data Attribute Mismatches**: Wrong attribute names breaking functionality
- **File Permission Issues**: SSH/SCP operations failing
- **Network Interruptions**: Partial uploads leaving site in broken state

### Risk Mitigation Strategies
✅ **Complete Backup**: Full site backup before any changes
✅ **Local Testing**: Test all changes on local copies first
✅ **Staged Deployment**: Test on one file before rolling out to all
✅ **Atomic Operations**: Use temporary files + atomic moves
✅ **Validation Gates**: Verify each step before proceeding
✅ **Quick Rollback**: Keep backup readily accessible

---

## 2. BACKUP STRATEGY

### Pre-Deployment Backup
```bash
# Create timestamped backup directory on server
BACKUP_DIR="/var/backups/misopin-$(date +%Y%m%d-%H%M%S)"
ssh root@141.164.60.51 "mkdir -p $BACKUP_DIR"

# Backup entire site structure
ssh root@141.164.60.51 "cp -r /var/www/misopin.com $BACKUP_DIR/"

# Verify backup integrity
ssh root@141.164.60.51 "ls -lah $BACKUP_DIR/misopin.com"
ssh root@141.164.60.51 "diff -r /var/www/misopin.com $BACKUP_DIR/misopin.com"
```

### Local Backup
```bash
# Download current production files for local reference
mkdir -p ./production-backup
scp -r root@141.164.60.51:/var/www/misopin.com/ ./production-backup/
```

---

## 3. DEPLOYMENT APPROACH

### Selected Method: **Staged SCP + SSH Verification**

**Rationale**:
- ✅ Simple, reliable for static files
- ✅ No Git infrastructure needed
- ✅ Direct control over file operations
- ✅ Easy rollback mechanism
- ✅ Minimal dependencies

**Alternative Considered**: Git-based deployment
- ❌ Requires Git setup on production server
- ❌ More complex rollback process
- ❌ Overkill for 13 static files

---

## 4. HTML MODIFICATION STRATEGY

### Approach: **Local Automated Pattern Replacement**

**Phase 1: Script-Based Modifications (Automated)**
```bash
# Use sed for reliable pattern-based replacements
# Test locally, then deploy modified files
```

**Phase 2: Manual Verification (Safety Check)**
```bash
# Validate HTML syntax
# Test JavaScript loading
# Verify data attributes
```

### Modification Patterns

#### Pattern 1: Phone Numbers
```bash
# Before: <a href="tel:061-277-1001">061-277-1001</a>
# After:  <a href="tel:061-277-1001" data-clinic-phone>061-277-1001</a>

find . -name "*.html" -type f -exec sed -i.bak \
  's|<a href="tel:\([^"]*\)">\([^<]*\)</a>|<a href="tel:\1" data-clinic-phone>\2</a>|g' {} \;
```

#### Pattern 2: Addresses
```bash
# Before: <span>부산 해운대구 센텀동로 41</span>
# After:  <span data-clinic-address-full>부산 해운대구 센텀동로 41</span>

sed -i.bak 's|<span>\(부산 해운대구 센텀동로 41[^<]*\)</span>|<span data-clinic-address-full>\1</span>|g' *.html
```

#### Pattern 3: Instagram Links
```bash
# Before: <a href="https://www.instagram.com/misopin_">
# After:  <a href="#" data-clinic-sns-instagram>

sed -i.bak 's|<a href="https://www\.instagram\.com/[^"]*"|<a href="#" data-clinic-sns-instagram|g' *.html
```

#### Pattern 4: Script Tag Injection
```bash
# Add before </body> tag
sed -i.bak 's|</body>|<script src="/js/clinic-info.js"></script>\n</body>|g' *.html
```

---

## 5. TESTING STRATEGY

### Local Testing (Pre-Deployment)
```bash
# 1. HTML Validation
for file in *.html; do
  echo "Validating $file..."
  tidy -q -e "$file" 2>&1 | head -20
done

# 2. Check data attributes present
grep -n "data-clinic-" *.html | wc -l  # Should be 100+

# 3. Check script tags added
grep -n "clinic-info.js" *.html | wc -l  # Should be 13

# 4. Visual inspection
open index.html  # Manually verify in browser
```

### Staging Test (Single File)
```bash
# Deploy ONLY index.html first
scp index.html root@141.164.60.51:/var/www/misopin.com/index.html.new
ssh root@141.164.60.51 "mv /var/www/misopin.com/index.html.new /var/www/misopin.com/index.html"

# Test in browser: http://misopin.com
# Verify: phone numbers, addresses, SNS links working
# Check browser console for JS errors
```

### Production Verification
```bash
# After full deployment, verify all pages
for page in index inc01 inc02 inc03 inc04 inc05 inc06 hair01 hair02 sub01 sub02 sub03 sub04; do
  echo "Testing ${page}.html..."
  curl -I "http://misopin.com/${page}.html" | grep "200 OK"
done

# Check JavaScript loading
curl -I "http://misopin.com/js/clinic-info.js" | grep "200 OK"
```

---

## 6. ROLLBACK PLAN

### Immediate Rollback (< 5 minutes)
```bash
# Restore from server backup
BACKUP_DIR="/var/backups/misopin-20250314-143022"  # Use actual timestamp
ssh root@141.164.60.51 "cp -r $BACKUP_DIR/misopin.com/* /var/www/misopin.com/"

# Verify restoration
ssh root@141.164.60.51 "ls -lah /var/www/misopin.com/"
```

### Selective Rollback (Single File)
```bash
# Rollback specific file
ssh root@141.164.60.51 "cp $BACKUP_DIR/misopin.com/index.html /var/www/misopin.com/"
```

### Emergency Rollback (Local Backup)
```bash
# If server backup fails, restore from local
scp -r ./production-backup/misopin.com/* root@141.164.60.51:/var/www/misopin.com/
```

---

## 7. STEP-BY-STEP EXECUTION PLAN

### Phase 1: Pre-Deployment (15 minutes)

#### Step 1.1: Create Backup
```bash
# Server-side backup
BACKUP_DIR="/var/backups/misopin-$(date +%Y%m%d-%H%M%S)"
ssh root@141.164.60.51 "mkdir -p $BACKUP_DIR && cp -r /var/www/misopin.com $BACKUP_DIR/"

# Verify backup
ssh root@141.164.60.51 "ls -lah $BACKUP_DIR/misopin.com" | grep "index.html"
```

#### Step 1.2: Download Production Files
```bash
# Local backup for reference
mkdir -p ./production-backup
scp -r root@141.164.60.51:/var/www/misopin.com/ ./production-backup/
```

#### Step 1.3: Create js Directory on Server
```bash
ssh root@141.164.60.51 "mkdir -p /var/www/misopin.com/js"
```

---

### Phase 2: Local Preparation (30 minutes)

#### Step 2.1: Create Modified Copies
```bash
# Work on local copies
cp -r ./production-backup/misopin.com/ ./modified/
cd ./modified/
```

#### Step 2.2: Apply Automated Modifications
```bash
# Script 1: Add data-clinic-phone to all tel: links
find . -name "*.html" -type f -exec sed -i.bak \
  's|<a href="tel:\([0-9-]*\)">\([^<]*\)</a>|<a href="tel:\1" data-clinic-phone>\2</a>|g' {} \;

# Script 2: Add data-clinic-address-full
find . -name "*.html" -type f -exec sed -i.bak \
  's|<span>\(부산 해운대구 센텀동로 41[^<]*\)</span>|<span data-clinic-address-full>\1</span>|g' {} \;

# Script 3: Update Instagram links
find . -name "*.html" -type f -exec sed -i.bak \
  's|<a href="https://www\.instagram\.com/[^"]*"|<a href="#" data-clinic-sns-instagram|g' {} \;

# Script 4: Update Kakao links
find . -name "*.html" -type f -exec sed -i.bak \
  's|<a href="http://pf\.kakao\.com/[^"]*"|<a href="#" data-clinic-sns-kakao|g' {} \;

# Script 5: Update Naver Blog links
find . -name "*.html" -type f -exec sed -i.bak \
  's|<a href="https://blog\.naver\.com/[^"]*"|<a href="#" data-clinic-sns-naver|g' {} \;

# Script 6: Add business registration data attribute
find . -name "*.html" -type f -exec sed -i.bak \
  's|<span>\(사업자등록번호 : 123-56-789\)</span>|<span data-clinic-business-reg>\1</span>|g' {} \;

# Script 7: Add weekday hours data attribute
find . -name "*.html" -type f -exec sed -i.bak \
  's|<span>\(평일 10:00~19:00\)</span>|<span data-clinic-hours-weekday>\1</span>|g' {} \;

# Script 8: Add Saturday hours data attribute
find . -name "*.html" -type f -exec sed -i.bak \
  's|<span>\(토요일 10:00~16:00\)</span>|<span data-clinic-hours-saturday>\1</span>|g' {} \;

# Script 9: Inject clinic-info.js before </body>
find . -name "*.html" -type f -exec sed -i.bak \
  's|</body>|<script src="/js/clinic-info.js"></script>\n</body>|g' {} \;

# Remove backup files
find . -name "*.bak" -delete
```

#### Step 2.3: Validate Modified Files
```bash
# Count modifications
echo "Phone numbers with data-clinic-phone:"
grep -r "data-clinic-phone" *.html | wc -l

echo "Addresses with data-clinic-address-full:"
grep -r "data-clinic-address-full" *.html | wc -l

echo "Script tags added:"
grep -r "clinic-info.js" *.html | wc -l

echo "SNS data attributes:"
grep -r "data-clinic-sns" *.html | wc -l
```

#### Step 2.4: HTML Syntax Validation
```bash
# Install tidy if needed: brew install tidy-html5
for file in *.html; do
  echo "Validating $file..."
  tidy -q -e "$file" 2>&1 | grep -i "error" || echo "  ✓ No errors"
done
```

---

### Phase 3: Staging Deployment (10 minutes)

#### Step 3.1: Deploy JavaScript Library
```bash
# Upload clinic-info.js
scp ./js/clinic-info.js root@141.164.60.51:/var/www/misopin.com/js/

# Verify upload
ssh root@141.164.60.51 "ls -lah /var/www/misopin.com/js/clinic-info.js"
ssh root@141.164.60.51 "cat /var/www/misopin.com/js/clinic-info.js | head -5"
```

#### Step 3.2: Test Deploy Single File (index.html)
```bash
# Upload as temporary file
scp ./modified/index.html root@141.164.60.51:/var/www/misopin.com/index.html.new

# Atomic move
ssh root@141.164.60.51 "mv /var/www/misopin.com/index.html.new /var/www/misopin.com/index.html"
```

#### Step 3.3: Manual Browser Testing
```
1. Open http://misopin.com in browser
2. Open DevTools Console (F12)
3. Check for JavaScript errors
4. Verify phone numbers are clickable
5. Check addresses display correctly
6. Test SNS links (should show alert with URL)
7. Verify business registration info displays
```

#### Step 3.4: Go/No-Go Decision
```
✅ If staging test passes → Proceed to Phase 4
❌ If issues found → Rollback and fix
```

---

### Phase 4: Full Deployment (15 minutes)

#### Step 4.1: Deploy All HTML Files
```bash
# Upload all modified HTML files
for file in inc01.html inc02.html inc03.html inc04.html inc05.html inc06.html \
            hair01.html hair02.html sub01.html sub02.html sub03.html sub04.html; do
  echo "Deploying $file..."
  scp ./modified/$file root@141.164.60.51:/var/www/misopin.com/${file}.new
  ssh root@141.164.60.51 "mv /var/www/misopin.com/${file}.new /var/www/misopin.com/$file"
done
```

#### Step 4.2: Verify All Deployments
```bash
# Check file timestamps (should be recent)
ssh root@141.164.60.51 "ls -lah /var/www/misopin.com/*.html"

# Verify clinic-info.js references in all files
ssh root@141.164.60.51 "grep -l 'clinic-info.js' /var/www/misopin.com/*.html | wc -l"
# Should output: 13
```

---

### Phase 5: Post-Deployment Verification (15 minutes)

#### Step 5.1: HTTP Response Validation
```bash
# Test all pages return 200 OK
for page in index inc01 inc02 inc03 inc04 inc05 inc06 hair01 hair02 sub01 sub02 sub03 sub04; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://misopin.com/${page}.html")
  echo "${page}.html: $status"
done

# Test JavaScript file
curl -s -o /dev/null -w "%{http_code}" "http://misopin.com/js/clinic-info.js"
```

#### Step 5.2: Content Verification
```bash
# Verify data attributes present in production
for page in index inc01 inc02; do
  echo "Checking $page.html..."
  curl -s "http://misopin.com/${page}.html" | grep -c "data-clinic-" || echo "  ⚠ No data attributes found"
done
```

#### Step 5.3: Manual Browser Testing (All Pages)
```
Test Checklist:
[ ] index.html - Phone, address, SNS links work
[ ] inc01.html through inc06.html - Same verification
[ ] hair01.html, hair02.html - Same verification
[ ] sub01.html through sub04.html - Same verification
[ ] No JavaScript console errors on any page
[ ] All clickable phone numbers work
[ ] All SNS links trigger appropriate actions
```

#### Step 5.4: Performance Check
```bash
# Check page load times haven't degraded
for page in index inc01 hair01 sub01; do
  time curl -s "http://misopin.com/${page}.html" > /dev/null
done
```

---

### Phase 6: Cleanup & Documentation (5 minutes)

#### Step 6.1: Document Deployment
```bash
# Create deployment record
cat > deployment-log.txt << EOF
Deployment Date: $(date)
Backup Location: $BACKUP_DIR
Files Modified: 13 HTML files + 1 JS library
Changes Applied:
  - Added data-clinic-phone attributes (40+ occurrences)
  - Added data-clinic-address-full attributes (18 occurrences)
  - Added data-clinic-sns-* attributes (45+ occurrences)
  - Added data-clinic-business-reg attributes (13 occurrences)
  - Added data-clinic-hours-* attributes (26 occurrences)
  - Deployed clinic-info.js library
Testing Results: All pages verified functional
Rollback Available: Yes ($BACKUP_DIR)
EOF
```

#### Step 6.2: Notify Stakeholders
```
Send notification:
- Deployment completed successfully
- All 13 pages updated
- Contact information now centrally managed
- Zero downtime achieved
- Rollback available if needed
```

---

## 8. EMERGENCY PROCEDURES

### If Deployment Fails Mid-Process
```bash
# Immediate rollback
BACKUP_DIR="/var/backups/misopin-TIMESTAMP"  # Use actual timestamp
ssh root@141.164.60.51 "cp -r $BACKUP_DIR/misopin.com/* /var/www/misopin.com/"
```

### If JavaScript Fails to Load
```bash
# Check file permissions
ssh root@141.164.60.51 "chmod 644 /var/www/misopin.com/js/clinic-info.js"

# Check file exists
ssh root@141.164.60.51 "ls -lah /var/www/misopin.com/js/clinic-info.js"

# Re-upload if needed
scp ./js/clinic-info.js root@141.164.60.51:/var/www/misopin.com/js/
```

### If Data Attributes Not Working
```bash
# Verify attributes in HTML
ssh root@141.164.60.51 "grep 'data-clinic-' /var/www/misopin.com/index.html | head -10"

# Check JavaScript console in browser for errors
# Fix locally and re-deploy affected files
```

---

## 9. TIMELINE ESTIMATE

| Phase | Duration | Critical Path |
|-------|----------|---------------|
| Pre-Deployment | 15 min | ✓ |
| Local Preparation | 30 min | ✓ |
| Staging Deployment | 10 min | ✓ |
| Full Deployment | 15 min | ✓ |
| Post-Verification | 15 min | ✓ |
| Cleanup | 5 min | - |
| **Total** | **90 min** | **65 min critical** |

**Recommended Deployment Window**:
- Best time: Off-peak hours (early morning or late evening)
- Duration: 90 minutes
- Contingency buffer: +30 minutes

---

## 10. SUCCESS CRITERIA

✅ **Deployment Successful If**:
1. All 13 HTML files deployed without errors
2. clinic-info.js loads on all pages (HTTP 200)
3. No JavaScript console errors
4. All data attributes present and functional
5. Phone numbers clickable (tel: links work)
6. SNS links trigger appropriate actions
7. Page load times unchanged
8. No user-reported issues within 24 hours
9. Backup verified and accessible
10. Documentation completed

❌ **Rollback Required If**:
1. Any page returns 404 or 500 error
2. JavaScript fails to load or execute
3. Critical functionality broken (phone, contact)
4. Site rendering broken on mobile/desktop
5. Performance degradation >20%

---

## 11. POST-DEPLOYMENT MONITORING

### 24-Hour Monitoring Plan
```bash
# Day 1: Monitor every 2 hours
# Days 2-7: Monitor daily

# Quick health check script
for page in index inc01 hair01 sub01; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://misopin.com/${page}.html")
  if [ "$status" != "200" ]; then
    echo "⚠ ALERT: ${page}.html returned $status"
  fi
done
```

### User Feedback Collection
- Monitor contact form submissions
- Check phone call volume
- Review any user reports
- Test on multiple devices/browsers

---

## APPENDIX A: Command Cheat Sheet

```bash
# Quick backup
ssh root@141.164.60.51 "cp -r /var/www/misopin.com /var/backups/misopin-$(date +%Y%m%d-%H%M%S)"

# Quick rollback
ssh root@141.164.60.51 "cp -r /var/backups/misopin-TIMESTAMP/misopin.com/* /var/www/misopin.com/"

# Deploy single file
scp file.html root@141.164.60.51:/var/www/misopin.com/file.html.new
ssh root@141.164.60.51 "mv /var/www/misopin.com/file.html.new /var/www/misopin.com/file.html"

# Check page status
curl -I http://misopin.com/index.html

# Verify data attributes
ssh root@141.164.60.51 "grep -c 'data-clinic-' /var/www/misopin.com/*.html"
```

---

## APPENDIX B: Pre-Flight Checklist

**Before Starting Deployment**:
- [ ] SSH access to 141.164.60.51 verified
- [ ] clinic-info.js created and tested locally
- [ ] All 13 HTML files identified and accessible
- [ ] Local backup directory created
- [ ] sed commands tested on sample files
- [ ] HTML validator (tidy) installed
- [ ] Browser ready for manual testing
- [ ] Stakeholders notified of maintenance window
- [ ] Rollback plan reviewed and understood
- [ ] Emergency contact information available

---

**END OF DEPLOYMENT PLAN**
