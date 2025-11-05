#!/bin/bash
# deploy-calendar-remote.sh
#
# Remote deployment script using rsync/ssh
# Deploys calendar-page.html integration from local to production
#
# Usage: ./deploy-calendar-remote.sh [--dry-run]

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================================
# Configuration
# ============================================================
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SOURCE_ROOT="./public/static-pages"
REMOTE_HOST="root@cms.one-q.xyz"
REMOTE_STATIC="/var/www/misopin.com"
REMOTE_CMS="/var/www/misopin-cms/.next/standalone/public/static-pages"
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
echo "  Calendar Integration Remote Deployment"
echo "=========================================="
echo "  Timestamp: $TIMESTAMP"
echo "  Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "PRODUCTION")"
echo "=========================================="
echo ""

# ============================================================
# Phase 1: Pre-deployment validation
# ============================================================
log "Phase 1: Pre-deployment validation"

# Check source files exist
log "Verifying source files..."
if [[ ! -f "$SOURCE_ROOT/js/time-slot-loader.js" ]]; then
    error "❌ Missing: time-slot-loader.js"
fi
if [[ ! -f "$SOURCE_ROOT/css/time-slot-styles.css" ]]; then
    error "❌ Missing: time-slot-styles.css"
fi
if [[ ! -f "$SOURCE_ROOT/css/minimal-base.css" ]]; then
    error "❌ Missing: minimal-base.css"
fi
if [[ ! -f "$SOURCE_ROOT/calendar-page.html" ]]; then
    error "❌ Missing: calendar-page.html"
fi
log "✅ All source files present"

# Check SSH connection
log "Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 "$REMOTE_HOST" "echo 'Connection OK'" &>/dev/null; then
    error "❌ Cannot connect to $REMOTE_HOST"
fi
log "✅ SSH connection successful"

# Check CMS health
log "Checking CMS health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/health" || echo "000")
if [[ "$HTTP_CODE" != "200" ]]; then
    warn "⚠️  CMS health check returned $HTTP_CODE"
else
    log "✅ CMS is healthy"
fi

if [ "$DRY_RUN" = true ]; then
    info "DRY RUN: Would create backup on remote server"
else
    # Create backup on remote server
    log "Creating backup on remote server..."
    ssh "$REMOTE_HOST" "mkdir -p /var/www/backups/$TIMESTAMP"
    ssh "$REMOTE_HOST" "test -f $REMOTE_CMS/calendar-page.html && cp $REMOTE_CMS/calendar-page.html /var/www/backups/$TIMESTAMP/ || echo 'No existing file to backup'"
    log "✅ Backup created"
fi

# ============================================================
# Phase 2: Deploy static assets (JS/CSS to static site)
# ============================================================
log "Phase 2: Deploying static assets"

if [ "$DRY_RUN" = true ]; then
    info "DRY RUN: Would deploy JS to $REMOTE_STATIC/js/"
    info "DRY RUN: Would deploy CSS to $REMOTE_STATIC/css/"
else
    log "Deploying JavaScript..."
    rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
      "$SOURCE_ROOT/js/time-slot-loader.js" \
      "$REMOTE_HOST:$REMOTE_STATIC/js/"
    log "✅ JavaScript deployed"

    log "Deploying CSS..."
    rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
      "$SOURCE_ROOT/css/time-slot-styles.css" \
      "$SOURCE_ROOT/css/minimal-base.css" \
      "$REMOTE_HOST:$REMOTE_STATIC/css/"
    log "✅ CSS deployed"

    # Set permissions
    log "Setting permissions..."
    ssh "$REMOTE_HOST" "chown -R www-data:www-data $REMOTE_STATIC/js/time-slot-loader.js $REMOTE_STATIC/css/time-slot-styles.css $REMOTE_STATIC/css/minimal-base.css"
    ssh "$REMOTE_HOST" "chmod 644 $REMOTE_STATIC/js/time-slot-loader.js $REMOTE_STATIC/css/time-slot-styles.css $REMOTE_STATIC/css/minimal-base.css"
    log "✅ Permissions set"
fi

# ============================================================
# Phase 3: Deploy calendar-page.html to CMS
# ============================================================
log "Phase 3: Deploying calendar-page.html to CMS"

