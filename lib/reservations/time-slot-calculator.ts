/**
 * Time Slot Calculator - Production-Ready Implementation
 *
 * Performance: O(n) time complexity, 5-minute cache, single DB query
 * Type Safety: Full TypeScript support with Prisma types
 */

import { prisma } from '@/lib/prisma';
import { Period } from '@prisma/client';
import {
  TimeSlot,
  TimeSlotResult,
  ReservationForTimeSlot,
  ReservationErrorMetadata,
  CachedReservationData,
  DAY_OF_WEEK_MAP,
} from './types';

// Re-export types for external use
export type {
  TimeSlot,
  TimeSlotResult,
  ReservationForTimeSlot,
  ReservationErrorMetadata,
  CachedReservationData,
} from './types';

// ============================================================================
// Error Handling
// ============================================================================

export class ReservationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly metadata: ReservationErrorMetadata = {},
    public readonly httpStatus: number = 500
  ) {
    super(message);
    this.name = 'ReservationError';
  }
}

// ============================================================================
// Cache
// ============================================================================

const reservationCache = new Map<string, CachedReservationData>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedReservations(dateString: string): ReservationForTimeSlot[] | null {
  const cached = reservationCache.get(dateString);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    reservationCache.delete(dateString);
    return null;
  }

  return cached.reservations;
}

function setCachedReservations(
  dateString: string,
  reservations: ReservationForTimeSlot[],
  ttl: number = CACHE_TTL
): void {
  reservationCache.set(dateString, {
    reservations,
    timestamp: Date.now(),
    ttl,
  });
}

// ============================================================================
// Phase 4: Time Overlap Detection Utilities
// ============================================================================

/**
 * Converts time string (HH:mm) to minutes since midnight
 * @param time - Time in "HH:mm" format (e.g., "10:30")
 * @returns Minutes since midnight (e.g., 630 for "10:30")
 * @example
 * timeToMinutes("10:30") // returns 630
 * timeToMinutes("14:00") // returns 840
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Counts how many existing reservations overlap with a given timeslot
 *
 * Uses interval intersection formula: [A.start < B.end] AND [B.start < A.end]
 *
 * Phase 4 Core Logic:
 * - Filters reservations by serviceId (same service only)
 * - Filters reservations by period (MORNING/AFTERNOON)
 * - Checks if each reservation's time range overlaps with the target slot
 * - Returns count of overlapping reservations for maxConcurrent comparison
 *
 * @param slotStart - Slot start time (HH:mm)
 * @param slotDuration - Slot duration in minutes
 * @param reservations - All reservations for the day
 * @param period - Time period (MORNING/AFTERNOON)
 * @param serviceId - Service ID to filter reservations
 * @returns Number of reservations that overlap with this timeslot
 */
function countOverlappingReservations(
  slotStart: string,
  slotDuration: number,
  reservations: ReservationForTimeSlot[],
  period: Period,
  serviceId: string
): number {
  const slotStartMinutes = timeToMinutes(slotStart);
  const slotEndMinutes = slotStartMinutes + slotDuration;

  let overlappingCount = 0;

  for (const reservation of reservations) {
    // Only check reservations for the same service
    if (reservation.serviceId !== serviceId) {
      continue;
    }

    // Only check reservations in the same period
    if (reservation.period !== period) {
      continue;
    }

    // Get reservation time range
    const resStartTime = reservation.timeSlotStart;
    if (!resStartTime) {
      continue; // Skip if no specific time slot
    }

    const resStartMinutes = timeToMinutes(resStartTime);

    // Use timeSlotEnd if available, otherwise calculate from estimatedDuration
    let resEndMinutes: number;
    if (reservation.timeSlotEnd) {
      resEndMinutes = timeToMinutes(reservation.timeSlotEnd);
    } else {
      resEndMinutes = resStartMinutes + (reservation.estimatedDuration || 0);
    }

    // Interval intersection check: [A.start < B.end] AND [B.start < A.end]
    const overlaps = (slotStartMinutes < resEndMinutes) && (resStartMinutes < slotEndMinutes);

    if (overlaps) {
      overlappingCount++;
    }
  }

  return overlappingCount;
}

// ============================================================================
// Main Function
// ============================================================================

