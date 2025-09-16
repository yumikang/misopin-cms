import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BoardType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as BoardType;
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    const where: any = {
      isPublished: true,
    };

    if (type && Object.values(BoardType).includes(type)) {
      where.boardType = type;
    }

    const [posts, total] = await Promise.all([
      db.boardPost.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          boardType: true,
          author: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      db.boardPost.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Public Board Posts API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}