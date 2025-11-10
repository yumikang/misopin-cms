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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Setting, categoryInfo } from "./types";
import { GeneralSettings } from "./components/GeneralSettings";
import { ContactSettings } from "./components/ContactSettings";
import { SeoSettings } from "./components/SeoSettings";
import { BusinessSettings } from "./components/BusinessSettings";
import { ApiSettings } from "./components/ApiSettings";
import { ClinicInfoSettings } from "./components/ClinicInfoSettings";
import { ServiceLimitSettings } from "./components/ServiceLimitSettings";

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

  const renderTabContent = (category: string) => {
    const commonProps = {
      settings,
      modifiedSettings,
      onValueChange: handleValueChange,
      onReset: () => handleReset(category),
      onSave: handleSave,
      saving,
      hasModifications: Object.keys(modifiedSettings).length > 0
    };

    switch (category) {
      case 'general':
        return <GeneralSettings {...commonProps} />;
      case 'contact':
        return <ClinicInfoSettings />; // Use new ClinicInfo component
      case 'seo':
        return <SeoSettings {...commonProps} />;
      case 'business':
        return <BusinessSettings {...commonProps} />;
      case 'reservations':
        return <ServiceLimitSettings />;
      case 'api':
        return <ApiSettings {...commonProps} />;
      default:
        return null;
    }
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
            <TabsList className="grid grid-cols-6 w-full max-w-4xl">
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
                    {renderTabContent(key)}
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