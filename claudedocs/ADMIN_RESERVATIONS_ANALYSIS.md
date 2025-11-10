# Admin Reservations System - Deep Analysis Report

## Executive Summary

The current admin reservations system (`/app/admin/reservations/page.tsx`) uses a **legacy table-based approach** with hardcoded time slots and manual filtering. It does NOT yet utilize the new **time-slot based system** that has been architected in the database and backend utilities. This analysis identifies gaps and recommends a redesign strategy.

---

## 1. Current Admin Page Location & Structure

**File Path**: `/Users/blee/Desktop/cms/misopin-cms/app/admin/reservations/page.tsx`

**Type**: Client-side React component using Next.js 13+ `"use client"`

**Size**: ~836 lines with extensive UI and form handling

**Key Characteristics**:
- Table-based display showing reservations for a selected date
- Filter by status (대기중/확정/완료/취소/미방문)
- Filter by department (진료과)
- Search by patient name or phone
- Date picker for filtering reservations
- Hardcoded time slots array (12 slots: 09:00-11:30, 14:00-16:30)
- Modal dialogs for viewing/editing reservations

---

## 2. Current Data Flow

### Frontend to Backend Flow

```
Admin Page (page.tsx)
    ↓
    ├→ fetchReservations() [GET /api/reservations]
    │   └→ Returns: array of Reservation objects
    │
    ├→ fetchAvailableSlots() [OPTIONS /api/reservations]
    │   └→ Returns: availableSlots array + metadata
    │
    ├→ handleSubmit() [POST/PUT /api/reservations]
    │   └→ Creates or updates reservation
    │
    └→ handleStatusUpdate() [PUT /api/reservations?id=xxx]
        └→ Changes reservation status (PENDING→CONFIRMED→COMPLETED)
```

### Backend API Routes

**Primary Admin API** (`/app/api/reservations/route.ts`):
- GET: Fetch all reservations (NO filtering - returns all)
- POST: Create reservation (uses mock data)
- PUT: Update reservation (database)
- DELETE: Cancel reservation (sets status=CANCELLED)
- OPTIONS: Get available time slots (uses mock data)

**Public API** (`/app/api/public/reservations/route.ts`):
- POST: Create reservation with validation
- Has dual-write system (legacy + new fields)
- Uses `validateTimeSlotAvailability()` from time-slot-calculator
- Uses `canCreateReservation()` for daily limits

---

## 3. Database Schema Analysis

### Reservations Table (from schema.prisma)

```prisma
model reservations {
  id            String
  patientName   String
  phone         String
  email         String?
  birthDate     DateTime
  gender        Gender
  treatmentType TreatmentType
  preferredDate DateTime      // Key: date of reservation
  
  // LEGACY FIELDS (still used by admin)
  preferredTime String        // "09:30" format
  service       ServiceType   // DEPRECATED
  
  // NEW TIME-BASED FIELDS (not used by admin yet)
  serviceId         String?   // FK to services.id
  serviceName       String?
  estimatedDuration Int?      // minutes
  period            Period?   // MORNING or AFTERNOON
  timeSlotStart     String?   // "09:30"
  timeSlotEnd       String?   // "10:00"
  
  status          ReservationStatus  // PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
  notes           String?
  adminNotes      String?
  createdAt       DateTime
  updatedAt       DateTime
  statusChangedAt DateTime
  statusChangedBy String?
  
  // Relations
  serviceRecord services? @relation(fields: [serviceId])
  
  // Indexes
  @@index([preferredDate, service, status])
  @@index([preferredDate, serviceId, status])
  @@index([preferredDate, period, status])
  @@index([preferredDate, timeSlotStart, serviceId])
  @@index([status])
  @@index([serviceId])
}
```

### Supporting Tables

**Services Table**: 
- Stores service definitions with duration and buffer times
- Connected to reservations via serviceId
- Has `durationMinutes` and `bufferMinutes` fields

