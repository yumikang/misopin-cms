#!/bin/bash
# deploy-calendar-integration.sh
#
# Minimal Integration Deployment Script
# Deploys only calendar-page.html to CMS with supporting assets
#
# Usage: ./deploy-calendar-integration.sh [--dry-run]

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================================
# Configuration
# ============================================================
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/var/www/backups/$TIMESTAMP"
STATIC_ROOT="/var/www/misopin.com"
CMS_ROOT="/var/www/misopin-cms/.next/standalone/public/static-pages"
SOURCE_ROOT="/Users/blee/Desktop/cms/misopin-cms/public/static-pages"
DOMAIN="https://misopin.one-q.xyz"

# Parse arguments
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} $1"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }

# Banner
echo ""
echo "=========================================="
echo "  Calendar Integration Deployment"
echo "=========================================="
echo "  Timestamp: $TIMESTAMP"
echo "  Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "PRODUCTION")"
echo "=========================================="
echo ""

# ============================================================
# PHASE 1: Pre-Deployment Validation
# ============================================================
log "Phase 1: Pre-deployment validation"

# Check if running as appropriate user
if [[ $EUID -ne 0 ]] && [[ "$DRY_RUN" = false ]]; then
   warn "This script may need sudo privileges for production deployment"
fi

# Create backup directory
if [[ "$DRY_RUN" = false ]]; then
    mkdir -p "$BACKUP_DIR"
    log "Created backup directory: $BACKUP_DIR"
else
    info "DRY RUN: Would create backup directory: $BACKUP_DIR"
fi

# Backup current calendar page
if [[ "$DRY_RUN" = false ]]; then
    if [ -f "$CMS_ROOT/calendar-page.html" ]; then
        cp "$CMS_ROOT/calendar-page.html" "$BACKUP_DIR/calendar-page.html.bak"
        log "Backed up calendar-page.html"
    else
        warn "No existing calendar-page.html to backup (first deployment?)"
    fi
else
    info "DRY RUN: Would backup calendar-page.html"
fi

# Check CMS health
log "Checking CMS health..."
if curl -sf "$DOMAIN/api/health" > /dev/null 2>&1; then
    log "✅ CMS is healthy"
else
    if [[ "$DRY_RUN" = false ]]; then
        error "❌ CMS health check failed - aborting deployment"
    else
        warn "DRY RUN: CMS health check would be required"
    fi
fi

# Verify source files exist
log "Verifying source files..."
FILES=(
    "$SOURCE_ROOT/calendar-page.html"
    "$SOURCE_ROOT/js/time-slot-loader.js"
    "$SOURCE_ROOT/css/time-slot-styles.css"
)

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "❌ Missing source file: $file"
    fi
done
log "✅ All source files present"

# Verify destination directories exist
if [[ "$DRY_RUN" = false ]]; then
    if [ ! -d "$STATIC_ROOT" ]; then
        error "❌ Static root not found: $STATIC_ROOT"
    fi
    if [ ! -d "$CMS_ROOT" ]; then
        error "❌ CMS root not found: $CMS_ROOT"
    fi
    log "✅ Destination directories exist"
else
    info "DRY RUN: Would verify destination directories"
fi

# ============================================================
# PHASE 2: Static Asset Deployment
# ============================================================
log "Phase 2: Deploying static assets"

# Deploy JavaScript files
log "Deploying JavaScript..."
if [[ "$DRY_RUN" = false ]]; then
    cp "$SOURCE_ROOT/js/time-slot-loader.js" "$STATIC_ROOT/js/" || error "Failed to deploy time-slot-loader.js"

    # Verify JS deployed
    sleep 1
    if ! curl -sf "$DOMAIN/js/time-slot-loader.js" > /dev/null 2>&1; then
        error "❌ time-slot-loader.js not accessible after deployment"
    fi
    log "✅ JavaScript deployed and verified"
else
    info "DRY RUN: Would deploy time-slot-loader.js to $STATIC_ROOT/js/"
    info "DRY RUN: Would verify at $DOMAIN/js/time-slot-loader.js"
fi

# Deploy CSS files
log "Deploying CSS..."
if [[ "$DRY_RUN" = false ]]; then
    cp "$SOURCE_ROOT/css/time-slot-styles.css" "$STATIC_ROOT/css/" || error "Failed to deploy time-slot-styles.css"

    # Deploy minimal-base.css if it exists
    if [ -f "$SOURCE_ROOT/css/minimal-base.css" ]; then
        cp "$SOURCE_ROOT/css/minimal-base.css" "$STATIC_ROOT/css/"
        log "Deployed minimal-base.css"
    fi

    # Verify CSS deployed
    sleep 1
    if ! curl -sf "$DOMAIN/css/time-slot-styles.css" > /dev/null 2>&1; then
        error "❌ time-slot-styles.css not accessible after deployment"
    fi
    log "✅ CSS deployed and verified"
