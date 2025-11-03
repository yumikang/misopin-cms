# 정적 페이지 CMS 시스템 가이드

## 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [CMS 사용 가이드](#cms-사용-가이드)
4. [배포 및 도메인 설정](#배포-및-도메인-설정)
5. [문제 해결](#문제-해결)
6. [기술 상세](#기술-상세)

---

## 시스템 개요

### 목적
정적 HTML 페이지의 콘텐츠를 CMS에서 직접 편집하고, 실시간으로 라이브 사이트에 반영하는 시스템

### 주요 기능
- ✅ 웹 기반 WYSIWYG 편집 인터페이스
- ✅ 실시간 HTML 파일 동기화
- ✅ 데이터베이스 백업 및 버전 관리
- ✅ XSS 보호 및 HTML 검증
- ✅ 섹션별 구조화된 편집
- ✅ 이미지 URL 관리

### 지원 페이지 현황 (총 19개)

#### 편집 가능 페이지 (13개)
| 페이지 | 설명 | 편집 요소 수 |
|--------|------|--------------|
| index | 메인 페이지 | 25개 |
| botox | 보톡스 | 34개 |
| diet | 다이어트 | 38개 |
| lifting | 리프팅 | 23개 |
| filler | 필러 | 26개 |
| jeomin | 제오민 | 24개 |
| skinbooster | 스킨부스터 | 26개 |
| acne | 여드름치료 | 25개 |
| hair-removal | 제모 | 22개 |
| peeling | 필링 | 24개 |
| mole | 점 | 26개 |
| milia | 비립종 | 13개 |
| tattoo | 문신제거 | 16개 |

#### 편집 요소 없는 페이지 (6개)
- about (병원 소개)
- board-page (공지 및 이벤트)
- calendar-page (온라인 상담)
- fee-schedule (비급여 수가표)
- privacy (개인정보 처리방침)
- stipulation (이용약관)

---

## 아키텍처

### 시스템 구조도

```
┌─────────────────────────────────────────────────────────────┐
│                     사용자 브라우저                          │
├─────────────────────────────────────────────────────────────┤
│  CMS 관리자                    │  일반 사용자                 │
│  cms.one-q.xyz/admin           │  misopin.one-q.xyz          │
└──────────┬──────────────────────┴─────────────┬──────────────┘
           │                                     │
           │ HTTPS                               │ HTTPS
           ▼                                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    Caddy Web Server                           │
│                    (VPS: 141.164.60.51)                       │
├──────────────────────────────────────────────────────────────┤
│  /api/*  ──────► Next.js (port 3001)                         │
│  /*.html ──────► /var/www/misopin-cms/.next/.../static-pages │
│  /css,js ──────► /var/www/misopin.com                        │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Next.js CMS App                            │
├──────────────────────────────────────────────────────────────┤
│  • StaticPageEditor.tsx (편집 UI)                            │
│  • /api/admin/static-pages/[slug]/elements (저장 API)       │
│  • attribute-updater.ts (HTML 파일 수정)                     │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                        │
├──────────────────────────────────────────────────────────────┤
│  • static_pages (페이지 메타데이터)                          │
│  • editable_elements (편집 가능 요소)                        │
│  • static_page_versions (버전 히스토리)                      │
└──────────────────────────────────────────────────────────────┘
```

### 데이터 흐름

#### 1. 편집 및 저장 프로세스
```
1. 사용자가 CMS에서 텍스트 편집
   ↓
2. StaticPageEditor.tsx에서 변경사항 감지
   ↓
3. "저장" 버튼 클릭 시 API 호출
   POST /api/admin/static-pages/[slug]/elements
   Body: { updates: [{elementId, newValue, elementType}] }
   ↓
4. 서버 측 검증 (XSS, 빈 값 체크)
   ↓
5. DOMPurify로 HTML 새니타이즈
   ↓
6. Cheerio로 HTML 파일 파싱 및 업데이트
   ↓
7. 백업 파일 생성 (.backup)
   ↓
8. 실제 HTML 파일 저장
   /var/www/misopin-cms/.next/standalone/public/static-pages/
   ↓
9. 데이터베이스 동기화
   ↓
10. 성공 응답 반환
```

#### 2. 라이브 사이트 반영
```
사용자가 misopin.one-q.xyz/botox.html 접속
   ↓
Caddy가 요청 수신
   ↓
handle /*.html 규칙 적용
   ↓
/var/www/misopin-cms/.next/standalone/public/static-pages/botox.html 제공
   ↓
CSS/JS/이미지는 /var/www/misopin.com에서 제공
```

---

## CMS 사용 가이드

### 관리자 접속

1. **CMS 로그인**
   - URL: `https://cms.one-q.xyz/admin`
   - 관리자 계정으로 로그인

2. **정적 페이지 관리**
   - 좌측 메뉴: "정적 페이지 관리" 클릭
   - 또는 직접 URL: `https://cms.one-q.xyz/admin/static-pages`

### 페이지 편집하기

#### 1. 페이지 목록에서 선택
```
정적 페이지 목록 화면
├─ 메인 페이지 (index)
├─ 보톡스 (botox)
├─ 리프팅 (lifting)
└─ ... (기타 페이지들)
```

각 페이지 카드에서 "편집" 버튼 클릭

#### 2. 편집 화면 구조
```
┌─────────────────────────────────────────────┐
│  [저장] [취소]              마지막 저장: XX분 전 │
├─────────────────────────────────────────────┤
│  메인 페이지 편집                             │
│  각 섹션을 클릭하여 펼치고, 내용을 수정하세요  │
├─────────────────────────────────────────────┤
│  🏠 메인 슬라이드            [▼] 3개 항목    │
│  ├─ 📝 슬라이드 1 제목                       │
│  │   [온다리프팅________________]            │
│  ├─ 📝 슬라이드 1 설명                       │
│  │   [텍스트 영역______________]            │
│  └─ 🖼️ 슬라이드 1 이미지                    │
│      [이미지 URL_____________]               │
├─────────────────────────────────────────────┤
│  💉 시술 소개               [▼] 5개 항목     │
│  └─ ... (섹션 클릭 시 펼쳐짐)                │
└─────────────────────────────────────────────┘
```

#### 3. 요소 타입별 편집 방법

**TEXT (일반 텍스트)**
- 한 줄 또는 여러 줄 텍스트
- Enter로 줄바꿈 (자동으로 `<br>` 태그로 변환)
- 예: 제목, 설명 문구

**HTML (서식 있는 텍스트)**
- 직접 HTML 편집 가능
- 굵게, 이탤릭, 링크 등 서식 포함
- `contentEditable` 방식으로 편집
- 예: 상세 설명, 리스트

**IMAGE (이미지)**
- 이미지 URL 입력
- 미리보기 자동 표시
- URL 오류 시 "이미지 없음" 표시
- 예: `/images/botox-main.jpg`

**BACKGROUND (배경 이미지)**
- 현재 편집 UI에서 제외됨
- 이미지 URL은 별도 관리 필요

#### 4. 저장하기

1. 콘텐츠 수정 완료
2. 상단의 **[저장]** 버튼 클릭
3. 저장 중... 표시
4. 성공 시: "저장되었습니다" 메시지
5. 실패 시: 오류 메시지 표시

#### 5. 변경사항 확인

저장 후 즉시:
- 라이브 사이트에서 확인: `https://misopin.one-q.xyz/[페이지].html`
- 예: 보톡스 페이지 수정 후 → `https://misopin.one-q.xyz/botox.html`

---

## 배포 및 도메인 설정

### 현재 배포 환경

```yaml
서버: VPS (141.164.60.51)
웹서버: Caddy v2.10.2
앱: Next.js 15.5.3 (standalone build)
데이터베이스: PostgreSQL
임시 도메인: misopin.one-q.xyz
```

### Caddy 설정 파일 위치
```
/etc/caddy/Caddyfile
```

### 현재 Caddyfile 구조

```caddy
# misopin.one-q.xyz - Static pages
misopin.one-q.xyz {
    # 기본 root: CSS/JS/이미지용
    root * /var/www/misopin.com

    # API 요청은 CMS로 프록시
    handle /api/* {
        reverse_proxy localhost:3001
    }

    # HTML 파일은 CMS 경로에서 제공
    handle /*.html {
        root * /var/www/misopin-cms/.next/standalone/public/static-pages
        try_files {path}
        file_server
    }

    # 루트 경로도 CMS의 index.html로
    handle / {
        root * /var/www/misopin-cms/.next/standalone/public/static-pages
        try_files /index.html
        file_server
    }

    # 나머지 파일은 기존 경로
    handle {
        file_server
    }

    # 압축
    encode gzip

    # 보안 헤더
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
    }

    # 이미지 캐싱 (30일)
    header @images Cache-Control "public, max-age=2592000"
    @images {
        path *.jpg *.jpeg *.png *.gif *.webp *.svg *.ico *.mp4
    }

    # CSS/JS 캐싱 (7일)
    header @static Cache-Control "public, max-age=604800"
    @static {
        path *.css *.js
    }

    # HTML no-cache
    header @html Cache-Control "no-cache, no-store, must-revalidate"
    @html {
        path *.html /
    }

    # 로깅
    log {
        output file /var/log/caddy/misopin-static.log
    }
}
```

### 도메인 변경 가이드 (최종 납품 시)

#### 1. Caddyfile 수정

VPS에 SSH 접속:
```bash
ssh user@141.164.60.51
```

Caddyfile 편집:
```bash
sudo nano /etc/caddy/Caddyfile
```

**변경 전:**
```caddy
misopin.one-q.xyz {
    # ... 설정들 ...
}
```

**변경 후:**
```caddy
your-production-domain.com {  # 실제 도메인으로 변경
    # ... 동일한 설정들 ...
}
```

#### 2. Caddy 재시작

```bash
# 설정 파일 문법 검사
sudo caddy validate --config /etc/caddy/Caddyfile

# Caddy 재시작 (추천: 무중단)
sudo systemctl reload caddy

# 또는 전체 재시작
sudo systemctl restart caddy

# 상태 확인
sudo systemctl status caddy
```

#### 3. DNS 설정

도메인 관리 페이지에서 A 레코드 추가:

```
Type    Name    Value           TTL
A       @       141.164.60.51   3600
A       www     141.164.60.51   3600
```

#### 4. SSL 인증서 자동 발급 확인

Caddy는 자동으로 Let's Encrypt SSL 인증서를 발급합니다.

로그 확인:
```bash
sudo journalctl -u caddy -f
```

정상 발급 시 로그:
```
[INFO] obtaining certificate for your-domain.com
[INFO] certificate obtained successfully
```

#### 5. 변경하지 않아도 되는 것들

✅ **그대로 유지:**
- HTML 파일 경로
- CSS/JS/이미지 경로
- API 포트 설정
- Next.js 앱 설정
- 데이터베이스 설정
- 모든 CMS 설정

❌ **변경 필요:**
- Caddyfile의 도메인 부분만
- DNS A 레코드

### 파일 경로 정리

```
/var/www/
├── misopin.com/                          # 기존 정적 리소스
│   ├── css/                              # CSS 파일들
│   ├── js/                               # JavaScript 파일들
│   ├── images/                           # 이미지 파일들
│   └── ...
│
└── misopin-cms/
    └── .next/
        └── standalone/
            └── public/
                └── static-pages/          # CMS 관리 HTML 파일
                    ├── index.html         # ✅ CMS에서 편집됨
                    ├── botox.html         # ✅ CMS에서 편집됨
                    ├── lifting.html       # ✅ CMS에서 편집됨
                    ├── diet.html          # ✅ CMS에서 편집됨
                    └── ...                # 나머지 페이지들
```

---

## 문제 해결

### 편집 후 저장 실패

#### 증상
- "저장 실패" 메시지 표시
- 400 에러 응답

#### 해결 방법

**1. 브라우저 개발자 도구 확인**
```
F12 → Network 탭 → elements 요청 확인
```

**2. 요청 Payload 확인**
```json
{
  "updates": [
    {
      "elementId": "index-slide1-title",
      "newValue": "수정된 텍스트",
      "elementType": "TEXT"
    }
  ]
}
```

**3. 응답 에러 확인**
```json
{
  "success": false,
  "error": "에러 메시지",
  "code": "VALIDATION_ERROR"
}
```

**4. 일반적인 에러 원인**

| 에러 메시지 | 원인 | 해결 |
|------------|------|------|
| updates 배열이 필요합니다 | Payload 형식 오류 | 개발자 도구에서 요청 확인 |
| 각 업데이트는 elementId, newValue, elementType을 포함해야 합니다 | 필수 필드 누락 | 요소 타입 확인 |
| Invalid background image URL | BACKGROUND 요소를 텍스트로 편집 | 이미지 URL 확인 |
| XSS validation failed | 위험한 스크립트 감지 | 허용된 HTML 태그만 사용 |

### 편집은 되지만 사이트에 반영 안 됨

#### 원인
- Caddy 설정 문제
- HTML 파일 경로 불일치
- 캐시 문제

#### 확인 단계

**1. HTML 파일이 실제로 수정되었는지 확인**
```bash
ssh user@141.164.60.51

# 파일 수정 시간 확인
ls -lh /var/www/misopin-cms/.next/standalone/public/static-pages/index.html

# 파일 내용 확인
grep "수정한텍스트" /var/www/misopin-cms/.next/standalone/public/static-pages/index.html
```

**2. Caddy 설정 확인**
```bash
# Caddyfile 확인
cat /etc/caddy/Caddyfile

# Caddy 상태 확인
sudo systemctl status caddy

# Caddy 로그 확인
sudo journalctl -u caddy -n 50
```

**3. 브라우저 캐시 제거**
- Ctrl+Shift+R (하드 리로드)
- 또는 시크릿 모드로 확인

**4. Caddy 재시작**
```bash
sudo systemctl reload caddy
```

### CSS/이미지가 깨짐

#### 원인
Caddyfile에서 리소스 경로 설정 오류

#### 확인
```bash
# F12 → Network 탭에서 404 에러 확인

# 올바른 경로 확인
ls -la /var/www/misopin.com/css/
ls -la /var/www/misopin.com/images/
```

#### 해결
Caddyfile에서 기본 root 경로 확인:
```caddy
misopin.one-q.xyz {
    root * /var/www/misopin.com  # 이 경로가 맞는지 확인
    # ...
}
```

### 데이터베이스 확인

#### 등록된 페이지 확인
```bash
cd /var/www/misopin-cms
npx tsx scripts/check-static-pages.ts
```

출력 예시:
```
📋 CMS에 등록된 정적 페이지 확인...

총 19개 페이지 등록됨:

1. index
   제목: 메인 페이지
   파일: /var/www/misopin-cms/.next/standalone/public/static-pages/index.html
   편집 가능 요소: 25개
```

---

## 기술 상세

### 주요 기술 스택

```yaml
Frontend:
  - React 19
  - Next.js 15.5.3 (App Router)
  - TypeScript
  - Tailwind CSS

Backend:
  - Next.js API Routes
  - Prisma ORM
  - PostgreSQL

HTML Processing:
  - Cheerio (서버 사이드 HTML 파싱)
  - DOMPurify (XSS 보호)

Web Server:
  - Caddy v2.10.2
  - 자동 HTTPS (Let's Encrypt)

Deployment:
  - VPS (Ubuntu/Debian)
  - PM2 (프로세스 관리)
  - Systemd (Caddy 서비스)
```

### 데이터베이스 스키마

#### static_pages 테이블
```prisma
model static_pages {
  id                   String                 @id
  slug                 String                 @unique
  title                String
  filePath             String
  sections             Json                   // 섹션 메타데이터
  lastEdited           DateTime
  createdAt            DateTime               @default(now())
  editMode             EditMode               @default(PARSER)
  lastParsedAt         DateTime?
  lastSyncedAt         DateTime?
  syncStatus           SyncStatus             @default(SYNCED)
  version              Int                    @default(1)
  editable_elements    editable_elements[]
  static_page_versions static_page_versions[]
}
```

#### editable_elements 테이블
```prisma
model editable_elements {
  id               String       @id
  pageId           String
  elementId        String       // data-editable 속성값
  elementType      ElementType  // TEXT, HTML, IMAGE, BACKGROUND
  selector         String       // CSS selector
  label            String       // 표시 라벨
  sectionName      String       // 섹션 그룹
  defaultValue     String?
  currentValue     String?
  order            Int          @default(0)
  static_pages     static_pages @relation(...)
}
```

### API 엔드포인트

#### GET /api/admin/static-pages/[slug]/editable-elements
페이지의 편집 가능한 요소 조회

**응답:**
```json
{
  "success": true,
  "sections": [
    {
      "sectionName": "hero",
      "displayName": "메인 슬라이드",
      "emoji": "🏠",
      "description": "메인 페이지 상단 슬라이드",
      "order": 1,
      "elementCount": 3,
      "elements": [
        {
          "id": "index-slide1-title",
          "type": "text",
          "selector": "[data-editable='index-slide1-title']",
          "content": "온다리프팅",
          "label": "index-slide1-title",
          "friendlyLabel": "슬라이드 1 제목",
          "icon": "📝",
          "order": 1
        }
      ]
    }
  ],
  "pageId": "...",
  "pageTitle": "메인 페이지",
  "totalSections": 5,
  "totalElements": 25
}
```

#### PATCH /api/admin/static-pages/[slug]/elements
페이지 요소 일괄 업데이트

**요청:**
```json
{
  "updates": [
    {
      "elementId": "index-slide1-title",
      "newValue": "수정된 제목",
      "elementType": "TEXT"
    },
    {
      "elementId": "botox-intro-html",
      "newValue": "<p>서식 있는 <strong>텍스트</strong></p>",
      "elementType": "HTML"
    }
  ]
}
```

**응답:**
```json
{
  "success": true,
  "message": "2개 요소가 성공적으로 업데이트되었습니다",
  "updated": 2,
  "failed": 0,
  "filePath": "/var/www/.../index.html"
}
```

### HTML 마크업 규칙

#### 편집 가능 요소 마킹

**TEXT 요소:**
```html
<h3 data-editable="index-slide1-title"
    data-section="hero"
    data-type="text">
  온다리프팅
</h3>
```

**HTML 요소:**
```html
<div data-editable="botox-intro-content"
     data-section="intro"
     data-type="html">
  <p>서식 있는 <strong>텍스트</strong></p>
</div>
```

**IMAGE 요소:**
```html
<img data-editable="hero-image"
     data-section="hero"
     data-type="image"
     src="/images/hero.jpg"
     alt="Hero Image">
```

**BACKGROUND 요소:**
```html
<div data-editable="section-bg"
     data-section="hero"
     data-type="background"
     style="background-image: url('/images/bg.jpg')">
</div>
```

### 보안 기능

#### XSS 보호
DOMPurify를 사용한 HTML 새니타이즈:

```typescript
// 허용된 HTML 태그 (HTML 타입)
ALLOWED_TAGS: [
  'p', 'br', 'strong', 'em', 'u', 'a',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre'
]

// 허용된 속성 (HTML 타입)
ALLOWED_ATTR: ['href', 'target', 'rel', 'class']

// TEXT 타입은 모든 태그 제거
```

#### 검증 로직

```typescript
// 1. 필수 필드 검증
if (!update.elementId ||
    update.newValue === undefined ||
    update.newValue === null ||
    !update.elementType) {
  return 400 에러
}

// 2. 이미지 URL 검증
if (elementType === 'IMAGE' || elementType === 'BACKGROUND') {
  if (!isValidImageUrl(newValue)) {
    return 400 에러
  }
}

// 3. HTML 새니타이즈
const sanitized = DOMPurify.sanitize(html, options);
```

### 백업 및 복구

#### 자동 백업
모든 수정 시 자동으로 백업 파일 생성:

```
원본: /var/www/.../index.html
백업: /var/www/.../index.html.backup.1730700000000
```

#### 복구 방법
```bash
# 백업 파일 확인
ls -lt /var/www/misopin-cms/.next/standalone/public/static-pages/*.backup.*

# 복구 (최신 백업으로)
cp /var/www/.../index.html.backup.1730700000000 \
   /var/www/.../index.html
```

### 성능 최적화

#### 캐싱 전략

```caddy
# 이미지: 30일 캐싱
Cache-Control: public, max-age=2592000

# CSS/JS: 7일 캐싱
Cache-Control: public, max-age=604800

# HTML: 캐시 사용 안 함 (항상 최신)
Cache-Control: no-cache, no-store, must-revalidate
```

#### Gzip 압축
모든 응답에 자동 적용:
```caddy
encode gzip
```

---

## 부록

### 유용한 명령어 모음

#### VPS 접속
```bash
ssh user@141.164.60.51
```

#### Caddy 관리
```bash
# 상태 확인
sudo systemctl status caddy

# 재시작 (무중단)
sudo systemctl reload caddy

# 전체 재시작
sudo systemctl restart caddy

# 로그 확인
sudo journalctl -u caddy -f

# 설정 검증
sudo caddy validate --config /etc/caddy/Caddyfile
```

#### Next.js 앱 관리
```bash
# PM2로 관리하는 경우
pm2 list
pm2 restart misopin-cms
pm2 logs misopin-cms

# 또는 systemd로 관리하는 경우
sudo systemctl status misopin-cms
sudo systemctl restart misopin-cms
```

#### 파일 확인
```bash
# HTML 파일 목록
ls -lh /var/www/misopin-cms/.next/standalone/public/static-pages/

# 최근 수정된 파일
ls -lt /var/www/misopin-cms/.next/standalone/public/static-pages/

# 파일 내용 검색
grep "검색어" /var/www/misopin-cms/.next/standalone/public/static-pages/index.html
```

#### 데이터베이스
```bash
# Prisma Studio (GUI)
npx prisma studio

# 페이지 목록 확인 스크립트
npx tsx scripts/check-static-pages.ts
```

### 문의 및 지원

#### 개발 문서
- 이 파일: `/docs/STATIC_PAGES_CMS_GUIDE.md`
- API 문서: `/docs/API.md` (별도 작성 필요 시)

#### 로그 위치
```
Caddy: /var/log/caddy/misopin-static.log
Next.js: PM2 또는 systemd 로그
Database: PostgreSQL 로그
```

---

**최종 업데이트:** 2025-11-03
**버전:** 1.0.0
**작성자:** Development Team
