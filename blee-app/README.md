# 미소핀의원 CMS

미소핀의원을 위한 컨텐츠 관리 시스템

## 기술 스택

- **Frontend**: Next.js 15.5.3 + TypeScript
- **Database**: Supabase (PostgreSQL)
- **UI**: Tailwind CSS
- **Authentication**: NextAuth.js

## 환경 설정

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 개발 서버 실행

```bash
npm run dev
```

## API 엔드포인트

- `/api/seed` - 테스트 계정 생성
- `/api/health` - 서버 상태 확인
- `/api/auth/login` - 로그인

## 테스트 계정

- **슈퍼 관리자**: admin@misopin.com / admin123
- **일반 관리자**: manager@misopin.com / admin123
- **편집자**: editor@misopin.com / editor123

## 배포

Vercel을 통해 자동 배포됩니다. Root Directory는 `blee-app`으로 설정되어 있습니다.
