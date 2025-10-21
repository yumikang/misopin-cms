#!/bin/bash

################################################################################
# Misopin CMS VPS Deployment Script
# Purpose: Deploy Next.js CMS application to VPS server
# Server: 141.164.60.51
# Path: /var/www/misopin-cms
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SERVER="141.164.60.51"
USER="root"
APP_PATH="/var/www/misopin-cms"
APP_NAME="misopin-cms"
PM2_INSTANCES=2
PORT=3001

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

    # Check if build directory exists
    if [ ! -d ".next" ]; then
        log_error "Build directory .next not found. Run 'npm run build' first."
        exit 1
    fi
    log_success "Build directory verified"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_error "node_modules not found. Run 'npm install' first."
        exit 1
    fi
    log_success "Dependencies verified"

    log_success "Phase 1 completed: All checks passed"
    echo
}

################################################################################
# Phase 2: Create Server Backup
################################################################################

phase2_backup() {
    log_info "Phase 2: Creating Server Backup"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="misopin-cms-backup-${TIMESTAMP}.tar.gz"

    log_info "Creating backup on server..."
    ssh $USER@$SERVER "cd /var/www && tar -czf $BACKUP_FILE misopin-cms" || {
        log_warning "Backup creation failed (may not exist yet)"
    }

    log_success "Phase 2 completed: Backup created"
    echo
}

################################################################################
# Phase 3: Build Application
################################################################################

phase3_build() {
    log_info "Phase 3: Building Application"

    log_info "Running production build..."
    npm run build || {
        log_error "Build failed"
        exit 1
    }

    log_success "Phase 3 completed: Build successful"
    echo
}

################################################################################
# Phase 4: Upload Files to Server
################################################################################

phase4_upload() {
    log_info "Phase 4: Uploading Files to Server"

    # Create app directory if it doesn't exist
    log_info "Ensuring app directory exists..."
    ssh $USER@$SERVER "mkdir -p $APP_PATH"

    # Upload necessary files and directories
    log_info "Uploading .next directory..."
    rsync -avz --delete .next/ $USER@$SERVER:$APP_PATH/.next/

    log_info "Uploading public directory..."
    rsync -avz --delete public/ $USER@$SERVER:$APP_PATH/public/

    log_info "Uploading node_modules..."
    rsync -avz --delete node_modules/ $USER@$SERVER:$APP_PATH/node_modules/

    log_info "Uploading configuration files..."
    scp package.json $USER@$SERVER:$APP_PATH/
    scp package-lock.json $USER@$SERVER:$APP_PATH/
    scp next.config.ts $USER@$SERVER:$APP_PATH/

    # Upload prisma schema
    log_info "Uploading Prisma schema..."
    ssh $USER@$SERVER "mkdir -p $APP_PATH/prisma"
    scp prisma/schema.prisma $USER@$SERVER:$APP_PATH/prisma/

    # Upload .env file
    if [ -f ".env.local" ]; then
        log_info "Uploading environment variables..."
        scp .env.local $USER@$SERVER:$APP_PATH/.env.local
    fi

    log_success "Phase 4 completed: Files uploaded"
    echo
}

################################################################################
# Phase 5: Install Dependencies on Server
################################################################################

phase5_dependencies() {
    log_info "Phase 5: Installing Dependencies on Server"

    log_info "Installing npm dependencies..."
    ssh $USER@$SERVER "cd $APP_PATH && npm install --production"

    log_info "Generating Prisma client..."
    ssh $USER@$SERVER "cd $APP_PATH && npx prisma generate"

    log_success "Phase 5 completed: Dependencies installed"
    echo
}

################################################################################
# Phase 6: Restart Application with PM2
################################################################################

phase6_restart() {
    log_info "Phase 6: Restarting Application"

    log_info "Stopping existing PM2 process..."
    ssh $USER@$SERVER "pm2 stop $APP_NAME || true"

    log_info "Starting application with PM2..."
    ssh $USER@$SERVER "cd $APP_PATH && pm2 start npm --name '$APP_NAME' -i $PM2_INSTANCES -- start -- -p $PORT"

    log_info "Saving PM2 process list..."
    ssh $USER@$SERVER "pm2 save"

    log_success "Phase 6 completed: Application restarted"
    echo
}

################################################################################
# Phase 7: Verify Deployment
################################################################################

phase7_verify() {
    log_info "Phase 7: Verifying Deployment"

    # Wait for application to start
    log_info "Waiting for application to start..."
    sleep 5

    # Check PM2 status
    log_info "Checking PM2 status..."
    ssh $USER@$SERVER "pm2 list | grep $APP_NAME"

    # Test HTTP response
    log_info "Testing HTTP response..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://one-q.xyz/")
    if [ "$HTTP_STATUS" == "200" ]; then
        log_success "Application returned HTTP $HTTP_STATUS"
    else
        log_error "Application returned HTTP $HTTP_STATUS"
        exit 1
    fi

    # Test admin page
    log_info "Testing admin page..."
    ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://one-q.xyz/admin")
    if [ "$ADMIN_STATUS" == "200" ] || [ "$ADMIN_STATUS" == "302" ]; then
        log_success "Admin page returned HTTP $ADMIN_STATUS"
    else
        log_warning "Admin page returned HTTP $ADMIN_STATUS"
    fi

    log_success "Phase 7 completed: Deployment verified"
    echo
}

################################################################################
# Rollback Function
################################################################################

rollback() {
    log_warning "Initiating rollback..."

    if ! confirm "Restore from latest backup?"; then
        log_warning "Rollback cancelled"
        exit 0
    fi

    LATEST_BACKUP=$(ssh $USER@$SERVER "ls -t /var/www/misopin-cms-backup-*.tar.gz 2>/dev/null | head -1")

    if [ -z "$LATEST_BACKUP" ]; then
        log_error "No backup found for rollback"
        exit 1
    fi

    log_info "Restoring from $LATEST_BACKUP..."
    ssh $USER@$SERVER "cd /var/www && tar -xzf $LATEST_BACKUP"

    log_info "Restarting application..."
    ssh $USER@$SERVER "pm2 restart $APP_NAME"

    log_success "Rollback completed successfully"
}

################################################################################
# Main Execution
################################################################################

main() {
    echo "════════════════════════════════════════════════════════════════"
    echo "  Misopin CMS VPS Deployment Script"
    echo "  Server: $SERVER"
    echo "  App Path: $APP_PATH"
    echo "  Port: $PORT"
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
    phase3_build
    phase4_upload
    phase5_dependencies
    phase6_restart
    phase7_verify

    echo "════════════════════════════════════════════════════════════════"
    log_success "DEPLOYMENT COMPLETED SUCCESSFULLY"
    echo "════════════════════════════════════════════════════════════════"
    echo
    echo "Application URL: http://one-q.xyz"
    echo "Admin URL: http://one-q.xyz/admin"
    echo
    echo "Next Steps:"
    echo "  1. Test the application in browser"
    echo "  2. Check PM2 logs: ssh $USER@$SERVER 'pm2 logs $APP_NAME'"
    echo "  3. Monitor for issues"
    echo "  4. If issues occur, run: ./scripts/deploy-vps.sh rollback"
    echo
}

# Run main function
main "$@"
