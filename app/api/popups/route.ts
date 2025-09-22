import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/lib/database.types';

type Popup = Database['public']['Tables']['popups']['Row'];
type PopupInsert = Database['public']['Tables']['popups']['Insert'];
type PopupUpdate = Database['public']['Tables']['popups']['Update'];

// GET all popups
export async function GET() {
  try {
    const { data: popups, error } = await supabaseAdmin
      .from('popups')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<Popup[]>();

    if (error) {
      console.error('Error fetching popups:', error);
      throw error;
    }

    return NextResponse.json(popups || []);
  } catch (error) {
    console.error('Error in GET /api/popups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popups' },
      { status: 500 }
    );
  }
}

// POST new popup
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Set default values for new popup
    const popupData: PopupInsert = {
      ...body,
      is_active: body.is_active ?? true,
      priority: body.priority ?? 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('popups')
      .insert([popupData])
      .select();

    const popup = data ? data[0] : null;

    if (error) {
      console.error('Error creating popup:', error);
      throw error;
    }

    return NextResponse.json(popup, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/popups:', error);
    return NextResponse.json(
      { error: 'Failed to create popup' },
      { status: 500 }
    );
  }
}

// PUT update popup
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Popup ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Update popup with new data
    const updateData: PopupUpdate = {
      ...body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('popups')
      .update(updateData)
      .eq('id', id)
      .select();

    const popup = data ? data[0] : null;

    if (error) {
      console.error('Error updating popup:', error);
      throw error;
    }

    if (!popup) {
      return NextResponse.json(
        { error: 'Popup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(popup);
  } catch (error) {
    console.error('Error in PUT /api/popups:', error);
    return NextResponse.json(
      { error: 'Failed to update popup' },
      { status: 500 }
    );
  }
}

// DELETE popup
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Popup ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('popups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting popup:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/popups:', error);
    return NextResponse.json(
      { error: 'Failed to delete popup' },
      { status: 500 }
    );
  }
}