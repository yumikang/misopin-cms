import { Prisma } from '@prisma/client';

/**
 * 편집 가능한 섹션 타입
 */
export interface ParsedSection {
  id: string;
  type: 'text' | 'image' | 'background';
  label: string;
  selector: string;
  content?: string;
  imageUrl?: string;
  alt?: string;
  preview?: string;
}

/**
 * HTML 파싱 결과
 */
export interface ParseResult {
  success: boolean;
  sections: ParsedSection[];
  error?: string;
}

/**
 * HTML 업데이트 결과
 */
export interface UpdateResult {
  success: boolean;
  message?: string;
  backupPath?: string;
}

/**
 * Prisma Json 타입을 ParsedSection 배열로 변환하는 유틸리티
 */
export function parseSectionsFromJson(json: Prisma.JsonValue): ParsedSection[] {
  if (!Array.isArray(json)) {
    return [];
  }
  return json as ParsedSection[];
}

/**
 * ParsedSection 배열을 Prisma Json 타입으로 변환하는 유틸리티
 */
export function sectionsToJson(sections: ParsedSection[]): Prisma.JsonValue {
  return sections as Prisma.JsonValue;
}

/**
 * 정적 페이지 섹션 업데이트 요청 타입
 */
export interface StaticPageUpdateRequest {
  sections: ParsedSection[];
  changedBy?: string;
  changeNote?: string;
}

/**
 * 정적 페이지 생성 요청 타입
 */
export interface StaticPageCreateRequest {
  slug: string;
  title: string;
  filePath: string;
}
