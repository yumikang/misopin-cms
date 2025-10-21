# CMS 통합 배포 Quick Start Guide

## 빠른 체크리스트

### Phase 1: 로컬 준비 ✅
- [x] API 클라이언트 복사 완료 (`modified/root/js/api-client.js`)
- [x] one-q.xyz 도메인 지원 추가 완료
- [x] 배포 스크립트 생성 완료 (`deploy-static.sh`)
- [x] CORS 미들웨어 생성 완료 (`middleware.ts`)
- [x] 테스트 스크립트 준비 완료 (`claudedocs/integration-test-scripts.md`)

### Phase 2: 서버 확인 ⏳
- [ ] 서버 SSH 접속
- [ ] `scripts/server-verification.sh` 실행
- [ ] Nginx 웹 루트 경로 확인
- [ ] `deploy-static.sh` 서버 정보 업데이트

### Phase 3: CMS 업데이트 ⏳
- [ ] `middleware.ts` Next.js 프로젝트 루트로 이동
- [ ] CMS 재빌드 및 재시작
- [ ] CORS 헤더 동작 확인

### Phase 4: 정적 파일 배포 ⏳
- [ ] `deploy-static.sh` 실행 (dry-run 먼저)
- [ ] 실제 배포
- [ ] 권한 설정 확인

### Phase 5: 통합 테스트 ⏳
- [ ] http://one-q.xyz 접속
- [ ] 브라우저 콘솔에서 `comprehensiveHealthCheck()` 실행
- [ ] 예약 폼 제출 테스트
- [ ] 게시판 동적 로딩 확인
- [ ] 팝업 표시 확인

---

## 즉시 실행 가능한 명령어

### 1. 서버 확인 (서버에서 실행)
```bash
ssh blee@your-server
bash < scripts/server-verification.sh
```

출력 결과에서 웹 루트 경로를 확인하세요.

### 2. 배포 스크립트 업데이트 (로컬)
```bash
# deploy-static.sh 파일 열기
nano deploy-static.sh

# 다음 줄 수정:
SERVER_HOST="your-server-ip-or-domain"  # 서버 IP 또는 도메인
REMOTE_PATH="/var/www/one-q/html"      # 서버 확인 결과에 맞게 수정
```

### 3. CMS CORS 설정 (로컬)
```bash
# middleware.ts를 Next.js 프로젝트 루트로 이동
# (이미 생성됨 - 확인만 필요)
ls -la middleware.ts

# CMS 재빌드
npm run build

# PM2로 재시작 (PM2 사용 시)
pm2 restart misopin-cms

# 또는 개발 서버 재시작
npm run dev
```

### 4. 배포 실행 (로컬)
```bash
# Dry-run (실제 파일 전송 없이 확인)
./deploy-static.sh
# 프롬프트에서 첫 번째 질문에 'y', 두 번째 질문에 'n' 입력

# 실제 배포
./deploy-static.sh
# 두 질문 모두 'y' 입력
```

### 5. 통합 테스트 (브라우저)
```javascript
// 1. http://one-q.xyz 접속
// 2. F12 → Console 탭 열기
// 3. 다음 실행:

// 종합 헬스체크
comprehensiveHealthCheck();

// API 클라이언트 확인
console.log('Base URL:', new MisopinAPI().baseURL);

// 팝업 시스템 확인
window.checkPopupSystem();
```

---

## 파일 위치 참조

### 생성된 파일
```
/Users/blee/Desktop/cms/misopin-cms/
├── modified/root/
│   └── js/
│       └── api-client.js              ✅ one-q.xyz 지원 추가됨
├── middleware.ts                       ✅ CORS 미들웨어
├── deploy-static.sh                    ✅ 배포 스크립트
├── scripts/
│   └── server-verification.sh         ✅ 서버 확인 스크립트
└── claudedocs/
    ├── integration-analysis.md        ✅ 전체 분석 문서
    ├── integration-test-scripts.md    ✅ 테스트 스크립트 모음
    └── quick-start-guide.md           ✅ 이 파일
```

### 배포 대상 파일
```
modified/root/
├── *.html (15개 HTML 파일)
├── js/
│   └── api-client.js
├── css/
├── img/
└── ... (기타 정적 파일)
```

