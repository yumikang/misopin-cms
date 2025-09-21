import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { requireWebBuilderPermission } from '@/lib/auth';
import { PageBlockArrangement, WebBuilderResponse } from '@/app/types/webbuilder';

const prisma = new PrismaClient();

// GET: 페이지의 블록 배치 조회
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
    const sectionName = searchParams.get('section');

    if (!pageId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    const where: { pageId: string; sectionName?: string } = { pageId };
    if (sectionName) where.sectionName = sectionName;

    const pageBlocks = await prisma.pageBlock.findMany({
      where,
      include: {
        block: true,
      },
      orderBy: [
        { sectionName: 'asc' },
        { order: 'asc' },
      ],
    });

    // 섹션별로 그룹화
    const sections = pageBlocks.reduce((acc: Record<string, typeof pageBlocks>, pb) => {
      if (!acc[pb.sectionName]) {
        acc[pb.sectionName] = [];
      }
      acc[pb.sectionName].push(pb);
      return acc;
    }, {});

    return NextResponse.json<WebBuilderResponse<typeof sections>>({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Error fetching page blocks:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to fetch page blocks' },
      { status: 500 }
    );
  }
}

// POST: 페이지에 블록 추가
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_PAGES']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { pageId, blockId, sectionName, order, customStyles } = body;

    if (!pageId || !blockId || !sectionName) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 해당 섹션의 최대 order 값 조회
    const maxOrder = await prisma.pageBlock.findFirst({
      where: { pageId, sectionName },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = order !== undefined ? order : (maxOrder?.order || 0) + 1;

    // 새 PageBlock 생성
    const pageBlock = await prisma.pageBlock.create({
      data: {
        pageId,
        blockId,
        sectionName,
        order: newOrder,
        customStyles: (customStyles || null) as Prisma.InputJsonValue,
      },
      include: {
        block: true,
      },
    });

    return NextResponse.json<WebBuilderResponse<typeof pageBlock>>({
      success: true,
      data: pageBlock,
      message: 'Block added to page successfully',
    });
  } catch (error) {
    console.error('Error adding block to page:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to add block to page' },
      { status: 500 }
    );
  }
}

// PATCH: 페이지 블록 순서/스타일 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_PAGES']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { pageBlockId, order, customStyles, isVisible } = body;

    if (!pageBlockId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'PageBlock ID is required' },
        { status: 400 }
      );
    }

    const updateData: { order?: number; customStyles?: typeof customStyles; isVisible?: boolean } = {};
    if (order !== undefined) updateData.order = order;
    if (customStyles !== undefined) updateData.customStyles = customStyles;
    if (isVisible !== undefined) updateData.isVisible = isVisible;

    const updatedPageBlock = await prisma.pageBlock.update({
      where: { id: pageBlockId },
      data: updateData,
      include: {
        block: true,
      },
    });

    return NextResponse.json<WebBuilderResponse<typeof updatedPageBlock>>({
      success: true,
      data: updatedPageBlock,
      message: 'Page block updated successfully',
    });
  } catch (error) {
    console.error('Error updating page block:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to update page block' },
      { status: 500 }
    );
  }
}

// PUT: 섹션 내 블록 순서 재배치
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_PAGES']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body: PageBlockArrangement = await request.json();
    const { pageId, sectionName, blocks } = body;

    if (!pageId || !sectionName || !blocks || !Array.isArray(blocks)) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 일괄 업데이트
    await prisma.$transaction(
      blocks.map((block) =>
        prisma.pageBlock.updateMany({
          where: {
            pageId,
            sectionName,
            blockId: block.blockId,
          },
          data: {
            order: block.order,
            customStyles: block.customStyles ? block.customStyles as Prisma.InputJsonValue : undefined,
          },
        })
      )
    );

    return NextResponse.json<WebBuilderResponse<null>>({
      success: true,
      message: 'Block order updated successfully',
    });
  } catch (error) {
    console.error('Error updating block order:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to update block order' },
      { status: 500 }
    );
  }
}

// DELETE: 페이지에서 블록 제거
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_PAGES']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageBlockId = searchParams.get('id');

    if (!pageBlockId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'PageBlock ID is required' },
        { status: 400 }
      );
    }

    await prisma.pageBlock.delete({
      where: { id: pageBlockId },
    });

    return NextResponse.json<WebBuilderResponse<null>>({
      success: true,
      message: 'Block removed from page successfully',
    });
  } catch (error) {
    console.error('Error removing block from page:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to remove block from page' },
      { status: 500 }
    );
  }
}