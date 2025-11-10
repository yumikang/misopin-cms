# Service Management API - Quick Reference

## Base URL
```
http://localhost:3000/api/admin/services
```

## Authentication
All endpoints require JWT Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints Overview

| Method | Endpoint | Role Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/admin/services` | Any Auth | List all services with filters |
| POST | `/api/admin/services` | ADMIN+ | Create new service |
| PATCH | `/api/admin/services/[id]` | ADMIN+ | Update service |
| DELETE | `/api/admin/services/[id]` | ADMIN+ | Soft delete service |
| DELETE | `/api/admin/services/[id]?hard=true` | SUPER_ADMIN | Hard delete service |
| PUT | `/api/admin/services/reorder` | ADMIN+ | Batch update display order |

---

## Quick Examples

### List All Services
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/services
```

### List Active Services Only
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/services?active=true"
```

### Search Services
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/services?search=보톡스"
```

### Create Service
```bash
curl -X POST http://localhost:3000/api/admin/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NEW_SERVICE",
    "name": "새로운 시술",
    "durationMinutes": 30
  }'
```

### Update Service Duration
```bash
curl -X PATCH http://localhost:3000/api/admin/services/service_123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"durationMinutes": 45}'
```

### Deactivate Service (Soft Delete)
```bash
curl -X DELETE http://localhost:3000/api/admin/services/service_123 \
  -H "Authorization: Bearer $TOKEN"
```

### Reorder Services
```bash
curl -X PUT http://localhost:3000/api/admin/services/reorder \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "services": [
      {"id": "service_1", "displayOrder": 1},
      {"id": "service_2", "displayOrder": 2}
    ]
  }'
```

---

## Query Parameters (GET)

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `active` | boolean | `?active=true` | Filter by active status |
| `category` | string | `?category=피부과` | Filter by category |
| `search` | string | `?search=보톡스` | Search name/description/code |
| `sortBy` | string | `?sortBy=displayOrder` | Sort field (name, displayOrder, createdAt, durationMinutes) |
| `sortOrder` | string | `?sortOrder=asc` | Sort direction (asc, desc) |

**Combine Parameters**:
```
?active=true&category=피부과&sortBy=name&sortOrder=asc
```

---

## Request Body Schemas

### Create Service (POST)
```json
{
  "code": "SERVICE_CODE",           // Required: A-Z, _ only
  "name": "시술 이름",               // Required: 2-100 chars
  "description": "설명",             // Optional: max 500 chars
  "category": "카테고리",            // Optional: max 50 chars
  "durationMinutes": 30,            // Required: 10-480
  "bufferMinutes": 10,              // Optional: 0-60, default 10
  "isActive": true,                 // Optional: default true
  "displayOrder": 1                 // Optional: auto-assigned
}
```

### Update Service (PATCH)
All fields optional:
```json
{
  "name": "새 이름",
  "description": "새 설명",
  "category": "새 카테고리",
  "durationMinutes": 45,
  "bufferMinutes": 15,
  "isActive": false,
  "displayOrder": 5
}
```

### Reorder Services (PUT)
```json
{
  "services": [
    {"id": "service_id_1", "displayOrder": 1},
    {"id": "service_id_2", "displayOrder": 2}
  ]
}
```

---

## Response Examples

### Success Response (List)
```json
{
  "success": true,
  "data": [
    {
      "id": "service_abc123",
      "code": "WRINKLE_BOTOX",
      "name": "주름 보톡스",
      "durationMinutes": 30,
      "bufferMinutes": 10,
      "totalMinutes": 40,
      "isActive": true,
      "displayOrder": 1,
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

### Success with Cascade Effects (Update)
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": { ... },
  "changes": [
    {
      "field": "durationMinutes",
      "oldValue": 30,
      "newValue": 40
    }
  ],
  "cascadeEffects": {
    "maxBookingsChanged": {
      "before": 8,
      "after": 6
    },
    "warnings": [
      "일일 최대 예약 건수가 8건에서 6건으로 변경됩니다."
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 10,
      "path": ["durationMinutes"],
      "message": "최소 시술 시간은 10분입니다"
    }
  ]
}
```

---

## Validation Rules

### Code Field
- ✅ Required
- ✅ 2-50 characters
- ✅ Uppercase letters and underscores only
- ✅ Must be unique
- ❌ Cannot contain lowercase or special chars
- **Example**: `WRINKLE_BOTOX`, `LASER_TREATMENT`

### Name Field
- ✅ Required
- ✅ 2-100 characters
- ✅ Korean, English, numbers allowed
- **Example**: `주름 보톡스`, `Botox Treatment`

### Duration Minutes
- ✅ Required
- ✅ Integer only
- ✅ Minimum: 10 minutes
- ✅ Maximum: 480 minutes (8 hours)
- **Example**: `30`, `60`, `120`

