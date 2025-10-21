# CMS와 정적 홈페이지 통합 분석 및 실행 계획

## 현재 상황 분석

### 1. 시스템 구성 요소

#### A. Next.js CMS (포트 3001)
- **기술 스택**: Next.js 15.5.3, Prisma, Supabase
- **도메인**:
  - cms.one-q.xyz (HTTPS/Caddy)
  - one-q.xyz (HTTP/Nginx)
- **API 엔드포인트**: `/app/api/`
  - `/api/public/reservations` - 예약 관리
  - `/api/public/board-posts` - 게시판
  - `/api/public/popups` - 팝업
  - `/api/public/clinic-info` - 병원 정보
  - `/api/public/reservation-status` - 예약 상태

#### B. 정적 HTML 페이지
- **위치**: `/Users/blee/Desktop/cms/misopin-cms/modified/root/`
- **주요 파일**:
  - `calendar-page.html` - 예약 시스템
  - `board-page.html` - 게시판
  - `index.html` - 메인 페이지
  - 기타 14개 페이지

#### C. API 클라이언트
- **위치**: `/production-backup/misopin.com/js/api-client.js`
- **상태**: modified/root/js/ 디렉토리가 존재하지 않음
- **현재 baseURL 로직**:
  ```javascript
  if (hostname === 'localhost') → 'http://localhost:3001/api'
  if (hostname === 'misopin-renew.vercel.app') → 'https://misopin-cms.vercel.app/api'
  if (hostname === 'misopin.com') → 'https://misopin-cms.vercel.app/api'
  else → '/api' (fallback)
  ```

### 2. 문제점 분석

#### 🔴 Critical Issues

1. **API 클라이언트 파일 누락**
   - HTML 파일들이 `<script src="js/api-client.js"></script>` 참조
   - 실제 파일이 `/modified/root/js/` 경로에 없음
   - `/production-backup/`에만 존재

2. **도메인 불일치**
   - API 클라이언트: `misopin.com` → CMS API 호출 설정
   - 실제 서버: `one-q.xyz`
   - baseURL 로직에 `one-q.xyz` 처리 없음

3. **배포 경로 불명확**
   - Nginx/Caddy 설정 파일 없음
   - 서버의 /var/www/ 구조 불명확
   - 정적 파일 배포 위치 미정

#### 🟡 Important Issues

4. **CORS 설정 검증 필요**
   - API가 CORS 헤더를 설정했다고 하지만 실제 코드 확인 필요
   - 도메인 간 호출 (one-q.xyz → cms.one-q.xyz) 테스트 필요

5. **파일 구조 불일치**
   - `/modified/root/` vs `/production-backup/misopin.com/`
   - 어느 것이 최신 버전인지 불명확

## 통합 아키텍처 설계

### 시스템 플로우

```
사용자 브라우저
    ↓
one-q.xyz (Nginx) → 정적 HTML 페이지 제공
    ↓
js/api-client.js 로드
    ↓
cms.one-q.xyz/api (Caddy/HTTPS) → Next.js API
    ↓
Supabase 데이터베이스
```

### 네트워크 구성

```
┌─────────────────────────────────────────────┐
│ Nginx (one-q.xyz - HTTP)                    │
│  ├─ / → 정적 파일 (/var/www/one-q/...)     │
│  ├─ /calendar-page.html                     │
│  ├─ /board-page.html                        │
│  └─ /js/api-client.js                       │
└─────────────────────────────────────────────┘
                  ↓ API 호출
┌─────────────────────────────────────────────┐
│ Caddy (cms.one-q.xyz - HTTPS)               │
│  └─ Next.js App (포트 3001)                 │
│     └─ /api/public/* → Public APIs          │
└─────────────────────────────────────────────┘
                  ↓
        ┌─────────────────┐
        │ Supabase DB     │
        └─────────────────┘
```

## 실행 계획

### Phase 1: 파일 구조 정리 (우선순위: 🔴)

#### Task 1.1: API 클라이언트 복사
```bash
# 로컬에서 실행
mkdir -p /Users/blee/Desktop/cms/misopin-cms/modified/root/js
cp /Users/blee/Desktop/cms/misopin-cms/production-backup/misopin.com/js/api-client.js \
   /Users/blee/Desktop/cms/misopin-cms/modified/root/js/
```

