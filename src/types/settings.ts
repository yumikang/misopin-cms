// 시스템 설정 타입 정의

export type SettingCategory = 'general' | 'email' | 'security' | 'upload';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

export type SettingValue = string | number | boolean | Record<string, unknown> | unknown[];

// 기본 설정 인터페이스
export interface SystemSettingBase {
  id: string;
  key: string;
  value: SettingValue;
  category: SettingCategory;
  createdAt: Date;
  updatedAt: Date;
}

// 설정 정의 인터페이스 (메타데이터)
export interface SettingDefinition {
  key: string;
  category: SettingCategory;
  label: string;
  description?: string;
  type: SettingValueType;
  defaultValue: SettingValue;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: Array<{ value: SettingValue; label: string }>;
  };
}

// 일반 설정
export interface GeneralSettings {
  siteName: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  operatingHours: {
    weekdays: string;
    weekends: string;
  };
  timezone: string;
  language: string;
}

// 이메일 설정
export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  emailTemplates: {
    reservationConfirmation: string;
    reservationReminder: string;
    cancelNotification: string;
  };
}

// 보안 설정
export interface SecuritySettings {
  sessionTimeout: number; // 분 단위
  passwordMinLength: number;
  passwordRequireSpecialChar: boolean;
  passwordRequireNumber: boolean;
  passwordRequireUppercase: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number; // 분 단위
  enableTwoFactor: boolean;
  jwtExpiresIn: string;
}

// 파일 업로드 설정
export interface UploadSettings {
  maxFileSize: number; // MB 단위
  allowedImageTypes: string[];
  allowedDocumentTypes: string[];
  uploadPath: string;
  enableImageCompression: boolean;
  imageQuality: number; // 1-100
  thumbnailSizes: Array<{
    name: string;
    width: number;
    height: number;
  }>;
}

// 전체 설정 타입
export interface AllSettings {
  general: GeneralSettings;
  email: EmailSettings;
  security: SecuritySettings;
  upload: UploadSettings;
}

// API 응답 타입
export interface SettingsResponse {
  settings: Record<string, any>;
  success: boolean;
  message?: string;
}

export interface SettingUpdateRequest {
  key: string;
  value: SettingValue;
  category: SettingCategory;
}

export interface BulkSettingUpdateRequest {
  settings: Array<{
    key: string;
    value: SettingValue;
    category: SettingCategory;
  }>;
}