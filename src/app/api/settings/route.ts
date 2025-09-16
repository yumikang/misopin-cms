import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import {
  getAllSettings,
  updateMultipleSettings,
  getStructuredSettings
} from '@/lib/settings';
import { BulkSettingUpdateRequest } from '@/types/settings';

/**
 * 모든 시스템 설정 조회
 * GET /api/settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // ADMIN 이상만 설정 조회 가능
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: '시스템 설정 조회 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const structured = searchParams.get('structured') === 'true';

    let settings;
    if (structured) {
      settings = await getStructuredSettings();
    } else {
      settings = await getAllSettings();
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('설정 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '설정을 불러오는데 실패했습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

/**
 * 시스템 설정 일괄 업데이트
 * PUT /api/settings
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // SUPER_ADMIN만 설정 수정 가능
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '시스템 설정 수정 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const body: BulkSettingUpdateRequest = await request.json();

    if (!body.settings || !Array.isArray(body.settings)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 요청 데이터입니다.'
        },
        { status: 400 }
      );
    }

    await updateMultipleSettings(body.settings);

    // 업데이트된 설정 반환
    const updatedSettings = await getAllSettings();

    return NextResponse.json({
      success: true,
      message: '설정이 성공적으로 업데이트되었습니다.',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('설정 업데이트 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '설정 업데이트에 실패했습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}