import { NextRequest, NextResponse } from 'next/server';
import { ServiceType } from '@prisma/client';
import { checkAvailability } from '@/lib/reservations/daily-limit-counter';

/**
 * GET /api/public/reservations/availability
 * Check availability for a specific date and service type
 *
 * Query params:
 * - date: YYYY-MM-DD format
 * - serviceType: ServiceType enum value
 *
 * Returns:
 * - available: boolean
 * - remaining: number of available slots
 * - level: 'available' | 'limited' | 'full'
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

    // Check availability
    const availability = await checkAvailability(
      date,
      serviceTypeParam as ServiceType
    );

    // Generate user-friendly message
    let message: string;
    if (availability.level === 'full') {
      message = '해당 날짜는 예약이 마감되었습니다.';
    } else {
      message = `예약 가능합니다. (잔여: ${availability.remaining}명)`;
    }

    // Return availability info
    return NextResponse.json({
      date: dateParam,
      serviceType: serviceTypeParam,
      available: availability.available,
      remaining: availability.remaining,
      currentCount: availability.currentCount,
      limit: availability.dailyLimit,
      level: availability.level,
      message,
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
