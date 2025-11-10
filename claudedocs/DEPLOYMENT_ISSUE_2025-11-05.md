# misopin.one-q.xyz 404 오류 해결 가이드
**작성일**: 2025-11-05
**문제**: https://misopin.one-q.xyz/calendar-page.html 접속 시 HTTP 404 오류

---

## 🔍 현재 상황 분석

### **확인된 사항**
1. ✅ **cms.one-q.xyz**: Caddy를 통해 응답 중 (HTTP 500 - 별도 이슈)
2. ❌ **misopin.one-q.xyz**: HTTP 404 - 페이지를 찾을 수 없음
3. ✅ **로컬 파일**: `/Users/blee/Desktop/cms/misopin-cms/public/static-pages/calendar-page.html` 존재
4. ❌ **Next.js 서버**: 로컬(localhost:3000)에서 실행 중이 아님
5. ❌ **PM2**: 로컬 환경에 설치되지 않음

### **환경 분석**
- **로컬 환경**: macOS (Desktop/cms/misopin-cms)
- **실제 서버**: 별도 리눅스 서버 (cms.one-q.xyz, misopin.one-q.xyz 호스팅)
- **작업 위치**: 로컬에서 수정 후 서버 배포 필요

---

## 🎯 문제 원인

### **가능한 원인 1: Caddy 설정 누락**
misopin.one-q.xyz에 대한 Caddy 설정이 없거나 잘못 구성됨

**예상 Caddyfile 위치** (서버):
- `/etc/caddy/Caddyfile`
- `/opt/caddy/Caddyfile`
- `~/Caddyfile`

**필요한 설정**:
```caddy
misopin.one-q.xyz {
    root * /var/www/misopin-cms/public/static-pages
    file_server

    # 또는 Next.js를 통한 프록시
    reverse_proxy localhost:3001
}
```

### **가능한 원인 2: 정적 파일 경로 미스매치**
서버의 정적 파일 경로가 Caddy 설정과 일치하지 않음

**확인 필요**:
```bash
# 서버에서 실행
ls -la /var/www/misopin-cms/public/static-pages/calendar-page.html
```

### **가능한 원인 3: 파일 동기화 안 됨**
로컬에서 수정한 `calendar-page.html`이 서버로 배포되지 않음

**확인 필요**:
- 로컬 파일 수정 시간: 2025-11-05 16:48
- 서버 파일 수정 시간: 확인 필요

---

## 🛠️ 해결 방법

### **Step 1: 서버 접속**
```bash
# SSH로 실제 서버 접속
ssh user@your-server-ip

# 또는 서버 도메인으로 접속
ssh user@cms.one-q.xyz
```

### **Step 2: 서버 환경 확인**
```bash
# Caddy 설정 파일 찾기
sudo find /etc /opt ~ -name "Caddyfile" 2>/dev/null

# Caddy 프로세스 확인
ps aux | grep caddy

# Caddy 설정 보기
sudo cat /etc/caddy/Caddyfile

# 정적 파일 위치 확인
ls -la /var/www/misopin-cms/public/static-pages/
```

### **Step 3: Caddy 설정 확인 및 수정**

#### **현재 설정 백업**
```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup-$(date +%Y%m%d-%H%M%S)
```

#### **misopin.one-q.xyz 설정 추가**

**Option A: 정적 파일 직접 서빙**
```caddy
misopin.one-q.xyz {
    # 정적 페이지 디렉토리
    root * /var/www/misopin-cms/public/static-pages

    # 파일 서버 활성화
    file_server

    # 기본 페이지
    try_files {path} {path}.html index.html

    # CORS 설정 (필요 시)
    header {
        Access-Control-Allow-Origin "*"
        Access-Control-Allow-Methods "GET, OPTIONS"
        Access-Control-Allow-Headers "Content-Type"
    }

    # 로그
    log {
        output file /var/log/caddy/misopin.one-q.xyz.log
    }
}
```

**Option B: Next.js를 통한 프록시**
```caddy
misopin.one-q.xyz {
    # Next.js 서버로 프록시
    reverse_proxy localhost:3001

    # 로그
    log {
        output file /var/log/caddy/misopin.one-q.xyz.log
    }
}
```

**권장**: Option A (정적 파일 직접 서빙)
- 더 빠름 (Next.js 거치지 않음)
- HTML 파일이므로 SSR 불필요

#### **설정 적용**
```bash
# Caddy 설정 검증
sudo caddy validate --config /etc/caddy/Caddyfile

# Caddy 재시작
sudo systemctl reload caddy
# 또는
sudo caddy reload --config /etc/caddy/Caddyfile
```

### **Step 4: 파일 동기화**

#### **로컬 → 서버 동기화**
```bash
# 로컬에서 실행 (macOS)
cd /Users/blee/Desktop/cms/misopin-cms

# rsync로 동기화
rsync -avz --progress \
  public/static-pages/calendar-page.html \
  user@your-server:/var/www/misopin-cms/public/static-pages/

# 또는 전체 디렉토리 동기화
rsync -avz --progress \
  public/static-pages/ \
  user@your-server:/var/www/misopin-cms/public/static-pages/
```

