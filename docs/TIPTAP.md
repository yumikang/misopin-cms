# PRD: TipTap 기반 정적 페이지 편집 시스템

## 📋 문서 정보
- **프로젝트명**: 미소핀 CMS - 정적 페이지 편집 시스템 개선
- **작성일**: 2025-10-29
- **버전**: 1.0
- **작성자**: Leo (CodeBee)

---

## 🎯 1. 프로젝트 개요

### 1.1 배경
현재 미소핀 CMS는 HTML 파싱 방식으로 정적 페이지를 관리하고 있으나, 다음과 같은 문제점이 있음:
- HTML 태그가 그대로 노출되어 직관성이 떨어짐
- 텍스트 수정 시 `<br>` 태그 등을 수동으로 관리해야 함
- 섹션 구분이 불명확하여 원하는 내용 찾기 어려움
- 이미지 교체 프로세스가 번거로움

### 1.2 목표
TipTap 에디터를 활용하여 직관적이고 사용하기 쉬운 정적 페이지 편집 시스템 구축

### 1.3 범위
**포함 사항**
- 텍스트 편집 (제목, 본문, 라벨 등)
- 이미지 교체 (메인 이미지, 배경 이미지)
- 편집 가능 영역 자동 추출
- 실시간 미리보기
- 자동 백업 및 버전 관리

**제외 사항**
- 드래그 앤 드롭 섹션 이동
- 새로운 섹션 추가/삭제
- 레이아웃 변경
- CSS 수정

---

## 🏗️ 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────┐
│   CMS Admin     │
│   (Next.js)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────┐
│   TipTap        │←────→│  API Routes  │
│   Editor        │      │  (Next.js)   │
└─────────────────┘      └──────┬───────┘
                                │
                                ↓
                         ┌──────────────┐
                         │  PostgreSQL  │
                         │  (Prisma)    │
                         └──────┬───────┘
                                │
                                ↓
                         ┌──────────────┐
                         │  HTML Files  │
                         │  (/dist)     │
                         └──────────────┘
```

### 2.2 데이터 흐름

```
1. 페이지 로드
   Admin UI → GET /api/static-pages/[id]/editable
   → HTML 파싱 → 편집 가능 요소 반환

2. 편집
   User Input → TipTap Editor → 로컬 State 업데이트

3. 저장
   Save Button → POST /api/static-pages/[id]/update-element
   → HTML 업데이트 → 파일 저장 → 백업 생성

4. 반영
   HTML 파일 업데이트 → 실제 웹사이트 즉시 반영
```

---

## 💾 3. 데이터베이스 설계

### 3.1 스키마 변경

#### 3.1.1 StaticPage 테이블 (기존 확장)

```prisma
model StaticPage {
  id              String                @id @default(cuid())
  title           String
  path            String                @unique
  htmlContent     String                @db.Text
  
  // 🆕 추가 필드
  editMode        EditMode              @default(PARSER)
  lastParsedAt    DateTime?
  
  sections        StaticPageSection[]
  versions        StaticPageVersion[]
  editableElements EditableElement[]    // 🆕 추가
  
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
}

