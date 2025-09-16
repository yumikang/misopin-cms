"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, RotateCcw, Upload, Plus, Trash2, Info } from "lucide-react";
import { getSettingsByCategory } from "@/lib/settings-definitions";

interface UploadSettingsProps {
  settings: Record<string, any>;
  onSave: (settings: Array<{ key: string; value: any }>) => Promise<void>;
  saving: boolean;
}

interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
}

export function UploadSettings({ settings, onSave, saving }: UploadSettingsProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [thumbnailSizes, setThumbnailSizes] = useState<ThumbnailSize[]>([]);

  const uploadSettingDefinitions = getSettingsByCategory("upload");

  // 폼 데이터 초기화
  useEffect(() => {
    const initialData: Record<string, any> = {};
    uploadSettingDefinitions.forEach((def) => {
      initialData[def.key] = settings[def.key] ?? def.defaultValue;
    });
    setFormData(initialData);
    setThumbnailSizes(initialData.thumbnailSizes || []);
    setHasChanges(false);
  }, [settings]);

  // 값 변경 핸들러
  const handleChange = (key: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };

      // 변경사항 감지
      const hasChangesNow = uploadSettingDefinitions.some((def) => {
        const originalValue = settings[def.key] ?? def.defaultValue;
        const currentValue = updated[def.key];
        return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
      });

      setHasChanges(hasChangesNow);
      return updated;
    });
  };

  // 배열 값 변경 핸들러
  const handleArrayChange = (key: string, value: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    handleChange(key, arrayValue);
  };

  // 썸네일 크기 추가
  const addThumbnailSize = () => {
    const newSize: ThumbnailSize = { name: '', width: 150, height: 150 };
    const updatedSizes = [...thumbnailSizes, newSize];
    setThumbnailSizes(updatedSizes);
    handleChange('thumbnailSizes', updatedSizes);
  };

  // 썸네일 크기 삭제
  const removeThumbnailSize = (index: number) => {
    const updatedSizes = thumbnailSizes.filter((_, i) => i !== index);
    setThumbnailSizes(updatedSizes);
    handleChange('thumbnailSizes', updatedSizes);
  };

  // 썸네일 크기 수정
  const updateThumbnailSize = (index: number, field: keyof ThumbnailSize, value: string | number) => {
    const updatedSizes = thumbnailSizes.map((size, i) =>
      i === index ? { ...size, [field]: value } : size
    );
    setThumbnailSizes(updatedSizes);
    handleChange('thumbnailSizes', updatedSizes);
  };

  // 저장
  const handleSave = async () => {
    try {
      const settingsToSave = uploadSettingDefinitions.map((def) => ({
        key: def.key,
        value: formData[def.key],
      }));

      await onSave(settingsToSave);
      setHasChanges(false);
    } catch (error) {
      // 에러는 부모 컴포넌트에서 처리
    }
  };

  // 초기화
  const handleReset = () => {
    const resetData: Record<string, any> = {};
    uploadSettingDefinitions.forEach((def) => {
      resetData[def.key] = settings[def.key] ?? def.defaultValue;
    });
    setFormData(resetData);
    setThumbnailSizes(resetData.thumbnailSizes || []);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          파일 업로드 설정을 변경하면 새로 업로드되는 파일부터 적용됩니다.
          기존 업로드된 파일에는 영향을 주지 않습니다.
        </AlertDescription>
      </Alert>

      {/* 파일 크기 및 형식 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">파일 업로드 제한</h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 최대 파일 크기 */}
          <div className="space-y-2">
            <Label htmlFor="maxFileSize">
              최대 파일 크기 (MB)
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="maxFileSize"
              type="number"
              min="1"
              max="100"
              value={formData.maxFileSize || ""}
              onChange={(e) => handleChange("maxFileSize", parseInt(e.target.value) || 10)}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              업로드 가능한 최대 파일 크기입니다. (1MB ~ 100MB)
            </p>
          </div>

          {/* 업로드 경로 */}
          <div className="space-y-2">
            <Label htmlFor="uploadPath">
              업로드 경로
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="uploadPath"
              value={formData.uploadPath || ""}
              onChange={(e) => handleChange("uploadPath", e.target.value)}
              placeholder="/uploads"
            />
            <p className="text-xs text-muted-foreground">
              파일이 저장될 기본 경로입니다.
            </p>
          </div>

          {/* 허용 이미지 형식 */}
          <div className="space-y-2">
            <Label htmlFor="allowedImageTypes">허용 이미지 형식</Label>
            <Input
              id="allowedImageTypes"
              value={Array.isArray(formData.allowedImageTypes) ? formData.allowedImageTypes.join(', ') : ""}
              onChange={(e) => handleArrayChange("allowedImageTypes", e.target.value)}
              placeholder="jpg, jpeg, png, gif, webp"
            />
            <p className="text-xs text-muted-foreground">
              업로드 가능한 이미지 파일 형식입니다. (쉼표로 구분)
            </p>
          </div>

          {/* 허용 문서 형식 */}
          <div className="space-y-2">
            <Label htmlFor="allowedDocumentTypes">허용 문서 형식</Label>
            <Input
              id="allowedDocumentTypes"
              value={Array.isArray(formData.allowedDocumentTypes) ? formData.allowedDocumentTypes.join(', ') : ""}
              onChange={(e) => handleArrayChange("allowedDocumentTypes", e.target.value)}
              placeholder="pdf, doc, docx, xls, xlsx"
            />
            <p className="text-xs text-muted-foreground">
              업로드 가능한 문서 파일 형식입니다. (쉼표로 구분)
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* 이미지 처리 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">이미지 처리</h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 이미지 압축 */}
          <div className="flex items-center space-x-2">
            <Switch
              id="enableImageCompression"
              checked={formData.enableImageCompression || false}
              onCheckedChange={(checked) => handleChange("enableImageCompression", checked)}
            />
            <div className="space-y-1">
              <Label htmlFor="enableImageCompression">이미지 자동 압축</Label>
              <p className="text-xs text-muted-foreground">
                업로드된 이미지를 자동으로 압축합니다.
              </p>
            </div>
          </div>

          {/* 이미지 품질 */}
          {formData.enableImageCompression && (
            <div className="space-y-2">
              <Label htmlFor="imageQuality">이미지 품질 (1-100)</Label>
              <Input
                id="imageQuality"
                type="number"
                min="1"
                max="100"
                value={formData.imageQuality || ""}
                onChange={(e) => handleChange("imageQuality", parseInt(e.target.value) || 80)}
                placeholder="80"
              />
              <p className="text-xs text-muted-foreground">
                압축된 이미지의 품질입니다. (높을수록 용량 증가)
              </p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* 썸네일 설정 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">썸네일 크기 설정</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addThumbnailSize}
          >
            <Plus className="h-4 w-4 mr-2" />
            크기 추가
          </Button>
        </div>

        <div className="space-y-4">
          {thumbnailSizes.map((size, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">썸네일 #{index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeThumbnailSize(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`thumbnail-name-${index}`}>이름</Label>
                    <Input
                      id={`thumbnail-name-${index}`}
                      value={size.name}
                      onChange={(e) => updateThumbnailSize(index, 'name', e.target.value)}
                      placeholder="small"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`thumbnail-width-${index}`}>너비</Label>
                    <Input
                      id={`thumbnail-width-${index}`}
                      type="number"
                      min="1"
                      value={size.width}
                      onChange={(e) => updateThumbnailSize(index, 'width', parseInt(e.target.value) || 150)}
                      placeholder="150"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`thumbnail-height-${index}`}>높이</Label>
                    <Input
                      id={`thumbnail-height-${index}`}
                      type="number"
                      min="1"
                      value={size.height}
                      onChange={(e) => updateThumbnailSize(index, 'height', parseInt(e.target.value) || 150)}
                      placeholder="150"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {thumbnailSizes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              설정된 썸네일 크기가 없습니다. "크기 추가" 버튼을 클릭하여 추가하세요.
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between">
        <div>
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600">
              저장되지 않은 변경사항이 있습니다
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={saving || !hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            초기화
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}