# Admin Reservations System - Quick Reference

## File Locations

| File | Purpose | Status |
|------|---------|--------|
| `/app/admin/reservations/page.tsx` | Main admin UI | Uses legacy hardcoded slots |
| `/app/admin/reservations/daily-limits/page.tsx` | Limit management | Fully functional |
| `/app/api/reservations/route.ts` | Admin API endpoints | Uses mock data ❌ |
| `/app/api/public/reservations/route.ts` | Public API (production-ready) | Not used by admin |
| `/app/api/public/reservations/time-slots/route.ts` | Time-slot availability API | Not used by admin |
| `/lib/reservations/time-slot-calculator.ts` | Slot calculation logic | Production-ready |
| `/lib/reservations/daily-limit-counter.ts` | Daily limit checking | Production-ready |
| `/prisma/schema.prisma` | Database schema | Well-designed |

---

## Current Architecture Overview

```
Admin Frontend
├─ Hardcoded timeSlots array [12 slots]
├─ Legacy ServiceType enum (department)
└─ Mock data operations

Admin API (/api/reservations)
├─ GET → Returns all from DB (no filtering)
├─ POST → Uses mock data ❌
├─ PUT → Updates DB ✅
├─ DELETE → Cancels (DB) ✅
└─ OPTIONS → Uses mock data ❌

Database
├─ reservations table (has both legacy & new fields)
├─ services table (ignored by admin)
├─ clinic_time_slots table (ignored by admin)
└─ service_reservation_limits table (only used by daily-limits page)

Backend Utilities (Not Used by Admin)
├─ calculateAvailableTimeSlots()
├─ canCreateReservation()
└─ validateTimeSlotAvailability()
```

---

## Database Fields Used by Admin

### Currently Used (Legacy)
- `preferredDate` → displayed as reservation_date
- `preferredTime` → displayed as reservation_time (hardcoded 30-min slots)
- `service` → displayed as department (ServiceType enum)
- `treatmentType` → displayed as purpose ("초진"/"재진")
- `status` → status badges
- `patientName`, `phone`, `email` → patient info

### NOT Currently Used (New System)
- `serviceId` → Should use instead of service enum
- `period` → MORNING/AFTERNOON grouping
- `timeSlotStart` / `timeSlotEnd` → Actual time boundaries
- `estimatedDuration` → Service-specific duration
- `adminNotes` → Admin-specific notes

---

## Key Data Transformations

**Frontend expects** → **Database has**
```
reservation_date → preferredDate (DateTime)
reservation_time → preferredTime (String "HH:MM")
department → service (ServiceType enum)
purpose → treatmentType ("FIRST_VISIT"/"FOLLOW_UP") + notes
doctor_name → (not stored - admin field only)
```

---

## Critical Broken Functionality

### 1. POST /api/reservations (Create)
```typescript
// CURRENT (Broken):
const newReservation = {
  id: Date.now().toString(),
  ...body
};
mockReservations.push(newReservation);  // ❌ Only in memory

// SHOULD BE:
await prisma.reservations.create({
  data: {
    id: crypto.randomUUID(),
    ...body
  }
});
```

### 2. OPTIONS /api/reservations (Available Slots)
```typescript
// CURRENT (Broken):
const availableSlots = timeSlots.filter(slot => !occupiedSlots.includes(slot));

// SHOULD BE:
const result = await calculateAvailableTimeSlots(serviceCode, dateString);
return result.slots.filter(s => s.available);
```

### 3. GET /api/reservations (List)
```typescript
// CURRENT (Issue):
const reservations = await prisma.reservations.findMany({
  orderBy: { createdAt: 'desc' }
}); // ❌ Returns ALL - no filtering

// SHOULD BE:
const reservations = await prisma.reservations.findMany({
  where: {
    preferredDate: { gte: startDate, lte: endDate },
    status: filterStatus ? { equals: filterStatus } : undefined,
    service: filterService ? { equals: filterService } : undefined,
  },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { preferredDate: 'asc' }
});
```

---

## Time-Slot System Architecture

### Period Enum (Database)
```
MORNING    # ~09:00-12:00
AFTERNOON  # ~14:00-18:00
(NO EVENING - despite admin showing it)
```

### TimeSlot Calculation Flow
```
Input: serviceCode ("WRINKLE_BOTOX"), date ("2025-11-05")
  ↓
1. Get service info (duration: 30min, buffer: 10min)
2. Get day's clinic_time_slots (e.g., MORNING 09:00-12:00, AFTERNOON 14:00-18:00)
3. Get reservations for date (cached 5 min)
4. Group reservations by time
5. Generate 30-min intervals
6. Calculate remaining capacity per slot
7. Assign status (available/limited/full)
  ↓
Output: TimeSlot[] {
  time: "09:00",
  period: "MORNING",
  available: true,
  remaining: 180,    // minutes
  total: 180,
  status: "available"
}
```

