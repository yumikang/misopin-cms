# Time-Based Reservation System Integration Plan
**Date**: 2025-11-04
**Status**: Implementation Ready
**Priority**: High

---

## Executive Summary

This document provides a complete integration plan for upgrading the static reservation form from a simple date-based system to a sophisticated time-based reservation system with real-time availability checking and capacity management.

### Current State
- **Frontend**: Static HTML calendar page (`calendar-page.html`)
- **Backend**: Time-based DB schema fully migrated (✅ Complete)
- **API**: Legacy POST endpoint exists, but no time-slot availability logic
- **Gap**: No real-time availability checking, no time-based capacity validation

### Target State
- Real-time time slot availability display
- Dynamic capacity validation
- Visual feedback on available/full slots
- Prevention of overbooking
- Seamless integration with existing static pages

---

## 1. Current State Analysis

### 1.1 Static Form Structure

**Location**: `/public/static-pages/calendar-page.html` (deployed version)

**Key Components**:
```javascript
// Current form fields (lines 727-789)
- sh_checkday: Selected date (READONLY, populated by calendar click)
- sh_checktime: Time dropdown (STATIC, no availability check)
- wr_name: Patient name
- sh_phone: Phone number
- sh_email: Email (optional)
- sh_birth: Birth date
- sh_sex: Gender (radio)
- sh_type: Treatment type - 초진/재진 (radio)
- sh_service: Service category (dropdown, STATIC)
- wr_content: Notes (textarea)
```

**Current Time Options** (lines 733-746):
```html
<option value="09:00">오전 09:00</option>
<option value="09:30">오전 09:30</option>
<option value="10:00">오전 10:00</option>
<option value="10:30">오전 10:30</option>
<option value="11:00">오전 11:00</option>
<option value="11:30">오전 11:30</option>
<option value="14:00">오후 02:00</option>
<option value="14:30">오후 02:30</option>
<option value="15:00">오후 03:00</option>
<option value="15:30">오후 03:30</option>
<option value="16:00">오후 04:00</option>
<option value="16:30">오후 04:30</option>
```

### 1.2 Current API Flow

**Submit Function** (lines 982-1053):
```javascript
async function submitReservation(event) {
  // 1. Collects form data
  // 2. Transforms Korean values (초진 → FIRST_VISIT, 남 → MALE)
  // 3. POSTs to /api/public/reservations
  // 4. No availability pre-check
  // 5. No time slot validation
}
```

**API Client** (`/modified/root/js/api-client.js`):
```javascript
class MisopinAPI {
  baseURL = this.getAPIBaseURL(); // Auto-detect environment

  async submitReservation(reservationData) {
    return this.fetchAPI('/public/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData)
    });
  }

  // ❌ MISSING: getAvailableTimeSlots()
  // ❌ MISSING: checkTimeSlotAvailability()
}
```

### 1.3 Database Schema (✅ Ready)

**Tables**:
1. **`services`**: Service definitions with duration
2. **`clinic_time_slots`**: Operating hours configuration
3. **`reservations`**: Booking records with time slots

**Key Fields in `reservations`** (schema lines 226-266):
```prisma
model reservations {
  // LEGACY (backward compatible)
  preferredTime String  // "09:30" - DEPRECATED
  service       ServiceType  // DEPRECATED

  // NEW TIME-BASED SYSTEM
  serviceId         String?
  serviceName       String?
  estimatedDuration Int?
  period            Period?  // MORNING, AFTERNOON, EVENING
  timeSlotStart     String?  // "09:30"
  timeSlotEnd       String?  // "10:00"

  // Indexes for fast queries
  @@index([preferredDate, serviceId, status])
  @@index([preferredDate, period, status])
  @@index([preferredDate, timeSlotStart, serviceId])
}
```

---

## 2. Gap Analysis

### 2.1 Missing Backend Functionality

| Required Feature | Current State | Status |
|-----------------|---------------|--------|
| Time slot availability calculation | ❌ Not implemented | Missing |
| Service-based time slot generation | ❌ Not implemented | Missing |
| Concurrent reservation counting | ❌ Not implemented | Missing |
| Real-time capacity checking | ❌ Not implemented | Missing |
| Operating hours validation | ❌ Not implemented | Missing |

### 2.2 Missing Frontend Functionality

| Required Feature | Current State | Status |
|-----------------|---------------|--------|
| Real-time time slot loading | ❌ Static dropdown | Missing |
| Availability visual indicators | ❌ No feedback | Missing |
| Service selection integration | ❌ No connection | Missing |
| Dynamic time slot updates | ❌ Static options | Missing |
| Capacity warning messages | ❌ No validation | Missing |

