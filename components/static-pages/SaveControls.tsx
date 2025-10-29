'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface SaveControlsProps {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved?: Date;
  error?: string;
  onSave: () => void;
  onCancel: () => void;
}

const SaveControls: React.FC<SaveControlsProps> = ({
  isDirty,
  isSaving,
  lastSaved,
  error,
  onSave,
  onCancel
}) => {
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) {
      return '방금 전';
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}분 전`;
    } else if (diffSeconds < 86400) {
      return `${Math.floor(diffSeconds / 3600)}시간 전`;
    } else {
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="sticky top-0 z-10 border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* 왼쪽: 상태 표시 */}
        <div className="flex items-center gap-3">
          {isDirty && !isSaving && (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">저장되지 않은 변경사항</span>
            </div>
          )}

          {isSaving && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm font-medium">저장 중...</span>
            </div>
          )}

          {!isDirty && !isSaving && lastSaved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={16} />
              <span className="text-sm">
                마지막 저장: {formatLastSaved(lastSaved)}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* 오른쪽: 액션 버튼 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={!isDirty || isSaving}
            className="gap-2"
          >
            <X size={16} />
            취소
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                저장 중
              </>
            ) : (
              <>
                <Save size={16} />
                저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SaveControls;
