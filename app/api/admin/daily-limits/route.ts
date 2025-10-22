import { NextRequest, NextResponse } from 'next/server';
import { ServiceType } from '@prisma/client';
import {
  getAllLimits,
  upsertLimit,
  toggleLimitActive,
} from '@/lib/reservations/daily-limit-counter';

/**
 * GET /api/admin/daily-limits
 * 시술별 예약 한도 조회 (전체 6개 시술)
 */
export async function GET() {
  try {
    const limits = await getAllLimits();

    // Transform to frontend-friendly format
    const transformedLimits = limits.map((limit) => ({
      id: limit.id,
      serviceType: limit.serviceType,
      softLimit: limit.softLimit,
      hardLimit: limit.hardLimit,
      isActive: limit.isActive,
      createdAt: limit.createdAt.toISOString(),
      updatedAt: limit.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      limits: transformedLimits,
      total: transformedLimits.length,
    });
  } catch (error) {
    console.error('Error fetching service limits:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/daily-limits
 * 시술별 한도 일괄 업데이트
 *
 * Body:
 * {
 *   limits: [
 *     { serviceType: 'WRINKLE_BOTOX', softLimit: 8, hardLimit: 10 },
 *     ...
 *   ]
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.limits || !Array.isArray(body.limits)) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: 'limits array is required',
        },
        { status: 400 }
      );
    }

    // Validate all entries
    const validServiceTypes = Object.values(ServiceType);
    for (const limit of body.limits) {
      if (!limit.serviceType || !validServiceTypes.includes(limit.serviceType)) {
        return NextResponse.json(
          {
            error: 'Invalid serviceType',
            details: `serviceType must be one of: ${validServiceTypes.join(', ')}`,
          },
          { status: 400 }
        );
      }

      if (
        typeof limit.softLimit !== 'number' ||
        typeof limit.hardLimit !== 'number' ||
        limit.softLimit < 1 ||
        limit.hardLimit < 1
      ) {
        return NextResponse.json(
          {
            error: 'Invalid limit values',
            details: 'softLimit and hardLimit must be positive numbers',
          },
          { status: 400 }
        );
      }

      if (limit.softLimit > limit.hardLimit) {
        return NextResponse.json(
          {
            error: 'Invalid limit configuration',
            details: `softLimit cannot exceed hardLimit for ${limit.serviceType}`,
          },
          { status: 400 }
        );
      }
    }

    // Update all limits
    const updatedLimits = await Promise.all(
      body.limits.map((limit: { serviceType: ServiceType; softLimit: number; hardLimit: number }) =>
        upsertLimit(limit.serviceType, limit.softLimit, limit.hardLimit)
      )
    );

    return NextResponse.json({
      success: true,
      limits: updatedLimits.map((limit) => ({
        id: limit.id,
        serviceType: limit.serviceType,
        softLimit: limit.softLimit,
        hardLimit: limit.hardLimit,
        isActive: limit.isActive,
      })),
      message: '한도 설정이 완료되었습니다.',
    });
  } catch (error) {
    console.error('Error updating service limits:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/daily-limits
 * 특정 시술의 한도 또는 활성화 상태 수정
 *
 * Query params:
 * - serviceType: ServiceType (required)
 *
 * Body:
 * - softLimit: number (optional)
 * - hardLimit: number (optional)
 * - isActive: boolean (optional)
 */
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serviceTypeParam = searchParams.get('serviceType');

    if (!serviceTypeParam) {
      return NextResponse.json(
        {
          error: 'Missing serviceType parameter',
          details: 'serviceType query parameter is required',
        },
        { status: 400 }
      );
    }

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

    const body = await request.json();
    const serviceType = serviceTypeParam as ServiceType;

    // Handle isActive toggle separately
    if (body.isActive !== undefined && typeof body.isActive === 'boolean') {
      const updatedLimit = await toggleLimitActive(serviceType, body.isActive);

      return NextResponse.json({
        success: true,
        limit: {
          id: updatedLimit.id,
          serviceType: updatedLimit.serviceType,
          softLimit: updatedLimit.softLimit,
          hardLimit: updatedLimit.hardLimit,
          isActive: updatedLimit.isActive,
        },
        message: `${serviceType} 한도가 ${body.isActive ? '활성화' : '비활성화'}되었습니다.`,
      });
    }

    // Handle limit updates
    if (body.softLimit !== undefined || body.hardLimit !== undefined) {
      // Get current values first
      const limits = await getAllLimits();
      const currentLimit = limits.find((l) => l.serviceType === serviceType);

      if (!currentLimit) {
        return NextResponse.json(
          {
            error: 'Limit not found',
            details: `No limit configuration found for ${serviceType}`,
          },
          { status: 404 }
        );
      }

      const softLimit = body.softLimit ?? currentLimit.softLimit;
      const hardLimit = body.hardLimit ?? currentLimit.hardLimit;

      // Validation
      if (softLimit < 1 || hardLimit < 1) {
        return NextResponse.json(
          {
            error: 'Invalid limit values',
            details: 'softLimit and hardLimit must be greater than 0',
          },
          { status: 400 }
        );
      }

      if (softLimit > hardLimit) {
        return NextResponse.json(
          {
            error: 'Invalid limit configuration',
            details: 'softLimit cannot exceed hardLimit',
          },
          { status: 400 }
        );
      }

      const updatedLimit = await upsertLimit(serviceType, softLimit, hardLimit);

      return NextResponse.json({
        success: true,
        limit: {
          id: updatedLimit.id,
          serviceType: updatedLimit.serviceType,
          softLimit: updatedLimit.softLimit,
          hardLimit: updatedLimit.hardLimit,
          isActive: updatedLimit.isActive,
        },
        message: '한도가 업데이트되었습니다.',
      });
    }

    return NextResponse.json(
      {
        error: 'Nothing to update',
        details: 'Provide softLimit, hardLimit, or isActive to update',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating service limit:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
