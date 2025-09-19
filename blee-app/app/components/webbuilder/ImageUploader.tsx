'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, Image as ImageIcon, Link2, Loader2 } from 'lucide-react';

interface ImageUploadResult {
  original: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

interface ImageUploaderProps {
  value?: string;
  onChange: (imageUrl: string, metadata?: ImageUploadResult['metadata']) => void;
  folder?: string;
  showOptimization?: boolean;
  acceptedFormats?: string[];
  maxSize?: number;
  className?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = '',
  onChange,
  folder = 'webbuilder',
  showOptimization = true,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [optimize, setOptimize] = useState(true);
  const [useUrl, setUseUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (!acceptedFormats.includes(file.type)) {
      return `지원하지 않는 파일 형식입니다. 허용된 형식: ${acceptedFormats.join(', ')}`;
    }

    if (file.size > maxSize) {
      return `파일 크기가 ${formatFileSize(maxSize)}를 초과합니다.`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      formData.append('optimize', optimize.toString());

      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 15, 85));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error(`업로드 실패: ${response.statusText}`);
      }

      const result: { success: boolean; data?: ImageUploadResult; error?: string } = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || '업로드 실패');
      }

      // Use optimized version if available, otherwise original
      const imageUrl = optimize && result.data.medium
        ? result.data.medium
        : result.data.original;

      onChange(imageUrl, result.data.metadata);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Mode Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={useUrl}
            onCheckedChange={setUseUrl}
            disabled={isUploading}
          />
          <Label>URL로 이미지 추가</Label>
        </div>

        {showOptimization && !useUrl && (
          <div className="flex items-center gap-2">
            <Switch
              checked={optimize}
              onCheckedChange={setOptimize}
              disabled={isUploading}
            />
            <Label>이미지 최적화</Label>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* URL Input Mode */}
      {useUrl ? (
        <div className="space-y-2">
          <Label htmlFor="image-url">이미지 URL</Label>
          <div className="flex gap-2">
            <Input
              id="image-url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={isUploading}
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || isUploading}
              size="sm"
            >
              <Link2 size={16} className="mr-1" />
              추가
            </Button>
          </div>
        </div>
      ) : (
        /* File Upload Mode */
        <div className="space-y-2">
          <Label>이미지 업로드</Label>

          {/* Drop Zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isUploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
              ${error ? 'border-red-300 bg-red-50' : ''}
            `}
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="text-sm text-gray-600">업로드 중...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                <p className="text-xs text-gray-500">{uploadProgress.toFixed(0)}%</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  클릭하거나 파일을 드래그하여 업로드
                </p>
                <p className="text-xs text-gray-500">
                  최대 {formatFileSize(maxSize)} • {acceptedFormats.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Image Preview */}
      {value && (
        <div className="space-y-2">
          <Label>현재 이미지</Label>
          <div className="relative inline-block">
            <img
              src={value}
              alt="Selected image"
              className="max-w-full max-h-48 rounded border bg-white"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemoveImage}
              disabled={isUploading}
            >
              <X size={12} />
            </Button>
          </div>
          <div className="text-xs text-gray-500 break-all">
            {value}
          </div>
        </div>
      )}

      {/* Upload Info */}
      {!useUrl && showOptimization && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 최적화 활성화 시 다음 크기로 자동 변환됩니다:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>썸네일: 150×150px (WebP)</li>
            <li>작은 크기: 320×240px (WebP)</li>
            <li>중간 크기: 800×600px (WebP) - 기본 사용</li>
            <li>큰 크기: 1920×1080px (WebP)</li>
            <li>원본: 업로드된 파일 그대로</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;