'use client';

import React, { useState, useCallback, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ElementImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  alt?: string;
  onAltChange?: (alt: string) => void;
  label?: string;
}

const ElementImagePicker: React.FC<ElementImagePickerProps> = ({
  value,
  onChange,
  alt = '',
  onAltChange,
  label = '이미지'
}) => {
  const [urlInput, setUrlInput] = useState(value);
  const [isUploading, setIsUploading] = useState(false);

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  }, [urlInput, onChange]);

  const handleFileUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // FormData로 파일 업로드
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      if (data.url) {
        onChange(data.url);
        setUrlInput(data.url);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [onChange]);

  const handleRemove = useCallback(() => {
    onChange('');
    setUrlInput('');
  }, [onChange]);

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* 현재 이미지 미리보기 */}
      {value && (
        <div className="relative rounded-md border overflow-hidden">
          <img
            src={value}
            alt={alt || label}
            className="w-full h-48 object-cover"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            type="button"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {/* 이미지 없을 때 플레이스홀더 */}
      {!value && (
        <div className="border-2 border-dashed rounded-md p-8 text-center">
          <ImageIcon className="mx-auto mb-2 text-gray-400" size={48} />
          <p className="text-sm text-gray-500">이미지를 선택하세요</p>
        </div>
      )}

      {/* URL 입력 */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="이미지 URL 입력"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleUrlSubmit();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleUrlSubmit}
          disabled={!urlInput.trim()}
        >
          적용
        </Button>
      </div>

      {/* 파일 업로드 */}
      <div className="flex items-center gap-2">
        <Label
          htmlFor={`file-upload-${label}`}
          className="flex-1 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 border rounded-md p-2 hover:bg-gray-50">
            <Upload size={16} />
            <span className="text-sm">
              {isUploading ? '업로드 중...' : '파일 업로드'}
            </span>
          </div>
          <input
            id={`file-upload-${label}`}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </Label>
      </div>

    </div>
  );
};

export default ElementImagePicker;
