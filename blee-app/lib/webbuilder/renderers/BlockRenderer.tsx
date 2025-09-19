import { ContentBlockData } from '@/app/types/webbuilder';

/**
 * 공통 블록 렌더러 인터페이스
 * 모든 블록 타입 렌더러가 구현해야 하는 기본 메서드 정의
 */
export interface BlockRenderer {
  /**
   * 블록을 HTML 문자열로 렌더링
   * @param block 렌더링할 블록 데이터
   * @returns 렌더링된 HTML 문자열
   */
  renderToHTML(block: ContentBlockData): string;

  /**
   * 블록을 React JSX Element로 렌더링
   * @param block 렌더링할 블록 데이터
   * @returns React JSX Element
   */
  renderToReact(block: ContentBlockData): JSX.Element;

  /**
   * 블록 타입 유효성 검증
   * @param block 검증할 블록 데이터
   * @returns 유효성 검증 결과
   */
  validate(block: ContentBlockData): boolean;

  /**
   * 블록에 스타일 적용
   * @param baseHTML 기본 HTML
   * @param block 블록 데이터 (스타일 정보 포함)
   * @returns 스타일이 적용된 HTML
   */
  applyStyles(baseHTML: string, block: ContentBlockData): string;
}

/**
 * 추상 BlockRenderer 기본 클래스
 * 공통 기능 구현 및 템플릿 메서드 패턴 제공
 */
export abstract class BaseBlockRenderer implements BlockRenderer {
  abstract renderToHTML(block: ContentBlockData): string;
  abstract renderToReact(block: ContentBlockData): JSX.Element;

  /**
   * 기본 유효성 검증 (하위 클래스에서 오버라이드 가능)
   */
  validate(block: ContentBlockData): boolean {
    return !!(block && block.type && block.content);
  }

  /**
   * 공통 스타일 적용 로직
   */
  applyStyles(baseHTML: string, block: ContentBlockData): string {
    if (!block.styles) return baseHTML;

    const styles = block.styles;
    const styleAttributes: string[] = [];

    // CSS 스타일 매핑
    if (styles.backgroundColor) styleAttributes.push(`background-color: ${styles.backgroundColor}`);
    if (styles.color) styleAttributes.push(`color: ${styles.color}`);
    if (styles.padding) styleAttributes.push(`padding: ${styles.padding}`);
    if (styles.margin) styleAttributes.push(`margin: ${styles.margin}`);
    if (styles.border) styleAttributes.push(`border: ${styles.border}`);
    if (styles.borderRadius) styleAttributes.push(`border-radius: ${styles.borderRadius}`);
    if (styles.boxShadow) styleAttributes.push(`box-shadow: ${styles.boxShadow}`);
    if (styles.maxWidth) styleAttributes.push(`max-width: ${styles.maxWidth}`);
    if (styles.textAlign) styleAttributes.push(`text-align: ${styles.textAlign}`);
    if (styles.fontSize) styleAttributes.push(`font-size: ${styles.fontSize}`);
    if (styles.fontWeight) styleAttributes.push(`font-weight: ${styles.fontWeight}`);

    if (styleAttributes.length === 0) return baseHTML;

    const styleString = styleAttributes.join('; ');

    // HTML 태그에 style 속성 추가
    const tagMatch = baseHTML.match(/^<([^>\s]+)([^>]*)>/);
    if (tagMatch) {
      const [fullMatch, tagName, attributes] = tagMatch;
      const existingStyle = attributes.match(/style="([^"]*)"/);

      if (existingStyle) {
        // 기존 style 속성 확장
        const updatedStyle = `${existingStyle[1]}; ${styleString}`;
        return baseHTML.replace(existingStyle[0], `style="${updatedStyle}"`);
      } else {
        // 새 style 속성 추가
        return baseHTML.replace(fullMatch, `<${tagName}${attributes} style="${styleString}">`);
      }
    }

    return baseHTML;
  }

  /**
   * CSS 클래스명 생성 (Tailwind CSS 호환)
   */
  protected generateTailwindClasses(block: ContentBlockData): string {
    const classes: string[] = [];
    const styles = block.styles;

    if (!styles) return '';

    // 기본 블록 클래스
    classes.push('cms-block');

    // 텍스트 정렬
    if (styles.textAlign) {
      const textAlignMap = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify'
      };
      const alignClass = textAlignMap[styles.textAlign as keyof typeof textAlignMap];
      if (alignClass) classes.push(alignClass);
    }

    // 패딩/마진 (간단한 값만 매핑)
    if (styles.padding) {
      const paddingMap: Record<string, string> = {
        '8px': 'p-2',
        '16px': 'p-4',
        '24px': 'p-6',
        '32px': 'p-8'
      };
      const paddingClass = paddingMap[styles.padding];
      if (paddingClass) classes.push(paddingClass);
    }

    return classes.join(' ');
  }

  /**
   * HTML 이스케이프 (XSS 방지)
   */
  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 에러 발생시 폴백 HTML 생성
   */
  protected generateErrorFallback(block: ContentBlockData, error: Error): string {
    console.error(`블록 렌더링 오류 (${block.type}):`, error);
    return `
      <div class="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
        <p class="text-red-700 text-sm">
          <strong>렌더링 오류:</strong> ${block.name || `${block.type} 블록`}
        </p>
        <p class="text-red-600 text-xs mt-1">
          ${error.message}
        </p>
      </div>
    `;
  }
}

/**
 * 렌더링 유틸리티 함수
 */
export class RenderUtils {
  /**
   * 안전한 HTML 생성 (DOMPurify 대체)
   */
  static sanitizeHTML(html: string): string {
    // 기본적인 HTML 태그만 허용
    const allowedTags = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                        'strong', 'em', 'u', 'br', 'ul', 'ol', 'li', 'a', 'img'];

    // 간단한 태그 필터링 (실제 운영에서는 DOMPurify 사용 권장)
    return html.replace(/<\/?([^>]+)>/g, (match, tag) => {
      const tagName = tag.split(' ')[0].toLowerCase();
      return allowedTags.includes(tagName) ? match : '';
    });
  }

  /**
   * 반응형 이미지 클래스 생성
   */
  static getResponsiveImageClasses(): string {
    return 'w-full h-auto object-contain rounded';
  }

  /**
   * 접근성 속성 생성
   */
  static generateAccessibilityAttributes(type: string, content: Record<string, any>): string {
    const attributes: string[] = [];

    switch (type) {
      case 'BUTTON':
        if (content.text) {
          attributes.push(`aria-label="${content.text}"`);
        }
        attributes.push('role="button"');
        break;
      case 'IMAGE':
        if (content.alt) {
          attributes.push(`alt="${content.alt}"`);
        }
        break;
      case 'FORM':
        attributes.push('role="form"');
        break;
    }

    return attributes.join(' ');
  }
}