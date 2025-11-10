# Admin Reservations Time-Slot Transformation Plan

**Document Version**: 1.0
**Created**: 2025-11-04
**Status**: READY FOR EXECUTION
**Estimated Total Time**: 12-16 hours
**Risk Level**: MEDIUM

---

## Executive Summary

This plan transforms the admin reservations system from legacy date+time management to a modern time-slot based system with capacity visualization. The transformation maintains backward compatibility, enables zero-downtime deployment, and provides gradual improvement visibility to admin users.

**Key Metrics:**
- **Files to Modify**: 2 core files (route.ts, page.tsx)
- **New Components**: 3 UI components
- **Database Impact**: Zero schema changes (already compatible)
- **Breaking Changes**: None (backward compatible)
- **Rollback Strategy**: Feature flag + database compatibility

---

## Phase 1: Deep System Analysis

### Current Architecture Analysis

#### Data Flow Mapping
```
Frontend (page.tsx)
    ↓ [Form Submit]
API Route (route.ts)
    ↓ [POST - MOCK DATA]
    ✗ NOT SAVED TO DATABASE
    ↓ [Mock Array Push]
    ↓ [Response]
Frontend (UI Update)
```

**Critical Finding**: POST endpoint uses mock data array, never persists to database.

#### Database Schema Compatibility Matrix

**Existing Fields in `reservations` table:**
```prisma
// LEGACY (currently used by admin)
preferredTime: String        // "09:30" format
service: ServiceType         // Enum value

// NEW TIME-SLOT FIELDS (ready to use)
serviceId: String?
serviceName: String?
estimatedDuration: Int?
period: Period?             // MORNING | AFTERNOON
timeSlotStart: String?      // "09:00"
timeSlotEnd: String?        // "09:30"
```

**Compatibility Status**: ✅ FULLY COMPATIBLE
- Both old and new fields exist
- Indexes support both approaches
- No migration required

#### Breaking Points Identified

1. **POST /api/reservations (Line 190-230)**
   - ❌ Uses mock data array
   - ❌ Never saves to Prisma database
   - ❌ Conflicts checking against mock data only
   - Impact: HIGH - Core functionality broken

2. **OPTIONS /api/reservations (Line 367-398)**
   - ❌ Uses hardcoded `timeSlots` array
   - ❌ Checks mock data for availability
   - ❌ No time-slot-calculator integration
   - Impact: HIGH - Wrong availability data

3. **Frontend Time Slot Selection (Line 174-192)**
   - ⚠️ Uses OPTIONS call for availability
   - ⚠️ Displays simple dropdown (no capacity info)
   - ⚠️ No period awareness
   - Impact: MEDIUM - Poor UX, no capacity visualization

4. **Frontend Department Field (Line 657-676)**
   - ⚠️ Uses legacy department names ("내과", "외과")
   - ⚠️ Should use ServiceType enum or services table
   - Impact: MEDIUM - Data model mismatch

#### Dependency Graph

```
┌─────────────────────────────────────┐
│  time-slot-calculator.ts (✅ READY) │
│  - calculateAvailableTimeSlots()    │
│  - validateTimeSlotAvailability()   │
└──────────────┬──────────────────────┘
               │
               ├─────────────────────────────┐
               │                             │
               ↓                             ↓
┌──────────────────────────┐  ┌─────────────────────────┐
│ public API (✅ WORKING)  │  │ admin API (❌ BROKEN)    │
│ /api/public/.../route.ts │  │ /api/reservations/...   │
└──────────────────────────┘  └─────────┬───────────────┘
                                        │
                                        ↓
                              ┌─────────────────────────┐
                              │ admin page (⚠️ LIMITED) │
                              │ /admin/reservations/... │
                              └─────────────────────────┘
```

---

## Phase 2: Task Decomposition

### Task Breakdown with Dependencies

#### CLUSTER A: API Foundation (Critical Path)
**Total Time**: 4-5 hours
**Risk**: HIGH
**Blockers**: None

**TASK-001: Fix POST Endpoint Database Integration**
- **Description**: Replace mock data with real Prisma database operations
- **Time Estimate**: 2 hours
- **Risk Level**: HIGH
- **Priority**: CRITICAL
- **Dependencies**: None
- **Files**: `/app/api/reservations/route.ts` (Lines 190-230)
- **Validation Criteria**:
  - ✅ POST creates record in database
  - ✅ GET retrieves newly created records
  - ✅ No mock data array used
  - ✅ Returns proper error messages
- **Rollback Strategy**: Revert to mock data with feature flag
- **Test Cases**:
  1. Create reservation with all fields
  2. Create reservation with minimal fields
  3. Verify database persistence
  4. Test concurrent requests

**Implementation Steps**:
```typescript
// 1. Add Prisma create operation
const newReservation = await prisma.reservations.create({
  data: {
    patientName: body.patient_name,
    phone: body.patient_phone,
    email: body.patient_email,
    birthDate: body.birth_date || new Date(),
    gender: body.gender || 'MALE',
    treatmentType: body.treatment_type || 'FIRST_VISIT',
    preferredDate: new Date(body.reservation_date),
    preferredTime: body.reservation_time,
    service: body.department,
    status: 'PENDING',
    notes: body.notes
  }
});

// 2. Use time-slot-calculator for validation
await validateTimeSlotAvailability(
  body.department,
  body.reservation_date,
  body.reservation_time,
  period
);

// 3. Transform response
return NextResponse.json({
  reservation: transformReservation(newReservation),
  message: '예약이 등록되었습니다.'
}, { status: 201 });
```

---

**TASK-002: Integrate Time-Slot Calculator in OPTIONS**
- **Description**: Replace hardcoded time slots with dynamic calculator
- **Time Estimate**: 1.5 hours
- **Risk Level**: MEDIUM
- **Priority**: HIGH
- **Dependencies**: TASK-001 (recommended, not strict)
- **Files**: `/app/api/reservations/route.ts` (Lines 367-398)
- **Validation Criteria**:
  - ✅ Uses calculateAvailableTimeSlots()
  - ✅ Returns capacity information
  - ✅ Period-aware responses
  - ✅ Real-time availability
- **Rollback Strategy**: Revert to hardcoded slots
- **Test Cases**:
  1. Request slots for specific date/service
  2. Verify capacity calculations
  3. Test with existing reservations
  4. Validate period separation

