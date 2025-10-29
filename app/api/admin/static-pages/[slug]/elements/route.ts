import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { updateMultipleElements } from '@/lib/static-pages/attribute-updater';
import type { ElementUpdateRequest } from '@/lib/static-pages/attribute-types';

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
 * PATCH /api/admin/static-pages/[slug]/elements
 *
 * Update multiple editable elements at once
 * Requires authentication with ADMIN or SUPER_ADMIN role
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
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
    const { slug } = await context.params;
    const body = await request.json();

    // Validate request body
    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'updates 배열이 필요합니다',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const updates: ElementUpdateRequest[] = body.updates;

    // Validate each update request
    for (const update of updates) {
      if (!update.elementId || !update.newValue || !update.elementType) {
        return NextResponse.json(
          {
            success: false,
            error: '각 업데이트는 elementId, newValue, elementType을 포함해야 합니다',
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
    }

    // Fetch page data
    const page = await prisma.static_pages.findUnique({
      where: { slug },
      select: {
        id: true,
        filePath: true,
        sections: true,
        editMode: true,
        editable_elements: {
          where: {
            elementId: {
              in: updates.map(u => u.elementId),
            },
          },
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

    // Verify all elements exist
    if (page.editable_elements.length !== updates.length) {
      const foundIds = page.editable_elements.map(el => el.elementId);
      const requestedIds = updates.map(u => u.elementId);
      const missingIds = requestedIds.filter(id => !foundIds.includes(id));

      return NextResponse.json(
        {
          success: false,
          error: `다음 요소를 찾을 수 없습니다: ${missingIds.join(', ')}`,
          code: 'ELEMENTS_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Update HTML file with all changes
    const updateResult = await updateMultipleElements(
      page.filePath,
      updates,
      {
        createBackup: true,
        validateHtml: true,
        sanitizeHtml: true,
      }
    );

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
      // Update all elements in database
      const updatePromises = updates.map(update =>
        tx.editable_elements.update({
          where: {
            pageId_elementId: {
              pageId: page.id,
              elementId: update.elementId,
            },
          },
          data: {
            currentValue: update.newValue,
          },
        })
      );

      const updatedElements = await Promise.all(updatePromises);

      // Create version record
      const changeSnapshot = updates.map(update => {
        const oldElement = page.editable_elements.find(
          el => el.elementId === update.elementId
        );
        return {
          elementId: update.elementId,
          oldValue: oldElement?.currentValue,
          newValue: update.newValue,
          type: update.elementType,
        };
      });

      const version = await tx.static_page_versions.create({
        data: {
          id: `ver_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          pageId: page.id,
          version: Math.floor(Date.now() / 1000), // Unix timestamp as version
          sections: page.sections as any, // Keep current sections snapshot
          changeType: 'bulk_update',
          changedData: JSON.stringify(changeSnapshot),
          changeNote: `Bulk update: ${updates.length} elements`,
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

      return { updatedElements, version };
    });

    return NextResponse.json({
      success: true,
      message: `${updates.length}개의 요소가 성공적으로 업데이트되었습니다`,
      data: {
        updatedCount: result.updatedElements.length,
        versionId: result.version.id,
        backupPath: updateResult.backupPath,
      },
    });
  } catch (error) {
    console.error('Error updating elements:', error);

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