enum EditMode {
  PARSER      // 기존 HTML 파싱 방식
  ATTRIBUTE   // 🆕 data-editable 속성 방식 (TipTap)
}
```

#### 3.1.2 EditableElement 테이블 (신규)

```prisma
model EditableElement {
  id           String     @id @default(cuid())
  pageId       String
  elementId    String     // data-editable 속성 값
  elementType  ElementType
  selector     String     // CSS 셀렉터
  label        String     // 사용자에게 보이는 라벨
  currentValue String     @db.Text
  sectionName  String?    // 섹션 구분용 (예: "first-section", "banner-section")
  order        Int        @default(0)
  
  page         StaticPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
  
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
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

#### 3.1.3 StaticPageVersion 테이블 (기존 확장)

```prisma
model StaticPageVersion {
  id           String   @id @default(cuid())
  pageId       String
  versionNumber Int     // 버전 번호 (자동 증가)
  changeType   String   // 'element_update', 'bulk_update', 'reparse'
  changedData  Json     // { elementId, oldValue, newValue }
  changedBy    String   // 사용자 ID
  
  page         StaticPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
  
  createdAt    DateTime @default(now())
  
  @@index([pageId])
  @@index([createdAt])
}
```

### 3.2 마이그레이션 전략

```sql
-- Phase 1: 기존 테이블 확장
ALTER TABLE "StaticPage" 
ADD COLUMN "editMode" TEXT DEFAULT 'PARSER',
ADD COLUMN "lastParsedAt" TIMESTAMP;

-- Phase 2: 새 테이블 생성
CREATE TABLE "EditableElement" (
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
  FOREIGN KEY ("pageId") REFERENCES "StaticPage"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "EditableElement_pageId_elementId_key" 
ON "EditableElement"("pageId", "elementId");

-- Phase 3: StaticPageVersion 확장
ALTER TABLE "StaticPageVersion"
ADD COLUMN "versionNumber" INTEGER;

-- 기존 데이터에 버전 번호 부여
WITH numbered AS (
  SELECT id, pageId, 
         ROW_NUMBER() OVER (PARTITION BY pageId ORDER BY createdAt) as vn
  FROM "StaticPageVersion"
)
UPDATE "StaticPageVersion" spv
SET "versionNumber" = numbered.vn
FROM numbered
WHERE spv.id = numbered.id;
```

---

## 🔧 4. 기술 스택

### 4.1 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| **TipTap** | ^2.1.0 | 리치 텍스트 에디터 |
| **@tiptap/react** | ^2.1.0 | React 통합 |
| **@tiptap/starter-kit** | ^2.1.0 | 기본 확장 팩 |
| **Next.js** | 15.5.2 | 프레임워크 (기존) |
| **React** | 18.x | UI 라이브러리 (기존) |
| **TypeScript** | 5.x | 타입 안정성 (기존) |

### 4.2 백엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| **Cheerio** | ^1.0.0 | HTML 파싱 |
| **Prisma** | 5.x | ORM (기존) |
| **PostgreSQL** | 14.x | 데이터베이스 (기존) |

---

## 📦 5. 구현 상세

### 5.1 HTML 마킹 규칙

#### 5.1.1 편집 가능 영역 표시

```html
<!-- 텍스트 요소 -->
<h2 class="heading-main" 
    data-editable="section-0-title"
    data-section="first-section">
    착! 가라앉는 여드름
</h2>

<!-- HTML 포함 텍스트 -->
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

<!-- 배경 이미지는 자동 감지 -->
<div id="shSub" 
     style="background-image: url('../images/acne/acne-01.webp');">
</div>
```

#### 5.1.2 네이밍 규칙

```
형식: {section}-{type}-{index}

예시:
- section-0-title
- section-0-description
- section-1-label
- section-2-step-1-title
- banner-background
```

### 5.2 파서 로직

#### 5.2.1 편집 가능 요소 추출

```typescript
interface EditableElement {
  id: string;              // "section-0-title"
  type: ElementType;       // 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND'
  selector: string;        // "[data-editable='section-0-title']"
  currentValue: string;    // "착! 가라앉는 여드름"
  label: string;           // "제목"
  sectionName: string;     // "first-section"
  order: number;           // 0
}

function parseEditableAttributes(html: string): EditableElement[] {
  const $ = cheerio.load(html, { decodeEntities: false });
  const elements: EditableElement[] = [];
  let order = 0;
  
  // 1. data-editable 속성 기반 추출
  $('[data-editable]').each((i, elem) => {
    const $elem = $(elem);
    const id = $elem.attr('data-editable')!;
    const section = $elem.attr('data-section') || findParentSection($elem);
    
    // 타입 결정
    let type: ElementType;
    if ($elem.is('img')) {
      type = 'IMAGE';
    } else if ($elem.find('br, strong, em, a').length > 0) {
      type = 'HTML';
    } else {
      type = 'TEXT';
    }
    
    elements.push({
      id,
      type,
      selector: `[data-editable="${id}"]`,
      currentValue: type === 'IMAGE' ? $elem.attr('src')! : $elem.html()!,
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
      const id = `bg-${$elem.attr('id') || `auto-${i}`}`;
      elements.push({
        id,
        type: 'BACKGROUND',
        selector: generateUniqueSelector($elem, $),
        currentValue: match[1],
        label: `배경 이미지 (${$elem.attr('id') || 'unnamed'})`,
        sectionName: findParentSection($elem),
        order: order++,
      });
    }
  });
  
  return elements;
}
```

#### 5.2.2 HTML 업데이트

```typescript
function updateElementByAttribute(
  html: string,
  elementId: string,
  newValue: string
): string {
  const $ = cheerio.load(html, { 
    decodeEntities: false,
    xmlMode: false 
  });
  
  const $elem = $(`[data-editable="${elementId}"]`);
  
  if ($elem.length === 0) {
    throw new Error(`Element not found: ${elementId}`);
  }
  
  if ($elem.is('img')) {
    $elem.attr('src', newValue);
  } else {
    // TipTap에서 생성한 HTML을 그대로 삽입
    $elem.html(newValue);
  }
  
  return $.html();
}

function updateBackgroundImage(
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

### 5.3 API 설계

#### 5.3.1 편집 가능 요소 조회

**Endpoint**: `GET /api/static-pages/[id]/editable`

**Request**:
```typescript
// Query Parameters
{
  forceReparse?: boolean; // true면 캐시 무시하고 재파싱
}
```

**Response**:
```typescript
{
  pageId: string;
  pageTitle: string;
  editMode: 'PARSER' | 'ATTRIBUTE';
  sections: {
    [sectionName: string]: {
      name: string;
      order: number;
      elements: Array<{
        elementId: string;
        elementType: 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND';
        label: string;
        currentValue: string;
        order: number;
      }>;
    };
  };
  totalElements: number;
  lastParsedAt: string;
}
```

**예시**:
```json
{
  "pageId": "cm3abc123",
  "pageTitle": "여드름치료",
  "editMode": "ATTRIBUTE",
  "sections": {
    "first-section": {
      "name": "메인 소개",
      "order": 0,
      "elements": [
        {
          "elementId": "section-0-label",
          "elementType": "TEXT",
          "label": "라벨",
          "currentValue": "MISOPIN ACNE",
          "order": 0
        },
        {
          "elementId": "section-0-title",
          "elementType": "TEXT",
          "label": "제목",
          "currentValue": "착! 가라앉는 여드름",
          "order": 1
        },
        {
          "elementId": "section-0-description",
          "elementType": "HTML",
          "label": "설명",
          "currentValue": "피부 속 염증·피지선·각질층의 균형을 회복해<br>원인부터 개선하는 구조적 접근을 지향합니다",
          "order": 2
        },
        {
          "elementId": "section-0-image",
          "elementType": "IMAGE",
          "label": "메인 이미지",
          "currentValue": "../images/acne/blog6_cd02.webp",
          "order": 3
        }
      ]
    },
    "banner-section": {
      "name": "배너",
      "order": 1,
      "elements": [
        {
          "elementId": "bg-shSub",
          "elementType": "BACKGROUND",
          "label": "배경 이미지",
          "currentValue": "../images/acne/acne-01.webp",
          "order": 0
        }
      ]
    }
  },
  "totalElements": 15,
  "lastParsedAt": "2025-10-29T10:30:00Z"
}
```

#### 5.3.2 요소 업데이트

**Endpoint**: `POST /api/static-pages/[id]/update-element`

**Request**:
```typescript
{
  elementId: string;      // "section-0-title"
  newValue: string;       // "빠르게 가라앉는 여드름"
  elementType: ElementType;
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  versionNumber: number;
  updatedAt: string;
}
```

**처리 로직**:
```typescript
1. 페이지 조회
2. 요소 존재 확인
3. 백업 생성 (기존 로직 활용)
4. HTML 업데이트
   - TEXT/HTML: updateElementByAttribute()
   - IMAGE: updateElementByAttribute() (src 속성)
   - BACKGROUND: updateBackgroundImage()
5. DB 업데이트
   - StaticPage.htmlContent
   - EditableElement.currentValue
   - StaticPageVersion 생성
6. 파일 시스템 업데이트
   - /dist/{path} 파일 저장
```

#### 5.3.3 이미지 업로드

**Endpoint**: `POST /api/static-pages/upload-image`

**Request** (FormData):
```typescript
{
  file: File;
  pageId: string;
  elementId?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  url: string;           // "/images/acne/uploaded-image.webp"
  fullPath: string;      // "/dist/images/acne/uploaded-image.webp"
}
```

**처리 로직**:
```typescript
1. 파일 검증 (크기, 형식)
2. 이미지 최적화 (Sharp)
   - WebP 변환
   - 리사이징 (max 2000px)
3. 파일 저장
   - 경로: /dist/images/{category}/{timestamp}-{filename}.webp
4. URL 반환
```

#### 5.3.4 페이지 재파싱

**Endpoint**: `POST /api/static-pages/[id]/reparse`

**Request**: (없음)

**Response**:
```typescript
{
  success: boolean;
  message: string;
  totalElements: number;
  newElements: number;
  updatedElements: number;
}
```

**처리 로직**:
```typescript
1. HTML 전체 재파싱
2. 기존 EditableElement와 비교
3. 새로운 요소 추가
4. 삭제된 요소 제거
5. 변경된 요소 업데이트
```

### 5.4 UI 컴포넌트

#### 5.4.1 페이지 구조

```
app/admin/static-pages/[id]/edit/
├── page.tsx                    # 메인 페이지
└── components/
    ├── EditableSectionGroup.tsx
    ├── EditableTextField.tsx
    ├── EditableHtmlField.tsx
    ├── EditableImageField.tsx
    └── PreviewModal.tsx
```

#### 5.4.2 EditableTextField

**용도**: 순수 텍스트 편집 (라벨, 짧은 제목 등)

**Props**:
```typescript
interface EditableTextFieldProps {
  elementId: string;
  label: string;
  currentValue: string;
  onSave: (elementId: string, newValue: string) => Promise<void>;
  disabled?: boolean;
}
```

**UI**:
```
┌─────────────────────────────────────────┐
│ 라벨                              [편집] │
├─────────────────────────────────────────┤
│ MISOPIN ACNE                            │
└─────────────────────────────────────────┘

↓ 편집 모드

┌─────────────────────────────────────────┐
│ 라벨                                    │
├─────────────────────────────────────────┤
│ [MISOPIN ACNE___________________]       │
│ [저장] [취소]                           │
└─────────────────────────────────────────┘
```

#### 5.4.3 EditableHtmlField

**용도**: HTML 포함 텍스트 편집 (본문, 설명 등)

**Props**:
```typescript
interface EditableHtmlFieldProps {
  elementId: string;
  label: string;
  currentValue: string; // HTML 문자열
  onSave: (elementId: string, newValue: string) => Promise<void>;
  disabled?: boolean;
}
```

**TipTap 설정**:
```typescript
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false,        // 제목 비활성화
      codeBlock: false,      // 코드블록 비활성화
      horizontalRule: false, // 구분선 비활성화
    }),
  ],
  content: currentValue,
  editable: isEditing,
});
```

**UI**:
```
┌─────────────────────────────────────────┐
│ 설명                              [편집] │
├─────────────────────────────────────────┤
│ 피부 속 염증·피지선·각질층의             │
│ 균형을 회복해                           │
│ 원인부터 개선하는 구조적 접근...         │
└─────────────────────────────────────────┘

