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
    const page = await prisma.page.findUnique({
      where: {
        slug: pageSlug,
        isPublished: true, // 공개된 페이지만
      },
      include: {
        pageBlocks: {
          where: {
            isVisible: true, // 보이는 블록만
            ...(sectionName ? { sectionName } : {}),
          },
          include: {
            block: true,
          },
          orderBy: [
            { sectionName: 'asc' },
            { order: 'asc' },
          ],
        },
        seoSetting: true,
      },
    });

    if (!page) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Page not found or not published' },
        { status: 404, headers }
      );
    }

    // 섹션별로 그룹화
    const sections = page.pageBlocks.reduce((acc: Record<string, Array<{
      id: string;
      type: string;
      content: unknown;
      styles: unknown;
      settings: unknown;
      order: number;
    }>>, pb) => {
      if (!pb.block || !pb.block.isActive) return acc; // 블록이 없거나 비활성화 상태면 스킵

      if (!acc[pb.sectionName]) {
        acc[pb.sectionName] = [];
      }

      // 커스텀 스타일과 블록 스타일 병합
      const mergedStyles = {
        ...(pb.block.styles as Record<string, unknown> || {}),
        ...(pb.customStyles as Record<string, unknown> || {}),
      };

      acc[pb.sectionName].push({
        id: pb.block.id,
        type: pb.block.type,
        content: pb.block.content,
        styles: mergedStyles,
        settings: pb.block.settings,
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
      seo: page.seoSetting ? {
        metaTitle: page.seoSetting.metaTitle || page.title,
        metaDescription: page.seoSetting.metaDescription,
        metaKeywords: page.seoSetting.metaKeywords,
        ogTitle: page.seoSetting.ogTitle || page.seoSetting.metaTitle || page.title,
        ogDescription: page.seoSetting.ogDescription || page.seoSetting.metaDescription,
        ogImage: page.seoSetting.ogImage,
        canonicalUrl: page.seoSetting.canonicalUrl,
        structuredData: page.seoSetting.structuredData,
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