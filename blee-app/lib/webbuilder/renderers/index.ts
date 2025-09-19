/**
 * 웹빌더 블록 렌더러 모듈 인덱스
 * 모든 블록 렌더러와 팩토리 클래스를 통합 export
 */

// 기본 인터페이스 및 유틸리티
export { BlockRenderer, BaseBlockRenderer, RenderUtils } from './BlockRenderer';

// 개별 블록 렌더러
export { TextBlockRenderer } from './TextBlockRenderer';
export { ImageBlockRenderer } from './ImageBlockRenderer';
export { GridBlockRenderer } from './GridBlockRenderer';
export { ButtonBlockRenderer } from './ButtonBlockRenderer';
export { VideoBlockRenderer } from './VideoBlockRenderer';
export { CarouselBlockRenderer } from './CarouselBlockRenderer';
export { FormBlockRenderer } from './FormBlockRenderer';
export { MapBlockRenderer } from './MapBlockRenderer';
export { HtmlBlockRenderer, HtmlPreviewComponent } from './HtmlBlockRenderer';
export { ComponentBlockRenderer } from './ComponentBlockRenderer';

// 팩토리 클래스 및 성능 모니터링
export { BlockRendererFactory, RenderingPerformanceMonitor } from './BlockRendererFactory';

// 기본 export
export { BlockRendererFactory as default } from './BlockRendererFactory';

/**
 * 렌더러 타입 정의
 */
export type RendererType =
  | 'TEXT'
  | 'IMAGE'
  | 'GRID'
  | 'BUTTON'
  | 'VIDEO'
  | 'CAROUSEL'
  | 'FORM'
  | 'MAP'
  | 'HTML'
  | 'COMPONENT';

/**
 * 지원되는 블록 타입 상수
 */
export const SUPPORTED_BLOCK_TYPES: RendererType[] = [
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
] as const;

/**
 * 렌더링 결과 타입
 */
export interface RenderingResult {
  html: string;
  success: boolean;
  error?: string;
  renderTime?: number;
}

/**
 * 블록 렌더링 옵션
 */
export interface BlockRenderingOptions {
  sanitize?: boolean;
  allowScripts?: boolean;
  allowStyles?: boolean;
  performance?: boolean;
  fallbackOnError?: boolean;
}

/**
 * 성능 통계 타입
 */
export interface PerformanceStats {
  averageTime: number;
  minTime: number;
  maxTime: number;
  sampleCount: number;
}

/**
 * 렌더링 통계 타입
 */
export interface RenderingStats {
  totalBlocks: number;
  blockTypeDistribution: { [key: string]: number };
  validBlocks: number;
  invalidBlocks: number;
  supportedTypes: number;
  unsupportedTypes: number;
}

/**
 * 유틸리티 함수들
 */

/**
 * 블록 타입이 지원되는지 확인
 */
export function isSupportedBlockType(blockType: string): blockType is RendererType {
  return SUPPORTED_BLOCK_TYPES.includes(blockType.toUpperCase() as RendererType);
}

/**
 * 블록 타입을 정규화 (대문자로 변환)
 */
export function normalizeBlockType(blockType: string): RendererType | null {
  const normalized = blockType.toUpperCase() as RendererType;
  return isSupportedBlockType(normalized) ? normalized : null;
}

/**
 * 렌더링 에러 생성
 */
export function createRenderingError(
  blockType: string,
  message: string,
  originalError?: Error
): Error {
  const error = new Error(`[${blockType}] ${message}`);
  if (originalError) {
    error.stack = originalError.stack;
    error.cause = originalError;
  }
  return error;
}

/**
 * 안전한 블록 렌더링 (에러 처리 포함)
 */
export function safeRenderBlock(
  block: any,
  options: BlockRenderingOptions = {}
): RenderingResult {
  const startTime = performance.now();

  try {
    // 블록 타입 검증
    if (!block?.type) {
      throw createRenderingError('UNKNOWN', '블록 타입이 지정되지 않았습니다.');
    }

    const normalizedType = normalizeBlockType(block.type);
    if (!normalizedType) {
      throw createRenderingError(block.type, '지원되지 않는 블록 타입입니다.');
    }

    // 렌더링 실행
    const html = BlockRendererFactory.renderToHTML(block);
    const renderTime = performance.now() - startTime;

    // 성능 기록 (옵션이 활성화된 경우)
    if (options.performance) {
      RenderingPerformanceMonitor.recordRenderTime(normalizedType, renderTime);
    }

    return {
      html,
      success: true,
      renderTime
    };

  } catch (error) {
    const renderTime = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    if (options.fallbackOnError) {
      // 폴백 HTML 생성
      const fallbackHtml = `
        <div class="cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p class="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> ${block.name || `${block.type} 블록`}
          </p>
          <p class="text-red-600 text-xs mt-1">${errorMessage}</p>
        </div>
      `;

      return {
        html: fallbackHtml,
        success: false,
        error: errorMessage,
        renderTime
      };
    }

    return {
      html: '',
      success: false,
      error: errorMessage,
      renderTime
    };
  }
}

/**
 * 여러 블록을 안전하게 렌더링
 */
export function safeRenderBlocks(
  blocks: any[],
  options: BlockRenderingOptions = {}
): {
  html: string;
  results: RenderingResult[];
  stats: {
    total: number;
    successful: number;
    failed: number;
    totalRenderTime: number;
  };
} {
  const results: RenderingResult[] = [];
  let totalRenderTime = 0;

  // 각 블록 렌더링
  blocks.forEach(block => {
    const result = safeRenderBlock(block, options);
    results.push(result);
    totalRenderTime += result.renderTime || 0;
  });

  // 성공한 블록들의 HTML 결합
  const html = `
    <div class="cms-blocks-container">
      ${results.filter(r => r.success).map(r => r.html).join('')}
    </div>
  `;

  // 통계 생성
  const stats = {
    total: blocks.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalRenderTime
  };

  return { html, results, stats };
}

/**
 * 개발용 유틸리티: 모든 렌더러의 상태 확인
 */
export function checkRenderersHealth(): {
  [rendererType: string]: {
    cached: boolean;
    canInstantiate: boolean;
    error?: string;
  };
} {
  const health: { [key: string]: any } = {};

  SUPPORTED_BLOCK_TYPES.forEach(type => {
    try {
      const renderer = BlockRendererFactory.getRenderer(type);
      health[type] = {
        cached: true,
        canInstantiate: !!renderer,
        error: undefined
      };
    } catch (error) {
      health[type] = {
        cached: false,
        canInstantiate: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  });

  return health;
}

/**
 * 개발용 유틸리티: 렌더러 성능 벤치마크
 */
export async function benchmarkRenderers(
  sampleBlocks: { [type: string]: any },
  iterations: number = 10
): Promise<{ [rendererType: string]: PerformanceStats }> {
  const benchmarks: { [key: string]: PerformanceStats } = {};

  for (const [type, block] of Object.entries(sampleBlocks)) {
    const normalizedType = normalizeBlockType(type);
    if (!normalizedType) continue;

    try {
      const perf = await BlockRendererFactory.measureRenderingPerformance(block, iterations);
      benchmarks[normalizedType] = {
        averageTime: perf.averageHtmlTime,
        minTime: Math.min(...Array(iterations).fill(0).map(() => {
          const start = performance.now();
          BlockRendererFactory.renderToHTML(block);
          return performance.now() - start;
        })),
        maxTime: perf.htmlRenderTime,
        sampleCount: iterations
      };
    } catch (error) {
      console.warn(`벤치마크 실패: ${type}`, error);
    }
  }

  return benchmarks;
}