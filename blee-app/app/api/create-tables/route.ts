import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    // Try a simpler approach - just insert a test record to see the actual error
    const testPopup = {
      title: 'Test Popup',
      content: 'Test Content',
      display_type: 'MODAL',
      is_active: false,
      show_today_close: true,
      position: 'CENTER'
    };

    // Try to insert and then delete immediately
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('popups')
      .insert([testPopup])
      .select()
      .single();

    if (insertData) {
      // Delete the test record
      await supabaseAdmin
        .from('popups')
        .delete()
        .eq('id', insertData.id);
    }

    if (insertError) {
      return NextResponse.json(
        {
          error: 'Failed to create popups table',
          details: insertError.message,
          hint: 'Please run the SQL script in /scripts/create-popups-table.sql directly in Supabase SQL Editor'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Popups table ready',
      testInsert: insertData ? 'Success' : 'Failed'
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Please create the popups table manually in Supabase SQL Editor'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}