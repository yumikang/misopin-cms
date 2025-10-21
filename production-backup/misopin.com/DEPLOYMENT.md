# 🚀 Misopin 자동 배포 가이드

## 📋 개요

GitHub Actions를 통해 `master` 브랜치에 푸시하면 자동으로 프로덕션 서버에 배포됩니다.

**배포 플로우:**
```
로컬 수정 ✏️ → Git Push 📤 → GitHub Actions 실행 🤖 → 서버 자동 배포 🚀 → 완료 ✅
```

---

## 🔧 초기 설정 (1회만)

### 1. GitHub Secrets 설정

GitHub 저장소에서 SSH 키를 Secret으로 등록해야 합니다.

#### 단계별 설정:

1. **GitHub 저장소 이동**
   - https://github.com/yumikang/Misopin-renew

2. **Settings → Secrets and variables → Actions 클릭**

3. **"New repository secret" 버튼 클릭**

4. **Secret 추가**
   - Name: `SSH_PRIVATE_KEY`
   - Value: 아래 SSH 개인키 전체 복사

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCH1LSUMLE2LSrWq6Re8C1OqbW7/cYYGsFKP3HALU10OAAAAKAMhY9QDIWP
UAAAAAtzc2gtZWQyNTUxOQAAACCH1LSUMLE2LSrWq6Re8C1OqbW7/cYYGsFKP3HALU10OA
AAAECZNyyrt6yGLzjfp3OrSZ2skVyrIteoyvmRa/QnP0zI64fUtJQwsTYtKtarpF7wLU6p
tbv9xhgawUo/ccAtTXQ4AAAAHWdpdGh1Yi1hY3Rpb25zQG1pc29waW4tZGVwbG95
-----END OPENSSH PRIVATE KEY-----
```

5. **"Add secret" 버튼 클릭**

✅ 설정 완료!

---

## 🎯 배포 전략

### 개발 단계 vs 운영 단계

이 프로젝트는 **단일 브랜치(master) + 수동 제어** 방식을 사용합니다.

#### 🚧 개발 단계 (현재)
```yaml
# .github/workflows/deploy.yml
env:
  AUTO_DEPLOY: true  # ✅ 자동 배포 활성화
```

**워크플로우:**
1. ✏️ 로컬에서 HTML/CSS/JS 수정
2. 📤 `git push origin master`
3. 🤖 GitHub Actions 자동 실행
4. 🚀 서버에 자동 배포
5. ✅ 완료 (1-2분 소요)

**CMS 역할:** 테스트 전용 (Git이 최종 진실의 원천)

#### 🏭 운영 단계 (미래)
```yaml
# .github/workflows/deploy.yml
env:
  AUTO_DEPLOY: false  # ❌ 자동 배포 비활성화
```

**워크플로우:**
1. 🚫 로컬 수정 중단
2. 🖥️ CMS에서만 콘텐츠 편집
3. 💾 변경사항이 HTML 파일에 직접 저장
4. ✅ 즉시 반영 (배포 불필요)

**Git 역할:** 수동 배포만 가능 (workflow_dispatch)

---

### 🔄 개발 → 운영 전환 방법

#### 1단계: 자동 배포 비활성화
```bash
# 로컬에서 수정
vim .github/workflows/deploy.yml

# AUTO_DEPLOY를 false로 변경
env:
  AUTO_DEPLOY: false

