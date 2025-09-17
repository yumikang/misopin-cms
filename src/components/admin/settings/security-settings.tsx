"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, RotateCcw, Shield, AlertTriangle } from "lucide-react";
import { getSettingsByCategory } from "@/lib/settings-definitions";

interface SecuritySettingsProps {
  settings: Record<string, any>;
  onSave: (settings: Array<{ key: string; value: any }>) => Promise<void>;
  saving: boolean;
}

export function SecuritySettings({ settings, onSave, saving }: SecuritySettingsProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const securitySettingDefinitions = getSettingsByCategory("security");

  // 폼 데이터 초기화
  useEffect(() => {
    const initialData: Record<string, any> = {};
    securitySettingDefinitions.forEach((def) => {
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
      const hasChangesNow = securitySettingDefinitions.some((def) => {
        const originalValue = settings[def.key] ?? def.defaultValue;
        const currentValue = updated[def.key];
        return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
      });

      setHasChanges(hasChangesNow);
      return updated;
    });
  };

  // 저장
  const handleSave = async () => {
    try {
      const settingsToSave = securitySettingDefinitions.map((def) => ({
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
    securitySettingDefinitions.forEach((def) => {
      resetData[def.key] = settings[def.key] ?? def.defaultValue;
    });
    setFormData(resetData);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          보안 설정을 변경하면 모든 사용자의 로그인 세션에 영향을 줄 수 있습니다.
          변경 전에 충분히 검토하고 테스트하세요.
        </AlertDescription>
      </Alert>

      {/* 세션 관리 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">세션 관리</h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 세션 타임아웃 */}
          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">
              세션 타임아웃 (분)
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="sessionTimeout"
              type="number"
              min="5"
              max="1440"
              value={formData.sessionTimeout || ""}
              onChange={(e) => handleChange("sessionTimeout", parseInt(e.target.value) || 60)}
              placeholder="60"
            />
            <p className="text-xs text-muted-foreground">
              세션 만료 시간입니다. (5분 ~ 24시간)
            </p>
          </div>

          {/* JWT 만료 시간 */}
          <div className="space-y-2">
            <Label htmlFor="jwtExpiresIn">JWT 만료 시간</Label>
            <Select
              value={formData.jwtExpiresIn || "7d"}
              onValueChange={(value) => handleChange("jwtExpiresIn", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="만료 시간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1시간</SelectItem>
                <SelectItem value="24h">24시간</SelectItem>
                <SelectItem value="7d">7일</SelectItem>
                <SelectItem value="30d">30일</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              JWT 토큰 만료 시간입니다.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* 비밀번호 정책 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">비밀번호 정책</h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 비밀번호 최소 길이 */}
          <div className="space-y-2">
            <Label htmlFor="passwordMinLength">
              비밀번호 최소 길이
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="passwordMinLength"
              type="number"
              min="4"
              max="128"
              value={formData.passwordMinLength || ""}
              onChange={(e) => handleChange("passwordMinLength", parseInt(e.target.value) || 8)}
              placeholder="8"
            />
            <p className="text-xs text-muted-foreground">
              비밀번호 최소 문자 수입니다. (4 ~ 128자)
            </p>
          </div>

          <div className="space-y-4">
            {/* 특수문자 필수 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="passwordRequireSpecialChar"
                checked={formData.passwordRequireSpecialChar || false}
                onCheckedChange={(checked) => handleChange("passwordRequireSpecialChar", checked)}
              />
              <Label htmlFor="passwordRequireSpecialChar">특수문자 포함 필수</Label>
            </div>

            {/* 숫자 필수 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="passwordRequireNumber"
                checked={formData.passwordRequireNumber || false}
                onCheckedChange={(checked) => handleChange("passwordRequireNumber", checked)}
              />
              <Label htmlFor="passwordRequireNumber">숫자 포함 필수</Label>
            </div>

            {/* 대문자 필수 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="passwordRequireUppercase"
                checked={formData.passwordRequireUppercase || false}
                onCheckedChange={(checked) => handleChange("passwordRequireUppercase", checked)}
              />
              <Label htmlFor="passwordRequireUppercase">대문자 포함 필수</Label>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* 로그인 보안 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">로그인 보안</h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 최대 로그인 시도 횟수 */}
          <div className="space-y-2">
            <Label htmlFor="maxLoginAttempts">
              최대 로그인 시도 횟수
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="maxLoginAttempts"
              type="number"
              min="3"
              max="10"
              value={formData.maxLoginAttempts || ""}
              onChange={(e) => handleChange("maxLoginAttempts", parseInt(e.target.value) || 5)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              계정 잠금 전 최대 로그인 실패 횟수입니다. (3 ~ 10회)
            </p>
          </div>

          {/* 계정 잠금 시간 */}
          <div className="space-y-2">
            <Label htmlFor="lockoutDuration">
              계정 잠금 시간 (분)
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="lockoutDuration"
              type="number"
              min="5"
              max="60"
              value={formData.lockoutDuration || ""}
              onChange={(e) => handleChange("lockoutDuration", parseInt(e.target.value) || 15)}
              placeholder="15"
            />
            <p className="text-xs text-muted-foreground">
              계정 잠금 지속 시간입니다. (5 ~ 60분)
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* 2단계 인증 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">2단계 인증</h3>

        <div className="flex items-center space-x-2">
          <Switch
            id="enableTwoFactor"
            checked={formData.enableTwoFactor || false}
            onCheckedChange={(checked) => handleChange("enableTwoFactor", checked)}
          />
          <div className="space-y-1">
            <Label htmlFor="enableTwoFactor">2단계 인증 활성화</Label>
            <p className="text-xs text-muted-foreground">
              관리자 계정에 2단계 인증을 적용합니다.
            </p>
          </div>
        </div>

        {formData.enableTwoFactor && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              2단계 인증을 활성화하면 모든 관리자는 다음 로그인 시 2단계 인증 설정을 완료해야 합니다.
            </AlertDescription>
          </Alert>
        )}
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