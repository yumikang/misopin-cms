import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface JwtPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  name: string;
}

/**
 * Verify JWT token and check admin permissions
 */
function verifyAdminToken(request: NextRequest): JwtPayload | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'
    ) as JwtPayload;

    // Only SUPER_ADMIN and ADMIN can manage manual closures
    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'ADMIN') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Invalidate reservation cache for a specific date
 */
function invalidateCache(dateString: string) {
  // Import the cache invalidation function from time-slot-calculator
  try {
    const { invalidateDate } = require('@/lib/reservations/time-slot-calculator');
    invalidateDate(dateString);
  } catch (error) {
    console.warn('Cache invalidation failed:', error);
  }
}

/**
 * Check for existing reservations in a time slot
 */
async function checkConflicts(
  closureDate: string,
  period: string,
  timeSlotStart: string,
  serviceId?: string | null
) {
  const dateObj = new Date(closureDate);

  // Get all reservations for the date and service
  const where: any = {
    preferredDate: dateObj,
    status: {
      in: ['PENDING', 'CONFIRMED']
    }
  };

  if (serviceId) {
    where.serviceId = serviceId;
  }

  const reservations = await prisma.reservations.findMany({
    where,
    select: {
      id: true,
      patientName: true,
      preferredTime: true,
      timeSlotStart: true,
      period: true,
      status: true
    }
  });

  // Filter by time slot and period
  const conflicts = reservations.filter(r => {
    // Match by period
    if (r.period && r.period !== period) return false;

    // Match by time slot
    const resTime = r.timeSlotStart || r.preferredTime;
    return resTime === timeSlotStart;
  });

  return {
    hasConflict: conflicts.length > 0,
    conflictCount: conflicts.length,
    conflicts,
    recommendation: conflicts.length > 0
      ? '마감 시 신규 예약만 차단되며, 기존 예약은 유지됩니다.'
      : '예약 없음 - 즉시 마감 가능'
  };
}

/**
 * POST /api/admin/manual-close
 *
 * Create manual time closures OR check conflicts
 *
 * Request body (create):
 * {
 *   closureDate: string;  // YYYY-MM-DD
 *   period: "MORNING" | "AFTERNOON" | "EVENING";
 *   timeSlotStart: string;  // "09:00"
 *   timeSlotEnd?: string | null;  // "09:30"
 *   serviceId?: string | null;  // null = all services
 *   reason?: string;
 * }
 *
 * Request body (check conflict):
 * {
 *   action: "check-conflict",
 *   closureDate: string;
 *   period: string;
 *   timeSlotStart: string;
 *   serviceId?: string | null;
 * }
 */
