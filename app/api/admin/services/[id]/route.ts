/**
 * Service Management API - Individual Service Operations
 *
 * PATCH /api/admin/services/[id] - Update service
 * DELETE /api/admin/services/[id] - Delete service (soft/hard)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ServiceUpdateSchema, type ServiceUpdateInput } from '../validation';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

interface CascadeEffects {
  maxBookingsChanged?: {
    before: number;
    after: number;
  };
  affectedDates?: number;
  warnings?: string[];
}

/**
 * JWT token verification
 */
function verifyToken(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'
    ) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Role-based authorization check
 */
function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: { [key: string]: number } = {
    'SUPER_ADMIN': 3,
    'ADMIN': 2,
    'EDITOR': 1
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Calculate cascade effects when duration changes
 */
async function calculateCascadeEffects(
  serviceId: string,
  oldDuration: number,
  newDuration: number
): Promise<CascadeEffects> {
  const effects: CascadeEffects = {
    warnings: []
  };

  // Check if service has daily limits configured
  const limit = await prisma.service_reservation_limits.findUnique({
    where: { serviceId }
  });

  if (limit && limit.dailyLimitMinutes) {
    const oldMaxBookings = Math.floor(limit.dailyLimitMinutes / oldDuration);
    const newMaxBookings = Math.floor(limit.dailyLimitMinutes / newDuration);

    if (oldMaxBookings !== newMaxBookings) {
      effects.maxBookingsChanged = {
        before: oldMaxBookings,
        after: newMaxBookings
      };

      effects.warnings?.push(
        `일일 최대 예약 건수가 ${oldMaxBookings}건에서 ${newMaxBookings}건으로 변경됩니다.`
      );
    }
  }

  // Check for existing reservations that might be affected
  const futureReservations = await prisma.reservations.count({
    where: {
      serviceId: serviceId,
      preferredDate: {
        gte: new Date()
      },
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    }
  });

  if (futureReservations > 0) {
    effects.warnings?.push(
      `현재 ${futureReservations}건의 예정된 예약이 있습니다. 시술 시간 변경 시 주의하세요.`
    );
  }

  return effects;
}

/**
 * PATCH /api/admin/services/[id]
 *
 * Update an existing service
 *
 * Required role: ADMIN or SUPER_ADMIN
 *
 * Request Body (all fields optional):
 * - name?: string
 * - description?: string
 * - category?: string
 * - durationMinutes?: number (triggers cascade effects)
 * - bufferMinutes?: number
 * - isActive?: boolean
 * - displayOrder?: number
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication and authorization check
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasRole(user.role, 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin role required' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const serviceId = params.id;

    // Check if service exists
    const existingService = await prisma.services.findUnique({
      where: { id: serviceId },
      include: {
        service_reservation_limits: true
      }
    });

    if (!existingService) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ServiceUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Track changes for response
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && existingService[key as keyof typeof existingService] !== value) {
        changes.push({
          field: key,
          oldValue: existingService[key as keyof typeof existingService],
          newValue: value
        });
      }
    });

    // Calculate cascade effects if duration is changing
    let cascadeEffects: CascadeEffects | undefined;
    if (updateData.durationMinutes && updateData.durationMinutes !== existingService.durationMinutes) {
      cascadeEffects = await calculateCascadeEffects(
        serviceId,
        existingService.durationMinutes,
        updateData.durationMinutes
      );
    }

    // Update service
    const updatedService = await prisma.services.update({
      where: { id: serviceId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            reservations: true,
            clinic_time_slots: true,
            manual_time_closures: true
          }
        },
        service_reservation_limits: {
          select: {
            id: true,
            dailyLimitMinutes: true,
            isActive: true
          }
        }
      }
    });

    // Transform response
    const transformedService = {
      ...updatedService,
      totalMinutes: updatedService.durationMinutes + updatedService.bufferMinutes,
      createdAt: updatedService.createdAt.toISOString(),
      updatedAt: updatedService.updatedAt.toISOString()
    };

    const response: any = {
      success: true,
      message: 'Service updated successfully',
      data: transformedService,
      changes,
      timestamp: new Date().toISOString()
    };

    if (cascadeEffects && Object.keys(cascadeEffects).length > 0) {
      response.cascadeEffects = cascadeEffects;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error updating service:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update service',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/services/[id]
 *
 * Delete a service (soft delete by default, hard delete with query param)
 *
 * Required role:
 * - Soft delete: ADMIN
 * - Hard delete: SUPER_ADMIN
 *
 * Query Parameters:
 * - hard: boolean (if true, performs hard delete - requires SUPER_ADMIN)
 *
 * Business Rules:
 * - Default: Soft delete (set isActive = false)
 * - Hard delete only if:
 *   - No existing reservations
 *   - No service limits configured
 *   - User has SUPER_ADMIN role
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const serviceId = params.id;
    const { searchParams } = new URL(request.url);
    const isHardDelete = searchParams.get('hard') === 'true';

    // Check if service exists
    const service = await prisma.services.findUnique({
      where: { id: serviceId },
      include: {
        _count: {
          select: {
            reservations: true,
            clinic_time_slots: true,
            manual_time_closures: true
          }
        },
        service_reservation_limits: true
      }
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Soft delete (default)
    if (!isHardDelete) {
      // Require at least ADMIN role for soft delete
      if (!hasRole(user.role, 'ADMIN')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Admin role required' },
          { status: 403 }
        );
      }

      const deactivatedService = await prisma.services.update({
        where: { id: serviceId },
        data: {
          isActive: false,
          updatedAt: new Date()
        },
        include: {
          _count: {
            select: {
              reservations: true,
              clinic_time_slots: true,
              manual_time_closures: true
            }
          },
          service_reservation_limits: {
            select: {
              id: true,
              dailyLimitMinutes: true,
              isActive: true
            }
          }
        }
      });

      const transformedService = {
        ...deactivatedService,
        totalMinutes: deactivatedService.durationMinutes + deactivatedService.bufferMinutes,
        createdAt: deactivatedService.createdAt.toISOString(),
        updatedAt: deactivatedService.updatedAt.toISOString()
      };

      return NextResponse.json({
        success: true,
        message: 'Service deactivated successfully',
        data: transformedService,
        timestamp: new Date().toISOString()
      });
    }

    // Hard delete - requires SUPER_ADMIN
    if (!hasRole(user.role, 'SUPER_ADMIN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Super Admin role required for hard delete'
        },
        { status: 403 }
      );
    }

    // Safety checks for hard delete
    const canHardDelete =
      service._count.reservations === 0 &&
      service._count.clinic_time_slots === 0 &&
      service._count.manual_time_closures === 0 &&
      !service.service_reservation_limits;

    if (!canHardDelete) {
      const reasons: string[] = [];
      if (service._count.reservations > 0) {
        reasons.push(`${service._count.reservations}건의 예약 기록이 존재합니다`);
      }
      if (service._count.clinic_time_slots > 0) {
        reasons.push(`${service._count.clinic_time_slots}개의 타임슬롯이 연결되어 있습니다`);
      }
      if (service._count.manual_time_closures > 0) {
        reasons.push(`${service._count.manual_time_closures}개의 휴무 설정이 연결되어 있습니다`);
      }
      if (service.service_reservation_limits) {
        reasons.push('예약 한도 설정이 존재합니다');
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Cannot perform hard delete',
          details: '다음 이유로 완전 삭제가 불가능합니다',
          reasons
        },
        { status: 400 }
      );
    }

    // Perform hard delete
    await prisma.services.delete({
      where: { id: serviceId }
    });

    return NextResponse.json({
      success: true,
      message: 'Service permanently deleted',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error deleting service:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete service',
        details: error.message
      },
      { status: 500 }
    );
  }
}
