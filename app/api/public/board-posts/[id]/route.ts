import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the post
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('board_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await supabaseAdmin
      .from('board_posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', id);

    // Return the post with updated view count
    return NextResponse.json({
      ...post,
      view_count: (post.view_count || 0) + 1
    });
  } catch (error) {
    console.error('Error fetching board post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch board post' },
      { status: 500 }
    );
  }
}