**Implementation Steps**:
```typescript
export async function OPTIONS(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const service = searchParams.get('service') || searchParams.get('department');

  const result = await calculateAvailableTimeSlots(
    service,
    date,
    false // debug
  );

  return NextResponse.json({
    date: result.metadata.date,
    service: result.metadata.service,
    slots: result.slots.map(slot => ({
      time: slot.time,
      period: slot.period,
      available: slot.available,
      capacity: {
        remaining: slot.remaining,
        total: slot.total,
        percentage: (slot.remaining / slot.total) * 100
      },
      status: slot.status
    })),
    metadata: result.metadata
  });
}
```

---

**TASK-003: Add GET Filtering for Time-Slots**
- **Description**: Enhance GET endpoint with period and time-slot filters
- **Time Estimate**: 1 hour
- **Risk Level**: LOW
- **Priority**: MEDIUM
- **Dependencies**: TASK-001
- **Files**: `/app/api/reservations/route.ts` (Lines 5-38)
- **Validation Criteria**:
  - ✅ Filter by period (MORNING/AFTERNOON)
  - ✅ Filter by time slot range
  - ✅ Backward compatible with existing filters
  - ✅ Performance: <100ms response time
- **Rollback Strategy**: Remove new filters, keep existing
- **Test Cases**:
  1. Filter by period only
  2. Filter by date + period + time slot
  3. Combined with existing filters
  4. Performance test with 1000+ records

**Implementation Steps**:
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') as Period | null;
  const timeSlotStart = searchParams.get('timeSlotStart');

  const whereClause: any = {
    // ... existing filters
  };

  if (period) {
    whereClause.period = period;
  }

  if (timeSlotStart) {
    whereClause.timeSlotStart = {
      gte: timeSlotStart
    };
  }

  const reservations = await prisma.reservations.findMany({
    where: whereClause,
    orderBy: [
      { preferredDate: 'asc' },
      { period: 'asc' },
      { timeSlotStart: 'asc' }
    ]
  });

  return NextResponse.json(transformedData);
}
```

---

#### CLUSTER B: UI Components (Parallel Executable)
**Total Time**: 4-5 hours
**Risk**: MEDIUM
**Blockers**: TASK-002 (soft dependency)

**TASK-004: Create TimeSlotSelector Component**
- **Description**: Build reusable time slot picker with capacity visualization
- **Time Estimate**: 2 hours
- **Risk Level**: MEDIUM
- **Priority**: HIGH
- **Dependencies**: TASK-002 (for API integration)
- **Files**:
  - NEW: `/components/admin/TimeSlotSelector.tsx`
  - NEW: `/components/admin/CapacityIndicator.tsx`
- **Validation Criteria**:
  - ✅ Displays MORNING/AFTERNOON periods
  - ✅ Shows capacity bars (available/limited/full)
  - ✅ Fetches real-time availability
  - ✅ Accessible (keyboard navigation)
  - ✅ Responsive design
- **Rollback Strategy**: Use simple dropdown fallback
- **Test Cases**:
  1. Visual regression testing
  2. Accessibility audit
  3. Performance with 20+ slots
  4. Mobile responsiveness

**Component Structure**:
```typescript
interface TimeSlotSelectorProps {
  date: string;
  service: string;
  selectedSlot?: TimeSlotSelection;
  onSelect: (slot: TimeSlotSelection) => void;
}

interface TimeSlotSelection {
  time: string;
  period: Period;
  capacity: CapacityInfo;
}

const TimeSlotSelector = ({ date, service, onSelect }: Props) => {
  const { data, loading } = useTimeSlots(date, service);

  return (
    <div className="space-y-4">
      {/* MORNING Period */}
      <PeriodSection
        period="MORNING"
        slots={data?.slots.filter(s => s.period === 'MORNING')}
        onSelect={onSelect}
      />

      {/* AFTERNOON Period */}
      <PeriodSection
        period="AFTERNOON"
        slots={data?.slots.filter(s => s.period === 'AFTERNOON')}
        onSelect={onSelect}
      />
    </div>
  );
};
```

---

**TASK-005: Create CapacityIndicator Component**
- **Description**: Visual capacity bar with color coding
- **Time Estimate**: 1 hour
- **Risk Level**: LOW
- **Priority**: MEDIUM
- **Dependencies**: None (standalone)
- **Files**: NEW: `/components/admin/CapacityIndicator.tsx`
- **Validation Criteria**:
  - ✅ Color codes: Green (>60%), Yellow (20-60%), Red (<20%)
  - ✅ Shows remaining time in minutes
  - ✅ Tooltip with detailed info
  - ✅ ShadcnUI styled
- **Rollback Strategy**: Simple text display
- **Test Cases**:
  1. Visual states: available/limited/full
  2. Tooltip behavior
  3. Edge cases (0%, 100%)

**Component Structure**:
```typescript
interface CapacityIndicatorProps {
  remaining: number;
  total: number;
  status: 'available' | 'limited' | 'full';
}

