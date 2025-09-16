import { SettingDefinition } from '@/types/settings';

// 설정 정의 및 메타데이터
export const SETTING_DEFINITIONS: SettingDefinition[] = [
  // 일반 설정
  {
    key: 'siteName',
    category: 'general',
    label: '사이트 이름',
    description: '웹사이트에 표시될 사이트 이름',
    type: 'string',
    defaultValue: '미소핀 치과',
    required: true,
    validation: {
      min: 1,
      max: 100,
    },
  },
  {
    key: 'logoUrl',
    category: 'general',
    label: '로고 URL',
    description: '사이트 로고 이미지 URL',
    type: 'string',
    defaultValue: '/images/logo.png',
  },
  {
    key: 'contactEmail',
    category: 'general',
    label: '연락처 이메일',
    description: '고객 문의용 이메일 주소',
    type: 'string',
    defaultValue: 'info@misopin.com',
    required: true,
    validation: {
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    },
  },
  {
    key: 'contactPhone',
    category: 'general',
    label: '연락처 전화번호',
    description: '병원 대표 전화번호',
    type: 'string',
    defaultValue: '02-1234-5678',
    required: true,
  },
  {
    key: 'address',
    category: 'general',
    label: '주소',
    description: '병원 주소',
    type: 'string',
    defaultValue: '서울시 강남구 테헤란로 123',
    required: true,
  },
  {
    key: 'operatingHours',
    category: 'general',
    label: '운영 시간',
    description: '병원 운영 시간 정보',
    type: 'json',
    defaultValue: {
      weekdays: '09:00 - 18:00',
      weekends: '09:00 - 15:00',
    },
  },
  {
    key: 'timezone',
    category: 'general',
    label: '시간대',
    description: '서버 시간대 설정',
    type: 'string',
    defaultValue: 'Asia/Seoul',
    validation: {
      options: [
        { value: 'Asia/Seoul', label: '서울 (UTC+9)' },
        { value: 'UTC', label: 'UTC (UTC+0)' },
      ],
    },
  },
  {
    key: 'language',
    category: 'general',
    label: '기본 언어',
    description: '사이트 기본 언어',
    type: 'string',
    defaultValue: 'ko',
    validation: {
      options: [
        { value: 'ko', label: '한국어' },
        { value: 'en', label: 'English' },
      ],
    },
  },

  // 이메일 설정
  {
    key: 'smtpHost',
    category: 'email',
    label: 'SMTP 호스트',
    description: 'SMTP 서버 호스트 주소',
    type: 'string',
    defaultValue: 'smtp.gmail.com',
    required: true,
  },
  {
    key: 'smtpPort',
    category: 'email',
    label: 'SMTP 포트',
    description: 'SMTP 서버 포트 번호',
    type: 'number',
    defaultValue: 587,
    required: true,
    validation: {
      min: 1,
      max: 65535,
    },
  },
  {
    key: 'smtpUser',
    category: 'email',
    label: 'SMTP 사용자명',
    description: 'SMTP 인증 사용자명',
    type: 'string',
    defaultValue: '',
    required: true,
  },
  {
    key: 'smtpPassword',
    category: 'email',
    label: 'SMTP 비밀번호',
    description: 'SMTP 인증 비밀번호',
    type: 'string',
    defaultValue: '',
    required: true,
  },
  {
    key: 'smtpSecure',
    category: 'email',
    label: 'SMTP 보안 연결',
    description: 'SSL/TLS 보안 연결 사용 여부',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'fromEmail',
    category: 'email',
    label: '발신자 이메일',
    description: '이메일 발신자 주소',
    type: 'string',
    defaultValue: 'noreply@misopin.com',
    required: true,
    validation: {
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    },
  },
  {
    key: 'fromName',
    category: 'email',
    label: '발신자 이름',
    description: '이메일 발신자 이름',
    type: 'string',
    defaultValue: '미소핀 치과',
    required: true,
  },
  {
    key: 'replyToEmail',
    category: 'email',
    label: '회신 이메일',
    description: '회신 받을 이메일 주소',
    type: 'string',
    defaultValue: 'info@misopin.com',
    validation: {
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    },
  },
  {
    key: 'emailTemplates',
    category: 'email',
    label: '이메일 템플릿',
    description: '각종 이메일 템플릿 설정',
    type: 'json',
    defaultValue: {
      reservationConfirmation: '예약이 확정되었습니다.',
      reservationReminder: '예약 일정을 알려드립니다.',
      cancelNotification: '예약이 취소되었습니다.',
    },
  },

  // 보안 설정
  {
    key: 'sessionTimeout',
    category: 'security',
    label: '세션 타임아웃',
    description: '세션 만료 시간 (분)',
    type: 'number',
    defaultValue: 60,
    required: true,
    validation: {
      min: 5,
      max: 1440, // 24시간
    },
  },
  {
    key: 'passwordMinLength',
    category: 'security',
    label: '비밀번호 최소 길이',
    description: '비밀번호 최소 문자 수',
    type: 'number',
    defaultValue: 8,
    required: true,
    validation: {
      min: 4,
      max: 128,
    },
  },
  {
    key: 'passwordRequireSpecialChar',
    category: 'security',
    label: '특수문자 필수',
    description: '비밀번호에 특수문자 포함 필수',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'passwordRequireNumber',
    category: 'security',
    label: '숫자 필수',
    description: '비밀번호에 숫자 포함 필수',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'passwordRequireUppercase',
    category: 'security',
    label: '대문자 필수',
    description: '비밀번호에 대문자 포함 필수',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'maxLoginAttempts',
    category: 'security',
    label: '최대 로그인 시도 횟수',
    description: '계정 잠금 전 최대 로그인 실패 횟수',
    type: 'number',
    defaultValue: 5,
    required: true,
    validation: {
      min: 3,
      max: 10,
    },
  },
  {
    key: 'lockoutDuration',
    category: 'security',
    label: '계정 잠금 시간',
    description: '계정 잠금 지속 시간 (분)',
    type: 'number',
    defaultValue: 15,
    required: true,
    validation: {
      min: 5,
      max: 60,
    },
  },
  {
    key: 'enableTwoFactor',
    category: 'security',
    label: '2단계 인증',
    description: '2단계 인증 활성화',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'jwtExpiresIn',
    category: 'security',
    label: 'JWT 만료 시간',
    description: 'JWT 토큰 만료 시간',
    type: 'string',
    defaultValue: '7d',
    validation: {
      options: [
        { value: '1h', label: '1시간' },
        { value: '24h', label: '24시간' },
        { value: '7d', label: '7일' },
        { value: '30d', label: '30일' },
      ],
    },
  },

  // 파일 업로드 설정
  {
    key: 'maxFileSize',
    category: 'upload',
    label: '최대 파일 크기',
    description: '업로드 가능한 최대 파일 크기 (MB)',
    type: 'number',
    defaultValue: 10,
    required: true,
    validation: {
      min: 1,
      max: 100,
    },
  },
  {
    key: 'allowedImageTypes',
    category: 'upload',
    label: '허용 이미지 형식',
    description: '업로드 가능한 이미지 파일 형식',
    type: 'json',
    defaultValue: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
  {
    key: 'allowedDocumentTypes',
    category: 'upload',
    label: '허용 문서 형식',
    description: '업로드 가능한 문서 파일 형식',
    type: 'json',
    defaultValue: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
  },
  {
    key: 'uploadPath',
    category: 'upload',
    label: '업로드 경로',
    description: '파일 업로드 저장 경로',
    type: 'string',
    defaultValue: '/uploads',
    required: true,
  },
  {
    key: 'enableImageCompression',
    category: 'upload',
    label: '이미지 압축',
    description: '이미지 자동 압축 활성화',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'imageQuality',
    category: 'upload',
    label: '이미지 품질',
    description: '압축된 이미지 품질 (1-100)',
    type: 'number',
    defaultValue: 80,
    validation: {
      min: 1,
      max: 100,
    },
  },
  {
    key: 'thumbnailSizes',
    category: 'upload',
    label: '썸네일 크기',
    description: '자동 생성될 썸네일 크기 목록',
    type: 'json',
    defaultValue: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 600, height: 600 },
    ],
  },
];

