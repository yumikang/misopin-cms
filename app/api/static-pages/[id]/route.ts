import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HTMLUpdater } from '@/lib/static-pages/html-updater';
import { HTMLParser } from '@/lib/static-pages/html-parser';
import { sectionsToJson, parseSectionsFromJson, type StaticPageUpdateRequest } from '@/lib/static-pages/types';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 환경 변수에서 정적 사이트 경로 가져오기
const STATIC_SITE_PATH = process.env.STATIC_PAGES_DIR || path.join(process.cwd(), '../Misopin-renew');
const htmlUpdater = new HTMLUpdater(STATIC_SITE_PATH);
const htmlParser = new HTMLParser(STATIC_SITE_PATH);

/**
 * 특정 정적 페이지 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const page = await prisma.staticPage.findUnique({
      where: { id },
      include: {
        versions: {
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

    return NextResponse.json({
      success: true,
      page,
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
 * 정적 페이지 업데이트
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: StaticPageUpdateRequest = await request.json();
    const { sections, changedBy, changeNote } = body;

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'sections 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 페이지 조회
    const page = await prisma.staticPage.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // HTML 파일 업데이트
    const updateResult = await htmlUpdater.updateHTML(page.filePath, sections);

    if (!updateResult.success) {
      return NextResponse.json(
        {
          error: 'HTML 업데이트 실패',
          details: updateResult.message,
        },
        { status: 500 }
      );
    }

    // 데이터베이스 업데이트
    const latestVersion = page.versions[0]?.version || 0;
    const newVersion = latestVersion + 1;

    // 페이지 업데이트
    const updatedPage = await prisma.staticPage.update({
      where: { id },
      data: {
        sections: sectionsToJson(sections),
        lastEdited: new Date(),
      },
    });

    // 새 버전 생성
    await prisma.staticPageVersion.create({
      data: {
        pageId: id,
        version: newVersion,
        sections: sectionsToJson(sections),
        changedBy: changedBy || 'unknown',
        changeNote: changeNote || '페이지 업데이트',
      },
    });

    return NextResponse.json({
      success: true,
      page: updatedPage,
      version: newVersion,
      backupPath: updateResult.backupPath,
      message: '페이지가 성공적으로 업데이트되었습니다.',
    });
  } catch (error) {
    console.error('페이지 업데이트 오류:', error);
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
    const page = await prisma.staticPage.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 페이지 삭제 (Cascade로 버전도 함께 삭제)
    await prisma.staticPage.delete({
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
