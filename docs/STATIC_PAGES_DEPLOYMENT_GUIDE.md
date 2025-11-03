# 정적 페이지 배포 가이드

## 작업 완료 내역 (2025-11-03)

### 1. 누락 페이지 추가 및 등록

**추가된 페이지 (7개)**:
- `about.html` - 병원 소개
- `board-page.html` - 공지 및 이벤트
- `calendar-page.html` - 상담 예약
- `privacy.html` - 개인정보처리방침
- `stipulation.html` - 이용약관
- `fee-schedule.html` - 비급여 수가표
- `quickmenu.html` - 퀵메뉴 (iframe용)

**작업 내용**:
- Misopin-renew 폴더에서 파일 복사
- 데이터베이스에 페이지 정보 등록
- 파비콘 업데이트 (quickmenu 제외)

### 2. 파비콘 시스템 통합

**생성된 파비콘 파일 (6개)**:
```
favicon.ico (1.6KB)
favicon-16x16.png (675B)
favicon-32x32.png (1.6KB)
apple-touch-icon.png (19KB)
android-chrome-192x192.png (21KB)
android-chrome-512x512.png (104KB)
```

**원본 소스**: `/Users/blee/Desktop/cms/Misopin-renew/img/misopin-logo.svg` (3.2MB)

**적용 방법**:
- Sharp 라이브러리로 SVG → PNG 변환
- 자동화 스크립트로 모든 HTML 파일 업데이트
- 총 19개 HTML 파일에 파비콘 링크 추가 (quickmenu 제외)

**HTML 파비콘 코드**:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

### 3. index.html 버전 동기화

**문제**: misopin-cms의 index.html이 구버전이었음

**해결**:
- Misopin-renew의 최신 index.html 복사
- 개선된 CSS 적용 (전체 너비 배너, 모바일 반응형 개선)
- 새 파비콘 링크 추가
- 양쪽 디렉토리 동기화 완료

### 4. 데이터베이스 스키마 수정

**Prisma 스키마 요구사항 준수**:
```typescript
// 필수 필드
id: String @id @default(uuid())
sections: Json @default("[]")
lastEdited: DateTime @default(now())
editMode: EditMode  // PARSER 또는 ATTRIBUTE

// EditMode enum
enum EditMode {
  PARSER
  ATTRIBUTE
}
```

**수정된 스크립트**:
- `scripts/register-missing-pages.ts` - 첫 3개 페이지 등록
- `scripts/register-additional-pages.ts` - 추가 4개 페이지 등록 (수정 버전)

## 현재 파일 상태

### 로컬 파일 위치

**misopin-cms (CMS 관리)**:
```
/Users/blee/Desktop/cms/misopin-cms/public/static-pages/
├── about.html
├── acne.html
├── board-page.html
├── botox.html
├── calendar-page.html
├── diet.html
├── fee-schedule.html
├── filler.html
├── hair-removal.html
├── index.html
├── jeomin.html
├── lifting.html
├── milia.html
├── mole.html
├── peeling.html
├── privacy.html
├── quickmenu.html (파비콘 없음)
├── skinbooster.html
├── stipulation.html
├── tattoo.html
└── [파비콘 파일 6개]
```

**Misopin-renew (배포 소스)**:
```
/Users/blee/Desktop/cms/Misopin-renew/
└── [동일한 20개 HTML + 파비콘 6개]
```

### 데이터베이스 상태

**등록된 페이지**: 20개 전체
- 기존 페이지: 13개 (이미 등록되어 있었음)
- 신규 등록: 1개 (quickmenu)
- 기존 확인: 6개 (about, board-page, calendar-page, privacy, stipulation, fee-schedule)

**quickmenu 정보**:
```
ID: 8924f07a-b0d9-40f1-9431-fce9ed9f0f33
Slug: quickmenu
Title: 퀵메뉴
FilePath: quickmenu.html
EditMode: PARSER
```

## 서버 배포 대기 중

### 현재 상황

**서버 정보**:
- IP: 141.164.60.51
- OS: Ubuntu (OpenSSH 8.9p1)
- 웹서버: Caddy v2.10.2
- 프레임워크: Next.js 15.5.3

**서버 상태**:
- ✅ 서버 응답 정상 (ping 5-6ms)
- ✅ HTTP 포트 80 열림
- ✅ HTTPS 포트 443 열림
- ✅ Next.js 앱 실행 중
- ❌ SSH 포트 22 차단됨 (Connection refused)

**차단 원인 추정**:
1. SSH 서비스 중지됨
2. 방화벽에서 SSH 차단
3. 서버 재부팅 후 SSH 자동 시작 실패

### 배포할 파일

**HTML 파일 (20개)**:
- 로컬 위치: `/Users/blee/Desktop/cms/misopin-cms/public/static-pages/`
- 서버 위치: `/var/www/misopin-cms/.next/standalone/public/static-pages/`

**파비콘 파일 (6개)**:
- 로컬 위치: `/Users/blee/Desktop/cms/Misopin-renew/`
- 서버 위치: `/var/www/misopin.com/`

### 배포 명령어 (SSH 복구 시)

