import { ReservationStatus, BoardType } from '@prisma/client';

// 대시보드 통계 인터페이스 (서비스와 동일)
export interface DashboardStats {
  reservations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    recentList: Array<{
      id: string;
      patientName: string;
      preferredDate: Date;
      status: ReservationStatus;
      createdAt: Date;
    }>;
  };
  posts: {
    total: number;
    published: number;
    draft: number;
    notice: number;
    event: number;
    recentList: Array<{
      id: string;
      title: string;
      boardType: BoardType;
      isPublished: boolean;
      viewCount: number;
      createdAt: Date;
    }>;
  };
  popups: {
    total: number;
    active: number;
    scheduled: number;
    expired: number;
  };
  files: {
    total: number;
    totalSize: number;
    images: number;
    documents: number;
    recentUploads: Array<{
      id: string;
      originalName: string;
      size: number;
      category: string;
      uploadedAt: Date;
      uploadedBy?: {
        name: string;
      };
    }>;
  };
  users: {
    total: number;
    activeToday: number;
    admins: number;
    editors: number;
  };
  activities: {
    recent: Array<{
      type: 'reservation' | 'post' | 'upload';
      message: string;
      timestamp: Date;
    }>;
  };
}

// 차트 데이터 인터페이스
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

// API 응답 타입
export interface DashboardStatsResponse extends DashboardStats {}

export interface DashboardChartResponse extends ChartData {}

export interface DashboardRefreshResponse {
  message: string;
  timestamp: string;
}

// 대시보드 위젯 타입
export interface DashboardWidget {
  id: string;
  title: string;
  value: string | number;
  description?: string;
  icon?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

// 대시보드 설정 타입
export interface DashboardSettings {
  refreshInterval?: number; // 자동 새로고침 간격 (초)
  defaultView?: 'grid' | 'list';
  visibleWidgets?: string[];
  chartSettings?: {
    theme?: 'light' | 'dark';
    animations?: boolean;
  };
}