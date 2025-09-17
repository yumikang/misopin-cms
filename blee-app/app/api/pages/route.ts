import { NextResponse } from 'next/server';
import type { Page } from '@/lib/types/database';

// Mock data for testing
const mockPages: Page[] = [
  {
    id: '1',
    title: '병원 소개',
    slug: 'about',
    content: '<h2>미소핀의원 소개</h2><p>환자 중심의 진료를 실천하는 미소핀의원입니다.</p>',
    meta_title: '미소핀의원 - 병원 소개',
    meta_description: '미소핀의원은 환자 중심의 진료를 실천합니다.',
    meta_keywords: '미소핀의원, 병원소개, 의료진',
    is_published: true,
    template: 'about',
    author_id: null,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00'
  },
  {
    id: '2',
    title: '진료 안내',
    slug: 'services',
    content: '<h2>진료 과목</h2><ul><li>내과</li><li>가정의학과</li><li>건강검진</li></ul>',
    meta_title: '미소핀의원 - 진료 안내',
    meta_description: '미소핀의원의 진료 과목과 시간을 안내합니다.',
    meta_keywords: '진료안내, 진료과목, 진료시간',
    is_published: true,
    template: 'default',
    author_id: null,
    created_at: '2025-01-02T00:00:00',
    updated_at: '2025-01-02T00:00:00'
  },
  {
    id: '3',
    title: '오시는 길',
    slug: 'location',
    content: '<h2>찾아오시는 길</h2><p>서울특별시 강남구...</p>',
    meta_title: '미소핀의원 - 오시는 길',
    meta_description: '미소핀의원 위치 및 교통편 안내',
    meta_keywords: '위치, 오시는길, 주차',
    is_published: true,
    template: 'contact',
    author_id: null,
    created_at: '2025-01-03T00:00:00',
    updated_at: '2025-01-03T00:00:00'
  },
  {
    id: '4',
    title: '이용 약관',
    slug: 'terms',
    content: '<h2>이용약관</h2><p>본 약관은...</p>',
    meta_title: '미소핀의원 - 이용약관',
    meta_description: '미소핀의원 웹사이트 이용약관',
    meta_keywords: '이용약관, 약관',
    is_published: false,
    template: 'default',
    author_id: null,
    created_at: '2025-01-04T00:00:00',
    updated_at: '2025-01-04T00:00:00'
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isPublished = searchParams.get('is_published');
  const slug = searchParams.get('slug');

  let filtered = [...mockPages];

  if (isPublished !== null) {
    filtered = filtered.filter(page => page.is_published === (isPublished === 'true'));
  }

  if (slug) {
    const page = filtered.find(p => p.slug === slug);
    return page ? NextResponse.json(page) : NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newPage: Page = {
    id: Date.now().toString(),
    is_published: true,
    template: 'default',
    ...body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mockPages.push(newPage);
  return NextResponse.json(newPage, { status: 201 });
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Page ID is required' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const index = mockPages.findIndex(p => p.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Page not found' },
      { status: 404 }
    );
  }

  mockPages[index] = {
    ...mockPages[index],
    ...body,
    updated_at: new Date().toISOString()
  };

  return NextResponse.json(mockPages[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Page ID is required' },
      { status: 400 }
    );
  }

  const index = mockPages.findIndex(p => p.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Page not found' },
      { status: 404 }
    );
  }

  mockPages.splice(index, 1);
  return NextResponse.json({ success: true });
}