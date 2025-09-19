import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireWebBuilderPermission } from '@/lib/auth';
import { VersionInfo, WebBuilderResponse } from '@/app/types/webbuilder';

const prisma = new PrismaClient();

// GET: 블록의 버전 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['VIEW_VERSIONS']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('blockId');
    const limit = parseInt(searchParams.get('limit') || '30');

    if (!blockId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Block ID is required' },
        { status: 400 }
      );
    }

    const versions = await prisma.contentVersion.findMany({
      where: { blockId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { version: 'desc' },
      take: limit,
    });

    return NextResponse.json<WebBuilderResponse<typeof versions>>({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST: 특정 버전으로 복원
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['RESTORE_VERSIONS']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    const body = await request.json();
    const { blockId, versionId } = body;

    if (!blockId || !versionId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Block ID and Version ID are required' },
        { status: 400 }
      );
    }

    // 복원할 버전 가져오기
    const version = await prisma.contentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.blockId !== blockId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    // 현재 블록 상태 가져오기
    const currentBlock = await prisma.contentBlock.findUnique({
      where: { id: blockId },
    });

    if (!currentBlock) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Block not found' },
        { status: 404 }
      );
    }

    // 최신 버전 번호 가져오기
    const latestVersion = await prisma.contentVersion.findFirst({
      where: { blockId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // 새 버전 생성 (복원 기록)
    await prisma.contentVersion.create({
      data: {
        blockId,
        version: nextVersion,
        content: version.content,
        styles: version.styles,
        settings: version.settings,
        changedBy: user.id,
        changeNote: `Restored from version ${version.version}`,
      },
    });

    // 블록 업데이트
    const restoredBlock = await prisma.contentBlock.update({
      where: { id: blockId },
      data: {
        content: version.content,
        styles: version.styles,
        settings: version.settings,
      },
    });

    return NextResponse.json<WebBuilderResponse<typeof restoredBlock>>({
      success: true,
      data: restoredBlock,
      message: `Successfully restored to version ${version.version}`,
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}

// DELETE: 오래된 버전 삭제 (30개 이상인 경우)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['DELETE_VERSIONS']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('blockId');
    const keepCount = parseInt(searchParams.get('keep') || '30');

    if (!blockId) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Block ID is required' },
        { status: 400 }
      );
    }

    // 보관할 버전 ID 조회
    const versionsToKeep = await prisma.contentVersion.findMany({
      where: { blockId },
      orderBy: { version: 'desc' },
      take: keepCount,
      select: { id: true },
    });

    const idsToKeep = versionsToKeep.map((v) => v.id);

    // 오래된 버전 삭제
    const deleted = await prisma.contentVersion.deleteMany({
      where: {
        blockId,
        id: {
          notIn: idsToKeep,
        },
      },
    });

    return NextResponse.json<WebBuilderResponse<{ deletedCount: number }>>({
      success: true,
      data: { deletedCount: deleted.count },
      message: `Deleted ${deleted.count} old versions`,
    });
  } catch (error) {
    console.error('Error deleting old versions:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to delete old versions' },
      { status: 500 }
    );
  }
}