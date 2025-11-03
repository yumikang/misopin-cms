import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HTMLUpdater } from '@/lib/static-pages/html-updater';
import { HTMLParser } from '@/lib/static-pages/html-parser';
import { sectionsToJson, type StaticPageUpdateRequest } from '@/lib/static-pages/types';
import {
  updatePageWithVersion,
  getCurrentVersion,
  OptimisticLockError,
  createVersionConflictResponse
} from '@/lib/static-pages/optimistic-locking';
import {
  checkLockStatus,
  LockAcquisitionError
} from '@/lib/static-pages/edit-lock';
import {
  syncPageWithFile,
  getSyncStatus
} from '@/lib/static-pages/file-sync';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 환경 변수에서 정적 사이트 경로 가져오기
const STATIC_SITE_PATH = process.env.STATIC_PAGES_DIR || path.join(process.cwd(), '../Misopin-renew');
const htmlUpdater = new HTMLUpdater(STATIC_SITE_PATH);
const htmlParser = new HTMLParser(STATIC_SITE_PATH);

/**
 * 특정 정적 페이지 조회
 *
 * 추가 정보:
 * - version: Optimistic Locking용 현재 버전
 * - lockInfo: 편집 잠금 상태
 * - syncStatus: 파일 동기화 상태
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // URL에서 userId 가져오기 (쿼리 파라미터)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'unknown';

    const page = await prisma.static_pages.findUnique({
      where: { id },
      include: {
        static_page_versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 편집 가능 여부 체크
    const lockStatus = await checkLockStatus(id, userId);

    // 동기화 상태 조회
    const syncStatus = await getSyncStatus(id);

    return NextResponse.json({
      success: true,
      page,
      version: page.version,
      lockInfo: lockStatus.lockInfo,
      canEdit: lockStatus.canEdit,
      syncStatus
    });
  } catch (error) {
    console.error('페이지 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '페이지 조회 실패' },
      { status: 500 }
    );
  }
}

/**
 * 정적 페이지 업데이트 (Optimistic Locking + File Sync)
 *
 * 요청 body:
 * - sections: 업데이트할 섹션 데이터
 * - expectedVersion: 클라이언트가 알고 있는 버전 (Optimistic Locking)
 * - userId: 사용자 ID
 * - changedBy: 변경자 이름
 * - changeNote: 변경 사유
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as StaticPageUpdateRequest & {
      expectedVersion: number;
      userId: string;
    };

    const {
      sections,
      expectedVersion,
      userId,
      changedBy,
      changeNote
    } = body;

    // 1. 입력 검증
    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'sections 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    if (typeof expectedVersion !== 'number') {
      return NextResponse.json(
        { error: 'expectedVersion이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 2. 페이지 존재 확인
    const page = await prisma.static_pages.findUnique({
      where: { id }
    });

    if (!page) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. Edit Lock 체크 (선택적 - 클라이언트에서 먼저 lock을 획득해야 함)
    const lockStatus = await checkLockStatus(id, userId);

    if (!lockStatus.canEdit) {
      return NextResponse.json(
        {
          error: '페이지가 다른 사용자에 의해 잠겨 있습니다.',
          lockInfo: lockStatus.lockInfo,
          code: 'EDIT_LOCKED'
        },
        { status: 423 } // 423 Locked
      );
    }

    // 4. Optimistic Locking으로 업데이트 (자동 재시도 포함)
    const updateResult = await updatePageWithVersion(id, {
      data: {
        sections: sectionsToJson(sections),
        updatedBy: userId
      },
      expectedVersion,
      maxRetries: 3,
      retryDelay: 100
    });

    // 5. Version 충돌 처리
    if (!updateResult.success && updateResult.error instanceof OptimisticLockError) {
      const conflictResponse = createVersionConflictResponse(updateResult.error);

      return NextResponse.json(
        {
          success: false,
          ...conflictResponse,
          retryCount: updateResult.retryCount
        },
        { status: 409 } // 409 Conflict
      );
    }

    if (!updateResult.success) {
      throw new Error(updateResult.error?.message || 'Update failed');
    }

    // 6. 파일 동기화 (원자적)
    const syncResult = await syncPageWithFile(
      {
        pageId: id,
        filePath: page.filePath,
        sections: sectionsToJson(sections),
        changedBy: changedBy || userId,
        changeNote: changeNote || '페이지 업데이트',
        async: false, // 동기 실행
        createBackup: true
      },
      htmlUpdater
    );

    if (!syncResult.success) {
      return NextResponse.json(
        {
          error: '파일 동기화 실패',
          details: syncResult.error,
          dbUpdated: true, // DB는 업데이트되었지만 파일 동기화 실패
          needsManualSync: true
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      page: updateResult.data,
      version: updateResult.version,
      fileHash: syncResult.fileHash,
      backupPath: syncResult.backupPath,
      message: '페이지가 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('페이지 업데이트 오류:', error);

    if (error instanceof LockAcquisitionError) {
      return NextResponse.json(
        {
          success: false,
          error: '편집 잠금을 획득할 수 없습니다.',
          details: error.message
        },
        { status: 423 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    return NextResponse.json(
      {
        success: false,
        error: '페이지 업데이트 중 오류가 발생했습니다.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * 정적 페이지 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 페이지 존재 확인
    const page = await prisma.static_pages.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 페이지 삭제 (Cascade로 버전, element_changes 등도 함께 삭제)
    await prisma.static_pages.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '페이지가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('페이지 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '페이지 삭제 실패' },
      { status: 500 }
    );
  }
}
