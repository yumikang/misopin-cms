import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Rate limiting store (in-memory, resets on server restart)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimiter.entries()) {
    if (value.resetAt < now) {
      rateLimiter.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Validate phone number format
 */
function validatePhone(phone: string): boolean {
  // Remove hyphens, spaces, and parentheses
  const cleaned = phone.replace(/[-\s()]/g, '');

  // Must be 10-11 digits (Korean phone numbers)
  if (!/^\d{10,11}$/.test(cleaned)) {
    return false;
  }

  return true;
}

/**
 * Normalize phone number (remove special characters)
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[-\s()]/g, '');
}

/**
 * Check rate limit (max 10 requests per minute per IP)
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(ip);

  if (!limit || limit.resetAt < now) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute
    return true;
  }

  if (limit.count >= 10) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}

/**
 * GET /api/public/reservations/check?phone={phone}
 *
 * Check reservations by phone number
 * Returns reservations from the last 90 days
 */
export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '60'
          }
        }
      );
    }

    // Get phone number from query params
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: '전화번호를 입력해주세요.',
          code: 'PHONE_REQUIRED'
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Validate phone number format
    if (!validatePhone(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)',
          code: 'INVALID_PHONE_FORMAT'
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone);

    // Calculate date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Query reservations
    // Try both with and without hyphens to handle different formats in DB
    const reservations = await prisma.reservations.findMany({
      where: {
        OR: [
          { phone: phone },                    // With hyphens: 010-1234-5678
          { phone: normalizedPhone },          // Without hyphens: 01012345678
        ],
        preferredDate: {
          gte: ninetyDaysAgo
        }
      },
      select: {
        id: true,
        patientName: true,
        phone: true,
        preferredDate: true,
        preferredTime: true,
        service: true,
        serviceName: true,
        status: true,
        treatmentType: true,
        notes: true,
        createdAt: true,
        // Include service details if available
        services: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        { preferredDate: 'desc' },
        { preferredTime: 'desc' }
      ],
      take: 10 // Limit to 10 most recent
    });

    // Transform data for frontend
    const transformedReservations = reservations.map(reservation => ({
      id: reservation.id,
      patient_name: reservation.patientName,
      phone: reservation.phone,
      preferred_date: reservation.preferredDate.toISOString().split('T')[0],
      preferred_time: reservation.preferredTime,
      service: reservation.service,
      service_name: reservation.serviceName || reservation.services?.name || '',
      service_code: reservation.services?.code || reservation.service,
      status: reservation.status,
      treatment_type: reservation.treatmentType,
      notes: reservation.notes,
      created_at: reservation.createdAt.toISOString()
    }));

    return NextResponse.json(
      {
        success: true,
        reservations: transformedReservations,
        count: transformedReservations.length
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );

  } catch (error) {
    console.error('Error checking reservations:', error);

    return NextResponse.json(
      {
        success: false,
        error: '예약 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR'
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  );
}
