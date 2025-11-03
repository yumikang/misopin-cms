import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  getSectionInfo,
  getFriendlyLabel,
  getElementTypeIcon,
  compareSections,
  type SectionInfo
} from '@/lib/static-pages/section-label-mapper';

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

    // Group elements by section
    const sectionsMap = new Map<string, {
      sectionInfo: SectionInfo;
      elements: Array<{
        id: string;
        type: 'text' | 'html' | 'image' | 'background';
        selector: string;
        content: string;
        label: string;
        friendlyLabel: string;
        icon: string;
        order: number;
      }>;
    }>();

    // Process each element and group by section
    page.editable_elements.forEach(el => {
      const sectionName = el.sectionName || 'default';
      const sectionInfo = getSectionInfo(sectionName);

      if (!sectionsMap.has(sectionName)) {
        sectionsMap.set(sectionName, {
          sectionInfo,
          elements: [],
        });
      }

      const section = sectionsMap.get(sectionName)!;
      section.elements.push({
        id: el.elementId,
        type: el.elementType.toLowerCase() as 'text' | 'html' | 'image' | 'background',
        selector: el.selector,
        content: el.currentValue,
        label: el.label,
        friendlyLabel: getFriendlyLabel(el.label),
        icon: getElementTypeIcon(el.elementType),
        order: el.order,
      });
    });

    // Convert to array and sort sections by order
    const sections = Array.from(sectionsMap.values())
      .map(({ sectionInfo, elements }) => ({
        sectionName: sectionInfo.sectionName,
        displayName: sectionInfo.displayName,
        emoji: sectionInfo.emoji,
        description: sectionInfo.description,
        order: sectionInfo.order,
        elementCount: elements.length,
        elements: elements.sort((a, b) => a.order - b.order),
      }))
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({
      success: true,
      sections,
      pageId: page.id,
      pageTitle: page.title,
      editMode: page.editMode,
      totalSections: sections.length,
      totalElements: page.editable_elements.length,
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
