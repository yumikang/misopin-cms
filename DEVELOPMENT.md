# 미소핀의원 CMS 개발 문서

## 프로젝트 개요

미소핀의원을 위한 종합 콘텐츠 관리 시스템(CMS)으로, 예약 관리, 게시판 관리, 팝업 관리, 페이지 관리 등의 기능을 제공합니다.

## 기술 스택

### Frontend
- **Next.js 15.5.3** - React 프레임워크
- **TypeScript** - 정적 타입 체크
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크
- **Radix UI** - 접근 가능한 UI 컴포넌트
- **Lucide React** - 아이콘 라이브러리
- **date-fns** - 날짜 처리 라이브러리

### Backend
- **NextAuth.js** - 인증 시스템
- **Prisma** - ORM 및 데이터베이스 관리
- **PostgreSQL** - 데이터베이스
- **bcryptjs** - 비밀번호 해싱
- **jsonwebtoken** - JWT 토큰 처리

### UI/UX
- **shadcn/ui** - UI 컴포넌트 시스템
- **Sonner** - 토스트 알림 시스템
- **class-variance-authority** - 조건부 스타일링

## 데이터베이스 설계

### 주요 모델

#### User (사용자)
- **역할**: SUPER_ADMIN, ADMIN, EDITOR
- **기능**: 역할 기반 접근 제어
- **인증**: 이메일/비밀번호 기반 로그인

#### Reservation (예약)
- **환자 정보**: 이름, 연락처, 생년월일, 성별
- **예약 정보**: 진료 유형, 희망 날짜/시간, 서비스
- **상태 관리**: PENDING, CONFIRMED, CANCELLED, COMPLETED

#### BoardPost (게시글)
- **게시판 유형**: NOTICE, EVENT (정적 페이지와 연동)
- **컨텐츠**: 제목, 내용, 요약, 태그, 이미지
- **메타 정보**: 작성자, 조회수, 발행 상태, 고정 여부

#### Popup (팝업)
- **컨텐츠**: 제목, 내용, 이미지, 링크
- **표시 설정**: 위치, 크기, 표시 기간, 우선순위
- **유형**: MODAL, BANNER, SLIDE_IN

#### Page (페이지)
- **기본 정보**: 슬러그, 제목, 버전
- **컨텐츠**: JSON 구조 또는 HTML
- **SEO**: 메타 제목, 설명, 키워드
- **상태**: 발행/임시저장

## 아키텍처

### 폴더 구조
```
src/
├── app/                      # Next.js App Router
│   ├── admin/               # 관리자 페이지
│   │   ├── board/          # 게시판 관리
│   │   ├── pages/          # 페이지 관리
│   │   ├── popups/         # 팝업 관리 (구현 예정)
│   │   └── reservations/   # 예약 관리 (구현 예정)
│   ├── api/                # API 라우트
│   │   ├── auth/           # 인증 관련
│   │   ├── board-posts/    # 게시글 API
│   │   ├── pages/          # 페이지 API
│   │   ├── popups/         # 팝업 API (구현 예정)
│   │   └── reservations/   # 예약 API (구현 예정)
│   └── (auth)/             # 인증 관련 페이지
├── components/
│   ├── admin/              # 관리자 전용 컴포넌트
│   │   ├── board/          # 게시판 관리 컴포넌트
│   │   └── pages/          # 페이지 관리 컴포넌트
│   ├── layout/             # 레이아웃 컴포넌트
│   ├── providers/          # Context Providers
│   └── ui/                 # 재사용 가능한 UI 컴포넌트
├── lib/                    # 유틸리티 및 설정
└── prisma/                 # 데이터베이스 스키마 및 시드
```

### API 설계

#### RESTful API 패턴
- **GET** `/api/{resource}` - 목록 조회 (페이지네이션, 필터링, 검색)
- **POST** `/api/{resource}` - 새 리소스 생성
- **GET** `/api/{resource}/{id}` - 특정 리소스 조회
- **PUT** `/api/{resource}/{id}` - 리소스 수정
- **DELETE** `/api/{resource}/{id}` - 리소스 삭제

