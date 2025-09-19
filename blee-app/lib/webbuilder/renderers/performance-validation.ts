/**
 * 웹빌더 렌더링 엔진 성능 검증 스크립트
 * 실제 운영 환경에서의 성능 테스트 및 최적화 검증
 */

import { ContentBlockData } from '@/app/types/webbuilder';
import {
  BlockRendererFactory,
  RenderingPerformanceMonitor,
  SUPPORTED_BLOCK_TYPES,
  safeRenderBlocks,
  benchmarkRenderers
} from './index';

/**
 * 성능 검증 결과 타입
 */
interface PerformanceValidationResult {
  passed: boolean;
  results: {
    [testName: string]: {
      passed: boolean;
      actualValue: number;
      expectedValue: number;
      unit: string;
      description: string;
    };
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallScore: number;
  };
  recommendations: string[];
}

/**
 * 성능 임계값 설정
 */
const PERFORMANCE_THRESHOLDS = {
  // 렌더링 시간 (밀리초)
  SINGLE_BLOCK_RENDER_TIME: 5,
  MULTIPLE_BLOCKS_RENDER_TIME: 50,
  BULK_RENDER_TIME_PER_BLOCK: 2,

  // 메모리 사용량 (MB)
  MEMORY_USAGE_INCREASE: 50,
  MEMORY_LEAK_THRESHOLD: 10,

  // 처리량 (블록/초)
  MINIMUM_THROUGHPUT: 100,

  // 검증 시간 (밀리초)
  VALIDATION_TIME: 1,

  // 캐시 효율성 (%)
  CACHE_HIT_RATIO: 90
};

/**
 * 테스트용 블록 생성기
 */
class TestBlockGenerator {
  /**
   * 단일 테스트 블록 생성
   */
  static createTestBlock(type: string, complexity: 'simple' | 'medium' | 'complex' = 'medium'): ContentBlockData {
    const blocks: { [key: string]: Record<string, unknown> } = {
      TEXT: {
        simple: { text: '간단한 텍스트', format: 'plain' },
        medium: { text: '<h1>제목</h1><p>단락 텍스트</p>', format: 'html' },
        complex: {
          text: Array(100).fill('<p>복잡한 텍스트 블록 </p>').join(''),
          format: 'html'
        }
      },
      IMAGE: {
        simple: { src: '/test.jpg', alt: '테스트' },
        medium: { src: '/test.jpg', alt: '테스트', caption: '캡션', link: '#' },
        complex: {
          src: '/test.jpg',
          alt: '복잡한 이미지',
          caption: '매우 긴 캡션 텍스트'.repeat(10)
        }
      },
      GRID: {
        simple: { columns: 2, items: Array(2).fill({ content: { type: 'TEXT', content: { text: '아이템' } } }) },
        medium: { columns: 3, items: Array(6).fill({ content: { type: 'TEXT', content: { text: '아이템' } } }) },
        complex: { columns: 4, items: Array(16).fill({ content: { type: 'TEXT', content: { text: '복잡한 아이템' } } }) }
      },
      BUTTON: {
        simple: { text: '버튼', link: '#' },
        medium: { text: '버튼', link: '#', variant: 'primary', size: 'medium' },
        complex: { text: '복잡한 버튼', link: '#', variant: 'outline', size: 'large' }
      },
      VIDEO: {
        simple: { src: '/test.mp4' },
        medium: { src: '/test.mp4', controls: true, poster: '/poster.jpg' },
        complex: { src: '/test.mp4', controls: true, poster: '/poster.jpg', autoplay: true, loop: true }
      },
      CAROUSEL: {
        simple: { items: Array(2).fill({ type: 'image', src: '/test.jpg' }) },
        medium: { items: Array(5).fill({ type: 'image', src: '/test.jpg' }), autoplay: true },
        complex: {
          items: Array(10).fill({ type: 'content', title: '제목', description: '설명' }),
          autoplay: true,
          interval: 3000
        }
      },
      FORM: {
        simple: { fields: [{ type: 'text', name: 'name', label: '이름' }] },
        medium: {
          fields: [
            { type: 'text', name: 'name', label: '이름', required: true },
            { type: 'email', name: 'email', label: '이메일', required: true }
          ]
        },
        complex: {
          fields: Array(10).fill(0).map((_, i) => ({
            type: i % 2 === 0 ? 'text' : 'email',
            name: `field${i}`,
            label: `필드 ${i}`,
            required: i < 5
          }))
        }
      },
      MAP: {
        simple: { latitude: 37.5665, longitude: 126.9780 },
        medium: { latitude: 37.5665, longitude: 126.9780, zoom: 15, showMarker: true },
        complex: {
          latitude: 37.5665,
          longitude: 126.9780,
          zoom: 15,
          showMarker: true,
          markerTitle: '복잡한 마커 정보'
        }
      },
      HTML: {
        simple: { html: '<div>간단한 HTML</div>' },
        medium: { html: '<div class="test"><h1>제목</h1><p>내용</p></div>', sanitize: true },
        complex: {
          html: Array(50).fill('<div class="complex">복잡한 HTML 블록</div>').join(''),
          sanitize: true,
          allowStyles: true
        }
      },
      COMPONENT: {
        simple: { componentName: 'Card', props: { title: '제목' } },
        medium: { componentName: 'Alert', props: { type: 'info', title: '알림' }, children: '내용' },
        complex: {
          componentName: 'Modal',
          props: {
            title: '복잡한 모달',
            size: 'xl',
            trigger: '모달 열기'
          },
          children: '복잡한 모달 내용'.repeat(20)
        }
      }
    };

    return {
      id: `${type.toLowerCase()}-${complexity}-${Date.now()}`,
      type,
      name: `${type} ${complexity} 블록`,
      content: blocks[type]?.[complexity] || blocks[type]?.medium || {},
      styles: complexity === 'complex' ? {
        backgroundColor: '#f0f0f0',
        padding: '20px',
        margin: '10px',
        border: '1px solid #ccc',
        borderRadius: '8px'
      } : undefined
    };
  }

