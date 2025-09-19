import { ContentBlockData } from '@/app/types/webbuilder';
import { BlockRenderer } from './BlockRenderer';
import { ReactElement } from 'react';
import { TextBlockRenderer } from './TextBlockRenderer';
import { ImageBlockRenderer } from './ImageBlockRenderer';
import { GridBlockRenderer } from './GridBlockRenderer';
import { ButtonBlockRenderer } from './ButtonBlockRenderer';
import { VideoBlockRenderer } from './VideoBlockRenderer';
import { CarouselBlockRenderer } from './CarouselBlockRenderer';
import { FormBlockRenderer } from './FormBlockRenderer';
import { MapBlockRenderer } from './MapBlockRenderer';
import { HtmlBlockRenderer } from './HtmlBlockRenderer';
import { ComponentBlockRenderer } from './ComponentBlockRenderer';

/**
 * 블록 렌더러 팩토리 클래스
 * 팩토리 패턴을 사용하여 블록 타입에 따른 적절한 렌더러 인스턴스 생성
 */
export class BlockRendererFactory {
  private static rendererCache: Map<string, BlockRenderer> = new Map();

  /**
   * 블록 타입에 따른 렌더러 인스턴스 반환
   * 싱글톤 패턴으로 렌더러 인스턴스 재사용
   */
  static getRenderer(blockType: string): BlockRenderer {
    // 캐시에서 렌더러 확인
    const cachedRenderer = this.rendererCache.get(blockType);
    if (cachedRenderer) {
      return cachedRenderer;
    }

    // 블록 타입에 따른 렌더러 생성
    let renderer: BlockRenderer;

    switch (blockType.toUpperCase()) {
      case 'TEXT':
        renderer = new TextBlockRenderer();
        break;

      case 'IMAGE':
        renderer = new ImageBlockRenderer();
        break;

      case 'GRID':
        renderer = new GridBlockRenderer();
        break;

      case 'BUTTON':
        renderer = new ButtonBlockRenderer();
        break;

      case 'VIDEO':
        renderer = new VideoBlockRenderer();
        break;

      case 'CAROUSEL':
        renderer = new CarouselBlockRenderer();
        break;

      case 'FORM':
        renderer = new FormBlockRenderer();
        break;

      case 'MAP':
        renderer = new MapBlockRenderer();
        break;

      case 'HTML':
        renderer = new HtmlBlockRenderer();
        break;

      case 'COMPONENT':
        renderer = new ComponentBlockRenderer();
        break;

      default:
        throw new Error(`지원되지 않는 블록 타입: ${blockType}`);
    }

    // 캐시에 저장
    this.rendererCache.set(blockType, renderer);
    return renderer;
  }

  /**
   * 블록을 HTML 문자열로 렌더링
   */
  static renderToHTML(block: ContentBlockData): string {
    try {
      const renderer = this.getRenderer(block.type);
      return renderer.renderToHTML(block);
    } catch (error) {
      console.error(`블록 HTML 렌더링 오류 (${block.type}):`, error);
      return this.generateFallbackHTML(block, error as Error);
    }
  }

  /**
   * 블록을 React JSX로 렌더링
   */
  static renderToReact(block: ContentBlockData): ReactElement {
    try {
      const renderer = this.getRenderer(block.type);
      return renderer.renderToReact(block);
    } catch (error) {
      console.error(`블록 React 렌더링 오류 (${block.type}):`, error);
      return this.generateFallbackReact(block, error as Error);
    }
  }

  /**
   * 블록 유효성 검증
   */
  static validateBlock(block: ContentBlockData): boolean {
    try {
      const renderer = this.getRenderer(block.type);
      return renderer.validate(block);
    } catch (error) {
      console.error(`블록 유효성 검증 오류 (${block.type}):`, error);
      return false;
    }
  }

  /**
   * 블록에 스타일 적용
   */
  static applyBlockStyles(baseHTML: string, block: ContentBlockData): string {
    try {
      const renderer = this.getRenderer(block.type);
      return renderer.applyStyles(baseHTML, block);
    } catch (error) {
      console.error(`블록 스타일 적용 오류 (${block.type}):`, error);
      return baseHTML;
    }
  }

