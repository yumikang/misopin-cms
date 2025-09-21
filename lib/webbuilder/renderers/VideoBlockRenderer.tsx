import React, { ReactElement } from 'react';
import { ContentBlockData, VideoBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * 비디오 블록 렌더러
 * HTML5 video, YouTube/Vimeo 임베드, 접근성 지원
 */
export class VideoBlockRenderer extends BaseBlockRenderer {
  /**
   * 비디오 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'VIDEO') {
      return false;
    }

    const content = block.content as VideoBlockContent;
    return !!(content && content.src && typeof content.src === 'string');
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid video block data');
      }

      const content = block.content as VideoBlockContent;
      const {
        src,
        poster,
        autoplay = false,
        loop = false,
        controls = true
      } = content;

      // Default video settings
      const muted = false;
      const width = 800; // Default pixel width for embed
      const height = 450; // Default pixel height for embed
      const caption = '';

      const tailwindClasses = this.generateTailwindClasses(block);
      const accessibilityAttrs = RenderUtils.generateAccessibilityAttributes('VIDEO', content as unknown as Record<string, unknown>);

      // YouTube/Vimeo 임베드 감지
      const embedHtml = this.generateEmbedHTML(src, width, height);
      if (embedHtml) {
        const captionElement = caption ? `
          <figcaption class="mt-2 text-sm text-gray-600 text-center">
            ${this.escapeHtml(caption)}
          </figcaption>
        ` : '';

        const baseHTML = `
          <div class="cms-video-block ${tailwindClasses}">
            <figure class="cms-video-figure">
              ${embedHtml}
              ${captionElement}
            </figure>
          </div>
        `.trim();

        return this.applyStyles(baseHTML, block);
      }

      // HTML5 비디오 요소 생성
      const videoElement = `
        <video
          src="${this.escapeAttribute(src)}"
          ${poster ? `poster="${this.escapeAttribute(poster)}"` : ''}
          ${width ? `width="${width}"` : ''}
          ${height ? `height="${height}"` : ''}
          ${autoplay ? 'autoplay' : ''}
          ${loop ? 'loop' : ''}
          ${muted ? 'muted' : ''}
          ${controls ? 'controls' : ''}
          class="w-full h-auto rounded"
          preload="metadata"
          ${accessibilityAttrs}
        >
          <p class="text-gray-600">
            브라우저가 비디오를 지원하지 않습니다.
            <a href="${this.escapeAttribute(src)}" class="text-blue-600 underline">
              비디오 다운로드
            </a>
          </p>
        </video>
      `;

      // 캡션 요소 (선택적)
      const captionElement = caption ? `
        <figcaption class="mt-2 text-sm text-gray-600 text-center">
          ${this.escapeHtml(caption)}
        </figcaption>
      ` : '';

      // 기본 비디오 컨테이너 생성
      const baseHTML = `
        <div class="cms-video-block ${tailwindClasses}">
          <figure class="cms-video-figure">
            ${videoElement}
            ${captionElement}
          </figure>
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
        throw new Error('Invalid video block data');
      }

      const content = block.content as VideoBlockContent;
      const {
        src,
        poster,
        autoplay = false,
        loop = false,
        controls = true
      } = content;

      // Default video settings
      const muted = false;
      const width = 800; // Default pixel width for embed
      const height = 450; // Default pixel height for embed
      const caption = '';

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-video-block ${tailwindClasses}`;
      const inlineStyles = this.generateInlineStyles(block);

      // YouTube/Vimeo 임베드 감지
      const embedComponent = this.generateEmbedComponent(src, width, height);
      if (embedComponent) {
        return (
          <div className={className} style={inlineStyles}>
            <figure className="cms-video-figure">
              {embedComponent}
              {caption && (
                <figcaption className="mt-2 text-sm text-gray-600 text-center">
                  {caption}
                </figcaption>
              )}
            </figure>
          </div>
        );
      }

      // HTML5 비디오 컴포넌트
      return (
        <div className={className} style={inlineStyles}>
          <figure className="cms-video-figure">
            <video
              src={src}
              poster={poster}
              width={width}
              height={height}
              autoPlay={autoplay}
              loop={loop}
              muted={muted}
              controls={controls}
              className="w-full h-auto rounded"
              preload="metadata"
              aria-label={caption || '비디오 콘텐츠'}
            >
              <p className="text-gray-600">
                브라우저가 비디오를 지원하지 않습니다.
                <a href={src} className="text-blue-600 underline ml-1">
                  비디오 다운로드
                </a>
              </p>
            </video>
            {caption && (
              <figcaption className="mt-2 text-sm text-gray-600 text-center">
                {caption}
              </figcaption>
            )}
          </figure>
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'VIDEO 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * YouTube/Vimeo 임베드 HTML 생성
   */
  private generateEmbedHTML(url: string, width?: number, height?: number): string | null {
    const embedUrl = this.getEmbedUrl(url);
    if (!embedUrl) return null;

    const aspectRatio = this.calculateAspectRatio(width, height);
    const iframeStyle = aspectRatio ? `aspect-ratio: ${aspectRatio};` : '';

    return `
      <div class="cms-video-embed" style="position: relative; ${iframeStyle}">
        <iframe
          src="${this.escapeAttribute(embedUrl)}"
          title="비디오 플레이어"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="absolute inset-0 w-full h-full rounded"
          loading="lazy"
        ></iframe>
      </div>
    `;
  }

  /**
   * YouTube/Vimeo 임베드 React 컴포넌트 생성
   */
  private generateEmbedComponent(url: string, width?: number, height?: number): React.ReactNode | null {
    const embedUrl = this.getEmbedUrl(url);
    if (!embedUrl) return null;

    const aspectRatio = this.calculateAspectRatio(width, height);
    const embedStyle: React.CSSProperties = {
      position: 'relative',
      ...(aspectRatio && { aspectRatio })
    };

    return (
      <div className="cms-video-embed" style={embedStyle}>
        <iframe
          src={embedUrl}
          title="비디오 플레이어"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full rounded"
          loading="lazy"
        />
      </div>
    );
  }

  /**
   * YouTube/Vimeo URL을 임베드 URL로 변환
   */
  private getEmbedUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // YouTube 처리
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = '';

        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.searchParams.has('v')) {
          videoId = urlObj.searchParams.get('v') || '';
        }

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // Vimeo 처리
      if (urlObj.hostname.includes('vimeo.com')) {
        const match = urlObj.pathname.match(/\/(\d+)/);
        if (match) {
          return `https://player.vimeo.com/video/${match[1]}`;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 종횡비 계산
   */
  private calculateAspectRatio(width?: number, height?: number): string | null {
    if (!width || !height) return '16/9'; // 기본 종횡비
    return `${width}/${height}`;
  }

  /**
   * 비디오 URL 유효성 검증
   */
  private validateVideoUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const validExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
      const hasValidExtension = validExtensions.some(ext =>
        urlObj.pathname.toLowerCase().endsWith(ext)
      );
      const isEmbedUrl = urlObj.hostname.includes('youtube.com') ||
                        urlObj.hostname.includes('youtu.be') ||
                        urlObj.hostname.includes('vimeo.com');

      return hasValidExtension || isEmbedUrl;
    } catch {
      return false;
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