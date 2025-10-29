/**
 * TipTap 기반 정적 페이지 편집 시스템 - HTML 파서
 *
 * data-editable 속성이 표시된 요소를 추출하고 구조화된 데이터로 변환
 */

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { ElementType } from '@prisma/client';
import {
  EditableElement,
  ParseResult,
  ParserOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './attribute-types';

/**
 * HTML에서 편집 가능한 요소를 파싱
 */
export function parseEditableAttributes(
  html: string,
  options: ParserOptions = {}
): ParseResult {
  const {
    includeBackgrounds = true,
    includeImages = true,
    validateAttributes = true,
    strictMode = false,
  } = options;

  try {
    const $ = cheerio.load(html);
    const elements: EditableElement[] = [];
    const warnings: string[] = [];
    let elementOrder = 0;

    // 1. data-editable 속성이 있는 요소 파싱
    $('[data-editable]').each((_, elem) => {
      const $elem = $(elem);
      const elementId = $elem.attr('data-editable');

      if (!elementId) {
        warnings.push('Found element with empty data-editable attribute');
        return;
      }

      // 요소 타입 결정
      let elementType: ElementType;
      let currentValue: string;
      const tagName = elem.tagName.toLowerCase();

      if (tagName === 'img' && includeImages) {
        elementType = ElementType.IMAGE;
        currentValue = $elem.attr('src') || '';
      } else if ($elem.attr('data-type') === 'html' || $elem.find('*').length > 0) {
        // HTML 포함 콘텐츠
        elementType = ElementType.HTML;
        currentValue = $elem.html() || '';
      } else {
        // 순수 텍스트
        elementType = ElementType.TEXT;
        currentValue = $elem.text().trim();
      }

      // CSS selector 생성
      const selector = generateSelector($, elem);

      // 섹션 이름 추출
      const sectionName = findParentSection($, elem);

      // 라벨 생성
      const label = generateLabel($elem, elementId, sectionName);

      elements.push({
        id: elementId,
        type: elementType,
        selector,
        currentValue,
        label,
        sectionName,
        order: elementOrder++,
      });
    });

    // 2. 배경 이미지 파싱 (옵션)
    if (includeBackgrounds) {
      $('[data-editable-bg]').each((_, elem) => {
        const $elem = $(elem);
        const elementId = $elem.attr('data-editable-bg');

        if (!elementId) {
          warnings.push('Found element with empty data-editable-bg attribute');
          return;
        }

        // 배경 이미지 URL 추출
        const styleAttr = $elem.attr('style') || '';
        const bgMatch = styleAttr.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
        const currentValue = bgMatch ? bgMatch[1] : '';

        const selector = generateSelector($, elem);
        const sectionName = findParentSection($, elem);
        const label = generateLabel($elem, elementId, sectionName, 'Background');

        elements.push({
          id: elementId,
          type: ElementType.BACKGROUND,
          selector,
          currentValue,
          label,
          sectionName,
          order: elementOrder++,
        });
      });
    }

    // 3. 검증 (옵션)
    if (validateAttributes) {
      const validation = validateElements(elements);

      if (!validation.valid) {
        if (strictMode) {
          return {
            success: false,
            elements: [],
            error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
            warnings: validation.warnings.map(w => w.message),
          };
        } else {
          // 경고만 추가
          warnings.push(...validation.errors.map(e => e.message));
          warnings.push(...validation.warnings.map(w => w.message));
        }
      } else if (validation.warnings.length > 0) {
        warnings.push(...validation.warnings.map(w => w.message));
      }
    }

    return {
      success: true,
      elements,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      elements: [],
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * 요소에 대한 고유한 CSS selector 생성
 */
function generateSelector($: cheerio.CheerioAPI, elem: AnyNode): string {
  const $elem = $(elem);

  // ID가 있으면 사용
  const id = $elem.attr('id');
  if (id) {
    return `#${id}`;
  }

  // data-editable 속성 사용
  const dataEditable = $elem.attr('data-editable') || $elem.attr('data-editable-bg');
  if (dataEditable) {
    return `[data-editable="${dataEditable}"], [data-editable-bg="${dataEditable}"]`;
  }

  // 클래스 + 태그명 조합
  const classes = $elem.attr('class');
  const tagName = 'tagName' in elem ? elem.tagName.toLowerCase() : 'element';

  if (classes) {
    const classList = classes.split(/\s+/).filter(c => c.length > 0);
    if (classList.length > 0) {
      return `${tagName}.${classList.join('.')}`;
    }
  }

  // 부모 내에서의 nth-child
  const parent = $elem.parent();
  if (parent.length > 0) {
    const siblings = parent.children(tagName);
    const index = siblings.index(elem);
    return `${tagName}:nth-child(${index + 1})`;
  }

  // 최종 폴백
  return tagName;
}

/**
 * 부모 섹션 찾기
 */
function findParentSection($: cheerio.CheerioAPI, elem: AnyNode): string {
  const $elem = $(elem);

  // 1. data-section 속성 확인
  let $current = $elem;
  while ($current.length > 0) {
    const sectionName = $current.attr('data-section');
    if (sectionName) {
      return sectionName;
    }
    $current = $current.parent();
  }

  // 2. section 태그의 ID 확인
  const $section = $elem.closest('section');
  if ($section.length > 0) {
    const sectionId = $section.attr('id');
    if (sectionId) {
      return sectionId;
    }
  }

  // 3. 특정 클래스 패턴 확인 (section-, area-, block- 등)
  $current = $elem;
  while ($current.length > 0) {
    const classes = $current.attr('class') || '';
    const match = classes.match(/(?:section|area|block)-([a-z0-9-]+)/i);
    if (match) {
      return match[1];
    }
    $current = $current.parent();
  }

  // 4. 폴백: 'default'
  return 'default';
}

/**
 * 사용자 친화적인 라벨 생성
 */
function generateLabel(
  $elem: cheerio.Cheerio<AnyNode>,
  elementId: string,
  sectionName: string,
  suffix?: string
): string {
  // 1. data-label 속성 우선
  const dataLabel = $elem.attr('data-label');
  if (dataLabel) {
    return suffix ? `${dataLabel} ${suffix}` : dataLabel;
  }

  // 2. aria-label 확인
  const ariaLabel = $elem.attr('aria-label');
  if (ariaLabel) {
    return suffix ? `${ariaLabel} ${suffix}` : ariaLabel;
  }

  // 3. 요소 ID를 읽기 쉽게 변환
  // 예: "section-0-title" → "Section 0 Title"
  const readable = elementId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // 4. 섹션명 포함
  const sectionReadable = sectionName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const label = sectionName !== 'default'
    ? `${sectionReadable} - ${readable}`
    : readable;

  return suffix ? `${label} ${suffix}` : label;
}

/**
 * 편집 가능 요소 배열 검증
 */
function validateElements(elements: EditableElement[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const seenIds = new Set<string>();

  for (const element of elements) {
    // 1. 중복 ID 검사
    if (seenIds.has(element.id)) {
      errors.push({
        type: 'DUPLICATE_ID',
        message: `Duplicate element ID: ${element.id}`,
        elementId: element.id,
      });
    }
    seenIds.add(element.id);

    // 2. 빈 값 검사
    if (!element.currentValue || element.currentValue.trim().length === 0) {
      errors.push({
        type: 'EMPTY_VALUE',
        message: `Element has empty value: ${element.id}`,
        elementId: element.id,
      });
    }

    // 3. 긴 값 경고
    if (element.currentValue.length > 5000) {
      warnings.push({
        type: 'LONG_VALUE',
        message: `Element has very long content (${element.currentValue.length} chars): ${element.id}`,
        elementId: element.id,
      });
    }

    // 4. XSS 위험 검사 (기본적인 패턴)
    if (element.type === ElementType.HTML) {
      const dangerousPatterns = [
        /<script/i,
        /on\w+\s*=/i, // onclick, onerror 등
        /javascript:/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(element.currentValue)) {
          errors.push({
            type: 'XSS_DETECTED',
            message: `Potential XSS risk detected in: ${element.id}`,
            elementId: element.id,
          });
          break;
        }
      }
    }

    // 5. 접근성 경고
    if (element.type === ElementType.IMAGE && !element.currentValue.includes('alt')) {
      warnings.push({
        type: 'ACCESSIBILITY',
        message: `Image element may need alt text: ${element.id}`,
        elementId: element.id,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 섹션별로 요소 그룹화
 */
export function groupBySection(elements: EditableElement[]): Record<string, EditableElement[]> {
  const groups: Record<string, EditableElement[]> = {};

  for (const element of elements) {
    const section = element.sectionName || 'default';
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(element);
  }

  // 각 섹션 내에서 order로 정렬
  for (const section in groups) {
    groups[section].sort((a, b) => a.order - b.order);
  }

  return groups;
}