**ClinicTimeSlots Table**:
- Defines available time periods by day of week and service
- Stores `period` (MORNING/AFTERNOON), `startTime`, `endTime`
- Has `maxConcurrent` capacity field
- Supports service-specific scheduling

**Period Enum**: MORNING, AFTERNOON (NOT EVENING as displayed in admin UI)

---

## 4. Missing Time-Slot Integration in Admin

### What Admin Page Currently Uses
- Hardcoded `timeSlots` array (12 fixed slots)
- Filters by `department` field (using legacy ServiceType enum)
- Does NOT use `period` field
- Does NOT use `timeSlotStart`/`timeSlotEnd` fields
- Does NOT query `clinic_time_slots` table
- Does NOT query `services` table for duration info
- Manual slot availability checking via mock data

### What Admin Should Use (New System)
- Query `clinic_time_slots` for day-specific availability
- Display slots grouped by `period` (MORNING/AFTERNOON)
- Show actual service durations from `services` table
- Calculate capacity using `maxConcurrent` field
- Support service-specific time slot configurations
- Display remaining capacity for each slot

### Data Mismatch Issues
1. **Admin UI shows "EVENING" period** but schema only has MORNING/AFTERNOON
2. **Hardcoded 12 slots** don't match clinic configuration flexibility
3. **No duration consideration** - admin assumes all slots are 30 minutes
4. **No capacity awareness** - treats slots as binary (available/full)
5. **Department field is legacy** - should be serviceId

---

## 5. Time-Slot Logic Review

### TimeSlotCalculator (`/lib/reservations/time-slot-calculator.ts`)

**Key Features**:
```typescript
calculateAvailableTimeSlots(
  serviceCode: string,      // Service code like "WRINKLE_BOTOX"
  dateString: string,       // "YYYY-MM-DD"
  debug?: boolean
): Promise<TimeSlotResult>
```

**Returns**:
```typescript
{
  slots: TimeSlot[],        // Array of available time slots
  metadata: {
    date: string,
    service: string,
    serviceName: string,
    totalSlots: number,
    availableSlots: number,
    bookedSlots: number
  }
}

TimeSlot {
  time: string,             // "09:00"
  period: Period,           // "MORNING" or "AFTERNOON"
  available: boolean,       // Can slot still be booked
  remaining: number,        // Remaining minutes in period
  total: number,            // Total minutes available in period
  status: 'available' | 'limited' | 'full'
}
```

**Implementation Logic**:
1. Validates date format (YYYY-MM-DD)
2. Gets service info (duration + buffer)
3. Gets day's clinic time slots from DB
4. Gets existing reservations for that day (cached 5 min)
5. Groups reservations by time slot
6. Generates 30-minute interval slots
7. Calculates remaining capacity for each slot
8. Returns slots grouped by period with status

**Caching**: 
- 5-minute TTL per date
- Reduces DB queries significantly
- Can be manually invalidated

**Status Calculation**:
- `available`: > 60% capacity remaining
- `limited`: 20-60% capacity
- `full`: < 20% capacity

---

## 6. Current API Implementations

### Admin API (`/api/reservations/route.ts`)
**Status**: Partially implemented, uses mock data

| Method | Current Behavior | Issues |
|--------|------------------|--------|
| GET | Fetches all reservations from DB, transforms data | No filtering by date/status/dept |
| POST | Uses mock data (NOT database) | ❌ Broken - doesn't actually create |
| PUT | Updates existing reservation | ✅ Works with DB |
| DELETE | Cancels (sets status=CANCELLED) | ✅ Works with DB |
| OPTIONS | Uses mock data for available slots | ❌ Broken - doesn't use real calc |

**Data Transform Issues**:
```typescript
// Maps database fields to admin expectations:
preferredDate → reservation_date
preferredTime → reservation_time
service (enum) → department (string)
treatmentType → purpose ("초진"/"재진")
```

### Public API (`/api/public/reservations/route.ts`)
**Status**: Production-ready for new system

Features:
- Full validation of all fields
- Dual-write support (legacy + new fields)
- Daily limit checking (pessimistic locking)
- Time-slot availability validation
- Comprehensive error handling
- CORS support

