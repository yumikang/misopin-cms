# 미소핀의원 정적 페이지 에디터 구현 계획 (간소화 버전)

**작성일**: 2025-10-12
**버전**: 2.0 (Simplified)
**목표**: 간단하고 실용적인 정적 페이지 텍스트/이미지 편집 시스템

---

## 📋 핵심 변경 사항

### 기존 계획의 문제점
- ❌ Handlebars 템플릿 시스템 (45개 템플릿 작성 필요)
- ❌ 전체 HTML 재생성 (비효율적)
- ❌ 복잡한 4단계 Phase
- ❌ 45개 페이지 일괄 파싱

### 개선된 접근 방식
- ✅ **Cheerio 직접 DOM 수정** (템플릿 불필요)
- ✅ **원본 HTML 구조 유지** (스크립트/스타일 보존)
- ✅ **2단계 Phase** (핵심 → 확장)
- ✅ **5-10개 우선 페이지** (점진적 확장)

---

## 1. 아키텍처 설계

### 1.1 간소화된 데이터 플로우

```
[관리자 UI: /admin/pages]
        ↓
[API: PUT /api/static-pages/:slug]
        ↓
[DB: StaticPage (Prisma + Podman PostgreSQL)]
        ↓
[HTML Updater (Cheerio 기반 DOM 조작)]
        ↓
[정적 HTML 파일 저장]
        ↓
[Git commit (선택)]
```

**핵심 차이점**:
- Handlebars 템플릿 제거 → Cheerio로 직접 수정
- 전체 재생성 제거 → 변경된 부분만 업데이트
- 빌드 시스템 제거 → 단순 파일 저장

### 1.2 데이터베이스 모델

```prisma
// prisma/schema.prisma

// 정적 페이지 콘텐츠
model StaticPage {
  id          String   @id @default(cuid())
  slug        String   @unique       // "about", "botox"
  title       String                 // "병원 소개"
  filePath    String                 // "/Users/.../about.html"
  sections    Json                   // 편집 가능한 섹션들
  isPublished Boolean  @default(false)
  lastEdited  DateTime @updatedAt
  createdAt   DateTime @default(now())

  versions    StaticPageVersion[]

  @@map("static_pages")
}

// 버전 관리 (필수)
model StaticPageVersion {
  id         String   @id @default(cuid())
  pageId     String
  version    Int
  sections   Json
  changedBy  String
  changeNote String?
  createdAt  DateTime @default(now())

  page       StaticPage @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@unique([pageId, version])
  @@map("static_page_versions")
}
```

**sections JSON 구조**:

```typescript
// TypeScript 타입 정의
interface Section {
  id: string;                    // "hero-banner", "intro-section"
  type: SectionType;             // "text", "image-background", "text-with-image"
  selector: string;              // "#sub_main_banner", "section.intro-section"
  content: SectionContent;       // 섹션별 콘텐츠
}

type SectionType =
  | 'text'                       // 텍스트만
  | 'image-background'           // 배경 이미지
  | 'text-with-image'            // 텍스트 + 이미지
  | 'contact-info';              // 연락처 정보

interface SectionContent {
  // text, text-with-image
  heading?: string;              // 제목
  subtitle?: string;             // 부제목
  text?: string;                 // 본문 (HTML)

  // image-background
  backgroundImage?: string;      // 배경 이미지 경로
  title?: string;                // 배너 제목
  breadcrumb?: string[];         // 브레드크럼

  // text-with-image
  images?: Array<{
    src: string;
    alt: string;
  }>;

  // contact-info
  phone?: string;
  hours?: Array<{
    day: string;
    time: string;
  }>;
  notice?: string;
  address?: string;
}
```

**실제 예시**:

```json
[
  {
    "id": "hero-banner",
    "type": "image-background",
    "selector": "#sub_main_banner #shSub",
    "content": {
      "backgroundImage": "img/about/about-hero-bg.webp",
      "title": "병원 소개",
      "breadcrumb": ["Home", "미소핀 소개", "병원 소개"]
    }
  },
  {
    "id": "intro-section",
    "type": "text-with-image",
    "selector": "section.intro-section",
    "content": {
      "heading": "미소가 피어나는 곳, MISOPIN CLINIC",
      "subtitle": "여러분의 아름다운 미소를 위해 최선을 다하는 피부과 전문의원입니다.",
      "text": "<p>정확한 진단과 안전한 시술로 고객님의 만족과 신뢰를 최우선으로 생각합니다.</p>",
      "images": [
        {
          "src": "img/about/about18-2.webp",
          "alt": "미소핀의원 내부"
        }
      ]
    }
  }
]
```

