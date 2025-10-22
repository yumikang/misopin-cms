import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all popups
export async function GET() {
  try {
    const popups = await prisma.popups.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(popups);
  } catch (error) {
    console.error('Error in GET /api/popups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popups' },
      { status: 500 }
    );
  }
}

// POST new popup
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const popup = await prisma.popups.create({
      data: {
        id: body.id || crypto.randomUUID(),
        title: body.title,
        content: body.content || '',
        imageUrl: body.imageUrl || body.image_url,
        linkUrl: body.linkUrl || body.link_url,
        displayType: body.displayType || body.display_type || 'MODAL',
        position: body.position || 'CENTER',
        showOnPages: body.showOnPages || body.show_on_pages || [],
        priority: body.priority ?? 1,
        isActive: body.isActive ?? body.is_active ?? true,
        startDate: new Date(body.startDate || body.start_date),
        endDate: new Date(body.endDate || body.end_date),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(popup, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/popups:', error);
    return NextResponse.json(
      { error: 'Failed to create popup' },
      { status: 500 }
    );
  }
}

// PUT update popup
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Popup ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const popup = await prisma.popups.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        imageUrl: body.imageUrl || body.image_url,
        linkUrl: body.linkUrl || body.link_url,
        displayType: body.displayType || body.display_type,
        position: body.position,
        showOnPages: body.showOnPages || body.show_on_pages,
        priority: body.priority,
        isActive: body.isActive ?? body.is_active,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });

    return NextResponse.json(popup);
  } catch (error) {
    console.error('Error in PUT /api/popups:', error);
    return NextResponse.json(
      { error: 'Failed to update popup' },
      { status: 500 }
    );
  }
}

// DELETE popup
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Popup ID is required' },
        { status: 400 }
      );
    }

    await prisma.popups.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/popups:', error);
    return NextResponse.json(
      { error: 'Failed to delete popup' },
      { status: 500 }
    );
  }
}