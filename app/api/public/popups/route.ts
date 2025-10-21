import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    console.log('Current time for popup query:', now.toISOString());

    // Query active popups
    const allPopups = await prisma.popups.findMany({
      where: {
        isActive: true,
      },
    });

    console.log('All active popups:', allPopups);

    // 날짜 필터링
    const popups = allPopups.filter((popup) => {
      const startDate = new Date(popup.startDate);
      const endDate = new Date(popup.endDate);

      // end_date의 23:59:59로 설정
      endDate.setHours(23, 59, 59, 999);

      const isValid = startDate <= now && now <= endDate;
      console.log(`Popup ${popup.id}: start=${startDate}, end=${endDate}, current=${now}, valid=${isValid}`);
      return isValid;
    });

    console.log('Found popups:', popups);

    // Convert to snake_case format for frontend compatibility
    const formattedPopups = popups.map(popup => ({
      id: popup.id,
      title: popup.title,
      content: popup.content,
      image_url: popup.imageUrl,
      link_url: popup.linkUrl,
      display_type: popup.displayType,
      position: popup.position,
      show_on_pages: popup.showOnPages,
      priority: popup.priority,
      is_active: popup.isActive,
      start_date: popup.startDate.toISOString(),
      end_date: popup.endDate.toISOString(),
      created_at: popup.createdAt.toISOString(),
      updated_at: popup.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedPopups, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching public popups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}