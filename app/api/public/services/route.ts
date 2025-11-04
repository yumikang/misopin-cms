import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/public/services
 *
 * 활성화된 서비스 목록과 각 서비스의 상세 정보를 반환합니다.
 *
 * Query Parameters:
 * - code: string (optional) - 특정 서비스 코드로 필터링
 * - active: boolean (optional) - 활성 서비스만 조회 (기본값: true)
 *
 * Returns:
 * {
 *   success: boolean,
 *   services: Service[],
 *   count: number
 * }
 *
 * Service:
 * {
 *   id: string,
 *   code: string,              // "WRINKLE_BOTOX"
 *   name: string,              // "주름 보톡스"
 *   description: string | null,
 *   category: string | null,
 *   durationMinutes: number,   // 시술 시간 (분)
 *   bufferMinutes: number,     // 준비 시간 (분)
 *   totalMinutes: number,      // 총 소요 시간 (분)
 *   displayOrder: number,
 *   isActive: boolean
 * }
 *
 * Example:
 * GET /api/public/services
 * GET /api/public/services?code=WRINKLE_BOTOX
 * GET /api/public/services?active=false
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const activeParam = searchParams.get('active');

    // Parse active parameter (default: true)
    const activeOnly = activeParam === null ? true : activeParam === 'true';

    // Build where clause
    const where: any = {};

    if (code) {
      where.code = code;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    // Fetch services from database
    const services = await prisma.services.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // Transform data to include calculated totalMinutes
    const transformedServices = services.map(service => ({
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      category: service.category,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      totalMinutes: service.durationMinutes + service.bufferMinutes,
      displayOrder: service.displayOrder,
      isActive: service.isActive
    }));

    // If specific code requested but not found
    if (code && transformedServices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service not found',
          details: `No service found with code: ${code}`,
          code
        },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        services: transformedServices,
        count: transformedServices.length
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300, s-maxage=300', // Cache for 5 minutes
        }
      }
    );

  } catch (error) {
    console.error('Error fetching services:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        message: '서비스 정보를 조회하는 중 오류가 발생했습니다.'
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
