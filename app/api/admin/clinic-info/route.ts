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
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    // Only SUPER_ADMIN and ADMIN can manage clinic info
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
 * GET /api/admin/clinic-info
 *
 * Get clinic information for admin editing
 * Requires authentication with ADMIN or SUPER_ADMIN role
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const user = verifyAdminToken(request);
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: '권한이 없습니다',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  try {
    // Fetch active clinic info
    const clinicInfo = await prisma.clinicInfo.findFirst({
      where: { isActive: true },
    });

    if (!clinicInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Clinic information not configured',
          code: 'CLINIC_INFO_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: clinicInfo,
    });
  } catch (error) {
    console.error('Error fetching clinic info:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch clinic information',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/clinic-info
 *
 * Update clinic information
 * Requires authentication with ADMIN or SUPER_ADMIN role
 * Implements optimistic locking with version field
 */
export async function PUT(request: NextRequest) {
  // Verify authentication
  const user = verifyAdminToken(request);
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: '권한이 없습니다',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'id',
      'version',
      'phonePrimary',
      'addressFull',
      'hoursWeekday',
      'hoursSaturday',
      'hoursSunday',
      'businessRegistration',
      'representativeName',
    ];

    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          {
            success: false,
            error: `필수 필드가 누락되었습니다: ${field}`,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
    }

    // Get current record to check version
    const current = await prisma.clinicInfo.findUnique({
      where: { id: body.id },
      select: { version: true, isActive: true },
    });

    if (!current) {
      return NextResponse.json(
        {
          success: false,
          error: '클리닉 정보를 찾을 수 없습니다',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check version for optimistic locking
    if (current.version !== body.version) {
      return NextResponse.json(
        {
          success: false,
          error: '버전 충돌: 다른 사용자가 정보를 업데이트했습니다',
          code: 'VERSION_CONFLICT',
          currentVersion: current.version,
        },
        { status: 409 }
      );
    }

    // Update clinic info with incremented version
    const updatedInfo = await prisma.clinicInfo.update({
      where: {
        id: body.id,
        version: body.version, // Ensure version matches
      },
      data: {
        phonePrimary: body.phonePrimary,
        phoneSecondary: body.phoneSecondary || null,
        addressFull: body.addressFull,
        addressFloor: body.addressFloor || null,
        hoursWeekday: body.hoursWeekday,
        hoursSaturday: body.hoursSaturday,
        hoursSunday: body.hoursSunday,
        hoursLunch: body.hoursLunch || null,
        hoursSpecialNote: body.hoursSpecialNote || null,
        snsInstagram: body.snsInstagram || null,
        snsKakao: body.snsKakao || null,
        snsNaverBlog: body.snsNaverBlog || null,
        snsFacebook: body.snsFacebook || null,
        snsYoutube: body.snsYoutube || null,
        businessRegistration: body.businessRegistration,
        representativeName: body.representativeName,
        medicalLicense: body.medicalLicense || null,
        version: { increment: 1 }, // Increment version
        lastUpdatedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: '클리닉 정보가 업데이트되었습니다',
      data: {
        id: updatedInfo.id,
        version: updatedInfo.version,
        updatedAt: updatedInfo.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating clinic info:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update clinic information',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