const CapacityIndicator = ({ remaining, total, status }: Props) => {
  const percentage = (remaining / total) * 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="space-y-1">
            <Progress
              value={percentage}
              className={cn(
                status === 'available' && 'bg-green-500',
                status === 'limited' && 'bg-yellow-500',
                status === 'full' && 'bg-red-500'
              )}
            />
            <span className="text-xs text-gray-600">
              {remaining}분 남음
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>총 {total}분 중 {remaining}분 사용 가능</p>
          <p>예약 가능 상태: {statusLabels[status]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

---

**TASK-006: Create ReservationCalendarView Component**
- **Description**: Calendar grid showing daily capacity overview
- **Time Estimate**: 2 hours
- **Risk Level**: MEDIUM
- **Priority**: LOW (nice-to-have)
- **Dependencies**: TASK-002, TASK-004
- **Files**: NEW: `/components/admin/ReservationCalendarView.tsx`
- **Validation Criteria**:
  - ✅ Monthly calendar grid
  - ✅ Daily capacity summary
  - ✅ Click to filter by date
  - ✅ Loading states
- **Rollback Strategy**: Use simple date picker
- **Test Cases**:
  1. Navigation between months
  2. Date selection behavior
  3. Performance with 30+ days

---

#### CLUSTER C: Frontend Integration (Sequential)
**Total Time**: 3-4 hours
**Risk**: MEDIUM
**Blockers**: TASK-004 (hard dependency)

**TASK-007: Integrate TimeSlotSelector in Admin Form**
- **Description**: Replace simple time dropdown with new component
- **Time Estimate**: 1.5 hours
- **Risk Level**: MEDIUM
- **Priority**: HIGH
- **Dependencies**: TASK-004
- **Files**: `/app/admin/reservations/page.tsx` (Lines 639-654)
- **Validation Criteria**:
  - ✅ Form validation works
  - ✅ Submission includes period + time slot
  - ✅ Backward compatible with existing data
  - ✅ Error handling for unavailable slots
- **Rollback Strategy**: Feature flag to toggle component
- **Test Cases**:
  1. Select slot and submit form
  2. Validate period is saved
  3. Test with unavailable slot
  4. Verify DB record structure

**Implementation Steps**:
```typescript
// Replace lines 639-654 in page.tsx
<div>
  <Label htmlFor="reservation_time">예약 시간 *</Label>
  <TimeSlotSelector
    date={formData.reservation_date}
    service={formData.department}
    selectedSlot={formData.timeSlot}
    onSelect={(slot) => setFormData({
      ...formData,
      timeSlot: slot,
      reservation_time: slot.time,  // backward compat
      period: slot.period,
      timeSlotStart: slot.time,
      timeSlotEnd: calculateEndTime(slot.time, slot.capacity.total)
    })}
  />
</div>
```

---

**TASK-008: Update Service/Department Selector**
- **Description**: Migrate from hardcoded departments to services table
- **Time Estimate**: 1 hour
- **Risk Level**: LOW
- **Priority**: MEDIUM
- **Dependencies**: None
- **Files**: `/app/admin/reservations/page.tsx` (Lines 92-96, 657-676)
- **Validation Criteria**:
  - ✅ Fetches services from database
  - ✅ Displays active services only
  - ✅ Maps to ServiceType enum correctly
  - ✅ Backward compatible with existing data
- **Rollback Strategy**: Keep hardcoded list as fallback
- **Test Cases**:
  1. Load services dynamically
  2. Filter by active status
  3. Verify service code mapping
  4. Test with empty services table

**Implementation Steps**:
```typescript
// Add service fetching
const [services, setServices] = useState<Service[]>([]);

useEffect(() => {
  fetch('/api/services')
    .then(res => res.json())
    .then(data => setServices(data.filter(s => s.isActive)));
}, []);

// Replace department selector
<Select
  value={formData.service}
  onValueChange={(value) => {
    const selected = services.find(s => s.code === value);
    setFormData({
      ...formData,
      service: value,
      serviceName: selected?.name,
      estimatedDuration: selected?.durationMinutes
    });
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="서비스 선택" />
  </SelectTrigger>
  <SelectContent>
    {services.map(service => (
      <SelectItem key={service.id} value={service.code}>
        {service.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

**TASK-009: Add Capacity Visualization to Reservations Table**
- **Description**: Show capacity status in main reservations list
- **Time Estimate**: 1 hour
- **Risk Level**: LOW
- **Priority**: LOW (enhancement)
- **Dependencies**: TASK-005
- **Files**: `/app/admin/reservations/page.tsx` (Lines 460-575)
- **Validation Criteria**:
  - ✅ Shows capacity badge per reservation
  - ✅ Color-coded by status
  - ✅ Performance: No lag with 100+ rows
  - ✅ Optional column (can hide)
- **Rollback Strategy**: Hide column via settings
- **Test Cases**:
  1. Display with various capacity levels
  2. Performance test with 200+ rows
  3. Responsive behavior

---

#### CLUSTER D: Testing & Validation (Parallel Executable)
**Total Time**: 2-3 hours
**Risk**: LOW
**Blockers**: TASK-001, TASK-007 (soft dependencies)

**TASK-010: Write API Integration Tests**
- **Description**: Test suite for API endpoints
- **Time Estimate**: 1.5 hours
- **Risk Level**: LOW
- **Priority**: HIGH
- **Dependencies**: TASK-001, TASK-002, TASK-003
- **Files**: NEW: `/tests/api/reservations.test.ts`
- **Validation Criteria**:
  - ✅ Tests for all CRUD operations
  - ✅ Time-slot availability validation
  - ✅ Concurrent booking scenarios
  - ✅ Error handling coverage
- **Rollback Strategy**: N/A (tests only)
- **Test Cases**:
  1. Create reservation with time slot
  2. Check availability calculation
  3. Test capacity limits
  4. Validate period handling
  5. Test concurrent bookings

---

**TASK-011: Write Component Tests**
- **Description**: Test suite for new UI components
- **Time Estimate**: 1 hour
- **Risk Level**: LOW
- **Priority**: MEDIUM
- **Dependencies**: TASK-004, TASK-005
- **Files**:
  - NEW: `/tests/components/TimeSlotSelector.test.tsx`
  - NEW: `/tests/components/CapacityIndicator.test.tsx`
- **Validation Criteria**:
  - ✅ Component rendering tests
  - ✅ User interaction tests
  - ✅ Accessibility tests
  - ✅ Edge case handling
- **Rollback Strategy**: N/A (tests only)
- **Test Cases**:
  1. Slot selection behavior
  2. Capacity color coding
  3. Keyboard navigation
  4. Loading states

---

**TASK-012: End-to-End Testing**
- **Description**: Full workflow testing from creation to completion
- **Time Estimate**: 1 hour
- **Risk Level**: LOW
- **Priority**: HIGH
- **Dependencies**: All previous tasks
- **Files**: NEW: `/tests/e2e/admin-reservations.spec.ts`
- **Validation Criteria**:
  - ✅ Complete reservation workflow
  - ✅ Capacity updates in real-time
  - ✅ Status transitions work
  - ✅ No data loss scenarios
- **Rollback Strategy**: N/A (tests only)
- **Test Cases**:
  1. Create → Confirm → Complete flow
  2. Create → Cancel flow
  3. Multiple concurrent users
  4. Capacity edge cases

---

#### CLUSTER E: Documentation & Polish (Final Phase)
**Total Time**: 1-2 hours
**Risk**: LOW
**Blockers**: All implementation tasks

**TASK-013: Update API Documentation**
- **Description**: Document new endpoints and parameters
- **Time Estimate**: 30 minutes
- **Risk Level**: LOW
- **Priority**: HIGH
- **Dependencies**: TASK-001, TASK-002, TASK-003
- **Files**: NEW: `/docs/api/admin-reservations.md`
- **Validation Criteria**:
  - ✅ All endpoints documented
  - ✅ Request/response examples
  - ✅ Error codes explained
  - ✅ Migration guide included
- **Rollback Strategy**: N/A (docs only)

---

**TASK-014: Create Admin User Guide**
- **Description**: Guide for using new time-slot features
- **Time Estimate**: 30 minutes
- **Risk Level**: LOW
- **Priority**: MEDIUM
- **Dependencies**: TASK-007, TASK-008, TASK-009
- **Files**: NEW: `/docs/admin/time-slot-management.md`
- **Validation Criteria**:
  - ✅ Screenshots included
  - ✅ Step-by-step instructions
  - ✅ Common issues addressed
  - ✅ Korean language
- **Rollback Strategy**: N/A (docs only)

---

**TASK-015: Performance Optimization Audit**
- **Description**: Review and optimize performance bottlenecks
- **Time Estimate**: 1 hour
- **Risk Level**: LOW
- **Priority**: MEDIUM
- **Dependencies**: All implementation tasks
- **Files**: Multiple (as needed)
- **Validation Criteria**:
  - ✅ API response time <200ms
  - ✅ UI rendering <100ms
  - ✅ Database query optimization
  - ✅ Caching strategy verified
- **Rollback Strategy**: Revert optimizations if issues arise

---

### Task Dependency Visualization

```
Critical Path (Sequential):
TASK-001 → TASK-002 → TASK-004 → TASK-007 → E2E Testing
   (2h)      (1.5h)      (2h)        (1.5h)      (1h)
Total: 8 hours

Parallel Branches:
├─ TASK-003 (1h) - Can run after TASK-001
├─ TASK-005 (1h) - Standalone, anytime
├─ TASK-008 (1h) - Independent
└─ TASK-010 (1.5h) - Can start early

Optional Enhancements:
├─ TASK-006 (2h) - Calendar view
└─ TASK-009 (1h) - Table capacity viz

Final Phase:
├─ TASK-013 (30m) - API docs
├─ TASK-014 (30m) - User guide
└─ TASK-015 (1h) - Performance audit
```

---

## Phase 3: Technical Specifications

### API Endpoint Specifications

#### POST /api/reservations

**Request Schema:**
```typescript
interface CreateReservationRequest {
  // Patient info (required)
  patient_name: string;
  patient_phone: string;
  birth_date?: string;        // ISO date, defaults to placeholder
  gender?: 'MALE' | 'FEMALE'; // defaults to 'MALE'

  // Optional patient info
  patient_email?: string;

  // Reservation details (required)
  reservation_date: string;   // YYYY-MM-DD
  service: string;            // ServiceType enum or service code

  // NEW: Time slot fields (recommended)
  period?: 'MORNING' | 'AFTERNOON';
  timeSlotStart?: string;     // "09:00" format
  timeSlotEnd?: string;       // "09:30" format
  estimatedDuration?: number; // minutes

  // LEGACY: Still supported for backward compatibility
  reservation_time?: string;  // "09:00" format

  // Additional info
  treatment_type?: 'FIRST_VISIT' | 'FOLLOW_UP';
  notes?: string;
}
```

**Response Schema:**
```typescript
interface CreateReservationResponse {
  success: boolean;
  reservation: {
    id: string;
    patient_name: string;
    patient_phone: string;
    patient_email?: string;
    reservation_date: string;
    reservation_time: string;  // for backward compat
    period?: 'MORNING' | 'AFTERNOON';
    timeSlotStart?: string;
    timeSlotEnd?: string;
    department: string;
    status: ReservationStatus;
    notes?: string;
    created_at: string;
    updated_at: string;
  };
  message: string;
}
```

**Error Responses:**
```typescript
// 400 - Time slot unavailable
{
  success: false,
  error: 'TIME_SLOT_FULL',
  message: '해당 시간대 예약이 마감되었습니다',
  metadata: {
    suggestedTimes: ['09:30', '10:00', '10:30'],
    remainingMinutes: 15,
    requiredMinutes: 30
  }
}

// 400 - Validation error
{
  success: false,
  error: 'VALIDATION_ERROR',
  message: '필수 정보가 누락되었습니다',
  details: {
    missing_fields: ['patient_name', 'reservation_date']
  }
}

// 500 - Server error
{
  success: false,
  error: 'INTERNAL_ERROR',
  message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}
```

---

#### OPTIONS /api/reservations

**Query Parameters:**
```typescript
{
  date: string;      // YYYY-MM-DD (required)
  service: string;   // Service code or department (required)
  debug?: string;    // "true" for debug info
}
```

**Response Schema:**
```typescript
interface TimeSlotAvailabilityResponse {
  success: boolean;
  date: string;
  service: string;
  slots: Array<{
    time: string;           // "09:00"
    period: 'MORNING' | 'AFTERNOON';
    available: boolean;
    capacity: {
      remaining: number;    // minutes
      total: number;        // minutes
      percentage: number;   // 0-100
    };
    status: 'available' | 'limited' | 'full';
  }>;
  metadata: {
    date: string;
    service: string;
    serviceName: string;
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
  };
}
```

---

#### GET /api/reservations (Enhanced)

**New Query Parameters:**
```typescript
{
  // Existing parameters
  date?: string;
  status?: ReservationStatus;
  department?: string;
  search?: string;

  // NEW: Time-slot filters
  period?: 'MORNING' | 'AFTERNOON';
  timeSlotStart?: string;    // Filter by start time
  timeSlotEnd?: string;      // Filter by end time
  serviceId?: string;        // Filter by service ID
}
```

**Response:** (Same structure as current, with added fields)
```typescript
interface Reservation {
  // ... existing fields

  // NEW fields (optional, for time-slot reservations)
  period?: 'MORNING' | 'AFTERNOON';
  timeSlotStart?: string;
  timeSlotEnd?: string;
  serviceName?: string;
  estimatedDuration?: number;
}
```

---

### Database Query Patterns

#### Optimized Availability Query

```typescript
// Single query with aggregate for capacity calculation
async function getTimeSlotCapacity(
  date: string,
  service: string,
  period: Period,
  timeSlot: string
): Promise<CapacityInfo> {
  const result = await prisma.reservations.groupBy({
    by: ['period', 'timeSlotStart'],
    where: {
      preferredDate: new Date(date),
      serviceId: service,
      period: period,
      timeSlotStart: timeSlot,
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    },
    _sum: {
      estimatedDuration: true
    }
  });

  const consumed = result[0]?._sum?.estimatedDuration || 0;
  const total = getClinicTimeSlotTotal(period, timeSlot);

  return {
    consumed,
    remaining: total - consumed,
    total,
    available: (total - consumed) >= requiredDuration
  };
}
```

#### Bulk Reservation Fetch with Capacity

```typescript
// Fetch reservations with pre-calculated capacity
async function getReservationsWithCapacity(
  filters: FilterOptions
): Promise<ReservationWithCapacity[]> {
  const reservations = await prisma.reservations.findMany({
    where: buildWhereClause(filters),
    include: {
      serviceRecord: {
        select: {
          name: true,
          durationMinutes: true,
          bufferMinutes: true
        }
      }
    },
    orderBy: [
      { preferredDate: 'asc' },
      { period: 'asc' },
      { timeSlotStart: 'asc' }
    ]
  });

  // Batch calculate capacity for unique time slots
  const uniqueSlots = new Set(
    reservations.map(r => `${r.preferredDate}-${r.period}-${r.timeSlotStart}`)
  );

  const capacityMap = await batchCalculateCapacity(Array.from(uniqueSlots));

  return reservations.map(r => ({
    ...r,
    capacity: capacityMap.get(`${r.preferredDate}-${r.period}-${r.timeSlotStart}`)
  }));
}
```

---

### UI Component Structure

#### TimeSlotSelector Component

```typescript
// File: /components/admin/TimeSlotSelector.tsx

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CapacityIndicator } from './CapacityIndicator';

export interface TimeSlot {
  time: string;
  period: 'MORNING' | 'AFTERNOON';
  available: boolean;
  capacity: {
    remaining: number;
    total: number;
    percentage: number;
  };
  status: 'available' | 'limited' | 'full';
}

interface TimeSlotSelectorProps {
  date: string;
  service: string;
  selectedSlot?: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  disabled?: boolean;
}

export const TimeSlotSelector = ({
  date,
  service,
  selectedSlot,
  onSelect,
  disabled = false
}: TimeSlotSelectorProps) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !service) return;

    const fetchSlots = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/reservations?date=${date}&service=${service}`,
          { method: 'OPTIONS' }
        );

        if (!response.ok) throw new Error('Failed to fetch slots');

        const data = await response.json();
        setSlots(data.slots || []);
      } catch (err) {
        setError('시간대를 불러올 수 없습니다.');
        console.error('Error fetching time slots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [date, service]);

  const morningSlots = slots.filter(s => s.period === 'MORNING');
  const afternoonSlots = slots.filter(s => s.period === 'AFTERNOON');

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        해당 날짜에 예약 가능한 시간이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Morning Period */}
      {morningSlots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">오전</Badge>
            <span className="text-sm text-gray-500">
              {morningSlots.filter(s => s.available).length}개 가능
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {morningSlots.map(slot => (
              <TimeSlotButton
                key={slot.time}
                slot={slot}
                selected={selectedSlot?.time === slot.time}
                onClick={() => onSelect(slot)}
                disabled={disabled || !slot.available}
              />
            ))}
          </div>
        </div>
      )}

      {/* Afternoon Period */}
      {afternoonSlots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">오후</Badge>
            <span className="text-sm text-gray-500">
              {afternoonSlots.filter(s => s.available).length}개 가능
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {afternoonSlots.map(slot => (
              <TimeSlotButton
                key={slot.time}
                slot={slot}
                selected={selectedSlot?.time === slot.time}
                onClick={() => onSelect(slot)}
                disabled={disabled || !slot.available}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for individual time slot button
const TimeSlotButton = ({
  slot,
  selected,
  onClick,
  disabled
}: {
  slot: TimeSlot;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) => {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-start h-auto py-2',
        !disabled && slot.status === 'limited' && 'border-yellow-400',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="font-medium">{slot.time}</span>
      <CapacityIndicator
        remaining={slot.capacity.remaining}
        total={slot.capacity.total}
        status={slot.status}
        compact
      />
    </Button>
  );
};
```

