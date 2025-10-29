/**
 * TipTap 기반 정적 페이지 편집 시스템 - 타입 정의
 */

import { ElementType } from '@prisma/client';

/**
 * 편집 가능한 요소 인터페이스
 */
export interface EditableElement {
  id: string;              // element ID (e.g., "section-0-title")
  type: ElementType;       // 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND'
  selector: string;        // CSS selector for finding element in HTML
  currentValue: string;    // Current content/src/background-image
  label: string;           // User-friendly label
  sectionName: string;     // Section grouping (e.g., "first-section")
  order: number;           // Display order within section
}

/**
 * HTML 파싱 결과
 */
export interface ParseResult {
  success: boolean;
  elements: EditableElement[];
  error?: string;
  warnings?: string[];
}

/**
 * HTML 업데이트 결과
 */
export interface UpdateResult {
  success: boolean;
  message: string;
  backupPath?: string;
  error?: string;
}

/**
 * 섹션별 요소 그룹
 */
export interface SectionGroup {
  name: string;            // Section name
  order: number;           // Section display order
  elements: EditableElement[];
}

/**
 * 편집 가능 요소 응답 (API)
 */
export interface EditableElementsResponse {
  pageId: string;
  pageTitle: string;
  editMode: 'PARSER' | 'ATTRIBUTE';
  sections: Record<string, SectionGroup>;
  totalElements: number;
  lastParsedAt: string | null;
}

/**
 * 요소 업데이트 요청 (API)
 */
export interface ElementUpdateRequest {
  elementId: string;
  newValue: string;
  elementType: ElementType;
}

/**
 * 파서 옵션
 */
export interface ParserOptions {
  includeBackgrounds?: boolean;  // Include background images
  includeImages?: boolean;        // Include img tags
  validateAttributes?: boolean;   // Validate data-editable attributes
  strictMode?: boolean;           // Throw on errors vs warnings
}

/**
 * 업데이터 옵션
 */
export interface UpdaterOptions {
  createBackup?: boolean;         // Create backup before update
  validateHtml?: boolean;         // Validate HTML after update
  sanitizeHtml?: boolean;         // Sanitize HTML content
}

/**
 * 유효성 검사 결과
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'MISSING_ATTRIBUTE' | 'DUPLICATE_ID' | 'INVALID_TYPE' | 'EMPTY_VALUE' | 'XSS_DETECTED';
  message: string;
  elementId?: string;
  selector?: string;
}

export interface ValidationWarning {
  type: 'LONG_VALUE' | 'SPECIAL_CHARS' | 'PERFORMANCE' | 'ACCESSIBILITY';
  message: string;
  elementId?: string;
}
