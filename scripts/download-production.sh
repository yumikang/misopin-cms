#!/bin/bash

################################################################################
# Download Production Files Script
# Purpose: Download current production files for local backup and modification
# Server: 141.164.60.51
# Path: /var/www/misopin.com/
################################################################################

set -e
set -u

# Configuration
SERVER="141.164.60.51"
USER="root"
SITE_PATH="/var/www/misopin.com"
LOCAL_BACKUP="./production-backup"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "════════════════════════════════════════════════════════════════"
echo "  Downloading Production Files from Misopin Server"
echo "  Server: $SERVER"
echo "════════════════════════════════════════════════════════════════"
echo

# Test SSH connection
echo -e "${BLUE}[INFO]${NC} Testing SSH connection..."
if ssh -o ConnectTimeout=5 $USER@$SERVER "echo 'Connection successful'" > /dev/null 2>&1; then
    echo -e "${GREEN}[SUCCESS]${NC} SSH connection verified"
else
    echo -e "\033[0;31m[ERROR]\033[0m Cannot connect to $SERVER"
    exit 1
fi

# Create backup directory
echo -e "${BLUE}[INFO]${NC} Creating local backup directory..."
mkdir -p "$LOCAL_BACKUP"

# Download entire site
echo -e "${BLUE}[INFO]${NC} Downloading site files..."
scp -r $USER@$SERVER:$SITE_PATH/ "$LOCAL_BACKUP/" || {
    echo -e "\033[0;31m[ERROR]\033[0m Download failed"
    exit 1
}

# Verify download
echo -e "${BLUE}[INFO]${NC} Verifying downloaded files..."
HTML_COUNT=$(find "$LOCAL_BACKUP/misopin.com" -name "*.html" | wc -l | tr -d ' ')
echo -e "${GREEN}[SUCCESS]${NC} Downloaded $HTML_COUNT HTML files"

# List downloaded files
echo
echo "ROOT directory HTML files:"
ls -1 "$LOCAL_BACKUP/misopin.com"/*.html 2>/dev/null | xargs -n1 basename

if [ -d "$LOCAL_BACKUP/misopin.com/dist" ]; then
    echo
    echo "DIST directory HTML files:"
    ls -1 "$LOCAL_BACKUP/misopin.com/dist"/*.html 2>/dev/null | xargs -n1 basename
fi

echo
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}[SUCCESS]${NC} Download completed"
echo "════════════════════════════════════════════════════════════════"
echo
echo "Files saved to: $LOCAL_BACKUP/misopin.com/"
echo "Next step: Run ./scripts/deploy.sh to start deployment"
echo