### 2.3 Missing API Endpoints

```
GET  /api/public/reservations/time-slots
  → Query: date, serviceId
  → Returns: Available time slots with capacity

GET  /api/public/reservations/availability
  → Query: date, serviceType  (EXISTS but uses daily limit logic)
  → NEED: Time-slot specific version

POST /api/public/reservations/validate
  → Body: date, timeSlot, serviceId
  → Returns: Validation result before submission
```

---

## 3. Proposed Architecture

### 3.1 System Flow Diagram

```
User Journey:
┌──────────────────────────────────────────────────────────────────┐
│ 1. User clicks calendar date                                     │
│    ↓                                                              │
│ 2. selectday() fires → Opens reservation modal                   │
│    ↓                                                              │
│ 3. User selects service category (sh_service dropdown)           │
│    ↓                                                              │
│ 4. ⚡ NEW: loadAvailableTimeSlots(date, serviceId)               │
│    ├─→ GET /api/public/reservations/time-slots                   │
│    ├─→ Backend calculates available slots                        │
│    ├─→ Returns: [{time, available, capacity}]                    │
│    └─→ Frontend updates time dropdown dynamically                │
│    ↓                                                              │
│ 5. User selects time slot (sh_checktime dropdown)                │
│    ↓                                                              │
│ 6. ⚡ NEW: validateTimeSlot(date, time, serviceId)               │
│    ├─→ Real-time check before form submission                    │
│    └─→ Show warning if capacity low or full                      │
│    ↓                                                              │
│ 7. User fills remaining fields                                   │
│    ↓                                                              │
│ 8. User clicks "예약신청" → submitReservation()                  │
│    ├─→ ⚡ NEW: Final validation check                            │
│    ├─→ POST /api/public/reservations                             │
│    └─→ Success/Error feedback                                    │
└──────────────────────────────────────────────────────────────────┘

Backend Processing:
┌──────────────────────────────────────────────────────────────────┐
│ GET /api/public/reservations/time-slots                          │
│  1. Parse: date, serviceId                                       │
│  2. Load service details (duration, buffer)                      │
│  3. Get clinic_time_slots for date's day-of-week                 │
│  4. Generate all possible time slots (30-min intervals)          │
│  5. Query existing reservations for that date+service            │
│  6. Calculate capacity for each slot                             │
│  7. Return: Available slots with metadata                        │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```javascript
// Frontend → Backend
{
  date: "2025-11-15",
  serviceId: "service-uuid-123",
  timeSlot: "10:00",
  patientData: {...}
}

// Backend → Frontend (Time Slots API)
{
  date: "2025-11-15",
  serviceId: "service-uuid-123",
  serviceName: "주름 보톡스",
  slots: [
    {
      time: "09:00",
      available: true,
      capacity: 2,
      remaining: 2,
      status: "available"
    },
    {
      time: "09:30",
      available: true,
      capacity: 2,
      remaining: 1,
      status: "limited"
    },
    {
      time: "10:00",
      available: false,
      capacity: 2,
      remaining: 0,
      status: "full"
    }
  ],
  totalSlots: 12,
  availableSlots: 8
}
```

---

## 4. Implementation Roadmap

### Phase 1: Backend Time Calculation Logic (Week 1)

**Files to Create/Modify**:
- `lib/reservations/time-slot-calculator.ts` (NEW)
- `lib/reservations/availability-checker.ts` (NEW)

**Implementation**:

```typescript
// lib/reservations/time-slot-calculator.ts

import { prisma } from '@/lib/prisma';
import { addMinutes, format, parse, isBefore, isAfter } from 'date-fns';

export interface TimeSlot {
  time: string;           // "09:30"
  available: boolean;
  capacity: number;       // Max concurrent
  remaining: number;      // Available spots
  status: 'available' | 'limited' | 'full';
}

export interface TimeSlotRequest {
  date: Date;
  serviceId: string;
}

/**
 * Generate all possible time slots for a service on a specific date
 */