#### 공통 응답 형식
```typescript
// 목록 조회 응답
{
  [resourceName]: Array<Resource>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}

// 오류 응답
{
  error: string
}
```

## 구현된 기능

### ✅ 완료된 기능

#### 1. 인증 시스템
- NextAuth.js 기반 이메일/비밀번호 인증
- 역할 기반 접근 제어 (SUPER_ADMIN, ADMIN, EDITOR)
- 세션 관리 및 보호된 라우트

#### 2. 예약 관리 CRUD
- **API**: `/api/reservations` (완전한 CRUD 지원)
- **기능**:
  - 예약 목록 조회 (페이지네이션, 검색, 필터링)
  - 예약 상세 정보 및 관리자 메모
  - 상태 변경 (대기중 → 확정 → 완료/취소)
  - 환자 정보 관리
- **UI**: 반응형 디자인, 실시간 상태 업데이트

#### 3. 팝업 관리 CRUD
- **API**: `/api/popups` (완전한 CRUD 지원)
- **기능**:
  - 팝업 목록 및 상세 관리
  - 표시 기간 및 위치 설정
  - 우선순위 및 활성화 상태 관리
  - 다양한 팝업 유형 지원 (모달, 배너, 슬라이드인)
- **UI**: 직관적인 설정 인터페이스

#### 4. 게시판 관리 CRUD
- **API**: `/api/board-posts` (완전한 CRUD 지원)
- **기능**:
  - Notice/Event 게시판 (정적 페이지와 연동)
  - 게시글 작성, 수정, 삭제
  - 임시저장/발행 상태 관리
  - 고정글 및 태그 기능
  - 조회수 관리
- **UI**: 카드 기반 목록, 고급 필터링

#### 5. 페이지 관리 CRUD
- **API**: `/api/pages` (완전한 CRUD 지원)
- **기능**:
  - 구조화된 페이지 컨텐츠 관리 (JSON/HTML)
  - SEO 메타데이터 관리
  - 슬러그 기반 URL 관리
  - 버전 관리 시스템
  - 발행/임시저장 상태
- **UI**: 코드 에디터, 메타데이터 폼, 미리보기

#### 6. 데이터베이스 정규화
- BoardType enum 수정 (NOTICE, EVENT만 유지)
- 정적 페이지 구조와 일치하도록 조정
- 샘플 데이터 추가 (사용자, 예약, 팝업, 게시글, 페이지)

#### 7. 시스템 설정 관리
- **API**: `/api/settings`, `/api/settings/key` (완전한 CRUD 지원)
- **기능**:
  - 사이트 기본 설정 (이름, 로고, 연락처, 주소, 운영시간)
  - SMTP 이메일 설정 (서버, 포트, 인증, 템플릿)
  - 파일 업로드 설정 (크기 제한, 허용 형식, 압축)
  - 보안 설정 (세션, 비밀번호 정책, 2FA)
  - Key-Value 기반 유연한 설정 구조
  - 카테고리별 탭 인터페이스
- **UI**: React Hook Form 통합, 실시간 검증, 변경사항 감지
- **권한**: ADMIN 조회, SUPER_ADMIN 수정

### 🔄 진행 중인 기능

## 주요 특징

### 1. 정적 페이지 연동
- 기존 HTML 페이지와 CMS 연동
- BoardType이 정적 페이지 카테고리와 일치
- 일관된 사용자 경험 제공

### 2. 역할 기반 접근 제어
- SUPER_ADMIN: 모든 기능 접근
- ADMIN: 예약, 팝업, 게시판, 페이지 관리
- EDITOR: 게시판 관리만 가능

### 3. 반응형 디자인
- 모바일 퍼스트 접근법
- 태블릿 및 데스크톱 최적화
- 접근성 고려한 UI/UX

