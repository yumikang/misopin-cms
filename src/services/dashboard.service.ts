import { db } from '@/lib/db';
import { ReservationStatus, BoardType } from '@prisma/client';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns';
import type { DashboardStats, ChartData } from '@/types/dashboard';


export interface ChartData {
  reservationTrend: Array<{
    date: string;
    count: number;
  }>;
  postsByCategory: Array<{
    category: string;
    count: number;
  }>;
  weeklyReservationStatus: Array<{
    status: string;
    count: number;
  }>;
}

// 캐시 저장소
interface CacheEntry {
  data: DashboardStats | ChartData | Record<string, unknown>;
  timestamp: number;
}

class DashboardService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5분

  /**
   * 캐시 확인 및 가져오기
   */
  private getCached(key: string): DashboardStats | ChartData | Record<string, unknown> | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * 캐시 저장
   */
  private setCache(key: string, data: DashboardStats | ChartData | Record<string, unknown>): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 전체 대시보드 통계 가져오기
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'dashboard-stats';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // 병렬 실행으로 성능 최적화
    const [
      reservationStats,
      postStats,
      popupStats,
      fileStats,
      userStats,
      recentActivities,
    ] = await Promise.all([
      this.getReservationStats(todayStart, todayEnd, weekStart, weekEnd, monthStart, monthEnd),
      this.getPostStats(),
      this.getPopupStats(now),
      this.getFileStats(),
      this.getUserStats(todayStart, todayEnd),
      this.getRecentActivities(),
    ]);

    const stats: DashboardStats = {
      reservations: reservationStats,
      posts: postStats,
      popups: popupStats,
      files: fileStats,
      users: userStats,
      activities: {
        recent: recentActivities,
      },
    };

    this.setCache(cacheKey, stats);
    return stats;
  }

  /**
   * 예약 통계
   */
  private async getReservationStats(
    todayStart: Date,
    todayEnd: Date,
    weekStart: Date,
    weekEnd: Date,
    monthStart: Date,
    monthEnd: Date
  ) {
    const [
      todayCount,
      weekCount,
      monthCount,
      statusCounts,
      recentReservations,
    ] = await Promise.all([
      // 오늘 예약
      db.reservation.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      // 이번 주 예약
      db.reservation.count({
        where: {
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),
      // 이번 달 예약
      db.reservation.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),
      // 상태별 카운트
      db.reservation.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
      // 최근 예약 5건
      db.reservation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          patientName: true,
          preferredDate: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // 상태별 카운트 정리
    const statusMap: Record<ReservationStatus, string> = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      statusMap[item.status.toLowerCase()] = item._count.status;
    });

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      pending: statusMap.pending,
      confirmed: statusMap.confirmed,
      completed: statusMap.completed,
      cancelled: statusMap.cancelled,
      recentList: recentReservations,
    };
  }

  /**
   * 게시글 통계
   */
  private async getPostStats() {
    const [
      totalCount,
      publishedCount,
      draftCount,
      categoryCounts,
      recentPosts,
    ] = await Promise.all([
      // 전체 게시글
      db.boardPost.count(),
      // 발행된 게시글
      db.boardPost.count({
        where: { isPublished: true },
      }),
      // 임시저장 게시글
      db.boardPost.count({
        where: { isPublished: false },
      }),
      // 카테고리별 카운트
      db.boardPost.groupBy({
        by: ['boardType'],
        _count: {
          boardType: true,
        },
      }),
      // 최근 게시글 5건
      db.boardPost.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          boardType: true,
          isPublished: true,
          viewCount: true,
          createdAt: true,
        },
      }),
    ]);

    // 카테고리별 카운트 정리
    const categoryMap: Record<BoardType, string> = {
      notice: 0,
      event: 0,
    };

    categoryCounts.forEach((item) => {
      categoryMap[item.boardType.toLowerCase()] = item._count.boardType;
    });

    return {
      total: totalCount,
      published: publishedCount,
      draft: draftCount,
      notice: categoryMap.notice,
      event: categoryMap.event,
      recentList: recentPosts,
    };
  }

  /**
   * 팝업 통계
   */
  private async getPopupStats(now: Date) {
    const [
      totalCount,
      activeCount,
      scheduledCount,
      expiredCount,
    ] = await Promise.all([
      // 전체 팝업
      db.popup.count(),
      // 활성화된 팝업
      db.popup.count({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      // 예정된 팝업
      db.popup.count({
        where: {
          startDate: { gt: now },
        },
      }),
      // 만료된 팝업
      db.popup.count({
        where: {
          endDate: { lt: now },
        },
      }),
    ]);

    return {
      total: totalCount,
      active: activeCount,
      scheduled: scheduledCount,
      expired: expiredCount,
    };
  }

  /**
   * 파일 통계
   */
  private async getFileStats() {
    const [
      totalCount,
      totalSize,
      imageCount,
      documentCount,
      recentUploads,
    ] = await Promise.all([
      // 전체 파일 수
      db.fileUpload.count(),
      // 전체 파일 크기
      db.fileUpload.aggregate({
        _sum: {
          size: true,
        },
      }),
      // 이미지 파일 수
      db.fileUpload.count({
        where: {
          category: 'images',
        },
      }),
      // 문서 파일 수
      db.fileUpload.count({
        where: {
          category: 'documents',
        },
      }),
      // 최근 업로드 5건
      db.fileUpload.findMany({
        take: 5,
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          size: true,
          category: true,
          uploadedAt: true,
          uploadedBy: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      total: totalCount,
      totalSize: totalSize._sum.size || 0,
      images: imageCount,
      documents: documentCount,
      recentUploads,
    };
  }

  /**
   * 사용자 통계
   */
  private async getUserStats(todayStart: Date, todayEnd: Date) {
    const [
      totalCount,
      activeTodayCount,
      adminCount,
      editorCount,
    ] = await Promise.all([
      // 전체 사용자
      db.user.count(),
      // 오늘 활동한 사용자
      db.user.count({
        where: {
          lastLogin: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      // ADMIN + SUPER_ADMIN 수
      db.user.count({
        where: {
          role: {
            in: ['ADMIN', 'SUPER_ADMIN'],
          },
        },
      }),
      // EDITOR 수
      db.user.count({
        where: {
          role: 'EDITOR',
        },
      }),
    ]);

    return {
      total: totalCount,
      activeToday: activeTodayCount,
      admins: adminCount,
      editors: editorCount,
    };
  }

  /**
   * 최근 활동 로그
   */
  private async getRecentActivities() {
    // 여러 테이블에서 최근 활동을 수집
    const [
      recentReservations,
      recentPosts,
      recentUploads,
    ] = await Promise.all([
      db.reservation.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          patientName: true,
          createdAt: true,
        },
      }),
      db.boardPost.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          author: true,
          createdAt: true,
        },
      }),
      db.fileUpload.findMany({
        take: 3,
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          uploadedAt: true,
          uploadedBy: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    // 활동 로그 조합 및 정렬
    const activities: Array<{ type: 'reservation' | 'post' | 'upload'; message: string; timestamp: Date }> = [];

    recentReservations.forEach((item) => {
      activities.push({
        type: 'reservation',
        message: `${item.patientName}님의 예약이 등록되었습니다.`,
        timestamp: item.createdAt,
      });
    });

    recentPosts.forEach((item) => {
      activities.push({
        type: 'post',
        message: `${item.author}님이 "${item.title}" 게시글을 작성했습니다.`,
        timestamp: item.createdAt,
      });
    });

    recentUploads.forEach((item) => {
      activities.push({
        type: 'upload',
        message: `${item.uploadedBy?.name || '알 수 없음'}님이 "${item.originalName}" 파일을 업로드했습니다.`,
        timestamp: item.uploadedAt,
      });
    });

    // 시간순 정렬
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, 10); // 최근 10개만 반환
  }

  /**
   * 차트용 데이터 가져오기
   */
  async getChartData(): Promise<ChartData> {
    const cacheKey = 'chart-data';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const [
      reservationTrend,
      postsByCategory,
      weeklyReservationStatus,
    ] = await Promise.all([
      this.getReservationTrend(),
      this.getPostsByCategory(),
      this.getWeeklyReservationStatus(),
    ]);

    const chartData: ChartData = {
      reservationTrend,
      postsByCategory,
      weeklyReservationStatus,
    };

    this.setCache(cacheKey, chartData);
    return chartData;
  }

  /**
   * 예약 추이 (최근 7일)
   */
  private async getReservationTrend() {
    const dates = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push({
        start: startOfDay(date),
        end: endOfDay(date),
        label: date.toISOString().split('T')[0],
      });
    }

    const counts = await Promise.all(
      dates.map(async (date) => {
        const count = await db.reservation.count({
          where: {
            createdAt: {
              gte: date.start,
              lte: date.end,
            },
          },
        });
        return {
          date: date.label,
          count,
        };
      })
    );

    return counts;
  }

  /**
   * 카테고리별 게시글 수
   */
  private async getPostsByCategory() {
    const categoryCounts = await db.boardPost.groupBy({
      by: ['boardType'],
      _count: {
        boardType: true,
      },
    });

    return categoryCounts.map((item) => ({
      category: item.boardType === BoardType.NOTICE ? '공지사항' : '이벤트',
      count: item._count.boardType,
    }));
  }

  /**
   * 주간 예약 상태별 통계
   */
  private async getWeeklyReservationStatus() {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const statusCounts = await db.reservation.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      _count: {
        status: true,
      },
    });

    const statusLabels: Record<ReservationStatus, string> = {
      PENDING: '대기중',
      CONFIRMED: '확정',
      COMPLETED: '완료',
      CANCELLED: '취소',
    };

    return statusCounts.map((item) => ({
      status: statusLabels[item.status],
      count: item._count.status,
    }));
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// 싱글톤 인스턴스 export
export const dashboardService = new DashboardService();