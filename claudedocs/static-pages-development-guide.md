# 정적 페이지 시스템 개발 가이드

**작성일**: 2025-11-04
**프로젝트**: 미소핀 CMS (Next.js 15.5.3)
**목적**: 기존 정적 HTML 사이트를 CMS에서 편집 가능하도록 통합

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [주요 기능](#주요-기능)
4. [컴포넌트 구조](#컴포넌트-구조)
5. [API 엔드포인트](#api-엔드포인트)
6. [이미지 업로드 시스템](#이미지-업로드-시스템)
7. [사용 가이드](#사용-가이드)
8. [문제 해결](#문제-해결)
9. [향후 개선사항](#향후-개선사항)

---

## 시스템 개요

### 배경
- **기존 시스템**: 45개의 정적 HTML 파일 (`Misopin-renew/`)
- **문제점**: HTML 직접 편집 필요, 비개발자 수정 불가
- **해결책**: CMS 통합으로 웹 브라우저에서 편집 가능하게 변경

### 핵심 원칙
1. **Hybrid Approach**: 정적 파일은 유지하되, 편집 가능한 콘텐츠만 DB화
2. **선택적 편집**: 원하는 요소만 `data-*` 속성으로 편집 가능하게 설정
3. **비파괴적**: 기존 HTML 구조 유지, CMS에서 수정하지 않으면 원본 그대로
4. **실시간 반영**: DB 업데이트 → 정적 HTML 재생성

---

## 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     CMS 관리 페이지                          │
│              /admin/static-pages/[slug]/edit                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │     StaticPageEditor Component      │
        │  - 섹션별 편집 UI                    │
        │  - ElementImagePicker 통합           │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │         API 엔드포인트               │
        │  - GET: 편집 가능 요소 조회          │
        │  - PATCH: 요소 업데이트              │
        │  - POST: 이미지 업로드               │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│  PostgreSQL  │          │    Public    │
│   Database   │          │   /uploads   │
│              │          │   Directory  │
└──────┬───────┘          └──────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│     정적 HTML 재생성 (미구현)          │
│  - DB 데이터 → HTML 파일 업데이트      │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│         최종 정적 페이지               │
│    https://misopin.one-q.xyz         │
└──────────────────────────────────────┘
```

### 데이터 흐름

```
1. HTML 파싱 (초기 설정)
   정적 HTML → data-* 속성 인식 → DB 저장

2. 편집 프로세스
   CMS 관리자 → 요소 수정 → API 호출 → DB 업데이트

3. 이미지 업로드
   파일 선택 → /api/admin/upload → /uploads 저장 → 절대 URL 반환

4. 페이지 반영 (현재 수동)
   DB 데이터 → HTML 재생성 → 정적 사이트 업데이트
```

---

## 주요 기능

### 1. 편집 가능 요소 정의 (HTML 속성)

HTML에 특별한 속성을 추가하여 CMS에서 편집 가능하게 설정:

```html
<!-- 텍스트 편집 가능 -->
<h1 data-section="hero"
    data-element="title"
    data-type="text">
  보톡스 시술
</h1>

<!-- HTML 편집 가능 (리치 텍스트) -->
<div data-section="intro"
     data-element="description"
     data-type="html">
  <p>전문적인 <strong>보톡스</strong> 시술을 제공합니다.</p>
</div>

<!-- 이미지 편집 가능 -->
<img data-section="gallery"
     data-element="image1"
     data-type="image"
     src="/img/botox/before.jpg"
     alt="시술 전">

<!-- 배경 이미지 편집 가능 -->
<section data-section="hero"
         data-element="background"
         data-type="background"
         style="background-image: url('/img/hero-bg.jpg')">
  Hero Content
</section>
```

### 2. 섹션 구조

각 페이지는 **섹션**으로 구성되며, 각 섹션은 여러 **요소**를 포함:

```
페이지 (예: botox.html)
├─ 📁 Hero Section (hero)
│  ├─ 📝 제목 (title) - text
│  ├─ 📝 부제목 (subtitle) - text
│  └─ 🖼️ 배경 이미지 (background) - background
│
├─ 📁 소개 Section (intro)
│  ├─ 📝 설명 (description) - html
│  └─ 🖼️ 이미지 (image1) - image
│
└─ 📁 갤러리 Section (gallery)
   ├─ 🖼️ 이미지 1 (image1) - image
   ├─ 🖼️ 이미지 2 (image2) - image
   └─ 🖼️ 이미지 3 (image3) - image
```

### 3. 데이터 타입

| 타입 | 설명 | CMS 편집 UI | 저장 형식 |
|------|------|-------------|----------|
| `text` | 단순 텍스트 | Input 필드 | 플레인 텍스트 |
| `html` | 리치 텍스트 | HTML 에디터 | HTML 마크업 |
| `image` | 이미지 URL | 이미지 업로더 | 절대 URL |
| `background` | 배경 이미지 | 이미지 업로더 | 절대 URL |

---

## 컴포넌트 구조

### 파일 구조

```
components/static-pages/
├── StaticPageEditor.tsx         # 메인 에디터 컴포넌트
├── ElementImagePicker.tsx       # 이미지 업로드 컴포넌트
├── ElementTipTapEditor.tsx      # 리치 텍스트 에디터
├── EditableElement.tsx          # 개별 요소 편집 (미사용)
├── EditableSection.tsx          # 섹션 편집 (미사용)
├── SaveControls.tsx             # 저장/취소 버튼
└── index.ts                     # Export 모음
```

### 주요 컴포넌트 설명

#### 1. StaticPageEditor.tsx
**역할**: 정적 페이지 전체 편집 UI 제공

**주요 기능**:
- 섹션별 펼치기/접기
- 요소 타입별 적절한 편집 UI 렌더링
- 변경사항 추적 및 저장
- API 통신

**Props**:
```typescript
interface StaticPageEditorProps {
  slug: string;      // 페이지 slug (예: "botox", "filler")
  token: string;     // JWT 인증 토큰
}
```

**상태 관리**:
```typescript
const [sections, setSections] = useState<Section[]>([]);
const [originalSections, setOriginalSections] = useState<Section[]>([]);
const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
const [isDirty, setIsDirty] = useState(false);  // 변경사항 여부
```

#### 2. ElementImagePicker.tsx
**역할**: 이미지 업로드 및 URL 입력 UI

**주요 기능**:
- 📷 파일 선택 버튼 (메인)
- 🔗 URL 직접 입력 (보조)
- 이미지 미리보기
- 파일 검증 (타입, 크기)

**Props**:
```typescript
interface ElementImagePickerProps {
  value: string;                    // 현재 이미지 URL
  onChange: (url: string) => void;  // URL 변경 콜백
  alt?: string;                     // 대체 텍스트
  onAltChange?: (alt: string) => void;
  label?: string;                   // 필드 레이블
}
```

**핵심 로직 - 절대 URL 변환**:
```typescript
const data = await response.json();

if (data.url) {
  // 상대 경로를 절대 URL로 변환
  const absoluteUrl = data.url.startsWith('http')
    ? data.url
    : `https://cms.one-q.xyz${data.url}`;

  onChange(absoluteUrl);  // 절대 URL로 저장
}
```

#### 3. SaveControls.tsx
**역할**: 저장/취소 버튼 및 상태 표시

**표시 상태**:
- 🟡 저장되지 않은 변경사항
- 🔵 저장 중...
- 🟢 마지막 저장: N분 전
- 🔴 에러 메시지

---

## API 엔드포인트

### 1. GET /api/admin/static-pages/[slug]/editable-elements

**설명**: 특정 페이지의 편집 가능한 요소 목록 조회

**요청**:
```http
GET /api/admin/static-pages/botox/editable-elements
Authorization: Bearer {JWT_TOKEN}
```

**응답**:
```json
{
  "success": true,
  "pageId": "page_123",
  "pageTitle": "보톡스 시술",
  "sections": [
    {
      "sectionName": "hero",
      "displayName": "히어로 섹션",
      "emoji": "🎯",
      "description": "페이지 상단 메인 영역",
      "order": 1,
      "elementCount": 3,
      "elements": [
        {
          "id": "elem_001",
          "type": "text",
          "selector": "[data-section='hero'][data-element='title']",
          "content": "보톡스 시술",
          "label": "hero-title",
          "friendlyLabel": "제목",
          "icon": "📝",
          "order": 1
        },
        {
          "id": "elem_002",
          "type": "image",
          "selector": "[data-section='hero'][data-element='image']",
          "content": "https://cms.one-q.xyz/uploads/hero.jpg",
          "label": "hero-image",
          "friendlyLabel": "히어로 이미지",
          "icon": "🖼️",
          "order": 2
        }
      ]
    }
  ]
}
```

### 2. PATCH /api/admin/static-pages/[slug]/elements

**설명**: 여러 요소를 한 번에 업데이트

**요청**:
```http
PATCH /api/admin/static-pages/botox/elements
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "updates": [
    {
      "elementId": "elem_001",
      "newValue": "전문 보톡스 시술",
      "elementType": "TEXT"
    },
    {
      "elementId": "elem_002",
      "newValue": "https://cms.one-q.xyz/uploads/new-hero.jpg",
      "elementType": "IMAGE"
    }
  ]
}
```

**응답**:
```json
{
  "success": true,
  "message": "2개 요소가 성공적으로 업데이트되었습니다",
  "updated": 2
}
```

### 3. POST /api/admin/upload

**설명**: 이미지 파일 업로드

**요청**:
```http
POST /api/admin/upload
Content-Type: multipart/form-data

file: [바이너리 데이터]
```

**검증**:
- 파일 타입: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- 최대 크기: 5MB

**응답**:
```json
{
  "url": "/uploads/1762235650805-c4no6.png",
  "filename": "1762235650805-c4no6.png",
  "size": 245678,
  "type": "image/png"
}
```

**저장 위치**: `/var/www/misopin-cms/.next/standalone/public/uploads/`

---

## 이미지 업로드 시스템

### 문제점과 해결

#### ❌ 문제: 상대 경로로 저장 시 404 에러

**상황**:
```
1. API가 상대 경로 반환: "/uploads/image.png"
2. DB에 상대 경로 저장: "/uploads/image.png"
3. misopin.one-q.xyz에서 렌더링
4. 브라우저가 해석: "https://misopin.one-q.xyz/uploads/image.png"
5. 파일은 cms.one-q.xyz에만 존재 → 404 에러
```

#### ✅ 해결: 절대 URL로 저장

**구현**:
```typescript
// ElementImagePicker.tsx
const absoluteUrl = data.url.startsWith('http')
  ? data.url
  : `https://cms.one-q.xyz${data.url}`;

onChange(absoluteUrl);  // "https://cms.one-q.xyz/uploads/image.png"
```

**결과**:
- ✅ cms.one-q.xyz에서도 정상 표시
- ✅ misopin.one-q.xyz에서도 정상 표시
- ✅ 도메인 간 이미지 공유 가능

### 이미지 라이프사이클

```
1. 업로드 단계
   사용자가 파일 선택
   → POST /api/admin/upload
   → 파일 검증 (타입, 크기)
   → public/uploads/ 저장
   → 상대 경로 반환

2. URL 변환 단계
   ElementImagePicker에서 수신
   → 절대 URL로 변환
   → onChange(절대URL) 호출

3. 저장 단계
   StaticPageEditor가 onChange 수신
   → sections 상태 업데이트
   → "저장" 버튼 클릭 시
   → PATCH /api/admin/static-pages/.../elements
   → DB에 절대 URL 저장

4. 표시 단계
   정적 페이지 렌더링
   → DB에서 절대 URL 조회
   → HTML <img src="https://cms.one-q.xyz/...">
   → 모든 도메인에서 정상 표시
```

### 파일 구조

```
서버 파일 시스템:
/var/www/misopin-cms/
└── .next/standalone/
    └── public/
        └── uploads/
            ├── 1762235650805-c4no6.png
            ├── 1762235987654-xyz12.jpg
            └── board/              # 게시판 업로드
                └── image.png

URL 접근:
https://cms.one-q.xyz/uploads/1762235650805-c4no6.png
```

---

## 사용 가이드

### 관리자 사용법

#### 1. 페이지 목록 보기
```
URL: https://cms.one-q.xyz/admin/static-pages
```

#### 2. 페이지 편집
```
URL: https://cms.one-q.xyz/admin/static-pages/{slug}/edit

예시:
- https://cms.one-q.xyz/admin/static-pages/botox/edit
- https://cms.one-q.xyz/admin/static-pages/filler/edit
- https://cms.one-q.xyz/admin/static-pages/index/edit
```

#### 3. 편집 프로세스

**Step 1: 섹션 펼치기**
- 섹션 헤더 클릭 → 편집 가능한 요소 표시

**Step 2: 콘텐츠 수정**

**텍스트 필드**:
```
[입력 필드]
보톡스 시술  →  전문 보톡스 시술
```

**HTML 필드**:
```
[리치 텍스트 에디터]
일반 텍스트, 굵게, 기울임꼴, 링크 등 지원
```

**이미지 필드**:
```
방법 1: 파일 업로드
  📷 이미지 선택 버튼 클릭
  → 파일 선택
  → 자동 업로드 및 미리보기

방법 2: URL 직접 입력
  "또는 이미지 URL 직접 입력" 섹션
  → URL 입력
  → "적용" 버튼 클릭
```

**Step 3: 저장**
- 상단 "💾 저장" 버튼 클릭
- "✅ 마지막 저장: 방금 전" 표시 확인

**Step 4: 취소 (필요시)**
- "취소" 버튼 클릭 → 변경사항 롤백

#### 4. 변경사항 확인

```
편집 상태:
🟡 저장되지 않은 변경사항  → 저장 필요
🔵 저장 중...             → 저장 진행 중
🟢 마지막 저장: N분 전     → 저장 완료
🔴 [에러 메시지]          → 에러 발생
```

### 개발자 가이드

#### 1. 새 페이지 추가

**Step 1: HTML 파일 생성**
```html
<!-- public/static-pages/new-page.html -->
<!DOCTYPE html>
<html>
<head>
  <title>New Page</title>
</head>
<body>
  <section data-section="hero"
           data-section-name="히어로 섹션"
           data-section-emoji="🎯">

    <h1 data-element="title"
        data-type="text"
        data-label="제목">
      New Page Title
    </h1>

    <img data-element="image"
         data-type="image"
         data-label="메인 이미지"
         src="/img/default.jpg">
  </section>
</body>
</html>
```

**Step 2: DB에 페이지 등록**
```sql
INSERT INTO "StaticPage" (id, slug, title, file_path, is_active)
VALUES (
  gen_random_uuid(),
  'new-page',
  'New Page',
  'public/static-pages/new-page.html',
  true
);
```

**Step 3: 편집 가능 요소 파싱**
```typescript
// API 호출로 자동 파싱
GET /api/admin/static-pages/new-page/parse
```

#### 2. 새 섹션 추가

기존 HTML 파일에 섹션 추가:

```html
<!-- 새 섹션 추가 -->
<section data-section="features"
         data-section-name="특징 섹션"
         data-section-emoji="✨"
         data-section-desc="주요 특징 소개">

  <h2 data-element="title" data-type="text">특징</h2>
  <p data-element="description" data-type="html">설명...</p>
</section>
```

재파싱:
```
GET /api/admin/static-pages/{slug}/parse
```

#### 3. 커스텀 요소 타입 추가

**Step 1: 타입 정의**
```typescript
// types.ts
type ElementType = 'text' | 'html' | 'image' | 'background' | 'video';  // 새 타입 추가
```

**Step 2: UI 컴포넌트 추가**
```typescript
// StaticPageEditor.tsx
{element.type === 'video' ? (
  <VideoUploader
    value={element.content}
    onChange={(url) => handleElementChange(...)}
  />
) : ...}
```

**Step 3: API 처리 추가**
```typescript
// route.ts
case 'VIDEO':
  // 비디오 URL 검증 및 저장
  break;
```

---

## 문제 해결

### 일반적인 문제

#### 1. 이미지가 404 에러로 표시됨

**증상**:
```
https://misopin.one-q.xyz/uploads/image.png → 404
```

**원인**:
- 상대 경로로 저장됨
- 구버전 ElementImagePicker 사용 중

**해결**:
```bash
# 최신 버전으로 배포 확인
git log --oneline | grep "Fix image upload URL"

# 수동으로 DB 수정 (임시)
UPDATE "EditableElement"
SET image_url = 'https://cms.one-q.xyz' || image_url
WHERE image_url LIKE '/uploads/%';
```

#### 2. 변경사항이 저장되지 않음

**증상**:
- "저장" 버튼 클릭 후에도 변경사항 유지

**원인**:
- API 에러
- JWT 토큰 만료
- 네트워크 문제

**해결**:
```
1. 브라우저 콘솔 확인 (F12)
2. Network 탭에서 API 응답 확인
3. 필요시 다시 로그인
```

#### 3. 페이지 목록이 비어있음

**증상**:
- /admin/static-pages에서 아무것도 표시 안 됨

**원인**:
- DB에 StaticPage 레코드 없음
- is_active = false

**해결**:
```sql
-- 페이지 확인
SELECT id, slug, title, is_active FROM "StaticPage";

-- 활성화
UPDATE "StaticPage" SET is_active = true WHERE slug = 'botox';
```

#### 4. 이미지 업로드 실패

**증상**:
```
"업로드 중 오류가 발생했습니다"
```

**원인 & 해결**:

| 원인 | 해결 방법 |
|------|----------|
| 파일 크기 초과 (>5MB) | 이미지 압축 후 재업로드 |
| 지원하지 않는 형식 | JPG, PNG, WebP, GIF만 가능 |
| 권한 문제 | `chmod 755 public/uploads` |
| 디스크 공간 부족 | 서버 공간 확인 `df -h` |

### 디버깅 방법

#### 1. API 응답 확인

```javascript
// 브라우저 콘솔에서
fetch('/api/admin/static-pages/botox/editable-elements', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(console.log);
```

#### 2. 서버 로그 확인

```bash
# PM2 로그
ssh root@cms.one-q.xyz
pm2 logs misopin-cms --lines 50

# 에러 로그만
pm2 logs misopin-cms --err
```

#### 3. DB 직접 확인

```sql
-- 페이지 정보
SELECT * FROM "StaticPage" WHERE slug = 'botox';

-- 편집 가능 요소
SELECT
  id,
  element_type,
  selector,
  substring(content, 1, 50) as content_preview
FROM "EditableElement"
WHERE page_id = (SELECT id FROM "StaticPage" WHERE slug = 'botox')
ORDER BY "order";

-- 최근 업데이트
SELECT * FROM "EditableElement"
ORDER BY updated_at DESC
LIMIT 10;
```

---

## 향후 개선사항

### 단기 (1-2주)

#### 1. 자동 HTML 재생성
**현재**: DB 업데이트 후 수동으로 HTML 파일 재생성 필요
**개선**: DB 업데이트 시 자동으로 정적 HTML 파일 업데이트

```typescript
// 구현 예시
async function regenerateStaticPage(slug: string) {
  // 1. DB에서 최신 데이터 조회
  const elements = await getEditableElements(slug);

  // 2. HTML 템플릿 로드
  const template = await loadTemplate(slug);

  // 3. 데이터 적용
  const html = applyDataToTemplate(template, elements);

  // 4. 파일 저장
  await saveStaticPage(slug, html);

  // 5. CDN 캐시 무효화
  await invalidateCDN(slug);
}
```

#### 2. 이미지 최적화
**현재**: 원본 이미지 그대로 저장
**개선**: 자동 리사이징 및 WebP 변환

```typescript
// Sharp 라이브러리 활용
await sharp(buffer)
  .resize(1920, 1080, { fit: 'inside' })
  .webp({ quality: 80 })
  .toFile(outputPath);
```

#### 3. 변경 이력 (History)
**현재**: 이전 버전 복원 불가
**개선**: 변경 이력 저장 및 롤백 기능

```sql
CREATE TABLE "EditableElementHistory" (
  id UUID PRIMARY KEY,
  element_id UUID REFERENCES "EditableElement"(id),
  content TEXT,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT NOW()
);
```

### 중기 (1-2개월)

#### 4. 실시간 미리보기
**개선**: 편집 중 실시간으로 변경사항 미리보기

```typescript
<div className="grid grid-cols-2 gap-4">
  <div className="editor">
    {/* 편집 UI */}
  </div>
  <div className="preview">
    <iframe src={`/preview/${slug}?draft=true`} />
  </div>
</div>
```

#### 5. 드래그 앤 드롭 이미지 업로드
**개선**: 드래그 앤 드롭으로 이미지 업로드

```typescript
<div
  onDrop={handleDrop}
  onDragOver={e => e.preventDefault()}
  className="dropzone"
>
  파일을 여기에 드롭하세요
</div>
```

#### 6. 다국어 지원
**개선**: 한국어/영어 버전 관리

```sql
CREATE TABLE "PageTranslation" (
  id UUID PRIMARY KEY,
  element_id UUID,
  language VARCHAR(5),  -- 'ko', 'en'
  content TEXT
);
```

### 장기 (3개월+)

#### 7. 페이지 빌더
**개선**: 드래그 앤 드롭으로 섹션 구성

```typescript
// 블록 기반 페이지 빌더
<PageBuilder>
  <HeroBlock />
  <FeaturesBlock />
  <GalleryBlock />
  <CTABlock />
</PageBuilder>
```

#### 8. A/B 테스팅
**개선**: 여러 버전 테스트 및 성과 측정

```typescript
// 버전별 트래픽 분배
const variant = assignVariant(userId);
return variant === 'A' ? <VersionA /> : <VersionB />;
```

#### 9. SEO 자동 최적화
**개선**: 메타 태그 자동 생성 및 제안

```typescript
interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  structuredData: object;
}
```

---

## 기술 스택 상세

### Frontend
- **Framework**: Next.js 15.5.3 (App Router)
- **UI Library**: React 19.1.0
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS 4
- **Rich Text Editor**: TipTap
- **State Management**: React Hooks (useState, useCallback, useMemo)

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL (Prisma ORM)
- **File Storage**: Local Filesystem (`public/uploads`)
- **Authentication**: JWT (Bearer Token)

### Infrastructure
- **Server**: Ubuntu VPS
- **Process Manager**: PM2
- **Web Server**: Next.js Standalone
- **Database Host**: 141.164.60.51:5432
- **SSL**: Let's Encrypt

---

## 파일 경로 참조

### 주요 파일 위치

```
misopin-cms/
├── app/
│   ├── admin/
│   │   └── static-pages/
│   │       ├── page.tsx                        # 페이지 목록
│   │       └── [slug]/
│   │           └── edit/
│   │               └── page.tsx                # 편집 페이지
│   │
│   └── api/
│       └── admin/
│           ├── upload/
│           │   └── route.ts                    # 이미지 업로드 API
│           └── static-pages/
│               └── [slug]/
│                   ├── editable-elements/
│                   │   └── route.ts            # 요소 조회 API
│                   ├── elements/
│                   │   └── route.ts            # 요소 업데이트 API
│                   └── parse/
│                       └── route.ts            # HTML 파싱 API
│
├── components/
│   └── static-pages/
│       ├── StaticPageEditor.tsx                # 메인 에디터
│       ├── ElementImagePicker.tsx              # 이미지 선택
│       ├── ElementTipTapEditor.tsx             # 리치 텍스트
│       └── SaveControls.tsx                    # 저장 컨트롤
│
├── public/
│   ├── static-pages/                           # 정적 HTML 파일
│   │   ├── index.html
│   │   ├── botox.html
│   │   └── filler.html
│   └── uploads/                                # 업로드된 이미지
│       └── *.png, *.jpg
│
├── prisma/
│   └── schema.prisma                           # DB 스키마
│
└── claudedocs/
    └── static-pages-development-guide.md       # 이 문서
```

---

## 참고 자료

### 관련 문서
- [misopin-cms-architecture-analysis.md](./misopin-cms-architecture-analysis.md) - CMS 전체 아키텍처
- [static-pages-implementation-report.md](./static-pages-implementation-report.md) - 구현 보고서
- [static-pages-issue-analysis.md](./static-pages-issue-analysis.md) - 이슈 분석

### 외부 링크
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TipTap Editor](https://tiptap.dev/)
- [Radix UI](https://www.radix-ui.com/)

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-11-04 | 1.0.0 | 최초 문서 작성 |
| 2025-11-04 | 1.0.1 | 이미지 업로드 절대 URL 변환 추가 |
| 2025-11-04 | 1.0.2 | ElementImagePicker UI 개선 |

---

## 라이선스 & 기여

**프로젝트**: Misopin CMS
**작성자**: Development Team
**최종 수정**: 2025-11-04

본 문서는 프로젝트 내부 참고용으로 작성되었습니다.