### 4. 성능 최적화
- Server-side Rendering (SSR)
- 이미지 최적화
- 코드 스플리팅
- 캐싱 전략

## 개발 환경 설정

### 1. 요구사항
```bash
Node.js >= 18.0.0
PostgreSQL >= 13.0
npm >= 8.0.0
```

### 2. 설치 및 실행
```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 시드 데이터 추가
npx prisma db seed

# 개발 서버 실행
npm run dev

# Podman/Docker로 PostgreSQL 실행
podman run --name postgres-misopin -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

### 3. 환경 변수
```env
DATABASE_URL="postgresql://username:password@localhost:5432/misopin_cms"
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-key"
```

## 배포 가이드

### 1. 프로덕션 빌드
```bash
npm run build
npm start
```

### 2. 데이터베이스 배포
```bash
npx prisma migrate deploy
npx prisma db seed
```

### 3. 환경별 설정
- 개발: `npm run dev`
- 스테이징: `npm run build && npm start`
- 프로덕션: Docker 컨테이너 또는 Vercel 배포

## 보안 고려사항

### 1. 인증 및 인가
- JWT 토큰 기반 세션 관리
- 비밀번호 bcrypt 해싱
- CSRF 보호
- 역할 기반 라우트 보호

### 2. 데이터 검증
- 서버사이드 입력 검증
- SQL 인젝션 방지 (Prisma ORM)
- XSS 방지 (React 기본 보호)

### 3. API 보안
- 인증된 요청만 허용
- Rate Limiting (구현 예정)
- CORS 설정

## 테스트 전략

### 1. 단위 테스트
- API 라우트 테스트
- 컴포넌트 테스트
- 유틸리티 함수 테스트

### 2. 통합 테스트
- 데이터베이스 연동 테스트
- 인증 플로우 테스트
- API 엔드포인트 테스트

### 3. E2E 테스트
- 사용자 시나리오 테스트
- 크로스 브라우저 테스트
- 접근성 테스트

## 성능 모니터링

### 1. 메트릭
- 페이지 로드 시간
- API 응답 시간
- 데이터베이스 쿼리 성능
- 사용자 행동 분석

### 2. 최적화 전략
- 이미지 최적화 및 CDN
- 데이터베이스 인덱싱
- 캐싱 전략 (Redis 구현 예정)
- 번들 크기 최적화

## 향후 계획

### 1. 기능 확장
- 파일 업로드 시스템
- 이메일 알림 시스템
- 백업 및 복원 기능
- 멀티 언어 지원

### 2. 성능 개선
- Redis 캐싱
- CDN 연동
- 이미지 최적화 파이프라인
- 데이터베이스 최적화

### 3. 사용자 경험
- 실시간 알림
- 드래그 앤 드롭 UI
- 고급 검색 기능
- 데이터 내보내기

## 문제 해결

### 1. 일반적인 문제
- 데이터베이스 연결 오류
- 인증 토큰 만료
- 권한 관련 오류
- 빌드 오류

### 2. 디버깅 도구
- Prisma Studio (데이터베이스 GUI)
- Next.js DevTools
- React Developer Tools
- 브라우저 DevTools

## 기여 가이드라인

### 1. 코드 스타일
- TypeScript strict 모드
- ESLint 및 Prettier 설정 준수
- 컴포넌트 네이밍 규칙
- 함수형 컴포넌트 사용

### 2. 커밋 메시지
```
type(scope): description

feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 변경
style: 코드 스타일 변경
refactor: 리팩토링
test: 테스트 추가/수정
chore: 빌드 관련 변경
```

### 3. 브랜치 전략
- `main`: 프로덕션 배포
- `develop`: 개발 통합
- `feature/*`: 기능 개발
- `hotfix/*`: 긴급 수정

---

**문서 버전**: 1.1
**최종 업데이트**: 2025년 9월 16일
**작성자**: Claude Code AI Assistant