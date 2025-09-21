import { NextResponse } from 'next/server';
import type { Popup } from '@/lib/types/database';

// Mock data for testing
const mockPopups: Popup[] = [
  {
    id: '1',
    title: '신년 이벤트 안내',
    content: '2025년 새해를 맞아 특별 이벤트를 진행합니다.',
    image_url: 'https://via.placeholder.com/400x300',
    link_url: 'https://example.com/event',
    display_type: 'MODAL',
    start_date: '2025-01-01T00:00:00',
    end_date: '2025-01-31T23:59:59',
    is_active: true,
    show_today_close: true,
    position: 'CENTER',
    width: 500,
    height: 400,
    created_by: null,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00'
  },
  {
    id: '2',
    title: '진료 시간 변경 안내',
    content: '1월 중 진료 시간이 일시적으로 변경됩니다.',
    image_url: null,
    link_url: null,
    display_type: 'BANNER',
    start_date: '2025-01-10T00:00:00',
    end_date: '2025-01-20T23:59:59',
    is_active: true,
    show_today_close: false,
    position: 'TOP',
    width: null,
    height: 80,
    created_by: null,
    created_at: '2025-01-05T00:00:00',
    updated_at: '2025-01-05T00:00:00'
  },
  {
    id: '3',
    title: '휴진 안내',
    content: '1월 15일 휴진입니다.',
    image_url: null,
    link_url: null,
    display_type: 'LAYER',
    start_date: '2025-01-14T00:00:00',
    end_date: '2025-01-15T23:59:59',
    is_active: false,
    show_today_close: true,
    position: 'RIGHT',
    width: 300,
    height: 200,
    created_by: null,
    created_at: '2025-01-10T00:00:00',
    updated_at: '2025-01-10T00:00:00'
  }
];

export async function GET() {
  return NextResponse.json(mockPopups);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newPopup: Popup = {
    id: Date.now().toString(),
    ...body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mockPopups.push(newPopup);
  return NextResponse.json(newPopup, { status: 201 });
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Popup ID is required' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const index = mockPopups.findIndex(p => p.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Popup not found' },
      { status: 404 }
    );
  }

  mockPopups[index] = {
    ...mockPopups[index],
    ...body,
    updated_at: new Date().toISOString()
  };

  return NextResponse.json(mockPopups[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Popup ID is required' },
      { status: 400 }
    );
  }

  const index = mockPopups.findIndex(p => p.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Popup not found' },
      { status: 404 }
    );
  }

  mockPopups.splice(index, 1);
  return NextResponse.json({ success: true });
}