// 카테고리별 설정 정의 조회
export function getSettingsByCategory(category: string): SettingDefinition[] {
  return SETTING_DEFINITIONS.filter(setting => setting.category === category);
}

// 개별 설정 정의 조회
export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return SETTING_DEFINITIONS.find(setting => setting.key === key);
}

// 기본값 조회
export function getDefaultValue(key: string): any {
  const definition = getSettingDefinition(key);
  return definition?.defaultValue;
}

// 설정 검증
export function validateSettingValue(key: string, value: any): { valid: boolean; error?: string } {
  const definition = getSettingDefinition(key);

  if (!definition) {
    return { valid: false, error: '알 수 없는 설정 키입니다.' };
  }

  // 필수 값 체크
  if (definition.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: '필수 값입니다.' };
  }

  // 타입 체크
  const expectedType = definition.type;
  const actualType = typeof value;

  if (expectedType === 'number' && actualType !== 'number') {
    return { valid: false, error: '숫자 타입이어야 합니다.' };
  }

  if (expectedType === 'boolean' && actualType !== 'boolean') {
    return { valid: false, error: '불린 타입이어야 합니다.' };
  }

  if (expectedType === 'string' && actualType !== 'string') {
    return { valid: false, error: '문자열 타입이어야 합니다.' };
  }

  // 검증 규칙 체크
  if (definition.validation) {
    const validation = definition.validation;

    // 문자열 길이 체크
    if (expectedType === 'string' && typeof value === 'string') {
      if (validation.min && value.length < validation.min) {
        return { valid: false, error: `최소 ${validation.min}자 이상이어야 합니다.` };
      }
      if (validation.max && value.length > validation.max) {
        return { valid: false, error: `최대 ${validation.max}자 이하여야 합니다.` };
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        return { valid: false, error: '올바른 형식이 아닙니다.' };
      }
    }

    // 숫자 범위 체크
    if (expectedType === 'number' && typeof value === 'number') {
      if (validation.min && value < validation.min) {
        return { valid: false, error: `최소값은 ${validation.min}입니다.` };
      }
      if (validation.max && value > validation.max) {
        return { valid: false, error: `최대값은 ${validation.max}입니다.` };
      }
    }

    // 옵션 체크
    if (validation.options) {
      const validValues = validation.options.map(option => option.value);
      if (!validValues.includes(value)) {
        return { valid: false, error: '유효하지 않은 값입니다.' };
      }
    }
  }

  return { valid: true };
}