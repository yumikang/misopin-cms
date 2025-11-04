# Reservation Limit System - Quick Reference

## File Locations

| Component | File Path | Lines | Type |
|-----------|-----------|-------|------|
| **Schema** | `prisma/schema.prisma` | 265-272 | Model Definition |
| **Business Logic** | `lib/reservations/daily-limit-counter.ts` | 160 | Core Functions |
| **Admin API** | `app/api/admin/daily-limits/route.ts` | 224 | GET/PATCH/PUT |
| **Public API** | `app/api/public/reservations/route.ts` | 147 | POST (Create) |
| **Availability API** | `app/api/public/reservations/availability/route.ts` | 96 | GET (Check) |
| **Admin UI** | `app/admin/reservations/daily-limits/page.tsx` | 309 | React Component |

## API Endpoints Quick Guide

### Check Availability (Public)
```bash
GET /api/public/reservations/availability
  ?date=2025-11-15
  &serviceType=WRINKLE_BOTOX

Response: { available: boolean, remaining: number, message: string }
```

### Create Reservation (Public)
```bash
POST /api/public/reservations
Body: {
  patient_name, phone, birth_date, gender,
  treatment_type, service, preferred_date, preferred_time
}

Status: 201 (Created) | 409 (Limit Reached)
```

### Get All Limits (Admin)
```bash
GET /api/admin/daily-limits

Response: { success: true, limits: [...], total: number }
```

### Update Single Limit (Admin)
```bash
PATCH /api/admin/daily-limits?serviceType=WRINKLE_BOTOX
Body: { dailyLimit: 15 } OR { isActive: false }

Response: { success: true, limit: {...}, message: string }
```

### Bulk Update Limits (Admin)
```bash
PUT /api/admin/daily-limits
Body: {
  limits: [
    { serviceType: 'WRINKLE_BOTOX', dailyLimit: 10 },
    { serviceType: 'SKIN_CARE', dailyLimit: 8 }
  ]
}
```

## Key Functions in daily-limit-counter.ts

### checkAvailability(date: Date, serviceType: ServiceType)
- Returns: `{ available, currentCount, dailyLimit, remaining, level }`
- Used by: Public availability endpoint
- Concurrency: Safe for reads (no locks)

### canCreateReservation(tx: TransactionClient, date: Date, serviceType: ServiceType)
- Returns: `boolean`
- Used by: Reservation creation inside transaction
- Concurrency: Safe (pessimistic lock)

### getAllLimits()
- Returns: All service limits ordered by serviceType
- Used by: Admin API and UI

### upsertLimit(serviceType: ServiceType, dailyLimit: number)
- Creates or updates a single limit
- Used by: Admin API PATCH/PUT endpoints

### toggleLimitActive(serviceType: ServiceType, isActive: boolean)
- Enables/disables a service limit
- Used by: Admin UI toggle switches

## Service Types

```
WRINKLE_BOTOX        (주름/보톡스)
VOLUME_LIFTING       (볼륨/리프팅)
SKIN_CARE            (피부케어)
REMOVAL_PROCEDURE    (제거시술)
BODY_CARE            (바디케어)
OTHER_CONSULTATION   (기타 상담)
```

## Common Queries

### Check if date is full for a service
```typescript
const result = await checkAvailability(
  new Date('2025-11-15'),
  'WRINKLE_BOTOX'
);
if (!result.available) {
  console.log('Fully booked:', result.dailyLimit);
}
```

### Get all current limits
```typescript
const limits = await getAllLimits();
limits.forEach(l => {
  console.log(`${l.serviceType}: ${l.dailyLimit} (${l.isActive ? 'active' : 'inactive'})`);
});
```

### Update a limit
```typescript
const updated = await upsertLimit('WRINKLE_BOTOX', 15);
```

### Disable a service temporarily
```typescript
await toggleLimitActive('SKIN_CARE', false);
```

## Error Codes