# Git에 커밋 & 푸시 (마지막 자동 배포)
git add .github/workflows/deploy.yml
git commit -m "chore: 운영 모드로 전환 - 자동 배포 비활성화"
git push origin master
```

#### 2단계: 팀에 공지
- 📢 로컬 수정 중단 안내
- 📢 CMS 전용 편집 안내
- 📢 긴급 시 수동 배포 방법 안내

#### 3단계: 운영 시작
- ✅ CMS에서 콘텐츠 편집
- ✅ 변경사항 즉시 반영
- ⚠️ Git push 해도 자동 배포 안됨

---

### ❓ 왜 브랜치 분리 방식을 사용하지 않나요?

**제안된 방식 (문제 있음):**
```
develop 브랜치 → /var/www/misopin.com
master 브랜치 → /var/www/misopin.com
```

**문제점:**
1. 💥 **동일 경로 충돌**: 두 브랜치가 같은 파일을 덮어씀
2. 🔄 **CMS 혼란**: CMS가 어느 브랜치 파일을 수정하는지 알 수 없음
3. 🚨 **데이터 손실 위험**: 한 브랜치의 변경사항이 다른 브랜치에 의해 삭제될 수 있음

**권장 방식:**
- ✅ 단일 브랜치(master)
- ✅ `AUTO_DEPLOY` 환경 변수로 제어
- ✅ 명확한 책임 분리 (개발: Git, 운영: CMS)

---

## 🎯 사용 방법

### 자동 배포 (개발 단계)

1. **파일 수정**
   ```bash
   # HTML, CSS, JS 파일 수정
   vim index.html
   ```

2. **Git 커밋 & 푸시**
   ```bash
   git add .
   git commit -m "feat: 메인 페이지 업데이트"
   git push origin master
   ```

3. **자동 배포 시작** 🤖
   - GitHub Actions가 자동으로 실행됩니다
   - 진행 상황: https://github.com/yumikang/Misopin-renew/actions

4. **완료 확인** ✅
   - 약 1-2분 후 자동 배포 완료
   - 사이트 확인: http://misopin.one-q.xyz

### 수동 배포 (운영 단계 또는 긴급 상황)

**조건:** `AUTO_DEPLOY: false`로 설정되어 있어야 함

GitHub Actions 페이지에서:
1. "Deploy to Production" 워크플로우 선택
2. "Run workflow" 버튼 클릭
3. 배포 사유 입력 (선택)
4. "Run workflow" 재확인

---

## 📊 배포 프로세스

GitHub Actions가 자동으로 실행하는 작업:

1. **📥 코드 체크아웃**
   - 최신 master 브랜치 코드 가져오기

2. **🔑 SSH 연결 설정**
   - 서버 접속 준비

3. **📤 파일 배포**
   - rsync로 변경된 파일만 동기화
   - 불필요한 파일 제외 (.git, node_modules 등)

4. **🔧 권한 설정**
   - root:caddy 소유권 설정
   - HTML 파일 664 권한 (CMS 수정 가능)

5. **📊 검증**
   - 파일 수 확인
   - 디스크 사용량 확인
   - HTTP 200 응답 확인

6. **💾 백업 생성**
   - 배포 완료 후 자동 백업

7. **🎉 완료**
   - 사이트 즉시 반영

---

## 🔍 배포 모니터링

### GitHub Actions 로그 확인

1. **실행 목록 보기**
   - https://github.com/yumikang/Misopin-renew/actions

2. **특정 워크플로우 클릭**
   - 각 단계별 로그 확인 가능
   - 실패 시 오류 메시지 확인

3. **알림 설정**
   - GitHub 프로필 → Settings → Notifications
   - "Actions" 알림 활성화

### 배포 상태 확인

```bash
# 서버 접속
ssh root@141.164.60.51