↓ 편집 모드

┌─────────────────────────────────────────┐
│ 설명                                    │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [B] [I] [줄바꿈]                    │ │
│ ├─────────────────────────────────────┤ │
│ │ 피부 속 염증·피지선·각질층의         │ │
│ │ 균형을 회복해                       │ │
│ │ 원인부터 개선하는 구조적 접근...     │ │
│ └─────────────────────────────────────┘ │
│ [저장] [취소]                           │
└─────────────────────────────────────────┘
```

#### 5.4.4 EditableImageField

**용도**: 이미지 URL 및 파일 업로드

**Props**:
```typescript
interface EditableImageFieldProps {
  elementId: string;
  label: string;
  currentValue: string; // 이미지 URL
  elementType: 'IMAGE' | 'BACKGROUND';
  onSave: (elementId: string, newValue: string) => Promise<void>;
  disabled?: boolean;
}
```

**UI**:
```
┌─────────────────────────────────────────┐
│ 메인 이미지                       [교체] │
├─────────────────────────────────────────┤
│ [이미지 미리보기]                        │
│                                         │
│ 현재 URL: ../images/acne/blog6_cd02.webp│
└─────────────────────────────────────────┘

↓ 교체 모드

┌─────────────────────────────────────────┐
│ 메인 이미지                             │
├─────────────────────────────────────────┤
│ [이미지 미리보기]                        │
│                                         │
│ 방법 1: 파일 업로드                      │
│ [파일 선택] [업로드]                     │
│                                         │
│ 방법 2: URL 직접 입력                    │
│ [____________________________]          │
│                                         │
│ [저장] [취소]                           │
└─────────────────────────────────────────┘
```

#### 5.4.5 전체 페이지 레이아웃

```
┌────────────────────────────────────────────────┐
│  📄 여드름치료 페이지 편집                       │
│  [← 목록] [미리보기] [재파싱] [저장 기록]        │
├────────────────────────────────────────────────┤
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  섹션 1: 메인 소개                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │ 라벨                            [편집] │   │
│  │ MISOPIN ACNE                           │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │ 제목                            [편집] │   │
│  │ 착! 가라앉는 여드름                     │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │ 설명                            [편집] │   │
│  │ 피부 속 염증·피지선·각질층의...         │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │ 메인 이미지                      [교체] │   │
│  │ [이미지 미리보기]                       │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  섹션 2: 원리/효과                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │ 라벨                            [편집] │   │
│  │ Customized Treatment                   │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  ...                                           │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🚀 6. 구현 계획

