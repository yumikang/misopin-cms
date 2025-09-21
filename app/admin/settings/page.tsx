"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Setting {
  id: string;
  category: 'general' | 'contact' | 'seo' | 'business' | 'api';
  key: string;
  value: string;
  label: string;
  description?: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'number' | 'boolean' | 'select';
  options?: string[];
  updated_at: string;
}

// 카테고리별 아이콘과 설명
const categoryInfo = {
  general: {
    icon: "⚙️",
    title: "일반 설정",
    description: "사이트 기본 정보 및 운영 설정"
  },
  contact: {
    icon: "📞",
    title: "연락처 정보",
    description: "병원 연락처 및 위치 정보"
  },
  seo: {
    icon: "🔍",
    title: "SEO 설정",
    description: "검색 엔진 최적화 설정"
  },
  business: {
    icon: "🏢",
    title: "사업자 정보",
    description: "의료기관 및 사업자 정보"
  },
  api: {
    icon: "🔌",
    title: "API 설정",
    description: "외부 서비스 연동 설정"
  }
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [modifiedSettings, setModifiedSettings] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (settingId: string, newValue: string) => {
    setModifiedSettings(prev => ({
      ...prev,
      [settingId]: newValue
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare updates array
      const updates = Object.entries(modifiedSettings).map(([id, value]) => ({
        id,
        value
      }));

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      const result = await response.json();
      setSuccess(result.message);

      // Clear modified settings
      setModifiedSettings({});

      // Refresh settings
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (category: string) => {
    if (!confirm(`정말 ${categoryInfo[category as keyof typeof categoryInfo].title}을 기본값으로 초기화하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings?category=${category}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to reset settings");

      const result = await response.json();
      setSuccess(result.message);

      // Clear any modifications for this category
      const newModified = { ...modifiedSettings };
      settings
        .filter(s => s.category === category)
        .forEach(s => delete newModified[s.id]);
      setModifiedSettings(newModified);

      // Refresh settings
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset settings");
    }
  };

  const renderSettingInput = (setting: Setting) => {
    const currentValue = modifiedSettings[setting.id] !== undefined
      ? modifiedSettings[setting.id]
      : setting.value;

    switch (setting.type) {
      case 'textarea':
        return (
          <Textarea
            value={currentValue}
            onChange={(e) => handleValueChange(setting.id, e.target.value)}
            className="min-h-[100px]"
          />
        );

      case 'boolean':
        return (
          <Switch
            checked={currentValue === 'true'}
            onCheckedChange={(checked) => handleValueChange(setting.id, checked.toString())}
          />
        );

      case 'select':
        return (
          <Select
            value={currentValue}
            onValueChange={(value) => handleValueChange(setting.id, value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            type={setting.type}
            value={currentValue}
            onChange={(e) => handleValueChange(setting.id, e.target.value)}
          />
        );
    }
  };

  const renderCategorySettings = (category: string) => {
    const categorySettings = settings.filter(s => s.category === category);

    if (categorySettings.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          이 카테고리에 설정이 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {categorySettings.map(setting => (
          <div key={setting.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={setting.id}>
                {setting.label}
                {modifiedSettings[setting.id] !== undefined && (
                  <Badge variant="secondary" className="ml-2">수정됨</Badge>
                )}
              </Label>
              <span className="text-xs text-gray-500">
                마지막 수정: {new Date(setting.updated_at).toLocaleDateString()}
              </span>
            </div>
            {setting.description && (
              <p className="text-sm text-gray-600">{setting.description}</p>
            )}
            <div id={setting.id}>
              {renderSettingInput(setting)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const hasModifications = Object.keys(modifiedSettings).length > 0;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">시스템 설정</h1>
        <p className="text-gray-600 mt-1">웹사이트 및 시스템 전반의 설정을 관리합니다</p>
      </div>

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full max-w-3xl">
              {Object.entries(categoryInfo).map(([key, info]) => (
                <TabsTrigger key={key} value={key}>
                  <span className="mr-1">{info.icon}</span>
                  {info.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(categoryInfo).map(([key, info]) => (
              <TabsContent key={key} value={key}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="text-2xl mr-2">{info.icon}</span>
                      {info.title}
                    </CardTitle>
                    <CardDescription>{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderCategorySettings(key)}

                    <div className="mt-8 flex justify-between items-center pt-6 border-t">
                      <Button
                        variant="outline"
                        onClick={() => handleReset(key)}
                      >
                        기본값으로 초기화
                      </Button>

                      {hasModifications && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setModifiedSettings({});
                              fetchSettings();
                            }}
                          >
                            변경 취소
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                          >
                            {saving ? "저장 중..." : "변경사항 저장"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {hasModifications && (
            <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border">
              <p className="text-sm text-gray-600 mb-2">
                {Object.keys(modifiedSettings).length}개 설정이 변경되었습니다
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModifiedSettings({})}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}