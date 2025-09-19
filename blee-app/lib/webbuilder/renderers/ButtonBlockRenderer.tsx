import React from 'react';
import { ContentBlockData, ButtonBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * 버튼 블록 렌더러
 * 접근성 준수, 다양한 variant 지원
 */
export class ButtonBlockRenderer extends BaseBlockRenderer {
  /**
   * 버튼 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'BUTTON') {
      return false;
    }

    const content = block.content as ButtonBlockContent;
    return !!(content &&
             typeof content.text === 'string' &&
             typeof content.link === 'string');
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid button block data');
      }

      const content = block.content as ButtonBlockContent;
      const {
        text,
        link,
        variant = 'primary',
        size = 'medium'
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const buttonClasses = this.generateButtonClasses(variant, size);
      const accessibilityAttrs = RenderUtils.generateAccessibilityAttributes('BUTTON', content);

      // 버튼 요소 생성
      const isExternalLink = this.isExternalLink(link);
      const linkAttributes = isExternalLink ?
        'target="_blank" rel="noopener noreferrer"' : '';

      const buttonElement = `
        <a
          href="${this.escapeAttribute(link)}"
          class="${buttonClasses}"
          ${linkAttributes}
          ${accessibilityAttrs}
        >
          ${this.escapeHtml(text)}
        </a>
      `;

      // 기본 버튼 컨테이너 생성
      const baseHTML = `
        <div class="cms-button-block ${tailwindClasses}">
          ${buttonElement}
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
        throw new Error('Invalid button block data');
      }

      const content = block.content as ButtonBlockContent;
      const {
        text,
        link,
        variant = 'primary',
        size = 'medium'
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-button-block ${tailwindClasses}`;
      const buttonClasses = this.generateButtonClasses(variant, size);
      const inlineStyles = this.generateInlineStyles(block);

      // 외부 링크 확인
      const isExternalLink = this.isExternalLink(link);

      return (
        <div className={className} style={inlineStyles}>
          <a
            href={link}
            className={buttonClasses}
            {...(isExternalLink && {
              target: '_blank',
              rel: 'noopener noreferrer'
            })}
            role="button"
            aria-label={text}
          >
            {text}
          </a>
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'BUTTON 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * 버튼 CSS 클래스 생성
   */
  private generateButtonClasses(variant: string, size: string): string {
    const baseClasses = [
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'rounded-md',
      'transition-colors',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      'disabled:pointer-events-none',
      'disabled:opacity-50'
    ];

    // Variant별 스타일
    const variantClasses = this.getVariantClasses(variant);

    // Size별 스타일
    const sizeClasses = this.getSizeClasses(size);

    return [...baseClasses, ...variantClasses, ...sizeClasses].join(' ');
  }

  /**
   * 버튼 variant별 클래스 반환
   */
  private getVariantClasses(variant: string): string[] {
    const variants: Record<string, string[]> = {
      'primary': [
        'bg-primary',
        'text-primary-foreground',
        'hover:bg-primary/90'
      ],
      'secondary': [
        'bg-secondary',
        'text-secondary-foreground',
        'hover:bg-secondary/80'
      ],
      'outline': [
        'border',
        'border-input',
        'bg-background',
        'hover:bg-accent',
        'hover:text-accent-foreground'
      ],
      'ghost': [
        'hover:bg-accent',
        'hover:text-accent-foreground'
      ],
      'destructive': [
        'bg-destructive',
        'text-destructive-foreground',
        'hover:bg-destructive/90'
      ]
    };

    return variants[variant] || variants['primary'];
  }

  /**
   * 버튼 size별 클래스 반환
   */
  private getSizeClasses(size: string): string[] {
    const sizes: Record<string, string[]> = {
      'small': [
        'h-9',
        'rounded-md',
        'px-3',
        'text-sm'
      ],
      'medium': [
        'h-10',
        'px-4',
        'py-2'
      ],
      'large': [
        'h-11',
        'rounded-md',
        'px-8',
        'text-base'
      ],
      'icon': [
        'h-10',
        'w-10'
      ]
    };

    return sizes[size] || sizes['medium'];
  }

  /**
   * 외부 링크 확인
   */
  private isExternalLink(url: string): boolean {
    try {
      const link = new URL(url);
      return link.hostname !== window.location?.hostname;
    } catch {
      // 상대 경로나 잘못된 URL의 경우 내부 링크로 처리
      return false;
    }
  }

  /**
   * 링크 유효성 검증
   */
  private validateLink(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    // 절대 URL, 상대 URL, 앵커 링크 허용
    return url.startsWith('http://') ||
           url.startsWith('https://') ||
           url.startsWith('/') ||
           url.startsWith('./') ||
           url.startsWith('../') ||
           url.startsWith('#') ||
           url.startsWith('mailto:') ||
           url.startsWith('tel:');
  }

  /**
   * HTML 속성값 이스케이프
   */
  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
    if (styles.textAlign) inlineStyles.textAlign = styles.textAlign as React.CSSProperties['textAlign'];

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

  /**
   * 추가적인 접근성 속성 생성
   */
  private generateAccessibilityAttributes(content: ButtonBlockContent): Record<string, string> {
    const attrs: Record<string, string> = {
      'role': 'button',
      'aria-label': content.text
    };

    // 외부 링크의 경우 추가 정보 제공
    if (this.isExternalLink(content.link)) {
      attrs['aria-describedby'] = '새 창에서 열립니다';
    }

    return attrs;
  }
}