# 최근 배포 파일 확인
ls -lt /var/www/misopin.com/*.html | head -5

# 배포 로그 확인
tail -f /var/log/caddy/misopin-static.log

# 백업 확인
ls -lh /var/www/misopin.com/.backups/ | tail -5
```

---

## ⚠️ 주의사항

### 배포되는 파일
- ✅ HTML, CSS, JS, 이미지 파일
- ✅ assets, css, js 디렉토리

### 배포되지 않는 파일
- ❌ `.git` (Git 메타데이터)
- ❌ `.github` (GitHub Actions 설정)
- ❌ `node_modules` (NPM 패키지)
- ❌ `.next` (빌드 파일)
- ❌ `.DS_Store` (macOS 메타데이터)
- ❌ `*.log` (로그 파일)

### 안전장치
- 🛡️ 배포 전 자동 백업
- 🛡️ 배포 후 HTTP 200 검증
- 🛡️ 실패 시 자동 중단
- 🛡️ 롤백 가능 (백업에서 복원)

### ⚠️ Git vs CMS 충돌 방지

**중요:** 동시에 Git과 CMS로 수정하면 데이터 손실 발생 가능

**개발 단계 (AUTO_DEPLOY: true):**
```
✅ Git으로만 수정 → 자동 배포 → 서버 파일 업데이트
⚠️ CMS 수정은 테스트만 (Git push 시 덮어씌워짐)
```

**운영 단계 (AUTO_DEPLOY: false):**
```
✅ CMS로만 수정 → 서버 파일 직접 업데이트 → 즉시 반영
⚠️ Git push 해도 자동 배포 안됨 (수동 배포만 가능)
🚨 수동 배포 시 CMS 변경사항 덮어씌워짐 주의!
```

**권장 사항:**
1. 개발 단계에서는 CMS를 편집기로만 사용 (저장 후 Git에 반영)
2. 운영 단계로 전환 전 최종 Git 커밋 & 푸시 확인
3. 운영 중에는 긴급 상황이 아니면 수동 배포 금지

---

## 🔄 롤백 (이전 버전으로 복구)

### 방법 1: Git으로 롤백

```bash
# 이전 커밋 확인
git log --oneline -5

# 특정 커밋으로 되돌리기
git revert <commit-hash>
git push origin master

# 자동 배포로 이전 버전 배포됨
```

### 방법 2: 백업에서 직접 복원

```bash
# 서버 접속
ssh root@141.164.60.51

# 백업 목록 확인
ls -lh /var/www/misopin.com/.backups/

# 특정 백업으로 복원
cd /var/www
tar -xzf misopin.com/.backups/daily-YYYYMMDD-HHMMSS.tar.gz

# 권한 재설정
chown -R root:caddy misopin.com
find misopin.com -type f -name '*.html' -exec chmod 664 {} \;
```

---

## 🐛 트러블슈팅

### 배포가 실패하는 경우

#### 1. SSH 연결 실패
```
Error: Permission denied (publickey)
```

**해결:**
- GitHub Secrets에 `SSH_PRIVATE_KEY`가 올바르게 등록되었는지 확인
- 키에 `-----BEGIN OPENSSH PRIVATE KEY-----`와 `-----END OPENSSH PRIVATE KEY-----` 포함 확인

#### 2. rsync 실패
```
Error: rsync error: some files/attrs were not transferred
```

**해결:**
- 파일 권한 문제: 서버에서 `/var/www/misopin.com` 권한 확인
- 디스크 용량 문제: `df -h` 명령으로 용량 확인

#### 3. 사이트 접속 불가
```
Error: Site responded with HTTP 000 or 500
```

**해결:**
```bash
# Caddy 상태 확인
systemctl status caddy

# Caddy 재시작
systemctl restart caddy

# 설정 검증
caddy validate --config /etc/caddy/Caddyfile
```

### 수동 배포로 긴급 복구

```bash
# 로컬에서 서버로 직접 배포
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  ./ root@141.164.60.51:/var/www/misopin.com/

# 권한 설정
ssh root@141.164.60.51 "
  chown -R root:caddy /var/www/misopin.com
  find /var/www/misopin.com -type f -name '*.html' -exec chmod 664 {} \;
"
```

---

## 📈 모니터링

### 배포 통계

GitHub Actions 페이지에서 확인:
- 평균 배포 시간
- 성공/실패 비율
- 최근 배포 이력

### 서버 모니터링

```bash
# 실시간 로그 모니터링
tail -f /var/log/caddy/misopin-static.log

# 헬스체크 로그
tail -f /var/log/misopin-health.log

# 디스크 사용량
du -sh /var/www/misopin.com

# 최근 백업 확인
ls -lh /var/www/misopin.com/.backups/ | tail -5
```

---

## 🔗 관련 링크

- **프로덕션 사이트**: http://misopin.one-q.xyz
- **CMS 관리자**: https://cms.one-q.xyz
- **GitHub 저장소**: https://github.com/yumikang/Misopin-renew
- **GitHub Actions**: https://github.com/yumikang/Misopin-renew/actions

---

## 📞 문제 발생 시

1. GitHub Actions 로그 확인
2. 서버 로그 확인 (`/var/log/caddy/misopin-static.log`)
3. 백업에서 복원 고려
4. 긴급 시 수동 배포

**배포 시스템 버전**: 1.0.0
**마지막 업데이트**: 2025-10-13
