"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface ReservationStats {
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
    preferredDate: string;
    status: string;
    createdAt: string;
  }>;
}

export const ReservationWidget: React.FC = React.memo(() => {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 데이터 페칭
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('데이터를 불러올 수 없습니다.');

      const data = await response.json();
      setStats(data.reservations);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 상태별 색상
  const getStatusColor = useCallback((status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'default';
      case 'CONFIRMED':
        return 'secondary';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            오류
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => fetchData()}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          예약 현황
        </CardTitle>
        <Button
          onClick={() => fetchData(true)}
          variant="ghost"
          size="icon"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 기간별 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.today || 0}</p>
            <p className="text-xs text-muted-foreground">오늘</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.thisWeek || 0}</p>
            <p className="text-xs text-muted-foreground">이번 주</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.thisMonth || 0}</p>
            <p className="text-xs text-muted-foreground">이번 달</p>
          </div>
        </div>

        {/* 상태별 통계 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">대기중</span>
            <Badge variant="default">{stats?.pending || 0}건</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">확정</span>
            <Badge variant="secondary">{stats?.confirmed || 0}건</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">완료</span>
            <Badge variant="outline" className="bg-green-50">
              {stats?.completed || 0}건
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">취소</span>
            <Badge variant="destructive">{stats?.cancelled || 0}건</Badge>
          </div>
        </div>

        {/* 최근 예약 */}
        {stats?.recentList && stats.recentList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">최근 예약</h4>
            <div className="space-y-1">
              {stats.recentList.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.patientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.preferredDate).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <Badge
                    variant={getStatusColor(item.status) as any}
                    className="text-xs"
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 바로가기 */}
        <div className="pt-2">
          <Link href="/admin/reservations">
            <Button variant="outline" className="w-full" size="sm">
              전체 예약 관리
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});

ReservationWidget.displayName = 'ReservationWidget';