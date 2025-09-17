import { NextResponse } from 'next/server';
import type { BoardCategory } from '@/lib/types/database';

// Mock data for testing
const mockCategories: BoardCategory[] = [
  {
    id: '1',
    name: '공지사항',
    slug: 'notice',
    description: '병원 공지사항',
    display_order: 1,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00'
  },
  {
    id: '2',
    name: '이벤트',
    slug: 'event',
    description: '진행중인 이벤트',
    display_order: 2,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00'
  },
  {
    id: '3',
    name: '건강정보',
    slug: 'health',
    description: '건강 관련 정보',
    display_order: 3,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00'
  },
  {
    id: '4',
    name: 'FAQ',
    slug: 'faq',
    description: '자주 묻는 질문',
    display_order: 4,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00'
  }
];

export async function GET() {
  return NextResponse.json(mockCategories);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newCategory: BoardCategory = {
    id: Date.now().toString(),
    ...body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mockCategories.push(newCategory);
  return NextResponse.json(newCategory, { status: 201 });
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Category ID is required' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const index = mockCategories.findIndex(c => c.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Category not found' },
      { status: 404 }
    );
  }

  mockCategories[index] = {
    ...mockCategories[index],
    ...body,
    updated_at: new Date().toISOString()
  };

  return NextResponse.json(mockCategories[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Category ID is required' },
      { status: 400 }
    );
  }

  const index = mockCategories.findIndex(c => c.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Category not found' },
      { status: 404 }
    );
  }

  mockCategories.splice(index, 1);
  return NextResponse.json({ success: true });
}