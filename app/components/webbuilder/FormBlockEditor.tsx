'use client';

import React, { useState } from 'react';
import { FormBlockContent } from '@/app/types/webbuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Settings } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FormFieldConfig {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'file';
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: string;
    max?: string;
  };
  options?: Array<{ value: string; label: string }>;
  width?: 'full' | 'half' | 'third';
}

interface FormBlockEditorProps {
  content: FormBlockContent;
  onChange: (content: FormBlockContent) => void;
}

// Sortable Form Field Component
const SortableFormField = ({
  field,
  onEdit,
  onDelete
}: {
  field: FormFieldConfig;
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
  } = useSortable({ id: field.id });

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
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <div {...attributes} {...listeners} className="cursor-move mt-1">
            <GripVertical size={16} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{field.label}</div>
            <div className="text-sm text-gray-500">
              {field.type} - {field.name}
              {field.required && ' (필수)'}
            </div>
          </div>
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
    </div>
  );
};

const FormBlockEditor: React.FC<FormBlockEditorProps> = ({ content, onChange }) => {
  const [editingField, setEditingField] = useState<FormFieldConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = content.fields.findIndex((field) => field.id === String(active.id));
      const newIndex = content.fields.findIndex((field) => field.id === String(over.id));

      onChange({
        ...content,
        fields: arrayMove(content.fields, oldIndex, newIndex)
      });
    }
  };

  const createNewField = (): FormFieldConfig => ({
    id: `field_${Date.now()}`,
    name: '',
    label: '새 필드',
    type: 'text',
    required: false,
    width: 'full'
  });

  const handleFieldUpdate = (field: FormFieldConfig) => {
    if (field.name === '') {
      field.name = field.label.toLowerCase().replace(/\s+/g, '_');
    }

    const fields = editingField?.id
      ? content.fields.map(f => f.id === field.id ? field : f)
      : [...content.fields, field];

    onChange({ ...content, fields });
    setEditingField(null);
    setIsCreating(false);
  };

  const handleFieldDelete = (fieldId: string) => {
    onChange({
      ...content,
      fields: content.fields.filter(f => f.id !== fieldId)
    });
  };

  const handleFormSettingsChange = (key: keyof FormBlockContent, value: unknown) => {
    onChange({ ...content, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Form Settings */}
      <div className="space-y-4 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold">폼 설정</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="form-action">Action URL</Label>
            <Input
              id="form-action"
              value={content.action || ''}
              onChange={(e) => handleFormSettingsChange('action', e.target.value)}
              placeholder="/api/submit"
            />
          </div>

          <div>
            <Label htmlFor="form-method">Method</Label>
            <Select
              value={content.method}
              onValueChange={(value) => handleFormSettingsChange('method', value)}
            >
              <SelectTrigger id="form-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="submit-text">제출 버튼 텍스트</Label>
            <Input
              id="submit-text"
              value={content.submitText || '제출'}
              onChange={(e) => handleFormSettingsChange('submitText', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="success-message">성공 메시지</Label>
            <Input
              id="success-message"
              value={content.successMessage || ''}
              onChange={(e) => handleFormSettingsChange('successMessage', e.target.value)}
              placeholder="제출이 완료되었습니다"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-validation"
              checked={content.showValidation || false}
              onCheckedChange={(checked) => handleFormSettingsChange('showValidation', checked)}
            />
            <Label htmlFor="show-validation">실시간 유효성 검사</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="ajax-submit"
              checked={content.ajaxSubmit || false}
              onCheckedChange={(checked) => handleFormSettingsChange('ajaxSubmit', checked)}
            />
            <Label htmlFor="ajax-submit">AJAX 제출</Label>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">폼 필드</h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingField(createNewField());
              setIsCreating(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            필드 추가
          </Button>
        </div>

        {content.fields.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={content.fields.map(f => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {content.fields.map((field) => (
                  <SortableFormField
                    key={field.id}
                    field={field}
                    onEdit={() => setEditingField(field)}
                    onDelete={() => handleFieldDelete(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center py-8 text-gray-500 border rounded">
            폼 필드가 없습니다. 필드를 추가해주세요.
          </div>
        )}
      </div>

      {/* Field Editor Modal */}
      {editingField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {isCreating ? '필드 추가' : '필드 편집'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>필드 라벨</Label>
                  <Input
                    value={editingField.label}
                    onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                    placeholder="이름"
                  />
                </div>

                <div>
                  <Label>필드 이름 (name)</Label>
                  <Input
                    value={editingField.name}
                    onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                    placeholder="name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>필드 타입</Label>
                  <Select
                    value={editingField.type}
                    onValueChange={(value: FormFieldConfig['type']) =>
                      setEditingField({ ...editingField, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">텍스트</SelectItem>
                      <SelectItem value="email">이메일</SelectItem>
                      <SelectItem value="tel">전화번호</SelectItem>
                      <SelectItem value="textarea">텍스트영역</SelectItem>
                      <SelectItem value="select">선택목록</SelectItem>
                      <SelectItem value="checkbox">체크박스</SelectItem>
                      <SelectItem value="radio">라디오버튼</SelectItem>
                      <SelectItem value="date">날짜</SelectItem>
                      <SelectItem value="time">시간</SelectItem>
                      <SelectItem value="file">파일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>너비</Label>
                  <Select
                    value={editingField.width || 'full'}
                    onValueChange={(value) =>
                      setEditingField({ ...editingField, width: value as FormFieldConfig['width'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">전체 너비</SelectItem>
                      <SelectItem value="half">절반 너비</SelectItem>
                      <SelectItem value="third">1/3 너비</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>플레이스홀더</Label>
                <Input
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  placeholder="입력 안내 텍스트"
                />
              </div>

              {(editingField.type === 'select' || editingField.type === 'radio' || editingField.type === 'checkbox') && (
                <div>
                  <Label>옵션 (한 줄에 하나씩)</Label>
                  <textarea
                    className="w-full p-2 border rounded min-h-[100px]"
                    value={editingField.options?.map(opt => `${opt.value}:${opt.label}`).join('\n') || ''}
                    onChange={(e) => {
                      const options = e.target.value.split('\n')
                        .filter(line => line.trim())
                        .map(line => {
                          const [value, label] = line.split(':');
                          return { value: value || '', label: label || value || '' };
                        });
                      setEditingField({ ...editingField, options });
                    }}
                    placeholder="value1:라벨1&#10;value2:라벨2"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingField.required}
                  onCheckedChange={(checked) => setEditingField({ ...editingField, required: checked })}
                />
                <Label>필수 필드</Label>
              </div>

              {/* Validation Settings */}
              {(editingField.type === 'text' || editingField.type === 'email' || editingField.type === 'tel' || editingField.type === 'textarea') && (
                <div className="space-y-2 p-3 border rounded bg-gray-50">
                  <Label>유효성 검사</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {editingField.type === 'text' && (
                      <Input
                        placeholder="정규식 패턴"
                        value={editingField.validation?.pattern || ''}
                        onChange={(e) => setEditingField({
                          ...editingField,
                          validation: { ...editingField.validation, pattern: e.target.value }
                        })}
                      />
                    )}
                    <Input
                      type="number"
                      placeholder="최소 길이"
                      value={editingField.validation?.minLength || ''}
                      onChange={(e) => setEditingField({
                        ...editingField,
                        validation: { ...editingField.validation, minLength: parseInt(e.target.value) || undefined }
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="최대 길이"
                      value={editingField.validation?.maxLength || ''}
                      onChange={(e) => setEditingField({
                        ...editingField,
                        validation: { ...editingField.validation, maxLength: parseInt(e.target.value) || undefined }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingField(null);
                  setIsCreating(false);
                }}
              >
                취소
              </Button>
              <Button onClick={() => handleFieldUpdate(editingField)}>
                {isCreating ? '추가' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBlockEditor;