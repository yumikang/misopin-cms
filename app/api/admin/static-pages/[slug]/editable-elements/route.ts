import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { groupBySection } from '@/lib/static-pages/attribute-parser';
import type { SectionGroup } from '@/lib/static-pages/attribute-types';

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
 * GET /api/admin/static-pages/[slug]/editable-elements
 *
 * Get editable elements for a specific page, grouped by section
 * Requires authentication with ADMIN or SUPER_ADMIN role
 */
export async function GET(
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
        title: true,
        editMode: true,
        lastParsedAt: true,
        editable_elements: {
          orderBy: [
            { sectionName: 'asc' },
            { order: 'asc' },
          ],
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

    // Transform database records to EditableElement format
    const elements = page.editable_elements.map(el => ({
      id: el.elementId,
      type: el.elementType,
      selector: el.selector,
      currentValue: el.currentValue,
      label: el.label,
      sectionName: el.sectionName || 'default',
      order: el.order,
    }));

    // Group elements by section
    const sectionGroups = groupBySection(elements);

    // Convert to SectionGroup format with order
    const sections: Record<string, SectionGroup> = {};
    let sectionOrder = 0;

    for (const [sectionName, sectionElements] of Object.entries(sectionGroups)) {
      sections[sectionName] = {
        name: sectionName,
        order: sectionOrder++,
        elements: sectionElements,
      };
    }

    // Flatten section groups into array for frontend compatibility
    const editableElements = Object.values(sections).flatMap(section => section.elements);

    return NextResponse.json({
      success: true,
      editableElements,
      pageId: page.id,
      pageTitle: page.title,
      editMode: page.editMode,
      totalElements: elements.length,
      lastParsedAt: page.lastParsedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error fetching editable elements:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch editable elements',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
