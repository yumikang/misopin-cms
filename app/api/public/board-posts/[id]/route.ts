import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.boardPost.findUnique({
      where: { id: params.id },
      include: {
        attachments: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await prisma.boardPost.update({
      where: { id: params.id },
      data: { view_count: { increment: 1 } },
    });

    return NextResponse.json({
      ...post,
      view_count: post.view_count + 1,
    });
  } catch (error) {
    console.error('Error fetching board post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch board post' },
      { status: 500 }
    );
  }
}