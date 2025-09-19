'use client';

import React, { useState, useEffect } from 'react';
import { TemplateCategory } from '@prisma/client';
import { BlockTemplateData, TemplateGalleryFilter } from '@/app/types/webbuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // 현재 사용 안함
import { Badge } from '@/components/ui/badge';
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // 현재 사용 안함
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Grid3X3 } from 'lucide-react';
import TemplateCard from './TemplateCard';
import TemplatePreview from './TemplatePreview';
import { usePermissions } from '@/hooks/usePermissions';

interface TemplateGalleryProps {
  onSelectTemplate: (template: BlockTemplateData) => void;
  selectedCategory?: TemplateCategory;
  onClose?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: '전체 카테고리' },
  { value: 'UI', label: 'UI 컴포넌트' },
  { value: 'LAYOUT', label: '레이아웃' },
  { value: 'CONTENT', label: '콘텐츠' },
  { value: 'FORM', label: '폼' },
  { value: 'MEDIA', label: '미디어' },
  { value: 'NAVIGATION', label: '네비게이션' },
  { value: 'MARKETING', label: '마케팅' },
  { value: 'SOCIAL', label: '소셜' },
  { value: 'OTHER', label: '기타' }
];

export default function TemplateGallery({
  onSelectTemplate,
  selectedCategory,
  onClose
}: TemplateGalleryProps) {
  const { canCreateBlocks, canManageTemplates } = usePermissions();
  const [templates, setTemplates] = useState<BlockTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<BlockTemplateData | null>(null);

  const [filter, setFilter] = useState<TemplateGalleryFilter>({
    category: selectedCategory || 'ALL',
    search: '',
    isPublic: undefined
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  // 템플릿 목록 로드
  const loadTemplates = async (resetPage = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter.category && filter.category !== 'ALL') {
        params.append('category', filter.category);
      }
      if (filter.search) {
        params.append('search', filter.search);
      }
      if (filter.isPublic !== undefined) {
        params.append('isPublic', filter.isPublic.toString());
      }
      params.append('page', resetPage ? '1' : pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/webbuilder/templates?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        if (resetPage) {
          setTemplates(data.data.templates);
          setPagination(data.data.pagination);
        } else {
          setTemplates(prev => [...prev, ...data.data.templates]);
          setPagination(data.data.pagination);
        }
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드 및 필터 변경 시 재로드
  useEffect(() => {
    loadTemplates(true);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // 템플릿 사용 처리
  const handleUseTemplate = async (template: BlockTemplateData) => {
    if (!canCreateBlocks) {
      alert('블록 생성 권한이 없습니다.');
      return;
    }

    try {
      // 템플릿 사용 기록
      await fetch(`/api/webbuilder/templates/${template.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      onSelectTemplate(template);
      onClose?.();
    } catch (error) {
      console.error('Error using template:', error);
      alert('템플릿 적용 중 오류가 발생했습니다.');
    }
  };

  // 무한 스크롤 처리
  const loadMore = () => {
    if (pagination.page < pagination.totalPages && !loading) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      loadTemplates(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-red-500 mb-4">⚠️ {error}</div>
        <Button onClick={() => loadTemplates(true)}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">템플릿 갤러리</h2>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {pagination.total}개 템플릿
            </Badge>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="템플릿 검색..."
                value={filter.search || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select
              value={filter.category || 'ALL'}
              onValueChange={(value) => setFilter(prev => ({
                ...prev,
                category: value as TemplateCategory | 'ALL'
              }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.isPublic?.toString() || 'all'}
              onValueChange={(value) => setFilter(prev => ({
                ...prev,
                isPublic: value === 'all' ? undefined : value === 'true'
              }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="true">공개</SelectItem>
                <SelectItem value="false">내 템플릿</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 템플릿 그리드 */}
      {templates.length === 0 && !loading ? (
        <div className="text-center py-12">
          <Grid3X3 className="mx-auto text-gray-400 mb-4" size={48} />
          <div className="text-gray-500">검색 조건에 맞는 템플릿이 없습니다.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => handleUseTemplate(template)}
              onPreview={() => setPreviewTemplate(template)}
              canUse={canCreateBlocks}
              canManage={canManageTemplates}
            />
          ))}
        </div>
      )}

      {/* 더 보기 버튼 */}
      {pagination.page < pagination.totalPages && (
        <div className="text-center pt-6">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
          >
            {loading ? '로딩 중...' : '더 보기'}
          </Button>
        </div>
      )}

      {/* 로딩 스피너 */}
      {loading && templates.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 템플릿 미리보기 모달 */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => handleUseTemplate(previewTemplate)}
          canUse={canCreateBlocks}
        />
      )}
    </div>
  );
}