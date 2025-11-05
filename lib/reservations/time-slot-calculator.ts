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

  if (debug) console.log('[Calculator] Clinic slots found:', clinicSlots.length);

  if (clinicSlots.length === 0) {
    throw new ReservationError(
      '해당 요일은 진료하지 않습니다',
      'NO_CLINIC_HOURS'
    );
  }

  // 4. Get existing reservations (cached)
  let existingReservations = getCachedReservations(dateString);

  if (!existingReservations) {
    existingReservations = await prisma.reservations.findMany({
      where: {
        preferredDate: {
          gte: new Date(dateString + 'T00:00:00'),
          lt: new Date(dateString + 'T23:59:59')
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      select: {
        id: true,
        period: true,
        preferredTime: true,
        timeSlotStart: true,
        timeSlotEnd: true,
        estimatedDuration: true
      }
    });

    setCachedReservations(dateString, existingReservations);
  }

  // 5. Group reservations by time (O(n))
  const reservationsByTime = new Map<string, ReservationForTimeSlot[]>();
  existingReservations.forEach((r) => {
    const key = `${r.period}-${r.preferredTime || r.timeSlotStart}`;
    if (!reservationsByTime.has(key)) {
      reservationsByTime.set(key, []);
    }
    reservationsByTime.get(key)!.push(r);
  });

  // 6. Generate time slots
  const slots: TimeSlot[] = [];

  clinicSlots.forEach(clinicSlot => {
    const period = clinicSlot.period as Period;
    const [startHour, startMin] = clinicSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = clinicSlot.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalPeriodMinutes = endMinutes - startMinutes;

    // Generate 30-minute intervals
    for (let minutes = startMinutes; minutes <= endMinutes - totalDuration; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      const key = `${period}-${timeString}`;
      const reservationsAtTime = reservationsByTime.get(key) || [];

      // Calculate consumed minutes
      const consumedMinutes = reservationsAtTime.reduce((sum, r) => {
        return sum + (r.estimatedDuration || 30);
      }, 0);

      const remainingMinutes = totalPeriodMinutes - consumedMinutes;
      const available = remainingMinutes >= totalDuration;

      let status: 'available' | 'limited' | 'full';
      const capacityPercent = (remainingMinutes / totalPeriodMinutes) * 100;

      if (capacityPercent > 60) {
        status = 'available';
      } else if (capacityPercent > 20) {
        status = 'limited';
      } else {
        status = 'full';
      }

      slots.push({
        time: timeString,
        period,
        available,
        remaining: Math.max(0, remainingMinutes),
        total: totalPeriodMinutes,
        status
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
    // Get service info for required minutes
    const service = await prisma.services.findUnique({
      where: { code: serviceCode },
      select: { durationMinutes: true, bufferMinutes: true }
    });

    const requiredMinutes = service
      ? service.durationMinutes + service.bufferMinutes
      : 30;

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
        remainingMinutes: requestedSlot.remaining,
        requiredMinutes: requiredMinutes,
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