**Problem**: Admin page doesn't use this API - uses the broken admin API instead

### Time-Slots API (`/api/public/reservations/time-slots/route.ts`)
**Status**: Production-ready

Features:
- Returns detailed availability per time slot
- Shows remaining capacity
- Grouped by period
- 1-minute cache header
- Comprehensive validation
- Debug mode support

**Problem**: Admin page doesn't query this API at all

---

## 7. Daily Limits System

### Daily Limit Counter (`/lib/reservations/daily-limit-counter.ts`)

Two functions:
1. `checkAvailability(date, serviceType)`: Read-only availability check
2. `canCreateReservation(tx, date, serviceType)`: Transactional check with pessimistic locking

**Calculation**: `currentCount < limit.dailyLimit`

**Database**: `service_reservation_limits` table stores per-service daily caps

### Admin Page for Daily Limits
**File**: `/app/admin/reservations/daily-limits/page.tsx`
**Status**: Fully functional
- View all service daily limits
- Edit limits per service
- Toggle active/inactive
- Real-time stats

---

## 8. Key Issues & Gaps

### Critical Issues
| Issue | Impact | Severity |
|-------|--------|----------|
| Admin API GET has no filtering | Must fetch & filter all reservations client-side | 🔴 Critical |
| Admin API POST uses mock data | New reservations aren't saved | 🔴 Critical |
| Admin API OPTIONS uses mock data | Available slots are fake | 🔴 Critical |
| Hardcoded time slots | Ignores clinic_time_slots table | 🔴 Critical |
| No period awareness | Can't group by MORNING/AFTERNOON | 🔴 Critical |
| Department field is legacy | Should use serviceId for new system | 🔴 Critical |

### Architecture Mismatches
| Item | Admin Uses | Should Use |
|------|-----------|-----------|
| Time Slots | Hardcoded array | `clinic_time_slots` table |
| Service Identifier | `service` (enum) | `serviceId` (UUID) + `services` table |
| Grouping | None | By period (MORNING/AFTERNOON) |
| Duration | Assumed 30min | `services.durationMinutes` |
| Capacity | Binary (full/not full) | Multi-slot with `maxConcurrent` |
| Calculation | Mock logic | `calculateAvailableTimeSlots()` |

### UI Issues
1. Shows "EVENING" period - DB has no EVENING enum
2. Hardcoded 12 time slots - doesn't adapt to clinic config
3. No service duration display
4. No remaining capacity indicators
5. Table view not optimized for time-slot-based display
6. No visual separation by period

---

## 9. Dependencies & Reusable Components

### Can Reuse
✅ **UI Components**:
- Table, Dialog, Button, Badge, Select, Input, Card from `@/components/ui`
- These are properly abstracted and flexible

✅ **Backend Utilities**:
- `calculateAvailableTimeSlots()` - production-ready
- `canCreateReservation()` - production-ready  
- `validateTimeSlotAvailability()` - production-ready
- Time-slot calculator caching system

✅ **Database Schema**:
- Proper indexes for performance
- Dual-write support for migration
- Well-structured relations

### Cannot Reuse / Needs Replacement
❌ **Hardcoded data**:
- timeSlots array - replace with DB query
- departments array - replace with services query
- Mock data in OPTIONS handler

❌ **Current API endpoints**:
- POST handler uses mock
- OPTIONS handler uses mock
- GET handler has no filtering

❌ **Admin filtering logic**:
- Currently client-side filtering of all reservations
- Should be server-side with pagination

---

## 10. Recommended Redesign Approach

### Phase 1: Fix Admin API Endpoints (Essential)
1. **GET /api/reservations** - Add server-side filtering
   - Query by date range, status, serviceId
   - Add pagination support
   - Use proper indexes

2. **POST /api/reservations** - Use actual database
   - Reuse public API logic if possible
   - Store to reservations table properly
   - Use dual-write for new fields

