#!/bin/bash
# Static File Deployment Script for one-q.xyz
# Deploy modified/root/ files to production server

set -e  # Exit on error

# Configuration
LOCAL_PATH="/Users/blee/Desktop/cms/misopin-cms/modified/root"
SERVER_USER="blee"
SERVER_HOST="your-server-ip-or-domain"  # UPDATE THIS
REMOTE_PATH="/var/www/one-q/html"  # UPDATE THIS after verifying server config

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}Misopin Static Site Deployment${NC}"
echo -e "${YELLOW}======================================${NC}"

# Step 1: Verify local files
echo -e "\n${GREEN}Step 1: Verifying local files...${NC}"
if [ ! -d "$LOCAL_PATH" ]; then
    echo -e "${RED}Error: Local path does not exist: $LOCAL_PATH${NC}"
    exit 1
fi

echo "Files to be deployed:"
ls -lh "$LOCAL_PATH" | grep "^-" | wc -l | xargs echo "  HTML/Static files:"
ls -lh "$LOCAL_PATH/js" 2>/dev/null | grep "^-" | wc -l | xargs echo "  JavaScript files:" || echo "  JavaScript files: 0"

# Step 2: Check API client
echo -e "\n${GREEN}Step 2: Checking API client configuration...${NC}"
if [ -f "$LOCAL_PATH/js/api-client.js" ]; then
    if grep -q "one-q.xyz" "$LOCAL_PATH/js/api-client.js"; then
        echo -e "  ${GREEN}✓${NC} API client configured for one-q.xyz"
    else
        echo -e "  ${YELLOW}⚠${NC} Warning: API client may not be configured for one-q.xyz"
    fi
else
    echo -e "  ${RED}✗${NC} Error: api-client.js not found!"
    exit 1
fi

# Step 3: Dry run
echo -e "\n${GREEN}Step 3: Performing dry run...${NC}"
echo "This will show what would be transferred without actually doing it."
read -p "Continue with dry run? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

rsync -avzn --delete \
  --exclude='.DS_Store' \
  --exclude='*.swp' \
  --exclude='.git' \
  "$LOCAL_PATH/" \
  "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/"

# Step 4: Confirm actual deployment
echo -e "\n${YELLOW}Step 4: Ready to deploy${NC}"
echo "Server: $SERVER_USER@$SERVER_HOST"
echo "Remote path: $REMOTE_PATH"
read -p "Proceed with actual deployment? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Step 5: Actual deployment
echo -e "\n${GREEN}Step 5: Deploying files...${NC}"
rsync -avz --delete \
  --exclude='.DS_Store' \
  --exclude='*.swp' \
  --exclude='.git' \
  "$LOCAL_PATH/" \
  "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/"

# Step 6: Set permissions
echo -e "\n${GREEN}Step 6: Setting permissions...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" \
  "sudo chown -R www-data:www-data $REMOTE_PATH && \
   sudo chmod -R 755 $REMOTE_PATH && \
   sudo find $REMOTE_PATH -type f -exec chmod 644 {} \;"

# Step 7: Verify deployment
echo -e "\n${GREEN}Step 7: Verifying deployment...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" \
  "ls -lh $REMOTE_PATH | head -20"

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "\nNext steps:"
echo "1. Test site: http://one-q.xyz"
echo "2. Check API client console: window.checkPopupSystem()"
echo "3. Monitor logs: sudo tail -f /var/log/nginx/error.log"
