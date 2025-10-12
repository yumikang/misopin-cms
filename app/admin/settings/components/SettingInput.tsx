"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Setting } from "../types";

interface SettingInputProps {
  setting: Setting;
  currentValue: string;
  isModified: boolean;
  onChange: (settingId: string, newValue: string) => void;
}

export function SettingInput({
  setting,
  currentValue,
  isModified,
  onChange
}: SettingInputProps) {
  const renderInput = () => {
    switch (setting.type) {
      case 'textarea':
        return (
          <Textarea
            value={currentValue}
            onChange={(e) => onChange(setting.id, e.target.value)}
            className="min-h-[100px]"
          />
        );

      case 'boolean':
        return (
          <Switch
            checked={currentValue === 'true'}
            onCheckedChange={(checked) => onChange(setting.id, checked.toString())}
          />
        );

      case 'select':
        return (
          <Select
            value={currentValue}
            onValueChange={(value) => onChange(setting.id, value)}
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
            onChange={(e) => onChange(setting.id, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={setting.id}>
          {setting.label}
          {isModified && (
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
        {renderInput()}
      </div>
    </div>
  );
}