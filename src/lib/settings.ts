import { db } from '@/lib/db';
import { SettingCategory, AllSettings } from '@/types/settings';
import { SETTING_DEFINITIONS, getDefaultValue, validateSettingValue } from './settings-definitions';

/**
 * 모든 설정을 조회합니다.
 */
export async function getAllSettings(): Promise<Record<string, any>> {
  const settings = await db.systemSetting.findMany();

  const result: Record<string, any> = {};

  // 기본값으로 초기화
  SETTING_DEFINITIONS.forEach(def => {
    result[def.key] = def.defaultValue;
  });

  // 저장된 값으로 오버라이드
  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });

  return result;
}

/**
 * 카테고리별 설정을 조회합니다.
 */
export async function getSettingsByCategory(category: SettingCategory): Promise<Record<string, any>> {
  const settings = await db.systemSetting.findMany({
    where: { category },
  });

  const result: Record<string, any> = {};

  // 해당 카테고리의 기본값으로 초기화
  SETTING_DEFINITIONS
    .filter(def => def.category === category)
    .forEach(def => {
      result[def.key] = def.defaultValue;
    });

  // 저장된 값으로 오버라이드
  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });

  return result;
}

/**
 * 개별 설정값을 조회합니다.
 */
export async function getSetting(key: string): Promise<any> {
  const setting = await db.systemSetting.findUnique({
    where: { key },
  });

  if (setting) {
    return setting.value;
  }

  return getDefaultValue(key);
}

/**
 * 개별 설정값을 업데이트합니다.
 */
export async function updateSetting(key: string, value: any, category: SettingCategory): Promise<void> {
  // 값 검증
  const validation = validateSettingValue(key, value);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await db.systemSetting.upsert({
    where: { key },
    update: {
      value,
      updatedAt: new Date(),
    },
    create: {
      key,
      value,
      category,
    },
  });
}

/**
 * 여러 설정을 일괄 업데이트합니다.
 */
export async function updateMultipleSettings(
  settings: Array<{ key: string; value: any; category: SettingCategory }>
): Promise<void> {
  // 모든 값 검증
  for (const setting of settings) {
    const validation = validateSettingValue(setting.key, setting.value);
    if (!validation.valid) {
      throw new Error(`${setting.key}: ${validation.error}`);
    }
  }

  // 트랜잭션으로 일괄 업데이트
  await db.$transaction(
    settings.map(setting =>
      db.systemSetting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedAt: new Date(),
        },
        create: {
          key: setting.key,
          value: setting.value,
          category: setting.category,
        },
      })
    )
  );
}

/**
 * 설정값을 삭제합니다 (기본값으로 되돌림).
 */
export async function deleteSetting(key: string): Promise<void> {
  await db.systemSetting.delete({
    where: { key },
  });
}

/**
 * 카테고리별로 구조화된 설정을 반환합니다.
 */
export async function getStructuredSettings(): Promise<AllSettings> {
  const allSettings = await getAllSettings();

  const structured: AllSettings = {
    general: {
      siteName: allSettings.siteName,
      logoUrl: allSettings.logoUrl,
      contactEmail: allSettings.contactEmail,
      contactPhone: allSettings.contactPhone,
      address: allSettings.address,
      operatingHours: allSettings.operatingHours,
      timezone: allSettings.timezone,
      language: allSettings.language,
    },
    email: {
      smtpHost: allSettings.smtpHost,
      smtpPort: allSettings.smtpPort,
      smtpUser: allSettings.smtpUser,
      smtpPassword: allSettings.smtpPassword,
      smtpSecure: allSettings.smtpSecure,
      fromEmail: allSettings.fromEmail,
      fromName: allSettings.fromName,
      replyToEmail: allSettings.replyToEmail,
      emailTemplates: allSettings.emailTemplates,
    },
    security: {
      sessionTimeout: allSettings.sessionTimeout,
      passwordMinLength: allSettings.passwordMinLength,
      passwordRequireSpecialChar: allSettings.passwordRequireSpecialChar,
      passwordRequireNumber: allSettings.passwordRequireNumber,
      passwordRequireUppercase: allSettings.passwordRequireUppercase,
      maxLoginAttempts: allSettings.maxLoginAttempts,
      lockoutDuration: allSettings.lockoutDuration,
      enableTwoFactor: allSettings.enableTwoFactor,
      jwtExpiresIn: allSettings.jwtExpiresIn,
    },
    upload: {
      maxFileSize: allSettings.maxFileSize,
      allowedImageTypes: allSettings.allowedImageTypes,
      allowedDocumentTypes: allSettings.allowedDocumentTypes,
      uploadPath: allSettings.uploadPath,
      enableImageCompression: allSettings.enableImageCompression,
      imageQuality: allSettings.imageQuality,
      thumbnailSizes: allSettings.thumbnailSizes,
    },
  };

  return structured;
}

/**
 * 설정 초기화 (기본값으로 리셋)
 */
export async function resetSettings(category?: SettingCategory): Promise<void> {
  if (category) {
    // 특정 카테고리만 삭제
    await db.systemSetting.deleteMany({
      where: { category },
    });
  } else {
    // 모든 설정 삭제
    await db.systemSetting.deleteMany({});
  }
}

/**
 * 설정 백업 생성
 */
export async function exportSettings(): Promise<any> {
  const settings = await db.systemSetting.findMany();
  return {
    exportedAt: new Date().toISOString(),
    settings,
  };
}

/**
 * 설정 백업에서 복원
 */
export async function importSettings(backup: any): Promise<void> {
  if (!backup.settings || !Array.isArray(backup.settings)) {
    throw new Error('유효하지 않은 백업 파일입니다.');
  }

  // 모든 설정 삭제 후 복원
  await db.$transaction([
    db.systemSetting.deleteMany({}),
    ...backup.settings.map((setting: any) =>
      db.systemSetting.create({
        data: {
          key: setting.key,
          value: setting.value,
          category: setting.category,
        },
      })
    ),
  ]);
}