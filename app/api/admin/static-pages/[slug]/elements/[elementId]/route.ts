import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { updateElementByAttribute, updateBackgroundImage } from '@/lib/static-pages/attribute-updater';
import { ElementType } from '@prisma/client';

const prisma = new PrismaClient();

interface JwtPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  name: string;
}

/**
 * Verify JWT token and check admin permissions
 */
function verifyAdminToken(request: NextRequest): JwtPayload | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    // Only SUPER_ADMIN and ADMIN can manage static pages
    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'ADMIN') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * PATCH /api/admin/static-pages/[slug]/elements/[elementId]
 *
 * Update a single editable element
 * Requires authentication with ADMIN or SUPER_ADMIN role
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; elementId: string }> }
) {
  // Verify authentication
  const user = verifyAdminToken(request);
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: '권한이 없습니다',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  try {
    const { slug, elementId } = await context.params;
    const body = await request.json();

    // Validate required fields
    if (!body.newValue || body.newValue === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'newValue 필드가 필요합니다',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Fetch page and element data
    const page = await prisma.static_pages.findUnique({
      where: { slug },
      select: {
        id: true,
        filePath: true,
        editMode: true,
        sections: true,
        editable_elements: {
          where: { elementId },
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        {
          success: false,
          error: '페이지를 찾을 수 없습니다',
          code: 'PAGE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (page.editMode !== 'ATTRIBUTE') {
      return NextResponse.json(
        {
          success: false,
          error: '이 페이지는 ATTRIBUTE 모드가 아닙니다',
          code: 'INVALID_EDIT_MODE',
        },
        { status: 400 }
      );
    }

    const element = page.editable_elements[0];
    if (!element) {
      return NextResponse.json(
        {
          success: false,
          error: '요소를 찾을 수 없습니다',
          code: 'ELEMENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Update HTML file
    let updateResult;
    if (element.elementType === ElementType.BACKGROUND) {
      updateResult = await updateBackgroundImage(
        page.filePath,
        elementId,
        body.newValue,
        {
          createBackup: true,
          validateHtml: true,
        }
      );
    } else {
      updateResult = await updateElementByAttribute(
        page.filePath,
        elementId,
        body.newValue,
        element.elementType,
        {
          createBackup: true,
          validateHtml: true,
          sanitizeHtml: true,
        }
      );
    }

    if (!updateResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: updateResult.message,
          code: updateResult.error || 'UPDATE_FAILED',
        },
        { status: 400 }
      );
    }

    // Update database and create version using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update element in database
      const updatedElement = await tx.editable_elements.update({
        where: {
          pageId_elementId: {
            pageId: page.id,
            elementId,
          },
        },
        data: {
          currentValue: body.newValue,
        },
      });

      // Create version record
      const version = await tx.static_page_versions.create({
        data: {
          id: `ver_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          pageId: page.id,
          version: Math.floor(Date.now() / 1000), // Unix timestamp as version
          sections: page.sections as any, // Keep current sections snapshot
          changeType: 'element_update',
          changedData: JSON.stringify({
            elementId,
            oldValue: element.currentValue,
            newValue: body.newValue,
            type: element.elementType,
          }),
          changeNote: `Updated ${element.label}`,
          changedBy: user.id,
        },
      });

      // Update page sync status
      await tx.static_pages.update({
        where: { id: page.id },
        data: {
          lastEdited: new Date(),
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
        },
      });

      return { updatedElement, version };
    });

    return NextResponse.json({
      success: true,
      message: '요소가 성공적으로 업데이트되었습니다',
      data: {
        elementId: result.updatedElement.elementId,
        versionId: result.version.id,
        backupPath: updateResult.backupPath,
      },
    });
  } catch (error) {
    console.error('Error updating element:', error);

    return NextResponse.json(
      {
        success: false,
        error: '요소 업데이트 중 오류가 발생했습니다',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
