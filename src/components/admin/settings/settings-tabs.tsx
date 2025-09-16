"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Settings, Mail, Shield, Upload, Info } from "lucide-react";
import { GeneralSettings } from "./general-settings";
import { EmailSettings } from "./email-settings";
import { SecuritySettings } from "./security-settings";
import { UploadSettings } from "./upload-settings";
import { useToast } from "@/hooks/use-toast";

interface SettingsResponse {
  success: boolean;
  settings: Record<string, any>;
  message?: string;
}

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // 설정 로드
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings");
      const data: SettingsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "설정을 불러오는데 실패했습니다.");
      }

      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("설정 로드 오류:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "설정을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 설정 저장
  const saveSettings = async (categorySettings: Array<{ key: string; value: any; category: string }>) => {
    try {
      setSaving(true);
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: categorySettings,
        }),
      });

      const data: SettingsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "설정 저장에 실패했습니다.");
      }

      if (data.success) {
        setSettings(data.settings);
        toast({
          title: "성공",
          description: "설정이 성공적으로 저장되었습니다.",
        });
      }
    } catch (error) {
      console.error("설정 저장 오류:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "설정 저장에 실패했습니다.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const tabsData = [
    {
      id: "general",
      label: "일반 설정",
      icon: Settings,
      description: "사이트 기본 정보 및 일반적인 설정",
    },
    {
      id: "email",
      label: "이메일 설정",
      icon: Mail,
      description: "SMTP 설정 및 이메일 템플릿",
    },
    {
      id: "security",
      label: "보안 설정",
      icon: Shield,
      description: "인증, 세션, 비밀번호 정책",
    },
    {
      id: "upload",
      label: "업로드 설정",
      icon: Upload,
      description: "파일 업로드 및 이미지 처리 설정",
    },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          설정 변경사항은 저장 버튼을 클릭하면 즉시 적용됩니다. 중요한 설정을 변경하기 전에
          백업을 권장합니다.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {tabsData.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabsData.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <tab.icon className="h-5 w-5" />
                  <CardTitle>{tab.label}</CardTitle>
                  {saving && (
                    <Badge variant="secondary" className="ml-2">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      저장 중...
                    </Badge>
                  )}
                </div>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {tab.id === "general" && (
                  <GeneralSettings
                    settings={settings}
                    onSave={(settingsToSave) =>
                      saveSettings(
                        settingsToSave.map((setting) => ({
                          ...setting,
                          category: "general",
                        }))
                      )
                    }
                    saving={saving}
                  />
                )}
                {tab.id === "email" && (
                  <EmailSettings
                    settings={settings}
                    onSave={(settingsToSave) =>
                      saveSettings(
                        settingsToSave.map((setting) => ({
                          ...setting,
                          category: "email",
                        }))
                      )
                    }
                    saving={saving}
                  />
                )}
                {tab.id === "security" && (
                  <SecuritySettings
                    settings={settings}
                    onSave={(settingsToSave) =>
                      saveSettings(
                        settingsToSave.map((setting) => ({
                          ...setting,
                          category: "security",
                        }))
                      )
                    }
                    saving={saving}
                  />
                )}
                {tab.id === "upload" && (
                  <UploadSettings
                    settings={settings}
                    onSave={(settingsToSave) =>
                      saveSettings(
                        settingsToSave.map((setting) => ({
                          ...setting,
                          category: "upload",
                        }))
                      )
                    }
                    saving={saving}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}