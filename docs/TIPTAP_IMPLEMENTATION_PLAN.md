# TipTap 기반 정적 페이지 편집 시스템 구현 계획

## 📊 현황 분석

### 기존 시스템 (현재)
- **HTML 파서**: Cheerio 기반 5가지 패턴 파싱
  - Section 태그
  - 콘텐츠 클래스 (.treatment-section, .info-section 등)
  - Container divs (.card, .feature-card 등)
  - 배너 배경 이미지
  - 법률 문서 구조
- **편집 방식**: `<textarea>`에 HTML 태그 직접 노출
- **문제점**:
  - 비직관적 (HTML 태그 수동 관리)
  - `<br>` 태그 등 직접 입력 필요
  - 섹션 구분 불명확

### 대상 페이지 (12개)
```
/Users/blee/Desktop/cms/Misopin-renew/dist/
├── acne.html          (여드름치료)
├── botox.html         (보톡스)
├── diet.html          (다이어트)
├── filler.html        (필러)
├── hair-removal.html  (제모)
├── jeomin.html        (제오민)
├── lifting.html       (리프팅)
├── milia.html         (좁쌀제거)
├── mole.html          (점/티눈)
├── peeling.html       (필링)
├── skinbooster.html   (스킨부스터)
└── tattoo.html        (문신제거)
```

### 데이터베이스 현황
- **PostgreSQL**: 141.164.60.51:5432
- **ORM**: Prisma
- **기존 모델**: `static_pages`, `static_page_versions`
- **환경변수**: `STATIC_PAGES_DIR="../Misopin-renew"`

---

## 🎯 목표 및 범위

### Phase 1 목표: TipTap 기반 편집 시스템 구축
1. ✅ **data-editable 속성 기반 파싱** (기존 파서 대체)
2. ✅ **TipTap 에디터 연동** (WYSIWYG 편집)
3. ✅ **섹션별 그룹핑** (직관적 UI)
4. ✅ **이미지 업로드 개선** (WebP 변환, 미리보기)
5. ✅ **버전 관리 강화** (요소별 변경 추적)

### 포함 사항
- ✅ 텍스트 편집 (제목, 본문, 라벨)
- ✅ 이미지 교체 (메인 이미지, 배경 이미지)
- ✅ 실시간 미리보기
- ✅ 자동 백업 (기존 시스템 활용)
- ✅ 버전 관리 (기존 시스템 확장)

### 제외 사항
- ❌ 드래그 앤 드롭 섹션 이동
- ❌ 새로운 섹션 추가/삭제
- ❌ 레이아웃 변경
- ❌ CSS 수정

---

## 🏗️ 시스템 아키텍처

### 데이터 흐름
```
1. 페이지 로드
   Admin UI → GET /api/static-pages/[id]/editable
   → HTML 파싱 (data-editable 속성) → 편집 가능 요소 반환

2. 편집
   User Input → TipTap Editor → 로컬 State 업데이트

3. 저장
   Save Button → POST /api/static-pages/[id]/update-element
   → HTML 업데이트 → 파일 저장 → 백업 생성 → DB 업데이트

4. 반영
   HTML 파일 업데이트 → 실제 웹사이트 즉시 반영
```

---

## 💾 데이터베이스 설계

### 1. Prisma 스키마 확장

#### static_pages 테이블 (기존 확장)
```prisma
model static_pages {
  id                   String                 @id
  slug                 String                 @unique
  title                String
  filePath             String
  sections             Json

  // 🆕 추가 필드
  editMode             EditMode               @default(PARSER)
  lastParsedAt         DateTime?

  lastEdited           DateTime
  createdAt            DateTime               @default(now())
  static_page_versions static_page_versions[]
  editable_elements    editable_elements[]    // 🆕 추가
}

enum EditMode {
  PARSER      // 기존 HTML 파싱 방식 (현재)
  ATTRIBUTE   // 🆕 data-editable 속성 방식 (TipTap)
}
```