---

## 2. 핵심 구현 코드

### 2.1 HTML 업데이트 함수 (Cheerio 기반)

**파일**: `lib/static-pages/html-updater.ts`

```typescript
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { StaticPage } from '@prisma/client';

export class HTMLUpdater {
  private staticDir: string;

  constructor(staticDir = '/Users/blee/Desktop/cms/Misopin-renew') {
    this.staticDir = staticDir;
  }

  /**
   * StaticPage 데이터를 받아 실제 HTML 파일 업데이트
   */
  async updateHTML(page: StaticPage): Promise<string> {
    const fullPath = path.join(this.staticDir, page.filePath);

    // 1. 원본 HTML 읽기
    const html = fs.readFileSync(fullPath, 'utf-8');
    const $ = cheerio.load(html);

    // 2. sections 배열 순회하며 DOM 수정
    const sections = page.sections as Section[];

    for (const section of sections) {
      this.updateSection($, section);
    }

    // 3. 수정된 HTML 저장
    const updatedHTML = $.html();
    fs.writeFileSync(fullPath, updatedHTML, 'utf-8');

    console.log(`✓ HTML 업데이트 완료: ${fullPath}`);
    return fullPath;
  }

  /**
   * 섹션 타입별 DOM 수정
   */
  private updateSection($: cheerio.CheerioAPI, section: Section) {
    const $element = $(section.selector);

    if ($element.length === 0) {
      console.warn(`⚠️ 선택자를 찾을 수 없음: ${section.selector}`);
      return;
    }

    switch (section.type) {
      case 'text':
        this.updateTextSection($element, section.content);
        break;

      case 'image-background':
        this.updateImageBackgroundSection($element, section.content);
        break;

      case 'text-with-image':
        this.updateTextWithImageSection($element, section.content);
        break;

      case 'contact-info':
        this.updateContactInfoSection($element, section.content);
        break;
    }
  }

  /**
   * 텍스트 섹션 업데이트
   */
  private updateTextSection($el: cheerio.Cheerio<any>, content: SectionContent) {
    if (content.heading) {
      const $heading = $el.find('h2, h3').first();
      if ($heading.length > 0) {
        $heading.html(content.heading);
      }
    }

    if (content.subtitle) {
      const $subtitle = $el.find('.section-subtitle, .section_p').first();
      if ($subtitle.length > 0) {
        $subtitle.text(content.subtitle);
      }
    }

    if (content.text) {
      const $text = $el.find('p').not('.section-subtitle, .section_p').first();
      if ($text.length > 0) {
        $text.html(content.text);
      }
    }
  }

  /**
   * 배경 이미지 섹션 업데이트
   */
  private updateImageBackgroundSection($el: cheerio.Cheerio<any>, content: SectionContent) {
    if (content.backgroundImage) {
      const currentStyle = $el.attr('style') || '';
      // background-image 부분만 교체
      const newStyle = currentStyle.replace(
        /background-image:\s*url\(['"]?[^'"]+['"]?\)/i,
        `background-image: url('${content.backgroundImage}')`
      );
      $el.attr('style', newStyle);
    }

    if (content.title) {
      const $title = $el.find('.txt_area > p').first();
      if ($title.length > 0) {
        $title.text(content.title);
      }
    }

    if (content.breadcrumb && content.breadcrumb.length > 0) {
      const $breadcrumb = $el.find('.breadcrumb');
      if ($breadcrumb.length > 0) {
        // 기존 브레드크럼 구조 유지하며 텍스트만 변경
        const $spans = $breadcrumb.find('span');
        content.breadcrumb.forEach((text, index) => {
          if ($spans.eq(index).length > 0) {
            $spans.eq(index).text(text);
          }
        });
      }
    }
  }

  /**
   * 텍스트 + 이미지 섹션 업데이트
   */
  private updateTextWithImageSection($el: cheerio.Cheerio<any>, content: SectionContent) {
    // 텍스트 부분
    this.updateTextSection($el, content);

    // 이미지 부분
    if (content.images && content.images.length > 0) {
      const $img = $el.find('img').first();
      if ($img.length > 0) {
        $img.attr('src', content.images[0].src);
        $img.attr('alt', content.images[0].alt || '');
      }
    }
  }

  /**
   * 연락처 정보 섹션 업데이트
   */
  private updateContactInfoSection($el: cheerio.Cheerio<any>, content: SectionContent) {
    if (content.phone) {
      const $phone = $el.find('.phone_info .number');
      if ($phone.length > 0) {
        $phone.text(content.phone);
      }
    }

    if (content.hours) {
      const $hoursRows = $el.find('.hours_row');
      content.hours.forEach((hour, index) => {
        if ($hoursRows.eq(index).length > 0) {
          $hoursRows.eq(index).find('.day').text(hour.day);
          $hoursRows.eq(index).find('.time').text(hour.time);
        }
      });
    }

    if (content.notice) {
      const $notice = $el.find('.notice');
      if ($notice.length > 0) {
        $notice.text(content.notice);
      }
    }

    if (content.address) {
      const $address = $el.find('.main_info');
      if ($address.length > 0) {
        $address.text(content.address);
      }
    }
  }
}
```

