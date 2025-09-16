import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getSetting, updateSetting, deleteSetting } from '@/lib/settings';
import { SettingUpdateRequest } from '@/types/settings';

/**
 * 개별 시스템 설정 조회/업데이트/삭제
 * GET/PUT/DELETE /api/settings/individual?key={key}
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
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: '설정 키가 필요합니다.' },
        { status: 400 }
      );
    }

    const value = await getSetting(key);

    // 민감한 정보 마스킹
    let maskedValue = value;
    if (key === 'smtpPassword' && value) {
      maskedValue = '********';
    }

    return NextResponse.json({
      success: true,
      key,
      value: maskedValue,
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
 * PATCH /api/settings/individual
 */
export async function PATCH(request: NextRequest) {
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

    const body: SettingUpdateRequest = await request.json();

    if (!body.key || body.value === undefined || !body.category) {
      return NextResponse.json(
        {
          success: false,
          error: '필수 필드가 누락되었습니다.',
        },
        { status: 400 }
      );
    }

    await updateSetting(body.key, body.value, body.category);

    // 업데이트된 값 반환
    const updatedValue = await getSetting(body.key);

    return NextResponse.json({
      success: true,
      message: '설정이 성공적으로 업데이트되었습니다.',
      key: body.key,
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
 * DELETE /api/settings/individual?key={key}
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: '설정 키가 필요합니다.' },
        { status: 400 }
      );
    }

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