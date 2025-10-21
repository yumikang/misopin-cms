#!/bin/bash

################################################################################
# Deployment Readiness Verification Script
# Checks all prerequisites before deployment
################################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

READY=true

echo "════════════════════════════════════════════════════════════════"
echo "  Misopin Deployment Readiness Verification"
echo "════════════════════════════════════════════════════════════════"
echo

# Check 1: Scripts exist and are executable
echo "1. Checking deployment scripts..."
if [ -x "./scripts/deploy.sh" ]; then
    echo -e "   ${GREEN}✓${NC} deploy.sh found and executable"
else
    echo -e "   ${RED}✗${NC} deploy.sh not found or not executable"
    READY=false
fi

if [ -x "./scripts/download-production.sh" ]; then
    echo -e "   ${GREEN}✓${NC} download-production.sh found and executable"
else
    echo -e "   ${RED}✗${NC} download-production.sh not found or not executable"
    READY=false
fi

# Check 2: clinic-info.js exists
echo
echo "2. Checking JavaScript library..."
if [ -f "./public/js/clinic-info.js" ]; then
    SIZE=$(ls -lh ./public/js/clinic-info.js | awk '{print $5}')
    echo -e "   ${GREEN}✓${NC} clinic-info.js found (Size: $SIZE)"
else
    echo -e "   ${RED}✗${NC} clinic-info.js not found at ./public/js/clinic-info.js"
    READY=false
fi

# Check 3: Documentation exists
echo
echo "3. Checking documentation..."
DOCS=(
    "DEPLOYMENT_QUICKSTART.md"
    "DEPLOYMENT_WORKFLOW.md"
    "deployment-plan.md"
    "DEPLOYMENT_READY.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "./$doc" ]; then
        echo -e "   ${GREEN}✓${NC} $doc"
    else
        echo -e "   ${YELLOW}⚠${NC} $doc (optional)"
    fi
done

# Check 4: SSH connectivity
echo
echo "4. Testing SSH connection..."
if ssh -o ConnectTimeout=5 root@141.164.60.51 "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} SSH connection to 141.164.60.51 verified"
else
    echo -e "   ${RED}✗${NC} Cannot connect to 141.164.60.51 via SSH"
    echo "      Check VPN connection, SSH keys, or network"
    READY=false
fi

# Check 5: Required tools
echo
echo "5. Checking required tools..."
TOOLS=("ssh" "scp" "curl" "sed" "grep")
for tool in "${TOOLS[@]}"; do
    if command -v $tool &> /dev/null; then
        echo -e "   ${GREEN}✓${NC} $tool"
    else
        echo -e "   ${RED}✗${NC} $tool not found"
        READY=false
    fi
done

# Check 6: Working directory
echo
echo "6. Verifying working directory..."
EXPECTED_DIR="/Users/blee/Desktop/cms/misopin-cms"
CURRENT_DIR=$(pwd)
if [ "$CURRENT_DIR" == "$EXPECTED_DIR" ]; then
    echo -e "   ${GREEN}✓${NC} Correct directory: $CURRENT_DIR"
else
    echo -e "   ${YELLOW}⚠${NC} Current directory: $CURRENT_DIR"
    echo "      Expected: $EXPECTED_DIR"
    echo "      Run: cd $EXPECTED_DIR"
fi

# Summary
echo
echo "════════════════════════════════════════════════════════════════"
if [ "$READY" = true ]; then
    echo -e "${GREEN}✓ DEPLOYMENT READY${NC}"
    echo
    echo "All prerequisites met. You can start deployment:"
    echo "  1. ./scripts/download-production.sh"
    echo "  2. ./scripts/deploy.sh"
else
    echo -e "${RED}✗ NOT READY${NC}"
    echo
    echo "Please fix the issues above before deploying."
fi
echo "════════════════════════════════════════════════════════════════"
