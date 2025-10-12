import { NextRequest, NextResponse } from 'next/server';
import { HTMLParser } from '@/lib/static-pages/html-parser';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATIC_SITE_PATH = path.join(process.cwd(), '../Misopin-renew');

// Mock 페이지 정보
const mockPagesInfo: Record<string, { title: string; filePath: string }> = {
  'mock-1': { title: '메인 페이지', filePath: 'index.html' },
  'mock-2': { title: '병원 소개', filePath: 'about.html' },
  'mock-3': { title: '보톡스 시술', filePath: 'contents/treatments/botox.html' },
  'mock-4': { title: '필러 시술', filePath: 'contents/treatments/filler.html' },
  'mock-5': { title: '리프팅 시술', filePath: 'contents/treatments/lifting.html' },
};

/**
 * 특정 페이지 조회 (실제 HTML 파일에서 파싱)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pageInfo = mockPagesInfo[id];

    if (!pageInfo) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 실제 HTML 파일 파싱
    const htmlParser = new HTMLParser(STATIC_SITE_PATH);
    const parseResult = await htmlParser.parseHTML(pageInfo.filePath);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'HTML 파일 파싱 실패',
          details: parseResult.error
        },
        { status: 500 }
      );
    }

    // Mock 페이지 데이터 생성
    const page = {
      id,
      slug: pageInfo.filePath.replace('.html', '').replace(/\//g, '-'),
      title: pageInfo.title,
      filePath: pageInfo.filePath,
      sections: parseResult.sections,
      isPublished: true,
      lastEdited: new Date().toISOString(),
      versions: [
        {
          id: `version-1`,
          version: 1,
          changedBy: 'system',
          changeNote: '초기 파싱 (Mock)',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };

    return NextResponse.json({
      success: true,
      page,
    });
  } catch (error) {
    console.error('Mock API 오류:', error);
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
 * 페이지 업데이트 (Mock - 실제로는 저장 안 함)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sections, changedBy, changeNote } = body;

    // Mock: 실제로는 저장하지 않고 성공 응답만 반환
    return NextResponse.json({
      success: true,
      page: {
        id,
        sections,
        lastEdited: new Date().toISOString(),
      },
      version: 2,
      message: '✅ Mock 모드: 변경사항이 저장되지 않았습니다. (데이터베이스 연결 필요)',
    });
  } catch (error) {
    console.error('Mock PUT 오류:', error);
    return NextResponse.json(
      { success: false, error: 'Mock 업데이트 실패' },
      { status: 500 }
    );
  }
}