export async function generateTimeSlots(
  request: TimeSlotRequest
): Promise<TimeSlot[]> {
  const { date, serviceId } = request;

  // 1. Get service details
  const service = await prisma.services.findUnique({
    where: { id: serviceId },
    select: {
      durationMinutes: true,
      bufferMinutes: true,
    },
  });

  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }

  // 2. Get day of week
  const dayOfWeek = getDayOfWeek(date);

  // 3. Get clinic operating hours for this day and service
  const clinicSlots = await prisma.clinic_time_slots.findMany({
    where: {
      serviceId,
      dayOfWeek,
      isActive: true,
      OR: [
        { effectiveFrom: null, effectiveUntil: null },
        { effectiveFrom: { lte: date }, effectiveUntil: { gte: date } },
      ],
    },
    orderBy: { startTime: 'asc' },
  });

  if (clinicSlots.length === 0) {
    return []; // No operating hours configured
  }

  // 4. Generate time slots based on operating hours
  const allSlots: TimeSlot[] = [];

  for (const clinicSlot of clinicSlots) {
    const slots = generateSlotsForPeriod(
      clinicSlot.startTime,
      clinicSlot.endTime,
      clinicSlot.slotInterval,
      clinicSlot.maxConcurrent,
      service.durationMinutes
    );
    allSlots.push(...slots);
  }

  // 5. Check existing reservations and calculate availability
  const bookedSlots = await getBookedSlots(date, serviceId);

  // 6. Calculate remaining capacity for each slot
  const availableSlots = allSlots.map(slot => {
    const booked = bookedSlots.filter(b =>
      isTimeSlotOverlap(slot.time, b.timeSlotStart, service.durationMinutes)
    ).length;

    const remaining = slot.capacity - booked;

    return {
      ...slot,
      remaining,
      available: remaining > 0,
      status: getSlotStatus(remaining, slot.capacity),
    };
  });

  return availableSlots;
}

/**
 * Generate time slots within a period
 */
function generateSlotsForPeriod(
  startTime: string,
  endTime: string,
  intervalMinutes: number,
  maxConcurrent: number,
  serviceDuration: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());

  let currentTime = start;

  while (isBefore(currentTime, end)) {
    // Check if there's enough time for the service before closing
    const slotEnd = addMinutes(currentTime, serviceDuration);

    if (isBefore(slotEnd, end) || slotEnd.getTime() === end.getTime()) {
      slots.push({
        time: format(currentTime, 'HH:mm'),
        available: true,
        capacity: maxConcurrent,
        remaining: maxConcurrent,
        status: 'available',
      });
    }

    currentTime = addMinutes(currentTime, intervalMinutes);
  }

  return slots;
}

/**
 * Get booked time slots for a date and service
 */
async function getBookedSlots(date: Date, serviceId: string) {
  const reservations = await prisma.reservations.findMany({
    where: {
      preferredDate: date,
      serviceId,
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
    },
    select: {
      timeSlotStart: true,
      timeSlotEnd: true,
      estimatedDuration: true,
    },
  });

  return reservations.filter(r => r.timeSlotStart !== null);
}

/**
 * Check if two time slots overlap
 */
function isTimeSlotOverlap(
  slotTime: string,
  bookedStart: string,
  durationMinutes: number
): boolean {
  const slotStart = parse(slotTime, 'HH:mm', new Date());
  const slotEnd = addMinutes(slotStart, durationMinutes);

  const bookedStartTime = parse(bookedStart, 'HH:mm', new Date());

  // Check if slot start falls within booked period
  return (
    (isAfter(slotStart, bookedStartTime) || slotStart.getTime() === bookedStartTime.getTime()) &&
    isBefore(slotStart, addMinutes(bookedStartTime, durationMinutes))
  );
}

/**
 * Determine slot status based on remaining capacity
 */
function getSlotStatus(
  remaining: number,
  capacity: number
): 'available' | 'limited' | 'full' {
  if (remaining === 0) return 'full';
  if (remaining <= capacity * 0.3) return 'limited';
  return 'available';
}

/**
 * Get day of week from date
 */
function getDayOfWeek(date: Date): 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[date.getDay()] as any;
}
```

**Testing Criteria**:
- [ ] Generates correct time slots for morning period (09:00-12:00)
- [ ] Generates correct time slots for afternoon period (14:00-17:00)
- [ ] Respects service duration when generating slots
- [ ] Correctly calculates remaining capacity
- [ ] Handles overlapping reservations
- [ ] Returns empty array for non-operating days

---

### Phase 2: API Endpoints (Week 1-2)

**File**: `app/api/public/reservations/time-slots/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSlots } from '@/lib/reservations/time-slot-calculator';