### 6.1 Phase 1: 기반 구축 (2-3일)

**목표**: TipTap 에디터와 기본 파서 구현

**작업 내역**:
- [ ] 패키지 설치
  ```bash
  npm install @tiptap/react @tiptap/starter-kit cheerio
  ```
- [ ] Prisma 스키마 업데이트
- [ ] 마이그레이션 실행
- [ ] 기본 파서 구현
  - `parseEditableAttributes()`
  - `updateElementByAttribute()`
  - `updateBackgroundImage()`
- [ ] TipTap 에디터 컴포넌트 생성
  - `EditableTextField`
  - `EditableHtmlField`

**완료 기준**:
- TipTap 에디터로 텍스트 편집 가능
- HTML 파싱하여 편집 가능 요소 추출 성공

### 6.2 Phase 2: API 구현 (2일)

**목표**: 백엔드 API 완성

**작업 내역**:
- [ ] API 라우트 생성
  - `GET /api/static-pages/[id]/editable`
  - `POST /api/static-pages/[id]/update-element`
  - `POST /api/static-pages/[id]/reparse`
- [ ] 이미지 업로드 기능 강화
  - Sharp를 통한 이미지 최적화
  - WebP 변환
- [ ] 버전 관리 로직 구현
  - 자동 버전 번호 부여
  - 변경 이력 기록

