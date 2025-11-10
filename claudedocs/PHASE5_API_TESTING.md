# Phase 5: Service Management API - Testing Guide

## API Endpoints Implemented

### 1. GET /api/admin/services
**Purpose**: List all services with filtering and sorting

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
```
?active=true              # Filter by active status (true/false)
&category=피부과          # Filter by category
&search=보톡스            # Search in name/description/code
&sortBy=displayOrder      # Sort by: name, displayOrder, createdAt, durationMinutes
&sortOrder=asc            # Sort order: asc, desc
```

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/admin/services?active=true&sortBy=displayOrder&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "service_abc123",
      "code": "WRINKLE_BOTOX",
      "name": "주름 보톡스",
      "description": "주름 개선 보톡스 시술",
      "category": "피부과",
      "durationMinutes": 30,
      "bufferMinutes": 10,
      "totalMinutes": 40,
      "isActive": true,
      "displayOrder": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "reservations": 15,
        "clinic_time_slots": 2,
        "manual_time_closures": 0
      },
      "service_reservation_limits": {
        "id": "limit_WRINKLE_BOTOX",
        "dailyLimitMinutes": 240,
        "isActive": true
      }
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. POST /api/admin/services
**Purpose**: Create a new service

**Required Role**: ADMIN or SUPER_ADMIN

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "code": "LASER_TREATMENT",
  "name": "레이저 치료",
  "description": "피부 레이저 치료 프로그램",
  "category": "피부과",
  "durationMinutes": 60,
  "bufferMinutes": 15,
  "isActive": true,
  "displayOrder": 5
}
```

**Example Request**:
```bash
curl -X POST "http://localhost:3000/api/admin/services" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "LASER_TREATMENT",
    "name": "레이저 치료",
    "description": "피부 레이저 치료",
    "category": "피부과",
    "durationMinutes": 60,
    "bufferMinutes": 15
  }'
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": "service_xyz789",
    "code": "LASER_TREATMENT",
    "name": "레이저 치료",
    "description": "피부 레이저 치료",
    "category": "피부과",
    "durationMinutes": 60,
    "bufferMinutes": 15,
    "totalMinutes": 75,
    "isActive": true,
    "displayOrder": 5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "_count": {
      "reservations": 0,
      "clinic_time_slots": 0,
      "manual_time_closures": 0
    },
    "service_reservation_limits": null
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- **400 Bad Request**: Validation error
  ```json
  {
    "success": false,
    "error": "Validation failed",
    "details": [
      {
        "code": "too_small",
        "minimum": 2,
        "path": ["code"],
        "message": "코드는 최소 2자 이상이어야 합니다"
      }
    ]
  }
  ```

- **401 Unauthorized**: Missing or invalid token
  ```json
  {
    "success": false,
    "error": "Unauthorized"
  }
  ```

- **403 Forbidden**: Insufficient permissions
  ```json
  {
    "success": false,
    "error": "Forbidden - Admin role required"
  }
  ```

- **409 Conflict**: Duplicate code
  ```json
  {
    "success": false,
    "error": "Duplicate service code",
    "details": "Service with code 'LASER_TREATMENT' already exists"
  }
  ```

---

### 3. PATCH /api/admin/services/[id]
**Purpose**: Update an existing service