---

#### CapacityIndicator Component

```typescript
// File: /components/admin/CapacityIndicator.tsx

import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CapacityIndicatorProps {
  remaining: number;
  total: number;
  status: 'available' | 'limited' | 'full';
  compact?: boolean;
}

const statusConfig = {
  available: {
    label: '여유',
    color: 'bg-green-500',
    textColor: 'text-green-600'
  },
  limited: {
    label: '제한적',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600'
  },
  full: {
    label: '마감',
    color: 'bg-red-500',
    textColor: 'text-red-600'
  }
};

export const CapacityIndicator = ({
  remaining,
  total,
  status,
  compact = false
}: CapacityIndicatorProps) => {
  const percentage = Math.max(0, Math.min(100, (remaining / total) * 100));
  const config = statusConfig[status];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <Progress
                value={percentage}
                className={cn('h-1', config.color)}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>총 {total}분 중 {remaining}분 사용 가능</p>
              <p>상태: {config.label}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={cn('font-medium', config.textColor)}>
          {config.label}
        </span>
        <span className="text-gray-600">
          {remaining}분 / {total}분
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn('h-2', config.color)}
      />
    </div>
  );
};
```

---

### Data Transformation Logic

#### Frontend to Database Mapping

```typescript
// File: /lib/reservations/data-transformer.ts

export interface FrontendReservationData {
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  birth_date?: string;
  gender?: 'MALE' | 'FEMALE';
  reservation_date: string;
  reservation_time: string;
  service: string;
  treatment_type?: 'FIRST_VISIT' | 'FOLLOW_UP';
  notes?: string;

  // Time-slot fields (optional)
  period?: 'MORNING' | 'AFTERNOON';
  timeSlotStart?: string;
  timeSlotEnd?: string;
  estimatedDuration?: number;
}

export interface DatabaseReservationData {
  patientName: string;
  phone: string;
  email?: string;
  birthDate: Date;
  gender: 'MALE' | 'FEMALE';
  treatmentType: 'FIRST_VISIT' | 'FOLLOW_UP';
  preferredDate: Date;
  preferredTime: string;
  service: string;
  status: 'PENDING';
  notes?: string;

  // NEW: Time-slot fields
  serviceId?: string;
  serviceName?: string;
  estimatedDuration?: number;
  period?: 'MORNING' | 'AFTERNOON';
  timeSlotStart?: string;
  timeSlotEnd?: string;
}

export function transformFrontendToDatabase(
  data: FrontendReservationData,
  serviceRecord?: { id: string; name: string; durationMinutes: number }
): DatabaseReservationData {
  return {
    // Patient info
    patientName: data.patient_name,
    phone: data.patient_phone,
    email: data.patient_email || null,
    birthDate: data.birth_date ? new Date(data.birth_date) : new Date('2000-01-01'),
    gender: data.gender || 'MALE',
    treatmentType: data.treatment_type || 'FIRST_VISIT',

    // Reservation info (legacy fields)
    preferredDate: new Date(data.reservation_date),
    preferredTime: data.reservation_time,
    service: data.service,
    status: 'PENDING',
    notes: data.notes || null,

    // NEW: Time-slot fields (if available)
    serviceId: serviceRecord?.id,
    serviceName: serviceRecord?.name,
    estimatedDuration: data.estimatedDuration || serviceRecord?.durationMinutes,
    period: data.period,
    timeSlotStart: data.timeSlotStart || data.reservation_time,
    timeSlotEnd: data.timeSlotEnd,
  };
}

export function transformDatabaseToFrontend(
  dbRecord: any
): FrontendReservationData & { id: string; status: string; created_at: string; updated_at: string } {
  return {
    id: dbRecord.id,
    patient_name: dbRecord.patientName,
    patient_phone: dbRecord.phone,
    patient_email: dbRecord.email,
    reservation_date: dbRecord.preferredDate.toISOString().split('T')[0],
    reservation_time: dbRecord.preferredTime,
    service: dbRecord.service,
    status: dbRecord.status,
    notes: dbRecord.notes,
    created_at: dbRecord.createdAt.toISOString(),
    updated_at: dbRecord.updatedAt.toISOString(),

    // NEW: Time-slot fields
    period: dbRecord.period,
    timeSlotStart: dbRecord.timeSlotStart,
    timeSlotEnd: dbRecord.timeSlotEnd,
    estimatedDuration: dbRecord.estimatedDuration,
  };
}
```

