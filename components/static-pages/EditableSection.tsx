'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import EditableElement from './EditableElement';
import { ParsedSection } from '@/lib/static-pages/types';

interface EditableSectionProps {
  sectionName: string;
  elements: ParsedSection[];
  onElementChange: (index: number, updatedElement: ParsedSection) => void;
  defaultExpanded?: boolean;
}

const EditableSection: React.FC<EditableSectionProps> = ({
  sectionName,
  elements,
  onElementChange,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden">
      {/* 섹션 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        type="button"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-600" />
          ) : (
            <ChevronRight size={20} className="text-gray-600" />
          )}
          <h3 className="font-semibold text-lg">{sectionName}</h3>
          <span className="text-sm text-gray-500">
            ({elements.length}개 요소)
          </span>
        </div>
      </button>

      {/* 섹션 콘텐츠 */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {elements.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              편집 가능한 요소가 없습니다
            </p>
          ) : (
            elements.map((element, index) => (
              <EditableElement
                key={element.id}
                element={element}
                onChange={(updated) => onElementChange(index, updated)}
              />
            ))
          )}
        </div>
      )}
    </Card>
  );
};

export default EditableSection;
