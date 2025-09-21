'use client';

import React, { useState } from 'react';
import ImageUploader from '@/app/components/webbuilder/ImageUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestUploadPage() {
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [metadata, setMetadata] = useState<{ width: number; height: number; format: string; size: number } | null>(null);

  const handleImageChange = (imageUrl: string, imageMetadata?: { width: number; height: number; format: string; size: number }) => {
    setUploadedImage(imageUrl);
    if (imageMetadata) {
      setMetadata(imageMetadata);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">이미지 업로드 테스트</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>이미지 업로드</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader
              value={uploadedImage}
              onChange={handleImageChange}
              folder="test-uploads"
              showOptimization={true}
            />
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>업로드 결과</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedImage ? (
              <div className="space-y-4">
                <div>
                  <img
                    src={uploadedImage}
                    alt="업로드된 이미지"
                    className="max-w-full max-h-64 rounded border bg-white object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>

                {metadata && (
                  <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                    <h4 className="font-semibold">메타데이터:</h4>
                    <ul className="space-y-1">
                      <li><span className="font-medium">크기:</span> {metadata.width} × {metadata.height}px</li>
                      <li><span className="font-medium">형식:</span> {metadata.format?.toUpperCase()}</li>
                      <li><span className="font-medium">파일 크기:</span> {formatFileSize(metadata.size)}</li>
                    </ul>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded text-sm">
                  <h4 className="font-semibold mb-2">업로드된 URL:</h4>
                  <code className="text-xs break-all bg-white p-2 rounded block">
                    {uploadedImage}
                  </code>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                이미지를 업로드하면 여기에 표시됩니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>테스트 가이드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold">파일 업로드 테스트:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>드래그 앤 드롭으로 이미지 파일을 업로드해보세요</li>
                <li>클릭하여 파일 선택기를 열어보세요</li>
                <li>최적화 옵션을 켜고 끄며 결과를 비교해보세요</li>
                <li>지원 형식: JPEG, PNG, WebP, GIF (최대 10MB)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">URL 입력 테스트:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>URL 모드를 활성화하고 외부 이미지 URL을 입력해보세요</li>
                <li>예시: https://picsum.photos/800/600</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">예상 동작:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>최적화 활성화 시: 여러 크기로 변환 후 medium 크기 사용</li>
                <li>최적화 비활성화 시: 원본 파일 그대로 사용</li>
                <li>업로드 진행률 표시</li>
                <li>에러 발생 시 적절한 에러 메시지 표시</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}