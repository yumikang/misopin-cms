"use client";

import { Setting } from "../types";
import { SettingInput } from "./SettingInput";
import { Button } from "@/components/ui/button";

interface ApiSettingsProps {
  settings: Setting[];
  modifiedSettings: Record<string, string>;
  onValueChange: (settingId: string, newValue: string) => void;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
  hasModifications: boolean;
}

export function ApiSettings({
  settings,
  modifiedSettings,
  onValueChange,
  onReset,
  onSave,
  saving,
  hasModifications
}: ApiSettingsProps) {
  const apiSettings = settings.filter(s => s.category === 'api');

  if (apiSettings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        이 카테고리에 설정이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {apiSettings.map(setting => (
          <SettingInput
            key={setting.id}
            setting={setting}
            currentValue={modifiedSettings[setting.id] !== undefined
              ? modifiedSettings[setting.id]
              : setting.value}
            isModified={modifiedSettings[setting.id] !== undefined}
            onChange={onValueChange}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={onReset}
        >
          기본값으로 초기화
        </Button>

        {hasModifications && (
          <div className="flex gap-2">
            <Button
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "저장 중..." : "변경사항 저장"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}