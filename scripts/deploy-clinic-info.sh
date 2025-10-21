#!/bin/bash

# Deployment Script: Clinic Info Feature
# Date: 2025-10-14
# Purpose: Deploy clinic info management feature to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_HOST="root@141.164.60.51"
PROD_PATH="/var/www/misopin-cms"
DB_PASSWORD="MisoPinCMS2025!@#SecurePass"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

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

# Error handler
error_exit() {
    log_error "$1"
    log_error "Deployment failed. Review logs above for details."
    exit 1
}

# Phase 1: Pre-Deployment Validation
phase1_validation() {
    log_info "=== PHASE 1: PRE-DEPLOYMENT VALIDATION ==="

    # Step 1.1: Verify local build
    log_info "Step 1.1: Verifying local build..."
    npm run build || error_exit "Local build failed"
    log_success "Local build successful"

    # Step 1.2: Create production backup
    log_info "Step 1.2: Creating production backup..."
    ssh $PROD_HOST "cd /var/www && tar -czf misopin-cms-backup-${TIMESTAMP}.tar.gz misopin-cms/" || error_exit "Production backup failed"
    log_success "Production backup created: misopin-cms-backup-${TIMESTAMP}.tar.gz"

    # Backup database
    log_info "Backing up production database..."
    ssh $PROD_HOST "PGPASSWORD='${DB_PASSWORD}' pg_dump -h 127.0.0.1 -U misopin_user misopin_cms > /root/misopin_cms_backup_${TIMESTAMP}.sql" || error_exit "Database backup failed"
    log_success "Database backup created: misopin_cms_backup_${TIMESTAMP}.sql"

    # Step 1.3: Test database connection
    log_info "Step 1.3: Testing database connection..."
    ssh $PROD_HOST "PGPASSWORD='${DB_PASSWORD}' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c 'SELECT version();'" > /dev/null || error_exit "Database connection failed"
    log_success "Database connection successful"

    log_success "Phase 1 completed successfully"
    echo ""
}

# Phase 2: Database Migration
phase2_migration() {
    log_info "=== PHASE 2: DATABASE MIGRATION ==="

    # Step 2.1: Upload migration files
    log_info "Step 2.1: Uploading migration files..."
    ssh $PROD_HOST "mkdir -p ${PROD_PATH}/prisma/migrations/20251014151930_add_clinic_info_model"
    scp prisma/migrations/20251014151930_add_clinic_info_model/migration.sql ${PROD_HOST}:${PROD_PATH}/prisma/migrations/20251014151930_add_clinic_info_model/ || error_exit "Migration file upload failed"
    log_success "Migration files uploaded"

    # Step 2.2: Update Prisma schema
    log_info "Step 2.2: Updating Prisma schema..."
    scp prisma/schema.prisma ${PROD_HOST}:${PROD_PATH}/prisma/ || error_exit "Schema upload failed"
    log_success "Prisma schema updated"

    # Step 2.3: Run migration
    log_info "Step 2.3: Running database migration..."
    ssh $PROD_HOST "cd ${PROD_PATH} && npx prisma migrate deploy" || error_exit "Migration failed"
    log_success "Database migration completed"

    # Verify migration
    log_info "Verifying migration..."
    ssh $PROD_HOST "PGPASSWORD='${DB_PASSWORD}' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c '\d clinic_info'" > /dev/null || error_exit "Migration verification failed"
    log_success "Migration verified: clinic_info table exists"

    # Step 2.4: Regenerate Prisma client
    log_info "Step 2.4: Regenerating Prisma client..."
    ssh $PROD_HOST "cd ${PROD_PATH} && npx prisma generate" || error_exit "Prisma generate failed"
    log_success "Prisma client regenerated"

    log_success "Phase 2 completed successfully"
    echo ""
}

# Phase 3: Code Deployment
phase3_deployment() {
    log_info "=== PHASE 3: CODE DEPLOYMENT ==="

    # Step 3.1: Upload admin API
    log_info "Step 3.1: Uploading admin API route..."
    ssh $PROD_HOST "mkdir -p ${PROD_PATH}/app/api/admin/clinic-info"
    scp app/api/admin/clinic-info/route.ts ${PROD_HOST}:${PROD_PATH}/app/api/admin/clinic-info/ || error_exit "Admin API upload failed"
    log_success "Admin API uploaded"

    # Step 3.2: Upload admin UI component
    log_info "Step 3.2: Uploading admin UI component..."
    scp app/admin/settings/components/ClinicInfoSettings.tsx ${PROD_HOST}:${PROD_PATH}/app/admin/settings/components/ || error_exit "UI component upload failed"
    log_success "Admin UI component uploaded"

    # Step 3.3: Update settings page
    log_info "Step 3.3: Updating settings page..."
    scp app/admin/settings/page.tsx ${PROD_HOST}:${PROD_PATH}/app/admin/settings/ || error_exit "Settings page upload failed"
    log_success "Settings page updated"

    # Step 3.4: Build production
    log_info "Step 3.4: Building production..."
    log_warning "This may take 2-3 minutes..."
    ssh $PROD_HOST "cd ${PROD_PATH} && npm run build" || error_exit "Production build failed"
    log_success "Production build completed"

    # Step 3.5: Restart PM2
    log_info "Step 3.5: Restarting PM2..."
    ssh $PROD_HOST "pm2 restart misopin-cms" || error_exit "PM2 restart failed"
    sleep 5  # Wait for processes to stabilize
    log_success "PM2 restarted"

    log_success "Phase 3 completed successfully"
    echo ""
}

