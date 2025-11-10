import { NextRequest, NextResponse } from 'next/server';
import {
  calculateAvailableTimeSlots,
  ReservationError
} from '@/lib/reservations/time-slot-calculator';

/**
 * GET /api/public/reservations/time-slots
 *
 * 특정 날짜와 서비스에 대한 시간대별 예약 가능 여부를 반환합니다.
 *
 * Query Parameters:
 * - service: string (required) - 서비스 코드 (예: "WRINKLE_BOTOX")
 * - date: string (required) - 날짜 (YYYY-MM-DD 형식)
 * - debug: string (optional) - "true"로 설정 시 디버깅 정보 포함
 *
 * Returns:
 * {
 *   success: boolean,
 *   slots: TimeSlot[],
 *   metadata: {
 *     date: string,
 *     service: string,
 *     serviceName: string,
 *     totalSlots: number,
 *     availableSlots: number,
 *     bookedSlots: number
 *   },
 *   debug?: {...}  // debug=true일 때만
 * }
 *
 * TimeSlot:
 * {
 *   time: string,           // "09:00"
 *   period: "MORNING" | "AFTERNOON",
 *   available: boolean,
 *   remaining: number,      // 남은 시간(분)
 *   total: number,          // 총 가용 시간(분)
 *   status: "available" | "limited" | "full"
 * }
 *
 * Example:
 * GET /api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-11-05
 *
 * Response:
 * {
 *   "success": true,
 *   "slots": [
 *     {
 *       "time": "09:00",
 *       "period": "MORNING",
 *       "available": true,
 *       "remaining": 180,
 *       "total": 180,
 *       "status": "available"
 *     },
 *     ...
 *   ],
 *   "metadata": {
 *     "date": "2025-11-05",
 *     "service": "WRINKLE_BOTOX",
 *     "serviceName": "주름 보톡스",
 *     "totalSlots": 12,
 *     "availableSlots": 10,
 *     "bookedSlots": 2
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serviceCode = searchParams.get('service');
  const dateString = searchParams.get('date');
  const debug = searchParams.get('debug') === 'true';

  try {

    // Validate required parameters
    if (!serviceCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter',
          details: 'service parameter is required (e.g., WRINKLE_BOTOX)',
          example: '/api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-11-05'
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    if (!dateString) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter',
          details: 'date parameter is required in YYYY-MM-DD format',
          example: '/api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-11-05'
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format',
          details: 'Date must be in YYYY-MM-DD format',
          received: dateString
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Parse date and validate it's a valid date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date',
          details: 'The provided date is not valid',
          received: dateString
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Check if date is in the past (using UTC to avoid timezone issues)
    const todayUTC = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z');
    if (date < todayUTC) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date is in the past',
          details: 'Cannot retrieve time slots for past dates',
          received: dateString
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Calculate available time slots
    const result = await calculateAvailableTimeSlots(
      serviceCode,
      dateString,
      debug
    );

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        ...result
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60, s-maxage=60', // Cache for 1 minute
        }
      }
    );

  } catch (error) {
    console.error('Error calculating time slots:', error);

    // Handle ReservationError (structured errors from calculator)
    if (error instanceof ReservationError) {
      // NO_CLINIC_HOURS is not an error - it's a valid state (weekends, holidays)
      if (error.code === 'NO_CLINIC_HOURS') {
        return NextResponse.json(
          {
            success: true,
            slots: [],
            message: error.message,
            date: dateString,
            service: serviceCode
          },
          {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=300, s-maxage=300',
            }
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
          ...(error.metadata && { metadata: error.metadata })
        },
        {
          status: error.code === 'SERVICE_NOT_FOUND' ? 404 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        message: '예약 가능 시간을 조회하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
