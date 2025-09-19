import React, { ReactElement } from 'react';
import { ContentBlockData, GridBlockContent, TextBlockContent, ImageBlockContent, ButtonBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer } from './BlockRenderer';

/**
 * 그리드 블록 렌더러
 * CSS Grid 레이아웃, 중첩 블록 지원
 */
export class GridBlockRenderer extends BaseBlockRenderer {
  /**
   * 그리드 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'GRID') {
      return false;
    }

    const content = block.content as GridBlockContent;
    return !!(content &&
             typeof content.columns === 'number' &&
             content.columns > 0 &&
             Array.isArray(content.items));
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid grid block data');
      }

      const content = block.content as GridBlockContent;
      const {
        columns = 3,
        gap = 16,
        rows,
        items = [],
        alignItems = 'stretch',
        justifyItems = 'stretch',
        className: customClassName = ''
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);

      // 그리드 스타일 생성
      const gridStyles = this.generateGridStyles(columns, gap, rows, alignItems, justifyItems);

      // 그리드 아이템 렌더링
      const gridItemsHTML = items.map((item, index) => {
        const itemSpan = item.span || 1;
        const itemRowSpan = item.rowSpan || 1;
        const itemClassName = item.className || '';

        // 아이템 스타일
        const itemStyles = [
          itemSpan > 1 ? `grid-column: span ${Math.min(itemSpan, columns)}` : '',
          itemRowSpan > 1 ? `grid-row: span ${itemRowSpan}` : ''
        ].filter(Boolean).join('; ');

        // 중첩 블록 콘텐츠 렌더링
        const itemContent = this.renderNestedContent(item.content);

        return `
          <div
            class="cms-grid-item ${itemClassName}"
            style="${itemStyles}"
            data-grid-item="${index}"
          >
            ${itemContent}
          </div>
        `;
      }).join('');

      // 빈 그리드 아이템으로 채우기 (최소 표시를 위해)
      const emptyItemsCount = Math.max(0, columns - items.length);
      const emptyItemsHTML = Array(emptyItemsCount).fill(0).map((_, index) => `
        <div class="cms-grid-item cms-grid-item-empty" data-grid-item="${items.length + index}">
          <div class="h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
            <span class="text-gray-400 text-sm">빈 아이템</span>
          </div>
        </div>
      `).join('');

      // 기본 그리드 컨테이너 생성
      const baseHTML = `
        <div
          class="cms-grid-block ${tailwindClasses} ${customClassName}"
          style="${gridStyles}"
          data-grid-columns="${columns}"
          data-grid-gap="${gap}"
        >
          ${gridItemsHTML}
          ${emptyItemsHTML}
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
        throw new Error('Invalid grid block data');
      }

      const content = block.content as GridBlockContent;
      const {
        columns = 3,
        gap = 16,
        rows,
        items = [],
        alignItems = 'stretch',
        justifyItems = 'stretch',
        className: customClassName = ''
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-grid-block ${tailwindClasses} ${customClassName}`;

      // 인라인 스타일 생성
      const inlineStyles = {
        ...this.generateInlineStyles(block),
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
        ...(rows && { gridTemplateRows: `repeat(${rows}, 1fr)` }),
        alignItems,
        justifyItems
      };

      // 그리드 아이템 렌더링
      const gridItems = items.map((item, index) => {
        const itemSpan = item.span || 1;
        const itemRowSpan = item.rowSpan || 1;
        const itemClassName = `cms-grid-item ${item.className || ''}`;

        const itemStyles: React.CSSProperties = {};
        if (itemSpan > 1) itemStyles.gridColumn = `span ${Math.min(itemSpan, columns)}`;
        if (itemRowSpan > 1) itemStyles.gridRow = `span ${itemRowSpan}`;

        return (
          <div
            key={index}
            className={itemClassName}
            style={itemStyles}
            data-grid-item={index}
          >
            {this.renderNestedContentReact(item.content)}
          </div>
        );
      });

      // 빈 그리드 아이템으로 채우기
      const emptyItemsCount = Math.max(0, columns - items.length);
      const emptyItems = Array(emptyItemsCount).fill(0).map((_, index) => (
        <div
          key={`empty-${index}`}
          className="cms-grid-item cms-grid-item-empty"
          data-grid-item={items.length + index}
        >
          <div className="h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
            <span className="text-gray-400 text-sm">빈 아이템</span>
          </div>
        </div>
      ));

      return (
        <div
          className={className}
          style={inlineStyles}
          data-grid-columns={columns}
          data-grid-gap={gap}
        >
          {gridItems}
          {emptyItems}
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'GRID 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * CSS Grid 스타일 생성
   */
  private generateGridStyles(
    columns: number,
    gap: number,
    rows?: number,
    alignItems?: string,
    justifyItems?: string
  ): string {
    const styles = [
      'display: grid',
      `grid-template-columns: repeat(${columns}, 1fr)`,
      `gap: ${gap}px`,
      ...(rows ? [`grid-template-rows: repeat(${rows}, 1fr)`] : []),
      `align-items: ${alignItems || 'stretch'}`,
      `justify-items: ${justifyItems || 'stretch'}`
    ];

    return styles.join('; ');
  }

