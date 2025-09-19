'use client';

import React, { useState } from 'react';
import { GridBlockContent, BlockContent } from '@/app/types/webbuilder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Grid, Settings } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GridBlockEditorProps {
  content: GridBlockContent;
  onChange: (content: GridBlockContent) => void;
}

interface GridItem {
  id: string;
  content: BlockContent;
  span?: number;
  rowSpan?: number;
  className?: string;
}

// Sortable Grid Item Component
const SortableGridItem = ({
  item,
  // columns, // Reserved for future use
  onEdit,
  onDelete
}: {
  item: GridItem;
  columns: number;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${item.span || 1}`,
    gridRow: item.rowSpan ? `span ${item.rowSpan}` : undefined
  };

  const getContentPreview = (content: BlockContent): string => {
    switch (content.type) {
      case 'TEXT':
        return content.text ? `텍스트: ${content.text.substring(0, 30)}...` : '빈 텍스트';
      case 'IMAGE':
        return content.src ? `이미지: ${content.alt || content.src}` : '빈 이미지';
      case 'BUTTON':
        return `버튼: ${content.text}`;
      case 'VIDEO':
        return content.src ? `비디오: ${content.src}` : '빈 비디오';
      case 'HTML':
        return content.html ? '사용자 HTML' : '빈 HTML';
      default:
        return content.type;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-2 border-dashed border-gray-300 rounded p-4 bg-white hover:border-blue-400 ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <div {...attributes} {...listeners} className="cursor-move">
            <Grid size={16} className="text-gray-400" />
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Settings size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">{item.content.type}</div>
          <div className="text-xs text-gray-500">{getContentPreview(item.content)}</div>
          {(item.span && item.span > 1) && (
            <div className="text-xs text-blue-600 mt-1">열 {item.span}개</div>
          )}
          {(item.rowSpan && item.rowSpan > 1) && (
            <div className="text-xs text-green-600">행 {item.rowSpan}개</div>
          )}
        </div>
      </div>
    </div>
  );
};

const GridBlockEditor: React.FC<GridBlockEditorProps> = ({ content, onChange }) => {
  const [editingItem, setEditingItem] = useState<GridItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // GridBlockContent의 items를 GridItem 형식으로 변환
  const getGridItems = (): GridItem[] => {
    return content.items.map((item, index) => ({
      id: `item_${index}`,
      content: item.content,
      span: item.span,
      rowSpan: item.rowSpan,
      className: item.className
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = getGridItems();
      const oldIndex = items.findIndex((item) => item.id === String(active.id));
      const newIndex = items.findIndex((item) => item.id === String(over.id));

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      onChange({
        ...content,
        items: reorderedItems.map(item => ({
          content: item.content,
          span: item.span,
          rowSpan: item.rowSpan,
          className: item.className
        }))
      });
    }
  };

  const createNewItem = (): GridItem => ({
    id: `item_${Date.now()}`,
    content: { type: 'TEXT', text: '', format: 'html' },
    span: 1
  });

  const handleItemUpdate = (item: GridItem) => {
    const items = getGridItems();
    let updatedItems: GridItem[];

    if (editingItem && items.find(i => i.id === editingItem.id)) {
      updatedItems = items.map(i => i.id === item.id ? item : i);
    } else {
      updatedItems = [...items, item];
    }

    onChange({
      ...content,
      items: updatedItems.map(item => ({
        content: item.content,
        span: item.span,
        rowSpan: item.rowSpan,
        className: item.className
      }))
    });

    setEditingItem(null);
    setIsCreating(false);
  };

  const handleItemDelete = (itemId: string) => {
    const items = getGridItems();
    const filteredItems = items.filter(i => i.id !== itemId);

    onChange({
      ...content,
      items: filteredItems.map(item => ({
        content: item.content,
        span: item.span,
        rowSpan: item.rowSpan,
        className: item.className
      }))
    });
  };

  const handleGridSettingsChange = <K extends keyof GridBlockContent>(
    key: K,
    value: GridBlockContent[K]
  ) => {
    onChange({ ...content, [key]: value });
  };

  const gridItems = getGridItems();

  return (
    <div className="space-y-6">
      {/* Grid Settings */}
      <div className="space-y-4 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold">그리드 설정</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="grid-columns">열 개수</Label>
            <Input
              id="grid-columns"
              type="number"
              min="1"
              max="12"
              value={content.columns}
              onChange={(e) => handleGridSettingsChange('columns', parseInt(e.target.value) || 1)}
            />
          </div>

          <div>
            <Label htmlFor="grid-gap">간격 (px)</Label>
            <Input
              id="grid-gap"
              type="number"
              min="0"
              value={content.gap || 16}
              onChange={(e) => handleGridSettingsChange('gap', parseInt(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="grid-rows">행 개수 (선택)</Label>
            <Input
              id="grid-rows"
              type="number"
              min="1"
              value={content.rows || ''}
              onChange={(e) => handleGridSettingsChange('rows', parseInt(e.target.value) || undefined)}
              placeholder="자동"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="align-items">세로 정렬</Label>
            <Select
              value={content.alignItems || 'stretch'}
              onValueChange={(value) => handleGridSettingsChange('alignItems', value)}
            >
              <SelectTrigger id="align-items">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">상단</SelectItem>
                <SelectItem value="center">중앙</SelectItem>
                <SelectItem value="end">하단</SelectItem>
                <SelectItem value="stretch">늘리기</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="justify-items">가로 정렬</Label>
            <Select
              value={content.justifyItems || 'stretch'}
              onValueChange={(value) => handleGridSettingsChange('justifyItems', value)}
            >
              <SelectTrigger id="justify-items">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">왼쪽</SelectItem>
                <SelectItem value="center">중앙</SelectItem>
                <SelectItem value="end">오른쪽</SelectItem>
                <SelectItem value="stretch">늘리기</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="grid-class">추가 CSS 클래스</Label>
          <Input
            id="grid-class"
            value={content.className || ''}
            onChange={(e) => handleGridSettingsChange('className', e.target.value)}
            placeholder="custom-grid-class"
          />
        </div>
      </div>

      {/* Grid Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">그리드 아이템</h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(createNewItem());
              setIsCreating(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            아이템 추가
          </Button>
        </div>

        {/* Grid Preview */}
        <div className="p-4 border rounded bg-gray-50">
          <Label>미리보기</Label>
          {gridItems.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={gridItems.map(i => i.id)}
                strategy={rectSortingStrategy}
              >
                <div
                  className="mt-2 grid"
                  style={{
                    gridTemplateColumns: `repeat(${content.columns}, 1fr)`,
                    gap: `${content.gap || 16}px`,
                    gridTemplateRows: content.rows ? `repeat(${content.rows}, minmax(100px, 1fr))` : undefined
                  }}
                >
                  {gridItems.map((item) => (
                    <SortableGridItem
                      key={item.id}
                      item={item}
                      columns={content.columns}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => handleItemDelete(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded mt-2">
              그리드 아이템이 없습니다. 아이템을 추가해주세요.
            </div>
          )}
        </div>
      </div>

      {/* Item Editor Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {isCreating ? '아이템 추가' : '아이템 편집'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>콘텐츠 타입</Label>
                  <Select
                    value={editingItem.content.type}
                    onValueChange={(value: BlockContent['type']) => {
                      let newContent: BlockContent;
                      switch (value) {
                        case 'TEXT':
                          newContent = { type: 'TEXT', text: '', format: 'html' };
                          break;
                        case 'IMAGE':
                          newContent = { type: 'IMAGE', src: '', alt: '' };
                          break;
                        case 'BUTTON':
                          newContent = { type: 'BUTTON', text: '버튼', link: '#' };
                          break;
                        case 'VIDEO':
                          newContent = { type: 'VIDEO', src: '' };
                          break;
                        case 'HTML':
                          newContent = { type: 'HTML', html: '' };
                          break;
                        default:
                          newContent = { type: 'TEXT', text: '' };
                      }
                      setEditingItem({ ...editingItem, content: newContent });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">텍스트</SelectItem>
                      <SelectItem value="IMAGE">이미지</SelectItem>
                      <SelectItem value="BUTTON">버튼</SelectItem>
                      <SelectItem value="VIDEO">비디오</SelectItem>
                      <SelectItem value="HTML">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>열 크기 (1-{content.columns})</Label>
                  <Input
                    type="number"
                    min="1"
                    max={content.columns}
                    value={editingItem.span || 1}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      span: parseInt(e.target.value) || 1
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>행 크기 (선택)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingItem.rowSpan || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      rowSpan: parseInt(e.target.value) || undefined
                    })}
                    placeholder="1"
                  />
                </div>

                <div>
                  <Label>CSS 클래스</Label>
                  <Input
                    value={editingItem.className || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      className: e.target.value
                    })}
                    placeholder="custom-class"
                  />
                </div>
              </div>

              {/* Content-specific fields */}
              <div className="p-4 border rounded bg-gray-50">
                <Label>콘텐츠 설정</Label>
                {editingItem.content.type === 'TEXT' && (
                  <textarea
                    className="w-full mt-2 p-2 border rounded min-h-[100px]"
                    value={(editingItem.content as { text?: string }).text || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      content: { ...editingItem.content, text: e.target.value } as BlockContent
                    })}
                    placeholder="텍스트 내용을 입력하세요"
                  />
                )}

                {editingItem.content.type === 'IMAGE' && (
                  <div className="space-y-2 mt-2">
                    <Input
                      placeholder="이미지 URL"
                      value={(editingItem.content as { src?: string }).src || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        content: { ...editingItem.content, src: e.target.value } as BlockContent
                      })}
                    />
                    <Input
                      placeholder="대체 텍스트"
                      value={(editingItem.content as { alt?: string }).alt || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        content: { ...editingItem.content, alt: e.target.value } as BlockContent
                      })}
                    />
                  </div>
                )}

                {editingItem.content.type === 'BUTTON' && (
                  <div className="space-y-2 mt-2">
                    <Input
                      placeholder="버튼 텍스트"
                      value={(editingItem.content as { text?: string }).text || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        content: { ...editingItem.content, text: e.target.value } as BlockContent
                      })}
                    />
                    <Input
                      placeholder="링크 URL"
                      value={(editingItem.content as { link?: string }).link || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        content: { ...editingItem.content, link: e.target.value } as BlockContent
                      })}
                    />
                  </div>
                )}

                {editingItem.content.type === 'VIDEO' && (
                  <Input
                    className="mt-2"
                    placeholder="비디오 URL"
                    value={(editingItem.content as { src?: string }).src || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      content: { ...editingItem.content, src: e.target.value } as BlockContent
                    })}
                  />
                )}

                {editingItem.content.type === 'HTML' && (
                  <textarea
                    className="w-full mt-2 p-2 border rounded min-h-[100px] font-mono text-sm"
                    value={(editingItem.content as { html?: string }).html || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      content: { ...editingItem.content, html: e.target.value } as BlockContent
                    })}
                    placeholder="<div>HTML 코드를 입력하세요</div>"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingItem(null);
                  setIsCreating(false);
                }}
              >
                취소
              </Button>
              <Button onClick={() => handleItemUpdate(editingItem)}>
                {isCreating ? '추가' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GridBlockEditor;