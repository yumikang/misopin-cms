import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dashboardService } from '@/services/dashboard.service';
import { UserRole } from '@prisma/client';

/**
 * GET /api/dashboard/stats
 * 대시보드 통계 데이터 조회
 * 권한: ADMIN, SUPER_ADMIN
 */
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 권한 확인 (ADMIN 이상만 접근 가능)
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: '대시보드 접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // 타입에 따라 다른 데이터 반환
    if (type === 'chart') {
      // 차트 데이터 요청
      const chartData = await dashboardService.getChartData();
      return NextResponse.json(chartData);
    }

    // 기본: 전체 대시보드 통계
    const stats = await dashboardService.getDashboardStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: '대시보드 통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/stats/refresh
 * 대시보드 캐시 초기화
 * 권한: SUPER_ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 권한 확인 (SUPER_ADMIN만 캐시 초기화 가능)
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '캐시 초기화 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 캐시 초기화
    dashboardService.clearCache();

    return NextResponse.json({
      message: '대시보드 캐시가 초기화되었습니다.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard cache refresh error:', error);
    return NextResponse.json(
      { error: '캐시 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}