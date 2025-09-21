import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const boardType = searchParams.get('type') as 'NOTICE' | 'EVENT' | null;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 게시글 조회 조건 설정
    interface WhereCondition {
      isPublished: boolean;
      boardType?: 'NOTICE' | 'EVENT';
    }

    const whereCondition: WhereCondition = {
      isPublished: true,
    };

    if (boardType && (boardType === 'NOTICE' || boardType === 'EVENT')) {
      whereCondition.boardType = boardType;
    }

    // 게시글 조회
    const posts = await prisma.boardPost.findMany({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        imageUrl: true,
        viewCount: true,
        boardType: true,
        author: true,
        isPinned: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    // 전체 게시글 수
    const total = await prisma.boardPost.count({
      where: whereCondition,
    });

    return NextResponse.json(
      {
        posts,
        total,
        limit,
        offset,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching public board posts:', error);
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