### Capacity Calculation
```
status = available   if remaining > 60%
status = limited     if remaining 20-60%
status = full        if remaining < 20%
```

---

## API Endpoints Reference

### Admin API (Current)
```
GET  /api/reservations
     → Returns: Reservation[] (ALL, no filters)
     
POST /api/reservations
     → Input: reservation data
     → Returns: created reservation (mock, not saved)
     
PUT  /api/reservations?id=xxx
     → Input: updated data
     → Returns: updated reservation (saved to DB)
     
DELETE /api/reservations?id=xxx
     → Effect: sets status=CANCELLED
     → Returns: success message
     
OPTIONS /api/reservations?date=xxx&department=xxx
        → Returns: { availableSlots: ["09:00", "09:30", ...] }
```

### Public API (Production-Ready)
```
POST /api/public/reservations
     → Full validation
     → Dual-write (legacy + new fields)
     → Daily limit checking
     → Time-slot validation
     → Returns: success/error with metadata
```

### Time-Slots API (Production-Ready)
```
GET /api/public/reservations/time-slots?service=xxx&date=xxx&debug=true
    → Returns: {
        success: true,
        slots: TimeSlot[],
        metadata: {
          date, service, serviceName,
          totalSlots, availableSlots, bookedSlots
        }
      }
```

---

## Development Tasks by Priority

### 🔴 Critical (Blocking)
- [ ] Fix POST to actually save to database
- [ ] Add filtering to GET endpoint
- [ ] Fix OPTIONS to use real calculator
- [ ] Update admin page time-slot display

### 🟡 Important (High Value)
- [ ] Period-based grouping (MORNING/AFTERNOON)
- [ ] Service selection from DB instead of hardcoded
- [ ] Capacity visualization
- [ ] Pagination support

### 🟢 Nice to Have
- [ ] Drag-drop slot reassignment
- [ ] Bulk status updates
- [ ] Export/reporting
- [ ] Advanced filtering UI

---

## Common Issues & Solutions

| Problem | Root Cause | Solution |
|---------|-----------|----------|
| New reservations don't save | POST uses mock data | Implement actual DB insert |
| Can't see all reservations | GET returns all, client filters | Add server-side pagination + filters |
| Time slots don't update | OPTIONS uses mock | Call `calculateAvailableTimeSlots()` |
| "EVENING" period shows but fails | DB has no EVENING enum | Remove from UI or add to schema |
| No capacity info shown | Not queried from DB | Query `clinic_time_slots` and calculate |
| Department filter ignores services | Uses legacy ServiceType enum | Switch to serviceId + services table |

---

## Key Functions & Utilities

### Time-Slot Calculator
```typescript
// Location: /lib/reservations/time-slot-calculator.ts
calculateAvailableTimeSlots(
  serviceCode: string,        // e.g., "WRINKLE_BOTOX"
  dateString: string,         // "2025-11-05"
  debug?: boolean
): Promise<TimeSlotResult>

// Returns period-grouped slots with capacity info
// Caches for 5 minutes
// O(n) time complexity
```

### Daily Limit Checker
```typescript
// Location: /lib/reservations/daily-limit-counter.ts
checkAvailability(
  date: Date,
  serviceType: ServiceType
): Promise<AvailabilityResult>

// Read-only availability check
// Shows currentCount vs dailyLimit

canCreateReservation(
  tx: Prisma.TransactionClient,
  date: Date,
  serviceType: ServiceType
): Promise<boolean>

// For transactional reservation creation
// Uses pessimistic locking
```

---

## Database Indexes

Optimized for common queries:
```
[preferredDate, service, status]
[preferredDate, serviceId, status]
[preferredDate, period, status]
[preferredDate, timeSlotStart, serviceId]
[status]
[serviceId]
```

---

## Testing Checklist

- [ ] GET /api/reservations filters by date
- [ ] GET /api/reservations filters by status
- [ ] GET /api/reservations filters by service
- [ ] POST /api/reservations creates in database
- [ ] OPTIONS returns correct slots for service+date
- [ ] Time-slots grouped by period (MORNING/AFTERNOON)
- [ ] Capacity calculations correct
- [ ] Status badges display correctly
- [ ] Daily limits properly enforced
- [ ] Admin form submit saves correctly

---

## Migration Notes

### From Legacy to New System
The database supports both:
```
Legacy (still used by admin):
  - service (ServiceType enum)
  - preferredTime (String)
  
New (should migrate to):
  - serviceId (FK to services)
  - period (MORNING/AFTERNOON)
  - timeSlotStart/timeSlotEnd
```

Strategy: Dual-write both, read preferredTime for now, migrate gradually.

