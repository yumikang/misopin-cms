# 미소핀의원 CMS

미소핀의원 웹사이트 관리를 위한 콘텐츠 관리 시스템 (CMS)

## 🚀 프로젝트 정보

- **Production URL**: https://misopin-cms.vercel.app
- **기술 스택**: Next.js 15.5.3, TypeScript, Supabase, Tailwind CSS
- **배포**: Vercel (GitHub 자동 배포)
- **Repository**: https://github.com/yumikang/misopin-cms

## 📋 주요 기능

### 구현 완료
- ✅ 관리자 로그인 시스템 (JWT 인증)
- ✅ 역할 기반 접근 제어 (RBAC)
- ✅ 관리자 대시보드
- ✅ 데이터베이스 자동 초기화 시스템
- ✅ **예약 관리 시스템** - 진료 예약 관리, 시간 슬롯, 상태 추적
- ✅ **팝업 관리** - 모달/레이어/배너, 스케줄링, 위치 지정
- ✅ **게시판 관리** - 카테고리, 게시물 CRUD, 특성 게시물
- ✅ **페이지 관리** - 정적 페이지, SEO 메타데이터, 템플릿
- ✅ **파일 관리** - 업로드, 폴더 분류, 다중 삭제
- ✅ **설정 관리** - 5개 카테고리 설정, Key-Value 관리
- ✅ **사용자 관리** - 4단계 권한, 비밀번호 재설정
- ✅ **사용자 매뉴얼** - 역할별 가이드, HTML 매뉴얼 제공

- ✅ **웹빌더 블록 렌더링 엔진** - 11개 블록 타입, SSR 지원, 성능 최적화

### 개발 예정
- 📱 프론트엔드 사용자 페이지
- 🔄 실시간 알림 시스템
- 📊 통계 대시보드 확장
- 🖼️ 이미지 최적화 (WebP 자동 변환)

## 🛠️ 개발 환경 설정

### 1. 프로젝트 클론
```bash
git clone https://github.com/yumikang/misopin-cms.git
cd misopin-cms/blee-app
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가:

```env
# Supabase Configuration (필수)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
DATABASE_URL=your_database_url  # Prisma 사용 시
```

> **중요**: Service Role Key는 Supabase Dashboard → Settings → API → service_role (secret)에서 확인

### 4. 데이터베이스 초기화

#### 자동 초기화 (권장) 🎯
1. 개발 서버 실행: `npm run dev`
2. 브라우저에서 접속: `http://localhost:3000/api/init`
3. 응답에 SQL이 포함된 경우, Supabase SQL Editor에서 실행
4. 다시 `/api/init` 접속하여 테스트 계정 생성 확인

### 5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 🔐 테스트 계정

| 역할 | 이메일 | 비밀번호 | 권한 |
|------|--------|----------|------|
| 슈퍼 관리자 | admin@misopin.com | admin123 | 모든 권한 |
| 일반 관리자 | manager@misopin.com | admin123 | 일반 관리 |
| 편집자 | editor@misopin.com | editor123 | 콘텐츠 편집 |

## 📁 프로젝트 구조

```
blee-app/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # 인증 관련 API
│   │   │   └── cms-login/ # CMS 로그인
│   │   ├── init/         # DB 초기화
│   │   ├── setup/        # 테스트 데이터 설정
│   │   └── seed/         # 시드 데이터
│   ├── admin/            # 관리자 대시보드
│   ├── login/            # 로그인 페이지
│   └── page.tsx          # 홈페이지
├── lib/                   # 유틸리티
│   ├── supabase.ts       # Supabase 클라이언트
│   ├── supabase-admin.ts # Admin 클라이언트 (RLS 우회)
│   └── webbuilder/       # 웹빌더 블록 렌더링 엔진
│       └── renderers/    # 11개 블록 렌더러 시스템
├── public/                # 정적 파일
│   └── user-manual.html   # 사용자 매뉴얼 (HTML)
├── docs/                  # 문서
│   ├── user-manual.md     # 사용자 매뉴얼 (Markdown)
│   └── webbuilder/        # 웹빌더 문서
│       ├── block-rendering-engine.md  # 렌더링 엔진 개발문서
│       └── api-reference.md           # API 참조 가이드
├── .env                   # 환경 변수
└── package.json          # 프로젝트 설정
```

## 🚀 배포

### Vercel 배포 설정