---

## Implementation Order & Critical Path

### Phase 1: Foundation (Days 1-2)
**Goal**: Fix broken functionality, establish working baseline

1. **TASK-001**: Fix POST endpoint (2h) ⚠️ **BLOCKING**
2. **TASK-002**: Integrate time-slot calculator in OPTIONS (1.5h) ⚠️ **BLOCKING**
3. **TASK-003**: Enhance GET filtering (1h)
4. **TASK-010**: Write API integration tests (1.5h) ✅ **VALIDATION**

**Validation Gate**:
- ✅ Can create reservations via API
- ✅ Reservations persist to database
- ✅ Time slot availability is accurate
- ✅ Tests pass with 100% coverage

---

### Phase 2: UI Components (Days 2-3)
**Goal**: Build reusable UI components with capacity visualization

5. **TASK-005**: Create CapacityIndicator (1h)
6. **TASK-004**: Create TimeSlotSelector (2h) ⚠️ **BLOCKING**
7. **TASK-011**: Write component tests (1h) ✅ **VALIDATION**

**Validation Gate**:
- ✅ Components render correctly
- ✅ Capacity colors display properly
- ✅ Accessibility audit passes
- ✅ Component tests pass

---

### Phase 3: Integration (Days 3-4)
**Goal**: Integrate new components into admin page