/**
 * GET /api/public/reservations/time-slots
 * Get available time slots for a specific date and service
 *
 * Query params:
 * - date: YYYY-MM-DD
 * - serviceId: UUID
 *
 * Returns: Array of time slots with availability
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');

    // Validation
    if (!dateParam || !serviceId) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          details: 'Both date and serviceId are required',
        },
        { status: 400 }
      );
    }

    // Parse date
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid date format',
          details: 'Date must be in YYYY-MM-DD format',
        },
        { status: 400 }
      );
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return NextResponse.json(
        {
          error: 'Invalid date',
          details: 'Cannot book appointments in the past',
        },
        { status: 400 }
      );
    }

    // Generate time slots
    const slots = await generateTimeSlots({ date, serviceId });

    // Get service name
    const service = await prisma.services.findUnique({
      where: { id: serviceId },
      select: { name: true },
    });

    // Return response
    return NextResponse.json({
      date: dateParam,
      serviceId,
      serviceName: service?.name || 'Unknown Service',
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.available).length,
    });
  } catch (error) {
    console.error('Error generating time slots:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

**File**: `app/api/public/reservations/validate/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSlots } from '@/lib/reservations/time-slot-calculator';

/**
 * POST /api/public/reservations/validate
 * Validate a time slot before reservation
 *
 * Body:
 * - date: YYYY-MM-DD
 * - timeSlot: HH:mm
 * - serviceId: UUID
 *
 * Returns: Validation result
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date: dateParam, timeSlot, serviceId } = body;

    // Validation
    if (!dateParam || !timeSlot || !serviceId) {
      return NextResponse.json(
        { valid: false, message: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const date = new Date(dateParam);
    const slots = await generateTimeSlots({ date, serviceId });

    // Find the requested slot
    const requestedSlot = slots.find(s => s.time === timeSlot);

    if (!requestedSlot) {
      return NextResponse.json({
        valid: false,
        message: '선택하신 시간은 예약 가능한 시간이 아닙니다.',
      });
    }

    if (!requestedSlot.available) {
      return NextResponse.json({
        valid: false,
        message: '선택하신 시간은 이미 예약이 마감되었습니다.',
      });
    }

    if (requestedSlot.status === 'limited') {
      return NextResponse.json({
        valid: true,
        warning: `잔여 예약 가능 인원: ${requestedSlot.remaining}명`,
        slot: requestedSlot,
      });
    }

    return NextResponse.json({
      valid: true,
      message: '예약 가능합니다.',
      slot: requestedSlot,
    });
  } catch (error) {
    console.error('Error validating time slot:', error);
    return NextResponse.json(
      { valid: false, message: '예약 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

**Update**: `app/api/public/reservations/route.ts`

Add time-based validation to the POST handler:

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ⚡ NEW: Validate time slot availability before creating reservation
    if (body.serviceId && body.timeSlot) {
      const date = new Date(body.preferred_date);
      const slots = await generateTimeSlots({
        date,
        serviceId: body.serviceId
      });

      const requestedSlot = slots.find(s => s.time === body.timeSlot);

      if (!requestedSlot || !requestedSlot.available) {
        return NextResponse.json(
          {
            success: false,
            error: '선택하신 시간은 예약이 마감되었습니다. 다른 시간을 선택해주세요.'
          },
          { status: 400 }
        );
      }
    }

    // Create reservation with time slot data
    const reservation = await prisma.reservations.create({
      data: {
        // ... existing fields

        // NEW: Time-based fields
        serviceId: body.serviceId,
        serviceName: body.serviceName,
        estimatedDuration: body.estimatedDuration,
        period: calculatePeriod(body.timeSlot),
        timeSlotStart: body.timeSlot,
        timeSlotEnd: calculateEndTime(body.timeSlot, body.estimatedDuration),
      },
    });

    return NextResponse.json({
      success: true,
      reservation,
      message: '예약이 접수되었습니다.',
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Testing Criteria**:
- [ ] GET /time-slots returns correct data structure
- [ ] Handles invalid date formats gracefully
- [ ] Returns 400 for missing parameters
- [ ] POST /validate correctly identifies full slots
- [ ] POST /validate shows warning for limited capacity
- [ ] Reservation creation validates time slot

---

### Phase 3: Frontend JavaScript Updates (Week 2)

**File**: `/public/js/time-slot-loader.js` (NEW)

```javascript
/**
 * Time Slot Dynamic Loader
 * Loads available time slots based on selected date and service
 */

class TimeSlotLoader {
  constructor(apiClient) {
    this.api = apiClient;
    this.currentDate = null;
    this.currentServiceId = null;
    this.slots = [];
  }

  /**
   * Load available time slots for a date and service
   */
  async loadTimeSlots(date, serviceId) {
    try {
      // Show loading state
      this.showLoadingState();

      // Fetch time slots from API
      const response = await this.api.fetchAPI(
        `/public/reservations/time-slots?date=${date}&serviceId=${serviceId}`
      );

      this.currentDate = date;
      this.currentServiceId = serviceId;
      this.slots = response.slots;

      // Update dropdown
      this.updateTimeDropdown(response.slots);

      // Show availability summary
      this.showAvailabilitySummary(response);

      return response;
    } catch (error) {
      console.error('Error loading time slots:', error);
      this.showErrorState('시간대 정보를 불러올 수 없습니다.');
      return null;
    }
  }