**완료 기준**:
- 모든 API 엔드포인트 정상 작동
- 이미지 업로드 및 최적화 성공
- 버전 관리 정상 작동

### 6.3 Phase 3: UI 구현 (3-4일)

**목표**: 관리자 페이지 UI 완성

**작업 내역**:
- [ ] 메인 편집 페이지 구현
  - 섹션별 그룹핑
  - 편집 필드 렌더링
- [ ] 이미지 교체 컴포넌트
  - 미리보기
  - 파일 업로드
  - URL 직접 입력
- [ ] 미리보기 모달
- [ ] 저장 기록 페이지
- [ ] 로딩 및 에러 상태 처리

**완료 기준**:
- 모든 편집 기능 UI 완성
- 반응형 디자인 적용
- 사용자 경험 검증

### 6.4 Phase 4: 기존 HTML 마킹 (1-2일)

**목표**: 기존 HTML 파일에 data-editable 속성 추가

**작업 내역**:
- [ ] 자동 마킹 스크립트 작성
- [ ] 기존 시술 페이지 마킹
  - acne.html (여드름치료)
  - filler.html (필러)
  - botox.html (보톡스)
  - 기타 시술 페이지들
- [ ] 섹션명 일관성 검토
- [ ] 라벨 명칭 한글화

**완료 기준**:
- 모든 시술 페이지 마킹 완료
- 파서로 정상 추출 확인

### 6.5 Phase 5: 테스트 및 안정화 (2-3일)

**목표**: 버그 수정 및 성능 최적화

**작업 내역**:
- [ ] 단위 테스트 작성
  - 파서 로직 테스트
  - API 엔드포인트 테스트
- [ ] 통합 테스트
  - 편집 → 저장 → 파일 반영 플로우
  - 이미지 업로드 플로우
  - 버전 관리 플로우
- [ ] 성능 최적화
  - 캐싱 전략
  - 불필요한 재파싱 방지
- [ ] 에러 핸들링 강화
- [ ] 사용자 가이드 작성

**완료 기준**:
- 모든 테스트 통과
- 성능 기준 충족 (페이지 로드 < 2초)
- 문서화 완료

### 6.6 Phase 6: 배포 및 모니터링 (1일)

**목표**: 프로덕션 배포 및 모니터링 설정

**작업 내역**:
- [ ] 스테이징 환경 배포
- [ ] 사용자 수용 테스트 (UAT)
- [ ] 프로덕션 배포
- [ ] 모니터링 설정
  - 에러 로깅
  - 성능 모니터링
- [ ] 백업 정책 확인

**완료 기준**:
- 프로덕션 정상 작동
- 모니터링 대시보드 확인
- 백업 자동화 확인

---

## 📊 7. 성능 및 최적화

### 7.1 캐싱 전략

```typescript
// EditableElement 캐싱
- 페이지 로드 시 DB에서 조회
- HTML 변경되지 않았으면 캐시 사용
- lastParsedAt 기준으로 판단

// 조건
if (page.updatedAt > page.lastParsedAt || !editableElements.length) {
  // 재파싱 필요
} else {
  // 캐시 사용
}
```

### 7.2 성능 목표

| 항목 | 목표 | 측정 방법 |
|------|------|----------|
| 페이지 로드 | < 2초 | Lighthouse |
| API 응답 시간 | < 500ms | 서버 로그 |
| 이미지 업로드 | < 3초 | 클라이언트 측정 |
| HTML 업데이트 | < 1초 | API 응답 시간 |

