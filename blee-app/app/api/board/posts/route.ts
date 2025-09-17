import { NextResponse } from 'next/server';
import type { BoardPost } from '@/lib/types/database';

// Mock data for testing
const mockPosts: BoardPost[] = [
  {
    id: '1',
    category_id: '1',
    title: '1월 진료 일정 안내',
    content: '안녕하세요. 미소핀의원입니다. 1월 진료 일정을 안내드립니다.',
    excerpt: '1월 진료 일정 안내',
    thumbnail_url: 'https://via.placeholder.com/300x200',
    view_count: 152,
    is_published: true,
    is_featured: true,
    author_id: null,
    published_at: '2025-01-05T00:00:00',
    created_at: '2025-01-05T00:00:00',
    updated_at: '2025-01-05T00:00:00'
  },
  {
    id: '2',
    category_id: '2',
    title: '신년 건강검진 이벤트',
    content: '새해를 맞아 건강검진 할인 이벤트를 진행합니다.',
    excerpt: '건강검진 할인 이벤트',
    thumbnail_url: 'https://via.placeholder.com/300x200',
    view_count: 89,
    is_published: true,
    is_featured: false,
    author_id: null,
    published_at: '2025-01-10T00:00:00',
    created_at: '2025-01-10T00:00:00',
    updated_at: '2025-01-10T00:00:00'
  },
  {
    id: '3',
    category_id: '3',
    title: '겨울철 건강관리 팁',
    content: '겨울철 건강을 지키는 방법을 소개합니다.',
    excerpt: '겨울철 건강관리',
    thumbnail_url: null,
    view_count: 45,
    is_published: true,
    is_featured: false,
    author_id: null,
    published_at: '2025-01-12T00:00:00',
    created_at: '2025-01-12T00:00:00',
    updated_at: '2025-01-12T00:00:00'
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('category_id');
  const isPublished = searchParams.get('is_published');

  let filtered = [...mockPosts];

  if (categoryId) {
    filtered = filtered.filter(post => post.category_id === categoryId);
  }

  if (isPublished !== null) {
    filtered = filtered.filter(post => post.is_published === (isPublished === 'true'));
  }

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newPost: BoardPost = {
    id: Date.now().toString(),
    view_count: 0,
    is_published: true,
    is_featured: false,
    published_at: new Date().toISOString(),
    ...body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mockPosts.push(newPost);
  return NextResponse.json(newPost, { status: 201 });
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Post ID is required' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const index = mockPosts.findIndex(p => p.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    );
  }

  mockPosts[index] = {
    ...mockPosts[index],
    ...body,
    updated_at: new Date().toISOString()
  };

  return NextResponse.json(mockPosts[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Post ID is required' },
      { status: 400 }
    );
  }

  const index = mockPosts.findIndex(p => p.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    );
  }

  mockPosts.splice(index, 1);
  return NextResponse.json({ success: true });
}