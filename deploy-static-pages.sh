#!/bin/bash

################################################################################
# Static Pages Deployment Script
# Purpose: Deploy missing static pages and favicon files
# Server: 141.164.60.51
################################################################################

set -e

# Configuration
SERVER="141.164.60.51"
USER="root"
CMS_SITE_PATH="/var/www/misopin-cms/.next/standalone/public/static-pages"
STATIC_SITE_PATH="/var/www/misopin.com"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "════════════════════════════════════════════════════════════════"
echo "  Static Pages & Favicon Deployment"
echo "  Server: $SERVER (as $USER)"
echo "════════════════════════════════════════════════════════════════"
echo

# Check SSH connectivity
log_info "Testing SSH connection..."
if ssh -o ConnectTimeout=5 $USER@$SERVER "echo 'Connected'" > /dev/null 2>&1; then
    log_success "SSH connection verified"
else
    log_error "Cannot connect to $SERVER via SSH"
    log_warning "Try again later or use FTP/SFTP"
    exit 1
fi

# Deploy HTML files to CMS
log_info "Deploying 20 HTML files to CMS..."
ssh $USER@$SERVER "mkdir -p $CMS_SITE_PATH"

rsync -avz --progress \
  ./public/static-pages/*.html \
  $USER@$SERVER:$CMS_SITE_PATH/ || {
    log_error "Failed to deploy HTML files"
    exit 1
}

log_success "HTML files deployed to $CMS_SITE_PATH"

# Deploy favicon files to static site
log_info "Deploying 6 favicon files..."

# Copy from Misopin-renew directory
cd /Users/blee/Desktop/cms/Misopin-renew

rsync -avz --progress \
  favicon.ico \
  favicon-16x16.png \
  favicon-32x32.png \
  apple-touch-icon.png \
  android-chrome-192x192.png \
  android-chrome-512x512.png \
  $USER@$SERVER:$STATIC_SITE_PATH/ || {
    log_error "Failed to deploy favicon files"
    exit 1
}

log_success "Favicon files deployed to $STATIC_SITE_PATH"

# Verify deployment
log_info "Verifying deployment..."

# Count HTML files
HTML_COUNT=$(ssh $USER@$SERVER "ls $CMS_SITE_PATH/*.html 2>/dev/null | wc -l" | tr -d ' ')
log_info "HTML files on server: $HTML_COUNT"

# Check favicon files
FAVICON_COUNT=$(ssh $USER@$SERVER "ls $STATIC_SITE_PATH/favicon* $STATIC_SITE_PATH/*chrome* $STATIC_SITE_PATH/apple-touch-icon.png 2>/dev/null | wc -l" | tr -d ' ')
log_info "Favicon files on server: $FAVICON_COUNT"

if [ "$HTML_COUNT" -ge 20 ] && [ "$FAVICON_COUNT" -ge 6 ]; then
    log_success "Deployment verified!"
else
    log_warning "File counts may be incorrect"
    log_warning "HTML: $HTML_COUNT (expected 20+)"
    log_warning "Favicon: $FAVICON_COUNT (expected 6)"
fi

echo
echo "════════════════════════════════════════════════════════════════"
log_success "DEPLOYMENT COMPLETED"
echo "════════════════════════════════════════════════════════════════"
echo
echo "Next Steps:"
echo "  1. Test pages in browser:"
echo "     http://141.164.60.51/about.html"
echo "     http://141.164.60.51/privacy.html"
echo "     http://141.164.60.51/quickmenu.html"
echo
echo "  2. Verify favicon:"
echo "     http://141.164.60.51/favicon.ico"
echo
echo "  3. Check for 404 errors (should be fixed)"
echo
