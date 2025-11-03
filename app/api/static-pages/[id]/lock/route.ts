/**
 * Edit Lock API
 *
 * 페이지 편집 잠금 관리를 위한 API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  acquireEditLock,
  renewEditLock,
  releaseEditLock,
  getLockInfo
} from '@/lib/static-pages/edit-lock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/static-pages/[id]/lock
 *
 * 현재 잠금 상태 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lockInfo = await getLockInfo(id);

    return NextResponse.json({
      success: true,
      lockInfo
    });
  } catch (error) {
    console.error('Lock info 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Lock info 조회 실패'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/static-pages/[id]/lock
 *
 * 편집 잠금 획득
 *
 * Body:
 * - userId: 사용자 ID
 * - lockDuration?: 잠금 유지 시간 (ms, 기본 5분)
 * - force?: 강제 획득 여부
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      userId: string;
      lockDuration?: number;
      force?: boolean;
    };

    const { userId, lockDuration, force } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await acquireEditLock({
      pageId: id,
      userId,
      lockDuration,
      force
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          lockInfo: result.lockInfo
        },
        { status: 423 } // 423 Locked
      );
    }

    return NextResponse.json({
      success: true,
      lockInfo: result.lockInfo,
      message: '편집 잠금을 획득했습니다.'
    });

  } catch (error) {
    console.error('Lock 획득 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Lock 획득 실패'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/static-pages/[id]/lock
 *
 * 편집 잠금 갱신 (heartbeat)
 *
 * Body:
 * - userId: 사용자 ID
 * - lockDuration?: 추가 잠금 시간 (ms, 기본 5분)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      userId: string;
      lockDuration?: number;
    };

    const { userId, lockDuration } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await renewEditLock({
      pageId: id,
      userId,
      lockDuration
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          lockInfo: result.lockInfo
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      lockInfo: result.lockInfo,
      message: '편집 잠금을 갱신했습니다.'
    });

  } catch (error) {
    console.error('Lock 갱신 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Lock 갱신 실패'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/static-pages/[id]/lock
 *
 * 편집 잠금 해제
 *
 * Body:
 * - userId: 사용자 ID
 * - force?: 강제 해제 여부
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      userId: string;
      force?: boolean;
    };

    const { userId, force } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await releaseEditLock({
      pageId: id,
      userId,
      force
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          lockInfo: result.lockInfo
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      lockInfo: result.lockInfo,
      message: '편집 잠금을 해제했습니다.'
    });

  } catch (error) {
    console.error('Lock 해제 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Lock 해제 실패'
      },
      { status: 500 }
    );
  }
}
