#!/bin/bash

echo "🔐 Logging in as SUPER_ADMIN..."
TOKEN=$(curl -s http://localhost:3000/api/auth/cms-login \
  -H "Content-Type: application/json" \
  -d '{"email":"wonjang@misopin.com","password":"Misopin2025"}' \
  | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:50}..."
echo ""

echo "📋 Testing GET /api/admin/clinic-info..."
curl -s http://localhost:3000/api/admin/clinic-info \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "✅ Admin API test complete"