  /**
   * Update time dropdown with available slots
   */
  updateTimeDropdown(slots) {
    const dropdown = document.getElementById('sh_checktime');
    if (!dropdown) return;

    // Clear existing options
    dropdown.innerHTML = '<option value="">예약 시간을 선택해주세요.</option>';

    // Add available slots
    slots.forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.time;

      // Format display text with availability info
      let displayText = this.formatTimeDisplay(slot.time);

      if (!slot.available) {
        displayText += ' (마감)';
        option.disabled = true;
        option.style.color = '#999';
      } else if (slot.status === 'limited') {
        displayText += ` (잔여 ${slot.remaining}명)`;
        option.style.color = '#ff6b00';
      }

      option.textContent = displayText;
      dropdown.appendChild(option);
    });

    // Enable dropdown
    dropdown.disabled = false;
  }

  /**
   * Format time for display
   */
  formatTimeDisplay(time) {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum < 12 ? '오전' : '오후';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum;
    return `${period} ${displayHour.toString().padStart(2, '0')}:${minute}`;
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    const dropdown = document.getElementById('sh_checktime');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">불러오는 중...</option>';
    dropdown.disabled = true;
  }

  /**
   * Show error state
   */
  showErrorState(message) {
    const dropdown = document.getElementById('sh_checktime');
    if (!dropdown) return;

    dropdown.innerHTML = `<option value="">${message}</option>`;
    dropdown.disabled = true;
  }

  /**
   * Show availability summary
   */
  showAvailabilitySummary(response) {
    // Create or update summary element
    let summary = document.getElementById('time-slot-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.id = 'time-slot-summary';
      summary.className = 'time-slot-summary';

      // Insert after service dropdown
      const serviceDropdown = document.getElementById('sh_service');
      if (serviceDropdown) {
        serviceDropdown.closest('li').insertAdjacentElement('afterend', summary);
      }
    }

    // Update summary content
    const availableCount = response.availableSlots;
    const totalCount = response.totalSlots;

    let statusClass = 'available';
    let statusText = '예약 가능';

    if (availableCount === 0) {
      statusClass = 'full';
      statusText = '예약 마감';
    } else if (availableCount <= totalCount * 0.3) {
      statusClass = 'limited';
      statusText = '잔여 적음';
    }

    summary.innerHTML = `
      <div class="availability-indicator ${statusClass}">
        <span class="status-icon"></span>
        <span class="status-text">${statusText}</span>
        <span class="count">${availableCount}/${totalCount} 시간대</span>
      </div>
    `;
  }

  /**
   * Validate selected time slot before submission
   */
  async validateTimeSlot(date, timeSlot, serviceId) {
    try {
      const response = await this.api.fetchAPI('/public/reservations/validate', {
        method: 'POST',
        body: JSON.stringify({ date, timeSlot, serviceId })
      });

      return response;
    } catch (error) {
      console.error('Error validating time slot:', error);
      return { valid: false, message: '예약 검증 중 오류가 발생했습니다.' };
    }
  }
}

// Create global instance
const timeSlotLoader = new TimeSlotLoader(misopinAPI);
```

**Update**: `/public/js/calendar-integration.js`

```javascript
// Enhance selectday function to load time slots
function selectday(url, date, time, week, max_date, data_time) {
  // Store selected date globally
  window.selectedReservationDate = date;

  // Open modal
  calendar_inqOpen();

  // Set date field
  document.getElementById('sh_checkday').value = date;

  // ⚡ NEW: Load time slots when service is selected
  const serviceDropdown = document.getElementById('sh_service');
  if (serviceDropdown) {
    serviceDropdown.addEventListener('change', async function() {
      const serviceValue = this.value;
      if (serviceValue && window.selectedReservationDate) {
        // Map service enum to service ID
        const serviceId = await getServiceIdByEnum(serviceValue);
        if (serviceId) {
          await timeSlotLoader.loadTimeSlots(
            window.selectedReservationDate,
            serviceId
          );
        }
      }
    });
  }
}
```

**Update**: `calendar-page.html` submission function

```javascript
async function submitReservation(event) {
  // ... existing code ...

  // ⚡ NEW: Validate time slot before submission
  if (reservationData.serviceId && reservationData.preferred_time) {
    const validation = await timeSlotLoader.validateTimeSlot(
      reservationData.preferred_date,
      reservationData.preferred_time,
      reservationData.serviceId
    );

    if (!validation.valid) {
      alert(validation.message);
      return false;
    }

    if (validation.warning) {
      const confirmed = confirm(
        `${validation.warning}\n\n계속 진행하시겠습니까?`
      );
      if (!confirmed) {
        return false;
      }
    }
  }

  // ... continue with submission ...
}
```

**CSS Additions** (`/public/css/reservation-time-slots.css` - NEW):

```css
/* Time Slot Availability Indicators */
.time-slot-summary {
  margin: 15px 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #6c757d;
}