**Required Role**: ADMIN or SUPER_ADMIN

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "레이저 피부 치료",
  "description": "개선된 레이저 치료 프로그램",
  "category": "성형외과",
  "durationMinutes": 45,
  "bufferMinutes": 10,
  "isActive": true,
  "displayOrder": 3
}
```

**Example Request**:
```bash
curl -X PATCH "http://localhost:3000/api/admin/services/service_xyz789" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "durationMinutes": 45,
    "description": "개선된 레이저 치료"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "id": "service_xyz789",
    "code": "LASER_TREATMENT",
    "name": "레이저 치료",
    "description": "개선된 레이저 치료",
    "category": "피부과",
    "durationMinutes": 45,
    "bufferMinutes": 15,
    "totalMinutes": 60,
    "isActive": true,
    "displayOrder": 5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z",
    "_count": {
      "reservations": 0,
      "clinic_time_slots": 0,
      "manual_time_closures": 0
    },
    "service_reservation_limits": null
  },
  "changes": [
    {
      "field": "durationMinutes",
      "oldValue": 60,
      "newValue": 45
    },
    {
      "field": "description",
      "oldValue": "피부 레이저 치료",
      "newValue": "개선된 레이저 치료"
    }
  ],
  "timestamp": "2024-01-01T01:00:00.000Z"
}
```

**With Cascade Effects** (when durationMinutes changes and limits exist):
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": { ... },
  "changes": [ ... ],
  "cascadeEffects": {
    "maxBookingsChanged": {
      "before": 8,
      "after": 6
    },
    "warnings": [
      "일일 최대 예약 건수가 8건에서 6건으로 변경됩니다.",
      "현재 3건의 예정된 예약이 있습니다. 시술 시간 변경 시 주의하세요."
    ]
  },
  "timestamp": "2024-01-01T01:00:00.000Z"
}
```

**Error Responses**:
- **404 Not Found**: Service doesn't exist
  ```json
  {
    "success": false,
    "error": "Service not found"
  }
  ```

---

### 4. DELETE /api/admin/services/[id]
**Purpose**: Delete service (soft delete by default, hard delete with parameter)

**Required Role**:
- Soft delete: ADMIN
- Hard delete: SUPER_ADMIN

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
```
?hard=true    # Optional: perform hard delete (requires SUPER_ADMIN)
```

#### Soft Delete (Default)
**Example Request**:
```bash
curl -X DELETE "http://localhost:3000/api/admin/services/service_xyz789" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Service deactivated successfully",
  "data": {
    "id": "service_xyz789",
    "code": "LASER_TREATMENT",
    "name": "레이저 치료",
    "isActive": false,
    "updatedAt": "2024-01-01T02:00:00.000Z",
    ...
  },
  "timestamp": "2024-01-01T02:00:00.000Z"
}
```

#### Hard Delete
**Example Request**:
```bash
curl -X DELETE "http://localhost:3000/api/admin/services/service_xyz789?hard=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Service permanently deleted",
  "timestamp": "2024-01-01T02:00:00.000Z"
}
```

**Error Responses**:
- **400 Bad Request**: Cannot hard delete due to dependencies
  ```json
  {
    "success": false,
    "error": "Cannot perform hard delete",
    "details": "다음 이유로 완전 삭제가 불가능합니다",
    "reasons": [
      "15건의 예약 기록이 존재합니다",
      "예약 한도 설정이 존재합니다"
    ]
  }
  ```

- **403 Forbidden**: Insufficient permissions for hard delete
  ```json
  {
    "success": false,
    "error": "Forbidden - Super Admin role required for hard delete"
  }
  ```

---

### 5. PUT /api/admin/services/reorder
**Purpose**: Batch update display order for services

