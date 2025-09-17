import { NextResponse } from 'next/server';

interface Setting {
  id: string;
  category: 'general' | 'contact' | 'seo' | 'business' | 'api';
  key: string;
  value: string;
  label: string;
  description?: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'number' | 'boolean' | 'select';
  options?: string[]; // For select type
  updated_at: string;
}

// Mock data for settings
const mockSettings: Setting[] = [
  // General Settings
  {
    id: '1',
    category: 'general',
    key: 'site_name',
    value: '미소핀의원',
    label: '사이트 이름',
    description: '웹사이트 상단에 표시되는 이름',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '2',
    category: 'general',
    key: 'site_description',
    value: '환자 중심의 진료를 실천하는 미소핀의원입니다',
    label: '사이트 설명',
    description: '웹사이트 소개 문구',
    type: 'textarea',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '3',
    category: 'general',
    key: 'maintenance_mode',
    value: 'false',
    label: '유지보수 모드',
    description: '활성화 시 관리자를 제외한 모든 사용자에게 유지보수 페이지 표시',
    type: 'boolean',
    updated_at: '2025-01-15T09:00:00'
  },

  // Contact Settings
  {
    id: '4',
    category: 'contact',
    key: 'phone',
    value: '02-1234-5678',
    label: '대표 전화번호',
    type: 'tel',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '5',
    category: 'contact',
    key: 'email',
    value: 'info@misopin.com',
    label: '대표 이메일',
    type: 'email',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '6',
    category: 'contact',
    key: 'address',
    value: '서울특별시 강남구 테헤란로 123 미소핀빌딩',
    label: '주소',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '7',
    category: 'contact',
    key: 'business_hours',
    value: '평일 09:00 - 18:00\n토요일 09:00 - 13:00\n일요일/공휴일 휴무',
    label: '진료 시간',
    type: 'textarea',
    updated_at: '2025-01-15T09:00:00'
  },

  // SEO Settings
  {
    id: '8',
    category: 'seo',
    key: 'meta_title',
    value: '미소핀의원 - 환자 중심의 진료',
    label: '기본 메타 제목',
    description: '페이지별 메타 제목이 없을 때 사용',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '9',
    category: 'seo',
    key: 'meta_description',
    value: '미소핀의원은 환자 중심의 진료를 실천하며 최고의 의료 서비스를 제공합니다.',
    label: '기본 메타 설명',
    type: 'textarea',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '10',
    category: 'seo',
    key: 'meta_keywords',
    value: '미소핀의원, 병원, 의료, 건강, 진료',
    label: '기본 메타 키워드',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '11',
    category: 'seo',
    key: 'og_image',
    value: 'https://misopin.com/og-image.jpg',
    label: 'Open Graph 이미지',
    description: 'SNS 공유 시 표시되는 기본 이미지',
    type: 'url',
    updated_at: '2025-01-15T09:00:00'
  },

  // Business Settings
  {
    id: '12',
    category: 'business',
    key: 'business_registration',
    value: '123-45-67890',
    label: '사업자등록번호',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '13',
    category: 'business',
    key: 'medical_institution_number',
    value: '12345678',
    label: '의료기관 번호',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '14',
    category: 'business',
    key: 'representative_name',
    value: '김의사',
    label: '대표자명',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },

  // API Settings
  {
    id: '15',
    category: 'api',
    key: 'google_maps_api_key',
    value: 'AIzaSyB...',
    label: 'Google Maps API Key',
    description: '지도 표시용 API 키',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '16',
    category: 'api',
    key: 'kakao_api_key',
    value: '1234567890abcdef',
    label: 'Kakao API Key',
    description: '카카오 서비스 연동용',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '17',
    category: 'api',
    key: 'naver_client_id',
    value: 'naver_client_id_here',
    label: 'Naver Client ID',
    description: '네이버 서비스 연동용',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  },
  {
    id: '18',
    category: 'api',
    key: 'analytics_tracking_id',
    value: 'G-XXXXXXXXXX',
    label: 'Google Analytics ID',
    description: '웹사이트 분석용 추적 ID',
    type: 'text',
    updated_at: '2025-01-15T09:00:00'
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let filtered = [...mockSettings];

  if (category && category !== 'all') {
    filtered = filtered.filter(setting => setting.category === category);
  }

  return NextResponse.json(filtered);
}

export async function PUT(request: Request) {
  const updates = await request.json();

  // Updates should be an array of { id, value } objects
  if (!Array.isArray(updates)) {
    return NextResponse.json(
      { error: 'Invalid update format' },
      { status: 400 }
    );
  }

  // Update each setting
  for (const update of updates) {
    const index = mockSettings.findIndex(s => s.id === update.id);
    if (index !== -1) {
      mockSettings[index] = {
        ...mockSettings[index],
        value: update.value,
        updated_at: new Date().toISOString()
      };
    }
  }

  return NextResponse.json({
    success: true,
    message: `${updates.length}개 설정이 업데이트되었습니다.`
  });
}

// Reset to defaults endpoint
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  if (!category) {
    return NextResponse.json(
      { error: 'Category is required' },
      { status: 400 }
    );
  }

  // Reset settings in the specified category to default values
  // In a real implementation, you would fetch default values from a config
  const defaultValues: Record<string, string> = {
    site_name: '미소핀의원',
    maintenance_mode: 'false',
    // Add more defaults as needed
  };

  let resetCount = 0;
  mockSettings.forEach(setting => {
    if (setting.category === category || category === 'all') {
      if (defaultValues[setting.key]) {
        setting.value = defaultValues[setting.key];
        setting.updated_at = new Date().toISOString();
        resetCount++;
      }
    }
  });

  return NextResponse.json({
    success: true,
    message: `${resetCount}개 설정이 기본값으로 초기화되었습니다.`
  });
}