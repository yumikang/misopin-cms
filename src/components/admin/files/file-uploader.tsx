"use client";

import React, { useState, useCallback, useMemo, memo } from 'react';
import { X, Upload, FileText, Image, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface UploadingFile {
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploaderProps {
  onUploadComplete?: (files: any[]) => void;
  maxFiles?: number;
  maxSize?: number; // MB
  acceptedTypes?: string[];
}

const FileUploaderComponent: React.FC<FileUploaderProps> = ({
  onUploadComplete,
  maxFiles = 10,
  maxSize = 5,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx'],
}) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [category, setCategory] = useState<string>('general');
  const [description, setDescription] = useState<string>('');

  // 파일 아이콘 선택
  const getFileIcon = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      return Image;
    } else if (file.type === 'application/pdf') {
      return FileText;
    } else {
      return File;
    }
  }, []);

  // 파일 크기 포맷
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // 파일 유효성 검사
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `파일 크기가 ${maxSize}MB를 초과합니다.`;
    }
    return null;
  }, [maxSize]);

  // 파일 추가
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    if (files.length + fileArray.length > maxFiles) {
      toast.error(`최대 ${maxFiles}개 파일만 업로드할 수 있습니다.`);
      return;
    }

    const validFiles: UploadingFile[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        return;
      }

      const uploadingFile: UploadingFile = {
        file,
        progress: 0,
        status: 'pending',
      };

      // 이미지 파일인 경우 미리보기 생성
      if (file.type.startsWith('image/')) {
        uploadingFile.preview = URL.createObjectURL(file);
      }

      validFiles.push(uploadingFile);
    });

    setFiles(prev => [...prev, ...validFiles]);
  }, [files.length, maxFiles, validateFile]);

  // 파일 제거
  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const file = newFiles[index];

      // 미리보기 URL 정리
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }

      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  // 드래그 이벤트 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  // 파일 선택
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
  }, [addFiles]);

  // 업로드 실행
  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      toast.error('업로드할 파일이 없습니다.');
      return;
    }

    setIsUploading(true);
    const uploadedFiles = [];

    // 파일별로 진행 상태 업데이트
    for (let i = 0; i < files.length; i++) {
      const uploadingFile = files[i];

      // 상태를 uploading으로 변경
      setFiles(prev => {
        const newFiles = [...prev];
        newFiles[i].status = 'uploading';
        return newFiles;
      });

      const formData = new FormData();
      formData.append('files', uploadingFile.file);
      formData.append('category', category);
      if (description) {
        formData.append('description', description);
      }

      try {
        // 진행률 시뮬레이션 (실제로는 XMLHttpRequest 사용 필요)
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i].progress = 50;
          return newFiles;
        });

        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i].progress = 100;
          return newFiles;
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '업로드 실패');
        }

        const result = await response.json();
        uploadedFiles.push(...(result.files || []));

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i].status = 'success';
          return newFiles;
        });
      } catch (error) {
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i].status = 'error';
          newFiles[i].error = error instanceof Error ? error.message : '업로드 실패';
          return newFiles;
        });
      }
    }

    setIsUploading(false);

    if (uploadedFiles.length > 0) {
      toast.success(`${uploadedFiles.length}개 파일 업로드 성공`);
      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }

      // 성공한 파일들 제거
      setFiles(prev => prev.filter(f => f.status !== 'success'));
      setDescription('');
    }
  }, [files, category, description, onUploadComplete]);

  // 전체 진행률 계산
  const totalProgress = useMemo(() => {
    if (files.length === 0) return 0;
    const sum = files.reduce((acc, file) => acc + file.progress, 0);
    return Math.round(sum / files.length);
  }, [files]);

  return (
    <div className="space-y-4">
      {/* 설정 영역 */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">카테고리</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">일반</SelectItem>
                <SelectItem value="images">이미지</SelectItem>
                <SelectItem value="documents">문서</SelectItem>
                <SelectItem value="others">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">설명 (선택)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="파일에 대한 설명을 입력하세요"
              rows={3}
            />
          </div>
        </div>
      </Card>

      {/* 드래그 앤 드롭 영역 */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">
            파일을 드래그하여 놓거나 클릭하여 선택하세요
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            최대 {maxFiles}개, 파일당 최대 {maxSize}MB
          </p>
          <Input
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-input" className="cursor-pointer">
              파일 선택
            </label>
          </Button>
        </div>
      </Card>

      {/* 파일 목록 */}
      {files.length > 0 && (
        <Card className="p-4">
          <div className="space-y-2">
            {files.map((uploadingFile, index) => {
              const IconComponent = getFileIcon(uploadingFile.file);

              return (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50"
                >
                  {/* 미리보기 또는 아이콘 */}
                  {uploadingFile.preview ? (
                    <img
                      src={uploadingFile.preview}
                      alt={uploadingFile.file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <IconComponent className="w-8 h-8 text-gray-400" />
                  )}

                  {/* 파일 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadingFile.file.size)}
                    </p>

                    {/* 진행률 표시 */}
                    {uploadingFile.status === 'uploading' && (
                      <Progress value={uploadingFile.progress} className="h-1 mt-1" />
                    )}

                    {/* 에러 메시지 */}
                    {uploadingFile.error && (
                      <p className="text-xs text-red-500 mt-1">{uploadingFile.error}</p>
                    )}
                  </div>

                  {/* 상태 아이콘 */}
                  {uploadingFile.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {/* 삭제 버튼 */}
                  {uploadingFile.status !== 'uploading' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 업로드 버튼 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {files.length}개 파일 선택됨
            </div>
            <Button
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  업로드 중... {totalProgress}%
                </>
              ) : (
                '업로드'
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export const FileUploader = memo(FileUploaderComponent);