### 7.3 최적화 방안

1. **파싱 캐싱**
   - EditableElement 테이블에 파싱 결과 저장
   - HTML 변경 시에만 재파싱

2. **이미지 최적화**
   - Sharp를 통한 WebP 변환
   - 리사이징 (max 2000px)
   - 썸네일 생성

3. **API 최적화**
   - 트랜잭션 최소화
   - 병렬 처리 가능한 작업 분리

4. **UI 최적화**
   - React.memo 활용
   - 불필요한 리렌더링 방지
   - 디바운싱 적용 (검색, 입력)

---

## 🔒 8. 보안 고려사항

### 8.1 인증 및 권한

```typescript
// 모든 API에 인증 미들웨어 적용
middleware: [authenticateUser, checkPermission('static-page:edit')]

// 권한 레벨
- Admin: 모든 페이지 편집 가능
- Editor: 지정된 페이지만 편집 가능
- Viewer: 조회만 가능
```

### 8.2 입력 검증

```typescript
// 텍스트 길이 제한
const MAX_TEXT_LENGTH = 1000;
const MAX_HTML_LENGTH = 5000;

// HTML Sanitization
import DOMPurify from 'isomorphic-dompurify';
const sanitized = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['br', 'strong', 'em', 'a'],
  ALLOWED_ATTR: ['href', 'target'],
});

// 이미지 파일 검증
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

### 8.3 XSS 방어

```typescript
// TipTap 설정
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // 위험한 태그 비활성화
      code: false,
      codeBlock: false,
    }),
  ],
});

// 서버 사이드 검증
function validateHtml(html: string): boolean {
  const dangerous = /<script|<iframe|javascript:|onerror=/i;
  return !dangerous.test(html);
}
```

---

## 🧪 9. 테스트 전략

### 9.1 단위 테스트

```typescript
// lib/static-pages/attribute-parser.test.ts

describe('parseEditableAttributes', () => {
  it('should extract text elements', () => {
    const html = '<h2 data-editable="title">Test</h2>';
    const result = parseEditableAttributes(html);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('TEXT');
  });
  
  it('should detect HTML elements', () => {
    const html = '<p data-editable="desc">Test<br>Line</p>';
    const result = parseEditableAttributes(html);
    expect(result[0].type).toBe('HTML');
  });
  
  it('should extract background images', () => {
    const html = '<div style="background-image: url(test.jpg)"></div>';
    const result = parseEditableAttributes(html);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('BACKGROUND');
  });
});

describe('updateElementByAttribute', () => {
  it('should update text content', () => {
    const html = '<h2 data-editable="title">Old</h2>';
    const result = updateElementByAttribute(html, 'title', 'New');
    expect(result).toContain('New');
    expect(result).not.toContain('Old');
  });
  
  it('should update image src', () => {
    const html = '<img data-editable="img" src="old.jpg">';
    const result = updateElementByAttribute(html, 'img', 'new.jpg');
    expect(result).toContain('new.jpg');
  });
});
```

### 9.2 통합 테스트

```typescript
// app/api/static-pages/[id]/editable/route.test.ts

describe('GET /api/static-pages/[id]/editable', () => {
  it('should return editable elements', async () => {
    const res = await GET({ params: { id: 'test-page' } });
    const data = await res.json();
    
    expect(data.pageId).toBe('test-page');
    expect(data.sections).toBeDefined();
    expect(data.totalElements).toBeGreaterThan(0);
  });
  
  it('should use cache when HTML unchanged', async () => {
    const spy = jest.spyOn(parser, 'parseEditableAttributes');
    await GET({ params: { id: 'test-page' } });
    await GET({ params: { id: 'test-page' } });
    
    expect(spy).toHaveBeenCalledTimes(1); // 캐시 사용
  });
});

describe('POST /api/static-pages/[id]/update-element', () => {
  it('should update element and create version', async () => {
    const res = await POST({
      params: { id: 'test-page' },
      body: {
        elementId: 'section-0-title',
        newValue: 'Updated Title',
      },
    });
    
    expect(res.success).toBe(true);
    
    // 버전 생성 확인
    const versions = await prisma.staticPageVersion.findMany({
      where: { pageId: 'test-page' },
    });
    expect(versions).toHaveLength(1);
  });
});
```

### 9.3 E2E 테스트

```typescript
// e2e/static-page-edit.spec.ts (Playwright)