8. **TASK-007**: Integrate TimeSlotSelector in form (1.5h) ⚠️ **BLOCKING**
9. **TASK-008**: Update service selector (1h)
10. **TASK-012**: End-to-end testing (1h) ✅ **VALIDATION**

**Validation Gate**:
- ✅ Can create reservations with time slots via UI
- ✅ Data saves correctly to database
- ✅ Backward compatibility maintained
- ✅ E2E tests pass

---

### Phase 4: Polish & Documentation (Day 4)
**Goal**: Optimize, document, and prepare for deployment

11. **TASK-015**: Performance optimization (1h)
12. **TASK-013**: API documentation (30m)
13. **TASK-014**: Admin user guide (30m)

**Optional Enhancements** (if time permits):
- **TASK-006**: Calendar view component (2h)
- **TASK-009**: Table capacity visualization (1h)

**Final Validation Gate**:
- ✅ Performance benchmarks met
- ✅ Documentation complete
- ✅ All tests passing
- ✅ Ready for production deployment

---

### Parallel Execution Strategy

```
Day 1 Morning:
├─ Developer A: TASK-001 (POST endpoint) - 2h
└─ Developer B: TASK-005 (CapacityIndicator) - 1h

Day 1 Afternoon:
├─ Developer A: TASK-002 (OPTIONS endpoint) - 1.5h
└─ Developer B: TASK-004 (TimeSlotSelector) - 2h

Day 2 Morning:
├─ Developer A: TASK-003 (GET filtering) - 1h
├─ Developer B: TASK-008 (Service selector) - 1h
└─ QA: TASK-010 (API tests) - 1.5h

Day 2 Afternoon:
├─ Developer A: TASK-007 (Form integration) - 1.5h
└─ QA: TASK-011 (Component tests) - 1h

Day 3:
├─ All: TASK-012 (E2E testing) - 1h
├─ Developer A: TASK-015 (Performance) - 1h
└─ Developer B: TASK-013 + TASK-014 (Docs) - 1h

Optional Day 4:
└─ TASK-006 (Calendar) + TASK-009 (Table viz) - 3h
```

**Estimated Completion**:
- **Minimum Viable**: 3 days (12 hours)
- **Full Implementation**: 4 days (16 hours)
- **With Enhancements**: 5 days (19 hours)

---

## Risk Mitigation Strategies

### Risk Matrix

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| **Database write failures** | MEDIUM | HIGH | Extensive testing, transaction rollback | Revert to mock data with warning |
| **Performance degradation** | LOW | MEDIUM | Caching, query optimization, monitoring | Add database indexes |
| **Breaking existing workflows** | MEDIUM | HIGH | Backward compatibility, feature flags | Quick rollback mechanism |
| **Time-slot calculation errors** | LOW | HIGH | Thorough testing, validation gates | Use hardcoded slots fallback |
| **UI component bugs** | MEDIUM | LOW | Component testing, visual regression | Graceful degradation to simple UI |
| **Concurrent booking conflicts** | MEDIUM | MEDIUM | Database constraints, optimistic locking | Show conflict message, suggest alternatives |

---

### Rollback Strategies

#### Level 1: Feature Flag Rollback
**Trigger**: Minor UI issues, user confusion
**Action**: Toggle feature flag to revert to simple dropdown
**Impact**: Immediate, no code deployment
**Recovery Time**: < 5 minutes

```typescript
// Environment variable control
const USE_TIMESLOT_SELECTOR = process.env.NEXT_PUBLIC_FEATURE_TIMESLOT === 'true';

// Component-level fallback
{USE_TIMESLOT_SELECTOR ? (
  <TimeSlotSelector {...props} />
) : (
  <SimpleTimeDropdown {...props} />
)}
```

---

#### Level 2: API Endpoint Rollback
**Trigger**: POST endpoint failures, data inconsistency
**Action**: Deploy previous API version, keep UI changes
**Impact**: Requires code deployment
**Recovery Time**: 10-15 minutes

```typescript
// Version-controlled endpoints
const API_VERSION = process.env.API_VERSION || 'v2';

if (API_VERSION === 'v1') {
  // Legacy mock data approach
} else {
  // New database approach
}
```

---

