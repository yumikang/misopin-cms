"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Server,
  HardDrive,
  Users,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  WifiOff,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemStats {
  users: {
    total: number;
    activeToday: number;
    admins: number;
    editors: number;
  };
  files: {
    total: number;
    totalSize: number;
    images: number;
    documents: number;
  };
  popups: {
    total: number;
    active: number;
    scheduled: number;
    expired: number;
  };
}

export const SystemStatusWidget: React.FC = React.memo(() => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline'>('online');

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
      setStats({
        users: data.users,
        files: data.files,
        popups: data.popups,
      });
      setServerStatus('online');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setServerStatus('offline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // 1분마다 상태 체크
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // 파일 크기 포맷
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // 스토리지 사용률 계산 (임시 - 실제로는 서버에서 받아와야 함)
  const storageUsage = stats?.files ? Math.min((stats.files.totalSize / (10 * 1024 * 1024 * 1024)) * 100, 100) : 0;

  if (loading) {
    return (
      <Card className="h-full">
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
      <Card className="h-full">
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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          시스템 상태
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant={serverStatus === 'online' ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            {serverStatus === 'online' ? (
              <>
                <CheckCircle className="h-3 w-3" />
                온라인
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                오프라인
              </>
            )}
          </Badge>
          <Button
            onClick={() => fetchData(true)}
            variant="ghost"
            size="icon"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 사용자 통계 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">사용자</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-muted-foreground">전체</p>
              <p className="text-lg font-semibold">{stats?.users.total || 0}명</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-muted-foreground">오늘 활동</p>
              <p className="text-lg font-semibold">{stats?.users.activeToday || 0}명</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            관리자 {stats?.users.admins || 0}명 / 편집자 {stats?.users.editors || 0}명
          </div>
        </div>

        {/* 스토리지 사용량 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">스토리지</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{formatFileSize(stats?.files.totalSize || 0)}</span>
              <span className="text-muted-foreground">/ 10 GB</span>
            </div>
            <Progress value={storageUsage} className="h-2" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="font-medium">{stats?.files.total || 0}</p>
              <p className="text-muted-foreground">전체 파일</p>
            </div>
            <div className="text-center">
              <p className="font-medium">{stats?.files.images || 0}</p>
              <p className="text-muted-foreground">이미지</p>
            </div>
            <div className="text-center">
              <p className="font-medium">{stats?.files.documents || 0}</p>
              <p className="text-muted-foreground">문서</p>
            </div>
          </div>
        </div>

        {/* 팝업 상태 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">팝업</span>
            <Badge variant="outline" className="text-xs">
              {stats?.popups.active || 0} 활성
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded bg-gray-50">
              <p className="text-sm font-medium">{stats?.popups.total || 0}</p>
              <p className="text-xs text-muted-foreground">전체</p>
            </div>
            <div className="text-center p-2 rounded bg-gray-50">
              <p className="text-sm font-medium">{stats?.popups.scheduled || 0}</p>
              <p className="text-xs text-muted-foreground">예정</p>
            </div>
            <div className="text-center p-2 rounded bg-gray-50">
              <p className="text-sm font-medium">{stats?.popups.expired || 0}</p>
              <p className="text-xs text-muted-foreground">만료</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SystemStatusWidget.displayName = 'SystemStatusWidget';