import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getSettingsByCategory, updateMultipleSettings } from '@/lib/settings';
import { SettingCategory, BulkSettingUpdateRequest } from '@/types/settings';

interface RouteParams {
  params: {
    category: string;
  };
}

/**
 * 카테고리별 시스템 설정 조회
 * GET /api/settings/[category]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // SUPER_ADMIN만 설정 조회 가능
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '시스템 설정 조회 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { category } = params;

    // 유효한 카테고리인지 확인
    const validCategories: SettingCategory[] = ['general', 'email', 'security', 'upload'];
    if (!validCategories.includes(category as SettingCategory)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 카테고리입니다.',
        },
        { status: 400 }
      );
    }

    const settings = await getSettingsByCategory(category as SettingCategory);

    return NextResponse.json({
      success: true,
      category,
      settings,
    });
  } catch (error) {
    console.error('카테고리별 설정 조회 오류:', error);
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
 * 카테고리별 시스템 설정 업데이트
 * PUT /api/settings/[category]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { category } = params;

    // 유효한 카테고리인지 확인
    const validCategories: SettingCategory[] = ['general', 'email', 'security', 'upload'];
    if (!validCategories.includes(category as SettingCategory)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 카테고리입니다.',
        },
        { status: 400 }
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

    // 해당 카테고리의 설정만 필터링
    const categorySettings = body.settings.filter(
      setting => setting.category === category
    );

    if (categorySettings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '업데이트할 설정이 없습니다.',
        },
        { status: 400 }
      );
    }

    await updateMultipleSettings(categorySettings);

    // 업데이트된 카테고리 설정 반환
    const updatedSettings = await getSettingsByCategory(category as SettingCategory);

    return NextResponse.json({
      success: true,
      message: `${category} 설정이 성공적으로 업데이트되었습니다.`,
      category,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('카테고리별 설정 업데이트 오류:', error);
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