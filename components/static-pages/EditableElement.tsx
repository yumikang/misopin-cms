'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import ElementTipTapEditor from './ElementTipTapEditor';
import ElementImagePicker from './ElementImagePicker';
import { ParsedSection } from '@/lib/static-pages/types';

interface EditableElementProps {
  element: ParsedSection;
  onChange: (updatedElement: ParsedSection) => void;
}

const EditableElement: React.FC<EditableElementProps> = ({
  element,
  onChange
}) => {
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = useCallback((field: keyof ParsedSection, value: string) => {
    setIsDirty(true);
    onChange({
      ...element,
      [field]: value
    });
  }, [element, onChange]);

  useEffect(() => {
    // 외부에서 element가 변경되면 dirty 상태 초기화
    setIsDirty(false);
  }, [element.id]);

  const renderElementByType = () => {
    switch (element.type) {
      case 'text':
        return (
          <div>
            <Label htmlFor={`text-${element.id}`}>{element.label}</Label>
            <Input
              id={`text-${element.id}`}
              type="text"
              value={element.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder={element.label}
              className={isDirty ? 'border-yellow-400' : ''}
            />
          </div>
        );

      case 'html':
        return (
          <div>
            <Label>{element.label}</Label>
            <ElementTipTapEditor
              content={element.content || ''}
              onChange={(html) => handleChange('content', html)}
              placeholder={element.label}
            />
            {isDirty && (
              <p className="text-xs text-yellow-600 mt-1">변경사항이 저장되지 않았습니다</p>
            )}
          </div>
        );

      case 'image':
        return (
          <ElementImagePicker
            label={element.label}
            value={element.imageUrl || ''}
            onChange={(url) => handleChange('imageUrl', url)}
            alt={element.alt || ''}
            onAltChange={(alt) => handleChange('alt', alt)}
          />
        );

      case 'background':
        return (
          <ElementImagePicker
            label={`${element.label} (배경)`}
            value={element.imageUrl || ''}
            onChange={(url) => handleChange('imageUrl', url)}
          />
        );

      default:
        return (
          <div className="text-gray-500 text-sm">
            지원하지 않는 요소 타입: {element.type}
          </div>
        );
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-2">
        {renderElementByType()}

        {/* 미리보기 (선택사항) */}
        {element.preview && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">미리보기</summary>
            <div
              className="mt-2 p-2 bg-gray-50 rounded"
              dangerouslySetInnerHTML={{ __html: element.preview }}
            />
          </details>
        )}

        {/* 셀렉터 정보 */}
        <p className="text-xs text-gray-400">
          선택자: <code className="bg-gray-100 px-1 rounded">{element.selector}</code>
        </p>
      </div>
    </Card>
  );
};

export default EditableElement;
