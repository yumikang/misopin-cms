export interface Setting {
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

export const categoryInfo = {
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