**Required Role**: ADMIN or SUPER_ADMIN

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "services": [
    { "id": "service_abc123", "displayOrder": 1 },
    { "id": "service_def456", "displayOrder": 2 },
    { "id": "service_ghi789", "displayOrder": 3 }
  ]
}
```

**Example Request**:
```bash
curl -X PUT "http://localhost:3000/api/admin/services/reorder" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "services": [
      { "id": "service_abc123", "displayOrder": 1 },
      { "id": "service_def456", "displayOrder": 2 }
    ]
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Display order updated successfully",
  "count": 2,
  "timestamp": "2024-01-01T03:00:00.000Z"
}
```

**Error Responses**:
- **400 Bad Request**: Invalid service IDs
  ```json
  {
    "success": false,
    "error": "Invalid service IDs",
    "details": "The following service IDs do not exist: service_invalid1, service_invalid2"
  }
  ```

---

## Testing Scenarios

### Test Case 1: Create Service with Auto Display Order
1. Don't provide `displayOrder` in request
2. System should auto-assign next available order
3. Verify response includes auto-assigned value

### Test Case 2: Duration Change Cascade Effect
1. Create service with 30-minute duration
2. Create service limit with 240-minute daily limit
3. Update service duration to 40 minutes
4. Verify response includes `cascadeEffects` showing max bookings changed from 8 to 6

### Test Case 3: Duplicate Code Prevention
1. Create service with code "TEST_SERVICE"
2. Attempt to create another service with same code
3. Expect 409 Conflict error

### Test Case 4: Hard Delete Safety
1. Create service
2. Create reservation using that service
3. Attempt hard delete
4. Expect 400 error with reasons

### Test Case 5: Filter and Search
1. Create multiple services with different categories
2. Filter by category
3. Search by name
4. Sort by displayOrder
5. Verify correct results

### Test Case 6: Validation
1. Try to create service with invalid code (lowercase)
2. Try to create service with durationMinutes < 10
3. Try to create service with bufferMinutes > 60
4. Expect 400 validation errors

### Test Case 7: Authorization
1. Try to access endpoints without token → 401
2. Try to create service with EDITOR role → 403
3. Try to hard delete with ADMIN role → 403
4. Only SUPER_ADMIN should succeed for hard delete

---

## Integration Testing with Service Limits

### Scenario: Service Duration Changes Affect Booking Capacity

**Setup**:
1. Create service with 30-minute duration
```bash
POST /api/admin/services
{
  "code": "TEST_BOTOX",
  "name": "테스트 보톡스",
  "durationMinutes": 30,
  "bufferMinutes": 10
}
```

2. Create service limit with 240-minute daily capacity
```bash
POST /api/admin/service-limits
{
  "serviceId": "service_TEST_BOTOX",
  "dailyLimitMinutes": 240,
  "isActive": true
}
```

3. Verify max bookings = 8 (240 / 30)
```bash
GET /api/admin/service-limits
# Check: 240 dailyLimitMinutes / 30 durationMinutes = 8 max bookings
```

**Action**:
4. Update service duration to 40 minutes
```bash
PATCH /api/admin/services/service_TEST_BOTOX
{
  "durationMinutes": 40
}
```

**Expected Result**:
```json
{
  "success": true,
  "cascadeEffects": {
    "maxBookingsChanged": {
      "before": 8,
      "after": 6
    },
    "warnings": [
      "일일 최대 예약 건수가 8건에서 6건으로 변경됩니다."
    ]
  }
}
```

5. Verify in Service Limits UI
```bash
GET /api/admin/service-limits
# Check: 240 dailyLimitMinutes / 40 durationMinutes = 6 max bookings
```

---

## Performance Testing

### Load Test: Bulk Service Creation
```bash
# Create 100 services
for i in {1..100}; do
  curl -X POST "http://localhost:3000/api/admin/services" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"code\": \"TEST_SERVICE_$i\",
      \"name\": \"테스트 시술 $i\",
      \"durationMinutes\": 30
    }"
done
```

### Load Test: Filtered Queries
```bash
# Test query performance with many services
curl "http://localhost:3000/api/admin/services?search=테스트&sortBy=displayOrder"
```

---

## Error Recovery Testing

### Test Case: Transaction Rollback
1. Start reorder operation with 10 services
2. Include 1 invalid service ID in the middle
3. Verify transaction rolls back completely
4. All services should retain original order

### Test Case: Concurrent Updates
1. User A starts updating service X
2. User B simultaneously updates service X
3. Last write wins (expected behavior)
4. Both updates should succeed individually

---

## Security Testing

### Test Case: JWT Validation
```bash
# No token
curl -X GET "http://localhost:3000/api/admin/services"
# Expected: 401 Unauthorized

# Invalid token
curl -X GET "http://localhost:3000/api/admin/services" \
  -H "Authorization: Bearer invalid_token"
# Expected: 401 Unauthorized

