'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BlockType } from '@prisma/client';
import { ContentBlockData, PageSection, BlockContent, BlockTemplateData } from '@/app/types/webbuilder';
import BlockEditor from '@/components/webbuilder/BlockEditor';
import TemplateGallery from '@/components/webbuilder/TemplateGallery';
import { useAutoSave, AutoSaveIndicator } from '@/hooks/useAutoSave';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Save, Trash2, Edit2, GripVertical, Globe, Lock, Settings, Layout, Bookmark } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePermissions, PermissionGate, PermissionDenied } from '@/hooks/usePermissions';

// 페이지 섹션 정의
const PAGE_SECTIONS: PageSection[] = [
  {
    sectionName: 'main-banner',
    displayName: '메인 배너',
    description: '페이지 상단 히어로 섹션',
    maxBlocks: 1,
    allowedBlockTypes: ['IMAGE', 'CAROUSEL', 'VIDEO']
  },
  {
    sectionName: 'inc01',
    displayName: '섹션 1',
    description: '주요 시술 소개',
    maxBlocks: 5,
    allowedBlockTypes: ['TEXT', 'IMAGE', 'GRID', 'CAROUSEL']
  },
  {
    sectionName: 'inc02',
    displayName: '섹션 2',
    description: '서비스 카테고리',
    maxBlocks: 6,
    allowedBlockTypes: ['TEXT', 'IMAGE', 'BUTTON', 'GRID']
  },
  {
    sectionName: 'inc03',
    displayName: '섹션 3',
    description: '특별 프로모션',
    maxBlocks: 3,
    allowedBlockTypes: ['TEXT', 'IMAGE', 'BUTTON', 'HTML']
  },
  {
    sectionName: 'inc04',
    displayName: '섹션 4',
    description: '병원 소개',
    maxBlocks: 4,
    allowedBlockTypes: ['TEXT', 'IMAGE', 'VIDEO', 'GRID']
  },
  {
    sectionName: 'inc05',
    displayName: '섹션 5',
    description: '연락처/위치',
    maxBlocks: 3,
    allowedBlockTypes: ['TEXT', 'MAP', 'FORM', 'HTML']
  }
];

