# Quick Start Guide - Time-Based Reservation System

## TL;DR

**What**: Transform reservation system from count-based (e.g., "10 appointments per day") to time-based (e.g., "480 minutes per day shared across all services")

**Why**: Prevent overbooking doctor's actual available time + enable self-service service management

**Timeline**: 6-8 weeks

**Risk**: Medium (mitigated through careful planning)

---

## How It Works

### Current System ❌
```
Service Limits (Independent):
- Botox: 10 appointments/day
- Skin Care: 5 appointments/day

Problem: Could accept 10×40min + 5×70min = 750 minutes
         But doctor only has 480 minutes!
```

### New System ✅
```
Time Pool (Shared):
- Morning: 180 minutes
- Afternoon: 300 minutes
- Total: 480 minutes

All services share this pool:
- 3 Botox (40min each) = 120 min consumed
- Remaining: 60 min
- Skin Care (70min) → REJECTED (need 70, have 60)
- Another Botox (40min) → ACCEPTED ✅
```

---

## Key Changes

### Database
```diff
- service: ServiceType (enum - hardcoded)
+ serviceId: FK to services table (dynamic)
+ serviceName: string (snapshot)
+ estimatedDuration: int (minutes)
+ period: MORNING | AFTERNOON
```

### Business Logic
```diff
- Count reservations per service
+ SUM reservation durations per time slot
- Check count < limit
+ Check remaining minutes >= required minutes
```

### Admin Experience
```diff
- Need developer to add new service
+ Admin adds service via UI (zero deployment)
```

---

## Migration Path

### Step 1: Add New Tables (Week 1)
```sql
CREATE TABLE services (...);
CREATE TABLE clinic_time_slots (...);
```
✅ **Safe**: Additive only, zero risk

### Step 2: Seed Data (Week 1)
```sql
INSERT INTO services
  VALUES ('WRINKLE_BOTOX', '주름/보톡스', 30, 10, ...);
```
✅ **Safe**: Converts enum to table rows

### Step 3: Add Columns to Reservations (Week 2)
```sql
ALTER TABLE reservations
  ADD COLUMN serviceId TEXT,
  ADD COLUMN serviceName TEXT,
  ADD COLUMN estimatedDuration INT,
  ADD COLUMN period TEXT;
```
✅ **Safe**: Nullable columns, backward compatible

### Step 4: Migrate Data (Week 2)
```sql
UPDATE reservations r
SET serviceId = s.id, serviceName = s.name, ...
FROM services s
WHERE r.service::text = s.code;
```
✅ **Safe**: Backfill only, old column untouched

### Step 5: Deploy New Code (Week 3-7)
- Core time-based logic
- Service management APIs
- Admin UI
- Public APIs
✅ **Safe**: Reads from new columns

### Step 6: Remove Old Schema (Week 8)
```sql
ALTER TABLE reservations DROP COLUMN service;
DROP TABLE service_reservation_limits;
DROP TYPE ServiceType;
```
✅ **Safe**: Only after full verification

---

## API Changes

### Before
```typescript
// Check availability
const limit = await prisma.service_reservation_limits.findUnique({
  where: { serviceType: 'WRINKLE_BOTOX' }
});

const count = await prisma.reservations.count({
  where: {
    preferredDate: date,
    service: 'WRINKLE_BOTOX',
    status: { in: ['PENDING', 'CONFIRMED'] }
  }
});

const available = count < limit.dailyLimit;
```

### After
```typescript
// Check availability
const timeSlot = await calculateTimeSlotAvailability(date, 'MORNING');
// Returns: { totalMinutes: 180, consumedMinutes: 120, remainingMinutes: 60 }

const service = await prisma.service.findUnique({
  where: { id: serviceId }
});

const available = timeSlot.remainingMinutes >= (service.durationMinutes + service.bufferMinutes);
```

---

## Testing Checklist

### Unit Tests
- [ ] Time slot calculation with 0 reservations
- [ ] Time slot calculation with partial bookings
- [ ] Time slot calculation when full
- [ ] Cross-service time consumption
- [ ] Cancelled reservations excluded

### Integration Tests
- [ ] End-to-end booking flow
- [ ] Overbooking prevention
- [ ] Concurrent booking safety
- [ ] Service CRUD operations

### Edge Cases
- [ ] Midnight boundary
- [ ] Timezone handling
- [ ] Service duration changes
- [ ] Weekend/holiday closures
- [ ] Soft delete handling

### Performance Tests
- [ ] Availability check < 100ms
- [ ] Booking creation < 500ms
- [ ] 100 concurrent users
- [ ] Database query plans optimized

---

## Deployment Checklist

### Pre-Deployment
- [ ] Full database backup
- [ ] Migration scripts tested in staging
- [ ] Rollback script verified
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Monitoring configured

### Deployment Day
- [ ] Enable maintenance mode
- [ ] Run database migrations
- [ ] Verify data integrity
- [ ] Deploy application (blue-green)
- [ ] Smoke tests on production
- [ ] Disable maintenance mode
- [ ] Monitor for 24 hours

