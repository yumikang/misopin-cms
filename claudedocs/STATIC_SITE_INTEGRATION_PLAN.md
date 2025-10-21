# 정적 HTML 홈페이지 → CMS 통합 전략 분석 리포트

**작성일**: 2025-10-16
**목표**: 정적 HTML 사이트를 Next.js CMS 앱에 통합하여 단일 도메인으로 운영
**현재 상태**: 분석 및 계획 수립 단계

---

## 📋 목차

1. [현재 아키텍처 분석](#1-현재-아키텍처-분석)
2. [통합 요구사항 정의](#2-통합-요구사항-정의)
3. [통합 방식 옵션 분석](#3-통합-방식-옵션-분석)
4. [최적 방안 추천](#4-최적-방안-추천)
5. [상세 구현 계획](#5-상세-구현-계획)
6. [마이그레이션 로드맵](#6-마이그레이션-로드맵)
7. [위험 요소 및 대응 방안](#7-위험-요소-및-대응-방안)

---

## 1. 현재 아키텍처 분석

### 1.1 CMS 애플리케이션 (Next.js)

**기술 스택:**
- Next.js 15.5.3 (App Router)
- React 19.1.0
- TypeScript
- Prisma ORM + PostgreSQL
- Standalone 빌드 모드

**배포 구조:**
```
서버: /var/www/misopin-cms/
├── .next/standalone/
│   ├── server.js          # Next.js 서버
│   ├── .next/             # 빌드 파일
│   ├── node_modules/      # 의존성
│   └── public/            # 정적 리소스
└── ...

PM2: localhost:3001 (cluster mode, 2 instances)
Caddy: cms.one-q.xyz → localhost:3001
```

**현재 라우팅:**
- `/` - 기본 홈 (현재 거의 사용 안 함)
- `/admin/*` - CMS 관리자 페이지
  - `/admin/reservations` - 예약 관리
  - `/admin/board` - 게시판 관리
  - `/admin/static-pages` - 정적 페이지 편집
  - `/admin/users` - 사용자 관리
  - 기타...
- `/api/*` - REST API 엔드포인트
- `/login` - 로그인 페이지
- `/webbuilder` - 웹 빌더 (미완성)

**특징:**
- ✅ 관리자 전용 시스템
- ✅ API 우선 설계
- ✅ 데이터베이스 기반
- ❌ 일반 사용자용 프론트엔드 없음

---

### 1.2 정적 HTML 사이트

**위치:** `/var/www/misopin.com/`

**파일 구조:**
```
/var/www/misopin.com/
├── index.html                    # 메인 홈페이지 ⭐
├── about.html                    # 병원 소개
├── calendar-page.html            # 예약 페이지 ⭐
├── board-notice.html             # 공지사항
├── board-event.html              # 이벤트
├── board-detail.html             # 게시글 상세
├── directions.html               # 오시는 길
├── fee-schedule.html             # 진료 안내
├── privacy.html                  # 개인정보처리방침
├── stipulation.html              # 이용약관
│
├── templates/                    # 템플릿 시스템
│   └── master/
│       ├── header.html
│       ├── footer.html
│       ├── mobile-menu.html
│       └── ...
│
├── contents/                     # 진료 항목 콘텐츠
│   └── treatments/
│       ├── acne.html             # 여드름 치료
│       ├── jeomin.html           # 제오민 주사
│       ├── filler.html           # 필러
│       ├── lifting.html          # 리프팅
│       └── ... (10+ 진료 항목)
│
├── css/                          # 스타일시트
│   ├── responsive.css
│   ├── dist-responsive-system.css
│   ├── index-custom.css
│   └── ... (20+ CSS 파일)
│
├── js/                           # JavaScript
│   ├── common.js
│   ├── api-client.js             # CMS API 연동 ⭐
│   ├── cms-integration.js        # CMS 통합 코드 ⭐
│   ├── calendar-dynamic.js       # 예약 기능
│   ├── clinic-info.js
│   └── ... (15+ JS 파일)
│
├── images/                       # 이미지 리소스
├── assets/                       # 기타 리소스
├── board-assets/                 # 게시판 리소스
└── calendar-assets/              # 예약 페이지 리소스
```

**배포 구조:**
```
Caddy: misopin.one-q.xyz:80
├── /api/* → reverse_proxy localhost:3001  (CMS API)
└── /*     → file_server /var/www/misopin.com
```

**특징:**
- ✅ 완전한 HTML/CSS/JS 사이트
- ✅ 템플릿 시스템 사용 (build-pages.js)
- ✅ CMS API 연동 (예약, 게시판, 클리닉 정보)
- ✅ 반응형 디자인
- ✅ SEO 최적화 (정적 HTML)
- ❌ 별도 도메인 운영 (misopin.one-q.xyz)

---

### 1.3 현재 통합 상태

**API 연동 현황:**

정적 사이트는 이미 CMS API를 사용하고 있습니다:

```javascript
// js/api-client.js
const API_BASE_URL = '/api';

// 예약 생성
async function createReservation(data) {
  const response = await fetch(`${API_BASE_URL}/public/reservations`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// 게시판 조회
async function fetchBoardPosts() {
  const response = await fetch(`${API_BASE_URL}/public/board-posts`);
}

// 클리닉 정보 조회
async function fetchClinicInfo() {
  const response = await fetch(`${API_BASE_URL}/public/clinic-info`);
}
```

**Caddy 프록시 설정:**
```caddy
misopin.one-q.xyz:80 {
    # API 요청을 CMS로 프록시 (최우선)
    handle /api/* {
        reverse_proxy localhost:3001
    }

    # 정적 파일 서빙
    root * /var/www/misopin.com
    file_server
}
```

**문제점:**
- ❌ 두 개의 도메인 (cms.one-q.xyz, misopin.one-q.xyz)
- ❌ CORS 설정 필요 (다른 도메인 간 API 호출)
- ❌ 배포 복잡성 (두 곳에 배포)
- ❌ SSL 인증서 2개 필요
- ❌ 캐싱 정책 충돌 가능

---

## 2. 통합 요구사항 정의

### 2.1 기능적 요구사항

#### ✅ 필수 요구사항

1. **단일 도메인 운영**
   - 모든 서비스가 `cms.one-q.xyz` 또는 `misopin.one-q.xyz` 하나로 통합
   - 예: `https://cms.one-q.xyz` → 메인 사이트
   - 예: `https://cms.one-q.xyz/admin` → 관리자

2. **기존 URL 구조 유지**
   - 정적 사이트 URL 변경 최소화
   - SEO 영향 최소화
   - `/about.html`, `/calendar-page.html` 등 유지

3. **CMS 편집 기능 유지**
   - StaticPage 모델로 정적 HTML 편집 가능
   - 실시간 반영
   - 버전 관리

4. **성능 유지**
   - 정적 HTML의 빠른 로딩 속도 유지
   - 이미지 최적화
   - 캐싱 전략

5. **SEO 유지**
   - 메타 태그 유지
   - 정적 HTML 크롤링 가능
   - sitemap.xml, robots.txt

#### 🎯 선택적 요구사항

1. **점진적 React 전환**
   - 일부 페이지만 React로 리팩토링
   - 나머지는 HTML 유지

2. **SSR/SSG 활용**
   - 중요 페이지는 Next.js SSG
   - 동적 콘텐츠는 SSR

3. **통합 인증**
   - 관리자와 일반 사용자 구분
   - 권한 기반 접근 제어

---

### 2.2 기술적 요구사항

1. **호환성**
   - 기존 CSS/JS 리소스 그대로 사용
   - 템플릿 시스템 호환
   - API 연동 유지

2. **배포 간소화**
   - 단일 빌드 파이프라인
   - 단일 PM2 프로세스
   - 자동화된 배포

3. **유지보수성**
   - 명확한 디렉토리 구조
   - 문서화
   - 테스트 가능

---

### 2.3 비기능적 요구사항

1. **성능**
   - 첫 페이지 로딩: < 2초
   - API 응답 시간: < 500ms
   - 이미지 최적화

2. **보안**
   - HTTPS 강제
   - CORS 정책
   - XSS 방지

3. **확장성**
   - 트래픽 증가 대응
   - 새 페이지 추가 용이
   - 기능 확장 가능

---

## 3. 통합 방식 옵션 분석

### 옵션 1: Next.js Rewrites/Redirects (프록시 방식)

**개념:**
- Next.js가 특정 경로를 정적 파일 서버로 프록시
- CMS는 `/admin/*`와 `/api/*`만 처리
- 나머지는 정적 사이트로 전달

**구현 예시:**

```typescript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // 정적 HTML 페이지들
        {
          source: '/',
          destination: '/static/index.html'
        },
        {
          source: '/about.html',
          destination: '/static/about.html'
        },
        {
          source: '/calendar-page.html',
          destination: '/static/calendar-page.html'
        },
        // CSS/JS 리소스
        {
          source: '/css/:path*',
          destination: '/static/css/:path*'
        },
        {
          source: '/js/:path*',
          destination: '/static/js/:path*'
        }
      ]
    };
  }
};
```

**장점:**
- ✅ 구현 간단 (설정만 변경)
- ✅ 기존 HTML 파일 그대로 사용
- ✅ URL 구조 100% 유지
- ✅ 빠른 마이그레이션 (1-2일)

**단점:**
- ❌ Next.js의 이점 활용 못 함 (SSR, SSG, Image Optimization)
- ❌ 여전히 정적 파일 관리 필요
- ❌ 모든 경로를 수동으로 매핑 (50+ 페이지)
- ❌ 성능 개선 제한적

**적합성:** ⭐⭐⭐ (빠른 통합용, 임시 방편)

---

### 옵션 2: Public 디렉토리 통합 (Static Serving)

**개념:**
- 정적 HTML을 `public/` 디렉토리로 이동
- Next.js가 자동으로 서빙
- CMS는 별도 라우팅

**디렉토리 구조:**

```
misopin-cms/
├── app/
│   ├── admin/              # CMS 관리자
│   ├── api/                # API
│   └── ...
│
├── public/
│   ├── index.html          # 메인 홈페이지
│   ├── about.html
│   ├── calendar-page.html
│   ├── css/
│   ├── js/
│   ├── images/
│   └── ...
│
└── ...
```

**구현 예시:**

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate'
          }
        ]
      }
    ];
  }
};
```

**장점:**
- ✅ 구현 매우 간단
- ✅ 별도 설정 불필요
- ✅ Next.js 자동 최적화 (gzip, 캐싱)
- ✅ 단일 배포 파이프라인

**단점:**
- ❌ `/index.html`은 작동하지만 `/`는 Next.js 페이지로 감
- ❌ HTML 파일만 서빙 (Next.js의 이점 활용 못 함)
- ❌ public/ 디렉토리가 비대해짐
- ❌ StaticPage 편집 시 public/ 파일도 수정 필요

**적합성:** ⭐⭐ (임시 방편, 권장 안 함)

---

### 옵션 3: 동적 HTML 서빙 (Custom Route Handler)

**개념:**
- API Route로 HTML 파일을 동적으로 읽어서 반환
- StaticPage 모델과 연동
- CMS 편집 내용 즉시 반영

**구현 예시:**

```typescript
// app/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const STATIC_DIR = path.join(process.cwd(), 'static-site');

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const slug = params.slug?.join('/') || 'index';
  const filePath = path.join(STATIC_DIR, `${slug}.html`);

  try {
    const html = await readFile(filePath, 'utf-8');

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=60, must-revalidate'
      }
    });
  } catch (error) {
    return new NextResponse('Not Found', { status: 404 });
  }
}
```

**장점:**
- ✅ 완전한 제어 가능
- ✅ StaticPage 편집 연동 가능
- ✅ 동적 콘텐츠 삽입 가능
- ✅ 캐싱 전략 자유

**단점:**
- ❌ 성능 오버헤드 (파일 I/O)
- ❌ 복잡한 구현
- ❌ SEO 최적화 추가 작업 필요
- ❌ 리소스 경로 문제 (CSS/JS)

**적합성:** ⭐⭐⭐ (중간 복잡도, CMS 통합 강화)

---

### 옵션 4: 하이브리드 접근 (점진적 React 전환)

**개념:**
- 중요 페이지만 Next.js 페이지로 전환
- 나머지는 정적 HTML 유지
- 점진적 마이그레이션

**페이지별 전략:**

| 페이지 | 전략 | 이유 |
|--------|------|------|
| `/` (index.html) | Next.js SSG | 메인 페이지, SEO 중요 |
| `/about` | Next.js SSR | 동적 콘텐츠 (직원 정보 등) |
| `/calendar-page` | Next.js SSR | 예약 기능, API 연동 필수 |
| `/board/*` | Next.js SSR | 게시판, DB 연동 |
| `/contents/treatments/*` | 정적 HTML | 변경 적음, SEO 유지 |
| `/privacy`, `/stipulation` | 정적 HTML | 거의 변경 없음 |

**구현 예시:**

```typescript
// app/page.tsx (메인 페이지를 Next.js로)
export default async function HomePage() {
  const clinicInfo = await fetchClinicInfo();
  const recentPosts = await fetchRecentPosts();

  return (
    <main>
      <Hero clinicInfo={clinicInfo} />
      <Treatments />
      <RecentNews posts={recentPosts} />
    </main>
  );
}

// app/about/page.tsx (병원 소개를 Next.js로)
export default async function AboutPage() {
  const staffInfo = await fetchStaffInfo();

  return (
    <main>
      <AboutHero />
      <StaffList staff={staffInfo} />
    </main>
  );
}
```

**정적 HTML 서빙:**
```typescript
// app/[...staticPage]/route.ts (나머지는 정적 HTML)
const STATIC_PAGES = [
  'privacy',
  'stipulation',
  'fee-schedule',
  'directions',
  'quickmenu'
];

export async function GET(request, { params }) {
  const slug = params.staticPage[0];

  if (STATIC_PAGES.includes(slug)) {
    const html = await readFile(`static-site/${slug}.html`);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  return new NextResponse('Not Found', { status: 404 });
}
```

**장점:**
- ✅ 최고의 유연성
- ✅ 점진적 개선 가능
- ✅ Next.js의 모든 이점 활용
- ✅ SEO 최적화
- ✅ 성능 최적화
- ✅ 장기적으로 최선

**단점:**
- ❌ 초기 개발 시간 많음 (2-4주)
- ❌ HTML → React 컴포넌트 변환 작업
- ❌ CSS 충돌 가능성
- ❌ 복잡한 설계

**적합성:** ⭐⭐⭐⭐⭐ (장기적 최적 방안)

---

### 옵션 5: Middleware 기반 조건부 라우팅

**개념:**
- Next.js Middleware로 요청을 분석
- `/admin/*`, `/api/*` → Next.js 처리
- 나머지 → 정적 HTML 서빙

**구현 예시:**

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const STATIC_DIR = path.join(process.cwd(), 'static-site');

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Admin과 API는 Next.js가 처리
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 정적 HTML 서빙
  try {
    const htmlPath = pathname === '/' ? 'index.html' : `${pathname}.html`;
    const filePath = path.join(STATIC_DIR, htmlPath);
    const html = await readFile(filePath, 'utf-8');

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch {
    // HTML 파일이 없으면 Next.js가 처리
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**장점:**
- ✅ 완전한 제어
- ✅ 동적 결정 가능
- ✅ URL 구조 자유
- ✅ 성능 조절 가능

**단점:**
- ❌ Middleware는 Edge Runtime (제약 많음)
- ❌ 파일 I/O 제한 (Vercel Edge에서 안 됨)
- ❌ 복잡한 로직
- ❌ 디버깅 어려움

**적합성:** ⭐⭐⭐ (고급, 특수 케이스)

---

## 4. 최적 방안 추천

### 🏆 추천: 하이브리드 접근 (옵션 4) + 단계적 전환

**선택 이유:**

1. **장기적 최선**
   - Next.js의 모든 이점 활용 (SSR, SSG, Image Optimization)
   - 점진적 개선 가능
   - 유지보수성 최고

2. **리스크 분산**
   - 한 번에 모든 걸 바꾸지 않음
   - 단계별 검증 가능
   - 롤백 용이

3. **SEO 최적화**
   - 정적 HTML의 SEO 이점 유지
   - 동적 콘텐츠는 SSR로 최적화

4. **성능 우수**
   - 중요 페이지는 Next.js 최적화
   - 나머지는 정적 HTML (빠름)

5. **확장성**
   - 새 기능 추가 용이
   - React 컴포넌트 재사용

---

### 📋 구현 전략

#### Phase 1: 빠른 통합 (1주)

**목표:** 단일 도메인으로 통합, 기능 유지

**방법:** 옵션 3 (동적 HTML 서빙) 임시 사용

1. `static-site/` 디렉토리 생성
2. 정적 HTML 파일 복사
3. Catch-all route 생성 (`app/[...page]/route.ts`)
4. 정적 리소스 서빙 설정
5. 배포 및 테스트

**결과:**
- `cms.one-q.xyz` → CMS 관리자
- `cms.one-q.xyz/admin` → 관리자
- `cms.one-q.xyz/` → 정적 홈페이지
- `cms.one-q.xyz/about.html` → 정적 페이지

---

#### Phase 2: 중요 페이지 React 전환 (2-3주)

**우선순위 페이지:**

1. **메인 페이지 (`/`)**
   ```typescript
   // app/page.tsx
   export default async function HomePage() {
     // SSG로 정적 생성
     const clinicInfo = await fetchClinicInfo();

     return (
       <Layout>
         <Hero />
         <Treatments />
         <CallToAction />
       </Layout>
     );
   }

   export const revalidate = 3600; // 1시간마다 재생성
   ```

2. **예약 페이지 (`/reservation`)**
   ```typescript
   // app/reservation/page.tsx
   'use client';

   export default function ReservationPage() {
     return (
       <Layout>
         <ReservationForm />
         <Calendar />
       </Layout>
     );
   }
   ```

3. **게시판 (`/board/*`)**
   ```typescript
   // app/board/[type]/page.tsx
   export default async function BoardPage({ params }) {
     const posts = await fetchPosts(params.type);

     return (
       <Layout>
         <BoardList posts={posts} />
       </Layout>
     );
   }
   ```

---

#### Phase 3: 나머지 페이지 점진적 전환 (1-2개월)

**전환 순서:**

1. 병원 소개 페이지
2. 진료 항목 페이지 (템플릿화)
3. 오시는 길, 진료 안내
4. 약관 페이지 (마지막)

---

#### Phase 4: 최적화 및 고도화 (지속적)

1. 이미지 최적화 (Next.js Image)
2. 폰트 최적화
3. 코드 스플리팅
4. 캐싱 전략 개선
5. 성능 모니터링

---

## 5. 상세 구현 계획

### 5.1 Phase 1 구현 세부 사항

#### 1. 디렉토리 구조

```
misopin-cms/
├── app/
│   ├── (static)/              # 정적 페이지 그룹
│   │   └── [...page]/
│   │       └── route.ts       # 정적 HTML 서빙
│   │
│   ├── admin/                 # CMS 관리자 (기존)
│   ├── api/                   # API (기존)
│   └── ...
│
├── static-site/               # 정적 HTML 파일들 ⭐ NEW
│   ├── index.html
│   ├── about.html
│   ├── calendar-page.html
│   ├── css/
│   ├── js/
│   ├── images/
│   └── ...
│
├── public/                    # Next.js 정적 리소스
│   ├── favicon.ico
│   └── ...
│
└── ...
```

---

#### 2. Catch-all Route 구현

```typescript
// app/(static)/[...page]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const STATIC_SITE_DIR = path.join(process.cwd(), 'static-site');

// 정적 파일 확장자
const STATIC_EXTENSIONS = ['.html', '.css', '.js', '.jpg', '.png', '.svg', '.woff', '.woff2'];

export async function GET(
  request: NextRequest,
  { params }: { params: { page: string[] } }
) {
  try {
    // URL 경로 구성
    const pagePath = params.page.join('/');
    const urlPath = pagePath || 'index.html';

    // 파일 경로 결정
    let filePath: string;
    let contentType: string;

    // 확장자가 있는지 확인
    const hasExtension = STATIC_EXTENSIONS.some(ext => urlPath.endsWith(ext));

    if (hasExtension) {
      // 직접 파일 지정 (예: about.html, style.css)
      filePath = path.join(STATIC_SITE_DIR, urlPath);
      contentType = getContentType(urlPath);
    } else {
      // 확장자 없으면 .html 추가 (예: about → about.html)
      filePath = path.join(STATIC_SITE_DIR, `${urlPath}.html`);
      contentType = 'text/html; charset=utf-8';
    }

    // 보안: path traversal 방지
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(STATIC_SITE_DIR);

    if (!resolvedPath.startsWith(resolvedBase)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 파일 읽기
    const fileContent = await readFile(resolvedPath);

    // 캐싱 헤더 설정
    const cacheControl = contentType.includes('html')
      ? 'public, max-age=60, must-revalidate'  // HTML: 1분 캐싱
      : 'public, max-age=31536000, immutable';  // 리소스: 1년 캐싱

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });

  } catch (error) {
    console.error('Static file serving error:', error);

    // 404 페이지
    try {
      const notFoundPath = path.join(STATIC_SITE_DIR, '404.html');
      const notFoundHTML = await readFile(notFoundPath, 'utf-8');

      return new NextResponse(notFoundHTML, {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    } catch {
      return new NextResponse('Not Found', { status: 404 });
    }
  }
}

// Content-Type 결정 함수
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}
```

---

#### 3. 라우팅 우선순위 설정

```typescript
// next.config.ts
const nextConfig = {
  // (static) 그룹을 catch-all로 사용
  // 다른 라우트가 먼저 매칭되도록 설정

  async headers() {
    return [
      {
        source: '/:path*.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, must-revalidate'
          }
        ]
      },
      {
        source: '/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/js/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};
```

---

#### 4. 배포 스크립트 업데이트

```bash
# deploy.sh 수정
#!/bin/bash

set -e

echo "================================"
echo "미소핀 CMS 배포 시작 (정적 사이트 포함)"
echo "================================"
echo ""

# 1. 빌드
echo "📦 [1/6] Next.js 빌드 중..."
npm run build
echo "✅ 빌드 완료"
echo ""

# 2. 정적 사이트 복사
echo "📄 [2/6] 정적 사이트 파일 동기화 중..."
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" \
  ../Misopin-renew/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/static-site/
echo "✅ 정적 사이트 동기화 완료"
echo ""

# 3. .next 디렉토리 배포
echo "🚀 [3/6] .next 디렉토리 배포 중..."
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" \
  .next/standalone/.next/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/.next/
echo "✅ .next 디렉토리 배포 완료"
echo ""

# 4. static 파일 배포
echo "🎨 [4/6] static 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  .next/static/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/.next/static/
echo "✅ static 파일 배포 완료"
echo ""

# 5. public 파일 배포
echo "📁 [5/6] public 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  public/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/public/
echo "✅ public 파일 배포 완료"
echo ""

# 6. PM2 재시작
echo "🔄 [6/6] PM2 재시작 중..."
ssh root@cms.one-q.xyz "pm2 restart misopin-cms"
echo "✅ PM2 재시작 완료"
echo ""

echo "================================"
echo "✨ 배포 완료!"
echo "================================"
echo ""
echo "🌐 통합 사이트: https://cms.one-q.xyz"
echo "📊 관리자: https://cms.one-q.xyz/admin"
echo ""
```

---

#### 5. Caddy 설정 변경

```caddy
# Caddyfile

# 기존: misopin.one-q.xyz 제거
# 새로운: cms.one-q.xyz로 통합

cms.one-q.xyz {
    reverse_proxy localhost:3001

    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }

    encode gzip

    log {
        output file /var/log/caddy/misopin-cms.log
    }
}

# 리다이렉트: misopin.one-q.xyz → cms.one-q.xyz
misopin.one-q.xyz {
    redir https://cms.one-q.xyz{uri} permanent
}
```

---

### 5.2 Phase 2 구현 세부 사항

#### 1. 메인 페이지 React 전환

```typescript
// app/page.tsx
import { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import Treatments from '@/components/home/Treatments';
import BoardPreview from '@/components/home/BoardPreview';
import CallToAction from '@/components/home/CallToAction';

export const metadata: Metadata = {
  title: '미소핀의원 - 피부과 전문의',
  description: '미소핀의원은 피부과 전문의가 직접 진료하는 피부과입니다.',
  keywords: '미소핀의원, 피부과, 보톡스, 필러, 리프팅',
  openGraph: {
    title: '미소핀의원',
    description: '피부과 전문의 직접 진료',
    images: ['/images/og-image.jpg'],
  },
};

export const revalidate = 3600; // 1시간마다 재생성

export default async function HomePage() {
  // 서버 컴포넌트에서 데이터 페칭
  const [clinicInfo, recentPosts] = await Promise.all([
    fetchClinicInfo(),
    fetchRecentPosts({ limit: 3 })
  ]);

  return (
    <main>
      <Hero clinicInfo={clinicInfo} />
      <Treatments />
      <BoardPreview posts={recentPosts} />
      <CallToAction />
    </main>
  );
}

// 데이터 페칭 함수
async function fetchClinicInfo() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/clinic-info`, {
    next: { revalidate: 3600 }
  });
  return response.json();
}

async function fetchRecentPosts({ limit }: { limit: number }) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/public/board-posts?limit=${limit}`,
    { next: { revalidate: 300 } }
  );
  return response.json();
}
```

---

#### 2. 레이아웃 컴포넌트 생성

```typescript
// components/layout/Layout.tsx
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <MobileMenu />
    </>
  );
}
```

```typescript
// components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="logo">
          <img src="/images/logo.png" alt="미소핀의원" />
        </Link>

        <nav className="nav">
          <Link href="/about">병원 소개</Link>
          <Link href="/treatments">진료 항목</Link>
          <Link href="/board/notice">공지사항</Link>
          <Link href="/reservation">예약하기</Link>
        </nav>

        <button
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
```

---

#### 3. 기존 CSS 통합

```typescript
// app/layout.tsx
import '@/static-site/css/responsive.css';
import '@/static-site/css/dist-responsive-system.css';
import '@/static-site/css/index-custom.css';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

---

## 6. 마이그레이션 로드맵

### Timeline

```
Week 1: Phase 1 (빠른 통합)
├── Day 1-2: 환경 설정 및 디렉토리 구조
├── Day 3-4: Catch-all route 구현 및 테스트
└── Day 5: 배포 및 검증

Week 2-3: Phase 2 (메인 페이지 전환)
├── Week 2: 레이아웃 및 공통 컴포넌트
└── Week 3: 메인 페이지 React 전환

Week 4-6: Phase 2 (예약/게시판 전환)
├── Week 4: 예약 페이지
├── Week 5: 게시판 목록/상세
└── Week 6: 테스트 및 최적화

Month 2-3: Phase 3 (나머지 페이지)
├── 병원 소개
├── 진료 항목 (템플릿)
├── 약관 페이지
└── 최종 검증

Month 3+: Phase 4 (최적화)
├── 성능 최적화
├── SEO 개선
└── 모니터링
```

---

### 체크리스트

#### Phase 1 완료 조건
- [ ] `static-site/` 디렉토리에 모든 HTML 파일 복사
- [ ] Catch-all route 동작 확인
- [ ] 모든 정적 리소스 (CSS/JS/이미지) 로딩 확인
- [ ] API 연동 정상 작동
- [ ] 예약 기능 정상 작동
- [ ] 게시판 정상 표시
- [ ] 모바일 반응형 정상
- [ ] Caddy 리다이렉트 설정
- [ ] HTTPS 인증서 확인
- [ ] 프로덕션 배포 및 검증

#### Phase 2 완료 조건
- [ ] 메인 페이지 React 전환
- [ ] 레이아웃 컴포넌트 완성
- [ ] CSS 충돌 해결
- [ ] SEO 메타태그 설정
- [ ] 성능 측정 (Lighthouse 90+)
- [ ] 예약 페이지 React 전환
- [ ] 게시판 React 전환
- [ ] 크로스 브라우저 테스트

---

## 7. 위험 요소 및 대응 방안

### 7.1 기술적 위험

#### 🔴 높은 위험: CSS 충돌

**문제:**
- 정적 사이트의 글로벌 CSS
- Next.js의 CSS Modules
- 두 시스템이 충돌 가능

**대응:**
1. CSS 네임스페이스 분리
```css
/* 정적 사이트 CSS */
.static-site .header { ... }

