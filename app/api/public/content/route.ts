import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { WebBuilderResponse } from '@/app/types/webbuilder';

const prisma = new PrismaClient();

// GET: 공개 콘텐츠 조회 (인증 불필요)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSlug = searchParams.get('page');
    const sectionName = searchParams.get('section');

    // CORS 헤더 설정 (정적 사이트에서 접근 가능)
    const headers = {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_STATIC_SITE_URL || '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    };

    if (!pageSlug) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Page slug is required' },
        { status: 400, headers }
      );
    }

    // 페이지 조회
    const page = await prisma.pages.findUnique({
      where: {
        slug: pageSlug,
        isPublished: true, // 공개된 페이지만
      },
      include: {
        page_blocks: {
          where: {
            isVisible: true, // 보이는 블록만
            ...(sectionName ? { sectionName } : {}),
          },
          include: {
            content_blocks: true,
          },
          orderBy: [
            { sectionName: 'asc' },
            { order: 'asc' },
          ],
        },
        seo_settings: true,
      },
    });

    if (!page) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Page not found or not published' },
        { status: 404, headers }
      );
    }

    // 섹션별로 그룹화
    const sections = page.page_blocks.reduce((acc: Record<string, Array<{
      id: string;
      type: string;
      content: unknown;
      styles: unknown;
      settings: unknown;
      order: number;
    }>>, pb) => {
      if (!pb.content_blocks || !pb.content_blocks.isActive) return acc; // 블록이 없거나 비활성화 상태면 스킵

      if (!acc[pb.sectionName]) {
        acc[pb.sectionName] = [];
      }

      // 커스텀 스타일과 블록 스타일 병합
      const mergedStyles = {
        ...(pb.content_blocks.styles as Record<string, unknown> || {}),
        ...(pb.customStyles as Record<string, unknown> || {}),
      };

      acc[pb.sectionName].push({
        id: pb.content_blocks.id,
        type: pb.content_blocks.type,
        content: pb.content_blocks.content,
        styles: mergedStyles,
        settings: pb.content_blocks.settings,
        order: pb.order,
      });

      return acc;
    }, {});

    // 응답 데이터 구성
    const responseData = {
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        metadata: page.metadata,
      },
      sections,
      seo: page.seo_settings ? {
        metaTitle: page.seo_settings.metaTitle || page.title,
        metaDescription: page.seo_settings.metaDescription,
        metaKeywords: page.seo_settings.metaKeywords,
        ogTitle: page.seo_settings.ogTitle || page.seo_settings.metaTitle || page.title,
        ogDescription: page.seo_settings.ogDescription || page.seo_settings.metaDescription,
        ogImage: page.seo_settings.ogImage,
        canonicalUrl: page.seo_settings.canonicalUrl,
        structuredData: page.seo_settings.structuredData,
      } : null,
    };

    return NextResponse.json<WebBuilderResponse<typeof responseData>>(
      {
        success: true,
        data: responseData,
      },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching public content:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// OPTIONS: CORS preflight 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_STATIC_SITE_URL || '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}