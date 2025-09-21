import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const boardSlug = searchParams.get('board');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 게시글 조회 조건 설정
    const whereCondition: any = {
      isPublished: true,
    };

    if (boardSlug) {
      const board = await db.board.findUnique({
        where: { slug: boardSlug },
      });

      if (board) {
        whereCondition.boardId = board.id;
      }
    }

    // 게시글 조회
    const posts = await db.boardPost.findMany({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        thumbnailUrl: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        board: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // 전체 게시글 수
    const total = await db.boardPost.count({
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