---

## 예상 소요 시간

- ⏱️ 서버 확인: 10분
- ⏱️ CMS 업데이트: 15분
- ⏱️ 배포 실행: 10분
- ⏱️ 테스트: 20-30분
- **총 예상 시간**: 1시간

---

## 트러블슈팅

### 문제: "Permission denied" 에러
```bash
# 배포 스크립트 실행 권한 부여
chmod +x deploy-static.sh
chmod +x scripts/server-verification.sh
```

### 문제: SSH 접속 실패
```bash
# SSH 키 확인
ls -la ~/.ssh/

# 비밀번호 인증으로 접속 시도
ssh -o PreferredAuthentications=password blee@your-server
```

### 문제: CORS 에러 발생
```bash
# Next.js 미들웨어 확인
ls -la middleware.ts

# 파일이 있으면 재빌드 및 재시작
npm run build
pm2 restart misopin-cms  # 또는 해당 프로세스 재시작
```

### 문제: API 클라이언트 로드 안 됨
```javascript
// 브라우저 콘솔에서 확인
console.log('MisopinAPI:', typeof MisopinAPI);

// 파일 경로 확인 (Network 탭)
// js/api-client.js가 404 에러면 배포 경로 문제
```

### 문제: Base URL이 잘못됨
```javascript
// 브라우저 콘솔에서
const api = new MisopinAPI();
console.log('Current hostname:', window.location.hostname);
console.log('Detected baseURL:', api.baseURL);

// 기대: https://cms.one-q.xyz/api
// 만약 다르면 api-client.js getAPIBaseURL() 함수 확인
```

---

## 성공 기준

### ✅ 배포 성공
- [ ] `http://one-q.xyz` 접속 → 홈페이지 표시
- [ ] 브라우저 콘솔에 `MisopinAPI is not defined` 에러 없음
- [ ] Network 탭에서 `js/api-client.js` 200 OK

### ✅ API 연동 성공
- [ ] `new MisopinAPI().baseURL` → `https://cms.one-q.xyz/api`
- [ ] `comprehensiveHealthCheck()` → 모든 항목 ✓
- [ ] Network 탭에서 API 호출 200 OK (CORS 에러 없음)

### ✅ 기능 정상 작동
- [ ] 예약 폼 제출 → "예약이 접수되었습니다" 메시지
- [ ] 게시판 페이지 → 게시글 동적으로 로드됨
- [ ] 팝업 시스템 → 첫 방문 시 팝업 표시 (있는 경우)

---

## 다음 단계 (선택사항)

### 보안 강화
1. HTTPS 적용 (one-q.xyz도 HTTPS로 업그레이드)
```bash
# Let's Encrypt 인증서 발급
sudo certbot --nginx -d one-q.xyz -d www.one-q.xyz
```

2. CORS Origin 제한 (모든 도메인 허용 → 특정 도메인만)
```typescript
// middleware.ts 수정
response.headers.set('Access-Control-Allow-Origin', 'https://one-q.xyz');
```

### 성능 최적화
1. CDN 설정
2. 이미지 최적화 (WebP 변환)
3. Gzip 압축 활성화

### 모니터링
1. Uptime 모니터링 (UptimeRobot 등)
2. 에러 추적 (Sentry)
3. 분석 도구 (Google Analytics)

---

## 지원 문서

### 상세 분석
- **전체 분석**: `claudedocs/integration-analysis.md`
- **테스트 스크립트**: `claudedocs/integration-test-scripts.md`

### 스크립트
- **배포**: `deploy-static.sh`
- **서버 확인**: `scripts/server-verification.sh`

### 코드
- **API 클라이언트**: `modified/root/js/api-client.js`
- **CORS 미들웨어**: `middleware.ts`

---

## 연락처 및 지원

문제 발생 시:
1. `claudedocs/integration-analysis.md` → "잠재적 문제점 및 해결 방안" 섹션 참조
2. `integration-test-scripts.md` → Section 7 (디버깅 헬퍼) 사용
3. 브라우저 Network/Console 탭에서 에러 메시지 확인

---

**마지막 업데이트**: 2025-10-16
**버전**: 1.0.0
**상태**: 배포 준비 완료 ✅
