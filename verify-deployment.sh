#!/bin/bash
# verify-deployment.sh
#
# Post-deployment verification script
# Comprehensive testing of calendar integration
#
# Usage: ./verify-deployment.sh

set -e  # Exit on error

# ============================================================
# Configuration
# ============================================================
DOMAIN="https://misopin.one-q.xyz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNED=0

# ============================================================
# Test functions
# ============================================================

test_passed() {
    echo -e "${GREEN}✅ PASS${NC} - $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

test_failed() {
    echo -e "${RED}❌ FAIL${NC} - $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

test_warned() {
    echo -e "${YELLOW}⚠️  WARN${NC} - $1"
    TESTS_WARNED=$((TESTS_WARNED + 1))
}

test_info() {
    echo -e "${BLUE}ℹ️  INFO${NC} - $1"
}

# ============================================================
# Banner
# ============================================================

echo ""
echo "=========================================="
echo "  Post-Deployment Verification"
echo "=========================================="
echo "  Domain: $DOMAIN"
echo "  Time: $(date +%Y-%m-%d\ %H:%M:%S)"
echo "=========================================="
echo ""

# ============================================================
# Test Suite
# ============================================================

# Test 1: Calendar page loads
echo "Test 1: Calendar page accessibility"
if curl -sf "$DOMAIN/calendar-page.html" > /dev/null 2>&1; then
    test_passed "calendar-page.html loads successfully"
else
    test_failed "calendar-page.html failed to load"
fi

# Test 2: HTTP status code
echo ""
echo "Test 2: HTTP status code"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/calendar-page.html")
if [ "$STATUS" = "200" ]; then
    test_passed "Returns 200 OK (status: $STATUS)"
else
    test_failed "Non-200 status code: $STATUS"
fi

# Test 3: Content type
echo ""
echo "Test 3: Content type"
CONTENT_TYPE=$(curl -sI "$DOMAIN/calendar-page.html" | grep -i "content-type" | awk '{print $2}')
if echo "$CONTENT_TYPE" | grep -qi "text/html"; then
    test_passed "Correct content type: $CONTENT_TYPE"
else
    test_warned "Unexpected content type: $CONTENT_TYPE"
fi

# Test 4: JavaScript files load
echo ""
echo "Test 4: JavaScript files"

JS_FILES=(
    "js/vendor/jquery-3.7.1.min.js"
    "js/time-slot-loader.js"
    "js/api-client.js"
)

for js in "${JS_FILES[@]}"; do
    if curl -sf "$DOMAIN/$js" > /dev/null 2>&1; then
        test_passed "$js loads successfully"
    else
        test_failed "$js failed to load"
    fi
done

# Test 5: CSS files load
echo ""
echo "Test 5: CSS files"

CSS_FILES=(
    "css/vendor/default.css"
    "css/time-slot-styles.css"
    "css/components/top_menu.css"
)

for css in "${CSS_FILES[@]}"; do
    if curl -sf "$DOMAIN/$css" > /dev/null 2>&1; then
        test_passed "$css loads successfully"
    else
        test_failed "$css failed to load"
    fi
done

# Test 6: API health
echo ""
echo "Test 6: API endpoints"

if curl -sf "$DOMAIN/api/health" > /dev/null 2>&1; then
    test_passed "API health endpoint responding"
else
    test_failed "API health endpoint not responding"
fi

# Test 7: Time slots API
echo ""
echo "Test 7: Time slots API"
API_RESPONSE=$(curl -s "$DOMAIN/api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-12-01")

if echo "$API_RESPONSE" | grep -q '"success"'; then
    test_passed "Time slots API responding with JSON"

    # Check if success is true
    if echo "$API_RESPONSE" | grep -q '"success":true'; then
        test_passed "Time slots API returns success:true"
    else
        test_warned "Time slots API returns success:false (may be expected)"
    fi
else
    test_warned "Time slots API response format unexpected"
fi

# Test 8: Other pages unchanged
echo ""
echo "Test 8: Other pages unchanged"

OTHER_PAGES=(
    "index.html"
    "about.html"
    "botox.html"
)

for page in "${OTHER_PAGES[@]}"; do
    if curl -sf "$DOMAIN/$page" > /dev/null 2>&1; then
        test_passed "$page still accessible"
    else
        test_failed "$page not accessible - CRITICAL"
    fi
done

# Test 9: Page content validation
echo ""
echo "Test 9: Page content validation"

PAGE_CONTENT=$(curl -s "$DOMAIN/calendar-page.html")

# Check for essential elements
if echo "$PAGE_CONTENT" | grep -q "<!doctype html"; then
    test_passed "Valid HTML doctype"
else
    test_failed "Missing or invalid HTML doctype"
fi

if echo "$PAGE_CONTENT" | grep -q "TimeSlotLoader"; then
    test_passed "TimeSlotLoader script present"
else
    test_warned "TimeSlotLoader script not found in HTML"
fi

if echo "$PAGE_CONTENT" | grep -q "time-slot-loader.js"; then
    test_passed "time-slot-loader.js script tag present"
else
    test_failed "time-slot-loader.js script tag missing"
fi

if echo "$PAGE_CONTENT" | grep -q "time-slot-styles.css"; then
    test_passed "time-slot-styles.css link tag present"
else
    test_warned "time-slot-styles.css link tag not found"
fi

# Test 10: Form elements present
echo ""
echo "Test 10: Form elements validation"

FORM_ELEMENTS=(
    'id="sh_service"'
    'id="sh_checkday"'
    'id="sh_checktime"'
    'name="inq_popup"'
)

for element in "${FORM_ELEMENTS[@]}"; do
    if echo "$PAGE_CONTENT" | grep -q "$element"; then
        test_passed "Form element $element found"
    else
        test_failed "Form element $element missing"
    fi
done

# Test 11: Response time
echo ""
echo "Test 11: Performance check"

START_TIME=$(date +%s%3N)
curl -sf "$DOMAIN/calendar-page.html" > /dev/null 2>&1
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))

