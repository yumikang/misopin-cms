import React from 'react';
import { ContentBlockData, HtmlBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * HTML 블록 렌더러
 * 사용자 정의 HTML, 안전한 sanitization, 스크립트 처리
 */
export class HtmlBlockRenderer extends BaseBlockRenderer {
  /**
   * HTML 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'HTML') {
      return false;
    }

    const content = block.content as HtmlBlockContent;
    return !!(content && typeof content.html === 'string');
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid HTML block data');
      }

      const content = block.content as HtmlBlockContent;
      const {
        html,
        sanitize = true,
        allowScripts = false,
        allowStyles = true,
        allowedTags,
        allowedAttributes
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);

      // HTML 처리
      let processedHtml = html;

      if (sanitize) {
        processedHtml = this.sanitizeHTML(html, {
          allowScripts,
          allowStyles,
          allowedTags,
          allowedAttributes
        });
      }

      // CSS와 JavaScript 분리
      const { cleanHtml, extractedCss, extractedJs } = this.extractStylesAndScripts(processedHtml);

      // 기본 HTML 컨테이너 생성
      const baseHTML = `
        <div class="cms-html-block ${tailwindClasses}">
          <div class="html-content">
            ${cleanHtml}
          </div>
        </div>
        ${extractedCss ? `<style>${extractedCss}</style>` : ''}
        ${extractedJs && allowScripts ? `<script>${extractedJs}</script>` : ''}
      `.trim();

      // 스타일 적용
      return this.applyStyles(baseHTML, block);

    } catch (error) {
      return this.generateErrorFallback(block, error as Error);
    }
  }

  /**
   * React JSX로 렌더링
   */
  renderToReact(block: ContentBlockData): JSX.Element {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid HTML block data');
      }

      const content = block.content as HtmlBlockContent;
      const {
        html,
        sanitize = true,
        allowScripts = false,
        allowStyles = true,
        allowedTags,
        allowedAttributes
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-html-block ${tailwindClasses}`;
      const inlineStyles = this.generateInlineStyles(block);

      // HTML 처리
      let processedHtml = html;

      if (sanitize) {
        processedHtml = this.sanitizeHTML(html, {
          allowScripts,
          allowStyles,
          allowedTags,
          allowedAttributes
        });
      }

      // CSS와 JavaScript 분리
      const { cleanHtml, extractedCss, extractedJs } = this.extractStylesAndScripts(processedHtml);

      return (
        <div className={className} style={inlineStyles}>
          <HtmlContentComponent
            html={cleanHtml}
            css={extractedCss}
            js={extractedJs}
            allowScripts={allowScripts}
            allowStyles={allowStyles}
          />
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'HTML 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * HTML Sanitization
   */
  private sanitizeHTML(html: string, options: {
    allowScripts: boolean;
    allowStyles: boolean;
    allowedTags?: string[];
    allowedAttributes?: string[];
  }): string {
    const {
      allowScripts,
      allowStyles,
      allowedTags,
      allowedAttributes
    } = options;

    // 기본 허용 태그
    const defaultAllowedTags = [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 'br', 'hr', 'ul', 'ol', 'li',
      'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'blockquote', 'pre', 'code', 'sub', 'sup'
    ];

    // 기본 허용 속성
    const defaultAllowedAttributes = [
      'class', 'id', 'style', 'href', 'src', 'alt', 'title',
      'width', 'height', 'target', 'rel'
    ];

    const finalAllowedTags = allowedTags || defaultAllowedTags;
    const finalAllowedAttributes = allowedAttributes || defaultAllowedAttributes;

    // 스타일 태그 처리
    if (!allowStyles) {
      html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      finalAllowedAttributes.splice(finalAllowedAttributes.indexOf('style'), 1);
    }

    // 스크립트 태그 처리
    if (!allowScripts) {
      html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      html = html.replace(/on\w+="[^"]*"/gi, ''); // 이벤트 핸들러 제거
    }

    // 태그 필터링
    return html.replace(/<\/?([^>]+)>/g, (match, tag) => {
      const tagName = tag.split(' ')[0].toLowerCase();

      if (!finalAllowedTags.includes(tagName)) {
        return '';
      }

      // 속성 필터링
      const filteredTag = tag.replace(/(\w+)="[^"]*"/g, (attrMatch, attrName) => {
        return finalAllowedAttributes.includes(attrName.toLowerCase()) ? attrMatch : '';
      });

      return `<${filteredTag}>`;
    });
  }

  /**
   * CSS와 JavaScript 분리
   */
  private extractStylesAndScripts(html: string): {
    cleanHtml: string;
    extractedCss: string;
    extractedJs: string;
  } {
    let extractedCss = '';
    let extractedJs = '';
    let cleanHtml = html;

    // CSS 추출
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      extractedCss = styleMatches
        .map(match => match.replace(/<\/?style[^>]*>/gi, ''))
        .join('\n');
      cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    }

    // JavaScript 추출
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      extractedJs = scriptMatches
        .map(match => match.replace(/<\/?script[^>]*>/gi, ''))
        .join('\n');
      cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    }

    return { cleanHtml, extractedCss, extractedJs };
  }

  /**
   * 위험한 HTML 패턴 감지
   */
  private detectDangerousPatterns(html: string): string[] {
    const dangerousPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+="[^"]*"/gi,
      /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
      /<object[^>]*>[\s\S]*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<form[^>]*>[\s\S]*?<\/form>/gi
    ];

    const detectedPatterns: string[] = [];

    dangerousPatterns.forEach((pattern, index) => {
      if (pattern.test(html)) {
        const patternNames = [
          'script 태그',
          'javascript: 프로토콜',
          '이벤트 핸들러',
          'iframe 태그',
          'object 태그',
          'embed 태그',
          'form 태그'
        ];
        detectedPatterns.push(patternNames[index]);
      }
    });

    return detectedPatterns;
  }

  /**
   * HTML 구조 유효성 검증
   */
  private validateHTMLStructure(html: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let isValid = true;

    // 기본 HTML 구조 검증
    const openTags = html.match(/<([^/>]+)>/g) || [];
    const closeTags = html.match(/<\/([^>]+)>/g) || [];

    const openTagNames = openTags.map(tag =>
      tag.replace(/<\/?([^\s>]+).*?>/g, '$1').toLowerCase()
    );
    const closeTagNames = closeTags.map(tag =>
      tag.replace(/<\/?([^>]+)>/g, '$1').toLowerCase()
    );

    // 자체 닫는 태그 목록
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'source'];

    // 태그 매칭 검증
    openTagNames.forEach(tagName => {
      if (!selfClosingTags.includes(tagName) && !closeTagNames.includes(tagName)) {
        errors.push(`닫히지 않은 태그: <${tagName}>`);
        isValid = false;
      }
    });

    return { isValid, errors };
  }

  /**
   * React 인라인 스타일 생성
   */
  private generateInlineStyles(block: ContentBlockData): React.CSSProperties {
    const styles = block.styles;
    if (!styles) return {};

    const inlineStyles: React.CSSProperties = {};

    if (styles.backgroundColor) inlineStyles.backgroundColor = styles.backgroundColor;
    if (styles.padding) inlineStyles.padding = styles.padding;
    if (styles.margin) inlineStyles.margin = styles.margin;
    if (styles.border) inlineStyles.border = styles.border;
    if (styles.borderRadius) inlineStyles.borderRadius = styles.borderRadius;
    if (styles.boxShadow) inlineStyles.boxShadow = styles.boxShadow;
    if (styles.maxWidth) inlineStyles.maxWidth = styles.maxWidth;

    return inlineStyles;
  }

  /**
   * HTML 텍스트 이스케이프
   */
  protected escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

/**
 * React HTML 콘텐츠 컴포넌트
 */
interface HtmlContentComponentProps {
  html: string;
  css?: string;
  js?: string;
  allowScripts: boolean;
  allowStyles: boolean;
}

function HtmlContentComponent({
  html,
  css,
  js,
  allowScripts,
  allowStyles
}: HtmlContentComponentProps): JSX.Element {
  const contentRef = React.useRef<HTMLDivElement>(null);

  // CSS 적용
  React.useEffect(() => {
    if (allowStyles && css) {
      const styleElement = document.createElement('style');
      styleElement.textContent = css;
      document.head.appendChild(styleElement);

      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, [css, allowStyles]);

  // JavaScript 실행
  React.useEffect(() => {
    if (allowScripts && js) {
      try {
        // 안전한 스크립트 실행을 위한 함수 래퍼
        const scriptFunction = new Function(js);
        scriptFunction();
      } catch (error) {
        console.warn('HTML 블록 스크립트 실행 오류:', error);
      }
    }
  }, [js, allowScripts]);

  return (
    <div
      ref={contentRef}
      className="html-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * HTML 미리보기 컴포넌트 (에디터용)
 */
interface HtmlPreviewComponentProps {
  html: string;
  showWarnings?: boolean;
}

export function HtmlPreviewComponent({
  html,
  showWarnings = true
}: HtmlPreviewComponentProps): JSX.Element {
  const renderer = new HtmlBlockRenderer();
  const [warnings, setWarnings] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (showWarnings) {
      const dangerousPatterns = renderer['detectDangerousPatterns'](html);
      const { errors } = renderer['validateHTMLStructure'](html);
      setWarnings([...dangerousPatterns, ...errors]);
    }
  }, [html, showWarnings]);

  return (
    <div className="html-preview">
      {warnings.length > 0 && showWarnings && (
        <div className="warnings mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="text-yellow-800 font-medium mb-2">⚠️ 주의사항:</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
      <div
        className="html-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}