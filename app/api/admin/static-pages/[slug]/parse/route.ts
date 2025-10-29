import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import * as fs from 'fs/promises';
import { parseEditableAttributes } from '@/lib/static-pages/attribute-parser';

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
 * POST /api/admin/static-pages/[slug]/parse
 *
 * Parse HTML file and sync editable elements to database
 * Requires authentication with ADMIN or SUPER_ADMIN role
 */
export async function POST(
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

    // Fetch page data
    const page = await prisma.static_pages.findUnique({
      where: { slug },
      select: {
        id: true,
        filePath: true,
        editMode: true,
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

    // Check if page is in ATTRIBUTE mode
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

    // Read HTML file
    let html: string;
    try {
      html = await fs.readFile(page.filePath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'HTML 파일을 읽을 수 없습니다',
          code: 'FILE_READ_ERROR',
        },
        { status: 500 }
      );
    }

    // Parse editable attributes
    const parseResult = parseEditableAttributes(html, {
      includeBackgrounds: true,
      includeImages: true,
      validateAttributes: true,
      strictMode: false,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error || 'HTML 파싱에 실패했습니다',
          code: 'PARSE_ERROR',
        },
        { status: 400 }
      );
    }

    // Sync to database using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing elements for this page
      await tx.editable_elements.deleteMany({
        where: { pageId: page.id },
      });

      // Insert new elements
      const created = await tx.editable_elements.createMany({
        data: parseResult.elements.map(el => ({
          pageId: page.id,
          elementId: el.id,
          elementType: el.type,
          selector: el.selector,
          label: el.label,
          currentValue: el.currentValue,
          sectionName: el.sectionName,
          order: el.order,
        })),
      });

      // Update page metadata
      await tx.static_pages.update({
        where: { id: page.id },
        data: {
          lastParsedAt: new Date(),
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      message: `${result.count}개의 편집 가능한 요소가 동기화되었습니다`,
      data: {
        elementsCount: result.count,
        warnings: parseResult.warnings,
      },
    });
  } catch (error) {
    console.error('Error parsing HTML:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'HTML 파싱 중 오류가 발생했습니다',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
