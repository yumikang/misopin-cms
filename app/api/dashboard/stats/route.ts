import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get yesterday's date range
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Get today's reservations count
    const { count: todayReservations } = await supabaseAdmin
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .gte('preferred_date', today.toISOString())
      .lt('preferred_date', tomorrow.toISOString());

    // Get yesterday's reservations for comparison
    const { count: yesterdayReservations } = await supabaseAdmin
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .gte('preferred_date', yesterday.toISOString())
      .lt('preferred_date', today.toISOString());

    // 2. Get active popups count
    const { count: activePopups } = await supabaseAdmin
      .from('popups')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString());

    // 3. Get recent board posts count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentPosts } = await supabaseAdmin
      .from('board_posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('is_published', true);

    // Get yesterday's posts for comparison
    const { count: yesterdayPosts } = await supabaseAdmin
      .from('board_posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())
      .eq('is_published', true);

    // 4. Get total users count (as visitors for now)
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Calculate changes
    const reservationChange = (todayReservations || 0) - (yesterdayReservations || 0);
    const postChange = (recentPosts || 0) - (yesterdayPosts || 0);

    // Format stats
    const stats = [
      {
        title: "오늘 예약",
        value: todayReservations?.toString() || "0",
        change: reservationChange >= 0 ? `+${reservationChange}` : reservationChange.toString(),
        color: "bg-blue-100 text-blue-600",
        description: "어제 대비"
      },
      {
        title: "활성 팝업",
        value: activePopups?.toString() || "0",
        change: "0", // Popup changes are less frequent
        color: "bg-green-100 text-green-600",
        description: "어제 대비"
      },
      {
        title: "최근 게시물",
        value: recentPosts?.toString() || "0",
        change: postChange >= 0 ? `+${postChange}` : postChange.toString(),
        color: "bg-purple-100 text-purple-600",
        description: "어제 대비"
      },
      {
        title: "총 사용자",
        value: totalUsers?.toString() || "0",
        change: "+0", // User growth tracking would need more logic
        color: "bg-orange-100 text-orange-600",
        description: "전체"
      }
    ];

    // Get additional details for dashboard
    const { data: todayReservationDetails } = await supabaseAdmin
      .from('reservations')
      .select('status')
      .gte('preferred_date', today.toISOString())
      .lt('preferred_date', tomorrow.toISOString());

    let pending = 0, completed = 0;
    if (todayReservationDetails) {
      todayReservationDetails.forEach(res => {
        if (res.status === 'PENDING' || res.status === 'CONFIRMED') {
          pending++;
        } else if (res.status === 'COMPLETED') {
          completed++;
        }
      });
    }

    // Get recent activities
    const { data: recentActivities } = await supabaseAdmin
      .from('board_posts')
      .select('title, created_at, board_type')
      .order('created_at', { ascending: false })
      .limit(5);

    const activities = recentActivities?.map(activity => {
      const type = activity.board_type === 'NOTICE' ? '공지사항' : '이벤트';
      return `${type}이 게시되었습니다: ${activity.title}`;
    }) || [];

    // Get content counts by type
    const { count: noticeCount } = await supabaseAdmin
      .from('board_posts')
      .select('*', { count: 'exact', head: true })
      .eq('board_type', 'NOTICE')
      .eq('is_published', true);

    const { count: eventCount } = await supabaseAdmin
      .from('board_posts')
      .select('*', { count: 'exact', head: true })
      .eq('board_type', 'EVENT')
      .eq('is_published', true);

    return NextResponse.json({
      stats,
      reservationDetails: {
        total: todayReservations || 0,
        pending,
        completed
      },
      recentActivities: activities.slice(0, 3),
      contentStats: {
        notices: noticeCount || 0,
        events: eventCount || 0,
        faqs: 0 // FAQ는 별도 테이블이 필요하면 추가
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}