export async function calculateAvailableTimeSlots(
  serviceCode: string,
  dateString: string,
  debug: boolean = false
): Promise<TimeSlotResult> {
  if (debug) console.log('[Calculator] Step 1: Validating inputs', { serviceCode, dateString });

  // 1. Validate inputs
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    throw new ReservationError('Invalid date format', 'INVALID_DATE');
  }

  const targetDate = new Date(dateString);
  if (isNaN(targetDate.getTime())) {
    throw new ReservationError('Invalid date', 'INVALID_DATE');
  }

  if (debug) console.log('[Calculator] Step 2: Getting service info for code:', serviceCode);

  // 2. Get service info
  const service = await prisma.services.findUnique({
    where: { code: serviceCode }
  });

  if (debug) console.log('[Calculator] Service found:', service ? { id: service.id, name: service.name } : 'NOT FOUND');

  if (!service) {
    throw new ReservationError(
      `Service not found: ${serviceCode}`,
      'SERVICE_NOT_FOUND'
    );
  }

  const totalDuration = service.durationMinutes + service.bufferMinutes;

  // 3. Get clinic time slots for the day
  const dayOfWeek = DAY_OF_WEEK_MAP[targetDate.getDay()];
  if (!dayOfWeek) {
    throw new ReservationError(
      `Invalid day of week: ${targetDate.getDay()}`,
      'INVALID_DAY_OF_WEEK',
      { requestedDate: dateString },
      400
    );
  }

  if (debug) console.log('[Calculator] Step 3: Getting clinic slots for', { dayOfWeek, serviceId: service.id });

  const clinicSlots = await prisma.clinic_time_slots.findMany({
    where: {
      dayOfWeek: dayOfWeek,
      OR: [
        { serviceId: null },
        { serviceId: service.id }
      ]
    }
  });

  if (debug) {
    console.log('[Calculator] Clinic slots found:', clinicSlots.length);
    console.log('[Calculator] Phase 4: Capacity info:', clinicSlots.map(cs => ({
      period: cs.period,
      maxConcurrent: cs.maxConcurrent || 1,
      startTime: cs.startTime,
      endTime: cs.endTime
    })));
  }

  if (clinicSlots.length === 0) {
    throw new ReservationError(
      '해당 요일은 진료하지 않습니다',
      'NO_CLINIC_HOURS'
    );
  }

  // 4. Get existing reservations (cached)
  let existingReservations = getCachedReservations(dateString);

  if (!existingReservations) {
    // Use UTC dates to avoid timezone issues
    const startOfDay = new Date(dateString + 'T00:00:00.000Z');
    const endOfDay = new Date(dateString + 'T23:59:59.999Z');

    existingReservations = await prisma.reservations.findMany({
      where: {
        preferredDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      select: {
        id: true,
        serviceId: true,
        period: true,
        preferredTime: true,
        timeSlotStart: true,
        timeSlotEnd: true,
        estimatedDuration: true
      }
    });

    setCachedReservations(dateString, existingReservations);
  }

  // 4.5 Get manual time closures (NOT cached - always fresh)
  if (debug) console.log('[Calculator] Step 4.5: Getting manual closures for', dateString);

  const manualClosures = await prisma.manual_time_closures.findMany({
    where: {
      closureDate: new Date(dateString),
      isActive: true,
      OR: [
        { serviceId: null },      // Closure applies to all services
        { serviceId: service.id } // Closure applies to specific service
      ]
    },
    select: {
      period: true,
      timeSlotStart: true,
      timeSlotEnd: true,
      reason: true
    }
  });

  if (debug) console.log('[Calculator] Manual closures found:', manualClosures.length);

  // Create lookup map for O(1) closure checking
  const closureMap = new Map<string, { reason: string | null }>();
  manualClosures.forEach(closure => {
    const key = `${closure.period}-${closure.timeSlotStart}`;
    closureMap.set(key, { reason: closure.reason });
  });

  // 5. Generate time slots (Phase 4: Using overlap detection instead of grouping)
  // Note: reservationsByTime map removed - now using countOverlappingReservations()
  const slots: TimeSlot[] = [];

  clinicSlots.forEach(clinicSlot => {
    const period = clinicSlot.period as Period;
    const [startHour, startMin] = clinicSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = clinicSlot.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalPeriodMinutes = endMinutes - startMinutes;

    // Generate 30-minute intervals
    // IMPORTANT: Generate all slots up to period end time (not totalDuration-dependent)
    // because we support concurrent bookings at each slot
    const SLOT_INTERVAL_MINUTES = 30;
    for (let minutes = startMinutes; minutes <= endMinutes - SLOT_INTERVAL_MINUTES; minutes += SLOT_INTERVAL_MINUTES) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      const key = `${period}-${timeString}`;

      // Check if manually closed
      const closure = closureMap.get(key);
      const isManualClosed = !!closure;

      // ============================================================================
      // Phase 4: Timeslot-level Overlap Detection
      // ============================================================================
      // Count how many reservations overlap with this specific timeslot
      // IMPORTANT: Use 30-minute slot duration, NOT totalDuration (which includes buffer)
      const SLOT_DURATION_MINUTES = 30;
      const overlappingCount = countOverlappingReservations(
        timeString,
        SLOT_DURATION_MINUTES,
        existingReservations,
        period,
        service.id
      );

      // Get maxConcurrent capacity for this clinic slot (default: 1)
      const maxCapacity = clinicSlot.maxConcurrent || 1;

      // Calculate remaining booking capacity
      const remainingCapacity = Math.max(0, maxCapacity - overlappingCount);

      // Available only if NOT manually closed AND has remaining concurrent capacity
      const available = !isManualClosed && (overlappingCount < maxCapacity);

      let status: 'available' | 'limited' | 'full';

      if (isManualClosed) {
        status = 'full'; // Manually closed slots are always "full"
      } else {
        // Status based on booking count, not minutes
        const capacityPercent = maxCapacity > 0
          ? ((maxCapacity - overlappingCount) / maxCapacity) * 100
          : 0;

        if (capacityPercent > 60) {
          status = 'available';
        } else if (capacityPercent > 0) {
          status = 'limited';
        } else {
          status = 'full';
        }
      }

      // Phase 4: Debug logging for overlap detection
      if (debug && (overlappingCount > 0 || isManualClosed)) {
        console.log(`[Phase 4] ${period} ${timeString}:`, {
          overlappingCount,
          maxCapacity,
          available,
          status,
          isManualClosed
        });
      }

      // Phase 4: New TimeSlot structure with booking counts
      slots.push({
        time: timeString,
        period,
        available,
        remaining: remainingCapacity, // Now: booking count, not minutes
        total: maxCapacity, // Now: maxConcurrent, not period minutes
        status,
        currentBookings: overlappingCount, // NEW: current reservation count
        maxCapacity: maxCapacity, // NEW: max concurrent capacity
        ...(isManualClosed && {
          closureReason: closure.reason,
          isManualClosed: true
        })
      });
    }
  });

  // 7. Calculate metadata
  const availableSlots = slots.filter(s => s.available).length;
  const bookedSlots = slots.length - availableSlots;

  return {
    slots,
    metadata: {
      date: dateString,
      service: serviceCode,
      serviceName: service.name,
      totalSlots: slots.length,
      availableSlots,
      bookedSlots
    }
  };
}