// Sortable 아이템 컴포넌트
const SortableBlock = ({ block, onEdit, onDelete, onSaveAsTemplate }: {
  block: ContentBlockData & { id: string };
  onEdit: () => void;
  onDelete: () => void;
  onSaveAsTemplate?: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded p-3 bg-white ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-move">
            <GripVertical size={20} className="text-gray-400" />
          </div>
          <div>
            <div className="font-medium">{block.name}</div>
            <div className="text-sm text-gray-500">
              {block.type} {block.isGlobal && <Globe size={14} className="inline ml-1" />}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <PermissionGate requiredActions={['MANAGE_TEMPLATES']}>
            {onSaveAsTemplate && (
              <Button size="sm" variant="ghost" onClick={onSaveAsTemplate} title="템플릿으로 저장">
                <Bookmark size={16} />
              </Button>
            )}
          </PermissionGate>
          <PermissionGate requiredActions={['EDIT_BLOCKS']}>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit2 size={16} />
            </Button>
          </PermissionGate>
          <PermissionGate requiredActions={['DELETE_BLOCKS']}>
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 size={16} />
            </Button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
};

export default function WebBuilderPage() {
  const searchParams = useSearchParams();
  const pageSlug = searchParams.get('page') || 'home';
  const sectionName = searchParams.get('section');

  const {
    user,
    loading,
    error,
    canViewWebBuilder,
    canCreateBlocks,
    canEditBlocks,
    canDeleteBlocks,
    canManagePages
  } = usePermissions();

  const [selectedSection, setSelectedSection] = useState(sectionName || 'main-banner');
  const [sectionBlocks, setSectionBlocks] = useState<Record<string, (ContentBlockData & { id: string })[]>>({});
  const [globalBlocks, setGlobalBlocks] = useState<(ContentBlockData & { id: string })[]>([]);
  const [editingBlock, setEditingBlock] = useState<ContentBlockData | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string | undefined>();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 페이지 블록 로드
  useEffect(() => {
    loadPageBlocks();
    loadGlobalBlocks();
  }, [pageSlug]);

  const loadPageBlocks = async () => {
    try {
      const response = await fetch(`/api/webbuilder/page-blocks?pageId=${pageSlug}`);
      const data = await response.json();
      if (data.success) {
        setSectionBlocks(data.data);
      }
    } catch (error) {
      console.error('Failed to load page blocks:', error);
    }
  };

  const loadGlobalBlocks = async () => {
    try {
      const response = await fetch('/api/webbuilder/blocks?global=true');
      const data = await response.json();
      if (data.success) {
        setGlobalBlocks(data.data);
      }
    } catch (error) {
      console.error('Failed to load global blocks:', error);
    }
  };

  const handleDragEnd = (event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSectionBlocks((prev) => {
        const oldIndex = prev[selectedSection].findIndex((item) => item.id === active.id);
        const newIndex = prev[selectedSection].findIndex((item) => item.id === over.id);

        return {
          ...prev,
          [selectedSection]: arrayMove(prev[selectedSection], oldIndex, newIndex)
        };
      });
    }
  };

  const createNewBlock = (type: BlockType) => {
    const newBlock: ContentBlockData = {
      name: `새 ${type} 블록`,
      type,
      content: getDefaultContent(type),
      isGlobal: false
    };
    setEditingBlock(newBlock);
  };

  const handleTemplateSelect = (template: BlockTemplateData) => {
    const newBlock: ContentBlockData = {
      name: template.name,
      type: template.templateData.type,
      content: template.templateData.content,
      styles: template.templateData.styles,
      settings: template.templateData.settings,
      isGlobal: false
    };
    setEditingBlock(newBlock);
    setShowTemplateGallery(false);
    setSelectedTemplateCategory(undefined);
  };

  const saveAsTemplate = async (block: ContentBlockData & { id: string }) => {
    try {
      const templateData = {
        name: `${block.name} 템플릿`,
        description: `${block.name}에서 생성된 템플릿`,
        category: 'OTHER',
        templateData: {
          type: block.type,
          content: block.content,
          styles: block.styles,
          settings: block.settings
        },
        isPublic: false,
        tags: [block.type.toLowerCase()]
      };

      const response = await fetch('/api/webbuilder/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      const data = await response.json();
      if (data.success) {
        alert('템플릿으로 저장되었습니다.');
      } else {
        alert('템플릿 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('템플릿 저장 중 오류가 발생했습니다.');
    }
  };

  const getDefaultContent = (type: BlockType): BlockContent => {
    switch (type) {
      case 'TEXT':
        return { type: 'TEXT', text: '', format: 'html' };
      case 'IMAGE':
        return { type: 'IMAGE', src: '', alt: '' };
      case 'BUTTON':
        return { type: 'BUTTON', text: '버튼', link: '#', variant: 'primary', size: 'medium' };
      case 'VIDEO':
        return { type: 'VIDEO', src: '', controls: true };
      case 'CAROUSEL':
        return { type: 'CAROUSEL', items: [], autoplay: false, interval: 5000 };
      case 'HTML':
        return { type: 'HTML', html: '' };
      case 'FORM':
        return { type: 'FORM', fields: [], submitText: '제출', method: 'POST' };
      case 'MAP':
        return { type: 'MAP', lat: 37.5665, lng: 126.9780, zoom: 15 };
      case 'GRID':
        return { type: 'GRID', columns: 3, gap: 16, items: [] };
      default:
        return { type: 'TEXT', text: '' };
    }
  };

  const saveBlock = async () => {
    if (!editingBlock) return;

    setIsSaving(true);
    try {
      const url = editingBlock.id ? `/api/webbuilder/blocks?id=${editingBlock.id}` : '/api/webbuilder/blocks';
      const method = editingBlock.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBlock)
      });

      const data = await response.json();
      if (data.success) {
        // 저장 후 페이지에 블록 추가
        if (!editingBlock.id && !editingBlock.isGlobal) {
          await addBlockToSection(data.data.id);
        }
        setEditingBlock(null);
        loadPageBlocks();
        loadGlobalBlocks();
      }
    } catch (error) {
      console.error('Failed to save block:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addBlockToSection = async (blockId: string) => {
    try {
      const response = await fetch('/api/webbuilder/page-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: pageSlug,
          blockId,
          sectionName: selectedSection
        })
      });

      const data = await response.json();
      if (data.success) {
        loadPageBlocks();
      }
    } catch (error) {
      console.error('Failed to add block to section:', error);
    }
  };

  const deleteBlock = async (blockId: string) => {
    if (confirm('이 블록을 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`/api/webbuilder/blocks?id=${blockId}`, {
          method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
          loadPageBlocks();
          loadGlobalBlocks();
        }
      } catch (error) {
        console.error('Failed to delete block:', error);
      }
    }
  };

  const savePageOrder = async () => {
    setIsSaving(true);
    try {
      const blocks = sectionBlocks[selectedSection] || [];
      const response = await fetch('/api/webbuilder/page-blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: pageSlug,
          sectionName: selectedSection,
          blocks: blocks.map((block, index) => ({
            blockId: block.id,
            order: index
          }))
        })
      });

      const data = await response.json();
      if (data.success) {
        // 자동 저장 모드가 아닐 때만 알림 표시
        if (!autoSaveEnabled) {
          alert('순서가 저장되었습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to save order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentSection = PAGE_SECTIONS.find(s => s.sectionName === selectedSection);
  const currentSectionBlocks = sectionBlocks[selectedSection] || [];

  // 자동 저장 설정
  const autoSaveStatus = useAutoSave(
    { sectionBlocks, selectedSection },
    {
      interval: 30000, // 30초마다 자동 저장
      debounceDelay: 2000, // 2초 디바운스
      enabled: autoSaveEnabled && !editingBlock && canManagePages, // 편집 중에는 비활성화, 권한 확인
      onSave: async () => {
        await savePageOrder();
      },
      onSuccess: () => {
        console.log('Auto-saved successfully');
      },
      onError: (error) => {
        console.error('Auto-save failed:', error);
      }
    }
  );

  // 로딩 중이거나 인증되지 않은 경우 처리
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">권한 확인 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <PermissionDenied message={error} />
      </div>
    );
  }

  if (!canViewWebBuilder) {
    return (
      <div className="container mx-auto p-6">
        <PermissionDenied action="VIEW_WEBBUILDER" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">웹빌더 - {pageSlug} 페이지</h1>
          <AutoSaveIndicator status={autoSaveStatus} />
        </div>
        <div className="flex gap-2">
          <PermissionGate requiredActions={['MANAGE_PAGES']}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            >
              <Settings size={16} className="mr-1" />
              {autoSaveEnabled ? '자동저장 켜짐' : '자동저장 꺼짐'}
            </Button>
          </PermissionGate>
          <Button
            variant={isPreviewMode ? 'default' : 'outline'}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye size={20} className="mr-2" />
            {isPreviewMode ? '편집 모드' : '미리보기'}
          </Button>
          <PermissionGate requiredActions={['MANAGE_PAGES']}>
            <Button onClick={savePageOrder} disabled={isSaving}>
              <Save size={20} className="mr-2" />
              수동 저장
            </Button>
          </PermissionGate>
        </div>
      </div>

      {editingBlock ? (
        <Card>
          <CardHeader>
            <CardTitle>블록 편집</CardTitle>
          </CardHeader>
          <CardContent>
            <BlockEditor
              block={editingBlock}
              onChange={setEditingBlock}
              onSave={saveBlock}
              onCancel={() => setEditingBlock(null)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>페이지 섹션</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedSection} onValueChange={setSelectedSection}>
                  <TabsList className="grid grid-cols-6 w-full">
                    {PAGE_SECTIONS.map((section) => (
                      <TabsTrigger key={section.sectionName} value={section.sectionName}>
                        {section.displayName}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {PAGE_SECTIONS.map((section) => (
                    <TabsContent key={section.sectionName} value={section.sectionName}>
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                          {section.description}
                          {section.maxBlocks && ` (최대 ${section.maxBlocks}개)`}
                        </div>

                        {currentSectionBlocks.length > 0 ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={currentSectionBlocks.map(b => b.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {currentSectionBlocks.map((block) => (
                                  <SortableBlock
                                    key={block.id}
                                    block={block}
                                    onEdit={() => setEditingBlock(block)}
                                    onDelete={() => deleteBlock(block.id)}
                                    onSaveAsTemplate={() => saveAsTemplate(block)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            이 섹션에 블록이 없습니다.
                          </div>
                        )}

                        <PermissionGate requiredActions={['CREATE_BLOCKS']}>
                          <div className="space-y-3">
                            <PermissionGate requiredActions={['MANAGE_TEMPLATES']}>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => setShowTemplateGallery(true)}
                                  disabled={section.maxBlocks ? currentSectionBlocks.length >= section.maxBlocks : false}
                                >
                                  <Layout size={16} className="mr-1" />
                                  템플릿에서 선택
                                </Button>
                              </div>
                            </PermissionGate>
                            <div className="flex gap-2 flex-wrap">
                              <div className="text-sm text-gray-500 w-full mb-1">또는 새 블록 생성:</div>
                              {section.allowedBlockTypes?.map((type) => (
                                <Button
                                  key={type}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => createNewBlock(type as BlockType)}
                                  disabled={section.maxBlocks ? currentSectionBlocks.length >= section.maxBlocks : false}
                                >
                                  <Plus size={16} className="mr-1" />
                                  {type} 추가
                                </Button>
                              ))}
                            </div>
                          </div>
                        </PermissionGate>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <PermissionGate requiredActions={['GLOBAL_BLOCKS']}>
              <Card>
                <CardHeader>
                  <CardTitle>전역 블록</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {globalBlocks.length > 0 ? (
                      globalBlocks.map((block) => (
                        <div key={block.id} className="border rounded p-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">{block.name}</div>
                              <div className="text-xs text-gray-500">{block.type}</div>
                            </div>
                            <PermissionGate requiredActions={['MANAGE_PAGES']}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addBlockToSection(block.id)}
                              >
                                <Plus size={16} />
                              </Button>
                            </PermissionGate>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        전역 블록이 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </PermissionGate>
          </div>
        </div>
      )}

      {showTemplateGallery && (
        <TemplateGallery
          onSelectTemplate={handleTemplateSelect}
          selectedCategory={selectedTemplateCategory}
          onClose={() => {
            setShowTemplateGallery(false);
            setSelectedTemplateCategory(undefined);
          }}
        />
      )}

      {isPreviewMode && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="container mx-auto p-6">
            <Button
              className="mb-4"
              onClick={() => setIsPreviewMode(false)}
            >
              편집 모드로 돌아가기
            </Button>
            <iframe
              src={`${process.env.NEXT_PUBLIC_STATIC_SITE_URL || 'http://localhost:8080'}/${pageSlug}.html?preview=true`}
              className="w-full h-screen border rounded"
              title="Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}