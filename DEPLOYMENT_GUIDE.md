# 미소핀 CMS 서버 배포 가이드

## 📋 배포 개요

- **서버**: 141.164.60.51 (root 권한)
- **도메인**: cms.one-q.xyz
- **컨테이너 런타임**: Podman
- **데이터베이스**: PostgreSQL 15
- **웹 서버**: Nginx (리버스 프록시)

## 🚀 빠른 시작

### 1. 서버 연결 테스트

```bash
# 실행 권한 부여
chmod +x test-connection.sh

# 서버 연결 테스트
./test-connection.sh
```

### 2. 배포 실행

```bash
# 실행 권한 부여
chmod +x deploy-podman.sh

# 배포 실행
./deploy-podman.sh
```

서버 root 비밀번호가 필요합니다. 배포 스크립트는 다음 작업을 수행합니다:
- 프로젝트 파일을 서버로 복사
- PostgreSQL 컨테이너 설정
- Node.js 애플리케이션 빌드
- CMS 컨테이너 실행
- 데이터베이스 마이그레이션

## 📂 배포 파일 구조

```
/opt/misopin-cms/
├── .env.production        # 프로덕션 환경변수
├── prisma/               # Prisma 스키마
├── src/                  # 소스 코드
├── public/              # 정적 파일
├── package.json         # 의존성 정의
└── nginx.conf          # Nginx 설정
```

## 🔧 서버 초기 설정

서버에서 최초 1회만 실행:

```bash
# 서버에 SSH 접속
ssh root@141.164.60.51

# setup-server.sh 파일을 서버로 복사 후
cd /opt/misopin-cms
chmod +x setup-server.sh
./setup-server.sh
```

이 스크립트는 다음을 설정합니다:
- Podman 설치
- Nginx 설치 및 설정
- 방화벽 규칙 추가
- SSL 인증서 설정
- 시스템 서비스 생성

## 📦 컨테이너 관리

### PostgreSQL 관리

```bash
# PostgreSQL 컨테이너 상태 확인
podman ps | grep misopin-postgres

# PostgreSQL 로그 확인
podman logs misopin-postgres

# PostgreSQL 재시작
podman restart misopin-postgres

# PostgreSQL 접속
podman exec -it misopin-postgres psql -U misopin -d misopin_cms
```

### CMS 애플리케이션 관리

```bash
# CMS 컨테이너 상태 확인
podman ps | grep misopin-cms

# CMS 로그 확인
podman logs misopin-cms

# CMS 재시작
podman restart misopin-cms

# 실시간 로그 모니터링
podman logs -f misopin-cms
```

## 🔐 환경변수

`.env.production` 파일 내용:

```env
# Database
DATABASE_URL="postgresql://misopin:MisopinCMS2025!@localhost:5432/misopin_cms"

# NextAuth.js
NEXTAUTH_SECRET="Tz39kg/GwmtWWqaiCCnBVHgfPWU3k/uCRUlN3aJERcY="
NEXTAUTH_URL="https://cms.one-q.xyz"

# Node
NODE_ENV="production"
```

## 🌐 Nginx 설정

Nginx는 다음과 같이 설정됩니다:
- HTTP(80) → HTTPS(443) 자동 리다이렉트
- SSL/TLS 암호화 (Let's Encrypt)
- Node.js 애플리케이션으로 프록시
- 정적 파일 캐싱
- 보안 헤더 추가

설정 파일 위치: `/etc/nginx/conf.d/cms.one-q.xyz.conf`

## 📊 모니터링

### 시스템 상태 확인

```bash
# 전체 컨테이너 상태
podman ps -a

# 시스템 리소스 사용량
htop

# 디스크 사용량
df -h

# Nginx 상태
systemctl status nginx
```

### 애플리케이션 로그

```bash
# CMS 애플리케이션 로그
podman logs misopin-cms --tail 50

# PostgreSQL 로그
podman logs misopin-postgres --tail 50

# Nginx 액세스 로그
tail -f /var/log/nginx/cms.one-q.xyz.access.log

# Nginx 에러 로그
tail -f /var/log/nginx/cms.one-q.xyz.error.log
```

## 🔄 업데이트 배포

코드 변경 후 재배포:

```bash
# 1. 로컬에서 변경사항 커밋
git add .
git commit -m "Update features"
git push

# 2. 배포 스크립트 실행
./deploy-podman.sh

# 배포 스크립트가 자동으로:
# - 새 코드를 서버로 복사
# - 애플리케이션 재빌드
# - 컨테이너 재시작
```

## 🚨 트러블슈팅

### 컨테이너가 시작되지 않을 때

```bash
# 컨테이너 로그 확인
podman logs misopin-cms

# 컨테이너 재생성
podman stop misopin-cms
podman rm misopin-cms
# deploy-podman.sh 재실행
```

### 데이터베이스 연결 실패

```bash
# PostgreSQL 상태 확인
podman ps | grep postgres

# PostgreSQL 재시작
podman restart misopin-postgres

# 환경변수 확인
cat /opt/misopin-cms/.env.production
```

### Nginx 502 Bad Gateway

```bash
# CMS 앱이 실행 중인지 확인
podman ps | grep misopin-cms

# Nginx 설정 테스트
nginx -t

# Nginx 재시작
systemctl restart nginx
```

## 📝 체크리스트

- [ ] SSH root 접속 가능 확인
- [ ] 서버에 Podman 설치
- [ ] DNS 설정 (cms.one-q.xyz → 141.164.60.51)
- [ ] 방화벽 포트 개방 (80, 443, 3000, 5432)
- [ ] SSL 인증서 설정
- [ ] Nginx 리버스 프록시 설정
- [ ] PostgreSQL 데이터베이스 실행
- [ ] CMS 애플리케이션 실행
- [ ] 브라우저에서 접속 테스트

## 🔗 접속 정보

배포 완료 후:
- CMS 관리자: https://cms.one-q.xyz/admin
- 기본 계정: admin@misopin.com / Admin123!@#

## 📞 지원

문제 발생 시:
1. 로그 확인 (`podman logs misopin-cms`)
2. 서버 상태 확인 (`podman ps -a`)
3. 네트워크 연결 확인 (`curl http://localhost:3000`)