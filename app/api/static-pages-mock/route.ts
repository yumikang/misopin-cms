import { NextResponse } from 'next/server';

// 더미 데이터
const mockPages = [
  {
    id: 'mock-1',
    slug: 'index',
    title: '메인 페이지',
    filePath: 'index.html',
    isPublished: true,
    lastEdited: new Date().toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-2',
    slug: 'about',
    title: '병원 소개',
    filePath: 'about.html',
    isPublished: true,
    lastEdited: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-3',
    slug: 'botox',
    title: '보톡스 시술',
    filePath: 'contents/treatments/botox.html',
    isPublished: true,
    lastEdited: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-4',
    slug: 'filler',
    title: '필러 시술',
    filePath: 'contents/treatments/filler.html',
    isPublished: false,
    lastEdited: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-5',
    slug: 'lifting',
    title: '리프팅 시술',
    filePath: 'contents/treatments/lifting.html',
    isPublished: true,
    lastEdited: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    pages: mockPages,
  });
}
