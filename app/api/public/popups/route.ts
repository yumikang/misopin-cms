import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Popup {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link_url?: string;
  display_type: string;
  position: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  priority?: number;
  created_at?: string;
  updated_at?: string;
}

export async function GET() {
  try {
    const now = new Date().toISOString();
    console.log('Current time for popup query:', now);

    // Query active popups - 일단 활성화된 모든 팝업 가져오기 (디버깅용)
    const { data: allPopups, error: fetchError } = await supabaseAdmin
      .from('popups')
      .select('*')
      .eq('is_active', true)
      .returns<Popup[]>();

    console.log('All active popups:', allPopups);

    // 날짜 필터링
    const popups = allPopups?.filter((popup: Popup) => {
      const startDate = new Date(popup.start_date);
      const endDate = new Date(popup.end_date);
      const currentDate = new Date(now);

      // end_date의 23:59:59로 설정
      endDate.setHours(23, 59, 59, 999);

      const isValid = startDate <= currentDate && currentDate <= endDate;
      console.log(`Popup ${popup.id}: start=${startDate}, end=${endDate}, current=${currentDate}, valid=${isValid}`);
      return isValid;
    }) || [];

    const error = fetchError;

    console.log('Found popups:', popups);

    if (error) {
      throw error;
    }

    return NextResponse.json(popups || [], {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching public popups:', error);
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