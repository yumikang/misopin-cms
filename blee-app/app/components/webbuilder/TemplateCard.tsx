'use client';

import React from 'react';
import { BlockTemplateData } from '@/app/types/webbuilder';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Eye,
  Download,
  Heart,
  User,
  Clock,
  Tag,
  Globe,
  Lock
} from 'lucide-react';

interface TemplateCardProps {
  template: BlockTemplateData;
  onUse: () => void;
  onPreview: () => void;
  canUse: boolean;
  canManage: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  UI: 'bg-blue-100 text-blue-800',
  LAYOUT: 'bg-green-100 text-green-800',
  CONTENT: 'bg-purple-100 text-purple-800',
  FORM: 'bg-orange-100 text-orange-800',
  MEDIA: 'bg-pink-100 text-pink-800',
  NAVIGATION: 'bg-indigo-100 text-indigo-800',
  MARKETING: 'bg-red-100 text-red-800',
  SOCIAL: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-gray-100 text-gray-800'
};

const CATEGORY_LABELS: Record<string, string> = {
  UI: 'UI',
  LAYOUT: '레이아웃',
  CONTENT: '콘텐츠',
  FORM: '폼',
  MEDIA: '미디어',
  NAVIGATION: '네비게이션',
  MARKETING: '마케팅',
  SOCIAL: '소셜',
  OTHER: '기타'
};

export default function TemplateCard({
  template,
  onUse,
  onPreview,
  canUse,
  canManage
}: TemplateCardProps) {
  const categoryColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.OTHER;
  const categoryLabel = CATEGORY_LABELS[template.category] || template.category;

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer">
      <CardHeader className="pb-3">
        {/* 썸네일 영역 */}
        <div className="relative aspect-video bg-gray-100 rounded-md overflow-hidden mb-3">
          {template.thumbnailUrl ? (
            <img
              src={template.thumbnailUrl}
              alt={template.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-gray-400 text-center">
                <Tag size={24} className="mx-auto mb-2" />
                <div className="text-xs">{categoryLabel}</div>
              </div>
            </div>
          )}

          {/* 공개/비공개 표시 */}
          <div className="absolute top-2 right-2">
            {template.isPublic ? (
              <Globe size={16} className="text-green-600" />
            ) : (
              <Lock size={16} className="text-gray-600" />
            )}
          </div>

          {/* 호버 시 액션 버튼 */}
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
            >
              <Eye size={16} className="mr-1" />
              미리보기
            </Button>
            {canUse && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUse();
                }}
              >
                <Download size={16} className="mr-1" />
                사용
              </Button>
            )}
          </div>
        </div>

        {/* 템플릿 정보 */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
              {template.name}
            </h3>
            <Badge className={`ml-2 text-xs ${categoryColor}`} variant="secondary">
              {categoryLabel}
            </Badge>
          </div>

          {template.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {template.description}
            </p>
          )}

          {/* 태그 */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-1 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 하단 정보 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User size={12} />
            <span className="truncate max-w-20">
              {(template as any).creator?.name || '익명'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {template.usageCount !== undefined && (
              <div className="flex items-center gap-1">
                <Download size={12} />
                <span>{template.usageCount}</span>
              </div>
            )}

            {template.createdAt && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>
                  {new Date(template.createdAt).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 (모바일) */}
        <div className="mt-3 flex gap-2 md:hidden">
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            className="flex-1"
          >
            <Eye size={16} className="mr-1" />
            미리보기
          </Button>
          {canUse && (
            <Button
              size="sm"
              onClick={onUse}
              className="flex-1"
            >
              <Download size={16} className="mr-1" />
              사용
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}