  /**
   * 중첩 콘텐츠 HTML 렌더링
   */
  private renderNestedContent(content: GridBlockContent['items'][0]['content']): string {
    if (!content) {
      return '<div class="cms-grid-placeholder">콘텐츠 없음</div>';
    }

    // 중첩 블록이 있는 경우 재귀적으로 렌더링
    if (content.type) {
      // 다른 렌더러를 호출해야 하는 경우 (순환 의존성 방지를 위해 간단한 처리)
      switch (content.type) {
        case 'TEXT':
          const textContent = content as TextBlockContent;
          return `<div class="prose">${textContent.text || ''}</div>`;
        case 'IMAGE':
          const imageContent = content as ImageBlockContent;
          const { src, alt = '' } = imageContent;
          return src ? `<img src="${src}" alt="${alt}" class="w-full h-auto rounded" />` : '';
        case 'BUTTON':
          const buttonContent = content as ButtonBlockContent;
          const { text = '버튼', link = '#' } = buttonContent;
          return `<a href="${link}" class="btn btn-primary">${text}</a>`;
        default:
          return `<div class="cms-nested-block">${content.type} 블록</div>`;
      }
    }

    // 단순 텍스트 콘텐츠
    if (typeof content === 'string') {
      return `<div>${this.escapeHtml(content)}</div>`;
    }

    return '<div class="cms-grid-placeholder">알 수 없는 콘텐츠</div>';
  }

  /**
   * 중첩 콘텐츠 React 렌더링
   */
  private renderNestedContentReact(content: GridBlockContent['items'][0]['content']): React.ReactNode {
    if (!content) {
      return <div className="cms-grid-placeholder">콘텐츠 없음</div>;
    }

    // 중첩 블록이 있는 경우
    if (content.type) {
      switch (content.type) {
        case 'TEXT':
          const textContent = content as TextBlockContent;
          return (
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: textContent.text || '' }}
            />
          );
        case 'IMAGE':
          const imageContent = content as ImageBlockContent;
          const { src, alt = '' } = imageContent;
          return src ? (
            <img src={src} alt={alt} className="w-full h-auto rounded" />
          ) : null;
        case 'BUTTON':
          const buttonContent = content as ButtonBlockContent;
          const { text = '버튼', link = '#' } = buttonContent;
          return (
            <a href={link} className="btn btn-primary">
              {text}
            </a>
          );
        default:
          return (
            <div className="cms-nested-block">
              {content.type} 블록
            </div>
          );
      }
    }

    // 단순 텍스트 콘텐츠
    if (typeof content === 'string') {
      return <div>{content}</div>;
    }

    return <div className="cms-grid-placeholder">알 수 없는 콘텐츠</div>;
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