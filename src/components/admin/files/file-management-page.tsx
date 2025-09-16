"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Upload,
  Search,
  Filter,
  RefreshCw,
  FolderOpen,
  Plus,
  Settings,
  Download,
  Trash2,
  Eye,
  FileText,
  Image,
  File,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@prisma/client';

// 컴포넌트 임포트
import { FileUploader } from './file-uploader';
import { FileList } from './file-list';

interface FileData {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  category: string;
  description?: string;
  uploadedBy?: {
    name: string;
    email: string;
  };
  uploadedAt: string;
}

interface FileManagementPageProps {
  userRole: UserRole;
}

export const FileManagementPage: React.FC<FileManagementPageProps> = ({
  userRole,
}) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const filesPerPage = 20;

  // 파일 목록 페칭
  const fetchFiles = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: filesPerPage.toString(),
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      const response = await fetch(`/api/files?${params}`);
      if (!response.ok) throw new Error('파일 목록을 불러올 수 없습니다.');

      const data = await response.json();
      setFiles(data.files || []);
      setTotalPages(data.totalPages || 1);
      setTotalFiles(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      toast.error('파일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, searchTerm, categoryFilter]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // 검색 핸들러
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  // 카테고리 필터 핸들러
  const handleCategoryFilter = useCallback((value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  }, []);

  // 파일 업로드 완료 핸들러
  const handleUploadComplete = useCallback((uploadedFiles: any[]) => {
    toast.success(`${uploadedFiles.length}개 파일이 업로드되었습니다.`);
    setShowUploadDialog(false);
    fetchFiles(true);
  }, [fetchFiles]);

  // 파일 삭제 핸들러
  const handleFileDelete = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setTotalFiles(prev => prev - 1);
    toast.success('파일이 삭제되었습니다.');
  }, []);

  // 파일 편집 핸들러
  const handleFileEdit = useCallback((fileId: string, data: any) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, ...data } : f
    ));
    toast.success('파일 정보가 수정되었습니다.');
  }, []);

  // 페이지네이션 핸들러
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 파일 카테고리별 아이콘
  const getCategoryIcon = useCallback((category: string) => {
    switch (category) {
      case 'images':
        return Image;
      case 'documents':
        return FileText;
      default:
        return File;
    }
  }, []);

  // 통계 계산
  const stats = React.useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const categories = files.reduce((acc, file) => {
      acc[file.category] = (acc[file.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSize,
      categories,
    };
  }, [files]);

  // 파일 크기 포맷
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">파일 관리</h1>
          <p className="text-muted-foreground">
            업로드된 파일을 관리하고 새 파일을 업로드하세요
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchFiles(true)}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                파일 업로드
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>파일 업로드</DialogTitle>
                <DialogDescription>
                  새 파일을 업로드합니다. 여러 파일을 동시에 업로드할 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              <FileUploader onUploadComplete={handleUploadComplete} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalFiles}</p>
                <p className="text-xs text-muted-foreground">전체 파일</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Upload className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
                <p className="text-xs text-muted-foreground">총 용량</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Image className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.categories.images || 0}</p>
                <p className="text-xs text-muted-foreground">이미지</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.categories.documents || 0}</p>
                <p className="text-xs text-muted-foreground">문서</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="파일명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category">카테고리</Label>
              <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="general">일반</SelectItem>
                  <SelectItem value="images">이미지</SelectItem>
                  <SelectItem value="documents">문서</SelectItem>
                  <SelectItem value="others">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 파일 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            파일 목록
            {totalFiles > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({currentPage} / {totalPages} 페이지, 총 {totalFiles}개)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileList
            files={files}
            loading={loading}
            onRefresh={() => fetchFiles(true)}
            onDelete={userRole !== UserRole.EDITOR ? handleFileDelete : undefined}
            onEdit={userRole !== UserRole.EDITOR ? handleFileEdit : undefined}
          />

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 에러 상태 */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => fetchFiles()} variant="outline">
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};