#### Task 1.2: API 클라이언트 업데이트
`js/api-client.js`의 `getAPIBaseURL()` 함수 수정:

```javascript
getAPIBaseURL() {
  const hostname = window.location.hostname;

  // Development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }

  // Production - one-q.xyz domain
  if (hostname === 'one-q.xyz' || hostname === 'www.one-q.xyz') {
    return 'https://cms.one-q.xyz/api';
  }

  // Vercel domains (기존 코드 유지)
  if (hostname === 'misopin-renew.vercel.app') {
    return 'https://misopin-cms.vercel.app/api';
  }

  if (hostname === 'misopin.com' || hostname === 'www.misopin.com') {
    return 'https://misopin-cms.vercel.app/api';
  }

  // Fallback
  return '/api';
}
```

### Phase 2: 서버 배포 경로 결정 (우선순위: 🔴)

#### Option A: 추론된 Nginx 구성 (권장)
```nginx
# /etc/nginx/sites-available/one-q.xyz
server {
    listen 80;
    server_name one-q.xyz www.one-q.xyz;

    root /var/www/one-q/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**배포 경로**: `/var/www/one-q/html/`

#### Option B: 기본 Nginx 구성
**배포 경로**: `/var/www/html/`

#### 확인 방법
서버에 SSH 접속 후:
```bash
# Nginx 설정 확인
sudo cat /etc/nginx/sites-enabled/one-q.xyz
sudo cat /etc/nginx/sites-enabled/default

# 현재 웹 루트 확인
sudo ls -la /var/www/
```

### Phase 3: 파일 배포 (우선순위: 🟡)

#### Task 3.1: 배포 스크립트 작성
```bash
#!/bin/bash
# deploy-static.sh

LOCAL_PATH="/Users/blee/Desktop/cms/misopin-cms/modified/root"
SERVER_USER="blee"
SERVER_HOST="your-server-ip-or-domain"
REMOTE_PATH="/var/www/one-q/html"  # Option A 기준

# 파일 동기화
rsync -avz --delete \
  --exclude='.DS_Store' \
  --exclude='*.swp' \
  "$LOCAL_PATH/" \
  "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/"

# 권한 설정
ssh "$SERVER_USER@$SERVER_HOST" \
  "sudo chown -R www-data:www-data $REMOTE_PATH && \
   sudo chmod -R 755 $REMOTE_PATH"