### 2.2 간소화된 HTML 파서

**파일**: `lib/static-pages/html-parser.ts`

```typescript
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

export class HTMLParser {
  private staticDir: string;

  constructor(staticDir = '/Users/blee/Desktop/cms/Misopin-renew') {
    this.staticDir = staticDir;
  }

  /**
   * HTML 파일을 파싱하여 편집 가능한 섹션 추출
   */
  async parseFile(filePath: string): Promise<Section[]> {
    const fullPath = path.join(this.staticDir, filePath);
    const html = fs.readFileSync(fullPath, 'utf-8');
    const $ = cheerio.load(html);

    const sections: Section[] = [];

    // 1. 서브 배너 파싱
    const $subBanner = $('#sub_main_banner #shSub');
    if ($subBanner.length > 0) {
      sections.push({
        id: 'hero-banner',
        type: 'image-background',
        selector: '#sub_main_banner #shSub',
        content: {
          backgroundImage: this.extractBackgroundImage($subBanner.attr('style') || ''),
          title: $subBanner.find('.txt_area > p').text().trim(),
          breadcrumb: $subBanner.find('.breadcrumb span').map((_, el) => $(el).text().trim()).get()
        }
      });
    }

    // 2. 콘텐츠 섹션 파싱
    $('section').each((index, el) => {
      const $section = $(el);
      const classes = $section.attr('class') || '';
      const sectionId = $section.attr('id') || `section-${index}`;

      // 이미지 찾기
      const images = $section.find('img').map((_, img) => ({
        src: $(img).attr('src') || '',
        alt: $(img).attr('alt') || ''
      })).get();

      sections.push({
        id: sectionId,
        type: images.length > 0 ? 'text-with-image' : 'text',
        selector: classes ? `section.${classes.split(' ')[0]}` : `section#${sectionId}`,
        content: {
          heading: $section.find('h2, h3').first().html() || '',
          subtitle: $section.find('.section-subtitle, .section_p').first().text().trim(),
          text: $section.find('p').not('.section-subtitle, .section_p').first().html() || '',
          images: images.length > 0 ? images : undefined
        }
      });
    });

    // 3. 푸터 연락처 파싱
    const $footer = $('footer#sh_ft');
    if ($footer.length > 0) {
      sections.push({
        id: 'footer-contact',
        type: 'contact-info',
        selector: 'footer#sh_ft',
        content: {
          phone: $footer.find('.phone_info .number').text().trim(),
          hours: $footer.find('.hours_row').map((_, row) => ({
            day: $(row).find('.day').text().trim(),
            time: $(row).find('.time').text().trim()
          })).get(),
          notice: $footer.find('.notice').text().trim(),
          address: $footer.find('.main_info').text().trim()
        }
      });
    }

    return sections;
  }

  private extractBackgroundImage(style: string): string {
    const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
    return match ? match[1] : '';
  }
}
```

### 2.3 API 구현

**파일**: `app/api/static-pages/[slug]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireWebBuilderPermission } from '@/lib/auth';

const prisma = new PrismaClient();