#### editable_elements 테이블 (신규)
```prisma
model editable_elements {
  id           String       @id @default(cuid())
  pageId       String
  elementId    String       // data-editable 속성 값
  elementType  ElementType
  selector     String       // CSS 셀렉터
  label        String       // 사용자에게 보이는 라벨
  currentValue String       @db.Text
  sectionName  String?      // 섹션 구분용
  order        Int          @default(0)

  page         static_pages @relation(fields: [pageId], references: [id], onDelete: Cascade)

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@unique([pageId, elementId])
  @@index([pageId])
  @@index([sectionName])
}

enum ElementType {
  TEXT           // 순수 텍스트
  HTML           // HTML 포함 텍스트 (TipTap 사용)
  IMAGE          // 이미지 src
  BACKGROUND     // 배경 이미지
}
```

#### static_page_versions 테이블 (기존 확장)
```prisma
model static_page_versions {
  id           String       @id
  pageId       String
  version      Int
  sections     Json

  // 🆕 추가 필드
  changeType   String?      // 'element_update', 'bulk_update', 'reparse'
  changedData  Json?        // { elementId, oldValue, newValue }

  changedBy    String
  changeNote   String?
  createdAt    DateTime     @default(now())
  static_pages static_pages @relation(fields: [pageId], references: [id], onDelete: Cascade)
}
```

### 2. 마이그레이션 전략

```sql
-- Phase 1: static_pages 확장
ALTER TABLE "static_pages"
ADD COLUMN "editMode" TEXT DEFAULT 'PARSER',
ADD COLUMN "lastParsedAt" TIMESTAMP;

-- Phase 2: editable_elements 생성
CREATE TABLE "editable_elements" (
  "id" TEXT PRIMARY KEY,
  "pageId" TEXT NOT NULL,
  "elementId" TEXT NOT NULL,
  "elementType" TEXT NOT NULL,
  "selector" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "currentValue" TEXT NOT NULL,
  "sectionName" TEXT,
  "order" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("pageId") REFERENCES "static_pages"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "editable_elements_pageId_elementId_key"
ON "editable_elements"("pageId", "elementId");

CREATE INDEX "editable_elements_pageId_idx" ON "editable_elements"("pageId");
CREATE INDEX "editable_elements_sectionName_idx" ON "editable_elements"("sectionName");

-- Phase 3: static_page_versions 확장
ALTER TABLE "static_page_versions"
ADD COLUMN "changeType" TEXT,
ADD COLUMN "changedData" JSONB;
```

---

## 🔧 기술 스택

### 프론트엔드 추가 패키지
```json
{
  "@tiptap/react": "^2.1.0",
  "@tiptap/starter-kit": "^2.1.0",
  "@tiptap/extension-placeholder": "^2.1.0",
  "isomorphic-dompurify": "^2.0.0"
}
```

### 백엔드 (기존 유지)
- Cheerio (HTML 파싱)
- Prisma (ORM)
- PostgreSQL (DB)
- Sharp (이미지 최적화 - 기존)

---

## 📦 구현 상세

### 1. HTML 마킹 규칙

#### 편집 가능 영역 표시
```html
<!-- 텍스트 요소 -->
<div class="first-section-label"
     data-editable="section-0-label"
     data-section="first-section">
    MISOPIN ACNE
</div>

<!-- HTML 포함 텍스트 -->
<h2 class="heading-main"
    style="color: #9F988C;"
    data-editable="section-0-title"
    data-section="first-section">
    착! 가라앉는 여드름
</h2>

<!-- 줄바꿈 포함 설명 -->
<p class="text-lead"
   data-editable="section-0-description"
   data-section="first-section">
    피부 속 염증·피지선·각질층의 균형을 회복해<br>
    원인부터 개선하는 구조적 접근을 지향합니다
</p>

<!-- 이미지 -->
<img src="../images/acne/blog6_cd02.webp"
     alt="여드름 치료 시술"
     data-editable="section-0-image"
     data-section="first-section">

<!-- 배경 이미지 (자동 감지) -->
<div id="shSub"
     class="sub-banner"
     style="background-image: url('../images/acne/acne-01.webp');">
</div>
```

