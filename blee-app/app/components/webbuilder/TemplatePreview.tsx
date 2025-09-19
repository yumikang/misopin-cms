'use client';

import React from 'react';
import { BlockTemplateData, TextBlockContent, ImageBlockContent, ButtonBlockContent, GridBlockContent } from '@/app/types/webbuilder';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  User,
  Clock,
  Tag,
  Globe,
  Lock,
  Eye,
  Code,
  Palette,
  Settings
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TemplatePreviewProps {
  template: BlockTemplateData;
  isOpen: boolean;
  onClose: () => void;
  onUse: () => void;
  canUse: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  UI: 'UI 컴포넌트',
  LAYOUT: '레이아웃',
  CONTENT: '콘텐츠',
  FORM: '폼',
  MEDIA: '미디어',
  NAVIGATION: '네비게이션',
  MARKETING: '마케팅',
  SOCIAL: '소셜',
  OTHER: '기타'
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  TEXT: '텍스트',
  IMAGE: '이미지',
  VIDEO: '비디오',
  CAROUSEL: '캐러셀',
  GRID: '그리드',
  BUTTON: '버튼',
  FORM: '폼',
  MAP: '지도',
  HTML: 'HTML',
  COMPONENT: '컴포넌트'
};

export default function TemplatePreview({
  template,
  isOpen,
  onClose,
  onUse,
  canUse
}: TemplatePreviewProps) {
  const categoryLabel = CATEGORY_LABELS[template.category] || template.category;
  const blockTypeLabel = BLOCK_TYPE_LABELS[template.templateData.type] || template.templateData.type;

  const renderBlockPreview = () => {
    const { templateData } = template;

    switch (templateData.type) {
      case 'TEXT':
        return (
          <div className="p-4 border rounded-lg bg-white">
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: (templateData.content as TextBlockContent).text || '텍스트 콘텐츠' }} />
            </div>
          </div>
        );

      case 'IMAGE':
        return (
          <div className="p-4 border rounded-lg bg-white">
            <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
              {(templateData.content as ImageBlockContent).src ? (
                <img
                  src={(templateData.content as ImageBlockContent).src}
                  alt={(templateData.content as ImageBlockContent).alt || '이미지'}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <Tag size={32} className="mx-auto mb-2" />
                  <div>이미지 블록</div>
                </div>
              )}
            </div>
          </div>
        );

      case 'BUTTON':
        return (
          <div className="p-4 border rounded-lg bg-white">
            <Button
              variant={(templateData.content as ButtonBlockContent).variant === 'outline' ? 'outline' : 'default'}
              size={(templateData.content as ButtonBlockContent).size || 'default'}
            >
              {(templateData.content as ButtonBlockContent).text || '버튼'}
            </Button>
          </div>
        );

      case 'GRID':
        const gridContent = templateData.content as GridBlockContent;
        return (
          <div className="p-4 border rounded-lg bg-white">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${gridContent.columns || 3}, 1fr)`,
                gap: `${gridContent.gap || 16}px`
              }}
            >
              {(gridContent.items || [{}, {}, {}]).slice(0, 6).map((_, index) => (
                <div key={index} className="aspect-square bg-gray-100 rounded border flex items-center justify-center">
                  <div className="text-gray-400 text-sm">아이템 {index + 1}</div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8 border rounded-lg bg-gray-50 text-center">
            <Tag size={32} className="mx-auto mb-2 text-gray-400" />
            <div className="text-gray-600">{blockTypeLabel} 블록</div>
            <div className="text-sm text-gray-500 mt-1">미리보기 준비 중</div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-xl">{template.name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {categoryLabel}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {blockTypeLabel}
                </Badge>
                {template.isPublic ? (
                  <Badge variant="outline" className="text-xs text-green-600">
                    <Globe size={12} className="mr-1" />
                    공개
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-gray-600">
                    <Lock size={12} className="mr-1" />
                    비공개
                  </Badge>
                )}
              </div>
            </div>

            {canUse && (
              <Button onClick={onUse} className="ml-4">
                <Download size={16} className="mr-2" />
                사용하기
              </Button>
            )}
          </div>

          {template.description && (
            <DialogDescription className="text-sm">
              {template.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="preview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye size={16} />
                미리보기
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Code size={16} />
                데이터
              </TabsTrigger>
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Settings size={16} />
                정보
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 mt-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <h3 className="font-medium">블록 미리보기</h3>
                  {renderBlockPreview()}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="data" className="flex-1 mt-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <h3 className="font-medium">템플릿 데이터</h3>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(template.templateData, null, 2)}
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="info" className="flex-1 mt-4">
              <ScrollArea className="h-full">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">기본 정보</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">제작자:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <User size={14} />
                          {template.creator?.name || '익명'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">생성일:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock size={14} />
                          {template.createdAt ?
                            new Date(template.createdAt).toLocaleDateString('ko-KR') :
                            '알 수 없음'
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">사용 횟수:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <Download size={14} />
                          {template.usageCount || 0}회
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">공개 상태:</span>
                        <div className="flex items-center gap-1 mt-1">
                          {template.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                          {template.isPublic ? '공개' : '비공개'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {template.tags && template.tags.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">태그</h3>
                      <div className="flex flex-wrap gap-2">
                        {template.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium mb-3">블록 설정</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">블록 타입:</span>
                        <span>{blockTypeLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">스타일 설정:</span>
                        <span>{template.templateData.styles ? '있음' : '없음'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">고급 설정:</span>
                        <span>{template.templateData.settings ? '있음' : '없음'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}