else
    info "DRY RUN: Would deploy time-slot-styles.css to $STATIC_ROOT/css/"
    info "DRY RUN: Would deploy minimal-base.css to $STATIC_ROOT/css/"
    info "DRY RUN: Would verify at $DOMAIN/css/time-slot-styles.css"
fi

# ============================================================
# PHASE 3: CMS HTML Deployment
# ============================================================
log "Phase 3: Deploying calendar-page.html to CMS"

if [[ "$DRY_RUN" = false ]]; then
    # Deploy HTML
    cp "$SOURCE_ROOT/calendar-page.html" "$CMS_ROOT/" || error "Failed to deploy calendar-page.html"
    log "Deployed calendar-page.html to CMS"

    # Optional: Copy JS/CSS to CMS location for consistency
    mkdir -p "$CMS_ROOT/js" "$CMS_ROOT/css"
    cp "$SOURCE_ROOT/js/time-slot-loader.js" "$CMS_ROOT/js/" || warn "Failed to copy JS to CMS (non-critical)"
    cp "$SOURCE_ROOT/css/time-slot-styles.css" "$CMS_ROOT/css/" || warn "Failed to copy CSS to CMS (non-critical)"

    if [ -f "$SOURCE_ROOT/css/minimal-base.css" ]; then
        cp "$SOURCE_ROOT/css/minimal-base.css" "$CMS_ROOT/css/" || warn "Failed to copy minimal-base.css to CMS (non-critical)"
    fi

    log "✅ HTML deployed to CMS"
else
    info "DRY RUN: Would deploy calendar-page.html to $CMS_ROOT/"
    info "DRY RUN: Would copy supporting files to CMS"
fi

# ============================================================
# PHASE 4: Verification & Testing
# ============================================================
log "Phase 4: Verification and testing"

if [[ "$DRY_RUN" = false ]]; then
    # Wait for propagation
    sleep 2

    # Test page loads
    log "Testing page accessibility..."
    if ! curl -sf "$DOMAIN/calendar-page.html" > /dev/null 2>&1; then
        error "❌ calendar-page.html not accessible - CRITICAL FAILURE"
    fi
    log "✅ Page accessible"

    # Test static assets load
    log "Testing static assets..."
    ASSETS_OK=true

    if ! curl -sf "$DOMAIN/js/time-slot-loader.js" > /dev/null 2>&1; then
        warn "⚠️  time-slot-loader.js not accessible"
        ASSETS_OK=false
    fi

    if ! curl -sf "$DOMAIN/css/time-slot-styles.css" > /dev/null 2>&1; then
        warn "⚠️  time-slot-styles.css not accessible"
        ASSETS_OK=false
    fi

    if [ "$ASSETS_OK" = true ]; then
        log "✅ Static assets accessible"
    else
        error "❌ Some assets not accessible - review warnings above"
    fi

    # Test API endpoint
    log "Testing time-slots API..."
    if curl -sf "$DOMAIN/api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-12-01" > /dev/null 2>&1; then
        log "✅ Time-slots API responding"
    else
        warn "⚠️  Time-slots API test failed (may be expected if no data configured)"
    fi

    # Test other pages unchanged
    log "Verifying other pages unchanged..."
    if ! curl -sf "$DOMAIN/about.html" > /dev/null 2>&1; then
        error "❌ about.html not accessible - deployment may have broken other pages"
    fi
    log "✅ Other pages still accessible"

else
    info "DRY RUN: Would verify page accessibility"
    info "DRY RUN: Would test API endpoints"
    info "DRY RUN: Would verify other pages unchanged"
fi

# ============================================================
# SUCCESS
# ============================================================
echo ""
log "============================================"
log "✅ DEPLOYMENT SUCCESSFUL"
log "============================================"

if [[ "$DRY_RUN" = false ]]; then
    log "Backup location: $BACKUP_DIR"
    log "Deployed files:"
    log "  - calendar-page.html → $CMS_ROOT/"
    log "  - time-slot-loader.js → $STATIC_ROOT/js/"
    log "  - time-slot-styles.css → $STATIC_ROOT/css/"
    echo ""
    log "Next steps:"
    log "1. Test calendar page: $DOMAIN/calendar-page.html"
    log "2. Monitor for 10 minutes"
    log "3. Check browser console for errors"
    log "4. Test form submission"
    echo ""
    log "Rollback command:"
    echo "  cp $BACKUP_DIR/calendar-page.html.bak $CMS_ROOT/calendar-page.html"
    echo ""
    log "Rollback script:"
    echo "  ./rollback-calendar.sh"
else
    info ""
    info "DRY RUN COMPLETE - No changes made"
    info "Run without --dry-run to deploy to production"
fi

echo ""