if [ "$DRY_RUN" = true ]; then
    info "DRY RUN: Would deploy calendar-page.html to $REMOTE_CMS/"
    info "DRY RUN: Would deploy supporting files (JS/CSS) to CMS"
else
    log "Deploying calendar-page.html..."
    rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
      "$SOURCE_ROOT/calendar-page.html" \
      "$REMOTE_HOST:$REMOTE_CMS/"
    log "✅ calendar-page.html deployed"

    log "Deploying supporting files to CMS..."
    ssh "$REMOTE_HOST" "mkdir -p $REMOTE_CMS/js $REMOTE_CMS/css"
    rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
      "$SOURCE_ROOT/js/time-slot-loader.js" \
      "$REMOTE_HOST:$REMOTE_CMS/js/"
    rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
      "$SOURCE_ROOT/css/time-slot-styles.css" \
      "$SOURCE_ROOT/css/minimal-base.css" \
      "$REMOTE_HOST:$REMOTE_CMS/css/"
    log "✅ Supporting files deployed"

    # Set permissions
    log "Setting permissions..."
    ssh "$REMOTE_HOST" "chown -R www-data:www-data $REMOTE_CMS"
    ssh "$REMOTE_HOST" "chmod -R 644 $REMOTE_CMS/*.html $REMOTE_CMS/js/*.js $REMOTE_CMS/css/*.css"
    log "✅ Permissions set"

    # Reload services
    log "Reloading Caddy..."
    ssh "$REMOTE_HOST" "systemctl reload caddy"
    log "✅ Caddy reloaded"

    log "Reloading PM2 (graceful)..."
    ssh "$REMOTE_HOST" "cd /var/www/misopin-cms && pm2 reload misopin-cms --update-env"
    log "✅ PM2 reloaded"

    # Wait for services to stabilize
    log "Waiting for services to stabilize (10s)..."
    sleep 10
fi

# ============================================================
# Phase 4: Verification
# ============================================================
log "Phase 4: Verification and testing"

if [ "$DRY_RUN" = true ]; then
    info "DRY RUN: Would verify page accessibility"
    info "DRY RUN: Would test API endpoints"
    info "DRY RUN: Would verify other pages unchanged"
else
    log "Verifying calendar page..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/static-pages/calendar-page.html")
    if [[ "$HTTP_CODE" == "200" ]]; then
        log "✅ Calendar page accessible (200 OK)"
    else
        error "❌ Calendar page returned $HTTP_CODE"
    fi

    log "Testing API endpoints..."
    API_SERVICES=$(curl -s "$DOMAIN/api/public/services" | grep -o '"success":true' || echo "")
    API_SLOTS=$(curl -s "$DOMAIN/api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-11-05" | grep -o '"success":true' || echo "")

    if [[ -n "$API_SERVICES" && -n "$API_SLOTS" ]]; then
        log "✅ API endpoints responding"
    else
        warn "⚠️  API endpoints may have issues"
    fi

    log "Verifying other pages unchanged..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/")
    if [[ "$HTTP_CODE" == "200" ]]; then
        log "✅ Homepage still accessible"
    else
        warn "⚠️  Homepage returned $HTTP_CODE"
    fi
fi

# ============================================================
# Completion
# ============================================================
echo ""
log "============================================"
log "✅ DEPLOYMENT SUCCESSFUL"
log "============================================"

if [ "$DRY_RUN" = true ]; then
    info ""
    info "DRY RUN COMPLETE - No changes made"
    info "Run without --dry-run to deploy to production"
else
    echo ""
    log "Deployment Details:"
    log "  - Timestamp: $TIMESTAMP"
    log "  - Backup: /var/www/backups/$TIMESTAMP"
    log "  - Calendar Page: $DOMAIN/static-pages/calendar-page.html"
    log "  - Time Slots API: $DOMAIN/api/public/reservations/time-slots"
    log "  - Services API: $DOMAIN/api/public/services"
    echo ""
    log "Next Steps:"
    log "  1. Run verification: ./verify-deployment.sh"
    log "  2. Monitor for 15 minutes"
    log "  3. Check metrics: pageLoadTime, apiResponseTime, errorRate"
    log "  4. If issues: ./rollback-calendar.sh"
    echo ""
    warn "⚠️  Monitor deployment for issues. Rollback available if needed."
fi

echo ""
