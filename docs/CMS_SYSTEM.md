# CMS 관리 시스템 개발 문서

## 📌 개요
CMS 관리자를 위한 팝업 및 게시판 관리 기능 구현

## 🎯 구현 목표

### 팝업 관리
- 관리자가 웹사이트에 표시할 팝업을 쉽게 생성하고 관리
- 유연한 팝업 설정 옵션 제공 (표시 기간, 위치, 유형 등)
- 안전한 폼 검증 및 에러 처리

### 게시판 관리
- 공지사항, 이벤트 등 다양한 타입의 게시글 작성
- 태그 시스템과 공개/고정 설정 제공
- 작성자 정보 자동 연동

## 🏗️ 기술 스택

### Frontend
- **Framework**: Next.js 15.5.3 (App Router)
- **Language**: TypeScript
- **Form Management**: React Hook Form
- **Validation**: Zod Schema
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend
- **API Routes**: Next.js API Routes
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL
- **ORM**: Prisma

## 📂 파일 구조

```
src/
├── app/(admin)/admin/
│   ├── popups/
│   │   ├── page.tsx              # 팝업 목록 페이지
│   │   └── create/
│   │       └── page.tsx          # 팝업 생성 페이지
│   └── board/
│       ├── page.tsx              # 게시판 목록 페이지
│       └── create/
│           └── page.tsx          # 게시글 생성 페이지
├── components/admin/
│   ├── popups/
│   │   ├── popup-form.tsx       # 팝업 폼 컴포넌트
│   │   ├── popup-list.tsx       # 팝업 목록 컴포넌트
│   │   └── popup-filters.tsx    # 팝업 필터 컴포넌트
│   └── board/
│       ├── board-post-form.tsx  # 게시글 폼 컴포넌트
│       ├── board-post-list.tsx  # 게시글 목록 컴포넌트
│       └── board-filters.tsx    # 게시판 필터 컴포넌트
└── app/api/
    ├── popups/
    │   └── route.ts              # 팝업 API 엔드포인트
    └── board-posts/
        └── route.ts              # 게시판 API 엔드포인트
```

## 🔧 주요 기능

### 1. 팝업 생성 폼

#### 기본 정보
- **제목** (필수): 최대 200자
- **내용** (필수): 최대 1000자

#### 표시 설정
- **시작일시** (필수): 팝업 표시 시작 시점
- **종료일시** (필수): 팝업 표시 종료 시점
- **팝업 유형** (필수):
  - MODAL: 모달 팝업
  - BANNER: 배너 팝업
  - SLIDE_IN: 슬라이드인 팝업
- **팝업 위치**: top / center / bottom

#### 고급 설정
- **이미지 URL**: 팝업에 표시할 이미지 (선택)
- **링크 URL**: 클릭 시 이동할 URL (선택)
- **우선순위**: 0-100 (높을수록 우선 표시)
- **즉시 활성화**: 저장 즉시 활성화 여부

### 2. 게시판 생성 폼

#### 기본 정보
- **제목** (필수): 최대 200자
- **내용** (필수): 최대 5000자
- **요약**: 최대 500자 (선택)

#### 게시판 설정
- **게시판 타입**: NOTICE (공지사항), EVENT (이벤트)
- **태그**: 쉼표로 구분된 태그 입력
- **즉시 공개**: 저장 즉시 게시글 공개 여부
- **상단 고정**: 목록 상단에 고정 표시

#### 추가 정보
- **썸네일 이미지 URL**: 게시글 목록 표시용 이미지 (선택)
- **작성자**: 세션 정보에서 자동 설정

## 💾 데이터베이스 스키마

### Popup 모델
```prisma
model Popup {
  id          String   @id @default(cuid())
  title       String
  content     String
  imageUrl    String?
  linkUrl     String?
  isActive    Boolean  @default(false)
  startDate   DateTime
  endDate     DateTime
  position    String   @default("center")
  showOnPages Json?
  displayType String   @default("MODAL")
  priority    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### BoardPost 모델
```prisma
model BoardPost {
  id          String    @id @default(cuid())
  boardType   BoardType
  title       String
  content     String    @db.Text
  excerpt     String?
  author      String
  isPublished Boolean   @default(false)
  isPinned    Boolean   @default(false)
  viewCount   Int       @default(0)
  tags        String[]
  imageUrl    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  publishedAt DateTime?
}

