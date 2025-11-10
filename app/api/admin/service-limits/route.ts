/**
 * 시술별 한도 설정 API
 *
 * GET /api/admin/service-limits - 전체 한도 설정 조회
 * POST /api/admin/service-limits - 한도 설정 생성/수정
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ServiceType } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// JWT 검증 함수
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
 * GET /api/admin/service-limits
 *
 * 전체 시술별 한도 설정 조회
 *
 * @returns {Array} 한도 설정 목록
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 전체 한도 설정 조회 (service relation 포함)
    const limits = await prisma.service_reservation_limits.findMany({
      include: {
        service: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            durationMinutes: true,
          }
        }
      },
      orderBy: {
        serviceType: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: limits,
      count: limits.length
    });

  } catch (error: any) {
    console.error('Error fetching service limits:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch service limits',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/service-limits
 *
 * 한도 설정 생성 또는 업데이트
 *
 * @body {string} serviceId - 시술 ID (UUID)
 * @body {number} dailyLimitMinutes - 일일 한도 (분 단위)
 * @body {boolean} isActive - 활성화 여부
 * @body {string} reason - 변경 사유 (선택)
 *
 * @returns {Object} 생성/수정된 한도 설정
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { serviceId, dailyLimitMinutes, isActive, reason } = body;

    // 유효성 검증
    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }

    if (dailyLimitMinutes === undefined || dailyLimitMinutes === null) {
      return NextResponse.json(
        { error: 'dailyLimitMinutes is required' },
        { status: 400 }
      );
    }

    if (typeof dailyLimitMinutes !== 'number' || dailyLimitMinutes < 0) {
      return NextResponse.json(
        { error: 'dailyLimitMinutes must be a non-negative number' },
        { status: 400 }
      );
    }

    // serviceId로 service 조회
    const service = await prisma.services.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        code: true,
        name: true
      }
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // serviceType enum 값 찾기 (code와 매칭)
    const serviceType = service.code as ServiceType;

    // 기존 한도 설정 확인
    const existingLimit = await prisma.service_reservation_limits.findUnique({
      where: { serviceId: serviceId }
    });

    let result;

    if (existingLimit) {
      // 업데이트
      result = await prisma.service_reservation_limits.update({
        where: { serviceId: serviceId },
        data: {
          dailyLimitMinutes: dailyLimitMinutes,
          isActive: isActive !== undefined ? isActive : true,
          reason: reason || `한도 변경 (${dailyLimitMinutes}분)`,
          updatedBy: user.email,
          updatedAt: new Date()
        },
        include: {
          service: {
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Service limit updated successfully',
        data: result
      });

    } else {
      // 신규 생성
      result = await prisma.service_reservation_limits.create({
        data: {
          id: `limit_${service.code}`,
          serviceType: serviceType,
          serviceId: serviceId,
          dailyLimitMinutes: dailyLimitMinutes,
          isActive: isActive !== undefined ? isActive : true,
          reason: reason || `초기 한도 설정 (${dailyLimitMinutes}분)`,
          updatedBy: user.email
        },
        include: {
          service: {
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Service limit created successfully',
        data: result
      }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Error creating/updating service limit:', error);

    // Prisma 에러 처리
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Service limit already exists',
          details: error.message
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create/update service limit',
        details: error.message
      },
      { status: 500 }
    );
  }
}
