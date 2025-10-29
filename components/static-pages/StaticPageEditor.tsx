'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ParsedSection } from '@/lib/static-pages/types';
import EditableSection from './EditableSection';
import SaveControls from './SaveControls';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface StaticPageEditorProps {
  slug: string;
  token: string;
}

interface GroupedSections {
  [sectionName: string]: ParsedSection[];
}

const StaticPageEditor: React.FC<StaticPageEditorProps> = ({ slug, token }) => {
  const [elements, setElements] = useState<ParsedSection[]>([]);
  const [originalElements, setOriginalElements] = useState<ParsedSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);

  // 변경사항 추적
  const isDirty = useMemo(() => {
    return JSON.stringify(elements) !== JSON.stringify(originalElements);
  }, [elements, originalElements]);

  // 섹션별 그룹화
  const groupedSections = useMemo(() => {
    const groups: GroupedSections = {};

    elements.forEach((element) => {
      // selector에서 섹션 이름 추출 (예: .hero → hero)
      const sectionMatch = element.selector.match(/^\.([a-z-]+)/);
      const sectionName = sectionMatch ? sectionMatch[1] : 'default';

      if (!groups[sectionName]) {
        groups[sectionName] = [];
      }
      groups[sectionName].push(element);
    });

    return groups;
  }, [elements]);

  // 초기 데이터 로드
  useEffect(() => {
    const loadElements = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/admin/static-pages/${slug}/editable-elements`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.editableElements) {
          setElements(data.editableElements);
          setOriginalElements(data.editableElements);
        } else {
          throw new Error(data.message || 'Invalid response format');
        }
      } catch (err) {
        console.error('Load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load elements');
      } finally {
        setIsLoading(false);
      }
    };

    loadElements();
  }, [slug, token]);

  // 요소 변경 핸들러
  const handleElementChange = useCallback((sectionName: string, index: number, updatedElement: ParsedSection) => {
    setElements((prev) => {
      const sectionElements = groupedSections[sectionName];
      const globalIndex = prev.indexOf(sectionElements[index]);

      if (globalIndex === -1) return prev;

      const newElements = [...prev];
      newElements[globalIndex] = updatedElement;
      return newElements;
    });
  }, [groupedSections]);

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/static-pages/${slug}/elements`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            sections: elements
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setOriginalElements(elements);
        setLastSaved(new Date());
      } else {
        throw new Error(data.message || 'Save failed');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [slug, token, elements]);

  // 취소 핸들러
  const handleCancel = useCallback(() => {
    setElements(originalElements);
    setError(null);
  }, [originalElements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600">페이지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SaveControls
        isDirty={isDirty}
        isSaving={isSaving}
        lastSaved={lastSaved}
        error={error || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            정적 페이지 편집: {slug}
          </h1>
          <p className="text-gray-600">
            섹션별로 콘텐츠를 편집하고 저장 버튼을 눌러주세요.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {Object.keys(groupedSections).length === 0 ? (
            <Alert>
              <AlertDescription>
                편집 가능한 요소가 없습니다. HTML 파일에 data-editable 속성을 추가하세요.
              </AlertDescription>
            </Alert>
          ) : (
            Object.entries(groupedSections).map(([sectionName, sectionElements]) => (
              <EditableSection
                key={sectionName}
                sectionName={sectionName}
                elements={sectionElements}
                onElementChange={(index, updated) =>
                  handleElementChange(sectionName, index, updated)
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StaticPageEditor;
