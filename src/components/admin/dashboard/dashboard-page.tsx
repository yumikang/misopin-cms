"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  BarChart3,
  TrendingUp,
  Activity,
  Calendar,
  Settings,
} from 'lucide-react';

// 위젯 컴포넌트들
import {
  ReservationWidget,
  PostWidget,
  RecentActivityWidget,
  SystemStatusWidget,
} from './widgets';

// 차트 컴포넌트들
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
} from './charts';

// 타입 정의
import { DashboardStats, ChartData } from '@/types/dashboard';

export const DashboardPage: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 차트 데이터 페칭
  const fetchChartData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/dashboard/stats?type=chart');
      if (!response.ok) throw new Error('차트 데이터를 불러올 수 없습니다.');

      const data = await response.json();
      setChartData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 전체 새로고침
  const handleRefreshAll = () => {
    fetchChartData(true);
    // 위젯들은 각자 독립적으로 새로고침
    setLastUpdated(new Date());
  };

  // 자동 새로고침 (5분마다)
  useEffect(() => {
    fetchChartData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchChartData(true);
      }, 5 * 60 * 1000); // 5분

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 포맷된 차트 데이터
  const formattedChartData = useMemo(() => {
    if (!chartData) return null;

    return {
      reservationTrend: chartData.reservationTrend,
      postsByCategory: chartData.postsByCategory,
      weeklyReservationStatus: chartData.weeklyReservationStatus,
    };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground">
            미소핀의원 CMS 관리 현황을 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
          </Badge>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? '자동새로고침 ON' : '자동새로고침 OFF'}
          </Button>
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            전체 현황
          </TabsTrigger>
          <TabsTrigger value="charts">
            <TrendingUp className="h-4 w-4 mr-2" />
            차트 분석
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            활동 내역
          </TabsTrigger>
        </TabsList>

        {/* 전체 현황 탭 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 위젯 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-2">
              <ReservationWidget />
            </div>
            <div className="xl:col-span-1">
              <PostWidget />
            </div>
            <div className="xl:col-span-1">
              <SystemStatusWidget />
            </div>
          </div>

          {/* 차트 미리보기 */}
          {formattedChartData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    예약 추이 (최근 7일)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={formattedChartData.reservationTrend}
                    dataKey="count"
                    height={250}
                    color="#3b82f6"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>상태별 예약 현황</CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart
                    data={formattedChartData.weeklyReservationStatus}
                    dataKey="count"
                    nameKey="status"
                    height={250}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 차트 분석 탭 */}
        <TabsContent value="charts" className="space-y-6">
          {error && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-red-600">{error}</p>
                <div className="flex justify-center mt-4">
                  <Button onClick={() => fetchChartData()} variant="outline">
                    다시 시도
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && !chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                      <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {formattedChartData && (
            <div className="space-y-6">
              {/* 예약 관련 차트 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>예약 추이 (최근 7일)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      data={formattedChartData.reservationTrend}
                      dataKey="count"
                      height={300}
                      color="#3b82f6"
                      showGrid={true}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>주간 예약 상태</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PieChart
                      data={formattedChartData.weeklyReservationStatus}
                      dataKey="count"
                      nameKey="status"
                      height={300}
                      showLegend={true}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* 게시글 관련 차트 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>카테고리별 게시글</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={formattedChartData.postsByCategory}
                      dataKey="count"
                      height={300}
                      color="#10b981"
                      showGrid={true}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>예약 추이 (Area)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AreaChart
                      data={formattedChartData.reservationTrend}
                      dataKeys={['count']}
                      height={300}
                      colors={['#8b5cf6']}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 활동 내역 탭 */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentActivityWidget />
            </div>
            <div className="lg:col-span-1">
              <SystemStatusWidget />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};