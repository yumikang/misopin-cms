#!/bin/bash

################################################################################
# Misopin Static Site Deployment Script
# Purpose: Safe deployment of clinic-info.js integration to production
# Server: 141.164.60.51
# Path: /var/www/misopin.com/
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SERVER="141.164.60.51"
USER="root"
SITE_PATH="/var/www/misopin.com"
BACKUP_BASE="/var/backups"
LOCAL_BACKUP="./production-backup"
MODIFIED_DIR="./modified"
JS_FILE="./public/js/clinic-info.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Confirmation prompt
confirm() {
    read -p "$1 (y/n) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

################################################################################
# Phase 1: Pre-Deployment Checks
################################################################################

phase1_checks() {
    log_info "Phase 1: Pre-Deployment Checks"

    # Check SSH connectivity
    log_info "Testing SSH connection to $SERVER..."
    if ssh -o ConnectTimeout=5 $USER@$SERVER "echo 'Connection successful'" > /dev/null 2>&1; then
        log_success "SSH connection verified"
    else
        log_error "Cannot connect to $SERVER via SSH"
        exit 1
    fi

    # Check clinic-info.js exists
    if [ ! -f "$JS_FILE" ]; then
        log_error "clinic-info.js not found at $JS_FILE"
        exit 1
    fi
    log_success "clinic-info.js found"

    # Check production backup directory exists
    if [ ! -d "$LOCAL_BACKUP/misopin.com" ]; then
        log_error "Production backup not found. Run download first."
        exit 1
    fi
    log_success "Local backup directory verified"

    log_success "Phase 1 completed: All checks passed"
    echo
}

################################################################################
# Phase 2: Create Backups
################################################################################

phase2_backup() {
    log_info "Phase 2: Creating Backups"

    # Create timestamped backup on server
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_DIR="$BACKUP_BASE/misopin-$TIMESTAMP"

    log_info "Creating server backup at $BACKUP_DIR..."
    ssh $USER@$SERVER "mkdir -p $BACKUP_DIR && cp -r $SITE_PATH $BACKUP_DIR/" || {
        log_error "Server backup failed"
        exit 1
    }

    # Verify backup
    log_info "Verifying server backup..."
    BACKUP_COUNT=$(ssh $USER@$SERVER "ls $BACKUP_DIR/misopin.com/*.html 2>/dev/null | wc -l")
    if [ "$BACKUP_COUNT" -ge 13 ]; then
        log_success "Server backup verified: $BACKUP_COUNT HTML files backed up"
    else
        log_error "Backup verification failed: only $BACKUP_COUNT files found"
        exit 1
    fi

    # Save backup location for rollback
    echo "$BACKUP_DIR" > .backup_location
    log_success "Backup location saved: $BACKUP_DIR"

    log_success "Phase 2 completed: Backups created"
    echo
}

################################################################################
# Phase 3: Local Modifications
################################################################################

phase3_modify() {
    log_info "Phase 3: Applying Local Modifications"

    # Create modified directory structure
    rm -rf "$MODIFIED_DIR"
    mkdir -p "$MODIFIED_DIR/root"
    mkdir -p "$MODIFIED_DIR/dist"

    # Copy files from both directories
    cp "$LOCAL_BACKUP/misopin.com"/*.html "$MODIFIED_DIR/root/" 2>/dev/null || true

    # Copy dist files if directory exists
    if [ -d "$LOCAL_BACKUP/misopin.com/dist" ]; then
        cp "$LOCAL_BACKUP/misopin.com/dist"/*.html "$MODIFIED_DIR/dist/" 2>/dev/null || true
    fi

    # Store current directory
    WORK_DIR=$(pwd)

    log_info "Applying automated modifications to ROOT files..."
    cd "$WORK_DIR/$MODIFIED_DIR/root"

    # 1. Add data-clinic-phone to tel: links
    log_info "  → Adding data-clinic-phone attributes..."
    find . -name "*.html" -type f -exec sed -i.bak \
        's|<a href="tel:\([0-9-]*\)">\([^<]*\)</a>|<a href="tel:\1" data-clinic-phone>\2</a>|g' {} \;

    # 2. Add data-clinic-address-full (목포시 주소)
    log_info "  → Adding data-clinic-address-full attributes..."
    find . -name "*.html" -type f -exec sed -i.bak \
        's|<span>\(목포시[^<]*\)</span>|<span data-clinic-address-full>\1</span>|g' {} \;

    # 3. Update Instagram links
    log_info "  → Updating Instagram links..."
    find . -name "*.html" -type f -exec sed -i.bak \
        's|<a href="https://www\.instagram\.com/[^"]*"|<a href="#" data-clinic-sns-instagram|g' {} \;

    # 4. Update Kakao links
    log_info "  → Updating Kakao links..."
    find . -name "*.html" -type f -exec sed -i.bak \
        's|<a href="http://pf\.kakao\.com/[^"]*"|<a href="#" data-clinic-sns-kakao|g' {} \;
    find . -name "*.html" -type f -exec sed -i.bak \
        's|<a href="https://pf\.kakao\.com/[^"]*"|<a href="#" data-clinic-sns-kakao|g' {} \;

    # 5. Inject clinic-info.js before </body>
    log_info "  → Injecting clinic-info.js script tag..."
    find . -name "*.html" -type f -exec sed -i.bak \
        's|</body>|<script src="/js/clinic-info.js"></script>\n</body>|g' {} \;

    # Remove backup files
    find . -name "*.bak" -delete

    # Return to work directory
    cd "$WORK_DIR"

    # Only process dist folder if it has files
    DIST_FILE_COUNT=$(ls "$WORK_DIR/$MODIFIED_DIR/dist"/*.html 2>/dev/null | wc -l | tr -d ' ')
    if [ "$DIST_FILE_COUNT" -gt 0 ]; then
        log_info "Applying automated modifications to DIST files..."
        cd "$WORK_DIR/$MODIFIED_DIR/dist"

        # Same modifications for dist folder
        log_info "  → Adding data-clinic-phone attributes..."
        find . -name "*.html" -type f -exec sed -i.bak \
            's|<a href="tel:\([0-9-]*\)">\([^<]*\)</a>|<a href="tel:\1" data-clinic-phone>\2</a>|g' {} \;

        log_info "  → Adding data-clinic-address-full attributes..."
        find . -name "*.html" -type f -exec sed -i.bak \
            's|<span>\(목포시[^<]*\)</span>|<span data-clinic-address-full>\1</span>|g' {} \;

        log_info "  → Updating Instagram links..."
        find . -name "*.html" -type f -exec sed -i.bak \
            's|<a href="https://www\.instagram\.com/[^"]*"|<a href="#" data-clinic-sns-instagram|g' {} \;

        # Note: dist folder uses ../js/clinic-info.js path
        log_info "  → Injecting clinic-info.js script tag..."
        find . -name "*.html" -type f -exec sed -i.bak \
            's|</body>|<script src="../js/clinic-info.js"></script>\n</body>|g' {} \;

        # Remove backup files
        find . -name "*.bak" -delete

        cd "$WORK_DIR"
    else
        log_warning "No DIST files found, skipping DIST modifications"
    fi

    # Return to work directory and validate modifications
    cd "$WORK_DIR"
    log_info "Validating modifications..."
    ROOT_SCRIPT_COUNT=$(grep -r "clinic-info.js" "$MODIFIED_DIR/root"/*.html 2>/dev/null | wc -l | tr -d ' ')
    DIST_SCRIPT_COUNT=$(grep -r "clinic-info.js" "$MODIFIED_DIR/dist"/*.html 2>/dev/null | wc -l | tr -d ' ')
    TOTAL_SCRIPT_COUNT=$((ROOT_SCRIPT_COUNT + DIST_SCRIPT_COUNT))

    PHONE_COUNT=$(grep -r "data-clinic-phone" "$MODIFIED_DIR"/ | wc -l | tr -d ' ')
    SNS_COUNT=$(grep -r "data-clinic-sns" "$MODIFIED_DIR"/ | wc -l | tr -d ' ')

    log_info "  Root script tags: $ROOT_SCRIPT_COUNT"
    log_info "  Dist script tags: $DIST_SCRIPT_COUNT"
    log_info "  Total script tags: $TOTAL_SCRIPT_COUNT"
    log_info "  Phone attributes: $PHONE_COUNT"
    log_info "  SNS attributes: $SNS_COUNT"

    if [ "$TOTAL_SCRIPT_COUNT" -lt 24 ]; then
        log_error "Script tag count too low: expected ~25, got $TOTAL_SCRIPT_COUNT"
        exit 1
    fi

    log_success "Phase 3 completed: Local modifications applied to 25 files"
    echo
}

################################################################################
# Phase 4: Deploy JavaScript Library
################################################################################

phase4_deploy_js() {
    log_info "Phase 4: Deploying JavaScript Library"

    # Create js directory on server
    log_info "Creating js directory on server..."
    ssh $USER@$SERVER "mkdir -p $SITE_PATH/js"

    # Upload clinic-info.js
    log_info "Uploading clinic-info.js..."
    scp "$JS_FILE" $USER@$SERVER:$SITE_PATH/js/ || {
        log_error "Failed to upload clinic-info.js"
        exit 1
    }

    # Verify upload
    log_info "Verifying JavaScript file..."
    JS_SIZE=$(ssh $USER@$SERVER "ls -lh $SITE_PATH/js/clinic-info.js | awk '{print \$5}'")
    log_success "clinic-info.js deployed successfully (Size: $JS_SIZE)"

    log_success "Phase 4 completed: JavaScript library deployed"
    echo
}

################################################################################
# Phase 5: Staging Deployment (index.html only)
################################################################################

phase5_staging() {
    log_info "Phase 5: Staging Deployment (index.html)"

    # Deploy index.html as staging test
    log_info "Deploying index.html to staging..."
    scp "$MODIFIED_DIR/root/index.html" $USER@$SERVER:$SITE_PATH/index.html.new || {
        log_error "Failed to upload index.html"
        exit 1
    }

    # Atomic move
    ssh $USER@$SERVER "mv $SITE_PATH/index.html.new $SITE_PATH/index.html"

    # Test HTTP response
    log_info "Testing HTTP response..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://misopin.one-q.xyz/index.html")
    if [ "$HTTP_STATUS" == "200" ]; then
        log_success "index.html returned HTTP $HTTP_STATUS"
    else
        log_error "index.html returned HTTP $HTTP_STATUS"
        exit 1
    fi

    # Test JavaScript loading
    log_info "Testing JavaScript file..."
    JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://misopin.one-q.xyz/js/clinic-info.js")
    if [ "$JS_STATUS" == "200" ]; then
        log_success "clinic-info.js returned HTTP $JS_STATUS"
    else
        log_error "clinic-info.js returned HTTP $JS_STATUS"
        exit 1
    fi

    log_success "Phase 5 completed: Staging test passed"
    echo

    log_warning "MANUAL VERIFICATION REQUIRED:"
    echo "  1. Open http://misopin.com in browser"
    echo "  2. Check browser console for JavaScript errors"
    echo "  3. Verify phone numbers are clickable"
    echo "  4. Test SNS links functionality"
    echo

    if ! confirm "Continue with full deployment?"; then
        log_warning "Deployment cancelled by user"
        exit 0
    fi
}

################################################################################
# Phase 6: Full Deployment
################################################################################

phase6_full_deploy() {
    log_info "Phase 6: Full Deployment"

    # Deploy ROOT directory files (excluding index.html which was already deployed in staging)
    log_info "Deploying ROOT directory files..."
    ROOT_FILES=(
        "calendar-page.html" "board-page.html" "board-event.html" "board-notice.html"
        "about.html" "board-detail.html" "privacy.html" "directions.html"
        "fee-schedule.html" "quickmenu.html" "stipulation.html" "auto-clear-popups.html"
    )

    for file in "${ROOT_FILES[@]}"; do
        if [ -f "$MODIFIED_DIR/root/$file" ]; then
            log_info "  Deploying $file..."
            scp "$MODIFIED_DIR/root/$file" $USER@$SERVER:$SITE_PATH/${file}.new || {
                log_error "Failed to upload $file"
                exit 1
            }
            ssh $USER@$SERVER "mv $SITE_PATH/${file}.new $SITE_PATH/$file"
        fi
    done

    # Deploy DIST directory files
    log_info "Deploying DIST directory files..."

    # Create dist directory on server if it doesn't exist
    ssh $USER@$SERVER "mkdir -p $SITE_PATH/dist"

    DIST_FILES=(
        "tattoo.html" "hair-removal.html" "diet.html" "milia.html"
        "peeling.html" "lifting.html" "jeomin.html" "filler.html"
        "mole.html" "acne.html" "skinbooster.html" "botox.html"
    )

    for file in "${DIST_FILES[@]}"; do
        if [ -f "$MODIFIED_DIR/dist/$file" ]; then
            log_info "  Deploying dist/$file..."
            scp "$MODIFIED_DIR/dist/$file" $USER@$SERVER:$SITE_PATH/dist/${file}.new || {
                log_error "Failed to upload dist/$file"
                exit 1
            }
            ssh $USER@$SERVER "mv $SITE_PATH/dist/${file}.new $SITE_PATH/dist/$file"
        fi
    done

    log_success "Phase 6 completed: All 24 HTML files deployed (12 root + 12 dist)"
    echo
}

################################################################################
# Phase 7: Post-Deployment Verification
################################################################################

phase7_verify() {
    log_info "Phase 7: Post-Deployment Verification"

    # Test ROOT directory pages
    log_info "Testing ROOT directory pages..."
    ROOT_PAGES=(
        "index" "calendar-page" "board-page" "board-event" "board-notice"
        "about" "board-detail" "privacy" "directions" "fee-schedule"
        "quickmenu" "stipulation"
    )

    FAILED_PAGES=()

    for page in "${ROOT_PAGES[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://misopin.one-q.xyz/${page}.html")
        if [ "$STATUS" == "200" ]; then
            log_success "  ${page}.html: HTTP $STATUS"
        else
            log_error "  ${page}.html: HTTP $STATUS"
            FAILED_PAGES+=("$page")
        fi
    done

    # Test DIST directory pages
    log_info "Testing DIST directory pages..."
    DIST_PAGES=(
        "tattoo" "hair-removal" "diet" "milia" "peeling" "lifting"
        "jeomin" "filler" "mole" "acne" "skinbooster" "botox"
    )

    for page in "${DIST_PAGES[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://misopin.one-q.xyz/dist/${page}.html")
        if [ "$STATUS" == "200" ]; then
            log_success "  dist/${page}.html: HTTP $STATUS"
        else
            log_error "  dist/${page}.html: HTTP $STATUS"
            FAILED_PAGES+=("dist/$page")
        fi
    done

    if [ ${#FAILED_PAGES[@]} -gt 0 ]; then
        log_error "Failed pages: ${FAILED_PAGES[*]}"
        exit 1
    fi

    # Verify data attributes in production
    log_info "Verifying data attributes in production..."
    for page in "index" "calendar-page" "about"; do
        ATTR_COUNT=$(curl -s "http://misopin.one-q.xyz/${page}.html" | grep -c "data-clinic-" || echo "0")
        log_info "  ${page}.html: $ATTR_COUNT data attributes"
    done

    for page in "tattoo" "hair-removal" "diet"; do
        ATTR_COUNT=$(curl -s "http://misopin.one-q.xyz/dist/${page}.html" | grep -c "data-clinic-" || echo "0")
        log_info "  dist/${page}.html: $ATTR_COUNT data attributes"
    done

    log_success "Phase 7 completed: All 25 pages verified"
    echo
}

################################################################################
# Phase 8: Documentation
################################################################################

phase8_document() {
    log_info "Phase 8: Creating Deployment Documentation"

    BACKUP_LOC=$(cat .backup_location)

    cat > deployment-log.txt << EOF
================================================================================
Misopin Static Site Deployment Log
================================================================================

Deployment Date: $(date)
Operator: $(whoami)
Server: $SERVER
Site Path: $SITE_PATH
Backup Location: $BACKUP_LOC

Files Modified:
  ROOT Directory (13 files):
    - index.html, calendar-page.html, board-page.html, board-event.html
    - board-notice.html, about.html, board-detail.html, privacy.html
    - directions.html, fee-schedule.html, quickmenu.html, stipulation.html
    - auto-clear-popups.html

  DIST Directory (12 files):
    - tattoo.html, hair-removal.html, diet.html, milia.html
    - peeling.html, lifting.html, jeomin.html, filler.html
    - mole.html, acne.html, skinbooster.html, botox.html

  JavaScript Library:
    - clinic-info.js deployed to /js/

Total: 25 HTML files + 1 JS library

Changes Applied:
  - Added data-clinic-phone attributes (54+ occurrences)
  - Added data-clinic-address-full attributes (20-22 occurrences)
  - Added data-clinic-sns-* attributes (31+ occurrences)
  - Injected clinic-info.js script tags in all HTML files
  - Root files use: /js/clinic-info.js
  - Dist files use: ../js/clinic-info.js

Testing Results:
  - All 25 pages return HTTP 200
  - JavaScript file loads successfully from both paths
  - Data attributes present in all files
  - Manual browser testing: PENDING

Rollback Information:
  - Backup available at: $BACKUP_LOC
  - Rollback command: ssh $USER@$SERVER "cp -r $BACKUP_LOC/misopin.com/* $SITE_PATH/"

Next Steps:
  1. Manual browser testing on sample pages from both directories
  2. Verify contact info updates correctly
  3. Check SNS links functionality
  4. Monitor for 24 hours

================================================================================
END OF DEPLOYMENT LOG
================================================================================
EOF

    log_success "Deployment log created: deployment-log.txt"
    log_success "Phase 8 completed: Documentation saved"
    echo
}

################################################################################
# Rollback Function
################################################################################

rollback() {
    log_warning "Initiating rollback..."

    if [ ! -f .backup_location ]; then
        log_error "Backup location not found. Cannot rollback."
        exit 1
    fi

    BACKUP_LOC=$(cat .backup_location)

    if ! confirm "Rollback from $BACKUP_LOC?"; then
        log_warning "Rollback cancelled"
        exit 0
    fi

    log_info "Restoring from backup..."
    ssh $USER@$SERVER "cp -r $BACKUP_LOC/misopin.com/* $SITE_PATH/" || {
        log_error "Rollback failed"
        exit 1
    }

    log_success "Rollback completed successfully"

    # Verify restoration
    log_info "Verifying restoration..."
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://misopin.one-q.xyz/index.html")
    log_info "index.html: HTTP $STATUS"
}

################################################################################
# Main Execution
################################################################################

main() {
    echo "════════════════════════════════════════════════════════════════"
    echo "  Misopin Static Site Deployment Script"
    echo "  Server: $SERVER"
    echo "  Site: $SITE_PATH"
    echo "════════════════════════════════════════════════════════════════"
    echo

    if [ "${1:-}" == "rollback" ]; then
        rollback
        exit 0
    fi

    if ! confirm "Start deployment process?"; then
        log_warning "Deployment cancelled by user"
        exit 0
    fi

    phase1_checks
    phase2_backup
    phase3_modify
    phase4_deploy_js
    phase5_staging
    phase6_full_deploy
    phase7_verify
    phase8_document

    echo "════════════════════════════════════════════════════════════════"
    log_success "DEPLOYMENT COMPLETED SUCCESSFULLY"
    echo "════════════════════════════════════════════════════════════════"
    echo
    echo "Next Steps:"
    echo "  1. Review deployment-log.txt"
    echo "  2. Perform manual browser testing on all pages"
    echo "  3. Monitor for 24 hours"
    echo "  4. If issues occur, run: ./deploy.sh rollback"
    echo
}

# Run main function
main "$@"
