/**
 * Section Label Mapper
 *
 * 비전공자를 위한 섹션명과 필드 라벨 매핑
 */

/**
 * 섹션 정보 인터페이스
 */
export interface SectionInfo {
  sectionName: string;
  displayName: string;
  emoji: string;
  description?: string;
  order: number;
}

/**
 * 섹션명 매핑 테이블
 * 기술적인 섹션명 → 사용자 친화적인 표시명
 */
const SECTION_DISPLAY_NAMES: Record<string, SectionInfo> = {
  // 상단 배너 섹션 (hero)
  'hero': {
    sectionName: 'hero',
    displayName: '상단 배너',
    emoji: '🎨',
    description: '페이지 최상단의 큰 배너 영역',
    order: 10,
  },
  'sub_banner': {
    sectionName: 'sub_banner',
    displayName: '상단 배너',
    emoji: '🎨',
    description: '페이지 최상단의 큰 배너 영역',
    order: 10,
  },

  // 소개 섹션 (intro)
  'intro': {
    sectionName: 'intro',
    displayName: '소개 섹션',
    emoji: '📝',
    description: '시술 소개 및 개요',
    order: 20,
  },
  'content': {
    sectionName: 'content',
    displayName: '본문 내용',
    emoji: '📝',
    description: '주요 내용 설명',
    order: 20,
  },
  'section1': {
    sectionName: 'section1',
    displayName: '본문 섹션 1',
    emoji: '📝',
    description: '첫 번째 본문 영역',
    order: 20,
  },

  // 원리/효과 섹션 (principle)
  'principle': {
    sectionName: 'principle',
    displayName: '작용 원리',
    emoji: '🔬',
    description: '시술 작용 원리 설명',
    order: 30,
  },
  'effect': {
    sectionName: 'effect',
    displayName: '시술 효과',
    emoji: '✨',
    description: '기대 효과 및 결과',
    order: 30,
  },
  'section2': {
    sectionName: 'section2',
    displayName: '작용 원리',
    emoji: '🔬',
    description: '두 번째 본문 영역',
    order: 30,
  },

  // 시술 종류 섹션 (treatments) - diet 페이지 전용
  'treatments': {
    sectionName: 'treatments',
    displayName: '시술 종류',
    emoji: '💉',
    description: '시술 종류 소개 및 설명',
    order: 25,
  },

  // 맞춤형 프로그램 섹션 (program) - diet 페이지 전용
  'program': {
    sectionName: 'program',
    displayName: '맞춤 프로그램',
    emoji: '📊',
    description: '맞춤형 프로그램 안내',
    order: 35,
  },

  // 베스트 시술 섹션 (best-treatments) - index 페이지 전용
  'best-treatments': {
    sectionName: 'best-treatments',
    displayName: '베스트 시술',
    emoji: '⭐',
    description: '미소핀의원 베스트 시술 슬라이더',
    order: 15,
  },

  // 절차/단계 섹션 (process)
  'process': {
    sectionName: 'process',
    displayName: '시술 단계',
    emoji: '📋',
    description: '시술 진행 순서',
    order: 40,
  },
  'procedure': {
    sectionName: 'procedure',
    displayName: '시술 단계',
    emoji: '📋',
    description: '시술 진행 순서',
    order: 40,
  },
  'steps': {
    sectionName: 'steps',
    displayName: '시술 단계',
    emoji: '📋',
    description: '시술 진행 순서',
    order: 40,
  },
  'section3': {
    sectionName: 'section3',
    displayName: '시술 단계',
    emoji: '📋',
    description: '세 번째 본문 영역',
    order: 40,
  },

  // 중간/하단 배너 섹션 (banner) - 실제로는 본문 중간이나 하단에 위치
  'banner': {
    sectionName: 'banner',
    displayName: '중간 배너',
    emoji: '🖼️',
    description: '본문 중간 또는 하단의 배너 영역',
    order: 50,
  },

  // CTA/예약 섹션
  'cta': {
    sectionName: 'cta',
    displayName: '예약 안내',
    emoji: '💬',
    description: '예약 및 문의 유도',
    order: 60,
  },
  'reservation': {
    sectionName: 'reservation',
    displayName: '예약 안내',
    emoji: '💬',
    description: '예약 및 문의 유도',
    order: 60,
  },
  'contact': {
    sectionName: 'contact',
    displayName: '문의하기',
    emoji: '📞',
    description: '연락처 및 문의 정보',
    order: 60,
  },
  'section4': {
    sectionName: 'section4',
    displayName: '예약 안내',
    emoji: '💬',
    description: '네 번째 본문 영역',
    order: 60,
  },

  // 기타
  'default': {
    sectionName: 'default',
    displayName: '기타',
    emoji: '📄',
    description: '분류되지 않은 항목',
    order: 99,
  },
};

/**
 * 필드 라벨 매핑 테이블
 * 기술적인 라벨 → 사용자 친화적인 라벨
 */
const FIELD_LABEL_MAPPING: Record<string, string> = {
  // 배너 관련
  'banner_label': '배너 작은 텍스트',
  'banner_subtitle': '배너 부제목',
  'banner_title': '배너 큰 제목',
  'banner_heading': '배너 큰 제목',
  'banner_description': '배너 설명 문구',
  'banner_text': '배너 설명 문구',
  'banner_background': '배너 배경 이미지',
  'banner_image': '배너 이미지',
  'banner_bg': '배너 배경 이미지',

  // 일반 텍스트
  'title': '제목',
  'heading': '제목',
  'subtitle': '부제목',
  'description': '설명',
  'text': '텍스트',
  'content': '내용',

  // 이미지
  'image': '이미지',
  'background': '배경 이미지',
  'bg_image': '배경 이미지',
  'thumbnail': '썸네일 이미지',

  // 버튼
  'button_text': '버튼 텍스트',
  'button_label': '버튼 문구',
  'cta_text': '버튼 문구',
  'link_text': '링크 텍스트',

  // 기타
  'label': '라벨',
  'caption': '캡션',
  'alt_text': '이미지 설명',
};

/**
 * 섹션명으로 표시 정보 가져오기
 */
export function getSectionInfo(sectionName: string | null): SectionInfo {
  if (!sectionName) {
    return SECTION_DISPLAY_NAMES['default'];
  }

  const normalized = sectionName.toLowerCase().trim();
  return SECTION_DISPLAY_NAMES[normalized] || {
    sectionName: normalized,
    displayName: sectionName,
    emoji: '📄',
    description: '',
    order: 50,
  };
}

/**
 * 필드 라벨을 사용자 친화적으로 변환
 */
export function getFriendlyLabel(originalLabel: string): string {
  if (!originalLabel) return '항목';

  const normalized = originalLabel.toLowerCase().trim().replace(/\s+/g, '_');
  return FIELD_LABEL_MAPPING[normalized] || originalLabel;
}

/**
 * 요소 타입에 따른 아이콘
 */
export function getElementTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'text': '📝',
    'html': '📄',
    'image': '🖼️',
    'background': '🎨',
  };

  return icons[type.toLowerCase()] || '📌';
}

/**
 * 섹션 정렬 비교 함수
 */
export function compareSections(a: SectionInfo, b: SectionInfo): number {
  return a.order - b.order;
}