echo "Deployment completed!"
```

#### Task 3.2: 배포 실행
```bash
chmod +x deploy-static.sh
./deploy-static.sh
```

### Phase 4: CORS 검증 및 수정 (우선순위: 🟡)

#### Task 4.1: API CORS 설정 확인
`/app/api/public/*/route.ts` 파일들에 다음 헤더 추가:

```typescript
export async function GET(request: Request) {
  const response = NextResponse.json(data);

  // CORS 헤더 추가
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

더 나은 방법: Next.js middleware 사용
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Public API 경로에만 CORS 적용
  if (request.nextUrl.pathname.startsWith('/api/public')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

export const config = {
  matcher: '/api/public/:path*',
};
```

### Phase 5: 통합 테스트 (우선순위: 🟢)

#### 테스트 시나리오

##### 5.1 예약 시스템 테스트
```javascript
// 브라우저 콘솔에서 실행
// 1. API 클라이언트 로드 확인
console.log('MisopinAPI:', typeof MisopinAPI);

// 2. Base URL 확인
const api = new MisopinAPI();
console.log('API Base URL:', api.baseURL);

// 3. 예약 제출 테스트
const testReservation = {
  patient_name: "테스트",
  phone: "010-1234-5678",
  birth_date: "1990-01-01",
  gender: "MALE",
  treatment_type: "FIRST_VISIT",
  service: "피부진료",
  preferred_date: "2025-10-20",
  preferred_time: "10:00",
  notes: "테스트 예약"
};

api.submitReservation(testReservation)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

##### 5.2 게시판 테스트
```javascript
// 1. 게시글 목록 가져오기
api.getBoardPosts(null, 20, 0)
  .then(response => {
    console.log('Posts:', response.posts);
    console.log('Total:', response.total);
  })
  .catch(error => console.error('Error:', error));

// 2. 렌더링 확인
const tbody = document.getElementById('board-posts-list');
console.log('Board list element:', tbody);
```

##### 5.3 팝업 테스트
```javascript
// 1. 팝업 데이터 확인
api.getPopups()
  .then(popups => console.log('Popups:', popups))
  .catch(error => console.error('Error:', error));

// 2. 팝업 강제 표시 (테스트용)
window.location.href = '?showPopups=true';
```

#### 테스트 체크리스트

- [ ] API 클라이언트 로드 확인
- [ ] Base URL이 올바르게 설정됨
- [ ] 예약 폼 제출 성공
- [ ] 예약 데이터가 DB에 저장됨
- [ ] 게시판 목록이 동적으로 로드됨
- [ ] 팝업이 정상적으로 표시됨
- [ ] 네트워크 탭에서 CORS 에러 없음
- [ ] 모바일 환경에서 정상 작동

## 잠재적 문제점 및 해결 방안

### 1. CORS 에러
**증상**: 브라우저 콘솔에 "CORS policy" 에러 표시

**해결**:
```typescript
// middleware.ts 또는 각 route.ts에 헤더 추가
response.headers.set('Access-Control-Allow-Origin', 'https://one-q.xyz');
// 또는 모든 도메인 허용: '*'
```

### 2. API 클라이언트 로드 실패
**증상**: "MisopinAPI is not defined" 에러

**해결**:
```html
<!-- HTML에서 스크립트 순서 확인 -->
<script src="js/api-client.js"></script>
<script>
  // api-client.js가 로드된 후 실행되도록 보장
  document.addEventListener('DOMContentLoaded', function() {
    const api = new MisopinAPI();
    // ...
  });
</script>
```

### 3. HTTPS/HTTP 혼합 컨텐츠
**증상**: "Mixed Content" 경고 (HTTPS → HTTP 호출 차단)

**현재 구성**:
- one-q.xyz: HTTP
- cms.one-q.xyz: HTTPS

**문제**: HTTP 페이지에서 HTTPS API 호출은 허용되지만, 반대는 차단됨

**권장 해결**: one-q.xyz도 HTTPS로 업그레이드
```nginx
# Nginx에 Let's Encrypt 인증서 적용
server {
    listen 443 ssl http2;
    server_name one-q.xyz;

    ssl_certificate /etc/letsencrypt/live/one-q.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/one-q.xyz/privkey.pem;

    # ... rest of config
}
```

### 4. API baseURL 감지 실패
**증상**: fallback '/api' 사용으로 404 에러

**해결**: 환경 변수 사용
```javascript
// api-client.js 개선
getAPIBaseURL() {
  // 1순위: 환경 변수 (빌드 시 주입)
  if (typeof window.API_BASE_URL !== 'undefined') {
    return window.API_BASE_URL;
  }

  // 2순위: hostname 기반 감지
  const hostname = window.location.hostname;
  // ... 기존 로직
}
```

```html
<!-- HTML에 환경 변수 주입 -->
<script>
  window.API_BASE_URL = 'https://cms.one-q.xyz/api';
</script>
<script src="js/api-client.js"></script>
```

### 5. 캐시 문제
**증상**: 코드 업데이트 후에도 이전 버전 실행

**해결**:
```html
<!-- 버전 쿼리 파라미터 추가 -->
<script src="js/api-client.js?v=1.0.0"></script>
```

또는 Nginx 캐시 헤더 설정:
```nginx
location ~* \.js$ {
    expires 1h;  # 1시간 후 캐시 만료
    add_header Cache-Control "public, must-revalidate";
}
```

## 배포 순서 (Best Practice)

### 1단계: 로컬 준비
```bash
# 1. API 클라이언트 복사
mkdir -p modified/root/js
cp production-backup/misopin.com/js/api-client.js modified/root/js/

# 2. API 클라이언트 수정 (one-q.xyz 도메인 추가)
# (위의 Phase 1, Task 1.2 참고)

# 3. 파일 구조 확인
tree modified/root/
```

### 2단계: 서버 확인
```bash
# SSH 접속
ssh blee@your-server

# Nginx 설정 확인
sudo cat /etc/nginx/sites-enabled/one-q.xyz

# 웹 루트 디렉토리 확인
ls -la /var/www/

# 권한 확인
sudo ls -la /var/www/one-q/html/  # 또는 실제 경로
```

### 3단계: 배포
```bash
# 로컬에서 rsync 실행
rsync -avz --dry-run \  # dry-run으로 먼저 테스트
  modified/root/ \
  blee@your-server:/var/www/one-q/html/

# 실제 배포 (dry-run 제거)
rsync -avz \
  modified/root/ \
  blee@your-server:/var/www/one-q/html/

# 권한 설정 (서버에서)
ssh blee@your-server \
  "sudo chown -R www-data:www-data /var/www/one-q/html && \
   sudo chmod -R 755 /var/www/one-q/html"
```

### 4단계: Next.js CMS CORS 설정
```typescript
// middleware.ts 생성 또는 수정
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/public')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

export const config = {
  matcher: '/api/public/:path*',
};
```

```bash
# CMS 재배포
npm run build
pm2 restart misopin-cms  # 또는 배포 방법에 따라
```

### 5단계: 테스트
```bash
# 1. 정적 페이지 접근 테스트
curl -I http://one-q.xyz/calendar-page.html

# 2. API 연결 테스트
curl https://cms.one-q.xyz/api/public/board-posts

# 3. CORS 테스트
curl -I -X OPTIONS https://cms.one-q.xyz/api/public/board-posts \
  -H "Origin: http://one-q.xyz" \
  -H "Access-Control-Request-Method: GET"
```

브라우저에서:
- http://one-q.xyz/calendar-page.html 접속
- F12 → Network 탭 확인
- 예약 폼 제출 테스트

## 모니터링 및 디버깅

### 로그 확인
```bash
# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Next.js 로그 (PM2 사용 시)
pm2 logs misopin-cms

# 브라우저 콘솔
window.checkPopupSystem()  # 팝업 시스템 상태
```

### 성능 체크
```javascript
// API 응답 시간 측정
const start = performance.now();
api.getBoardPosts().then(() => {
  const duration = performance.now() - start;
  console.log(`API call took ${duration.toFixed(2)}ms`);
});
```

## Next Steps

### 즉시 실행 (Priority 1)
1. ✅ API 클라이언트 파일 복사 및 수정
2. ✅ 서버 배포 경로 확인
3. ✅ 파일 배포 스크립트 작성

### 배포 전 (Priority 2)
4. ⬜ CMS CORS 설정 추가
5. ⬜ 로컬 테스트 환경 구성
6. ⬜ 테스트 시나리오 실행

### 배포 후 (Priority 3)
7. ⬜ 프로덕션 배포
8. ⬜ 통합 테스트 실행
9. ⬜ 모니터링 설정

### 선택 사항 (Nice to Have)
10. ⬜ one-q.xyz HTTPS 업그레이드
11. ⬜ CDN 설정 (정적 파일 가속)
12. ⬜ 에러 추적 시스템 (Sentry 등)

## 추가 권장 사항

### 보안
- API 키 환경 변수 관리
- Rate limiting 설정
- SQL injection 방지 (Prisma/Supabase 사용으로 대부분 방어됨)

### 성능
- 이미지 최적화 (Next.js Image → Sharp)
- JS/CSS 번들 최소화
- Gzip 압축 활성화 (Nginx)

### 유지보수
- Git을 통한 버전 관리
- 배포 자동화 (GitHub Actions)
- 백업 정책 수립

## 요약

### 핵심 작업
1. **API 클라이언트 복사 및 수정** → one-q.xyz 도메인 지원
2. **서버 배포 경로 확인** → Nginx 설정 확인
3. **파일 배포** → rsync로 정적 파일 업로드
4. **CORS 설정** → Next.js middleware 추가
5. **테스트** → 브라우저에서 통합 테스트

### 예상 소요 시간
- 파일 준비: 30분
- 서버 확인 및 배포: 1시간
- CORS 설정 및 재배포: 30분
- 테스트 및 디버깅: 1-2시간

**총 예상 시간**: 3-4시간

### 성공 기준
- ✅ one-q.xyz에서 정적 페이지 정상 로드
- ✅ API 클라이언트가 cms.one-q.xyz API 호출 성공
- ✅ 예약 폼 제출 → DB 저장 확인
- ✅ 게시판 동적 로딩 확인
- ✅ CORS 에러 없음
- ✅ 모바일 환경 정상 작동