  /**
   * 여러 블록을 한번에 HTML로 렌더링
   */
  static renderBlocksToHTML(blocks: ContentBlockData[]): string {
    if (!blocks || blocks.length === 0) {
      return '<div class="empty-blocks text-gray-500 text-center py-8">표시할 블록이 없습니다.</div>';
    }

    const renderedBlocks = blocks.map(block => {
      try {
        return this.renderToHTML(block);
      } catch (error) {
        console.error(`블록 렌더링 실패 (${block.id}):`, error);
        return this.generateFallbackHTML(block, error as Error);
      }
    });

    return `
      <div class="cms-blocks-container">
        ${renderedBlocks.join('')}
      </div>
    `;
  }

  /**
   * 여러 블록을 한번에 React로 렌더링
   */
  static renderBlocksToReact(blocks: ContentBlockData[]): ReactElement {
    if (!blocks || blocks.length === 0) {
      return (
        <div className="empty-blocks text-gray-500 text-center py-8">
          표시할 블록이 없습니다.
        </div>
      );
    }

    return (
      <div className="cms-blocks-container">
        {blocks.map((block, index) => {
          try {
            return (
              <div key={block.id || index} className="cms-block-wrapper">
                {this.renderToReact(block)}
              </div>
            );
          } catch (error) {
            console.error(`블록 렌더링 실패 (${block.id}):`, error);
            return (
              <div key={block.id || index} className="cms-block-wrapper">
                {this.generateFallbackReact(block, error as Error)}
              </div>
            );
          }
        })}
      </div>
    );
  }

  /**
   * 지원되는 모든 블록 타입 반환
   */
  static getSupportedBlockTypes(): string[] {
    return [
      'TEXT',
      'IMAGE',
      'GRID',
      'BUTTON',
      'VIDEO',
      'CAROUSEL',
      'FORM',
      'MAP',
      'HTML',
      'COMPONENT'
    ];
  }

  /**
   * 블록 타입 유효성 검증
   */
  static isValidBlockType(blockType: string): boolean {
    return this.getSupportedBlockTypes().includes(blockType.toUpperCase());
  }

  /**
   * 렌더러 캐시 초기화
   */
  static clearRendererCache(): void {
    this.rendererCache.clear();
  }

