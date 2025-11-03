'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import EditableSection from './EditableSection';
import SaveControls from './SaveControls';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

interface StaticPageEditorProps {
  slug: string;
  token: string;
}

interface EditableElement {
  id: string;
  type: 'text' | 'html' | 'image' | 'background';
  selector: string;
  content: string;
  label: string;
  friendlyLabel: string;
  icon: string;
  order: number;
}

interface Section {
  sectionName: string;
  displayName: string;
  emoji: string;
  description?: string;
  order: number;
  elementCount: number;
  elements: EditableElement[];
}

interface APIResponse {
  success: boolean;
  sections: Section[];
  pageId: string;
  pageTitle: string;
  editMode: string;
  totalSections: number;
  totalElements: number;
  lastParsedAt: string | null;
}

const StaticPageEditor: React.FC<StaticPageEditorProps> = ({ slug, token }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [originalSections, setOriginalSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);
  const [pageTitle, setPageTitle] = useState('');

  // <br> 태그와 줄바꿈 변환 헬퍼 함수
  const brToNewline = useCallback((text: string): string => {
    return text.replace(/<br\s*\/?>/gi, '\n');
  }, []);

  const newlineToBr = useCallback((text: string): string => {
    return text.replace(/\n/g, '<br>');
  }, []);

  // 변경사항 추적
  const isDirty = useMemo(() => {
    return JSON.stringify(sections) !== JSON.stringify(originalSections);
  }, [sections, originalSections]);

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

        const data: APIResponse = await response.json();

        if (data.success && data.sections) {
          setSections(data.sections);
          setOriginalSections(data.sections);
          setPageTitle(data.pageTitle || slug);

          // 첫 번째 섹션만 기본적으로 열기
          if (data.sections.length > 0) {
            setExpandedSections(new Set([data.sections[0].sectionName]));
          }
        } else {
          throw new Error('Invalid response format');
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

  // 섹션 토글
  const toggleSection = useCallback((sectionName: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  }, []);

  // 요소 변경 핸들러
  const handleElementChange = useCallback((
    sectionName: string,
    elementIndex: number,
    field: 'content',
    value: string
  ) => {
    setSections((prev) => {
      const newSections = prev.map((section) => {
        if (section.sectionName === sectionName) {
          const newElements = section.elements.map((element, idx) => {
            if (idx === elementIndex) {
              return { ...element, content: value };
            }
            return element;
          });
          return { ...section, elements: newElements };
        }
        return section;
      });
      return newSections;
    });
  }, []);

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Convert sections back to flat array for API
      const flatElements = sections.flatMap((section) =>
        section.elements.map((element) => ({
          id: element.id,
          type: element.type,
          selector: element.selector,
          content: element.content,
          label: element.label,
          sectionName: section.sectionName,
          order: element.order,
        }))
      );

      // Transform to API format: updates array with elementId, newValue, elementType
      // Filter out BACKGROUND elements - they should be edited through image upload, not text editor
      const updates = flatElements
        .filter((element) => element.type.toUpperCase() !== 'BACKGROUND')
        .map((element) => ({
          elementId: element.id,
          newValue: element.content,
          elementType: element.type.toUpperCase() // TEXT, HTML, IMAGE, etc.
        }));

      const response = await fetch(
        `/api/admin/static-pages/${slug}/elements`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            updates: updates
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setOriginalSections(sections);
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
  }, [slug, token, sections]);

  // 취소 핸들러
  const handleCancel = useCallback(() => {
    setSections(originalSections);
    setError(null);
  }, [originalSections]);

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
            {pageTitle} 페이지 편집
          </h1>
          <p className="text-gray-600">
            각 섹션을 클릭하여 펼치고, 내용을 수정한 후 저장하세요.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {sections.length === 0 ? (
            <Alert>
              <AlertDescription>
                편집 가능한 요소가 없습니다. HTML 파일에 data-section 속성을 추가하세요.
              </AlertDescription>
            </Alert>
          ) : (
            sections.map((section, sectionIndex) => {
              const isExpanded = expandedSections.has(section.sectionName);

              return (
                <div
                  key={section.sectionName}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* 섹션 헤더 */}
                  <button
                    onClick={() => toggleSection(section.sectionName)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="text-gray-400" size={20} />
                      ) : (
                        <ChevronRight className="text-gray-400" size={20} />
                      )}
                      <span className="text-2xl">{section.emoji}</span>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {section.displayName}
                        </h3>
                        {section.description && (
                          <p className="text-sm text-gray-500">{section.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {section.elementCount}개 항목
                    </div>
                  </button>

                  {/* 섹션 내용 */}
                  {isExpanded && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                      <div className="space-y-4">
                        {section.elements.map((element, elementIndex) => {
                          // 카테고리와 브레드크럼 필드는 숨김
                          const label = element.friendlyLabel.toLowerCase();
                          if (label.includes('카테고리') || label.includes('브레드크럼')) {
                            return null;
                          }

                          return (
                          <div
                            key={element.id}
                            className="bg-white p-4 rounded-md border border-gray-200"
                          >
                            <label className="block mb-2">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{element.icon}</span>
                                <span className="text-sm font-medium text-gray-700">
                                  {element.friendlyLabel}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ({element.type})
                                </span>
                              </div>

                              {element.type === 'image' || element.type === 'background' ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={element.content}
                                    onChange={(e) =>
                                      handleElementChange(
                                        section.sectionName,
                                        elementIndex,
                                        'content',
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="이미지 URL을 입력하세요"
                                  />
                                  {element.content && (
                                    <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                                      <img
                                        src={element.content}
                                        alt={element.friendlyLabel}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E이미지 없음%3C/text%3E%3C/svg%3E';
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : element.type === 'html' ? (
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const htmlContent = e.currentTarget.innerHTML;
                                    handleElementChange(
                                      section.sectionName,
                                      elementIndex,
                                      'content',
                                      htmlContent
                                    );
                                  }}
                                  dangerouslySetInnerHTML={{ __html: element.content }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[100px]"
                                />
                              ) : (
                                <textarea
                                  value={brToNewline(element.content)}
                                  onChange={(e) => {
                                    const convertedContent = newlineToBr(e.target.value);
                                    handleElementChange(
                                      section.sectionName,
                                      elementIndex,
                                      'content',
                                      convertedContent
                                    );
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  rows={3}
                                  placeholder="텍스트를 입력하세요 (엔터로 줄바꿈)"
                                />
                              )}
                            </label>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StaticPageEditor;