// GET: 페이지 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const authResult = await requireWebBuilderPermission(request, ['VIEW_WEBBUILDER']);
  if ('error' in authResult) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  const page = await prisma.staticPage.findUnique({
    where: { slug: params.slug }
  });

  if (!page) {
    return NextResponse.json({ success: false, error: '페이지를 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: page });
}

// PUT: 페이지 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const authResult = await requireWebBuilderPermission(request, ['EDIT_BLOCKS']);
  if ('error' in authResult) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;
  const body = await request.json();

  const currentPage = await prisma.staticPage.findUnique({
    where: { slug: params.slug }
  });

  if (!currentPage) {
    return NextResponse.json({ success: false, error: '페이지를 찾을 수 없습니다' }, { status: 404 });
  }

  // 버전 히스토리 생성
  const latestVersion = await prisma.staticPageVersion.findFirst({
    where: { pageId: currentPage.id },
    orderBy: { version: 'desc' }
  });

  await prisma.staticPageVersion.create({
    data: {
      pageId: currentPage.id,
      version: (latestVersion?.version || 0) + 1,
      sections: body.sections,
      changedBy: user.id,
      changeNote: body.changeNote || '페이지 수정'
    }
  });

  // 페이지 업데이트
  const updatedPage = await prisma.staticPage.update({
    where: { slug: params.slug },
    data: {
      sections: body.sections,
      isPublished: false
    }
  });

  return NextResponse.json({
    success: true,
    data: updatedPage,
    message: '저장되었습니다.'
  });
}
```

**파일**: `app/api/static-pages/[slug]/publish/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireWebBuilderPermission } from '@/lib/auth';
import { HTMLUpdater } from '@/lib/static-pages/html-updater';

const prisma = new PrismaClient();
const updater = new HTMLUpdater();

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const authResult = await requireWebBuilderPermission(request, ['MANAGE_PAGES']);
  if ('error' in authResult) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const page = await prisma.staticPage.findUnique({
      where: { slug: params.slug }
    });

    if (!page) {
      return NextResponse.json({ success: false, error: '페이지를 찾을 수 없습니다' }, { status: 404 });
    }

    // Cheerio로 HTML 업데이트
    const htmlPath = await updater.updateHTML(page);

    // 발행 상태 업데이트
    await prisma.staticPage.update({
      where: { slug: params.slug },
      data: { isPublished: true }
    });

    return NextResponse.json({
      success: true,
      message: '페이지가 발행되었습니다.',
      data: { htmlPath, publishedAt: new Date() }
    });
  } catch (error) {
    console.error('발행 실패:', error);
    return NextResponse.json({
      success: false,
      error: 'HTML 업데이트 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
```

---

## 3. 구현 단계

### Phase 1: 핵심 기능 (3-4일)

#### Day 1: 데이터베이스 세팅
```bash
# Podman PostgreSQL 실행
podman run -d \
  --name misopin-postgres \
  -e POSTGRES_USER=misopin \
  -e POSTGRES_PASSWORD=misopin123 \
  -e POSTGRES_DB=misopin_cms \
  -p 5432:5432 \
  postgres:16-alpine

# 환경 변수 설정
echo 'DATABASE_URL="postgresql://misopin:misopin123@localhost:5432/misopin_cms"' >> .env.local

# Prisma 마이그레이션
npx prisma generate
npx prisma migrate dev --name add_static_pages

# Prisma Studio로 확인
npx prisma studio
```

#### Day 2: 파서 & 시딩
```bash
# 패키지 설치
npm install cheerio

# 파서 구현
# → lib/static-pages/html-parser.ts

# 시딩 스크립트 작성 (5개 페이지만)
# → scripts/seed-static-pages.ts

# 시딩 실행
npx tsx scripts/seed-static-pages.ts
```

**시딩 대상 (우선순위)**:
1. `about.html` - 병원 소개
2. `index.html` - 메인 페이지
3. `dist/botox.html` - 보톡스
4. `dist/filler.html` - 필러
5. `dist/lifting.html` - 리프팅

#### Day 3: HTML 업데이터 & API
```bash
# HTML 업데이터 구현
# → lib/static-pages/html-updater.ts

# API 구현
# → app/api/static-pages/route.ts
# → app/api/static-pages/[slug]/route.ts
# → app/api/static-pages/[slug]/publish/route.ts

# API 테스트 (Postman/Thunder Client)
GET http://localhost:3000/api/static-pages
GET http://localhost:3000/api/static-pages/about
```

#### Day 4: 기본 테스트
```bash
# 텍스트 수정 테스트
PUT http://localhost:3000/api/static-pages/about
Body: { "sections": [...] }

# 발행 테스트
POST http://localhost:3000/api/static-pages/about/publish

# HTML 파일 확인
cat /Users/blee/Desktop/cms/Misopin-renew/about.html
```

---

### Phase 2: UI 구현 (2-3일)

#### Day 5-6: 기존 `/admin/pages` 페이지 수정

**파일**: `app/admin/pages/page.tsx` (기존 파일 수정)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Eye, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  lastEdited: string;
}

export default function StaticPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const response = await fetch('/api/static-pages');
      const data = await response.json();
      if (data.success) {
        setPages(data.data);
      }
    } catch (error) {
      console.error('페이지 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">정적 페이지 관리</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>페이지 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{page.title}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        page.isPublished
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {page.isPublished ? '발행됨' : '수정 중'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    최종 수정: {new Date(page.lastEdited).toLocaleString('ko-KR')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/admin/pages/${page.slug}`)}
                    >
                      <Edit2 size={14} className="mr-1" />
                      편집
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://misopin-renew.vercel.app/${page.slug}.html`, '_blank')}
                    >
                      <Eye size={14} className="mr-1" />
                      미리보기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Day 7: 편집 화면

**파일**: `app/admin/pages/[slug]/page.tsx` (새 파일 생성)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Upload, Eye } from 'lucide-react';
import TipTapEditor from '@/components/webbuilder/TipTapEditor';

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
  isPublished: boolean;
}

