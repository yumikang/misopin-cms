import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getSetting, updateSetting, deleteSetting } from '@/lib/settings';
import { SettingUpdateRequest } from '@/types/settings';

interface RouteParams {
  params: {
    key: string;
  };
}

/**
 * 개별 시스템 설정 조회
 * GET /api/settings/[key]
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

    const { key } = params;
    const value = await getSetting(key);

    return NextResponse.json({
      success: true,
      key,
      value,
    });
  } catch (error) {
    console.error('개별 설정 조회 오류:', error);
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
 * 개별 시스템 설정 업데이트
 * PUT /api/settings/[key]
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

    const { key } = params;
    const body: SettingUpdateRequest = await request.json();

    if (body.key !== key) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL의 키와 요청 데이터의 키가 일치하지 않습니다.',
        },
        { status: 400 }
      );
    }

    await updateSetting(body.key, body.value, body.category);

    // 업데이트된 값 반환
    const updatedValue = await getSetting(key);

    return NextResponse.json({
      success: true,
      message: '설정이 성공적으로 업데이트되었습니다.',
      key,
      value: updatedValue,
    });
  } catch (error) {
    console.error('개별 설정 업데이트 오류:', error);
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

/**
 * 개별 시스템 설정 삭제 (기본값으로 리셋)
 * DELETE /api/settings/[key]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // SUPER_ADMIN만 설정 삭제 가능
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '시스템 설정 삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { key } = params;

    await deleteSetting(key);

    // 기본값 반환
    const defaultValue = await getSetting(key);

    return NextResponse.json({
      success: true,
      message: '설정이 기본값으로 리셋되었습니다.',
      key,
      value: defaultValue,
    });
  } catch (error) {
    console.error('개별 설정 삭제 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '설정 삭제에 실패했습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}