```bash
# HTML 파일 업로드
rsync -avz /Users/blee/Desktop/cms/misopin-cms/public/static-pages/*.html \
  blee@141.164.60.51:/var/www/misopin-cms/.next/standalone/public/static-pages/

# 파비콘 파일 업로드
rsync -avz /Users/blee/Desktop/cms/Misopin-renew/favicon* \
  /Users/blee/Desktop/cms/Misopin-renew/android-chrome* \
  /Users/blee/Desktop/cms/Misopin-renew/apple-touch-icon.png \
  blee@141.164.60.51:/var/www/misopin.com/
```

## 다음 단계

### 1. 즉시 조치 필요

**서버 SSH 복구**:
- [ ] 호스팅 제어판 접속
- [ ] SSH 서비스 활성화 또는
- [ ] FTP/SFTP 계정으로 파일 업로드

**대안 방법**:
1. **웹 호스팅 제어판** (cPanel, Plesk 등)
   - 파일 관리자로 직접 업로드

2. **FTP/SFTP 클라이언트**
   - FileZilla, Cyberduck 사용
   - FTP 계정 정보 필요

3. **서버 관리자 연락**
   - SSH 포트 22 활성화 요청
   - 방화벽 설정 확인 요청

### 2. 배포 후 검증

**웹사이트 확인**:
```bash
# 페이지 접근 테스트
curl -I http://141.164.60.51/about.html
curl -I http://141.164.60.51/privacy.html
curl -I http://141.164.60.51/quickmenu.html

# 파비콘 확인
curl -I http://141.164.60.51/favicon.ico
curl -I http://141.164.60.51/apple-touch-icon.png
```

**브라우저 테스트**:
- [ ] 모든 페이지 정상 로드 확인
- [ ] 파비콘 표시 확인 (quickmenu 제외)
- [ ] 404 에러 해결 확인
- [ ] 모바일 반응형 확인

### 3. CMS 기능 테스트

**편집 기능 검증**:
- [ ] 각 페이지 편집 모드 진입
- [ ] 섹션 파싱 정상 작동 확인
- [ ] 저장 후 HTML 파일 업데이트 확인
- [ ] 락 시스템 정상 작동 확인

**데이터베이스 검증**:
```sql
-- 모든 페이지 등록 확인
SELECT id, slug, title, editMode, isPublished
FROM static_pages
ORDER BY slug;

-- 총 20개 페이지 확인
SELECT COUNT(*) FROM static_pages;
```

### 4. 문서화 및 정리

- [x] 작업 내용 커밋
- [x] 배포 가이드 작성
- [ ] 서버 배포 완료
- [ ] 운영 체크리스트 업데이트
- [ ] 백업 정책 수립

## 트러블슈팅

### SSH 연결 실패 시

**증상**: `Connection refused` 에러

**진단 단계**:
```bash
# 1. 서버 응답 확인
ping 141.164.60.51

# 2. SSH 포트 상태 확인
nc -zv 141.164.60.51 22

# 3. 웹 서비스 확인
curl -I http://141.164.60.51
```

**해결 방법**:
1. 서버 콘솔 접속 (호스팅 제공업체)
2. SSH 서비스 재시작: `sudo systemctl restart sshd`
3. 방화벽 규칙 확인: `sudo ufw status`
4. SSH 포트 변경 여부 확인: `/etc/ssh/sshd_config`

### 파비콘이 안 보일 때

**확인 사항**:
1. 파일 경로 정확한지 확인
2. 브라우저 캐시 삭제
3. 개발자 도구에서 네트워크 탭 확인
4. 서버 파일 권한 확인: `chmod 644 favicon*`

### 404 에러 지속 시

**확인 사항**:
1. HTML 파일이 정확한 위치에 있는지 확인
2. Next.js 빌드 필요 여부 확인
3. Caddy 설정 파일 확인 (misopin-vhost.conf)
4. 서버 재시작: `sudo systemctl restart caddy`

## 관련 파일

**스크립트**:
- `scripts/register-missing-pages.ts` - 페이지 등록 (첫 3개)
- `scripts/register-additional-pages.ts` - 페이지 등록 (추가 4개)
- `scripts/create-favicon.js` - 파비콘 생성
- `scripts/update-favicons-in-html.js` - HTML 파비콘 링크 업데이트

**설정 파일**:
- `prisma/schema.prisma` - 데이터베이스 스키마
- `misopin-vhost.conf` - Caddy 웹서버 설정

**문서**:
- `docs/STATIC_PAGES_CMS_GUIDE.md` - CMS 사용 가이드
- `docs/STATIC_PAGES_DEPLOYMENT_GUIDE.md` - 이 문서

## 참고 사항

**파비콘 제외 페이지**:
- `quickmenu.html`은 iframe으로 로드되는 페이지로 파비콘이 필요 없음
- 다른 모든 페이지는 파비콘 링크 포함됨

**파일 동기화**:
- misopin-cms와 Misopin-renew 폴더의 HTML 파일은 동일해야 함
- 수정 시 양쪽 모두 업데이트 필요
- 배포 시 misopin-cms 폴더 기준으로 진행

**버전 관리**:
- Git 커밋: 7ad0ef4
- 작업일: 2025-11-03
- 다음 커밋 시 서버 배포 완료 여부 기록 필요