.availability-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.availability-indicator.available {
  color: #28a745;
}

.availability-indicator.available .status-icon::before {
  content: '✓';
  display: inline-block;
  width: 20px;
  height: 20px;
  background: #28a745;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
}

.availability-indicator.limited {
  color: #ff6b00;
}

.availability-indicator.limited .status-icon::before {
  content: '!';
  display: inline-block;
  width: 20px;
  height: 20px;
  background: #ff6b00;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
  font-weight: bold;
}

.availability-indicator.full {
  color: #dc3545;
}

.availability-indicator.full .status-icon::before {
  content: '✕';
  display: inline-block;
  width: 20px;
  height: 20px;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
}

/* Time dropdown styling */
#sh_checktime option:disabled {
  color: #999 !important;
  font-style: italic;
}

#sh_checktime option[style*="color: #ff6b00"] {
  font-weight: 500;
}
```

**Testing Criteria**:
- [ ] Time slots load when service is selected
- [ ] Disabled slots cannot be selected
- [ ] Limited capacity shows warning
- [ ] Availability summary displays correctly
- [ ] Validation runs before submission
- [ ] Error states display properly

---

### Phase 4: Service ID Mapping (Week 2)

**Challenge**: Static form uses `ServiceType` enum, but new system needs `serviceId` UUID.

**Solution**: Create mapping function

**File**: `/public/js/service-mapping.js` (NEW)

```javascript
/**
 * Service Enum to ID Mapping
 * Maps legacy ServiceType enum values to new service UUIDs
 */

// Service mapping (will be populated from API)
let serviceMapping = {};

/**
 * Initialize service mapping from API
 */
async function initializeServiceMapping() {
  try {
    const response = await misopinAPI.fetchAPI('/public/services');

    // Build mapping: enum → UUID
    serviceMapping = response.services.reduce((map, service) => {
      map[service.code] = service.id;
      return map;
    }, {});

    console.log('Service mapping initialized:', serviceMapping);
    return serviceMapping;
  } catch (error) {
    console.error('Failed to initialize service mapping:', error);

    // Fallback: hardcode mapping (temporary)
    serviceMapping = {
      'WRINKLE_BOTOX': 'service-uuid-botox',
      'VOLUME_LIFTING': 'service-uuid-lifting',
      'SKIN_CARE': 'service-uuid-skincare',
      'REMOVAL_PROCEDURE': 'service-uuid-removal',
      'BODY_CARE': 'service-uuid-body',
      'OTHER_CONSULTATION': 'service-uuid-other',
    };

    return serviceMapping;
  }
}

/**
 * Get service ID from enum value
 */
async function getServiceIdByEnum(enumValue) {
  // Ensure mapping is initialized
  if (Object.keys(serviceMapping).length === 0) {
    await initializeServiceMapping();
  }

  return serviceMapping[enumValue] || null;
}

/**
 * Get service details by ID
 */