export async function POST(request: NextRequest) {
  // Verify authentication
  const user = verifyAdminToken(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, closureDate, period, timeSlotStart, timeSlotEnd, timeSlots, serviceId, serviceCode, reason } = body;

    // Convert serviceCode to serviceId if provided
    let resolvedServiceId = serviceId;
    if (serviceCode && !serviceId) {
      const service = await prisma.services.findUnique({
        where: { code: serviceCode },
        select: { id: true }
      });
      resolvedServiceId = service?.id || null;
    }

    // Handle conflict check action
    if (action === 'check-conflict') {
      if (!closureDate || !period || !timeSlotStart) {
        return NextResponse.json(
          { error: 'Missing required fields for conflict check' },
          { status: 400 }
        );
      }

      const conflictInfo = await checkConflicts(
        closureDate,
        period,
        timeSlotStart,
        serviceId
      );

      return NextResponse.json({
        success: true,
        ...conflictInfo
      });
    }

    // Handle creation - support both single closure and batch
    const isLegacyBatch = timeSlots && Array.isArray(timeSlots);

    if (isLegacyBatch) {
      // Legacy batch creation (backward compatibility)
      if (!closureDate || !period || !timeSlots || !Array.isArray(timeSlots)) {
        return NextResponse.json(
          { error: 'Missing required fields: closureDate, period, timeSlots' },
          { status: 400 }
        );
      }

      if (!['MORNING', 'AFTERNOON', 'EVENING'].includes(period)) {
        return NextResponse.json(
          { error: 'Period must be MORNING, AFTERNOON, or EVENING' },
          { status: 400 }
        );
      }

      const closures = await prisma.manual_time_closures.createMany({
        data: timeSlots.map((timeSlot: string) => ({
          closureDate: new Date(closureDate),
          period,
          timeSlotStart: timeSlot,
          serviceId: resolvedServiceId || null,
          reason: reason || null,
          createdBy: user.email,
          isActive: true
        })),
        skipDuplicates: true
      });

      invalidateCache(closureDate);

      return NextResponse.json({
        success: true,
        count: closures.count,
        message: `${closures.count} time slots closed successfully`
      });
    } else {
      // Single closure creation (new API for quick close)
      if (!closureDate || !period || !timeSlotStart) {
        return NextResponse.json(
          { error: 'Missing required fields: closureDate, period, timeSlotStart' },
          { status: 400 }
        );
      }

      if (!['MORNING', 'AFTERNOON', 'EVENING'].includes(period)) {
        return NextResponse.json(
          { error: 'Period must be MORNING, AFTERNOON, or EVENING' },
          { status: 400 }
        );
      }

      const closure = await prisma.manual_time_closures.create({
        data: {
          closureDate: new Date(closureDate),
          period,
          timeSlotStart,
          timeSlotEnd: timeSlotEnd || null,
          serviceId: resolvedServiceId || null,
          reason: reason || '빠른 마감',
          createdBy: user.email,
          isActive: true
        }
      });

      invalidateCache(closureDate);

      return NextResponse.json({
        success: true,
        closure,
        message: 'Time slot closed successfully'
      });
    }

  } catch (error) {
    console.error('Error creating manual closure:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create manual closure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/manual-close
 *
 * Get manual time closures
 * 
 * Query params:
 * - date: string (YYYY-MM-DD)
 * - serviceId?: string
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const user = verifyAdminToken(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');
    const serviceCode = searchParams.get('serviceCode');

    if (!date) {
      return NextResponse.json(
        { error: 'Missing required parameter: date' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      closureDate: new Date(date),
      isActive: true
    };

    // If serviceCode is provided, find the service ID first
    if (serviceCode) {
      const service = await prisma.services.findUnique({
        where: { code: serviceCode },
        select: { id: true }
      });

      if (service) {
        where.serviceId = service.id;
      } else {
        // If service not found, return empty array
        return NextResponse.json({
          success: true,
          closures: []
        });
      }
    } else if (serviceId) {
      where.serviceId = serviceId;
    }

    // Get closures with service info
    const closures = await prisma.manual_time_closures.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      },
      orderBy: [
        { period: 'asc' },
        { timeSlotStart: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      closures
    });

  } catch (error) {
    console.error('Error fetching manual closures:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch manual closures',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/manual-close
 *
 * Delete (deactivate) manual time closures
 * 
 * Query params:
 * - id: string (closure ID)
 * OR
 * Request body:
 * {
 *   closureDate: string;
 *   period: string;
 *   timeSlots: string[];
 *   serviceId?: string;
 * }
 */
export async function DELETE(request: NextRequest) {
  // Verify authentication
  const user = verifyAdminToken(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Delete by ID
      const result = await prisma.manual_time_closures.update({
        where: { id },
        data: { isActive: false }
      });

      // Invalidate cache
      const dateString = result.closureDate.toISOString().split('T')[0];
      invalidateCache(dateString);

      return NextResponse.json({
        success: true,
        message: 'Closure deleted successfully'
      });
    } else {
      // Delete by criteria (batch delete)
      const body = await request.json();
      const { closureDate, period, timeSlots, serviceId } = body;

      if (!closureDate || !period || !timeSlots) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const result = await prisma.manual_time_closures.updateMany({
        where: {
          closureDate: new Date(closureDate),
          period,
          timeSlotStart: { in: timeSlots },
          serviceId: serviceId || null,
          isActive: true
        },
        data: { isActive: false }
      });

      // Invalidate cache
      invalidateCache(closureDate);

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} closures deleted successfully`
      });
    }

  } catch (error) {
    console.error('Error deleting manual closure:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete manual closure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/admin/manual-close
 *
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
