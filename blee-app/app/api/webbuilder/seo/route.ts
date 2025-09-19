import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { requireWebBuilderPermission } from '@/lib/auth';
import { SEOSettings, WebBuilderResponse } from '@/app/types/webbuilder';

const prisma = new PrismaClient();

// GET: 페이지의 SEO 설정 조회
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['VIEW_WEBBUILDER']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    const seoSetting = await prisma.sEOSetting.findUnique({
      where: { pageId },
    });

    if (!seoSetting) {
      // SEO 설정이 없으면 기본값 반환
      return NextResponse.json<WebBuilderResponse<SEOSettings>>({
        success: true,
        data: {
          metaTitle: '',
          metaDescription: '',
          metaKeywords: [],
          ogTitle: '',
          ogDescription: '',
          ogImage: '',
          canonicalUrl: '',
          structuredData: {},
        },
      });
    }

    return NextResponse.json<WebBuilderResponse<typeof seoSetting>>({
      success: true,
      data: seoSetting,
    });
  } catch (error) {
    console.error('Error fetching SEO settings:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to fetch SEO settings' },
      { status: 500 }
    );
  }
}

// POST: SEO 설정 생성 또는 업데이트
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_SEO']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { pageId, ...seoData }: { pageId: string } & SEOSettings = body;

    if (!pageId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // 페이지 존재 확인
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Upsert SEO 설정
    const seoSetting = await prisma.sEOSetting.upsert({
      where: { pageId },
      create: {
        pageId,
        metaTitle: seoData.metaTitle,
        metaDescription: seoData.metaDescription,
        metaKeywords: seoData.metaKeywords || [],
        ogTitle: seoData.ogTitle,
        ogDescription: seoData.ogDescription,
        ogImage: seoData.ogImage,
        canonicalUrl: seoData.canonicalUrl,
        structuredData: (seoData.structuredData || null) as Prisma.InputJsonValue,
      },
      update: {
        metaTitle: seoData.metaTitle,
        metaDescription: seoData.metaDescription,
        metaKeywords: seoData.metaKeywords || [],
        ogTitle: seoData.ogTitle,
        ogDescription: seoData.ogDescription,
        ogImage: seoData.ogImage,
        canonicalUrl: seoData.canonicalUrl,
        structuredData: (seoData.structuredData || null) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json<WebBuilderResponse<typeof seoSetting>>({
      success: true,
      data: seoSetting,
      message: 'SEO settings saved successfully',
    });
  } catch (error) {
    console.error('Error saving SEO settings:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to save SEO settings' },
      { status: 500 }
    );
  }
}

// DELETE: SEO 설정 삭제
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_SEO']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    await prisma.sEOSetting.delete({
      where: { pageId },
    });

    return NextResponse.json<WebBuilderResponse<null>>({
      success: true,
      message: 'SEO settings deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting SEO settings:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to delete SEO settings' },
      { status: 500 }
    );
  }
}