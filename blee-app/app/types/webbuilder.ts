// 웹빌더 관련 타입 정의

import { BlockType, TemplateCategory } from '@prisma/client';

// 콘텐츠 블록 타입
export interface ContentBlockData {
  id?: string;
  name: string;
  type: BlockType;
  content: BlockContent;
  styles?: BlockStyles;
  settings?: BlockSettings;
  isGlobal?: boolean;
}

// 블록 콘텐츠 타입
export type BlockContent =
  | TextBlockContent
  | ImageBlockContent
  | VideoBlockContent
  | CarouselBlockContent
  | GridBlockContent
  | ButtonBlockContent
  | FormBlockContent
  | MapBlockContent
  | HtmlBlockContent
  | ComponentBlockContent;

// 텍스트 블록 콘텐츠
export interface TextBlockContent {
  type: 'TEXT';
  text: string;
  format?: 'plain' | 'html' | 'markdown';
}

// 이미지 블록 콘텐츠
export interface ImageBlockContent {
  type: 'IMAGE';
  src: string;
  alt: string;
  caption?: string;
  link?: string;
}

// 비디오 블록 콘텐츠
export interface VideoBlockContent {
  type: 'VIDEO';
  src: string;
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
}

// 캐러셀 블록 콘텐츠
export interface CarouselBlockContent {
  type: 'CAROUSEL';
  items: Array<{
    image: string;
    title?: string;
    description?: string;
    link?: string;
  }>;
  autoplay?: boolean;
  interval?: number;
}

// 그리드 블록 콘텐츠
export interface GridBlockContent {
  type: 'GRID';
  columns: number;
  gap?: number;
  rows?: number;
  items: Array<{
    content: BlockContent;
    span?: number;
    rowSpan?: number;
    className?: string;
  }>;
  alignItems?: string;
  justifyItems?: string;
  className?: string;
}

// 버튼 블록 콘텐츠
export interface ButtonBlockContent {
  type: 'BUTTON';
  text: string;
  link: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

// 폼 블록 콘텐츠
export interface FormBlockContent {
  type: 'FORM';
  fields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'file';
    required: boolean;
    placeholder?: string;
    validation?: {
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      min?: string;
      max?: string;
    };
    options?: Array<{ value: string; label: string }>;
    width?: 'full' | 'half' | 'third';
  }>;
  submitText?: string;
  action?: string;
  method?: 'GET' | 'POST';
  successMessage?: string;
  showValidation?: boolean;
  ajaxSubmit?: boolean;
}

// 지도 블록 콘텐츠
export interface MapBlockContent {
  type: 'MAP';
  lat: number;
  lng: number;
  zoom: number;
  title?: string;
  address?: string;
  provider?: 'google' | 'naver' | 'kakao';
  markers?: Array<{
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
  showControls?: boolean;
  enableScroll?: boolean;
  enableDragging?: boolean;
  width?: string;
  height?: string;
  mapStyle?: string;
}

// HTML 블록 콘텐츠
export interface HtmlBlockContent {
  type: 'HTML';
  html: string;
}

// 컴포넌트 블록 콘텐츠
export interface ComponentBlockContent {
  type: 'COMPONENT';
  componentName: string;
  props?: Record<string, unknown>;
}

// 블록 스타일
export interface BlockStyles {
  backgroundColor?: string;
  color?: string;
  padding?: string;
  margin?: string;
  border?: string;
  borderRadius?: string;
  boxShadow?: string;
  maxWidth?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: string;
  fontWeight?: string;
  customCSS?: string;
}

// 블록 설정
export interface BlockSettings {
  className?: string;
  id?: string;
  animation?: {
    type: 'fade' | 'slide' | 'zoom';
    duration?: number;
    delay?: number;
  };
  responsive?: {
    mobile?: Partial<BlockStyles>;
    tablet?: Partial<BlockStyles>;
    desktop?: Partial<BlockStyles>;
  };
}

// 페이지 블록 배치
export interface PageBlockArrangement {
  pageId: string;
  sectionName: string;
  blocks: Array<{
    blockId: string;
    order: number;
    customStyles?: BlockStyles;
  }>;
}

// SEO 설정
export interface SEOSettings {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown>;
}

// 버전 정보
export interface VersionInfo {
  version: number;
  content: BlockContent;
  styles?: BlockStyles;
  settings?: BlockSettings;
  changedBy: string;
  changeNote?: string;
  createdAt: Date;
}

// API 응답 타입
export interface WebBuilderResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 페이지 섹션 정보
export interface PageSection {
  sectionName: string;
  displayName: string;
  description?: string;
  maxBlocks?: number;
  allowedBlockTypes?: BlockType[];
}

// 미리보기 모드
export interface PreviewMode {
  enabled: boolean;
  device: 'desktop' | 'tablet' | 'mobile';
  zoom?: number;
}

// 블록 템플릿 데이터
export interface BlockTemplateData {
  id?: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  thumbnailUrl?: string;
  isPublic?: boolean;
  createdBy?: string;
  templateData: ContentBlockData;
  tags?: string[];
  usageCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// 템플릿 갤러리 필터
export interface TemplateGalleryFilter {
  category?: TemplateCategory | 'ALL';
  search?: string;
  tags?: string[];
  isPublic?: boolean;
  createdBy?: string;
}

// 템플릿 생성 요청
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  thumbnailUrl?: string;
  isPublic?: boolean;
  templateData: ContentBlockData;
  tags?: string[];
}

// 템플릿 사용 이벤트
export interface TemplateUsageEvent {
  templateId: string;
  userId: string;
  pageId?: string;
  sectionName?: string;
  timestamp: Date;
}