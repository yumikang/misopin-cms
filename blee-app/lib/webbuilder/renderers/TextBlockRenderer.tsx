import React from 'react';
import { ContentBlockData, TextBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * 텍스트 블록 렌더러
 * HTML 포맷 지원, 안전한 sanitization 제공
 */
export class TextBlockRenderer extends BaseBlockRenderer {
  /**
   * 텍스트 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'TEXT') {
      return false;
    }

    const content = block.content as TextBlockContent;
    return !!(content && typeof content.text === 'string');
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid text block data');
      }

      const content = block.content as TextBlockContent;
      const format = content.format || 'html';
      const text = content.text || '';

      let processedText: string;

      switch (format) {
        case 'plain':
          // 일반 텍스트를 HTML로 변환 (줄바꿈 처리)
          processedText = this.escapeHtml(text).replace(/\n/g, '<br>');
          break;

        case 'markdown':
          // 간단한 마크다운 처리 (실제 운영에서는 마크다운 라이브러리 사용)
          processedText = this.processSimpleMarkdown(text);
          break;

        case 'html':
        default:
          // HTML 콘텐츠 sanitization
          processedText = RenderUtils.sanitizeHTML(text);
          break;
      }

      // 기본 텍스트 컨테이너 생성
      const tailwindClasses = this.generateTailwindClasses(block);
      const baseHTML = `
        <div class="cms-text-block ${tailwindClasses}">
          <div class="prose max-w-none">
            ${processedText}
          </div>
        </div>
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
        throw new Error('Invalid text block data');
      }

      const content = block.content as TextBlockContent;
      const format = content.format || 'html';
      const text = content.text || '';

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-text-block ${tailwindClasses}`;

      // 인라인 스타일 생성
      const inlineStyles = this.generateInlineStyles(block);

      switch (format) {
        case 'plain':
          return (
            <div className={className} style={inlineStyles}>
              <div className="prose max-w-none">
                {text.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );

        case 'markdown':
          const markdownHtml = this.processSimpleMarkdown(text);
          return (
            <div className={className} style={inlineStyles}>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownHtml }}
              />
            </div>
          );

        case 'html':
        default:
          const sanitizedHtml = RenderUtils.sanitizeHTML(text);
          return (
            <div className={className} style={inlineStyles}>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            </div>
          );
      }

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'TEXT 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * 간단한 마크다운 처리
   */
  private processSimpleMarkdown(text: string): string {
    let processed = text;

    // 헤딩
    processed = processed.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 굵은 글씨
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 기울임
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 링크
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 줄바꿈
    processed = processed.replace(/\n/g, '<br>');

    return processed;
  }

  /**
   * React 인라인 스타일 생성
   */
  private generateInlineStyles(block: ContentBlockData): React.CSSProperties {
    const styles = block.styles;
    if (!styles) return {};

    const inlineStyles: React.CSSProperties = {};

    if (styles.backgroundColor) inlineStyles.backgroundColor = styles.backgroundColor;
    if (styles.color) inlineStyles.color = styles.color;
    if (styles.padding) inlineStyles.padding = styles.padding;
    if (styles.margin) inlineStyles.margin = styles.margin;
    if (styles.border) inlineStyles.border = styles.border;
    if (styles.borderRadius) inlineStyles.borderRadius = styles.borderRadius;
    if (styles.boxShadow) inlineStyles.boxShadow = styles.boxShadow;
    if (styles.maxWidth) inlineStyles.maxWidth = styles.maxWidth;
    if (styles.textAlign) inlineStyles.textAlign = styles.textAlign as React.CSSProperties['textAlign'];
    if (styles.fontSize) inlineStyles.fontSize = styles.fontSize;
    if (styles.fontWeight) inlineStyles.fontWeight = styles.fontWeight;

    return inlineStyles;
  }

  /**
   * DOM에서 실행되는 HTML 이스케이프 (서버 환경 대응)
   */
  protected escapeHtml(text: string): string {
    // 서버 환경에서는 수동 이스케이프
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}