#### Level 3: Full System Rollback
**Trigger**: Critical failures, data corruption
**Action**: Full rollback to previous deployment
**Impact**: Complete reversion
**Recovery Time**: 15-30 minutes

**Procedure**:
1. Deploy previous Docker image/build
2. Clear application cache
3. Verify database integrity
4. Notify users of service restoration

---

### Backward Compatibility Guarantee

#### Data Layer Compatibility
```typescript
// Both old and new fields are supported
interface ReservationRecord {
  // LEGACY: Always populated for backward compatibility
  preferredTime: string;    // "09:30"
  service: string;          // ServiceType enum

  // NEW: Populated when using time-slot system
  period?: Period;
  timeSlotStart?: string;
  timeSlotEnd?: string;
  serviceId?: string;
}
```

**Strategy**:
1. Write new fields when available
2. Always write legacy fields for compatibility
3. Read logic checks new fields first, falls back to legacy
4. No migration required - gradual transition

---

#### API Compatibility
```typescript
// POST /api/reservations accepts BOTH formats

// Format 1: Legacy (still works)
{
  "reservation_time": "09:30",
  "department": "내과"
}

// Format 2: New (preferred)
{
  "period": "MORNING",
  "timeSlotStart": "09:30",
  "timeSlotEnd": "10:00",
  "service": "WRINKLE_BOTOX"
}

// Format 3: Hybrid (both provided)
{
  "reservation_time": "09:30",  // backward compat
  "period": "MORNING",
  "timeSlotStart": "09:30"
}
```

---

## Testing Strategy

### Test Pyramid

```
         /\
        /  \       E2E Tests (5%)
       /----\      - Full workflow tests
      /      \     - User journey testing
     /--------\
    /          \   Integration Tests (15%)
   /            \  - API endpoint tests
  /--------------\ - Component integration
 /                \
/------------------\ Unit Tests (80%)
                     - Pure functions
                     - Component logic
                     - Data transformations
```

---

### Test Coverage Requirements

| Layer | Coverage Target | Priority |
|-------|----------------|----------|
| **API Endpoints** | 90%+ | HIGH |
| **UI Components** | 80%+ | HIGH |
| **Data Transformers** | 95%+ | HIGH |
| **Utility Functions** | 90%+ | MEDIUM |
| **E2E Workflows** | 100% critical paths | HIGH |

---

### Critical Test Scenarios

#### Scenario 1: Concurrent Booking Conflict
```typescript
describe('Concurrent booking conflict', () => {
  test('should handle simultaneous bookings for same slot', async () => {
    const slot = { date: '2025-11-05', time: '09:00', service: 'WRINKLE_BOTOX' };

    // Simulate two users booking at the same time
    const [booking1, booking2] = await Promise.allSettled([
      createReservation({ ...slot, patient_name: 'Patient A' }),
      createReservation({ ...slot, patient_name: 'Patient B' })
    ]);

    // One should succeed, one should fail
    expect(booking1.status === 'fulfilled' || booking2.status === 'fulfilled').toBe(true);
    expect(booking1.status === 'rejected' || booking2.status === 'rejected').toBe(true);

    // Failed booking should suggest alternative times
    const failed = booking1.status === 'rejected' ? booking1 : booking2;
    expect(failed.reason.metadata.suggestedTimes).toBeDefined();
  });
});
```

---

#### Scenario 2: Capacity Edge Cases
```typescript
describe('Capacity edge cases', () => {
  test('should handle exact capacity fill', async () => {
    // Clinic has 180 minutes capacity
    // Service requires 30 minutes + 10 buffer = 40 minutes
    // Should fit 4 bookings: 40 * 4 = 160 minutes (20 remaining)

    const slot = { date: '2025-11-05', time: '09:00', period: 'MORNING' };

    // Book 4 times
    for (let i = 0; i < 4; i++) {
      await createReservation({ ...slot, patient_name: `Patient ${i}` });
    }

    // Check availability
    const availability = await getTimeSlotAvailability(slot);
    expect(availability.remaining).toBe(20);
    expect(availability.available).toBe(false); // Not enough for another 40-min slot
    expect(availability.status).toBe('full');
  });

  test('should handle zero capacity correctly', async () => {
    // Fill slot completely
    const slot = { date: '2025-11-05', time: '09:00' };
    await fillSlotCompletely(slot);

    // Try to book
    const result = await createReservation(slot);
    expect(result.success).toBe(false);
    expect(result.error).toBe('TIME_SLOT_FULL');
  });
});
```

---

#### Scenario 3: Data Migration Compatibility
```typescript
describe('Backward compatibility', () => {
  test('should handle legacy reservations without time-slot fields', async () => {
    // Legacy reservation (no period, timeSlotStart)
    const legacyReservation = await createLegacyReservation({
      preferredTime: '09:30',
      service: 'WRINKLE_BOTOX'
    });

    // Should still display correctly
    const reservations = await getReservations();
    expect(reservations.some(r => r.id === legacyReservation.id)).toBe(true);
  });

  test('should handle mixed legacy and new format reservations', async () => {
    // Create both types
    await createLegacyReservation({ preferredTime: '09:00' });
    await createModernReservation({ period: 'MORNING', timeSlotStart: '09:30' });

    // Both should be queryable
    const reservations = await getReservations({ date: '2025-11-05' });
    expect(reservations.length).toBe(2);
  });
});
```

---

### Performance Benchmarks

| Operation | Target | Acceptable | Unacceptable |
|-----------|--------|------------|--------------|
| **GET reservations (100 records)** | <100ms | <200ms | >500ms |
| **POST create reservation** | <150ms | <300ms | >1s |
| **OPTIONS availability check** | <200ms | <400ms | >1s |
| **Time-slot calculation** | <100ms | <200ms | >500ms |
| **UI component render** | <50ms | <100ms | >200ms |
| **Page load (admin)** | <1s | <2s | >3s |

---

## Deployment Strategy

### Zero-Downtime Deployment

#### Phase 1: Database Preparation (Pre-Deployment)
```bash
# No schema changes needed - already compatible!
# Verify indexes exist:
prisma db push --preview-feature

# Check index performance:
EXPLAIN ANALYZE SELECT * FROM reservations
WHERE "preferredDate" = '2025-11-05'
  AND period = 'MORNING'
  AND status IN ('PENDING', 'CONFIRMED');
```

---

#### Phase 2: Gradual Rollout (Blue-Green)

**Step 1: Deploy API Changes**
```bash
# Deploy new API endpoints
docker build -t misopin-cms:v2.0-api .
docker tag misopin-cms:v2.0-api misopin-cms:latest

# Keep old version running
docker run -d --name cms-old misopin-cms:v1.9
docker run -d --name cms-new misopin-cms:v2.0-api

# Route 10% traffic to new version (load balancer config)
```

