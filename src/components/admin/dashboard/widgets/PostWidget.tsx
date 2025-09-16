"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Eye,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface PostStats {
  total: number;
  published: number;
  draft: number;
  notice: number;
  event: number;
  recentList: Array<{
    id: string;
    title: string;
    boardType: string;
    isPublished: boolean;
    viewCount: number;
    createdAt: string;
  }>;
}

export const PostWidget: React.FC = React.memo(() => {
  const [stats, setStats] = useState<PostStats | null>(null);
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
      setStats(data.posts);
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

  // 게시판 타입 한글 변환
  const getBoardTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'NOTICE':
        return '공지사항';
      case 'EVENT':
        return '이벤트';
      default:
        return type;
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
          <FileText className="h-5 w-5" />
          게시글 현황
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
        {/* 전체 통계 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">전체</span>
            </div>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">발행</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats?.published || 0}
            </p>
          </div>
        </div>

        {/* 카테고리별 통계 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">카테고리</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 rounded bg-gray-50">
              <span className="text-sm">공지사항</span>
              <span className="font-medium">{stats?.notice || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-gray-50">
              <span className="text-sm">이벤트</span>
              <span className="font-medium">{stats?.event || 0}</span>
            </div>
          </div>
        </div>

        {/* 최근 게시글 */}
        {stats?.recentList && stats.recentList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">최근 게시글</h4>
            <div className="space-y-1">
              {stats.recentList.slice(0, 3).map((post) => (
                <div
                  key={post.id}
                  className="py-1.5 px-2 rounded hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate flex-1">
                      {post.title}
                    </p>
                    <Badge
                      variant={post.isPublished ? 'default' : 'outline'}
                      className="text-xs ml-2"
                    >
                      {post.isPublished ? '발행' : '임시'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {getBoardTypeLabel(post.boardType)}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.viewCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 바로가기 */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/admin/boards">
            <Button variant="outline" className="w-full" size="sm">
              게시글 관리
            </Button>
          </Link>
          <Link href="/admin/boards/create">
            <Button variant="default" className="w-full" size="sm">
              새 글 작성
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});

PostWidget.displayName = 'PostWidget';