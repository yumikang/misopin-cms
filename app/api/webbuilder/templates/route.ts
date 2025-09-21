import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireWebBuilderPermission } from '@/lib/auth';
import { WebBuilderResponse } from '@/app/types/webbuilder';

const prisma = new PrismaClient();

// GET: 템플릿 목록 조회 (카테고리별 필터링, 페이지네이션)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['VIEW_WEBBUILDER']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const isPublic = searchParams.get('isPublic');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);

    const where: Record<string, unknown> = {};

    // 카테고리 필터
    if (category && category !== 'ALL') {
      where.category = category;
    }

    // 검색 필터
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }

    // 공개 여부 필터
    if (isPublic !== null) {
      if (isPublic === 'true') {
        where.isPublic = true;
      } else {
        // 비공개 템플릿은 본인 것만 조회 가능
        where.OR = [
          { isPublic: true },
          { createdBy: user.id }
        ];
      }
    } else {
      // 기본적으로 공개 템플릿 + 본인 템플릿
      where.OR = [
        { isPublic: true },
        { createdBy: user.id }
      ];
    }

    // 태그 필터
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      prisma.blockTemplate.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.blockTemplate.count({ where })
    ]);

    return NextResponse.json<WebBuilderResponse<{
      templates: typeof templates;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>({
      success: true,
      data: {
        templates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST: 새 템플릿 생성 (현재 블록을 템플릿으로 저장)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_TEMPLATES']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const {
      name,
      description,
      category,
      thumbnailUrl,
      isPublic = false,
      templateData,
      tags = []
    } = body;

    // 입력 유효성 검사
    if (!name || !category || !templateData) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Name, category, and templateData are required' },
        { status: 400 }
      );
    }

    // 템플릿 데이터 유효성 검사
    if (!templateData.type || !templateData.content) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Invalid template data structure' },
        { status: 400 }
      );
    }

    // 중복 이름 체크 (같은 사용자가 만든 템플릿 중)
    const existingTemplate = await prisma.blockTemplate.findFirst({
      where: {
        name,
        createdBy: user.id
      }
    });

    if (existingTemplate) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Template with this name already exists' },
        { status: 409 }
      );
    }

    const template = await prisma.blockTemplate.create({
      data: {
        name,
        description,
        category,
        thumbnailUrl,
        isPublic,
        createdBy: user.id,
        templateData,
        tags
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json<WebBuilderResponse<typeof template>>({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}