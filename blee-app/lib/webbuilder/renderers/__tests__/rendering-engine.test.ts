/**
 * 웹빌더 렌더링 엔진 통합 테스트
 * 모든 블록 렌더러와 팩토리 클래스의 기능 검증
 */

import { ContentBlockData } from '@/app/types/webbuilder';
import {
  BlockRendererFactory,
  // RenderingPerformanceMonitor, // 현재 테스트에서 사용 안함
  SUPPORTED_BLOCK_TYPES,
  safeRenderBlock,
  // safeRenderBlocks, // 현재 테스트에서 사용 안함
  checkRenderersHealth,
  isSupportedBlockType,
  normalizeBlockType
} from '../index';

describe('웹빌더 렌더링 엔진 통합 테스트', () => {

  // 테스트용 샘플 블록 데이터
  const sampleBlocks = {
    TEXT: {
      id: 'text-1',
      type: 'TEXT',
      name: '텍스트 블록',
      content: {
        text: '<h1>안녕하세요</h1><p>이것은 테스트 텍스트입니다.</p>',
        format: 'html'
      },
      styles: {
        backgroundColor: '#f9f9f9',
        padding: '16px',
        textAlign: 'center'
      }
    },

    IMAGE: {
      id: 'image-1',
      type: 'IMAGE',
      name: '이미지 블록',
      content: {
        src: 'https://example.com/image.jpg',
        alt: '테스트 이미지',
        caption: '이것은 테스트 이미지입니다.'
      }
    },

    GRID: {
      id: 'grid-1',
      type: 'GRID',
      name: '그리드 블록',
      content: {
        columns: 2,
        gap: 16,
        items: [
          {
            span: 1,
            content: {
              type: 'TEXT',
              content: { text: '첫 번째 그리드 아이템' }
            }
          },
          {
            span: 1,
            content: {
              type: 'TEXT',
              content: { text: '두 번째 그리드 아이템' }
            }
          }
        ]
      }
    },

    BUTTON: {
      id: 'button-1',
      type: 'BUTTON',
      name: '버튼 블록',
      content: {
        text: '클릭하세요',
        link: 'https://example.com',
        variant: 'primary',
        size: 'medium'
      }
    },

    VIDEO: {
      id: 'video-1',
      type: 'VIDEO',
      name: '비디오 블록',
      content: {
        src: 'https://example.com/video.mp4',
        poster: 'https://example.com/poster.jpg',
        controls: true,
        autoplay: false
      }
    },

    CAROUSEL: {
      id: 'carousel-1',
      type: 'CAROUSEL',
      name: '캐러셀 블록',
      content: {
        items: [
          {
            type: 'image',
            src: 'https://example.com/slide1.jpg',
            alt: '슬라이드 1'
          },
          {
            type: 'image',
            src: 'https://example.com/slide2.jpg',
            alt: '슬라이드 2'
          }
        ],
        autoplay: true,
        interval: 5000
      }
    },

    FORM: {
      id: 'form-1',
      type: 'FORM',
      name: '폼 블록',
      content: {
        title: '문의 폼',
        fields: [
          {
            type: 'text',
            name: 'name',
            label: '이름',
            required: true
          },
          {
            type: 'email',
            name: 'email',
            label: '이메일',
            required: true
          },
          {
            type: 'textarea',
            name: 'message',
            label: '메시지',
            required: false
          }
        ],
        submitText: '전송'
      }
    },

    MAP: {
      id: 'map-1',
      type: 'MAP',
      name: '지도 블록',
      content: {
        latitude: 37.5665,
        longitude: 126.9780,
        zoom: 15,
        showMarker: true,
        markerTitle: '서울시청',
        apiKey: 'test-api-key'
      }
    },

    HTML: {
      id: 'html-1',
      type: 'HTML',
      name: 'HTML 블록',
      content: {
        html: '<div class="custom-html"><h2>커스텀 HTML</h2><p>이것은 사용자 정의 HTML입니다.</p></div>',
        sanitize: true,
        allowStyles: true,
        allowScripts: false
      }
    },

    COMPONENT: {
      id: 'component-1',
      type: 'COMPONENT',
      name: '컴포넌트 블록',
      content: {
        componentName: 'Card',
        props: {
          title: '카드 제목',
          subtitle: '카드 부제목'
        },
        children: '카드 내용입니다.'
      }
    }
  };

  beforeEach(() => {
    // 각 테스트 전에 캐시 및 메트릭 초기화
    BlockRendererFactory.clearRendererCache();
    RenderingPerformanceMonitor.clearMetrics();
  });

  describe('BlockRendererFactory 기본 기능', () => {
    test('지원되는 모든 블록 타입을 반환해야 함', () => {
      const supportedTypes = BlockRendererFactory.getSupportedBlockTypes();
      expect(supportedTypes).toHaveLength(10);
      expect(supportedTypes).toEqual(SUPPORTED_BLOCK_TYPES);
    });

    test('유효한 블록 타입에 대해 렌더러를 반환해야 함', () => {
      SUPPORTED_BLOCK_TYPES.forEach(type => {
        expect(() => {
          const renderer = BlockRendererFactory.getRenderer(type);
          expect(renderer).toBeDefined();
          expect(typeof renderer.renderToHTML).toBe('function');
          expect(typeof renderer.renderToReact).toBe('function');
        }).not.toThrow();
      });
    });

    test('지원되지 않는 블록 타입에 대해 에러를 발생시켜야 함', () => {
      expect(() => {
        BlockRendererFactory.getRenderer('UNSUPPORTED');
      }).toThrow('지원되지 않는 블록 타입');
    });

    test('블록 타입 유효성 검증이 정상 작동해야 함', () => {
      expect(BlockRendererFactory.isValidBlockType('TEXT')).toBe(true);
      expect(BlockRendererFactory.isValidBlockType('text')).toBe(true);
      expect(BlockRendererFactory.isValidBlockType('INVALID')).toBe(false);
    });
  });

  describe('개별 블록 렌더링 테스트', () => {
    Object.entries(sampleBlocks).forEach(([blockType, blockData]) => {
      test(`${blockType} 블록이 HTML로 정상 렌더링되어야 함`, () => {
        const html = BlockRendererFactory.renderToHTML(blockData as ContentBlockData);

        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(0);
        expect(html).toContain('cms-');
        expect(html).toContain(blockType.toLowerCase());
      });

      test(`${blockType} 블록 유효성 검증이 성공해야 함`, () => {
        const isValid = BlockRendererFactory.validateBlock(blockData as ContentBlockData);
        expect(isValid).toBe(true);
      });

      test(`${blockType} 블록에 스타일이 적용되어야 함`, () => {
        const blockWithStyles = {
          ...blockData,
          styles: {
            backgroundColor: '#ffffff',
            padding: '20px',
            margin: '10px'
          }
        };

        const html = BlockRendererFactory.renderToHTML(blockWithStyles as ContentBlockData);
        expect(html).toContain('style=');
      });
    });
  });

  describe('여러 블록 일괄 렌더링 테스트', () => {
    test('여러 블록을 HTML로 일괄 렌더링해야 함', () => {
      const blocks = Object.values(sampleBlocks) as ContentBlockData[];
      const html = BlockRendererFactory.renderBlocksToHTML(blocks);

      expect(html).toBeDefined();
      expect(html).toContain('cms-blocks-container');

      // 각 블록이 포함되어 있는지 확인
      SUPPORTED_BLOCK_TYPES.forEach(type => {
        expect(html).toContain(`cms-${type.toLowerCase()}-block`);
      });
    });

    test('빈 블록 배열에 대해 적절한 메시지를 반환해야 함', () => {
      const html = BlockRendererFactory.renderBlocksToHTML([]);
      expect(html).toContain('표시할 블록이 없습니다');
    });
  });

  describe('렌더링 통계 및 성능 테스트', () => {
    test('렌더링 통계를 정확히 생성해야 함', () => {
      const blocks = Object.values(sampleBlocks) as ContentBlockData[];
      const stats = BlockRendererFactory.generateRenderingStats(blocks);

      expect(stats.totalBlocks).toBe(10);
      expect(stats.validBlocks).toBe(10);
      expect(stats.invalidBlocks).toBe(0);
      expect(stats.supportedTypes).toBe(10);
      expect(stats.unsupportedTypes).toBe(0);
      expect(Object.keys(stats.blockTypeDistribution)).toHaveLength(10);
    });

    test('성능 측정이 정상 작동해야 함', async () => {
      const block = sampleBlocks.TEXT as ContentBlockData;
      const performance = await BlockRendererFactory.measureRenderingPerformance(block, 5);

      expect(performance.htmlRenderTime).toBeGreaterThan(0);
      expect(performance.averageHtmlTime).toBeGreaterThan(0);
      expect(performance.validationTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('렌더러 캐싱 시스템 테스트', () => {
    test('렌더러가 캐시에 저장되어야 함', () => {
      // 첫 번째 호출
      const renderer1 = BlockRendererFactory.getRenderer('TEXT');

      // 두 번째 호출 (캐시에서 가져와야 함)
      const renderer2 = BlockRendererFactory.getRenderer('TEXT');

      expect(renderer1).toBe(renderer2); // 동일한 인스턴스여야 함
    });

    test('캐시 상태를 정확히 보고해야 함', () => {
      // 일부 렌더러 로드
      BlockRendererFactory.getRenderer('TEXT');
      BlockRendererFactory.getRenderer('IMAGE');

      const cacheStatus = BlockRendererFactory.getRendererCacheStatus();
      expect(cacheStatus.TEXT).toBe(true);
      expect(cacheStatus.IMAGE).toBe(true);
      expect(cacheStatus.VIDEO).toBe(false);
    });

    test('캐시 초기화가 정상 작동해야 함', () => {
      // 렌더러 로드
      BlockRendererFactory.getRenderer('TEXT');

      // 캐시 초기화
      BlockRendererFactory.clearRendererCache();

      const cacheStatus = BlockRendererFactory.getRendererCacheStatus();
      expect(Object.values(cacheStatus).every(cached => !cached)).toBe(true);
    });
  });

  describe('성능 모니터링 시스템 테스트', () => {
    test('렌더링 시간을 기록해야 함', () => {
      RenderingPerformanceMonitor.recordRenderTime('TEXT', 10.5);
      RenderingPerformanceMonitor.recordRenderTime('TEXT', 12.3);
      RenderingPerformanceMonitor.recordRenderTime('TEXT', 9.8);

      const avgTime = RenderingPerformanceMonitor.getAverageRenderTime('TEXT');
      expect(avgTime).toBeCloseTo(10.87, 1);
    });

    test('모든 성능 통계를 반환해야 함', () => {
      RenderingPerformanceMonitor.recordRenderTime('TEXT', 10);
      RenderingPerformanceMonitor.recordRenderTime('IMAGE', 15);

      const stats = RenderingPerformanceMonitor.getAllPerformanceStats();
      expect(stats.TEXT).toBeDefined();
      expect(stats.IMAGE).toBeDefined();
      expect(stats.TEXT.averageTime).toBe(10);
      expect(stats.IMAGE.averageTime).toBe(15);
    });
  });

  describe('안전한 렌더링 함수 테스트', () => {
    test('유효한 블록을 안전하게 렌더링해야 함', () => {
      const result = safeRenderBlock(sampleBlocks.TEXT as ContentBlockData);

      expect(result.success).toBe(true);
      expect(result.html).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.renderTime).toBeGreaterThan(0);
    });

    test('잘못된 블록에 대해 에러를 처리해야 함', () => {
      const invalidBlock = {
        id: 'invalid',
        type: 'INVALID_TYPE',
        content: {}
      };

      const result = safeRenderBlock(invalidBlock);
      expect(result.success).toBe(false);
      expect(result.error).toContain('지원되지 않는 블록 타입');
    });

    test('폴백 옵션이 활성화된 경우 에러 블록도 HTML을 반환해야 함', () => {
      const invalidBlock = {
        id: 'invalid',
        type: 'INVALID_TYPE',
        content: {}
      };

      const result = safeRenderBlock(invalidBlock, { fallbackOnError: true });
      expect(result.success).toBe(false);
      expect(result.html).toContain('cms-block-error');
      expect(result.error).toBeDefined();
    });

    test('여러 블록을 안전하게 렌더링하고 통계를 생성해야 함', () => {
      const blocks = [
        sampleBlocks.TEXT,
        { id: 'invalid', type: 'INVALID', content: {} },
        sampleBlocks.IMAGE
      ] as ContentBlockData[];

      const result = safeRenderBlocks(blocks, { fallbackOnError: true });

      expect(result.stats.total).toBe(3);
      expect(result.stats.successful).toBe(2);
      expect(result.stats.failed).toBe(1);
      expect(result.html).toContain('cms-blocks-container');
    });
  });

  describe('유틸리티 함수 테스트', () => {
    test('블록 타입 지원 여부를 정확히 판단해야 함', () => {
      expect(isSupportedBlockType('TEXT')).toBe(true);
      expect(isSupportedBlockType('text')).toBe(true);
      expect(isSupportedBlockType('INVALID')).toBe(false);
    });

    test('블록 타입을 정규화해야 함', () => {
      expect(normalizeBlockType('text')).toBe('TEXT');
      expect(normalizeBlockType('Text')).toBe('TEXT');
      expect(normalizeBlockType('invalid')).toBeNull();
    });

    test('렌더러 상태 검사가 정상 작동해야 함', () => {
      const health = checkRenderersHealth();

      SUPPORTED_BLOCK_TYPES.forEach(type => {
        expect(health[type]).toBeDefined();
        expect(health[type].canInstantiate).toBe(true);
        expect(health[type].error).toBeUndefined();
      });
    });
  });

  describe('에러 처리 및 복구 테스트', () => {
    test('잘못된 블록 데이터에 대해 적절한 에러 메시지를 생성해야 함', () => {
      const invalidBlock = {
        id: 'test',
        type: 'TEXT',
        content: null // 잘못된 콘텐츠
      };

      const html = BlockRendererFactory.renderToHTML(invalidBlock as unknown as ContentBlockData);
      expect(html).toContain('cms-block-error');
      expect(html).toContain('렌더링 오류');
    });

    test('React 렌더링 에러도 적절히 처리해야 함', () => {
      const invalidBlock = {
        id: 'test',
        name: 'test block',
        type: 'TEXT' as const,
        content: { text: null } // 잘못된 텍스트
      } as ContentBlockData;

      const element = BlockRendererFactory.renderToReact(invalidBlock as ContentBlockData);
      expect(element).toBeDefined();
      expect(element.props.className).toContain('cms-block-error');
    });
  });

  describe('메모리 및 리소스 관리 테스트', () => {
    test('대량의 블록 렌더링 후 메모리 누수가 없어야 함', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 대량의 블록 렌더링
      for (let i = 0; i < 100; i++) {
        Object.values(sampleBlocks).forEach(block => {
          BlockRendererFactory.renderToHTML(block as ContentBlockData);
        });
      }

      // 가비지 컬렉션 강제 실행 (테스트 환경에서)
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 메모리 증가가 합리적인 수준인지 확인 (100MB 미만)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('성능 메트릭 제한이 정상 작동해야 함', () => {
      // 100개 이상의 기록 추가
      for (let i = 0; i < 150; i++) {
        RenderingPerformanceMonitor.recordRenderTime('TEXT', Math.random() * 100);
      }

      const stats = RenderingPerformanceMonitor.getAllPerformanceStats();
      // 최대 100개만 유지되어야 함
      expect(stats.TEXT.sampleCount).toBeLessThanOrEqual(100);
    });
  });
});

/**
 * 성능 벤치마크 테스트 (선택적 실행)
 */
describe('성능 벤치마크 테스트', () => {
  // 이 테스트는 성능 검증이 필요할 때만 실행
  test.skip('모든 렌더러의 성능 벤치마크', async () => {
    const benchmarkResults: { [key: string]: number } = {};

    for (const [type, block] of Object.entries(sampleBlocks)) {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        BlockRendererFactory.renderToHTML(block as ContentBlockData);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      benchmarkResults[type] = avgTime;

      // 각 렌더러는 평균 5ms 이하로 렌더링되어야 함
      expect(avgTime).toBeLessThan(5);
    }

    console.table(benchmarkResults);
  });
});