| Code | Meaning | API Endpoint |
|------|---------|--------------|
| 200 | Success | All endpoints |
| 201 | Created | POST /api/public/reservations |
| 400 | Validation error | All endpoints |
| 409 | Limit reached | POST /api/public/reservations |
| 500 | Server error | All endpoints |

## Validation Rules

### Admin API (PATCH/PUT)
- `serviceType`: Must be one of 6 enum values
- `dailyLimit`: Must be integer >= 1
- `isActive`: Must be boolean

### Public API (POST)
- `patient_name`: Required string
- `phone`: Required string
- `birth_date`: Required YYYY-MM-DD
- `service`: Must be one of 6 enum values
- `preferred_date`: Required YYYY-MM-DD (future)
- `preferred_time`: Required HH:MM format

### Public API (GET availability)
- `date`: Required YYYY-MM-DD
- `serviceType`: Required, must be one of 6 enum values

## Database Index

The `service_reservation_limits` table uses:
- Primary Key: `id`
- Unique Index: `serviceType` (one limit per service)

Related optimization on `reservations` table:
- Composite Index: `[preferredDate, service, status]`

## Testing Endpoints

### Using curl

```bash
# Check availability
curl "http://localhost:3000/api/public/reservations/availability?date=2025-11-15&serviceType=WRINKLE_BOTOX"

# Get all limits
curl "http://localhost:3000/api/admin/daily-limits"

# Update limit
curl -X PATCH "http://localhost:3000/api/admin/daily-limits?serviceType=WRINKLE_BOTOX" \
  -H "Content-Type: application/json" \
  -d '{"dailyLimit": 15}'

# Create reservation
curl -X POST "http://localhost:3000/api/public/reservations" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "김환자",
    "phone": "010-1234-5678",
    "birth_date": "1990-01-15",
    "gender": "FEMALE",
    "treatment_type": "FIRST_VISIT",
    "service": "WRINKLE_BOTOX",
    "preferred_date": "2025-11-15",
    "preferred_time": "10:00"
  }'
```

## Performance Notes

- Real-time COUNT query: O(n) but typically fast with proper indexing
- Reservation creation: Atomic transaction with pessimistic lock
- Availability check: No locks, safe for concurrent reads
- Limit retrieval: Simple sorted query

## Current Limitations

1. ⚠️ No audit logging of limit changes
2. ⚠️ No soft-delete history
3. ⚠️ Single daily limit (no hourly/time-slot limits)
4. ⚠️ No date-range specific limits
5. ⚠️ No notifications when approaching capacity
6. ⚠️ No rate limiting on availability endpoint
7. ⚠️ Limited automated tests

## Future Enhancements

- [ ] Add audit logging table
- [ ] Add capacity alerts for admins
- [ ] Support hourly slot limits
- [ ] Add analytics dashboard
- [ ] Implement rate limiting
- [ ] Create API documentation (Swagger)
- [ ] Add comprehensive test suite

## Troubleshooting

### Issue: 409 Conflict when creating reservation
**Solution**: Limit is reached. Check availability first before allowing users to book.

### Issue: Empty limits array returned
**Solution**: Run migration and seed script to initialize limits for all 6 service types.

### Issue: Inconsistent count when checking availability
**Solution**: Normal behavior due to concurrent reservations. Use transaction for creation to ensure atomicity.

### Issue: Limit update not reflected immediately
**Solution**: Frontend should reload data. The API returns updated data in response.

## Code Style

- File organization: by domain (reservations)
- Naming: camelCase (frontend), snake_case (database)
- Types: Prisma-generated enums, TypeScript interfaces
- Error handling: Specific error messages in Korean
- Comments: JSDoc-style for functions

## Related Files

- Reservations model: `prisma/schema.prisma` line 226-247
- Reservation statuses: PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
- Admin reservations page: `app/admin/reservations/page.tsx`
- Frontend reservation form: Public website (not in admin)

---

**Last Updated**: November 4, 2025
**Status**: Complete implementation
**Confidence**: 100% (source code verified)
