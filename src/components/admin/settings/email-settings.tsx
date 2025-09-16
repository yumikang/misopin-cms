"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, RotateCcw, TestTube, AlertTriangle } from "lucide-react";
import { getSettingsByCategory } from "@/lib/settings-definitions";

interface EmailSettingsProps {
  settings: Record<string, any>;
  onSave: (settings: Array<{ key: string; value: any }>) => Promise<void>;
  saving: boolean;
}

export function EmailSettings({ settings, onSave, saving }: EmailSettingsProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const emailSettingDefinitions = getSettingsByCategory("email");

  // 폼 데이터 초기화
  useEffect(() => {
    const initialData: Record<string, any> = {};
    emailSettingDefinitions.forEach((def) => {
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
      const hasChangesNow = emailSettingDefinitions.some((def) => {
        const originalValue = settings[def.key] ?? def.defaultValue;
        const currentValue = updated[def.key];
        return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
      });

      setHasChanges(hasChangesNow);
      return updated;
    });
  };

  // 이메일 템플릿 변경 핸들러
  const handleTemplateChange = (templateType: string, value: string) => {
    const emailTemplates = formData.emailTemplates || {};
    handleChange('emailTemplates', {
      ...emailTemplates,
      [templateType]: value,
    });
  };

  // 저장
  const handleSave = async () => {
    try {
      const settingsToSave = emailSettingDefinitions.map((def) => ({
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
    emailSettingDefinitions.forEach((def) => {
      resetData[def.key] = settings[def.key] ?? def.defaultValue;
    });
    setFormData(resetData);
    setHasChanges(false);
  };

  // 이메일 테스트 (향후 구현)
  const handleTestEmail = async () => {
    setTestingEmail(true);
    // TODO: 이메일 테스트 API 구현
    setTimeout(() => {
      setTestingEmail(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          이메일 설정을 변경하면 시스템의 모든 이메일 발송에 영향을 줍니다.
          설정을 변경한 후 테스트 이메일을 발송하여 정상 작동을 확인하세요.
        </AlertDescription>
      </Alert>

      {/* SMTP 서버 설정 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">SMTP 서버 설정</h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* SMTP 호스트 */}
          <div className="space-y-2">
            <Label htmlFor="smtpHost">
              SMTP 호스트
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="smtpHost"
              value={formData.smtpHost || ""}
              onChange={(e) => handleChange("smtpHost", e.target.value)}
              placeholder="smtp.gmail.com"
            />
            <p className="text-xs text-muted-foreground">
              SMTP 서버 호스트 주소입니다.
            </p>
          </div>

          {/* SMTP 포트 */}
          <div className="space-y-2">
            <Label htmlFor="smtpPort">
              SMTP 포트
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="smtpPort"
              type="number"
              min="1"
              max="65535"
              value={formData.smtpPort || ""}
              onChange={(e) => handleChange("smtpPort", parseInt(e.target.value) || 587)}
              placeholder="587"
            />
            <p className="text-xs text-muted-foreground">
              SMTP 서버 포트 번호입니다.
            </p>
          </div>

          {/* SMTP 사용자명 */}
          <div className="space-y-2">
            <Label htmlFor="smtpUser">
              SMTP 사용자명
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="smtpUser"
              value={formData.smtpUser || ""}
              onChange={(e) => handleChange("smtpUser", e.target.value)}
              placeholder="your-email@gmail.com"
            />
            <p className="text-xs text-muted-foreground">
              SMTP 인증에 사용할 사용자명입니다.
            </p>
          </div>

          {/* SMTP 비밀번호 */}
          <div className="space-y-2">
            <Label htmlFor="smtpPassword">
              SMTP 비밀번호
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="smtpPassword"
              type="password"
              value={formData.smtpPassword || ""}
              onChange={(e) => handleChange("smtpPassword", e.target.value)}
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground">
              SMTP 인증에 사용할 비밀번호입니다.
            </p>
          </div>
        </div>

        {/* SMTP 보안 연결 */}
        <div className="flex items-center space-x-2">
          <Switch
            id="smtpSecure"
            checked={formData.smtpSecure || false}
            onCheckedChange={(checked) => handleChange("smtpSecure", checked)}
          />
          <Label htmlFor="smtpSecure">SSL/TLS 보안 연결 사용</Label>
        </div>
      </div>

      <Separator />

      {/* 발신자 정보 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">발신자 정보</h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 발신자 이메일 */}
          <div className="space-y-2">
            <Label htmlFor="fromEmail">
              발신자 이메일
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="fromEmail"
              type="email"
              value={formData.fromEmail || ""}
              onChange={(e) => handleChange("fromEmail", e.target.value)}
              placeholder="noreply@misopin.com"
            />
            <p className="text-xs text-muted-foreground">
              이메일 발신자 주소입니다.
            </p>
          </div>

          {/* 발신자 이름 */}
          <div className="space-y-2">
            <Label htmlFor="fromName">
              발신자 이름
              <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
            </Label>
            <Input
              id="fromName"
              value={formData.fromName || ""}
              onChange={(e) => handleChange("fromName", e.target.value)}
              placeholder="미소핀 치과"
            />
            <p className="text-xs text-muted-foreground">
              이메일 발신자 이름입니다.
            </p>
          </div>

          {/* 회신 이메일 */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="replyToEmail">회신 이메일</Label>
            <Input
              id="replyToEmail"
              type="email"
              value={formData.replyToEmail || ""}
              onChange={(e) => handleChange("replyToEmail", e.target.value)}
              placeholder="info@misopin.com"
            />
            <p className="text-xs text-muted-foreground">
              회신을 받을 이메일 주소입니다.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* 이메일 템플릿 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">이메일 템플릿</h3>

        <div className="space-y-4">
          {/* 예약 확정 템플릿 */}
          <div className="space-y-2">
            <Label htmlFor="reservationConfirmation">예약 확정 알림</Label>
            <Textarea
              id="reservationConfirmation"
              value={formData.emailTemplates?.reservationConfirmation || ""}
              onChange={(e) => handleTemplateChange("reservationConfirmation", e.target.value)}
              placeholder="예약이 확정되었습니다."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              예약이 확정될 때 발송되는 이메일 내용입니다.
            </p>
          </div>

          {/* 예약 리마인더 템플릿 */}
          <div className="space-y-2">
            <Label htmlFor="reservationReminder">예약 리마인더</Label>
            <Textarea
              id="reservationReminder"
              value={formData.emailTemplates?.reservationReminder || ""}
              onChange={(e) => handleTemplateChange("reservationReminder", e.target.value)}
              placeholder="예약 일정을 알려드립니다."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              예약 전날 발송되는 리마인더 이메일 내용입니다.
            </p>
          </div>

          {/* 예약 취소 템플릿 */}
          <div className="space-y-2">
            <Label htmlFor="cancelNotification">예약 취소 알림</Label>
            <Textarea
              id="cancelNotification"
              value={formData.emailTemplates?.cancelNotification || ""}
              onChange={(e) => handleTemplateChange("cancelNotification", e.target.value)}
              placeholder="예약이 취소되었습니다."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              예약이 취소될 때 발송되는 이메일 내용입니다.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
            onClick={handleTestEmail}
            disabled={testingEmail || hasChanges}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testingEmail ? "테스트 중..." : "이메일 테스트"}
          </Button>
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