  /**
   * 대량의 테스트 블록 생성
   */
  static createBulkTestBlocks(count: number, distribution?: { [key: string]: number }): ContentBlockData[] {
    const defaultDistribution = {
      TEXT: 30,
      IMAGE: 20,
      GRID: 15,
      BUTTON: 10,
      VIDEO: 5,
      CAROUSEL: 5,
      FORM: 5,
      MAP: 3,
      HTML: 4,
      COMPONENT: 3
    };

    const finalDistribution = distribution || defaultDistribution;
    const blocks: ContentBlockData[] = [];

    Object.entries(finalDistribution).forEach(([type, percentage]) => {
      const blockCount = Math.floor((count * percentage) / 100);
      const complexities: Array<'simple' | 'medium' | 'complex'> = ['simple', 'medium', 'complex'];

      for (let i = 0; i < blockCount; i++) {
        const complexity = complexities[i % 3];
        blocks.push(this.createTestBlock(type, complexity));
      }
    });

    return blocks.slice(0, count);
  }
}

/**
 * 성능 검증 클래스
 */
export class RenderingPerformanceValidator {

  /**
   * 전체 성능 검증 실행
   */
  static async validatePerformance(): Promise<PerformanceValidationResult> {
    console.log('🚀 웹빌더 렌더링 엔진 성능 검증 시작...\n');

    const results: PerformanceValidationResult['results'] = {};
    const recommendations: string[] = [];

    // 1. 단일 블록 렌더링 성능 테스트
    const singleBlockResult = await this.testSingleBlockPerformance();
    results['single_block_rendering'] = singleBlockResult;

    // 2. 다중 블록 렌더링 성능 테스트
    const multipleBlockResult = await this.testMultipleBlocksPerformance();
    results['multiple_blocks_rendering'] = multipleBlockResult;

    // 3. 대량 렌더링 처리량 테스트
    const throughputResult = await this.testRenderingThroughput();
    results['rendering_throughput'] = throughputResult;

    // 4. 메모리 사용량 테스트
    const memoryResult = await this.testMemoryUsage();
    results['memory_usage'] = memoryResult;

    // 5. 캐시 효율성 테스트
    const cacheResult = await this.testCacheEfficiency();
    results['cache_efficiency'] = cacheResult;

    // 6. 유효성 검증 성능 테스트
    const validationResult = await this.testValidationPerformance();
    results['validation_performance'] = validationResult;

    // 7. 에러 복구 성능 테스트
    const errorRecoveryResult = await this.testErrorRecoveryPerformance();
    results['error_recovery'] = errorRecoveryResult;

    // 결과 분석 및 권장사항 생성
    const summary = this.analyzResults(results);
    const finalRecommendations = this.generateRecommendations(results);

    return {
      passed: summary.overallScore >= 80,
      results,
      summary,
      recommendations: finalRecommendations
    };
  }

  /**
   * 단일 블록 렌더링 성능 테스트
   */
  private static async testSingleBlockPerformance() {
    const iterations = 100;
    const totalTimes: number[] = [];

    for (const blockType of SUPPORTED_BLOCK_TYPES) {
      const block = TestBlockGenerator.createTestBlock(blockType, 'medium');

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        BlockRendererFactory.renderToHTML(block);
        const endTime = performance.now();
        totalTimes.push(endTime - startTime);
      }
    }

    const averageTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;