// ============================================================================
// Validation Function
// ============================================================================

export async function validateTimeSlotAvailability(
  serviceCode: string,
  dateString: string,
  timeString: string,
  period: Period
): Promise<void> {
  const result = await calculateAvailableTimeSlots(serviceCode, dateString);

  const requestedSlot = result.slots.find(
    slot => slot.time === timeString && slot.period === period
  );

  if (!requestedSlot) {
    throw new ReservationError(
      '요청한 시간대가 존재하지 않습니다',
      'TIME_SLOT_NOT_FOUND',
      {
        requestedDate: dateString,
        requestedPeriod: period,
        serviceCode: serviceCode,
      },
      404
    );
  }

  if (!requestedSlot.available) {
    // Find suggested times
    const suggestedTimes = result.slots
      .filter(s => s.available && s.period === period)
      .slice(0, 3)
      .map(s => s.time);

    throw new ReservationError(
      '해당 시간대 예약이 마감되었습니다',
      'TIME_SLOT_FULL',
      {
        suggestedTimes,
        currentBookings: requestedSlot.currentBookings,
        maxCapacity: requestedSlot.maxCapacity,
        requestedDate: dateString,
        requestedPeriod: period,
        serviceCode: serviceCode,
      },
      409
    );
  }
}

// ============================================================================
// Cache Management
// ============================================================================

export function clearCache() {
  reservationCache.clear();
}

export function invalidateDate(dateString: string) {
  reservationCache.delete(dateString);
}
