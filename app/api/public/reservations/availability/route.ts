import { NextRequest, NextResponse } from 'next/server';
import { ServiceType } from '@prisma/client';
import { calculateAvailableTimeSlots } from '@/lib/reservations/time-slot-calculator';

/**
 * GET /api/public/reservations/availability
 * Check time-based availability for a specific date and service type
 *
 * Query params:
 * - date: YYYY-MM-DD format
 * - serviceType: ServiceType enum value
 *
 * Returns:
 * - available: boolean (true if ANY time slots available)
 * - slots: array of available time slots with percentage
 * - totalSlots: total number of time slots
 * - availableSlots: number of available slots
 * - message: Human-readable status message
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const serviceTypeParam = searchParams.get('serviceType');

    // Validation
    if (!dateParam || !serviceTypeParam) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          details: 'Both date and serviceType are required',
        },
        { status: 400 }
      );
    }

    // Validate serviceType
    const validServiceTypes = Object.values(ServiceType);
    if (!validServiceTypes.includes(serviceTypeParam as ServiceType)) {
      return NextResponse.json(
        {
          error: 'Invalid serviceType',
          details: `serviceType must be one of: ${validServiceTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate date
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

    // Calculate time-based availability
    const result = await calculateAvailableTimeSlots(
      serviceTypeParam,
      dateParam
    );

    const availableSlots = result.slots.filter(slot => slot.available);
    const totalSlots = result.slots.length;
    const availableSlotsCount = availableSlots.length;
    const available = availableSlotsCount > 0;

    // Generate user-friendly message
    let message: string;
    let level: 'available' | 'limited' | 'full';

    if (availableSlotsCount === 0) {
      message = '해당 날짜는 예약이 마감되었습니다.';
      level = 'full';
    } else if (availableSlotsCount < totalSlots * 0.3) {
      message = `예약 가능 시간이 제한적입니다. (${availableSlotsCount}개 시간대 남음)`;
      level = 'limited';
    } else {
      message = `예약 가능합니다. (${availableSlotsCount}개 시간대 가능)`;
      level = 'available';
    }

    // Return time-based availability info
    return NextResponse.json({
      date: dateParam,
      serviceType: serviceTypeParam,
      serviceName: result.metadata.serviceName,
      available: available,
      availableSlots: availableSlotsCount,
      totalSlots: totalSlots,
      level: level,
      message: message,
      slots: result.slots.map(slot => ({
        time: slot.time,
        period: slot.period,
        available: slot.available,
        remaining: slot.remaining,
        total: slot.total,
        status: slot.status
      }))
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