/* Next.js CSS */
.react-app .header { ... }
```

2. CSS-in-JS 고려 (Styled Components, Emotion)
3. 단계적 마이그레이션 (한 번에 하나씩)

---

#### 🟡 중간 위험: URL 구조 변경

**문제:**
- `.html` 확장자 제거 시 SEO 영향
- 기존 링크 깨짐

**대응:**
1. Redirect 설정
```typescript
// next.config.ts
async redirects() {
  return [
    {
      source: '/about.html',
      destination: '/about',
      permanent: true
    }
  ];
}
```

2. Canonical URL 설정
```typescript
<link rel="canonical" href="https://cms.one-q.xyz/about" />
```

---

#### 🟢 낮은 위험: 성능 저하

**문제:**
- 정적 HTML → 동적 서빙 시 성능 저하 우려

**대응:**
1. 적극적인 캐싱
```typescript
export const revalidate = 3600; // ISR
```

2. CDN 활용 (CloudFlare)
3. Next.js Image Optimization

---

### 7.2 운영 위험

#### 🔴 높은 위험: 다운타임

**대응:**
1. Blue-Green 배포
2. Health Check 엔드포인트
3. 롤백 계획

---

#### 🟡 중간 위험: SEO 영향

**대응:**
1. Google Search Console 모니터링
2. 301 Redirect 적극 활용
3. Sitemap 업데이트

---

## 8. 예상 비용 및 시간

| Phase | 작업 시간 | 복잡도 | 우선순위 |
|-------|----------|--------|----------|
| Phase 1: 빠른 통합 | 3-5일 | 낮음 | 🔴 긴급 |
| Phase 2: 중요 페이지 | 2-3주 | 중간 | 🟡 중요 |
| Phase 3: 나머지 페이지 | 1-2개월 | 중간 | 🟢 일반 |
| Phase 4: 최적화 | 지속적 | 낮음 | 🟢 일반 |

---

## 9. 결론 및 다음 단계

### 최종 추천 방안

**단기 (즉시):** Phase 1 실행
- Catch-all route로 정적 HTML 서빙
- 단일 도메인 통합
- 기능 100% 유지

**중기 (1개월):** Phase 2 실행
- 메인 페이지 React 전환
- 예약/게시판 React 전환
- Next.js 이점 활용

**장기 (2-3개월):** Phase 3-4 실행
- 모든 페이지 점진적 전환
- 성능 및 SEO 최적화
- 모니터링 및 개선

---

### 승인 필요 사항

1. **도메인 전략 확정**
   - `cms.one-q.xyz` 사용? 또는 `misopin.one-q.xyz` 사용?

2. **Phase 1 실행 승인**
   - 빠른 통합 시작

3. **Phase 2 범위 확정**
   - 어떤 페이지를 먼저 React로 전환?

---

**다음 단계:**
✅ 승인 후 Phase 1 구현 시작