#### 네이밍 규칙
```
형식: {section}-{type}-{index}

예시:
- section-0-label         (첫 번째 섹션 라벨)
- section-0-title         (첫 번째 섹션 제목)
- section-0-description   (첫 번째 섹션 설명)
- section-0-image         (첫 번째 섹션 이미지)
- section-1-step-1-title  (두 번째 섹션, 첫 번째 단계 제목)
- banner-background       (배너 배경)
```

### 2. 파서 로직

#### lib/static-pages/attribute-parser.ts (신규)
```typescript
import * as cheerio from 'cheerio';

export interface EditableElement {
  id: string;              // "section-0-title"
  type: 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND';
  selector: string;        // "[data-editable='section-0-title']"
  currentValue: string;    // 현재 값
  label: string;           // "제목"
  sectionName: string;     // "first-section"
  order: number;           // 순서
}

export function parseEditableAttributes(html: string): EditableElement[] {
  const $ = cheerio.load(html, { decodeEntities: false });
  const elements: EditableElement[] = [];
  let order = 0;

  // 1. data-editable 속성 기반 추출
  $('[data-editable]').each((i, elem) => {
    const $elem = $(elem);
    const id = $elem.attr('data-editable')!;
    const section = $elem.attr('data-section') || 'default';

    // 타입 결정
    let type: 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND';
    let currentValue: string;

    if ($elem.is('img')) {
      type = 'IMAGE';
      currentValue = $elem.attr('src') || '';
    } else if ($elem.find('br, strong, em, a').length > 0) {
      type = 'HTML';
      currentValue = $elem.html() || '';
    } else {
      type = 'TEXT';
      currentValue = $elem.text() || '';
    }

    elements.push({
      id,
      type,
      selector: `[data-editable="${id}"]`,
      currentValue,
      label: generateLabel($elem, id),
      sectionName: section,
      order: order++,
    });
  });

  // 2. 배경 이미지 자동 감지
  $('[style*="background-image"]').each((i, elem) => {
    const $elem = $(elem);
    if ($elem.attr('data-editable')) return; // 이미 처리됨

    const style = $elem.attr('style') || '';
    const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);

    if (match) {
      const id = `bg-${$elem.attr('id') || $elem.attr('class')?.split(' ')[0] || `auto-${i}`}`;

      elements.push({
        id,
        type: 'BACKGROUND',
        selector: generateUniqueSelector($elem),
        currentValue: match[1],
        label: `배경 이미지 (${$elem.attr('id') || $elem.attr('class') || 'unnamed'})`,
        sectionName: findParentSection($elem),
        order: order++,
      });
    }
  });

  return elements;
}

function generateLabel($elem: cheerio.Cheerio, id: string): string {
  // id에서 레이블 생성
  const parts = id.split('-');
  const type = parts[parts.length - 1];

  const labelMap: Record<string, string> = {
    'label': '라벨',
    'title': '제목',
    'description': '설명',
    'image': '이미지',
    'text': '텍스트',
  };

  return labelMap[type] || type;
}

function generateUniqueSelector($elem: cheerio.Cheerio): string {
  const id = $elem.attr('id');
  if (id) return `#${id}`;

  const className = $elem.attr('class');
  if (className) {
    const classes = className.trim().split(/\s+/);
    return `.${classes[0]}`;
  }

  return $elem.prop('tagName')?.toLowerCase() || 'div';
}

function findParentSection($elem: cheerio.Cheerio): string {
  const parent = $elem.closest('[data-section]');
  if (parent.length) {
    return parent.attr('data-section') || 'default';
  }
  return 'default';
}
```

#### lib/static-pages/attribute-updater.ts (신규)
```typescript
import * as cheerio from 'cheerio';

