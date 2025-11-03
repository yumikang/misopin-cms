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
  console.log('=== 🔍 PATCH /api/admin/static-pages/[slug]/elements ===');

  // Verify authentication
  const user = verifyAdminToken(request);
  console.log('✅ Auth verified:', user ? `${user.email} (${user.role})` : '❌ FAILED');

  if (!user) {
    console.log('❌ 401: No authentication');
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
    console.log('📄 Slug:', slug);

    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    // Validate request body
    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      console.log('❌ 400: updates 배열이 없거나 비어있음');
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
    console.log(`✅ Updates count: ${updates.length}`);

    // Validate each update request
    for (const update of updates) {
      if (!update.elementId || update.newValue === undefined || update.newValue === null || !update.elementType) {
        console.log('❌ 400: 업데이트 항목 검증 실패:', update);
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
    console.log('✅ All updates validated');

    // Fetch page data
    console.log('🔍 Querying database for page...');
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
      console.log('❌ 404: Page not found for slug:', slug);
      return NextResponse.json(
        {
          success: false,
          error: '페이지를 찾을 수 없습니다',
          code: 'PAGE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    console.log('✅ Page found:', {
      id: page.id,
      filePath: page.filePath,
      editMode: page.editMode,
      elementsFound: page.editable_elements.length
    });

    if (page.editMode !== 'ATTRIBUTE') {
      console.log(`❌ 400: Invalid edit mode: ${page.editMode} (expected ATTRIBUTE)`);
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
    const foundIds = page.editable_elements.map(el => el.elementId);
    const requestedIds = updates.map(u => u.elementId);
    console.log('🔍 Element ID check:');
    console.log('  Requested:', requestedIds);
    console.log('  Found:', foundIds);

    if (page.editable_elements.length !== updates.length) {
      const missingIds = requestedIds.filter(id => !foundIds.includes(id));
      console.log(`❌ 404: Missing elements: ${missingIds.join(', ')}`);

      return NextResponse.json(
        {
          success: false,
          error: `다음 요소를 찾을 수 없습니다: ${missingIds.join(', ')}`,
          code: 'ELEMENTS_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    console.log('✅ All elements verified');

    // Update HTML file with all changes
    console.log('📝 Updating HTML file...');
    const updateResult = await updateMultipleElements(
      page.filePath,
      updates,
      {
        createBackup: true,
        validateHtml: true,
        sanitizeHtml: true,
      }
    );

    console.log('📝 HTML update result:', {
      success: updateResult.success,
      message: updateResult.message,
      error: updateResult.error,
      backupPath: updateResult.backupPath
    });

    if (!updateResult.success) {
      console.log(`❌ 400: HTML update failed: ${updateResult.message}`);
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
    console.log('💾 Starting database transaction...');
    const result = await prisma.$transaction(async (tx) => {
      // Update all elements in database
      console.log('  📝 Updating elements in database...');
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
      console.log(`  ✅ Updated ${updatedElements.length} elements in DB`);

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

      console.log('  📦 Creating version record...');
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
      console.log('  ✅ Version created:', version.id);

      // Update page sync status
      console.log('  🔄 Updating page sync status...');
      await tx.static_pages.update({
        where: { id: page.id },
        data: {
          lastEdited: new Date(),
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
        },
      });
      console.log('  ✅ Sync status updated');

      return { updatedElements, version };
    });

    console.log('✅ Transaction completed successfully');

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
    console.error('❌ Error updating elements:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      {
        success: false,
        error: '요소 업데이트 중 오류가 발생했습니다',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