if [ "$RESPONSE_TIME" -lt 1000 ]; then
    test_passed "Response time: ${RESPONSE_TIME}ms (< 1s)"
elif [ "$RESPONSE_TIME" -lt 3000 ]; then
    test_warned "Response time: ${RESPONSE_TIME}ms (1-3s)"
else
    test_failed "Response time: ${RESPONSE_TIME}ms (> 3s)"
fi

# Test 12: Cache headers
echo ""
echo "Test 12: Cache configuration"

CACHE_HEADER=$(curl -sI "$DOMAIN/calendar-page.html" | grep -i "cache-control")
if [ -n "$CACHE_HEADER" ]; then
    test_info "Cache header: $CACHE_HEADER"
    if echo "$CACHE_HEADER" | grep -qi "no-cache\|must-revalidate"; then
        test_passed "Cache headers configured for dynamic content"
    else
        test_warned "Cache headers may allow stale content"
    fi
else
    test_warned "No cache-control header found"
fi

# ============================================================
# Results Summary
# ============================================================

echo ""
echo "=========================================="
echo "  VERIFICATION RESULTS"
echo "=========================================="
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + TESTS_WARNED))

echo -e "${GREEN}Passed:${NC}  $TESTS_PASSED / $TOTAL_TESTS"
echo -e "${YELLOW}Warned:${NC}  $TESTS_WARNED / $TOTAL_TESTS"
echo -e "${RED}Failed:${NC}  $TESTS_FAILED / $TOTAL_TESTS"
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (TESTS_PASSED * 100) / TOTAL_TESTS ))
    echo "Success Rate: $SUCCESS_RATE%"
fi

echo ""

# Overall status
if [ $TESTS_FAILED -eq 0 ]; then
    if [ $TESTS_WARNED -eq 0 ]; then
        echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
        echo ""
        echo "Deployment verification successful!"
        echo "Next steps:"
        echo "  1. Test manually: $DOMAIN/calendar-page.html"
        echo "  2. Monitor for 10-15 minutes"
        echo "  3. Check browser console for errors"
        exit 0
    else
        echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS${NC}"
        echo ""
        echo "Deployment appears successful but has warnings."
        echo "Review warnings above and test manually."
        exit 0
    fi
else
    echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
    echo ""
    echo "CRITICAL: $TESTS_FAILED test(s) failed"
    echo "Recommendation: Consider rollback"
    echo ""
    echo "Rollback command:"
    echo "  ./rollback-calendar.sh"
    exit 1
fi