#### **파일 권한 설정** (서버)
```bash
# 서버에서 실행
sudo chown -R www-data:www-data /var/www/misopin-cms/public/static-pages/
sudo chmod -R 755 /var/www/misopin-cms/public/static-pages/
```

### **Step 5: 테스트**
```bash
# 로컬에서 테스트
curl -I https://misopin.one-q.xyz/calendar-page.html

# 예상 결과
# HTTP/2 200
# content-type: text/html
# ...

# 브라우저에서 접속
# https://misopin.one-q.xyz/calendar-page.html
```

---

## 📋 전체 작업 체크리스트

### **서버 접속 및 확인**
- [ ] SSH로 실제 서버 접속
- [ ] Caddyfile 위치 확인
- [ ] 현재 Caddy 설정 백업
- [ ] 정적 파일 디렉토리 위치 확인
- [ ] 파일 권한 확인

### **Caddy 설정**
- [ ] misopin.one-q.xyz 블록 추가
- [ ] root 경로 정확히 설정
- [ ] file_server 활성화
- [ ] Caddy 설정 검증 (`caddy validate`)
- [ ] Caddy 재시작 (`systemctl reload caddy`)

### **파일 동기화**
- [ ] 로컬 calendar-page.html → 서버 동기화
- [ ] 파일 권한 설정 (755)
- [ ] 파일 소유자 설정 (www-data)

### **테스트 및 검증**
- [ ] curl로 HTTP 상태 확인 (200 OK)
- [ ] 브라우저로 실제 페이지 접속
- [ ] 예약 폼 동작 확인
- [ ] API 호출 확인 (DevTools Network 탭)

---

## 🚨 추가 문제 해결

### **문제: 여전히 404 반환**
```bash
# Caddy 로그 확인
sudo tail -f /var/log/caddy/misopin.one-q.xyz.log

# Caddy 에러 로그
sudo tail -f /var/log/caddy/error.log

# Caddy 프로세스 상태
sudo systemctl status caddy
```

### **문제: 파일이 있는데 404**
```bash
# 파일 존재 확인
ls -la /var/www/misopin-cms/public/static-pages/calendar-page.html

# 파일 권한 확인
stat /var/www/misopin-cms/public/static-pages/calendar-page.html

# Caddy 실행 사용자 확인
ps aux | grep caddy | grep -v grep

# 파일 읽기 권한 테스트
sudo -u caddy cat /var/www/misopin-cms/public/static-pages/calendar-page.html
```

### **문제: DNS 문제**
```bash
# DNS 확인
nslookup misopin.one-q.xyz
dig misopin.one-q.xyz

# /etc/hosts 확인
cat /etc/hosts | grep misopin
```

---

## 📊 예상 Caddy 전체 설정

```caddy
# /etc/caddy/Caddyfile

# CMS 관리 시스템
cms.one-q.xyz {
    reverse_proxy localhost:3001

    log {
        output file /var/log/caddy/cms.one-q.xyz.log
    }
}

# 정적 페이지 (미소핀 웹사이트)
misopin.one-q.xyz {
    # 정적 페이지 루트
    root * /var/www/misopin-cms/public/static-pages

    # 파일 서버
    file_server

    # .html 확장자 없이도 접근 가능
    try_files {path} {path}.html {path}/index.html

    # CORS (API 호출용)
    header {
        Access-Control-Allow-Origin "*"
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers "Content-Type"
    }

    # 로그
    log {
        output file /var/log/caddy/misopin.one-q.xyz.log
    }
}
```

---

## 🎯 빠른 해결 (Quick Fix)

**가장 간단한 해결 방법**:

```bash
# 1. 서버 접속
ssh user@your-server

# 2. Caddyfile에 추가 (sudo vim /etc/caddy/Caddyfile)
misopin.one-q.xyz {
    root * /var/www/misopin-cms/public/static-pages
    file_server
}

# 3. Caddy 재시작
sudo caddy reload

# 4. 테스트
curl https://misopin.one-q.xyz/calendar-page.html
```

**만약 파일 경로가 다르다면**:
```bash
# 실제 경로 찾기
sudo find /var/www /home /opt -name "calendar-page.html" 2>/dev/null

# 찾은 경로로 Caddyfile 수정
```

---

## 💡 참고 사항

### **서버 정보 확인 방법**
이전 대화에서 언급된 정보:
- CMS 서버: cms.one-q.xyz (응답함, HTTP 500)
- 정적 페이지: misopin.one-q.xyz (404 오류)
- PM2 프로세스: misopin-cms (언급됨)

### **로컬 vs 서버**
- **로컬** (현재 위치): `/Users/blee/Desktop/cms/misopin-cms/`
- **서버** (예상): `/var/www/misopin-cms/`

### **다음 단계**
1. 실제 서버에 접속하여 Caddyfile 확인
2. 필요한 설정 추가
3. 파일 동기화
4. 테스트

---

**작성자**: Claude Code
**상태**: 해결 가이드 작성 완료
**조치 필요**: 실제 서버 접속 및 Caddy 설정 수정