**Step 2: Monitor & Validate**
- Monitor error rates
- Check database write success rate
- Verify capacity calculations
- Review user feedback

**Step 3: Increase Traffic**
- 10% → 25% → 50% → 100% over 48 hours
- Rollback immediately if error rate > 1%

---

#### Phase 3: UI Deployment

**Feature Flag Strategy**:
```typescript
// Environment variable control
const features = {
  timeslotSelector: process.env.NEXT_PUBLIC_FEATURE_TIMESLOT === 'true',
  capacityVisualization: process.env.NEXT_PUBLIC_FEATURE_CAPACITY === 'true',
  calendarView: process.env.NEXT_PUBLIC_FEATURE_CALENDAR === 'true'
};

// Gradual rollout
// Week 1: Enable for 10% of users (A/B testing)
// Week 2: Enable for 50% if no issues
// Week 3: Enable for 100%
```

---

### Health Checks

```typescript
// Health check endpoint
export async function GET(request: Request) {
  const checks = {
    database: await checkDatabaseConnection(),
    timeSlotCalculator: await checkTimeSlotCalculator(),
    prismaClient: await checkPrismaClient(),
    cache: checkCacheHealth()
  };

  const healthy = Object.values(checks).every(c => c.status === 'healthy');

  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }, {
    status: healthy ? 200 : 503
  });
}
```

---

### Monitoring & Alerts

#### Key Metrics to Monitor

1. **API Performance**
   - Response time (p50, p95, p99)
   - Error rate
   - Request volume

2. **Database Performance**
   - Query execution time
   - Connection pool utilization
   - Slow query log

3. **Business Metrics**
   - Reservation creation success rate
   - Time slot capacity utilization
   - User booking completion rate

4. **User Experience**
   - Page load time
   - Component render time
   - User error encounters

---

#### Alert Thresholds

```yaml
alerts:
  critical:
    - error_rate > 5%
    - database_connection_failure
    - api_response_time_p95 > 2s
    - reservation_creation_failure_rate > 10%

  warning:
    - error_rate > 2%
    - api_response_time_p95 > 1s
    - database_query_time_p95 > 500ms
    - cache_miss_rate > 50%

  info:
    - deployment_complete
    - feature_flag_changed
    - traffic_spike_detected
```

---

## Success Criteria

### Phase 1 Success Criteria (Foundation)
- ✅ POST endpoint saves to database with 100% success rate
- ✅ OPTIONS endpoint returns real-time availability
- ✅ GET endpoint supports new filters
- ✅ Zero data loss during transition
- ✅ API tests pass with >90% coverage

---

### Phase 2 Success Criteria (UI Components)
- ✅ TimeSlotSelector renders with <100ms
- ✅ CapacityIndicator displays correct colors
- ✅ Components are accessible (WCAG 2.1 AA)
- ✅ Component tests pass with >80% coverage
- ✅ Visual regression tests pass

---

### Phase 3 Success Criteria (Integration)
- ✅ Admin form creates reservations with time slots
- ✅ Data persists correctly to database
- ✅ Backward compatibility maintained (legacy data still works)
- ✅ E2E tests pass for all critical workflows
- ✅ No user-reported bugs in first week

---

### Final Success Criteria (Production)
- ✅ Zero downtime during deployment
- ✅ API response time <200ms (p95)
- ✅ Error rate <1%
- ✅ User satisfaction: No negative feedback
- ✅ Admin users can create time-slot reservations
- ✅ Capacity visualization provides clear information
- ✅ Documentation complete and accurate

---

## Appendix

### A. Glossary

**Time Slot**: A specific 30-minute booking window within a period (e.g., "09:00-09:30")

**Period**: Morning (AM) or Afternoon (PM) clinic session

**Capacity**: Available time within a period, measured in minutes

**Service Duration**: Time required for a service including buffer (e.g., 30min procedure + 10min buffer = 40min)

**Legacy Format**: Old reservation system using simple time strings without period awareness

**Time-Slot Format**: New reservation system with period-aware capacity management

---

### B. File Change Summary

| File | Type | Lines Changed | Risk |
|------|------|---------------|------|
| `/app/api/reservations/route.ts` | MODIFY | ~150 | HIGH |
| `/app/admin/reservations/page.tsx` | MODIFY | ~100 | MEDIUM |
| `/components/admin/TimeSlotSelector.tsx` | CREATE | ~200 | MEDIUM |
| `/components/admin/CapacityIndicator.tsx` | CREATE | ~80 | LOW |
| `/lib/reservations/data-transformer.ts` | CREATE | ~100 | LOW |
| `/tests/api/reservations.test.ts` | CREATE | ~200 | LOW |
| `/tests/components/TimeSlotSelector.test.tsx` | CREATE | ~150 | LOW |

**Total**: ~980 lines of code (including tests)

---

### C. Environment Variables

```bash
# Feature flags
NEXT_PUBLIC_FEATURE_TIMESLOT=true
NEXT_PUBLIC_FEATURE_CAPACITY=true
NEXT_PUBLIC_FEATURE_CALENDAR=false

# API configuration
API_VERSION=v2
ENABLE_API_LOGGING=true

# Performance
CACHE_TTL=300  # 5 minutes
DATABASE_POOL_SIZE=20
```

---

### D. Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run test                   # Run all tests
npm run test:watch             # Watch mode
npm run test:e2e               # E2E tests only

# Database
npx prisma studio              # Database GUI
npx prisma db push             # Push schema changes
npx prisma generate            # Regenerate client

# Deployment
docker build -t misopin-cms:v2.0 .
docker run -p 3000:3000 misopin-cms:v2.0

# Rollback
git revert HEAD                # Revert last commit
docker run misopin-cms:v1.9    # Run previous version
```

---

### E. Contact & Support

**Project Lead**: [Name]
**Technical Lead**: [Name]
**QA Lead**: [Name]

**Support Channels**:
- Slack: #misopin-cms-dev
- Email: dev@misopin.com
- Emergency: [Phone]

---

## Document Control

**Version History**:
- v1.0 (2025-11-04): Initial strategic plan created
- v1.1 (TBD): Post-implementation review updates

**Review Schedule**:
- Daily during implementation
- Weekly after deployment
- Monthly ongoing maintenance review

**Approval**:
- [ ] Technical Lead Review
- [ ] Project Manager Approval
- [ ] QA Lead Sign-off
- [ ] Deployment Authorization

---

**END OF DOCUMENT**
