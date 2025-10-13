import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HTMLParser } from '@/lib/static-pages/html-parser';
import { sectionsToJson, type StaticPageCreateRequest } from '@/lib/static-pages/types';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 환경 변수에서 정적 사이트 경로 가져오기
const STATIC_SITE_PATH = process.env.STATIC_PAGES_DIR || path.join(process.cwd(), '../Misopin-renew');
const htmlParser = new HTMLParser(STATIC_SITE_PATH);

/**
 * 정적 페이지 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    // 특정 페이지 조회
    if (slug) {
      const page = await prisma.staticPage.findUnique({
        where: { slug },
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
    }

    // 전체 페이지 목록 조회
    const pages = await prisma.staticPage.findMany({
      orderBy: { lastEdited: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        filePath: true,
        isPublished: true,
        lastEdited: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      pages,
    });
  } catch (error) {
    console.error('페이지 조회 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    return NextResponse.json(
      {
        success: false,
        error: '페이지 조회 중 오류가 발생했습니다.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * 새 정적 페이지 등록
 */
export async function POST(request: NextRequest) {
  try {
    const body: StaticPageCreateRequest = await request.json();
    const { slug, title, filePath } = body;

    if (!slug || !title || !filePath) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다: slug, title, filePath' },
        { status: 400 }
      );
    }

    // 파일 파싱
    const parseResult = await htmlParser.parseHTML(filePath);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'HTML 파일 파싱 실패',
          details: parseResult.error,
        },
        { status: 400 }
      );
    }

    // 페이지 생성
    const page = await prisma.staticPage.create({
      data: {
        slug,
        title,
        filePath,
        sections: sectionsToJson(parseResult.sections),
        isPublished: false,
      },
    });

    // 초기 버전 생성
    await prisma.staticPageVersion.create({
      data: {
        pageId: page.id,
        version: 1,
        sections: sectionsToJson(parseResult.sections),
        changedBy: 'system',
        changeNote: '초기 페이지 등록',
      },
    });

    return NextResponse.json({
      success: true,
      page,
      sectionsCount: parseResult.sections.length,
    });
  } catch (error) {
    console.error('페이지 생성 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    // Unique constraint 오류 처리
    if (errorMessage.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '이미 존재하는 페이지 slug입니다.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '페이지 생성 중 오류가 발생했습니다.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