  /**
   * 렌더러 캐시 상태 반환
   */
  static getRendererCacheStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.getSupportedBlockTypes().forEach(type => {
      status[type] = this.rendererCache.has(type);
    });
    return status;
  }

  /**
   * 블록 렌더링 성능 측정
   */
  static async measureRenderingPerformance(
    block: ContentBlockData,
    iterations: number = 10
  ): Promise<{
    htmlRenderTime: number;
    reactRenderTime: number;
    validationTime: number;
    averageHtmlTime: number;
    averageReactTime: number;
  }> {
    const htmlTimes: number[] = [];
    const reactTimes: number[] = [];
    let validationTime = 0;

    // 유효성 검증 시간 측정
    const validationStart = performance.now();
    this.validateBlock(block);
    validationTime = performance.now() - validationStart;

    // HTML 렌더링 시간 측정
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      this.renderToHTML(block);
      const end = performance.now();
      htmlTimes.push(end - start);
    }

    // React 렌더링 시간 측정 (시뮬레이션)
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        this.renderToReact(block);
      } catch {
        // React 환경이 아닐 수 있으므로 에러 무시
      }
      const end = performance.now();
      reactTimes.push(end - start);
    }

    const averageHtmlTime = htmlTimes.reduce((a, b) => a + b, 0) / htmlTimes.length;
    const averageReactTime = reactTimes.reduce((a, b) => a + b, 0) / reactTimes.length;

    return {
      htmlRenderTime: Math.max(...htmlTimes),
      reactRenderTime: Math.max(...reactTimes),
      validationTime,
      averageHtmlTime,
      averageReactTime
    };
  }

  /**
   * 블록 렌더링 통계 생성
   */
  static generateRenderingStats(blocks: ContentBlockData[]): {
    totalBlocks: number;
    blockTypeDistribution: { [key: string]: number };
    validBlocks: number;
    invalidBlocks: number;
    supportedTypes: number;
    unsupportedTypes: number;
  } {
    const stats = {
      totalBlocks: blocks.length,
      blockTypeDistribution: {} as { [key: string]: number },
      validBlocks: 0,
      invalidBlocks: 0,
      supportedTypes: 0,
      unsupportedTypes: 0
    };

    blocks.forEach(block => {
      // 블록 타입 분포 계산
      const type = block.type.toUpperCase();
      stats.blockTypeDistribution[type] = (stats.blockTypeDistribution[type] || 0) + 1;

      // 지원 여부 확인
      if (this.isValidBlockType(type)) {
        stats.supportedTypes++;

        // 유효성 검증
        if (this.validateBlock(block)) {
          stats.validBlocks++;
        } else {
          stats.invalidBlocks++;
        }
      } else {
        stats.unsupportedTypes++;
        stats.invalidBlocks++;
      }
    });

    return stats;
  }

  /**
   * HTML 폴백 생성
   */
  private static generateFallbackHTML(block: ContentBlockData, error: Error): string {
    return `
      <div class="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
        <p class="text-red-700 text-sm">
          <strong>렌더링 오류:</strong> ${block.name || `${block.type} 블록`}
        </p>
        <p class="text-red-600 text-xs mt-1">
          ${error.message}
        </p>
        <details class="mt-2">
          <summary class="text-xs text-red-500 cursor-pointer">기술적 세부사항</summary>
          <pre class="text-xs text-red-400 mt-1 whitespace-pre-wrap">${error.stack || 'Stack trace 없음'}</pre>
        </details>
      </div>
    `;
  }

  /**
   * React 폴백 생성
   */
  private static generateFallbackReact(block: ContentBlockData, error: Error): ReactElement {
    return (
      <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
        <p className="text-red-700 text-sm">
          <strong>렌더링 오류:</strong> {block.name || `${block.type} 블록`}
        </p>
        <p className="text-red-600 text-xs mt-1">
          {error.message}
        </p>
        <details className="mt-2">
          <summary className="text-xs text-red-500 cursor-pointer">기술적 세부사항</summary>
          <pre className="text-xs text-red-400 mt-1 whitespace-pre-wrap">
            {error.stack || 'Stack trace 없음'}
          </pre>
        </details>
      </div>
    );
  }
}

/**
 * 렌더링 성능 모니터링 클래스
 */
export class RenderingPerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  /**
   * 렌더링 시간 기록
   */
  static recordRenderTime(blockType: string, renderTime: number): void {
    const times = this.metrics.get(blockType) || [];
    times.push(renderTime);

    // 최근 100개 기록만 유지
    if (times.length > 100) {
      times.shift();
    }

    this.metrics.set(blockType, times);
  }

  /**
   * 블록 타입별 평균 렌더링 시간 반환
   */
  static getAverageRenderTime(blockType: string): number {
    const times = this.metrics.get(blockType);
    if (!times || times.length === 0) return 0;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * 모든 블록 타입의 성능 통계 반환
   */
  static getAllPerformanceStats(): { [blockType: string]: {
    averageTime: number;
    minTime: number;
    maxTime: number;
    sampleCount: number;
  }} {
    const stats: { [blockType: string]: {
      averageTime: number;
      minTime: number;
      maxTime: number;
      sampleCount: number;
    }} = {};

    this.metrics.forEach((times, blockType) => {
      if (times.length > 0) {
        stats[blockType] = {
          averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
          minTime: Math.min(...times),
          maxTime: Math.max(...times),
          sampleCount: times.length
        };
      }
    });

    return stats;
  }

  /**
   * 성능 메트릭 초기화
   */
  static clearMetrics(): void {
    this.metrics.clear();
  }
}

export default BlockRendererFactory;