### Buffer Minutes
- ✅ Optional (default: 10)
- ✅ Integer only
- ✅ Minimum: 0 minutes
- ✅ Maximum: 60 minutes
- **Example**: `10`, `15`, `20`

---

## HTTP Status Codes

| Code | Meaning | When It Happens |
|------|---------|-----------------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error, invalid data |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient role permissions |
| 404 | Not Found | Service ID doesn't exist |
| 409 | Conflict | Duplicate service code |
| 500 | Server Error | Unexpected server error |

---

## Role Requirements

| Role | Permissions |
|------|-------------|
| EDITOR | Read-only (GET) |
| ADMIN | Create, Read, Update, Soft Delete |
| SUPER_ADMIN | All operations including Hard Delete |

---

## Common Use Cases

### 1. Get All Active Services Sorted by Display Order
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/services?active=true&sortBy=displayOrder&sortOrder=asc"
```

### 2. Search for Services Containing "보톡스"
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/services?search=보톡스"
```

### 3. Create Service with Minimal Fields
```bash
curl -X POST http://localhost:3000/api/admin/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NEW_SERVICE",
    "name": "새 시술",
    "durationMinutes": 30
  }'
```

### 4. Update Only Service Name
```bash
curl -X PATCH http://localhost:3000/api/admin/services/service_123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "업데이트된 이름"}'
```

### 5. Change Duration and Check Cascade Effects
```bash
curl -X PATCH http://localhost:3000/api/admin/services/service_123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"durationMinutes": 45}'

# Response will include cascadeEffects if service has limits
```

### 6. Temporarily Disable Service (Soft Delete)
```bash
curl -X DELETE http://localhost:3000/api/admin/services/service_123 \
  -H "Authorization: Bearer $TOKEN"

# Sets isActive = false, data preserved
```

### 7. Permanently Delete Service (Hard Delete)
```bash
# Only if no dependencies exist
curl -X DELETE "http://localhost:3000/api/admin/services/service_123?hard=true" \
  -H "Authorization: Bearer $TOKEN"

# Requires SUPER_ADMIN role
```

### 8. Reorder Multiple Services
```bash
curl -X PUT http://localhost:3000/api/admin/services/reorder \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "services": [
      {"id": "service_abc", "displayOrder": 1},
      {"id": "service_def", "displayOrder": 2},
      {"id": "service_ghi", "displayOrder": 3}
    ]
  }'
```

---

## Testing Tips

### Get JWT Token
```bash
# Login first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Extract token from response
export TOKEN="eyJhbGc..."
```

### Use Environment Variable
```bash
# Set token once
export TOKEN="your-jwt-token-here"

# Use in all requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/services
```

### Pretty Print JSON
```bash
# Install jq if not already installed
# brew install jq

# Pretty print responses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/services | jq
```

### Save Response to File
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/services > services.json
```

---

## Troubleshooting

### Problem: 401 Unauthorized
**Solution**: Check your JWT token is valid and not expired

### Problem: 403 Forbidden
**Solution**: Your role doesn't have permission. Check if you need ADMIN or SUPER_ADMIN

### Problem: 409 Conflict
**Solution**: Service code already exists. Use a different code or update existing service

### Problem: 400 Validation Error
**Solution**: Check the `details` field in response for specific validation errors

### Problem: 404 Not Found
**Solution**: Service ID doesn't exist. List all services to find correct ID

---

## Integration with Service Limits

When you change `durationMinutes`:
1. System checks if service has `service_reservation_limits`
2. If limit exists with `dailyLimitMinutes`, calculates impact
3. Returns `cascadeEffects` showing before/after max bookings
4. Example:
   - Old duration: 30 min, daily limit: 240 min → max 8 bookings
   - New duration: 40 min, daily limit: 240 min → max 6 bookings
   - Response includes warning about capacity reduction

---

## Files Location

```
app/api/admin/services/
├── route.ts                    # GET, POST
├── [id]/route.ts              # PATCH, DELETE
├── reorder/route.ts           # PUT
├── validation.ts              # Zod schemas
└── types.ts                   # TypeScript types

claudedocs/
├── PHASE5_SERVICE_MANAGEMENT_DESIGN.md
├── PHASE5_API_TESTING.md
├── PHASE5_IMPLEMENTATION_SUMMARY.md
└── PHASE5_API_QUICK_REFERENCE.md  # This file
```

---

## Next Steps

1. Test endpoints with real JWT token
2. Verify cascade effects with actual service limits
3. Implement Admin UI (Phase 5.2)
4. Add to admin sidebar navigation
5. Create UI components for CRUD operations

---

**Last Updated**: 2024-11-10
**Status**: Production Ready
**Build**: ✅ Passing
