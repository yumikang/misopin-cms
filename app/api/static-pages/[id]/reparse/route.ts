import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HTMLParser } from '@/lib/static-pages/html-parser';
import { sectionsToJson } from '@/lib/static-pages/types';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 환경 변수에서 정적 사이트 경로 가져오기
const STATIC_SITE_PATH = process.env.STATIC_PAGES_DIR || path.join(process.cwd(), '../Misopin-renew');
const htmlParser = new HTMLParser(STATIC_SITE_PATH);

/**
 * 페이지 재파싱 (HTML 파일 변경 후 섹션 정보 재추출)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 페이지 조회
    const page = await prisma.staticPage.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // HTML 파일 재파싱
    const parseResult = await htmlParser.parseHTML(page.filePath);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'HTML 파일 재파싱 실패',
          details: parseResult.error,
        },
        { status: 400 }
      );
    }

    // 데이터베이스 업데이트
    const updatedPage = await prisma.staticPage.update({
      where: { id },
      data: {
        sections: sectionsToJson(parseResult.sections),
        lastEdited: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      page: updatedPage,
      sectionsCount: parseResult.sections.length,
      message: '페이지가 재파싱되었습니다.',
    });
  } catch (error) {
    console.error('페이지 재파싱 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    return NextResponse.json(
      {
        success: false,
        error: '페이지 재파싱 중 오류가 발생했습니다.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
