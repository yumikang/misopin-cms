import React, { ReactElement } from 'react';
import Image from 'next/image';
import { ContentBlockData, ImageBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * 이미지 블록 렌더러
 * 반응형 이미지, lazy loading, 접근성 지원
 */
export class ImageBlockRenderer extends BaseBlockRenderer {
  /**
   * 이미지 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'IMAGE') {
      return false;
    }

    const content = block.content as ImageBlockContent;
    return !!(content && content.src && typeof content.src === 'string');
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid image block data');
      }

      const content = block.content as ImageBlockContent;
      const { src, alt = '', caption, link } = content;

      // 반응형 이미지 클래스
      const responsiveClasses = RenderUtils.getResponsiveImageClasses();
      const tailwindClasses = this.generateTailwindClasses(block);
      const accessibilityAttrs = RenderUtils.generateAccessibilityAttributes('IMAGE', content as unknown as Record<string, unknown>);

      // 이미지 요소 생성
      const imageElement = `
        <img
          src="${this.escapeAttribute(src)}"
          ${alt ? `alt="${this.escapeAttribute(alt)}"` : 'alt=""'}
          class="${responsiveClasses}"
          loading="lazy"
          decoding="async"
          ${accessibilityAttrs}
        />
      `;

      // 캡션 요소 (선택적)
      const captionElement = caption ? `
        <figcaption class="mt-2 text-sm text-gray-600 text-center">
          ${this.escapeHtml(caption)}
        </figcaption>
      ` : '';

      // 링크로 감싸기 (선택적)
      const imageWithCaption = `
        <figure class="cms-image-figure">
          ${imageElement}
          ${captionElement}
        </figure>
      `;

      const wrappedImage = link ? `
        <a href="${this.escapeAttribute(link)}" class="cms-image-link">
          ${imageWithCaption}
        </a>
      ` : imageWithCaption;

      // 기본 이미지 컨테이너 생성
      const baseHTML = `
        <div class="cms-image-block ${tailwindClasses}">
          ${wrappedImage}
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
  renderToReact(block: ContentBlockData): ReactElement {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid image block data');
      }

      const content = block.content as ImageBlockContent;
      const { src, alt = '', caption, link } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-image-block ${tailwindClasses}`;
      const inlineStyles = this.generateInlineStyles(block);

      // 이미지 컴포넌트 - Next.js Image 사용
      const imageComponent = (
        <Image
          src={src}
          alt={alt}
          width={800}
          height={600}
          className={RenderUtils.getResponsiveImageClasses()}
          style={{ width: '100%', height: 'auto' }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
        />
      );

      // 캡션 컴포넌트 (선택적)
      const captionComponent = caption && (
        <figcaption className="mt-2 text-sm text-gray-600 text-center">
          {caption}
        </figcaption>
      );

      // 이미지와 캡션을 figure로 감싸기
      const figureComponent = (
        <figure className="cms-image-figure">
          {imageComponent}
          {captionComponent}
        </figure>
      );

      // 링크로 감싸기 (선택적)
      const content_with_optional_link = link ? (
        <a href={link} className="cms-image-link">
          {figureComponent}
        </a>
      ) : figureComponent;

      return (
        <div className={className} style={inlineStyles}>
          {content_with_optional_link}
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'IMAGE 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * 이미지 URL 유효성 검증
   */
  private validateImageUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      // 상대 경로도 허용
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
  }

  /**
   * 이미지 최적화 제안 (Next.js Image 컴포넌트 사용시)
   */
  private getOptimizedImageProps(src: string, alt: string) {
    return {
      src,
      alt,
      width: 800, // 기본 너비
      height: 600, // 기본 높이
      sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      style: {
        width: '100%',
        height: 'auto',
      },
      priority: false, // lazy loading 활성화
    };
  }

  /**
   * 반응형 이미지 srcset 생성
   */
  private generateSrcSet(baseSrc: string): string {
    // 기본 구현 (실제로는 이미지 서버 또는 CDN과 연동)
    const sizes = [320, 640, 768, 1024, 1280];
    const srcSet = sizes.map(size => {
      // 이미지 URL에 크기 파라미터 추가 (예: Cloudinary, ImageKit 등)
      const resizedUrl = this.addSizeParameter(baseSrc, size);
      return `${resizedUrl} ${size}w`;
    }).join(', ');

    return srcSet;
  }

  /**
   * 이미지 URL에 크기 파라미터 추가
   */
  private addSizeParameter(url: string, width: number): string {
    // 외부 이미지 서비스 URL 패턴 감지 및 파라미터 추가
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', `/upload/w_${width}/`);
    } else if (url.includes('imagekit.io')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}tr=w-${width}`;
    } else {
      // 기본적으로 원본 URL 반환
      return url;
    }
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
}