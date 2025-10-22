import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireWebBuilderPermission } from '@/lib/auth';
import { WebBuilderResponse } from '@/app/types/webbuilder';

const prisma = new PrismaClient();

// GET: 개별 템플릿 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['VIEW_WEBBUILDER']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { id } = await params;

    const template = await prisma.block_templates.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // 접근 권한 체크 (공개 템플릿이거나 본인이 만든 템플릿)
    if (!template.isPublic && template.createdBy !== user.id) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json<WebBuilderResponse<typeof template>>({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT: 템플릿 수정 (소유자 또는 ADMIN 이상만 가능)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_TEMPLATES']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { id } = await params;
    const body = await request.json();

    const existingTemplate = await prisma.block_templates.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // 권한 체크: 소유자이거나 ADMIN 이상
    const isOwner = existingTemplate.createdBy === user.id;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const {
      name,
      description,
      category,
      thumbnailUrl,
      isPublic,
      templateData,
      tags
    } = body;

    // 이름 중복 체크 (다른 템플릿과 중복되지 않는지)
    if (name && name !== existingTemplate.name) {
      const duplicateTemplate = await prisma.block_templates.findFirst({
        where: {
          name,
          createdBy: existingTemplate.createdBy,
          id: { not: id }
        }
      });

      if (duplicateTemplate) {
        return NextResponse.json<WebBuilderResponse<null>>(
          { success: false, error: 'Template with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updatedTemplate = await prisma.block_templates.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(isPublic !== undefined && { isPublic }),
        ...(templateData && { templateData }),
        ...(tags && { tags })
      }
    });

    return NextResponse.json<WebBuilderResponse<typeof updatedTemplate>>({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE: 템플릿 삭제 (소유자 또는 SUPER_ADMIN만 가능)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['MANAGE_TEMPLATES']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { id } = await params;

    const existingTemplate = await prisma.block_templates.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // 권한 체크: 소유자이거나 SUPER_ADMIN
    const isOwner = existingTemplate.createdBy === user.id;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Permission denied. Only template owner or Super Admin can delete templates' },
        { status: 403 }
      );
    }

    await prisma.block_templates.delete({
      where: { id }
    });

    return NextResponse.json<WebBuilderResponse<null>>({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

// POST: 템플릿 사용 (사용 횟수 증가)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireWebBuilderPermission(request, ['CREATE_BLOCKS']);
    if ('error' in authResult) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { id } = await params;

    const template = await prisma.block_templates.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // 접근 권한 체크 (공개 템플릿이거나 본인이 만든 템플릿)
    if (!template.isPublic && template.createdBy !== user.id) {
      return NextResponse.json<WebBuilderResponse<null>>(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 사용 횟수 증가
    const updatedTemplate = await prisma.block_templates.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json<WebBuilderResponse<typeof updatedTemplate>>({
      success: true,
      data: updatedTemplate,
      message: 'Template usage recorded'
    });
  } catch (error) {
    console.error('Error recording template usage:', error);
    return NextResponse.json<WebBuilderResponse<null>>(
      { success: false, error: 'Failed to record template usage' },
      { status: 500 }
    );
  }
}