1. **GitHub 연동**: Vercel에서 GitHub 리포지토리 연결
2. **환경 변수 설정** (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (중요!)
3. **Root Directory**: `blee-app`
4. **자동 배포**: main 브랜치 푸시 시 자동 배포

### 배포 후 초기화
1. `https://your-domain.vercel.app/api/init` 접속
2. 지시에 따라 데이터베이스 설정

## 🔧 주요 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 인증 필요 |
|-----------|--------|------|-----------|
| `/api/auth/cms-login` | POST | 관리자 로그인 | ❌ |
| `/api/init` | GET/POST | DB 초기화 및 상태 확인 | ❌ |
| `/api/setup` | GET/POST | 테스트 계정 생성 | ❌ |
| `/api/seed` | GET/POST | 시드 데이터 추가 | ❌ |
| `/api/health` | GET | 서버 상태 확인 | ❌ |

## 📝 개발 이력

### 2025-01-19
- ✨ **웹빌더 블록 렌더링 엔진 완전 구현**
  - 11개 블록 타입 지원 (TEXT, IMAGE, GRID, BUTTON, VIDEO, CAROUSEL, FORM, MAP, HTML, COMPONENT)
  - Factory Pattern 기반 렌더러 시스템
  - 서버사이드 렌더링 (SSR) 및 React JSX 지원
  - 실시간 성능 모니터링 및 벤치마킹
  - XSS 방지 및 접근성 (WCAG 2.1 AA) 완전 지원
  - 100+ 테스트 케이스 및 성능 검증 도구
- 📖 **종합 개발문서 작성**
  - 블록 렌더링 엔진 개발문서 (50+ 페이지)
  - API 참조 가이드 및 사용 예제
  - 성능 최적화 가이드 및 문제해결 매뉴얼

### 2025-01-17
- ✨ **7개 관리 모듈 완전 구현**
  - 예약 관리: 시간 슬롯 기반 예약, 5단계 상태 관리
  - 팝업 관리: 3가지 타입, 스케줄링, 위치 지정
  - 게시판 관리: 카테고리 시스템, 특성 게시물
  - 페이지 관리: SEO 최적화, 4가지 템플릿
  - 파일 관리: 자동 폴더 분류, 일괄 삭제
  - 설정 관리: 5개 카테고리, 18개 설정 항목
  - 사용자 관리: 4단계 권한 체계, 임시 비밀번호
- 🎨 shadcn/ui 전체 통합 완료
- 📝 TypeScript strict mode 적용 (no any types)
- 🔧 Mock API 구현 (Supabase 마이그레이션 준비)

### 2025-09-17
- 🎉 프로젝트 초기 설정 완료
- 🔄 Express.js → Next.js 15 마이그레이션
- 🗄️ PostgreSQL → Supabase 마이그레이션
- 🔐 JWT 기반 인증 시스템 구현
- 📊 관리자 대시보드 UI 구현
- 🚀 Vercel 자동 배포 설정
- 🔧 자동 DB 초기화 시스템 구축
- 📖 **사용자 매뉴얼 시스템 추가**
  - HTML 매뉴얼 (`/public/user-manual.html`) 생성
  - Markdown 매뉴얼 (`/docs/user-manual.md`) 생성
  - 로그인 페이지에 매뉴얼 버튼 추가
  - 역할별 권한 안내 및 사용법 가이드
  - 반응형 디자인으로 모바일 최적화

## 🛡️ 보안 고려사항

- **Service Role Key**: 서버 사이드에서만 사용, 클라이언트 노출 금지
- **JWT 토큰**: 7일 만료, localStorage 저장
- **RLS 정책**: Supabase Row Level Security 활성화
- **비밀번호**: bcrypt 12 rounds 해시화
- **CORS**: Vercel 자동 처리

## 🐛 문제 해결

### 로그인 실패 시
1. Supabase Service Role Key 확인
2. `/api/init` 실행하여 테이블 및 계정 확인
3. 브라우저 콘솔 에러 확인

### 빌드 에러 시
1. TypeScript 에러 확인: `npm run build`
2. 환경 변수 설정 확인
3. Node.js 버전 확인 (18.x 이상)

## 📞 문의

- **GitHub Issues**: [버그 리포트 및 기능 요청](https://github.com/yumikang/misopin-cms/issues)
- **개발자**: Yumi Kang

## 📄 라이선스

Private Repository - All Rights Reserved © 2025 미소핀의원