enum BoardType {
  NOTICE
  EVENT
}
```

## ✅ 검증 규칙

### 팝업 검증 (Zod)
```typescript
const popupSchema = z.object({
  title: z.string()
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자 이하로 입력해주세요'),
  content: z.string()
    .min(1, '내용을 입력해주세요')
    .max(1000, '내용은 1000자 이하로 입력해주세요'),
  imageUrl: z.string()
    .url('올바른 URL을 입력해주세요')
    .optional()
    .or(z.literal('')),
  linkUrl: z.string()
    .url('올바른 URL을 입력해주세요')
    .optional()
    .or(z.literal('')),
  startDate: z.string()
    .min(1, '시작일을 선택해주세요'),
  endDate: z.string()
    .min(1, '종료일을 선택해주세요'),
  priority: z.number()
    .min(0, '우선순위는 0 이상이어야 합니다')
    .max(100, '우선순위는 100 이하여야 합니다'),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: '종료일은 시작일보다 늦어야 합니다',
  path: ['endDate']
});
```

### 게시판 검증 (Zod)
```typescript
const boardPostSchema = z.object({
  boardType: z.enum(['NOTICE', 'EVENT'], {
    required_error: "게시판 타입을 선택해주세요",
  }),
  title: z.string()
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자 이하로 입력해주세요'),
  content: z.string()
    .min(1, '내용을 입력해주세요')
    .max(5000, '내용은 5000자 이하로 입력해주세요'),
  excerpt: z.string()
    .max(500, '요약은 500자 이하로 입력해주세요')
    .optional()
    .or(z.literal('')),
  imageUrl: z.string()
    .url('올바른 URL을 입력해주세요')
    .optional()
    .or(z.literal('')),
  tags: z.string().optional(),
  isPublished: z.boolean().default(false),
  isPinned: z.boolean().default(false)
});
```

## 🔐 보안

### 인증 및 권한
- 모든 관리 기능은 인증된 관리자만 접근 가능
- 미인증 접근 시 로그인 페이지로 자동 리다이렉트 (307)
- API 엔드포인트도 인증 확인 (401 Unauthorized)

### 데이터 검증
- 클라이언트: Zod 스키마로 실시간 검증
- 서버: API에서 추가 검증 및 sanitization
- SQL Injection 방지: Prisma ORM 사용

## 🚀 사용 방법

### 1. 팝업 관리
1. 관리자로 로그인
2. `/admin/popups` 페이지 접속
3. "새 팝업" 버튼 클릭
4. 폼 작성 및 저장

### 2. 게시판 관리
1. 관리자로 로그인
2. `/admin/board` 페이지 접속
3. "새 게시글" 버튼 클릭
4. 게시글 작성 및 공개 설정

## 📝 API 엔드포인트

### POST /api/popups
팝업 생성

**Request Body:**
```json
{
  "title": "string",
  "content": "string",
  "imageUrl": "string (optional)",
  "linkUrl": "string (optional)",
  "startDate": "ISO 8601 datetime",
  "endDate": "ISO 8601 datetime",
  "position": "top | center | bottom",
  "displayType": "MODAL | BANNER | SLIDE_IN",
  "priority": "number (0-100)",
  "isActive": "boolean"
}
```

**Response:**
- 201 Created: 팝업 생성 성공
- 400 Bad Request: 검증 실패
- 401 Unauthorized: 인증 필요
- 500 Internal Server Error: 서버 오류

### POST /api/board-posts
게시글 생성

**Request Body:**
```json
{
  "boardType": "NOTICE | EVENT",
  "title": "string",
  "content": "string",
  "excerpt": "string (optional)",
  "author": "string",
  "imageUrl": "string (optional)",
  "tags": ["string"],
  "isPublished": "boolean",
  "isPinned": "boolean"
}
```

**Response:**
- 201 Created: 게시글 생성 성공
- 400 Bad Request: 검증 실패
- 401 Unauthorized: 인증 필요
- 500 Internal Server Error: 서버 오류

## 🛠️ 개발 과정

### MCP 도구 활용
1. **sequential-thinking**: 체계적인 문제 분석 및 해결 방안 도출
2. **shrimp-task-manager**: 8개 세부 태스크로 분해하여 단계별 구현
3. **context7**: React Hook Form 라이브러리 패턴 및 베스트 프랙티스 참조

### 구현 완료 기능

#### 팝업 시스템
1. ✅ 팝업 생성 페이지 라우트 구조
2. ✅ PopupForm 컴포넌트 (React Hook Form + Zod)
3. ✅ 날짜/시간 선택 필드
4. ✅ 팝업 타입 및 위치 설정
5. ✅ API 통합 및 검증
6. ✅ UI/UX 최적화

#### 게시판 시스템
1. ✅ 게시판 생성 페이지 라우트 구조
2. ✅ BoardPostForm 컴포넌트 (React Hook Form + Zod)
3. ✅ 게시판 타입 선택 (공지사항/이벤트)
4. ✅ 태그 시스템 구현
5. ✅ 공개/고정 설정 기능
6. ✅ 세션 기반 작성자 자동 설정
7. ✅ API 통합 및 검증
8. ✅ 반응형 UI 구현

## 📈 향후 개선 사항

### 팝업 시스템
- [ ] 팝업 수정 기능
- [ ] 팝업 삭제 기능
- [ ] 팝업 미리보기 기능
- [ ] 팝업 통계 대시보드

### 게시판 시스템
- [ ] 게시글 수정 기능
- [ ] 게시글 삭제 기능
- [ ] 조회수 카운팅 기능
- [ ] 댓글 시스템
- [ ] 파일 첨부 기능
- [ ] FAQ, 뉴스 타입 추가

### 공통 개선 사항
- [ ] 이미지 업로드 지원
- [ ] 다국어 지원
- [ ] 검색 및 필터링 고도화
- [ ] 대량 작업 기능
- [ ] 활동 로그 및 감사 추적

## 🐛 알려진 이슈

- BoardPostList 컴포넌트에서 Headers Timeout 에러 발생 (팝업 기능과 무관)
- 포트 3000이 사용 중일 때 자동으로 3001로 변경됨

## 📞 문의

CMS 시스템 관련 문의사항이나 버그 리포트는 개발팀에 연락해주세요.

---

*Last Updated: 2025-09-16*
*Version: 2.0.0*
*Changes: 게시판 관리 시스템 추가*