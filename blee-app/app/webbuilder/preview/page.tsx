'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PreviewFrame from '@/components/webbuilder/PreviewFrame';
import { ContentBlockData } from '@/app/types/webbuilder';
import { Button } from '@/components/ui/button';
import { Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const pageSlug = searchParams.get('page') || 'home';
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState(1);
  const [sections, setSections] = useState<Record<string, ContentBlockData[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // 정적 사이트 URL
  const staticSiteUrl = process.env.NEXT_PUBLIC_STATIC_SITE_URL || 'http://localhost:8080';
  const pageUrl = pageSlug === 'home'
    ? `${staticSiteUrl}/index.html`
    : `${staticSiteUrl}/${pageSlug}.html`;

  useEffect(() => {
    loadPageContent();
  }, [pageSlug]);

  const loadPageContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/webbuilder/page-blocks?pageId=${pageSlug}`);
      const data = await response.json();

      if (data.success) {
        // API 응답을 ContentBlockData 형식으로 변환
        const transformedSections: Record<string, ContentBlockData[]> = {};

        Object.keys(data.data).forEach(sectionName => {
          transformedSections[sectionName] = data.data[sectionName].map((item: {
            block: ContentBlockData;
            customStyles?: unknown;
          }) => ({
            ...item.block,
            styles: {
              ...(item.block.styles || {}),
              ...(item.customStyles || {})
            }
          }));
        });

        setSections(transformedSections);
      }
    } catch (error) {
      console.error('Failed to load page content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 툴바 */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">미리보기: {pageSlug}</h2>

          {/* 디바이스 선택 */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={device === 'desktop' ? 'default' : 'ghost'}
              onClick={() => setDevice('desktop')}
              className="px-3"
            >
              <Monitor size={18} />
            </Button>
            <Button
              size="sm"
              variant={device === 'tablet' ? 'default' : 'ghost'}
              onClick={() => setDevice('tablet')}
              className="px-3"
            >
              <Tablet size={18} />
            </Button>
            <Button
              size="sm"
              variant={device === 'mobile' ? 'default' : 'ghost'}
              onClick={() => setDevice('mobile')}
              className="px-3"
            >
              <Smartphone size={18} />
            </Button>
          </div>

          {/* 줌 컨트롤 */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              className="px-2"
            >
              <ZoomOut size={18} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomReset}
              className="px-3 min-w-[60px]"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              className="px-2"
            >
              <ZoomIn size={18} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadPageContent}
          >
            <RotateCw size={16} className="mr-2" />
            새로고침
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.close()}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* 미리보기 영역 */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">콘텐츠 로딩중...</p>
            </div>
          </div>
        ) : (
          <PreviewFrame
            pageUrl={pageUrl}
            sections={sections}
            device={device}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
}