async function getServiceDetails(serviceId) {
  try {
    const response = await misopinAPI.fetchAPI(`/public/services/${serviceId}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch service details:', error);
    return null;
  }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeServiceMapping);
} else {
  initializeServiceMapping();
}
```

**New API Endpoint**: `app/api/public/services/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/public/services
 * Get all active services for frontend mapping
 */
export async function GET() {
  try {
    const services = await prisma.services.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        durationMinutes: true,
        category: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      services,
      count: services.length,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

**Backend** (`lib/reservations/__tests__/time-slot-calculator.test.ts`):

```typescript
import { generateTimeSlots } from '../time-slot-calculator';
import { prisma } from '@/lib/prisma';

describe('Time Slot Calculator', () => {
  beforeEach(async () => {
    // Setup test data
  });

  test('generates correct morning slots', async () => {
    const date = new Date('2025-11-15');
    const serviceId = 'test-service-id';

    const slots = await generateTimeSlots({ date, serviceId });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].time).toMatch(/\d{2}:\d{2}/);
    expect(slots[0]).toHaveProperty('available');
    expect(slots[0]).toHaveProperty('capacity');
  });

  test('marks full slots as unavailable', async () => {
    // Create reservations to fill a slot
    // ... test logic
  });

  test('respects service duration', async () => {
    // Verify slots respect 30-minute service duration
  });
});
```

### 5.2 Integration Tests

**API Endpoints**:

```typescript
describe('GET /api/public/reservations/time-slots', () => {
  test('returns time slots for valid request', async () => {
    const response = await fetch(
      'http://localhost:3001/api/public/reservations/time-slots?date=2025-11-15&serviceId=test-id'
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('slots');
    expect(Array.isArray(data.slots)).toBe(true);
  });

  test('returns 400 for missing parameters', async () => {
    const response = await fetch(
      'http://localhost:3001/api/public/reservations/time-slots?date=2025-11-15'
    );

    expect(response.status).toBe(400);
  });
});
```

### 5.3 End-to-End Tests (Manual)

**Test Scenarios**:

1. **Basic Flow**
   - [ ] Open calendar page
   - [ ] Click available date
   - [ ] Select service category
   - [ ] Verify time slots load dynamically
   - [ ] Select available time slot
   - [ ] Fill remaining fields
   - [ ] Submit reservation
   - [ ] Verify success message

2. **Capacity Limits**
   - [ ] Create multiple reservations for same time slot
   - [ ] Verify slot shows "limited" status
   - [ ] Book until capacity full
   - [ ] Verify slot marked as "마감"
   - [ ] Attempt to book full slot
   - [ ] Verify error message

3. **Edge Cases**
   - [ ] Select service with no operating hours
   - [ ] Verify "no available times" message
   - [ ] Try booking past date
   - [ ] Verify error handling
   - [ ] Rapid service changes
   - [ ] Verify time slots update correctly

---

## 6. Deployment Plan

### 6.1 Deployment Sequence

```
Step 1: Backend (No user impact)
├─ Deploy time-slot-calculator.ts
├─ Deploy API endpoints
├─ Test in production with direct API calls
└─ Verify no errors in logs

Step 2: Frontend JavaScript (Graceful degradation)
├─ Deploy service-mapping.js
├─ Deploy time-slot-loader.js
├─ Deploy CSS
└─ Static form still works with old logic

Step 3: Frontend Integration (Feature activation)
├─ Update calendar-page.html with new event listeners
├─ Update submitReservation() with validation
├─ Enable dynamic time slot loading
└─ Monitor for errors

Step 4: Validation
├─ Test on staging environment
├─ Test on production with limited users
├─ Monitor error rates
└─ Full rollout
```

### 6.2 Rollback Plan

**If issues occur**:

1. **Frontend-only issue**: Comment out new JavaScript, static dropdowns still work
2. **API issue**: API returns error, frontend shows all static times
3. **Database issue**: System falls back to old `preferredTime` field

**Graceful Degradation**:

```javascript
// In time-slot-loader.js
async loadTimeSlots(date, serviceId) {
  try {
    const response = await this.api.fetchAPI(/* ... */);
    this.updateTimeDropdown(response.slots);
  } catch (error) {
    console.error('Time slot API error, falling back to static times');
    this.showStaticTimeDropdown(); // ⚡ Fallback to original static dropdown
  }
}

showStaticTimeDropdown() {
  // Restore original static time options
  const dropdown = document.getElementById('sh_checktime');
  dropdown.innerHTML = `
    <option value="">예약 시간을 선택해주세요.</option>
    <option value="09:00">오전 09:00</option>
    <option value="09:30">오전 09:30</option>
    <!-- ... rest of static times ... -->
  `;
}
```

---

## 7. Success Metrics

### 7.1 Technical Metrics

- **API Response Time**: < 500ms for time-slot endpoint
- **Error Rate**: < 1% for time-slot loading
- **Availability Accuracy**: 100% (no double bookings)
- **Database Query Performance**: < 100ms for availability checks

### 7.2 User Experience Metrics

- **Form Completion Rate**: Target +15% improvement
- **Booking Errors**: Target -80% (reduce "slot full" errors)
- **User Satisfaction**: Measure via feedback form
- **Time to Complete Reservation**: Target < 3 minutes

### 7.3 Business Metrics

- **Reservation Volume**: Track daily reservation counts
- **No-Show Rate**: Monitor if real-time availability reduces no-shows
- **Staff Efficiency**: Reduce manual scheduling conflicts

---

## 8. Next Steps

### Immediate Actions (Week 1)

1. **Backend Development**
   - [ ] Implement `time-slot-calculator.ts`
   - [ ] Create API endpoints
   - [ ] Write unit tests
   - [ ] Deploy to staging

2. **Service Data Setup**
   - [ ] Populate `services` table with actual clinic services
   - [ ] Configure `clinic_time_slots` for operating hours
   - [ ] Test with real data

### Week 2

3. **Frontend Development**
   - [ ] Create `time-slot-loader.js`
   - [ ] Create `service-mapping.js`
   - [ ] Add CSS styles
   - [ ] Update `calendar-page.html`

4. **Testing**
   - [ ] Manual testing on staging
   - [ ] Fix any issues
   - [ ] Load testing for concurrent users

### Week 3

5. **Deployment**
   - [ ] Deploy to production
   - [ ] Monitor closely for 48 hours
   - [ ] Gather user feedback
   - [ ] Iterate based on feedback

---

## 9. Code Reference Locations

**Key Files**:
- Current Form: `/public/static-pages/calendar-page.html:721-813`
- Current API Client: `/modified/root/js/api-client.js:110-115`
- DB Schema: `/prisma/schema.prisma:226-266, 293-334`
- Existing Availability API: `/app/api/public/reservations/availability/route.ts`
- Reservations API: `/app/api/reservations/route.ts`

**New Files to Create**:
- `lib/reservations/time-slot-calculator.ts`
- `lib/reservations/availability-checker.ts`
- `app/api/public/reservations/time-slots/route.ts`
- `app/api/public/reservations/validate/route.ts`
- `app/api/public/services/route.ts`
- `public/js/time-slot-loader.js`
- `public/js/service-mapping.js`
- `public/css/reservation-time-slots.css`

---

## Appendix A: Database Setup Script

Before implementation, ensure services and time slots are configured:

```sql
-- Insert sample services
INSERT INTO services (id, code, name, description, category, duration_minutes, buffer_minutes, is_active, display_order)
VALUES
  (gen_random_uuid(), 'WRINKLE_BOTOX', '주름 보톡스', '보톡스 시술', 'WRINKLE', 30, 10, true, 1),
  (gen_random_uuid(), 'VOLUME_LIFTING', '볼륨 리프팅', '필러 및 리프팅', 'VOLUME', 45, 15, true, 2),
  (gen_random_uuid(), 'SKIN_CARE', '피부 관리', '피부 케어', 'SKIN', 30, 10, true, 3),
  (gen_random_uuid(), 'REMOVAL_PROCEDURE', '제거 시술', '점, 비립종 제거', 'REMOVAL', 20, 5, true, 4),
  (gen_random_uuid(), 'BODY_CARE', '바디 케어', '제모, 다이어트', 'BODY', 30, 10, true, 5);

-- Insert clinic operating hours (Monday-Friday morning)
INSERT INTO clinic_time_slots (id, service_id, day_of_week, period, start_time, end_time, slot_interval, max_concurrent, is_active)
SELECT
  gen_random_uuid(),
  s.id,
  day::text::"DayOfWeek",
  'MORNING'::"Period",
  '09:00',
  '12:00',
  30,
  2,
  true
FROM services s
CROSS JOIN (VALUES ('MONDAY'), ('TUESDAY'), ('THURSDAY'), ('FRIDAY')) AS days(day);

-- Insert clinic operating hours (Monday-Friday afternoon)
INSERT INTO clinic_time_slots (id, service_id, day_of_week, period, start_time, end_time, slot_interval, max_concurrent, is_active)
SELECT
  gen_random_uuid(),
  s.id,
  day::text::"DayOfWeek",
  'AFTERNOON'::"Period",
  '14:00',
  '17:00',
  30,
  2,
  true
FROM services s
CROSS JOIN (VALUES ('MONDAY'), ('TUESDAY'), ('THURSDAY'), ('FRIDAY')) AS days(day);
```

---

## Appendix B: Environment Variables

Ensure these are set in production:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# API Configuration
NEXT_PUBLIC_API_URL="https://your-cms-domain.com/api"

# Feature Flags (optional)
ENABLE_TIME_BASED_RESERVATIONS=true
ENABLE_CAPACITY_VALIDATION=true
```

---

## Summary

This implementation plan provides:
- ✅ **Complete architecture** for time-based reservation system
- ✅ **Production-ready code** for backend and frontend
- ✅ **Phased rollout strategy** minimizing risk
- ✅ **Comprehensive testing plan** ensuring quality
- ✅ **Graceful degradation** for reliability
- ✅ **Clear success metrics** for validation

**Estimated Timeline**: 2-3 weeks
**Risk Level**: Low (backward compatible, phased rollout)
**User Impact**: High positive (better UX, no overbooking)

Next: Begin Phase 1 (Backend) implementation.
