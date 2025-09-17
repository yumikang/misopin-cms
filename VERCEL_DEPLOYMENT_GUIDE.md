# 🚀 Vercel 배포 가이드

## 📋 개요

미소핀 CMS를 Vercel에 배포하는 완전한 가이드입니다. Vercel은 Next.js의 공식 호스팅 플랫폼으로, 자동 배포, 프리뷰 환경, 엣지 함수 등을 제공합니다.

## ✅ 사전 준비사항

### 1. 필수 계정
- [ ] Vercel 계정 (https://vercel.com)
- [ ] GitHub 계정 (이미 있음: yumikang/misopin-cms)
- [ ] PostgreSQL 데이터베이스 서비스 계정 (아래 중 택 1)

### 2. 데이터베이스 옵션

#### Option A: Vercel Postgres (추천)
- Vercel Dashboard에서 직접 생성
- 자동 연결 및 환경변수 설정
- 무료 티어: 60시간 컴퓨트, 256MB 스토리지

#### Option B: Supabase
- https://supabase.com
- 무료 티어: 500MB 데이터베이스, 2GB 전송
- Prisma와 완벽 호환

#### Option C: Neon
- https://neon.tech
- 무료 티어: 3GB 스토리지
- 서버리스 PostgreSQL

#### Option D: 기존 서버 활용
- 141.164.60.51 서버의 PostgreSQL 사용
- 외부 접속 허용 설정 필요
- 보안을 위해 SSL 연결 필수

## 🎯 배포 단계

### Step 1: Vercel 프로젝트 연결

1. **Vercel Dashboard 접속**
   ```
   https://vercel.com/dashboard
   ```

2. **새 프로젝트 추가**
   - "Add New..." → "Project" 클릭
   - GitHub 연동 승인
   - `yumikang/misopin-cms` 저장소 선택

3. **프로젝트 설정**
   - Framework Preset: `Next.js` (자동 감지됨)
   - Root Directory: `./` (기본값)
   - Build Command: (vercel.json에 정의됨)
   - Output Directory: (vercel.json에 정의됨)

### Step 2: 데이터베이스 설정

#### Vercel Postgres 사용 시:
```bash
# Vercel Dashboard → Storage → Create Database
# PostgreSQL 선택 → 지역 선택 (Seoul 권장)
# 자동으로 DATABASE_URL 환경변수 생성됨
```

#### 외부 데이터베이스 사용 시:
```bash
# 연결 문자열 형식
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

### Step 3: 환경변수 설정

Vercel Dashboard → Settings → Environment Variables

```bash
# 필수 환경변수
DATABASE_URL="postgresql://..." # 데이터베이스 연결 문자열
NEXTAUTH_SECRET="..." # openssl rand -base64 32로 생성
NEXTAUTH_URL="https://[your-project].vercel.app"

# 선택 환경변수 (파일 스토리지)
BLOB_READ_WRITE_TOKEN="..." # Vercel Blob Storage 사용 시
```

### Step 4: 데이터베이스 마이그레이션

배포 후 첫 실행 시 자동으로 마이그레이션이 실행됩니다.
수동 실행이 필요한 경우:

```bash
# 로컬에서 프로덕션 DB 마이그레이션
DATABASE_URL="your-production-database-url" npx prisma migrate deploy

# Seed 데이터 추가 (선택사항)
DATABASE_URL="your-production-database-url" npx prisma db seed
```

### Step 5: 배포 실행

```bash
# 자동 배포 (Git push 시)
git push origin main

# 수동 배포 (Vercel CLI)
npm i -g vercel
vercel --prod
```

## 🔧 파일 업로드 처리

### ⚠️ Vercel의 제한사항
- 임시 파일 시스템만 지원 (/tmp 디렉토리)
- 최대 파일 크기: 4.5MB
- 함수 실행 후 파일 삭제됨

### 📦 권장 스토리지 솔루션

#### 1. Vercel Blob Storage (추천)
```typescript
// 설치
npm install @vercel/blob

// 사용 예시
import { put } from '@vercel/blob';

const blob = await put(filename, file, {
  access: 'public',
});
```

#### 2. AWS S3
```typescript
// 설치
npm install @aws-sdk/client-s3

// 환경변수 추가
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-northeast-2"
S3_BUCKET="misopin-cms-uploads"
```

#### 3. Cloudinary
```typescript
// 설치
npm install cloudinary

// 환경변수 추가
CLOUDINARY_URL="cloudinary://..."
```

## 🌏 커스텀 도메인 설정

### 도메인 연결
1. Vercel Dashboard → Settings → Domains
2. `cms.one-q.xyz` 입력
3. DNS 설정:
   ```
   Type: CNAME
   Name: cms
   Value: cname.vercel-dns.com
   ```
   또는
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

### SSL 인증서
- Vercel이 자동으로 Let's Encrypt SSL 발급
- 강제 HTTPS 자동 활성화

## 📊 모니터링 & 분석

### Vercel Analytics
- Real User Monitoring
- Web Vitals 측정
- 무료 티어: 월 2,500 페이지뷰

### Vercel Functions 로그
```bash
# Vercel Dashboard → Functions → Logs
# 실시간 로그 스트리밍 지원
```

## 🚦 배포 상태 확인

### 빌드 로그
- Vercel Dashboard → Deployments
- 각 배포의 상세 로그 확인 가능

### 프리뷰 환경
- PR 생성 시 자동 프리뷰 URL 생성
- `https://misopin-cms-[pr-number].vercel.app`

## ⚡ 성능 최적화

### 이미지 최적화
```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['your-storage-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
}
```

### 엣지 함수 활용
```typescript
// app/api/public/[...route].ts
export const runtime = 'edge'; // 엣지에서 실행
```

### 캐싱 전략
- 정적 페이지: 자동 CDN 캐싱
- API 응답: Cache-Control 헤더 설정
- ISR (Incremental Static Regeneration) 활용

## 🔐 보안 설정

### 환경변수 보안
- Production 환경변수는 암호화 저장
- 빌드 시점과 런타임 변수 분리

### API 보안
```typescript
// Rate Limiting (Vercel Edge Config)
import { rateLimit } from '@vercel/edge-config';
```

### CORS 설정
- vercel.json에 정의됨
- Public API에만 CORS 허용

## 🚨 트러블슈팅

### 빌드 실패
```bash
# Prisma 생성 오류
# → package.json postinstall 스크립트 확인
"postinstall": "prisma generate"

# 타입 오류
# → TypeScript strict mode 일시적 완화
```

### 데이터베이스 연결 실패
```bash
# SSL 연결 필요
DATABASE_URL="...?sslmode=require"

# Connection Pool 크기 조정
DATABASE_URL="...?connection_limit=5"
```

### 함수 타임아웃
```javascript
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30 // 최대 30초 (Pro 플랜)
    }
  }
}
```

## 📈 비용 관리

### Vercel 무료 티어
- 월 100GB 대역폭
- 월 100시간 빌드 시간
- 함수 실행: 월 100GB-Hours

### 비용 절감 팁
1. 이미지 최적화로 대역폭 절감
2. 정적 생성(SSG) 우선 사용
3. API 응답 캐싱 활용
4. 불필요한 재배포 방지

## 📝 체크리스트

### 배포 전
- [ ] 환경변수 설정 완료
- [ ] 데이터베이스 연결 테스트
- [ ] 로컬 빌드 성공 확인
- [ ] TypeScript 타입 체크 통과

### 배포 후
- [ ] 프로덕션 URL 접속 확인
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 관리자 계정 생성
- [ ] 파일 업로드 테스트
- [ ] 공개 API 작동 확인

## 🔄 CI/CD 설정

### GitHub Actions 연동
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📞 지원 & 리소스

### Vercel 문서
- https://vercel.com/docs
- https://nextjs.org/docs/deployment

### 커뮤니티
- Vercel Discord
- Next.js GitHub Discussions

### 상태 페이지
- https://www.vercel-status.com

## 🎉 배포 완료!

배포가 완료되면 다음 URL에서 접속 가능합니다:
- **Vercel URL**: https://misopin-cms.vercel.app
- **커스텀 도메인**: https://cms.one-q.xyz