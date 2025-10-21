#!/bin/bash
# Server Verification Script
# Run this on your server to identify Nginx configuration and web root

set -e

echo "=========================================="
echo "Server Configuration Verification"
echo "=========================================="

# Check OS
echo -e "\n1. Operating System:"
uname -a

# Check Nginx installation
echo -e "\n2. Nginx Installation:"
which nginx && nginx -v || echo "Nginx not found in PATH"

# Find Nginx config files
echo -e "\n3. Nginx Configuration Files:"
echo "Main config:"
ls -lh /etc/nginx/nginx.conf 2>/dev/null || echo "  Not found"

echo -e "\nSites available:"
ls -lh /etc/nginx/sites-available/ 2>/dev/null || echo "  Not found"

echo -e "\nSites enabled:"
ls -lh /etc/nginx/sites-enabled/ 2>/dev/null || echo "  Not found"

# Check for one-q.xyz config
echo -e "\n4. Domain-specific Configuration:"
if [ -f "/etc/nginx/sites-enabled/one-q.xyz" ]; then
    echo "Found one-q.xyz configuration:"
    sudo cat /etc/nginx/sites-enabled/one-q.xyz | grep -E "server_name|root|listen" || true
elif [ -f "/etc/nginx/sites-available/one-q.xyz" ]; then
    echo "Found one-q.xyz in sites-available (not enabled):"
    sudo cat /etc/nginx/sites-available/one-q.xyz | grep -E "server_name|root|listen" || true
else
    echo "No one-q.xyz specific config found"
    echo "Checking default config:"
    sudo cat /etc/nginx/sites-enabled/default 2>/dev/null | grep -E "server_name|root|listen" || echo "  Default config not found"
fi

# Check web root directories
echo -e "\n5. Web Root Directories:"
echo "/var/www/ contents:"
sudo ls -lah /var/www/ 2>/dev/null || echo "  /var/www/ not found"

echo -e "\n/var/www/html/ (if exists):"
sudo ls -lah /var/www/html/ 2>/dev/null | head -10 || echo "  /var/www/html/ not found"

echo -e "\n/var/www/one-q/ (if exists):"
sudo ls -lah /var/www/one-q/ 2>/dev/null || echo "  /var/www/one-q/ not found"

# Check Nginx status
echo -e "\n6. Nginx Service Status:"
sudo systemctl status nginx --no-pager -l || sudo service nginx status || echo "Could not check Nginx status"

# Check ports
echo -e "\n7. Listening Ports:"
sudo netstat -tlnp 2>/dev/null | grep nginx || sudo ss -tlnp | grep nginx || echo "Could not check listening ports"

# Check Caddy (for CMS)
echo -e "\n8. Caddy Installation (for CMS):"
which caddy && caddy version || echo "Caddy not found in PATH"

echo -e "\n9. Caddy Configuration (if exists):"
ls -lh /etc/caddy/Caddyfile 2>/dev/null && sudo cat /etc/caddy/Caddyfile | head -20 || echo "  Caddyfile not found"

# Recommended deployment path
echo -e "\n=========================================="
echo "Recommendations:"
echo "=========================================="
echo "Based on standard Nginx setups, likely deployment path is one of:"
echo "  1. /var/www/one-q/html/"
echo "  2. /var/www/html/"
echo "  3. /var/www/one-q/"
echo ""
echo "Update deploy-static.sh with the correct path before running deployment."
