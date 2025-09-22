import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/lib/database.types';

type BoardPost = Database['public']['Tables']['board_posts']['Row'];
type BoardPostInsert = Database['public']['Tables']['board_posts']['Insert'];
type BoardPostUpdate = Database['public']['Tables']['board_posts']['Update'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardType = searchParams.get('board_type');
    const isPublished = searchParams.get('is_published');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabaseAdmin
      .from('board_posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filters
    if (boardType) {
      query = query.eq('board_type', boardType);
    }

    if (isPublished !== null) {
      query = query.eq('is_published', isPublished === 'true');
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching board posts:', error);
      throw error;
    }

    return NextResponse.json(posts || []);
  } catch (error) {
    console.error('Error in GET /api/board/posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch board posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Set default values for new post
    const postData: BoardPostInsert = {
      ...body,
      view_count: body.view_count ?? 0,
      is_published: body.is_published ?? false,
      is_pinned: body.is_pinned ?? false,
      published_at: body.is_published ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('board_posts')
      .insert([postData])
      .select();

    const post = data ? data[0] : null;

    if (error) {
      console.error('Error creating board post:', error);
      throw error;
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/board/posts:', error);
    return NextResponse.json(
      { error: 'Failed to create board post' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Update post with new data
    const updateData: BoardPostUpdate = {
      ...body,
      updated_at: new Date().toISOString(),
      // Update published_at if publishing
      ...(body.is_published && !body.published_at ? { published_at: new Date().toISOString() } : {})
    };

    const { data, error } = await supabaseAdmin
      .from('board_posts')
      .update(updateData)
      .eq('id', id)
      .select();

    const post = data ? data[0] : null;

    if (error) {
      console.error('Error updating board post:', error);
      throw error;
    }

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error in PUT /api/board/posts:', error);
    return NextResponse.json(
      { error: 'Failed to update board post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('board_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting board post:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/board/posts:', error);
    return NextResponse.json(
      { error: 'Failed to delete board post' },
      { status: 500 }
    );
  }
}