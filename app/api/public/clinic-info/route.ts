import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/public/clinic-info
 *
 * Public endpoint for static HTML pages to fetch clinic contact information
 * Returns active clinic info with proper caching headers
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch active clinic info
    const clinicInfo = await prisma.clinic_info.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        phonePrimary: true,
        phoneSecondary: true,
        addressFull: true,
        addressFloor: true,
        hoursWeekday: true,
        hoursSaturday: true,
        hoursSunday: true,
        hoursLunch: true,
        hoursSpecialNote: true,
        snsInstagram: true,
        snsKakao: true,
        snsNaverBlog: true,
        snsFacebook: true,
        snsYoutube: true,
        businessRegistration: true,
        representativeName: true,
        version: true,
        updatedAt: true,
      },
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

    // Structure response for frontend consumption
    const response = {
      success: true,
      data: {
        phone_primary: clinicInfo.phonePrimary,
        phone_secondary: clinicInfo.phoneSecondary,
        address_full: clinicInfo.addressFull,
        address_floor: clinicInfo.addressFloor,
        hours: {
          weekday: clinicInfo.hoursWeekday,
          saturday: clinicInfo.hoursSaturday,
          sunday: clinicInfo.hoursSunday,
          lunch: clinicInfo.hoursLunch,
          special_note: clinicInfo.hoursSpecialNote,
        },
        sns: {
          instagram: clinicInfo.snsInstagram,
          kakao: clinicInfo.snsKakao,
          naver_blog: clinicInfo.snsNaverBlog,
          facebook: clinicInfo.snsFacebook,
          youtube: clinicInfo.snsYoutube,
        },
        business: {
          registration: clinicInfo.businessRegistration,
          representative_name: clinicInfo.representativeName,
        },
        version: clinicInfo.version,
        updated_at: clinicInfo.updatedAt.toISOString(),
      },
    };

    // Return with caching headers (5 minutes)
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*', // Allow all origins for public API
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Max-Age': '86400',
      },
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
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
      },
    }
  );
}