# Phase 4: Post-Deployment Verification
phase4_verification() {
    log_info "=== PHASE 4: POST-DEPLOYMENT VERIFICATION ==="

    # Step 4.1: Database verification
    log_info "Step 4.1: Verifying database..."
    ssh $PROD_HOST "PGPASSWORD='${DB_PASSWORD}' psql -h 127.0.0.1 -U misopin_user -d misopin_cms -c 'SELECT COUNT(*) FROM clinic_info;'" > /dev/null || error_exit "Database verification failed"
    log_success "Database verification passed"

    # Step 4.2: API health check
    log_info "Step 4.2: Testing public API..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://cms.one-q.xyz/api/public/clinic-info)
    if [ "$HTTP_CODE" == "404" ] || [ "$HTTP_CODE" == "200" ]; then
        log_success "Public API responding (HTTP $HTTP_CODE)"
    else
        error_exit "Public API check failed (HTTP $HTTP_CODE)"
    fi

    # Step 4.3: Check PM2 status
    log_info "Step 4.3: Checking PM2 status..."
    ssh $PROD_HOST "pm2 list | grep misopin-cms | grep online" > /dev/null || error_exit "PM2 processes not running"
    log_success "PM2 processes running"

    # Step 4.4: Check for errors in logs
    log_info "Step 4.4: Checking logs for errors..."
    ERROR_COUNT=$(ssh $PROD_HOST "pm2 logs misopin-cms --lines 50 --nostream --err" | grep -c "Error" || true)
    if [ "$ERROR_COUNT" -gt 5 ]; then
        log_warning "Found $ERROR_COUNT errors in recent logs. Review manually."
    else
        log_success "No critical errors in logs"
    fi

    log_success "Phase 4 completed successfully"
    echo ""
}

# Phase 5: Final Summary
phase5_summary() {
    log_info "=== PHASE 5: DEPLOYMENT SUMMARY ==="
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Backup Information:"
    echo "  - Code backup: misopin-cms-backup-${TIMESTAMP}.tar.gz"
    echo "  - Database backup: misopin_cms_backup_${TIMESTAMP}.sql"
    echo ""
    echo "Next Steps:"
    echo "  1. Login to admin panel: https://cms.one-q.xyz/admin/settings"
    echo "  2. Navigate to '클리닉 정보' tab"
    echo "  3. Create initial clinic info record"
    echo "  4. Test public API: https://cms.one-q.xyz/api/public/clinic-info"
    echo "  5. Monitor logs for 24 hours: ssh $PROD_HOST 'pm2 logs misopin-cms'"
    echo ""
    echo "Verification Checklist:"
    echo "  [ ] Admin UI loads without errors"
    echo "  [ ] Clinic info form is functional"
    echo "  [ ] Can create/update clinic info"
    echo "  [ ] Public API returns data after creation"
    echo "  [ ] No errors in PM2 logs after 10 minutes"
    echo ""
    log_info "Deployment completed at $(date)"
}

# Rollback function
rollback() {
    log_error "=== INITIATING ROLLBACK ==="
    log_info "Restoring from backup: misopin-cms-backup-${TIMESTAMP}.tar.gz"

    ssh $PROD_HOST "cd /var/www && rm -rf misopin-cms && tar -xzf misopin-cms-backup-${TIMESTAMP}.tar.gz" || {
        log_error "Rollback failed! Manual intervention required!"
        exit 1
    }

    log_info "Restarting PM2..."
    ssh $PROD_HOST "pm2 restart misopin-cms"

    log_success "Rollback completed. System restored to previous state."
    exit 1
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  Clinic Info Feature Deployment"
    echo "  Target: Production (cms.one-q.xyz)"
    echo "  Date: $(date)"
    echo "=========================================="
    echo ""

    log_warning "This script will deploy clinic info feature to production."
    log_warning "Estimated time: 45 minutes"
    echo ""
    read -p "Continue with deployment? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi

    echo ""
    log_info "Starting deployment..."
    echo ""

    # Execute phases
    phase1_validation || rollback
    phase2_migration || rollback
    phase3_deployment || rollback
    phase4_verification || rollback
    phase5_summary
}

# Trap errors and rollback
trap rollback ERR

# Run main function
main
