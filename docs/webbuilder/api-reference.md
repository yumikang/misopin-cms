# 웹빌더 블록 렌더링 엔진 API 참조 가이드

## 목차
1. [BlockRenderer 인터페이스](#blockrenderer-인터페이스)
2. [BlockRendererFactory](#blockrendererfactory)
3. [개별 블록 렌더러](#개별-블록-렌더러)
4. [유틸리티 함수](#유틸리티-함수)
5. [성능 모니터링](#성능-모니터링)
6. [타입 정의](#타입-정의)
7. [사용 예제](#사용-예제)

---

## BlockRenderer 인터페이스

모든 블록 렌더러가 구현해야 하는 핵심 인터페이스입니다.

### 메서드

#### `renderToHTML(block: ContentBlockData): string`
블록을 HTML 문자열로 렌더링합니다.

**매개변수:**
- `block`: ContentBlockData - 렌더링할 블록 데이터

**반환값:**
- `string` - 렌더링된 HTML 문자열

**예제:**
```typescript
const renderer = new TextBlockRenderer();
const html = renderer.renderToHTML({
  id: 'text-1',
  type: 'TEXT',
  name: '제목',
  content: { text: '안녕하세요', format: 'html' },
  styles: { fontSize: '18px' },
  position: { x: 0, y: 0 }
});
// 출력: '<div class="cms-block cms-text-block" style="font-size: 18px;">안녕하세요</div>'
```

#### `renderToReact(block: ContentBlockData): JSX.Element`
블록을 React JSX 엘리먼트로 렌더링합니다.

**매개변수:**
- `block`: ContentBlockData - 렌더링할 블록 데이터

**반환값:**
- `JSX.Element` - React JSX 엘리먼트

**예제:**
```typescript
const reactElement = renderer.renderToReact({
  id: 'button-1',
  type: 'BUTTON',
  content: { text: '클릭하세요', variant: 'primary' }
});
```

#### `validate(block: ContentBlockData): boolean`
블록 데이터의 유효성을 검증합니다.

**매개변수:**
- `block`: ContentBlockData - 검증할 블록 데이터

**반환값:**
- `boolean` - 유효하면 true, 무효하면 false

**예제:**
```typescript
const isValid = renderer.validate({
  id: 'test-1',
  type: 'TEXT',
  content: { text: 'Hello' }
});
// 출력: true
```

#### `applyStyles(baseHTML: string, block: ContentBlockData): string`
기본 HTML에 스타일을 적용합니다.

**매개변수:**
- `baseHTML`: string - 기본 HTML 문자열
- `block`: ContentBlockData - 스타일 정보가 포함된 블록 데이터

**반환값:**
- `string` - 스타일이 적용된 HTML

---

## BlockRendererFactory

팩토리 패턴을 사용하여 블록 렌더러를 생성하고 관리하는 핵심 클래스입니다.

### 정적 메서드

#### `getRenderer(blockType: string): BlockRenderer`
블록 타입에 따른 렌더러 인스턴스를 반환합니다.

**매개변수:**
- `blockType`: string - 블록 타입 ('TEXT', 'IMAGE', 'GRID' 등)

**반환값:**
- `BlockRenderer` - 해당 블록 타입의 렌더러 인스턴스

**예제:**
```typescript
// 자동 캐싱으로 성능 최적화
const textRenderer = BlockRendererFactory.getRenderer('TEXT');
const imageRenderer = BlockRendererFactory.getRenderer('IMAGE');
```

#### `renderToHTML(block: ContentBlockData): string`
단일 블록을 HTML로 렌더링합니다.

**매개변수:**
- `block`: ContentBlockData - 렌더링할 블록

**반환값:**
- `string` - 렌더링된 HTML 또는 에러 시 폴백 HTML

**예제:**
```typescript
const html = BlockRendererFactory.renderToHTML({
  id: 'grid-1',
  type: 'GRID',
  content: {
    columns: 2,
    items: [
      { id: 'item-1', type: 'TEXT', content: { text: '첫 번째' } },
      { id: 'item-2', type: 'TEXT', content: { text: '두 번째' } }
    ]
  }
});
```

#### `renderToReact(block: ContentBlockData): JSX.Element`
단일 블록을 React JSX로 렌더링합니다.

**예제:**
```typescript
const ReactBlock = BlockRendererFactory.renderToReact(block);

// React 컴포넌트에서 사용
function MyPage() {
  return (
    <div>
      {ReactBlock}
    </div>
  );
}
```

#### `renderBlocksToHTML(blocks: ContentBlockData[]): string`
여러 블록을 한번에 HTML로 렌더링합니다.

**매개변수:**
- `blocks`: ContentBlockData[] - 렌더링할 블록 배열

**반환값:**
- `string` - 모든 블록이 렌더링된 HTML

**예제:**
```typescript
const blocks = [
  { id: '1', type: 'TEXT', content: { text: '제목' } },
  { id: '2', type: 'IMAGE', content: { src: '/photo.jpg', alt: '사진' } },
  { id: '3', type: 'BUTTON', content: { text: '액션', variant: 'primary' } }
];

const fullPageHTML = BlockRendererFactory.renderBlocksToHTML(blocks);
// 출력: '<div class="cms-blocks-container">...</div>'
```

#### `renderBlocksToReact(blocks: ContentBlockData[]): JSX.Element`
여러 블록을 React JSX로 렌더링합니다.

**예제:**
```typescript
const BlocksContainer = BlockRendererFactory.renderBlocksToReact(blocks);

function ContentPage({ blocks }) {
  return (
    <main>
      {BlockRendererFactory.renderBlocksToReact(blocks)}
    </main>
  );
}
```

#### `validateBlock(block: ContentBlockData): boolean`
블록 유효성을 검증합니다.

**예제:**
```typescript
const isValid = BlockRendererFactory.validateBlock(block);
if (!isValid) {
  console.error('유효하지 않은 블록:', block);
}
```

#### `measureRenderingPerformance(block: ContentBlockData, iterations?: number): Promise<PerformanceMetrics>`
블록 렌더링 성능을 측정합니다.

**매개변수:**
- `block`: ContentBlockData - 성능을 측정할 블록
- `iterations`: number (기본값: 10) - 측정 반복 횟수

**반환값:**
- `Promise<PerformanceMetrics>` - 성능 측정 결과

**예제:**
```typescript
const performance = await BlockRendererFactory.measureRenderingPerformance(
  complexGridBlock,
  100 // 100회 반복 측정
);

console.log('HTML 렌더링 평균 시간:', performance.averageHtmlTime, 'ms');
console.log('React 렌더링 평균 시간:', performance.averageReactTime, 'ms');
console.log('유효성 검증 시간:', performance.validationTime, 'ms');
```

#### `generateRenderingStats(blocks: ContentBlockData[]): RenderingStats`
블록 배열의 렌더링 통계를 생성합니다.

**예제:**
```typescript
const stats = BlockRendererFactory.generateRenderingStats(allBlocks);

console.log('총 블록 수:', stats.totalBlocks);
console.log('유효한 블록:', stats.validBlocks);
console.log('무효한 블록:', stats.invalidBlocks);
console.log('블록 타입 분포:', stats.blockTypeDistribution);
```

---

## 개별 블록 렌더러

### TextBlockRenderer

텍스트 블록을 처리하는 렌더러입니다.

#### 지원 형식
- `html`: HTML 마크업 지원
- `markdown`: 기본 마크다운 구문 지원
- `plain`: 플레인 텍스트

**예제:**
```typescript
// HTML 형식
const htmlBlock = {
  type: 'TEXT',
  content: {
    text: '<strong>굵은 텍스트</strong>',
    format: 'html'
  }
};

// 마크다운 형식
const markdownBlock = {
  type: 'TEXT',
  content: {
    text: '**굵은 텍스트** _기울임 텍스트_',
    format: 'markdown'
  }
};

// 플레인 텍스트
const plainBlock = {
  type: 'TEXT',
  content: {
    text: '일반 텍스트입니다.',
    format: 'plain'
  }
};
```

### ImageBlockRenderer

이미지 블록을 처리하는 렌더러입니다.

#### 주요 기능
- 반응형 이미지 (srcset 자동 생성)
- 지연 로딩 (lazy loading)
- CDN 최적화 지원
- 접근성 (alt, title 속성)

**예제:**
```typescript
const imageBlock = {
  type: 'IMAGE',
  content: {
    src: '/images/photo.jpg',
    alt: '풍경 사진',
    caption: '아름다운 자연 풍경',
    link: '/gallery/nature',
    width: 800,
    height: 600,
    loading: 'lazy' // 'eager' | 'lazy'
  }
};
```

### GridBlockRenderer

그리드 레이아웃 블록을 처리하는 렌더러입니다.

#### 주요 기능
- CSS Grid 기반 레이아웃
- 중첩 블록 지원
- 반응형 그리드
- 동적 컬럼 수 조정

**예제:**
```typescript
const gridBlock = {
  type: 'GRID',
  content: {
    columns: 3,
    gap: '16px',
    items: [
      {
        id: 'grid-item-1',
        type: 'TEXT',
        content: { text: '첫 번째 아이템' },
        columnSpan: 1
      },
      {
        id: 'grid-item-2',
        type: 'IMAGE',
        content: { src: '/image1.jpg', alt: '이미지' },
        columnSpan: 2
      }
    ]
  }
};
```

### ButtonBlockRenderer

버튼 블록을 처리하는 렌더러입니다.

#### 버튼 변형
- `primary`: 주요 액션 버튼
- `secondary`: 보조 액션 버튼
- `outline`: 외곽선 버튼
- `ghost`: 투명 버튼
- `destructive`: 위험한 액션 버튼

#### 버튼 크기
- `small`: 작은 버튼
- `medium`: 기본 크기
- `large`: 큰 버튼

**예제:**
```typescript
const buttonBlock = {
  type: 'BUTTON',
  content: {
    text: '지금 시작하기',
    variant: 'primary',
    size: 'large',
    href: '/signup',
    external: false,
    disabled: false,
    fullWidth: false
  }
};
```

### VideoBlockRenderer

비디오 블록을 처리하는 렌더러입니다.

#### 지원 형식
- HTML5 비디오 (mp4, webm, ogg)
- YouTube 임베드
- Vimeo 임베드

**예제:**
```typescript
// HTML5 비디오
const videoBlock = {
  type: 'VIDEO',
  content: {
    src: '/videos/demo.mp4',
    poster: '/videos/demo-poster.jpg',
    controls: true,
    autoplay: false,
    muted: false,
    loop: false,
    width: 800,
    height: 450
  }
};

// YouTube 임베드
const youtubeBlock = {
  type: 'VIDEO',
  content: {
    src: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    autoplay: false,
    controls: true
  }
};
```

### FormBlockRenderer

폼 블록을 처리하는 렌더러입니다.

#### 지원 입력 타입
- `text`, `email`, `password`, `tel`, `url`
- `textarea`, `select`, `radio`, `checkbox`
- `file`, `date`, `number`

**예제:**
```typescript
const formBlock = {
  type: 'FORM',
  content: {
    title: '문의하기',
    method: 'POST',
    action: '/api/contact',
    fields: [
      {
        id: 'name',
        type: 'text',
        label: '이름',
        placeholder: '이름을 입력하세요',
        required: true,
        validation: {
          minLength: 2,
          maxLength: 50
        }
      },
      {
        id: 'email',
        type: 'email',
        label: '이메일',
        required: true,
        validation: {
          pattern: '^[^@]+@[^@]+\\.[^@]+$'
        }
      },
      {
        id: 'message',
        type: 'textarea',
        label: '메시지',
        rows: 5,
        required: true
      }
    ],
    submitText: '전송하기',
    successMessage: '문의가 성공적으로 전송되었습니다.',
    errorMessage: '전송 중 오류가 발생했습니다.'
  }
};
```

---

## 유틸리티 함수

### `safeRenderBlock(block: any, options?: BlockRenderingOptions): RenderingResult`

에러 처리가 포함된 안전한 블록 렌더링 함수입니다.

**매개변수:**
- `block`: any - 렌더링할 블록 (타입 검증 포함)
- `options`: BlockRenderingOptions - 렌더링 옵션

**옵션:**
```typescript
interface BlockRenderingOptions {
  sanitize?: boolean;        // HTML 새니타이징 활성화
  allowScripts?: boolean;    // 스크립트 태그 허용
  allowStyles?: boolean;     // 스타일 태그 허용
  performance?: boolean;     // 성능 모니터링 활성화
  fallbackOnError?: boolean; // 에러 시 폴백 HTML 생성
}
```

**반환값:**
```typescript
interface RenderingResult {
  html: string;
  success: boolean;
  error?: string;
  renderTime?: number;
}
```

**예제:**
```typescript
const result = safeRenderBlock(suspiciousBlock, {
  sanitize: true,
  fallbackOnError: true,
  performance: true
});

if (result.success) {
  console.log('렌더링 성공:', result.html);
  console.log('렌더링 시간:', result.renderTime, 'ms');
} else {
  console.error('렌더링 실패:', result.error);
  // 폴백 HTML이 반환됨
}
```

### `safeRenderBlocks(blocks: any[], options?: BlockRenderingOptions)`

여러 블록을 안전하게 렌더링하는 함수입니다.

**반환값:**
```typescript
{
  html: string;
  results: RenderingResult[];
  stats: {
    total: number;
    successful: number;
    failed: number;
    totalRenderTime: number;
  };
}
```

**예제:**
```typescript
const result = safeRenderBlocks(mixedBlocks, {
  sanitize: true,
  fallbackOnError: true
});

console.log('전체 블록:', result.stats.total);
console.log('성공한 블록:', result.stats.successful);
console.log('실패한 블록:', result.stats.failed);
console.log('총 렌더링 시간:', result.stats.totalRenderTime, 'ms');
```

### `checkRenderersHealth()`

모든 렌더러의 상태를 확인합니다.

**반환값:**
```typescript
{
  [rendererType: string]: {
    cached: boolean;
    canInstantiate: boolean;
    error?: string;
  };
}
```

**예제:**
```typescript
const health = checkRenderersHealth();

Object.entries(health).forEach(([type, status]) => {
  if (!status.canInstantiate) {
    console.error(`${type} 렌더러 문제:`, status.error);
  }
});
```

### `benchmarkRenderers(sampleBlocks, iterations?)`

렌더러 성능 벤치마크를 실행합니다.

**예제:**
```typescript
const sampleBlocks = {
  'TEXT': { type: 'TEXT', content: { text: 'Hello' } },
  'IMAGE': { type: 'IMAGE', content: { src: '/test.jpg' } },
  'GRID': { type: 'GRID', content: { columns: 2, items: [] } }
};

const benchmark = await benchmarkRenderers(sampleBlocks, 50);

Object.entries(benchmark).forEach(([type, stats]) => {
  console.log(`${type}: 평균 ${stats.averageTime.toFixed(2)}ms`);
});
```

---

## 성능 모니터링

### RenderingPerformanceMonitor 클래스

실시간 성능 모니터링을 제공하는 클래스입니다.

#### `recordRenderTime(blockType: string, renderTime: number)`

렌더링 시간을 기록합니다.

**예제:**
```typescript
const start = performance.now();
const html = BlockRendererFactory.renderToHTML(block);
const renderTime = performance.now() - start;

RenderingPerformanceMonitor.recordRenderTime(block.type, renderTime);
```

#### `getAverageRenderTime(blockType: string): number`

특정 블록 타입의 평균 렌더링 시간을 반환합니다.

**예제:**
```typescript
const avgTime = RenderingPerformanceMonitor.getAverageRenderTime('TEXT');
console.log('TEXT 블록 평균 렌더링 시간:', avgTime, 'ms');
```

#### `getAllPerformanceStats()`

모든 블록 타입의 성능 통계를 반환합니다.

**예제:**
```typescript
const allStats = RenderingPerformanceMonitor.getAllPerformanceStats();

Object.entries(allStats).forEach(([blockType, stats]) => {
  console.log(`${blockType}:`);
  console.log(`  평균: ${stats.averageTime.toFixed(2)}ms`);
  console.log(`  최소: ${stats.minTime.toFixed(2)}ms`);
  console.log(`  최대: ${stats.maxTime.toFixed(2)}ms`);
  console.log(`  샘플 수: ${stats.sampleCount}`);
});
```

---

## 타입 정의

### ContentBlockData

블록 데이터의 기본 인터페이스입니다.

```typescript
interface ContentBlockData {
  id: string;                    // 블록 고유 ID
  type: RendererType;           // 블록 타입
  name: string;                 // 블록 이름 (표시용)
  content: any;                 // 블록별 컨텐츠 데이터
  styles?: { [key: string]: string }; // CSS 스타일
  position?: { x: number; y: number }; // 위치 정보
  metadata?: { [key: string]: any };   // 메타데이터
}
```

### RendererType

지원되는 블록 타입의 유니온 타입입니다.

```typescript
type RendererType =
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
```

### PerformanceStats

성능 통계 데이터의 인터페이스입니다.

```typescript
interface PerformanceStats {
  averageTime: number;  // 평균 렌더링 시간 (ms)
  minTime: number;      // 최소 렌더링 시간 (ms)
  maxTime: number;      // 최대 렌더링 시간 (ms)
  sampleCount: number;  // 샘플 개수
}
```

### RenderingStats

렌더링 통계 데이터의 인터페이스입니다.

```typescript
interface RenderingStats {
  totalBlocks: number;                          // 총 블록 수
  blockTypeDistribution: { [key: string]: number }; // 블록 타입별 분포
  validBlocks: number;                          // 유효한 블록 수
  invalidBlocks: number;                        // 무효한 블록 수
  supportedTypes: number;                       // 지원되는 타입 수
  unsupportedTypes: number;                     // 지원되지 않는 타입 수
}
```

---

## 사용 예제

### 기본 사용법

#### 1. 단일 블록 렌더링
```typescript
import { BlockRendererFactory } from '@/lib/webbuilder/renderers';

// 텍스트 블록 렌더링
const textBlock = {
  id: 'intro-text',
  type: 'TEXT',
  name: '소개 텍스트',
  content: {
    text: '**안녕하세요!** 웹빌더에 오신 것을 환영합니다.',
    format: 'markdown'
  },
  styles: {
    fontSize: '18px',
    color: '#333',
    textAlign: 'center'
  }
};

const html = BlockRendererFactory.renderToHTML(textBlock);
console.log(html);
```

#### 2. Next.js 페이지에서 사용
```typescript
// pages/content/[id].tsx
import { BlockRendererFactory } from '@/lib/webbuilder/renderers';
import { GetServerSideProps } from 'next';

interface ContentPageProps {
  blocks: ContentBlockData[];
}

export default function ContentPage({ blocks }: ContentPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div
        dangerouslySetInnerHTML={{
          __html: BlockRendererFactory.renderBlocksToHTML(blocks)
        }}
      />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  // 데이터베이스에서 블록 데이터 조회
  const blocks = await getContentBlocks(params?.id as string);

  return {
    props: { blocks }
  };
};
```

#### 3. React 컴포넌트에서 사용
```typescript
// components/BlockRenderer.tsx
import { BlockRendererFactory } from '@/lib/webbuilder/renderers';

interface BlockRendererProps {
  block: ContentBlockData;
}

export default function BlockRenderer({ block }: BlockRendererProps) {
  try {
    return BlockRendererFactory.renderToReact(block);
  } catch (error) {
    return (
      <div className="error-block p-4 border border-red-300 bg-red-50">
        <p>블록 렌더링 오류: {error.message}</p>
      </div>
    );
  }
}

// 사용 예제
function ContentEditor({ blocks }: { blocks: ContentBlockData[] }) {
  return (
    <div className="content-editor">
      {blocks.map(block => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}
```

### 고급 사용법

#### 1. 성능 모니터링이 포함된 렌더링
```typescript
import {
  safeRenderBlocks,
  RenderingPerformanceMonitor
} from '@/lib/webbuilder/renderers';

async function renderPageWithMonitoring(blocks: ContentBlockData[]) {
  // 성능 모니터링과 함께 렌더링
  const result = safeRenderBlocks(blocks, {
    performance: true,
    sanitize: true,
    fallbackOnError: true
  });

  // 성능 통계 출력
  console.log('렌더링 통계:', result.stats);

  // 개별 블록 타입별 성능 확인
  const perfStats = RenderingPerformanceMonitor.getAllPerformanceStats();
  Object.entries(perfStats).forEach(([blockType, stats]) => {
    if (stats.averageTime > 10) { // 10ms 이상인 경우 경고
      console.warn(`성능 주의: ${blockType} 블록이 느림 (${stats.averageTime}ms)`);
    }
  });

  return result.html;
}
```

#### 2. 커스텀 에러 핸들링
```typescript
import { BlockRendererFactory } from '@/lib/webbuilder/renderers';

function renderWithCustomErrorHandling(blocks: ContentBlockData[]) {
  const results = blocks.map(block => {
    try {
      const html = BlockRendererFactory.renderToHTML(block);
      return { success: true, html, blockId: block.id };
    } catch (error) {
      // 에러 로깅
      console.error(`블록 렌더링 실패 (${block.id}):`, error);

      // 커스텀 폴백 HTML
      const fallbackHtml = `
        <div class="block-error" data-block-id="${block.id}">
          <h4>콘텐츠를 불러올 수 없습니다</h4>
          <p>잠시 후 다시 시도해주세요.</p>
          <button onclick="retryBlock('${block.id}')">다시 시도</button>
        </div>
      `;

      return { success: false, html: fallbackHtml, blockId: block.id };
    }
  });

  const successfulBlocks = results.filter(r => r.success);
  const failedBlocks = results.filter(r => !r.success);

  console.log(`렌더링 완료: ${successfulBlocks.length}개 성공, ${failedBlocks.length}개 실패`);

  return results.map(r => r.html).join('');
}
```

#### 3. 동적 블록 로딩
```typescript
// hooks/useBlockRenderer.ts
import { useState, useEffect } from 'react';
import { BlockRendererFactory, safeRenderBlock } from '@/lib/webbuilder/renderers';

export function useBlockRenderer(block: ContentBlockData) {
  const [rendered, setRendered] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderBlock = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = safeRenderBlock(block, {
          sanitize: true,
          performance: true
        });

        if (result.success) {
          setRendered(result.html);
        } else {
          setError(result.error || '알 수 없는 오류');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '렌더링 실패');
      } finally {
        setLoading(false);
      }
    };

    renderBlock();
  }, [block]);

  return { rendered, loading, error };
}

// 사용 예제
function DynamicBlock({ block }: { block: ContentBlockData }) {
  const { rendered, loading, error } = useBlockRenderer(block);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
}
```

#### 4. 서버사이드 캐싱
```typescript
// utils/blockCache.ts
import { BlockRendererFactory } from '@/lib/webbuilder/renderers';

class BlockCache {
  private cache = new Map<string, string>();
  private ttl = 5 * 60 * 1000; // 5분 TTL

  generateKey(block: ContentBlockData): string {
    return `${block.type}-${JSON.stringify(block.content)}-${JSON.stringify(block.styles)}`;
  }

  async renderWithCache(block: ContentBlockData): Promise<string> {
    const key = this.generateKey(block);

    // 캐시에서 확인
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // 렌더링 후 캐시에 저장
    const html = BlockRendererFactory.renderToHTML(block);
    this.cache.set(key, html);

    // TTL 설정
    setTimeout(() => {
      this.cache.delete(key);
    }, this.ttl);

    return html;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const blockCache = new BlockCache();
```

---

*이 API 참조 가이드는 웹빌더 블록 렌더링 엔진 v1.0.0 기준으로 작성되었습니다.*