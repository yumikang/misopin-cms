# Supabase 데이터베이스 설정 가이드

## 📋 개요
미소핀의원 CMS를 위한 Supabase 데이터베이스 설정 스크립트입니다.

## 🚀 설치 순서

### 1단계: 기존 데이터 정리
```sql
-- 01_cleanup.sql 실행
-- 주의: 모든 데이터가 삭제됩니다!
```

### 2단계: 스키마 생성
```sql
-- 02_schema.sql 실행
-- 테이블, 인덱스, RLS 정책 생성
```

### 3단계: 기본 데이터 입력
```sql
-- 03_seed.sql 실행
-- 샘플 데이터 및 기본 설정
```

## 📊 데이터베이스 구조

### 핵심 테이블
- **users** - 사용자 및 권한 관리
- **pages** - 페이지 콘텐츠 관리
- **board_posts** - 게시판 (공지사항/이벤트)
- **popups** - 팝업 관리
- **reservations** - 예약 관리
- **system_settings** - 시스템 설정
- **file_uploads** - 파일 관리

### 사용자 권한
- `SUPER_ADMIN` - 모든 권한
- `ADMIN` - 콘텐츠 관리
- `EDITOR` - 게시글 편집
- `USER` - 읽기 전용

## 🔐 기본 계정

| 이메일 | 비밀번호 | 권한 |
|--------|----------|------|
| super@misopin.com | Admin123 | SUPER_ADMIN |
| admin@misopin.com | Admin123 | ADMIN |
| editor@misopin.com | Admin123 | EDITOR |

## 🔧 환경변수 설정

`.env.local` 파일 생성:
```env
# Supabase 연결 정보
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Database URL (Prisma용)
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

## 📝 Prisma 설정

### 1. Prisma 스키마 업데이트
```bash
npx prisma db pull
```

### 2. Prisma Client 생성
```bash
npx prisma generate
```

### 3. 타입 동기화
```bash
npx prisma format
```

## ⚠️ 주의사항

1. **데이터 백업**: `01_cleanup.sql` 실행 전 데이터 백업 필수
2. **비밀번호 변경**: 프로덕션 환경에서는 기본 비밀번호 변경 필수
3. **RLS 정책**: Row Level Security 정책 확인 및 조정
4. **인덱스 최적화**: 실제 사용 패턴에 따라 인덱스 조정

## 🔍 문제 해결

### 타입 충돌 오류
```sql
-- 기존 타입 확인
SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace;

-- 특정 타입 삭제
DROP TYPE IF EXISTS type_name CASCADE;
```

### 테이블 존재 오류
```sql
-- 기존 테이블 확인
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 특정 테이블 삭제
DROP TABLE IF EXISTS table_name CASCADE;
```

### RLS 정책 오류
```sql
-- RLS 상태 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- RLS 비활성화 (개발용)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

## 📚 참고 자료

- [Supabase 문서](https://supabase.com/docs)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)