interface Section {
  id: string;
  type: string;
  selector: string;
  content: any;
}

export default function StaticPageEditPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      const response = await fetch(`/api/static-pages/${slug}`);
      const data = await response.json();
      if (data.success) {
        setPage(data.data);
      }
    } catch (error) {
      console.error('페이지 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!page) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/static-pages/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: page.sections,
          changeNote: '페이지 수정'
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('저장되었습니다.');
      }
    } catch (error) {
      alert('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('페이지를 발행하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/static-pages/${slug}/publish`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        alert('발행 완료!');
        loadPage();
      }
    } catch (error) {
      alert('발행 실패');
    }
  };

  const handleSectionChange = (sectionId: string, field: string, value: any) => {
    if (!page) return;

    const updatedSections = page.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            content: { ...section.content, [field]: value }
          }
        : section
    );

    setPage({ ...page, sections: updatedSections });
  };

  if (loading || !page) {
    return <div className="container mx-auto p-6">로딩 중...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            저장
          </Button>
          <Button onClick={handlePublish}>
            <Upload size={16} className="mr-2" />
            발행
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {page.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.id}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.type === 'text' && (
                <div className="space-y-4">
                  <div>
                    <Label>제목</Label>
                    <Input
                      value={section.content.heading || ''}
                      onChange={(e) => handleSectionChange(section.id, 'heading', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>본문</Label>
                    <TipTapEditor
                      content={section.content.text || ''}
                      onChange={(html) => handleSectionChange(section.id, 'text', html)}
                    />
                  </div>
                </div>
              )}

              {section.type === 'image-background' && (
                <div className="space-y-4">
                  <div>
                    <Label>배경 이미지 경로</Label>
                    <Input
                      value={section.content.backgroundImage || ''}
                      onChange={(e) => handleSectionChange(section.id, 'backgroundImage', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>제목</Label>
                    <Input
                      value={section.content.title || ''}
                      onChange={(e) => handleSectionChange(section.id, 'title', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {section.type === 'contact-info' && (
                <div className="space-y-4">
                  <div>
                    <Label>전화번호</Label>
                    <Input
                      value={section.content.phone || ''}
                      onChange={(e) => handleSectionChange(section.id, 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>주소</Label>
                    <Input
                      value={section.content.address || ''}
                      onChange={(e) => handleSectionChange(section.id, 'address', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. 우선 개발 페이지 (5개)

### 1. about.html (병원 소개)
**편집 영역**:
- 서브 배너 배경 이미지
- 병원 소개 제목/본문
- 특징 카드 (4개)
- 시설 이미지 슬라이더

### 2. index.html (메인 페이지)
**편집 영역**:
- 메인 배너
- SIGNATURE 섹션
- Happiness 섹션
- 푸터 연락처

### 3. dist/botox.html (보톡스 시술)
**편집 영역**:
- 서브 배너
- 시술 소개
- 시술 효과 리스트
- 시술 과정 (4단계)

### 4. dist/filler.html (필러 시술)
**편집 영역**:
- 서브 배너
- 시술 소개
- 시술 효과
- 시술 과정

### 5. dist/lifting.html (리프팅 시술)
**편집 영역**:
- 서브 배너
- 시술 소개
- 시술 효과
- 시술 과정

---

## 5. 시딩 스크립트

**파일**: `scripts/seed-static-pages.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { HTMLParser } from '../lib/static-pages/html-parser';

const prisma = new PrismaClient();
const parser = new HTMLParser();

async function main() {
  const pages = [
    { slug: 'about', title: '병원 소개', file: 'about.html' },
    { slug: 'index', title: '메인 페이지', file: 'index.html' },
    { slug: 'botox', title: '보톡스', file: 'dist/botox.html' },
    { slug: 'filler', title: '필러', file: 'dist/filler.html' },
    { slug: 'lifting', title: '리프팅', file: 'dist/lifting.html' },
  ];

  for (const page of pages) {
    console.log(`파싱 중: ${page.title}`);

    try {
      const sections = await parser.parseFile(page.file);

      await prisma.staticPage.upsert({
        where: { slug: page.slug },
        update: {
          sections: sections as any,
          lastEdited: new Date()
        },
        create: {
          slug: page.slug,
          title: page.title,
          filePath: page.file,
          sections: sections as any,
          isPublished: true
        }
      });

      console.log(`✓ ${page.title} 완료 (${sections.length}개 섹션)`);
    } catch (error) {
      console.error(`✗ ${page.title} 실패:`, error);
    }
  }

  console.log('\n시딩 완료!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

**실행**:
```bash
npx tsx scripts/seed-static-pages.ts
```

---

## 6. 완료 기준

### Phase 1 완료 체크리스트
- [ ] Podman PostgreSQL 실행 중
- [ ] `static_pages` 테이블 생성됨
- [ ] 5개 페이지 데이터 시딩 완료
- [ ] API 엔드포인트 동작 확인
- [ ] HTML 업데이트 테스트 성공

### Phase 2 완료 체크리스트
- [ ] `/admin/pages` 목록 화면 표시
- [ ] `/admin/pages/about` 편집 화면 표시
- [ ] 텍스트 수정 후 저장 가능
- [ ] 발행 버튼으로 HTML 파일 업데이트
- [ ] 미리보기 정상 작동

---

## 7. 주요 차이점 요약

| 항목 | 기존 계획 | 간소화 계획 |
|------|----------|------------|
| **HTML 생성** | Handlebars 템플릿 45개 | Cheerio DOM 직접 수정 ✅ |
| **복잡도** | 높음 (템플릿 시스템) | 중간 (단순 DOM 조작) ✅ |
| **개발 시간** | 4주 | 1주 (핵심 기능) ✅ |
| **파싱 범위** | 45개 전체 | 5개 우선 ✅ |
| **버전 관리** | 선택 사항 | 필수 포함 ✅ |
| **코드 라인 수** | ~2000줄 | ~800줄 ✅ |

---

## 8. 다음 단계

### 즉시 시작
```bash
# 1. Podman PostgreSQL 실행
podman run -d --name misopin-postgres \
  -e POSTGRES_USER=misopin \
  -e POSTGRES_PASSWORD=misopin123 \
  -e POSTGRES_DB=misopin_cms \
  -p 5432:5432 \
  postgres:16-alpine

# 2. 환경 변수 설정
echo 'DATABASE_URL="postgresql://misopin:misopin123@localhost:5432/misopin_cms"' >> .env.local

# 3. Prisma 마이그레이션
cd /Users/blee/Desktop/cms/misopin-cms
npx prisma generate
npx prisma migrate dev --name add_static_pages

# 4. 패키지 설치
npm install cheerio

# 5. 코드 작성 시작!
```

---

**작성자**: Claude (AI Assistant)
**문서 버전**: 2.0 (Simplified)
**최종 수정**: 2025-10-12