test('should edit text and save', async ({ page }) => {
  // 1. 편집 페이지 이동
  await page.goto('/admin/static-pages/acne/edit');
  
  // 2. 제목 편집 버튼 클릭
  await page.click('[data-testid="edit-section-0-title"]');
  
  // 3. 텍스트 수정
  await page.fill('[data-testid="input-section-0-title"]', '새로운 제목');
  
  // 4. 저장 버튼 클릭
  await page.click('[data-testid="save-section-0-title"]');
  
  // 5. 성공 메시지 확인
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  
  // 6. 실제 페이지 확인
  await page.goto('/dist/acne.html');
  await expect(page.locator('h2')).toContainText('새로운 제목');
});

test('should upload and replace image', async ({ page }) => {
  await page.goto('/admin/static-pages/acne/edit');
  
  // 이미지 교체 버튼 클릭
  await page.click('[data-testid="replace-section-0-image"]');
  
  // 파일 선택
  await page.setInputFiles('[data-testid="file-input"]', 'test-image.jpg');
  
  // 업로드 버튼 클릭
  await page.click('[data-testid="upload-button"]');
  
  // 업로드 완료 대기
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
  
  // 미리보기 확인
  const src = await page.locator('[data-testid="preview-image"]').getAttribute('src');
  expect(src).toContain('/images/acne/');
});
```

---

## 📝 10. 문서화

### 10.1 개발자 문서

**파일**: `/docs/static-page-editor.md`

**내용**:
- 시스템 아키텍처
- API 명세
- 컴포넌트 사용법
- 파서 로직 설명
- 트러블슈팅 가이드

### 10.2 사용자 가이드

**파일**: `/docs/user-guide.md`

**내용**:
- 페이지 편집 방법
- 텍스트 수정 가이드
- 이미지 교체 가이드
- 저장 및 버전 관리
- FAQ

### 10.3 API 문서

**도구**: Swagger / OpenAPI

**엔드포인트**:
- GET /api/static-pages/[id]/editable
- POST /api/static-pages/[id]/update-element
- POST /api/static-pages/[id]/reparse
- POST /api/static-pages/upload-image

---

## 🐛 11. 알려진 제약사항 및 향후 개선

### 11.1 현재 제약사항

1. **섹션 구조 변경 불가**
   - 섹션 추가/삭제 불가
   - 섹션 순서 변경 불가
   - → 향후 블록 빌더 도입 검토

2. **CSS 수정 불가**
   - 스타일 편집 불가
   - → 향후 스타일 프리셋 제공 검토

3. **복잡한 레이아웃 제한**
   - Grid/Flex 구조 변경 불가
   - → 현재는 HTML 직접 수정 필요

4. **이미지 일괄 처리 없음**
   - 한 번에 하나씩만 교체 가능
   - → 향후 일괄 업로드 기능 추가

### 11.2 향후 개선 계획

**Phase 2 (3개월 후)**
- [ ] 섹션 추가/삭제 기능
- [ ] 드래그 앤 드롭 순서 변경
- [ ] 스타일 프리셋 (색상, 폰트)
- [ ] 미디어 라이브러리
- [ ] 일괄 이미지 업로드

**Phase 3 (6개월 후)**
- [ ] 블록 라이브러리
- [ ] 템플릿 시스템
- [ ] A/B 테스트
- [ ] 다국어 지원
- [ ] 고급 버전 비교

---

## 📈 12. 성공 지표

### 12.1 정량적 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| 편집 소요 시간 | 5분 | 1분 | 사용자 테스트 |
| 오류율 | 10% | < 2% | 에러 로그 |
| 페이지 로드 시간 | 3초 | < 2초 | Lighthouse |
| 사용자 만족도 | N/A | 4.5/5 | 설문조사 |

### 12.2 정성적 지표

- [ ] 비개발자도 쉽게 사용 가능
- [ ] HTML 지식 불필요
- [ ] 직관적인 UI
- [ ] 명확한 피드백
- [ ] 안정적인 작동

---

## 🔄 13. 롤백 계획

### 13.1 문제 발생 시 대응

**Level 1: 마이너 버그**
- 영향: 일부 기능 제한적 동작
- 대응: 핫픽스 배포
- 시간: 2시간 이내

**Level 2: 메이저 버그**
- 영향: 편집 기능 전체 오류
- 대응: 이전 버전 롤백
- 시간: 30분 이내

**Level 3: 치명적 오류**
- 영향: 사이트 다운
- 대응: 즉시 롤백 + 기존 HTML 파싱 방식 사용
- 시간: 10분 이내

### 13.2 롤백 절차

```bash
# 1. 데이터베이스 롤백
npx prisma migrate reset

# 2. 코드 롤백
git revert [commit-hash]
git push

# 3. 배포
npm run deploy:rollback