3. **OPTIONS /api/reservations** - Use real calculator
   - Call `calculateAvailableTimeSlots()`
   - Return period-grouped slots
   - Show remaining capacity

### Phase 2: Update Admin Page UI
1. **Time-Slot Grid View** (instead of table)
   ```
   MORNING (09:00-12:00)
   ┌─────────┬─────────┬─────────┐
   │ 09:00   │ 09:30   │ 10:00   │
   │ Available (3/3) │ Full (0/3) │
   └─────────┴─────────┴─────────┘
   
   AFTERNOON (14:00-17:00)
   ┌─────────┬─────────┬─────────┐
   │ 14:00   │ 14:30   │ 15:00   │
   │ Limited (1/3) │ Available (2/3) │
   └─────────┴─────────┴─────────┘
   ```

2. **Service Selection** (use serviceId instead of department)
   - Dynamic queries from `services` table
   - Shows duration and buffer info

3. **Period-Based Grouping**
   - Separate MORNING/AFTERNOON sections
   - Collapse/expand each period
   - Show period-wide stats

4. **Capacity Indicators**
   - Visual progress bars for remaining slots
   - Color coding (green/yellow/red)
   - Numeric display (3/3 slots)

### Phase 3: Enhanced Features
1. **Drag-and-drop reassignment** between time slots
2. **Bulk status updates** for multiple reservations
3. **Time-slot capacity management** UI
4. **Conflict detection** for double-booking
5. **Export/reporting** by time slot

---

## 11. File Modifications Required

### Critical Files to Fix

**1. `/app/api/reservations/route.ts`**
- Remove mock data completely
- Implement proper GET filtering
- Fix POST to use database
- Fix OPTIONS to use `calculateAvailableTimeSlots()`
- **Impact**: Enables all admin functionality
- **Effort**: Medium (2-3 hours)

**2. `/app/admin/reservations/page.tsx`**
- Replace hardcoded time slots with dynamic query
- Add period-based grouping
- Update service/department handling
- Implement time-slot grid UI
- Update filter/search logic
- **Impact**: Complete UI redesign
- **Effort**: High (4-6 hours)

**3. `/lib/reservations/time-slot-calculator.ts`**
- No changes needed - already production-ready
- May need minor exports for admin

**4. Database Schema (schema.prisma)**
- Consider adding `period` enum value "EVENING" if needed
- Already has all necessary fields
- Good as-is

### Related Files (May Need Updates)

- `/app/api/admin/daily-limits/route.ts` - ensure it properly queries by serviceId
- Any reservation form components - update field names

---

## 12. Implementation Priorities

### Must Do (Blocking)
1. Fix GET /api/reservations to have filtering
2. Fix POST /api/reservations to actually save
3. Fix OPTIONS to use real time-slot calculator
4. Update admin page time-slot display

### Should Do (High Value)
1. Period-based grouping (MORNING/AFTERNOON)
2. Service-based instead of department-based
3. Capacity visualization
4. Pagination for large result sets

### Nice to Have
1. Drag-drop reassignment
2. Bulk updates
3. Export functionality
4. Advanced filtering

---

## 13. Testing Strategy

**Unit Tests Needed**:
- Time-slot calculator with various service durations
- Daily limit checking
- Capacity calculations

**Integration Tests Needed**:
- GET /api/reservations with filters
- POST /api/reservations creates correctly
- OPTIONS returns correct slots for date/service

**UI Tests Needed**:
- Time-slot grid rendering
- Period grouping
- Filter application
- Status updates

---

## Summary

The admin reservations page is using a **legacy hardcoded approach** while the backend has a **sophisticated time-slot based system** implemented but unused. The main work is:

1. **Fix the API layer** - Remove mock data, add filtering, use real calculators
2. **Update the UI** - Redesign from table to time-slot grid with period grouping
3. **Connect the dots** - Make admin page use the production-ready time-slot system

The good news: Most backend infrastructure is already built and production-ready. The work is primarily in the admin panel UI and fixing broken API endpoints.

