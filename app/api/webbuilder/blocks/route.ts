import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, BlockType, Prisma } from '@prisma/client';
import { requireWebBuilderPermission } from '@/lib/auth';
import { ContentBlockData, WebBuilderResponse } from '@/app/types/webbuilder';

const prisma = new PrismaClient();

// GET: 모든 블록 조회
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
    const type = searchParams.get('type') as BlockType | null;
    const isGlobal = searchParams.get('global') === 'true';
    const pageId = searchParams.get('pageId');

    const where: { isActive: boolean; type?: BlockType; isGlobal?: boolean } = { isActive: true };

    if (type) where.type = type;
    if (isGlobal !== null) where.isGlobal = isGlobal;

    // 특정 페이지의 블록만 조회
    if (pageId) {
      const pageBlocks = await prisma.page_blocks.findMany({
        where: { pageId },
        include: {
          content_blocks: true,
        },
        orderBy: [
          { sectionName: 'asc' },
          { order: 'asc' },
        ],
      });

      return NextResponse.json<WebBuilderResponse<typeof pageBlocks>>({
        success: true,
        data: pageBlocks,
      });
    }

    // 모든 블록 조회
    const blocks = await prisma.content_blocks.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json<WebBuilderResponse<typeof blocks>>({
      success: true,
      data: blocks,
    });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to fetch blocks' },
      { status: 500 }
    );
  }
}

// POST: 새 블록 생성
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['CREATE_BLOCKS']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    const body: ContentBlockData = await request.json();

    const block = await prisma.content_blocks.create({
      data: {
        id: crypto.randomUUID(),
        name: body.name,
        type: body.type,
        content: body.content as unknown as Prisma.InputJsonValue,
        styles: (body.styles || null) as Prisma.InputJsonValue,
        settings: (body.settings || null) as Prisma.InputJsonValue,
        isGlobal: body.isGlobal || false,
        updatedAt: new Date(),
      },
    });

    // 버전 기록 생성
    await prisma.content_versions.create({
      data: {
        id: crypto.randomUUID(),
        blockId: block.id,
        version: 1,
        content: block.content as Prisma.InputJsonValue,
        styles: block.styles as Prisma.InputJsonValue,
        settings: block.settings as Prisma.InputJsonValue,
        changedBy: user.id,
        changeNote: 'Initial creation',
      },
    });

    return NextResponse.json<WebBuilderResponse<typeof block>>({
      success: true,
      data: block,
      message: 'Block created successfully',
    });
  } catch (error) {
    console.error('Error creating content_blocks:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to create block' },
      { status: 500 }
    );
  }
}

// PATCH: 블록 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['EDIT_BLOCKS']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('id');

    if (!blockId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Block ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 현재 버전 가져오기
    const currentBlock = await prisma.content_blocks.findUnique({
      where: { id: blockId },
    });

    if (!currentBlock) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Block not found' },
        { status: 404 }
      );
    }

    // 최신 버전 번호 가져오기
    const latestVersion = await prisma.content_versions.findFirst({
      where: { blockId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // 버전 기록 저장
    await prisma.content_versions.create({
      data: {
        id: crypto.randomUUID(),
        blockId,
        version: nextVersion,
        content: (body.content || currentBlock.content) as Prisma.InputJsonValue,
        styles: (body.styles || currentBlock.styles) as Prisma.InputJsonValue,
        settings: (body.settings || currentBlock.settings) as Prisma.InputJsonValue,
        changedBy: user.id,
        changeNote: body.changeNote || 'Updated',
      },
    });

    // 블록 업데이트
    const updatedBlock = await prisma.content_blocks.update({
      where: { id: blockId },
      data: {
        name: body.name || undefined,
        content: body.content ? body.content as Prisma.InputJsonValue : undefined,
        styles: body.styles ? body.styles as Prisma.InputJsonValue : undefined,
        settings: body.settings ? body.settings as Prisma.InputJsonValue : undefined,
        isGlobal: body.isGlobal !== undefined ? body.isGlobal : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      },
    });

    return NextResponse.json<WebBuilderResponse<typeof updatedBlock>>({
      success: true,
      data: updatedBlock,
      message: 'Block updated successfully',
    });
  } catch (error) {
    console.error('Error updating content_blocks:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to update block' },
      { status: 500 }
    );
  }
}

// DELETE: 블록 삭제 (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['DELETE_BLOCKS']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('id');

    if (!blockId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Block ID is required' },
        { status: 400 }
      );
    }

    // Soft delete (isActive를 false로 설정)
    await prisma.content_blocks.update({
      where: { id: blockId },
      data: { isActive: false },
    });

    return NextResponse.json<WebBuilderResponse<null>>({
      success: true,
      message: 'Block deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting content_blocks:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to delete block' },
      { status: 500 }
    );
  }
}