export function updateElementByAttribute(
  html: string,
  elementId: string,
  newValue: string,
  elementType: 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND'
): string {
  const $ = cheerio.load(html, {
    decodeEntities: false,
    xmlMode: false
  });

  const $elem = $(`[data-editable="${elementId}"]`);

  if ($elem.length === 0) {
    throw new Error(`Element not found: ${elementId}`);
  }

  switch (elementType) {
    case 'TEXT':
      $elem.text(newValue);
      break;
    case 'HTML':
      $elem.html(newValue);
      break;
    case 'IMAGE':
      $elem.attr('src', newValue);
      break;
    case 'BACKGROUND':
      // 배경 이미지는 별도 함수 사용
      throw new Error('Use updateBackgroundImage for BACKGROUND type');
  }

  return $.html();
}

export function updateBackgroundImage(
  html: string,
  selector: string,
  newImageUrl: string
): string {
  const $ = cheerio.load(html, { decodeEntities: false });
  const $elem = $(selector);

  if ($elem.length === 0) {
    throw new Error(`Element not found: ${selector}`);
  }

  const style = $elem.attr('style') || '';
  const newStyle = style.replace(
    /url\(['"]?[^'")\s]+['"]?\)/,
    `url('${newImageUrl}')`
  );

  $elem.attr('style', newStyle);

  return $.html();
}
```

### 3. API 설계

#### GET /api/static-pages/[id]/editable (신규)
```typescript
// app/api/static-pages/[id]/editable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseEditableAttributes } from '@/lib/static-pages/attribute-parser';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const forceReparse = searchParams.get('forceReparse') === 'true';

  // 페이지 조회
  const page = await prisma.static_pages.findUnique({
    where: { id },
    include: {
      editable_elements: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // 캐시 사용 가능 여부 확인
  const needReparse = forceReparse ||
    !page.lastParsedAt ||
    page.editable_elements.length === 0 ||
    new Date(page.lastEdited) > new Date(page.lastParsedAt);

  let elements = page.editable_elements;

  if (needReparse) {
    // HTML 재파싱
    const fullPath = path.join(
      process.env.STATIC_PAGES_DIR || '../Misopin-renew',
      page.filePath
    );
    const html = fs.readFileSync(fullPath, 'utf-8');
    const parsed = parseEditableAttributes(html);

    // DB 업데이트 (트랜잭션)
    await prisma.$transaction([
      // 기존 요소 삭제
      prisma.editable_elements.deleteMany({
        where: { pageId: id }
      }),
      // 새 요소 추가
      ...parsed.map(elem =>
        prisma.editable_elements.create({
          data: {
            pageId: id,
            elementId: elem.id,
            elementType: elem.type,
            selector: elem.selector,
            label: elem.label,
            currentValue: elem.currentValue,
            sectionName: elem.sectionName,
            order: elem.order,
          }
        })
      ),
      // lastParsedAt 업데이트
      prisma.static_pages.update({
        where: { id },
        data: { lastParsedAt: new Date() }
      })
    ]);

    // 업데이트된 요소 다시 조회
    elements = await prisma.editable_elements.findMany({
      where: { pageId: id },
      orderBy: { order: 'asc' }
    });
  }

  // 섹션별 그룹핑
  const sections: Record<string, any> = {};

  elements.forEach(elem => {
    const sectionName = elem.sectionName || 'default';

    if (!sections[sectionName]) {
      sections[sectionName] = {
        name: sectionName,
        order: Object.keys(sections).length,
        elements: []
      };
    }

    sections[sectionName].elements.push({
      elementId: elem.elementId,
      elementType: elem.elementType,
      label: elem.label,
      currentValue: elem.currentValue,
      order: elem.order
    });
  });

  return NextResponse.json({
    pageId: page.id,
    pageTitle: page.title,
    editMode: page.editMode || 'PARSER',
    sections,
    totalElements: elements.length,
    lastParsedAt: page.lastParsedAt,
  });
}
```

#### POST /api/static-pages/[id]/update-element (신규)
```typescript
// app/api/static-pages/[id]/update-element/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateElementByAttribute, updateBackgroundImage } from '@/lib/static-pages/attribute-updater';
import { HTMLUpdater } from '@/lib/static-pages/html-updater';
import path from 'path';
import fs from 'fs';

const STATIC_SITE_PATH = process.env.STATIC_PAGES_DIR || path.join(process.cwd(), '../Misopin-renew');
const htmlUpdater = new HTMLUpdater(STATIC_SITE_PATH);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { elementId, newValue, elementType } = body;

  // 페이지 및 요소 조회
  const page = await prisma.static_pages.findUnique({
    where: { id }
  });

  const element = await prisma.editable_elements.findUnique({
    where: {
      pageId_elementId: {
        pageId: id,
        elementId
      }
    }
  });

  if (!page || !element) {
    return NextResponse.json({ error: 'Page or element not found' }, { status: 404 });
  }

  // HTML 파일 읽기
  const fullPath = path.join(STATIC_SITE_PATH, page.filePath);
  let html = fs.readFileSync(fullPath, 'utf-8');

  // 백업 생성 (기존 시스템 활용)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = fullPath.replace('.html', `.backup-${timestamp}.html`);
  fs.copyFileSync(fullPath, backupPath);

  // HTML 업데이트
  try {
    if (elementType === 'BACKGROUND') {
      html = updateBackgroundImage(html, element.selector, newValue);
    } else {
      html = updateElementByAttribute(html, elementId, newValue, elementType);
    }

    // 파일 저장
    fs.writeFileSync(fullPath, html, 'utf-8');

    // DB 업데이트 (트랜잭션)
    const latestVersion = await prisma.static_page_versions.findFirst({
      where: { pageId: id },
      orderBy: { version: 'desc' }
    });

    const newVersion = (latestVersion?.version || 0) + 1;

    await prisma.$transaction([
      // EditableElement 업데이트
      prisma.editable_elements.update({
        where: {
          pageId_elementId: {
            pageId: id,
            elementId
          }
        },
        data: {
          currentValue: newValue,
          updatedAt: new Date()
        }
      }),
      // StaticPage 업데이트
      prisma.static_pages.update({
        where: { id },
        data: { lastEdited: new Date() }
      }),
      // Version 생성
      prisma.static_page_versions.create({
        data: {
          id: crypto.randomUUID(),
          pageId: id,
          version: newVersion,
          sections: {}, // 기존 호환성 유지
          changeType: 'element_update',
          changedData: {
            elementId,
            oldValue: element.currentValue,
            newValue,
            elementType
          },
          changedBy: 'admin', // TODO: 실제 사용자
          changeNote: `${element.label} 수정`
        }
      })
    ]);

    // 오래된 백업 정리 (최근 20개 유지)
    await htmlUpdater.cleanupOldBackups(fullPath, 20);

    return NextResponse.json({
      success: true,
      message: '성공적으로 업데이트되었습니다.',
      versionNumber: newVersion,
      updatedAt: new Date().toISOString(),
      backupPath
    });

  } catch (error) {
    // 오류 발생 시 백업에서 복원
    fs.copyFileSync(backupPath, fullPath);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Update failed'
    }, { status: 500 });
  }
}
```

---

## 🚀 구현 단계별 계획

### Phase 1: 기반 구축 (1-2일)
**목표**: 데이터베이스 스키마 및 파서 구현

**작업**:
1. ✅ Prisma 스키마 업데이트
   - EditMode enum 추가
   - editable_elements 모델 추가
   - static_pages, static_page_versions 확장
2. ✅ 마이그레이션 실행
3. ✅ attribute-parser.ts 구현
4. ✅ attribute-updater.ts 구현
5. ✅ 단위 테스트 작성

**완료 기준**:
- 마이그레이션 성공
- 파서 단위 테스트 통과

### Phase 2: API 구현 (1-2일)
**목표**: 백엔드 API 완성

**작업**:
1. ✅ GET /api/static-pages/[id]/editable 구현
2. ✅ POST /api/static-pages/[id]/update-element 구현
3. ✅ POST /api/static-pages/[id]/reparse 구현
4. ✅ 기존 이미지 업로드 API와 통합
5. ✅ API 테스트

**완료 기준**:
- 모든 API 엔드포인트 정상 작동
- Postman/Insomnia 테스트 통과

### Phase 3: TipTap 컴포넌트 (2일)
**목표**: 프론트엔드 에디터 컴포넌트 구현

**작업**:
1. ✅ TipTap 패키지 설치
2. ✅ EditableTextField 컴포넌트
3. ✅ EditableHtmlField 컴포넌트 (TipTap)
4. ✅ EditableImageField 컴포넌트
5. ✅ EditableSectionGroup 컴포넌트

**완료 기준**:
- TipTap 에디터 정상 작동
- 모든 타입 편집 가능

### Phase 4: UI 통합 (1-2일)
**목표**: 관리자 페이지 UI 완성

**작업**:
1. ✅ app/admin/static-pages/[id]/edit/page.tsx 생성
2. ✅ 섹션별 그룹핑 UI
3. ✅ 저장/취소 버튼
4. ✅ 로딩/에러 상태 처리
5. ✅ 반응형 디자인

**완료 기준**:
- 모든 편집 기능 UI 완성
- UX 검증

### Phase 5: HTML 마킹 (1일)
**목표**: 기존 HTML 파일에 data-editable 속성 추가

**작업**:
1. ✅ acne.html 마킹 (템플릿)
2. ✅ 자동 마킹 스크립트 작성
3. ✅ 나머지 11개 페이지 일괄 마킹
4. ✅ 파서 테스트

**완료 기준**:
- 12개 페이지 모두 마킹 완료
- 파서로 정상 추출 확인

### Phase 6: 테스트 및 배포 (1일)
**목표**: 통합 테스트 및 프로덕션 배포

**작업**:
1. ✅ 통합 테스트
2. ✅ 성능 최적화
3. ✅ 사용자 가이드 작성
4. ✅ 프로덕션 배포

**완료 기준**:
- 모든 테스트 통과
- 프로덕션 정상 작동

---

## ⚠️ 주의사항

### 1. 기존 시스템과의 호환성
- `editMode` 필드로 기존 PARSER 방식과 신규 ATTRIBUTE 방식 병행 지원
- 기존 페이지는 PARSER 모드 유지
- 신규 페이지만 ATTRIBUTE 모드 적용

### 2. 백업 시스템
- 기존 HTMLUpdater의 백업 시스템 그대로 활용
- 모든 변경 전 자동 백업 생성
- 최근 20개 백업 유지

### 3. 버전 관리
- 기존 static_page_versions 구조 유지
- changeType, changedData 필드로 요소별 변경 추적 강화

### 4. 보안
- HTML Sanitization (DOMPurify)
- 입력 길이 제한
- XSS 방어

---

## 📊 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 편집 소요 시간 | 5분 | 1분 |
| HTML 지식 필요 | 필수 | 불필요 |
| 오류율 | 10% | <2% |
| 사용자 만족도 | N/A | 4.5/5 |

---

## 📅 일정

| Phase | 작업 내용 | 소요 시간 | 시작일 | 완료일 |
|-------|----------|----------|--------|--------|
| Phase 1 | 기반 구축 | 1-2일 | TBD | TBD |
| Phase 2 | API 구현 | 1-2일 | TBD | TBD |
| Phase 3 | TipTap 컴포넌트 | 2일 | TBD | TBD |
| Phase 4 | UI 통합 | 1-2일 | TBD | TBD |
| Phase 5 | HTML 마킹 | 1일 | TBD | TBD |
| Phase 6 | 테스트/배포 | 1일 | TBD | TBD |
| **총계** | | **7-10일** | | |

---

## ✅ 다음 단계

1. ✅ 계획 검토 및 승인
2. Phase 1 시작: Prisma 스키마 업데이트
3. 마이그레이션 실행
4. 파서 구현 및 테스트

---

**작성일**: 2025-10-29
**작성자**: Claude Code
**버전**: 1.0