# 4. 확인
npm run test:smoke
```

---

## 📞 14. 지원 및 연락처

### 14.1 개발팀

- **리드 개발자**: Leo (CodeBee)
- **백엔드**: Leo
- **프론트엔드**: Leo
- **DevOps**: Leo

### 14.2 이슈 리포팅

- **버그 리포트**: GitHub Issues
- **기능 요청**: GitHub Discussions
- **긴급 문의**: Slack #dev-urgent

---

## 📚 15. 참고 자료

### 15.1 기술 문서

- [TipTap Documentation](https://tiptap.dev/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

### 15.2 디자인 레퍼런스

- Notion Editor
- WordPress Gutenberg
- Webflow Editor
- Framer CMS

### 15.3 경쟁사 분석

- 아임웹: 블록 기반 편집
- 위딩북: 템플릿 기반 편집
- 워드프레스: Gutenberg 에디터

---

## ✅ 16. 체크리스트

### 16.1 개발 전 확인사항

- [x] PRD 문서 작성 완료
- [ ] 데이터베이스 스키마 검토
- [ ] API 설계 승인
- [ ] UI/UX 디자인 확정
- [ ] 개발 환경 설정

### 16.2 개발 중 확인사항

- [ ] 코드 리뷰 진행
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] 문서화 진행
- [ ] 성능 최적화

### 16.3 배포 전 확인사항

- [ ] 전체 테스트 통과
- [ ] 보안 검토 완료
- [ ] 백업 시스템 확인
- [ ] 모니터링 설정
- [ ] 롤백 계획 수립
- [ ] 사용자 가이드 작성

---

## 📌 부록

### A. HTML 마킹 예시

**Before (기존)**:
```html
<h2 class="heading-main" style="color: #9F988C;">
    착! 가라앉는 여드름
</h2>
```

**After (마킹 후)**:
```html
<h2 class="heading-main" 
    style="color: #9F988C;"
    data-editable="section-0-title"
    data-section="first-section">
    착! 가라앉는 여드름
</h2>
```

### B. 자동 마킹 스크립트

```typescript
// scripts/add-editable-attributes.ts
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

function autoMarkHtml(filePath: string): void {
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);
  
  let sectionIndex = 0;
  
  $('section, [class*="section"]').each((i, section) => {
    const $section = $(section);
    const sectionName = $section.attr('class')?.split(' ')[0] || `section-${sectionIndex}`;
    
    // 제목
    $section.find('.heading-main').each((j, elem) => {
      $(elem).attr('data-editable', `${sectionName}-title-${j}`);
      $(elem).attr('data-section', sectionName);
    });
    
    // 설명
    $section.find('.text-lead').each((j, elem) => {
      $(elem).attr('data-editable', `${sectionName}-description-${j}`);
      $(elem).attr('data-section', sectionName);
    });
    
    // 라벨
    $section.find('[class*="label"]').each((j, elem) => {
      $(elem).attr('data-editable', `${sectionName}-label-${j}`);
      $(elem).attr('data-section', sectionName);
    });
    
    // 이미지
    $section.find('img').each((j, elem) => {
      const alt = $(elem).attr('alt') || `image-${j}`;
      $(elem).attr('data-editable', `${sectionName}-${alt.replace(/\s/g, '-')}`);
      $(elem).attr('data-section', sectionName);
    });
    
    sectionIndex++;
  });
  
  // 파일 저장
  const outputPath = filePath.replace('.html', '-editable.html');
  fs.writeFileSync(outputPath, $.html());
  console.log(`✅ Marked: ${outputPath}`);
}

// 실행
const distPath = path.join(__dirname, '../dist');
const files = fs.readdirSync(distPath)
  .filter(f => f.endsWith('.html') && !f.includes('editable'));

files.forEach(file => {
  autoMarkHtml(path.join(distPath, file));
});
```

### C. 버전 비교 UI 예시

```
┌────────────────────────────────────────────┐
│  버전 비교: section-0-title                 │
├────────────────────────────────────────────┤
│                                            │
│  버전 3 (현재)     ←→     버전 2 (이전)     │
│  ─────────────────────────────────────     │
│                                            │
│  빠르게 가라앉는   ←→     착! 가라앉는      │
│  여드름                   여드름            │
│                                            │
│  변경자: admin                             │
│  변경일: 2025-10-29 10:30                  │
│                                            │
│  [← 이전 버전으로 복원]                     │
│                                            │
└────────────────────────────────────────────┘
```

---

**문서 승인**

- [ ] 개발팀 리드: _______
- [ ] 제품 책임자: _______
- [ ] 날짜: _______

**변경 이력**

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2025-10-29 | 초안 작성 | Leo |

---

**문서 끝**