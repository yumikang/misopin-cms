# 미소핀의원 CMS

병원 컨텐츠 관리 시스템 - Next.js 14 + Prisma + PostgreSQL

## 🏗️ 프로젝트 구조

### 하이브리드 아키텍처
- **기존 정적 사이트**: `/` 경로 (SEO 최적화, 빠른 로딩)
- **CMS 관리자**: `/admin` 경로 (Next.js 14 App Router)
- **API 백엔드**: `/api` 경로 (Prisma + PostgreSQL)

### 기술 스택
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS v4
- **Backend**: Prisma ORM, PostgreSQL
- **Authentication**: NextAuth.js + JWT
- **UI Components**: Shadcn UI (계획)
- **이미지 최적화**: Cloudinary (계획)

## 🎨 디자인 시스템

### 기존 미소핀 테마 호환
- **Primary Color**: `#38b0c9`
- **Brown Theme**: `#9F988C`
- **Korean Font**: `'Freesentation'`, `'Malgun Gothic'`
- **Container**: 1450px max-width
- **Responsive**: 모바일(15px), 태블릿(20px), 데스크톱(30px) 패딩

### CSS 아키텍처
```
css/
├── vendor/default.css     # CSS 초기화, 기본 설정
├── vendor/user.css        # CSS 변수, 주요 스타일
├── components/            # 재사용 컴포넌트 스타일
├── pages/                 # 페이지별 스타일
├── responsive.css         # 반응형 스타일
└── grid-system-1450.css   # 1450px 그리드 시스템
```

## 🚀 개발 환경 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.local` 파일에 다음 내용 설정:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/misopin_cms"
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. 데이터베이스 설정
```bash
# Docker로 PostgreSQL 실행 (Docker 필요)
npm run docker:up

# Prisma 마이그레이션
npm run db:push
npm run db:generate
```

### 4. 개발 서버 실행
```bash
npm run dev
```

## 📦 주요 스크립트

```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 검사

# 데이터베이스
npm run db:generate  # Prisma 클라이언트 생성
npm run db:push      # 스키마 푸시
npm run db:migrate   # 마이그레이션 실행
npm run db:studio    # Prisma Studio 실행

# Docker
npm run docker:up    # 컨테이너 실행
npm run docker:down  # 컨테이너 중지
```

## 🏥 CMS 기능

### 1. 페이지 관리
- 기존 HTML 페이지 (about.html 등)를 JSON 구조로 관리
- 위지윅 에디터를 통한 컨텐츠 편집
- SEO 메타데이터 관리

### 2. 예약 관리
- 병원 예약 접수 및 상태 관리
- 날짜별 예약 현황 확인
- 예약 충돌 검사

### 3. 팝업 관리
- 웹사이트 팝업 생성 및 스케줄링
- 위치 설정 및 우선순위 관리
- 활성화/비활성화 제어

### 4. 게시판 관리
- 공지사항, 이벤트, FAQ 게시판
- 게시글 작성/수정/삭제
- 상단 고정 및 공개/비공개 설정

## 🔐 인증 및 권한

### 사용자 역할
- **SUPER_ADMIN**: 시스템 전체 관리
- **ADMIN**: 일반 관리 권한
- **EDITOR**: 컨텐츠 편집 권한

### 보안 기능
- NextAuth.js JWT 기반 인증
- bcrypt 패스워드 해싱
- Role-based 접근 제어
- CSRF 보호

## 📱 반응형 디자인

### 브레이크포인트
- **모바일**: `max-width: 767px`
- **태블릿**: `768px ~ 1023px`
- **데스크톱**: `min-width: 1024px`

### 그리드 시스템
- 12컬럼 Flexbox 그리드
- 1450px 최대 너비 컨테이너
- 반응형 패딩 시스템

## 📊 모니터링

### API 엔드포인트
- **Health Check**: `/api/health`
- **데이터베이스 상태**: 자동 연결 테스트
- **서비스 상태**: 실시간 모니터링

## 🔗 관련 링크

- **관리자 패널**: `/admin` (구현 예정)
- **기존 사이트**: `/about.html`
- **API 상태**: `/api/health`

---

**개발 상태**: 🚧 1단계 - 프로젝트 환경 설정 완료
**다음 단계**: Prisma 스키마 구현 및 데이터베이스 초기화