# Expired token
# Expected: 401 Unauthorized
```

### Test Case: Role-Based Access Control
```bash
# EDITOR trying to create service
curl -X POST "http://localhost:3000/api/admin/services" \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST", "name": "Test", "durationMinutes": 30}'
# Expected: 403 Forbidden

# ADMIN trying to hard delete
curl -X DELETE "http://localhost:3000/api/admin/services/service_x?hard=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 403 Forbidden

# SUPER_ADMIN hard delete
curl -X DELETE "http://localhost:3000/api/admin/services/service_x?hard=true" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
# Expected: 200 OK (if no dependencies)
```

---

## Validation Testing Checklist

### Code Validation
- ✅ Uppercase only: `TEST_SERVICE` (valid)
- ❌ Lowercase: `test_service` (invalid)
- ❌ Special chars: `TEST-SERVICE` (invalid)
- ✅ Underscores: `TEST_SERVICE_V2` (valid)
- ❌ Too short: `T` (invalid, min 2)
- ❌ Too long: 51+ characters (invalid, max 50)

### Name Validation
- ❌ Too short: `A` (invalid, min 2)
- ✅ Korean: `주름 보톡스` (valid)
- ✅ English: `Botox Treatment` (valid)
- ✅ Mixed: `보톡스 Botox` (valid)
- ❌ Too long: 101+ characters (invalid, max 100)

### Duration Validation
- ❌ Too small: `5` (invalid, min 10)
- ✅ Minimum: `10` (valid)
- ✅ Typical: `30` (valid)
- ✅ Maximum: `480` (valid)
- ❌ Too large: `481` (invalid, max 480)
- ❌ Decimal: `30.5` (invalid, must be integer)

### Buffer Validation
- ✅ Minimum: `0` (valid)
- ✅ Typical: `10` (valid)
- ✅ Maximum: `60` (valid)
- ❌ Too large: `61` (invalid, max 60)
- ❌ Negative: `-5` (invalid, min 0)

---

## Manual Test Script

Save as `test-service-api.sh`:

```bash
#!/bin/bash

# Configuration
API_BASE="http://localhost:3000"
TOKEN="YOUR_JWT_TOKEN_HERE"

echo "=== Service Management API Tests ==="

# Test 1: List all services
echo -e "\n1. GET /api/admin/services"
curl -s -X GET "$API_BASE/api/admin/services" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test 2: Create service
echo -e "\n2. POST /api/admin/services"
SERVICE_ID=$(curl -s -X POST "$API_BASE/api/admin/services" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST_API_SERVICE",
    "name": "API 테스트 시술",
    "description": "API 테스트용 시술",
    "durationMinutes": 30,
    "bufferMinutes": 10
  }' | jq -r '.data.id')

echo "Created service ID: $SERVICE_ID"

# Test 3: Update service
echo -e "\n3. PATCH /api/admin/services/$SERVICE_ID"
curl -s -X PATCH "$API_BASE/api/admin/services/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "durationMinutes": 40,
    "description": "업데이트된 설명"
  }' | jq

# Test 4: Soft delete
echo -e "\n4. DELETE /api/admin/services/$SERVICE_ID (soft)"
curl -s -X DELETE "$API_BASE/api/admin/services/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test 5: Verify soft delete
echo -e "\n5. Verify soft delete (isActive should be false)"
curl -s -X GET "$API_BASE/api/admin/services?active=false" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | select(.id == "'$SERVICE_ID'")'

echo -e "\n=== Tests Complete ==="
```

Run with:
```bash
chmod +x test-service-api.sh
./test-service-api.sh
```

---

## Success Criteria

All endpoints must:
- ✅ Return correct HTTP status codes
- ✅ Include proper error messages in Korean
- ✅ Validate all inputs with Zod schemas
- ✅ Require authentication (JWT)
- ✅ Enforce role-based authorization
- ✅ Calculate cascade effects correctly
- ✅ Use transactions for batch operations
- ✅ Return consistent response formats
- ✅ Handle Prisma errors gracefully
- ✅ Build without TypeScript errors
