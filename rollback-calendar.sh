#!/bin/bash
# rollback-calendar.sh
#
# Emergency rollback script for calendar integration
# Restores calendar-page.html from most recent backup
#
# Usage: ./rollback-calendar.sh [backup-timestamp]

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================================
# Configuration
# ============================================================
CMS_ROOT="/var/www/misopin-cms/.next/standalone/public/static-pages"
BACKUP_BASE="/var/www/backups"
DOMAIN="https://misopin.one-q.xyz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} $1"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)]${NC} $1"; exit 1; }

# Banner
echo ""
echo "=========================================="
echo "  Emergency Calendar Rollback"
echo "=========================================="
echo ""

# ============================================================
# Find backup to restore
# ============================================================

if [ -n "${1:-}" ]; then
    # Specific backup timestamp provided
    BACKUP_DIR="$BACKUP_BASE/$1"
    if [ ! -d "$BACKUP_DIR" ]; then
        error "❌ Backup directory not found: $BACKUP_DIR"
    fi
    log "Using specified backup: $1"
else
    # Use most recent backup
    LATEST_BACKUP=$(ls -t "$BACKUP_BASE" 2>/dev/null | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
        error "❌ No backups found in $BACKUP_BASE"
    fi

    BACKUP_DIR="$BACKUP_BASE/$LATEST_BACKUP"
    warn "No backup specified, using most recent: $LATEST_BACKUP"
fi

# Verify backup file exists
BACKUP_FILE="$BACKUP_DIR/calendar-page.html.bak"
if [ ! -f "$BACKUP_FILE" ]; then
    error "❌ Backup file not found: $BACKUP_FILE"
fi

log "Found backup file: $BACKUP_FILE"

# ============================================================
# Confirmation
# ============================================================

echo ""
warn "⚠️  This will restore calendar-page.html from backup"
echo "   Backup: $BACKUP_FILE"
echo "   Target: $CMS_ROOT/calendar-page.html"
echo ""
read -p "Continue with rollback? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    log "Rollback cancelled"
    exit 0
fi

# ============================================================
# Perform rollback
# ============================================================

log "🔄 Rolling back calendar-page.html..."

# Create safety backup of current version
SAFETY_BACKUP="$BACKUP_DIR/current-before-rollback.html"
if [ -f "$CMS_ROOT/calendar-page.html" ]; then
    cp "$CMS_ROOT/calendar-page.html" "$SAFETY_BACKUP"
    log "Created safety backup: $SAFETY_BACKUP"
fi

# Restore from backup
cp "$BACKUP_FILE" "$CMS_ROOT/calendar-page.html" || error "❌ Failed to restore backup"

log "✅ File restored from backup"

# ============================================================
# Verification
# ============================================================

log "Verifying rollback..."

# Wait for propagation
sleep 2

# Test page loads
if curl -sf "$DOMAIN/calendar-page.html" > /dev/null 2>&1; then
    log "✅ Page accessible after rollback"
else
    error "❌ Page not accessible after rollback - CRITICAL"
fi

# Test page content
CONTENT_CHECK=$(curl -s "$DOMAIN/calendar-page.html" | head -20)
if echo "$CONTENT_CHECK" | grep -q "<!doctype html"; then
    log "✅ Page content appears valid"
else
    warn "⚠️  Page content may be invalid - manual check recommended"
fi

# ============================================================
# Post-rollback monitoring
# ============================================================

log "Running 5-minute stability check..."
CHECKS_PASSED=0
for i in {1..5}; do
    sleep 60
    if curl -sf "$DOMAIN/calendar-page.html" > /dev/null 2>&1; then
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        log "$(date +%H:%M) - Check $i/5 OK"
    else
        error "❌ Page became unavailable during monitoring"
    fi
done

# ============================================================
# Success
# ============================================================

echo ""
log "============================================"
log "✅ ROLLBACK SUCCESSFUL"
log "============================================"
log "Checks passed: $CHECKS_PASSED/5"
log ""
log "Restored from: $BACKUP_FILE"
log "Safety backup: $SAFETY_BACKUP"
echo ""
log "Next steps:"
log "1. Test page manually: $DOMAIN/calendar-page.html"
log "2. Check browser console for errors"
log "3. Verify old functionality works"
log "4. Investigate deployment failure"
echo ""
log "Optional cleanup (static files - NOT urgent):"
echo "  rm /var/www/misopin.com/js/time-slot-loader.js"
echo "  rm /var/www/misopin.com/css/time-slot-styles.css"
echo ""