    return {
      passed: averageTime <= PERFORMANCE_THRESHOLDS.SINGLE_BLOCK_RENDER_TIME,
      actualValue: parseFloat(averageTime.toFixed(3)),
      expectedValue: PERFORMANCE_THRESHOLDS.SINGLE_BLOCK_RENDER_TIME,
      unit: 'ms',
      description: '단일 블록 평균 렌더링 시간'
    };
  }

  /**
   * 다중 블록 렌더링 성능 테스트
   */
  private static async testMultipleBlocksPerformance() {
    const blocks = TestBlockGenerator.createBulkTestBlocks(50);
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      BlockRendererFactory.renderBlocksToHTML(blocks);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;

    return {
      passed: averageTime <= PERFORMANCE_THRESHOLDS.MULTIPLE_BLOCKS_RENDER_TIME,
      actualValue: parseFloat(averageTime.toFixed(3)),
      expectedValue: PERFORMANCE_THRESHOLDS.MULTIPLE_BLOCKS_RENDER_TIME,
      unit: 'ms',
      description: '50개 블록 일괄 렌더링 시간'
    };
  }

  /**
   * 렌더링 처리량 테스트
   */
  private static async testRenderingThroughput() {
    const blocks = TestBlockGenerator.createBulkTestBlocks(1000);
    const startTime = performance.now();

    blocks.forEach(block => {
      BlockRendererFactory.renderToHTML(block);
    });

    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000; // 초 단위
    const throughput = blocks.length / totalTime; // 블록/초

    return {
      passed: throughput >= PERFORMANCE_THRESHOLDS.MINIMUM_THROUGHPUT,
      actualValue: parseFloat(throughput.toFixed(1)),
      expectedValue: PERFORMANCE_THRESHOLDS.MINIMUM_THROUGHPUT,
      unit: 'blocks/sec',
      description: '렌더링 처리량 (블록/초)'
    };
  }

  /**
   * 메모리 사용량 테스트
   */
  private static async testMemoryUsage() {
    const initialMemory = process.memoryUsage().heapUsed;
    const blocks = TestBlockGenerator.createBulkTestBlocks(1000);

    // 대량 렌더링 실행
    blocks.forEach(block => {
      BlockRendererFactory.renderToHTML(block);
    });

    // 가비지 컬렉션 강제 실행 (가능한 경우)
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

    return {
      passed: memoryIncrease <= PERFORMANCE_THRESHOLDS.MEMORY_USAGE_INCREASE,
      actualValue: parseFloat(memoryIncrease.toFixed(2)),
      expectedValue: PERFORMANCE_THRESHOLDS.MEMORY_USAGE_INCREASE,
      unit: 'MB',
      description: '메모리 사용량 증가'
    };
  }

  /**
   * 캐시 효율성 테스트
   */
  private static async testCacheEfficiency() {
    BlockRendererFactory.clearRendererCache();

    const totalRequests = 1000;
    const uniqueTypes = SUPPORTED_BLOCK_TYPES.length;
    const expectedCacheHits = totalRequests - uniqueTypes;

    // 렌더러 요청 (캐시 미스가 발생해야 함)
    SUPPORTED_BLOCK_TYPES.forEach(type => {
      BlockRendererFactory.getRenderer(type);
    });

    // 추가 요청 (캐시 히트가 발생해야 함)
    for (let i = 0; i < totalRequests - uniqueTypes; i++) {
      const randomType = SUPPORTED_BLOCK_TYPES[i % uniqueTypes];
      BlockRendererFactory.getRenderer(randomType);
    }

    // 캐시 상태 확인
    const cacheStatus = BlockRendererFactory.getRendererCacheStatus();
    const cachedTypes = Object.values(cacheStatus).filter(cached => cached).length;
    const cacheHitRatio = (cachedTypes / uniqueTypes) * 100;

    return {
      passed: cacheHitRatio >= PERFORMANCE_THRESHOLDS.CACHE_HIT_RATIO,
      actualValue: parseFloat(cacheHitRatio.toFixed(1)),
      expectedValue: PERFORMANCE_THRESHOLDS.CACHE_HIT_RATIO,
      unit: '%',
      description: '렌더러 캐시 효율성'
    };
  }

  /**
   * 유효성 검증 성능 테스트
   */
  private static async testValidationPerformance() {
    const blocks = TestBlockGenerator.createBulkTestBlocks(1000);
    const times: number[] = [];

    blocks.forEach(block => {
      const startTime = performance.now();
      BlockRendererFactory.validateBlock(block);
      const endTime = performance.now();
      times.push(endTime - startTime);
    });

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;

    return {
      passed: averageTime <= PERFORMANCE_THRESHOLDS.VALIDATION_TIME,
      actualValue: parseFloat(averageTime.toFixed(3)),
      expectedValue: PERFORMANCE_THRESHOLDS.VALIDATION_TIME,
      unit: 'ms',
      description: '블록 유효성 검증 평균 시간'
    };
  }

  /**
   * 에러 복구 성능 테스트
   */
  private static async testErrorRecoveryPerformance() {
    const invalidBlocks = [
      { id: '1', type: 'INVALID_TYPE', content: {} },
      { id: '2', type: 'TEXT', content: null },
      { id: '3', type: 'IMAGE', content: { src: null } }
    ];

    const times: number[] = [];

    invalidBlocks.forEach(block => {
      const startTime = performance.now();
      try {
        BlockRendererFactory.renderToHTML(block as ContentBlockData);
      } catch (error) {
        // 에러는 예상됨
      }
      const endTime = performance.now();
      times.push(endTime - startTime);
    });

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;

    return {
      passed: averageTime <= 10, // 에러 처리는 10ms 이하
      actualValue: parseFloat(averageTime.toFixed(3)),
      expectedValue: 10,
      unit: 'ms',
      description: '에러 블록 처리 평균 시간'
    };
  }

  /**
   * 결과 분석
   */
  private static analyzResults(results: PerformanceValidationResult['results']) {
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const overallScore = (passedTests / totalTests) * 100;

    return {
      totalTests,
      passedTests,
      failedTests,
      overallScore: parseFloat(overallScore.toFixed(1))
    };
  }

  /**
   * 권장사항 생성
   */
  private static generateRecommendations(results: PerformanceValidationResult['results']): string[] {
    const recommendations: string[] = [];

    Object.entries(results).forEach(([testName, result]) => {
      if (!result.passed) {
        switch (testName) {
          case 'single_block_rendering':
            recommendations.push(
              `단일 블록 렌더링 성능 개선 필요: 현재 ${result.actualValue}ms, 목표 ${result.expectedValue}ms 이하`
            );
            break;
          case 'multiple_blocks_rendering':
            recommendations.push(
              `다중 블록 렌더링 최적화 필요: 배치 처리 또는 가상화 도입 검토`
            );
            break;
          case 'rendering_throughput':
            recommendations.push(
              `렌더링 처리량 개선 필요: Worker 스레드 또는 병렬 처리 도입 검토`
            );
            break;
          case 'memory_usage':
            recommendations.push(
              `메모리 사용량 최적화 필요: 객체 풀링 또는 메모리 해제 로직 개선`
            );
            break;
          case 'cache_efficiency':
            recommendations.push(
              `캐시 효율성 개선 필요: 캐시 정책 재검토 또는 LRU 캐시 도입`
            );
            break;
          case 'validation_performance':
            recommendations.push(
              `유효성 검증 성능 개선 필요: 스키마 검증 최적화 또는 지연 검증 도입`
            );
            break;
          case 'error_recovery':
            recommendations.push(
              `에러 처리 성능 개선 필요: 에러 처리 로직 간소화 검토`
            );
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('🎉 모든 성능 테스트를 통과했습니다!');
    }

    return recommendations;
  }

  /**
   * 성능 보고서 출력
   */
  static printPerformanceReport(result: PerformanceValidationResult): void {
    console.log('\n📊 웹빌더 렌더링 엔진 성능 검증 결과\n');
    console.log('='.repeat(60));

    // 전체 결과
    const statusIcon = result.passed ? '✅' : '❌';
    console.log(`${statusIcon} 전체 결과: ${result.passed ? 'PASS' : 'FAIL'}`);
    console.log(`📈 전체 점수: ${result.summary.overallScore}%`);
    console.log(`📊 테스트 통계: ${result.summary.passedTests}/${result.summary.totalTests} 통과\n`);

    // 개별 테스트 결과
    console.log('📋 개별 테스트 결과:');
    console.log('-'.repeat(60));

    Object.entries(result.results).forEach(([testName, testResult]) => {
      const icon = testResult.passed ? '✅' : '❌';
      const status = testResult.passed ? 'PASS' : 'FAIL';

      console.log(`${icon} ${testResult.description}`);
      console.log(`   ${status}: ${testResult.actualValue}${testResult.unit} (기준: ≤${testResult.expectedValue}${testResult.unit})`);
    });

    // 권장사항
    if (result.recommendations.length > 0) {
      console.log('\n💡 권장사항:');
      console.log('-'.repeat(60));
      result.recommendations.forEach((recommendation, index) => {
        console.log(`${index + 1}. ${recommendation}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

/**
 * 성능 검증 실행 스크립트
 */
export async function runPerformanceValidation(): Promise<void> {
  try {
    const result = await RenderingPerformanceValidator.validatePerformance();
    RenderingPerformanceValidator.printPerformanceReport(result);

    // 프로세스 종료 코드 설정
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ 성능 검증 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트로 직접 실행된 경우
if (require.main === module) {
  runPerformanceValidation();
}