"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";
import { getSettingsByCategory, getSettingDefinition } from "@/lib/settings-definitions";

interface GeneralSettingsProps {
  settings: Record<string, any>;
  onSave: (settings: Array<{ key: string; value: any }>) => Promise<void>;
  saving: boolean;
}

export function GeneralSettings({ settings, onSave, saving }: GeneralSettingsProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const generalSettingDefinitions = getSettingsByCategory("general");

  // 폼 데이터 초기화
  useEffect(() => {
    const initialData: Record<string, any> = {};
    generalSettingDefinitions.forEach((def) => {
      initialData[def.key] = settings[def.key] ?? def.defaultValue;
    });
    setFormData(initialData);
    setHasChanges(false);
  }, [settings]);

  // 값 변경 핸들러
  const handleChange = (key: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };

      // 변경사항 감지
      const hasChangesNow = generalSettingDefinitions.some((def) => {
        const originalValue = settings[def.key] ?? def.defaultValue;
        const currentValue = updated[def.key];
        return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
      });

      setHasChanges(hasChangesNow);
      return updated;
    });
  };

  // 운영시간 변경 핸들러
  const handleOperatingHoursChange = (type: 'weekdays' | 'weekends', value: string) => {
    const operatingHours = formData.operatingHours || { weekdays: '', weekends: '' };
    handleChange('operatingHours', {
      ...operatingHours,
      [type]: value,
    });
  };

  // 저장
  const handleSave = async () => {
    try {
      const settingsToSave = generalSettingDefinitions.map((def) => ({
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
    generalSettingDefinitions.forEach((def) => {
      resetData[def.key] = settings[def.key] ?? def.defaultValue;
    });
    setFormData(resetData);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 사이트 이름 */}
        <div className="space-y-2">
          <Label htmlFor="siteName">
            사이트 이름
            <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
          </Label>
          <Input
            id="siteName"
            value={formData.siteName || ""}
            onChange={(e) => handleChange("siteName", e.target.value)}
            placeholder="미소핀 치과"
          />
          <p className="text-xs text-muted-foreground">
            웹사이트에 표시될 사이트 이름입니다.
          </p>
        </div>

        {/* 로고 URL */}
        <div className="space-y-2">
          <Label htmlFor="logoUrl">로고 URL</Label>
          <Input
            id="logoUrl"
            value={formData.logoUrl || ""}
            onChange={(e) => handleChange("logoUrl", e.target.value)}
            placeholder="/images/logo.png"
          />
          <p className="text-xs text-muted-foreground">
            사이트 로고 이미지의 URL입니다.
          </p>
        </div>

        {/* 연락처 이메일 */}
        <div className="space-y-2">
          <Label htmlFor="contactEmail">
            연락처 이메일
            <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
          </Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail || ""}
            onChange={(e) => handleChange("contactEmail", e.target.value)}
            placeholder="info@misopin.com"
          />
          <p className="text-xs text-muted-foreground">
            고객 문의용 이메일 주소입니다.
          </p>
        </div>

        {/* 연락처 전화번호 */}
        <div className="space-y-2">
          <Label htmlFor="contactPhone">
            연락처 전화번호
            <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
          </Label>
          <Input
            id="contactPhone"
            value={formData.contactPhone || ""}
            onChange={(e) => handleChange("contactPhone", e.target.value)}
            placeholder="02-1234-5678"
          />
          <p className="text-xs text-muted-foreground">
            병원 대표 전화번호입니다.
          </p>
        </div>

        {/* 시간대 */}
        <div className="space-y-2">
          <Label htmlFor="timezone">시간대</Label>
          <Select
            value={formData.timezone || "Asia/Seoul"}
            onValueChange={(value) => handleChange("timezone", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="시간대 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Seoul">서울 (UTC+9)</SelectItem>
              <SelectItem value="UTC">UTC (UTC+0)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            서버 시간대 설정입니다.
          </p>
        </div>

        {/* 기본 언어 */}
        <div className="space-y-2">
          <Label htmlFor="language">기본 언어</Label>
          <Select
            value={formData.language || "ko"}
            onValueChange={(value) => handleChange("language", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="언어 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ko">한국어</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            사이트 기본 언어입니다.
          </p>
        </div>
      </div>

      <Separator />

      {/* 주소 */}
      <div className="space-y-2">
        <Label htmlFor="address">
          주소
          <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
        </Label>
        <Input
          id="address"
          value={formData.address || ""}
          onChange={(e) => handleChange("address", e.target.value)}
          placeholder="서울시 강남구 테헤란로 123"
        />
        <p className="text-xs text-muted-foreground">
          병원 주소입니다.
        </p>
      </div>

      <Separator />

      {/* 운영 시간 */}
      <div className="space-y-4">
        <Label>운영 시간</Label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weekdaysHours">평일</Label>
            <Input
              id="weekdaysHours"
              value={formData.operatingHours?.weekdays || ""}
              onChange={(e) => handleOperatingHoursChange("weekdays", e.target.value)}
              placeholder="09:00 - 18:00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekendsHours">주말</Label>
            <Input
              id="weekendsHours"
              value={formData.operatingHours?.weekends || ""}
              onChange={(e) => handleOperatingHoursChange("weekends", e.target.value)}
              placeholder="09:00 - 15:00"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          병원 운영 시간 정보입니다.
        </p>
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