import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.boardPost.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await prisma.boardPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Transform to match frontend expectations
    return NextResponse.json({
      id: post.id,
      board_type: post.boardType,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      author: post.author,
      is_published: post.isPublished,
      is_pinned: post.isPinned,
      view_count: post.viewCount + 1,
      tags: post.tags,
      image_url: post.imageUrl,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
      published_at: post.publishedAt,
    });
  } catch (error) {
    console.error('Error fetching board post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch board post' },
      { status: 500 }
    );
  }
}