### Post-Deployment
- [ ] Error rate < 0.1%
- [ ] Performance targets met
- [ ] No user complaints
- [ ] Rollback capability verified
- [ ] Documentation updated

---

## Rollback Plan

### If Needed Before Week 8
```sql
-- Restore old column from new data
UPDATE reservations r
SET service = s.code::ServiceType
FROM services s
WHERE r.serviceId = s.id;

-- Drop new columns
ALTER TABLE reservations
  DROP COLUMN serviceId,
  DROP COLUMN serviceName,
  DROP COLUMN estimatedDuration,
  DROP COLUMN period;

-- Drop new tables
DROP TABLE clinic_time_slots;
DROP TABLE services;
```

**Rollback Time**: < 15 minutes
**Data Loss**: None (if executed correctly)

---

## Common Scenarios

### Scenario 1: Add New Service
**Before**: Developer edits schema.prisma → migration → deploy (1-2 days)
**After**: Admin opens UI → Add Service → Save (30 seconds) ✅

### Scenario 2: Adjust Service Duration
**Before**: Developer edits seed data → migration → deploy
**After**: Admin clicks Edit → Change duration → Save ✅

### Scenario 3: Temporarily Disable Service
**Before**: Developer comments out enum value → deploy
**After**: Admin toggles "Active" switch ✅

### Scenario 4: Check Today's Capacity
**Before**: Run SQL query manually
**After**: Admin views dashboard (live updates) ✅

---

## Monitoring Dashboard

### Key Metrics
```
Daily Overview:
├─ Total Capacity: 480 min
├─ Morning: 180 min (120 consumed, 60 remaining) [67% utilized]
└─ Afternoon: 300 min (80 consumed, 220 remaining) [27% utilized]

Service Availability:
├─ ✅ Botox (40min) - Available
├─ ❌ Skin Care (70min) - Insufficient time
└─ ✅ Volume Lifting (60min) - Available

Reservations Today:
├─ Total: 12 bookings
├─ Pending: 3
├─ Confirmed: 9
└─ Time Consumed: 200 min / 480 min (42%)
```

---

## Troubleshooting

### Issue: "Insufficient time" error but dashboard shows time available

**Cause**: Race condition - someone booked between check and creation
**Solution**: User should refresh and try again (this is working as designed)

### Issue: Service not appearing in booking form

**Check**:
1. Service `isActive = true`?
2. Service `isVisible = true`?
3. Service `deletedAt = null`?

### Issue: Migration fails with foreign key error

**Cause**: Orphaned reservations (serviceId not matching any service)
**Solution**:
```sql
-- Find orphans
SELECT * FROM reservations WHERE serviceId NOT IN (SELECT id FROM services);

-- Fix by creating missing service or updating to valid serviceId
```

### Issue: Slow availability checks

**Check**:
1. Database indexes present?
2. Query execution plan optimized?
3. Connection pool saturated?

**Solution**: Review `IMPLEMENTATION_ROADMAP.md` Phase 2.4 for indexing strategy

---

## Resources

### Documentation
- **Executive Summary**: [`EXECUTIVE_SUMMARY.md`](./EXECUTIVE_SUMMARY.md)
- **Full Roadmap**: [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md) (Parts 1-3)
- **Design Docs**: [`duration.md`](./duration.md), [`duration-01.md`](./duration-01.md)

### Code References
- **Current Schema**: `prisma/schema.prisma`
- **Current Logic**: `lib/reservations/daily-limit-counter.ts`
- **Admin API**: `app/api/admin/daily-limits/route.ts`

### Contacts
- **System Architect**: [Your contact]
- **Backend Lead**: [Your contact]
- **DevOps**: [Your contact]

---

## FAQ

### Q: Will existing reservations be lost?
**A**: No. Migration preserves all data through careful backfill strategy.

### Q: What happens during maintenance window?
**A**: Brief downtime (< 1 hour) for database migration only. Application deployment is zero-downtime.

### Q: Can we rollback after going live?
**A**: Yes, within first week (before old schema removal). After that, forward-only.

### Q: How do we test without affecting production?
**A**: Full staging environment with production data snapshot.

### Q: What if doctor's schedule changes (vacation, etc.)?
**A**: Admin adjusts clinic_time_slots for specific dates or disables periods.

### Q: Can we support multiple doctors?
**A**: Yes! Add `doctorId` to time slots and scale horizontally (future enhancement).

---

## Quick Commands

### Check Migration Status
```bash
npx prisma migrate status
```

### Run Tests
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Deploy to Staging
```bash
npm run deploy:staging
npm run test:smoke:staging
```

### Monitor Production
```bash
npm run logs:production
npm run metrics:dashboard
```

### Emergency Rollback
```bash
npm run rollback:application  # Swap to previous version
npm run rollback:database     # Restore from backup
```

---

**Last Updated**: 2025-11-04
**Version**: 1.0
**Status**: Ready for Implementation
