# 정적 페이지 편집기 배포 계획서 (개정판)

**작성일**: 2025-10-13
**목표**: 기존 PostgreSQL 서버 활용 및 자체 서버(one-q.xyz) 배포

---

## 📋 전체 프로세스 개요

```
Phase 1: 로컬 환경 완성 (Podman PostgreSQL)
   └─> 로컬 개발 및 테스트

Phase 2: 기존 서버 DB 설정 (141.164.60.51)
   └─> PostgreSQL 설정 및 misopin_cms DB 생성

Phase 3: 프로덕션 마이그레이션
   └─> 스키마 적용 및 시딩

Phase 4: 자체 서버 배포 (one-q.xyz)
   └─> PM2 + Nginx로 Next.js 배포
```

---

## 🎯 Phase 1: 로컬 환경 완성

### 목표
- ✅ Podman PostgreSQL 로컬 DB 구축
- ✅ 마이그레이션 완료
- ✅ 시딩 완료
- ✅ 5개 페이지 편집 기능 테스트

### 소요 시간: 30분

---

### Step 1.1: Podman PostgreSQL 컨테이너 시작

```bash
# 1. 기존 컨테이너 확인 및 정리
podman ps -a | grep misopin-postgres

# 기존 컨테이너가 있다면 삭제
podman rm -f misopin-postgres

# 2. PostgreSQL 16 컨테이너 실행
podman run -d \
  --name misopin-postgres \
  -e POSTGRES_USER=misopin \
  -e POSTGRES_PASSWORD=misopin123 \
  -e POSTGRES_DB=misopin_cms \
  -p 5432:5432 \
  postgres:16-alpine

# 3. 실행 확인
podman ps

# 4. 로그 확인 (PostgreSQL 준비 완료 대기)
podman logs misopin-postgres
```

**성공 조건**:
```
database system is ready to accept connections
```

**예상 문제 및 해결책**:
```bash
# 문제 1: 포트 5432 충돌
# 해결: 기존 PostgreSQL 중지
lsof -i :5432
brew services stop postgresql

# 문제 2: Podman 머신 미실행
# 해결: Podman 머신 시작
podman machine start

# 문제 3: 네트워크 오류
# 해결: Podman 재시작
podman machine stop && podman machine start
```

---

### Step 1.2: 환경변수 설정

```bash
cd /Users/blee/Desktop/cms/misopin-cms

# .env.local 생성
cat > .env.local << 'EOF'
# ============= 로컬 개발 환경 =============
DATABASE_URL="postgresql://misopin:misopin123@localhost:5432/misopin_cms"
STATIC_PAGES_DIR="/Users/blee/Desktop/cms/Misopin-renew"
NODE_ENV=development
EOF

# 확인
cat .env.local
```

**검증**:
```bash
# DATABASE_URL 형식 확인
grep DATABASE_URL .env.local

# STATIC_PAGES_DIR 경로 확인
ls -la /Users/blee/Desktop/cms/Misopin-renew/
```

---

### Step 1.3: Prisma 마이그레이션

```bash
# 1. Prisma Client 재생성
npx prisma generate

# 2. 마이그레이션 적용
npx prisma migrate deploy

# 실패 시: 마이그레이션 파일이 없는 경우
npx prisma migrate dev --name init
```

**성공 조건**:
```
✔ Generated Prisma Client
✔ Migrations applied successfully
```

**예상 문제 및 해결책**:
```bash
# 문제 1: 연결 실패
# 확인: PostgreSQL 실행 상태
podman ps | grep misopin-postgres

# 문제 2: 마이그레이션 파일 없음
# 해결: 초기 마이그레이션 생성
npx prisma migrate dev --name init

# 문제 3: 기존 테이블 충돌
# 해결: 데이터베이스 초기화
podman exec -it misopin-postgres psql -U misopin -c "DROP DATABASE misopin_cms;"
podman exec -it misopin-postgres psql -U misopin -c "CREATE DATABASE misopin_cms;"
npx prisma migrate deploy
```

---

### Step 1.4: 시딩 실행

```bash
# 시딩 스크립트 실행
npm run db:seed:static
```

**예상 출력**:
```
🌱 정적 페이지 시딩 시작...

📄 처리 중: 메인 페이지 (index.html)
   ✅ 45개 섹션 파싱 완료
   ✅ 페이지 생성 완료

📄 처리 중: 병원 소개 (about.html)
   ✅ 32개 섹션 파싱 완료
   ✅ 페이지 생성 완료

[...]

✨ 시딩 완료!
   성공: 5개
   실패: 0개
```

**검증**:
```bash
# Prisma Studio로 확인
npx prisma studio

# 또는 psql로 확인
podman exec -it misopin-postgres psql -U misopin -d misopin_cms \
  -c "SELECT slug, title FROM static_pages;"
```

---

### Step 1.5: 로컬 개발 서버 테스트

```bash
# 개발 서버 시작
npm run dev
```

**테스트 시나리오**:

#### Test 1: 페이지 목록 조회
```
URL: http://localhost:3003/admin/static-pages
확인:
- [ ] 5개 페이지 표시
- [ ] 각 페이지 제목 및 슬러그 표시
- [ ] 편집 버튼 작동
```

#### Test 2: 페이지 편집 - 텍스트 수정
```
1. "병원 소개" 페이지 편집 클릭
2. 텍스트 탭에서 제목 수정
3. "변경사항 저장" 클릭
4. 성공 메시지 확인
```

#### Test 3: 버전 기록 확인
```
1. 편집한 페이지에서 "버전 기록" 탭 클릭
2. v1 (초기 시딩) 및 v2 (수정본) 확인
```

---

### Phase 1 체크리스트

**인프라**:
- [ ] Podman 머신 실행 중
- [ ] PostgreSQL 컨테이너 실행 중 (포트 5432)

**데이터베이스**:
- [ ] `static_pages` 테이블 생성됨
- [ ] `static_page_versions` 테이블 생성됨
- [ ] 5개 페이지 시딩 완료

**애플리케이션**:
- [ ] .env.local 설정 완료
- [ ] Prisma Client 생성됨
- [ ] 개발 서버 실행 중

**기능 테스트**:
- [ ] 페이지 목록 표시
- [ ] 페이지 편집 가능
- [ ] 버전 기록 표시

---

## 🎯 Phase 2: 기존 서버 DB 설정 (141.164.60.51)

### 목표
- 기존 PostgreSQL 서버 활용
- misopin_cms 데이터베이스 생성
- 사용자 권한 설정
- 외부 접속 허용

### 소요 시간: 30-45분

---

### Step 2.1: 서버 접속 및 PostgreSQL 상태 확인

```bash
# SSH 접속
ssh root@141.164.60.51

# PostgreSQL 버전 및 실행 상태 확인
sudo -u postgres psql --version
sudo systemctl status postgresql

# PostgreSQL이 실행 중이어야 함
# ● postgresql.service - PostgreSQL RDBMS
#    Active: active (running)
```

**예상 출력**:
```
PostgreSQL 14.x 또는 15.x 또는 16.x
Active: active (running)
```

**문제 발생 시**:
```bash
# PostgreSQL 미실행 시
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 버전이 너무 낮으면 (< 14)
# PostgreSQL 업그레이드 고려 (별도 문서 참조)
```

---

### Step 2.2: 데이터베이스 및 사용자 생성

```bash
# PostgreSQL 접속
sudo -u postgres psql

# 아래 SQL 명령어 실행
```

```sql
-- 1. 데이터베이스 생성
CREATE DATABASE misopin_cms;

-- 2. 사용자 생성 (강력한 비밀번호 사용)
CREATE USER misopin_user WITH PASSWORD 'your_secure_password_here';

-- 3. 권한 부여
GRANT ALL PRIVILEGES ON DATABASE misopin_cms TO misopin_user;

-- 4. 데이터베이스 연결
\c misopin_cms

-- 5. 스키마 권한 부여
GRANT ALL ON SCHEMA public TO misopin_user;

-- 6. 확인
\l misopin_cms
\du misopin_user

-- 7. 종료
\q
```

**성공 조건**:
```
CREATE DATABASE
CREATE ROLE
GRANT
```

**중요**: `your_secure_password_here`를 실제 강력한 비밀번호로 변경하세요!

---

### Step 2.3: PostgreSQL 외부 접속 허용

```bash
# 1. PostgreSQL 버전 확인
ls /etc/postgresql/

# 버전 폴더 확인 (예: 14, 15, 16)
# 아래 명령어에서 [VERSION]을 실제 버전으로 교체

# 2. postgresql.conf 수정 - 외부 접속 허용
sudo vim /etc/postgresql/[VERSION]/main/postgresql.conf

# 다음 줄을 찾아서 수정:
# listen_addresses = 'localhost'
# 아래와 같이 변경:
listen_addresses = '*'
```

```bash
# 3. pg_hba.conf 수정 - 인증 방식 설정
sudo vim /etc/postgresql/[VERSION]/main/pg_hba.conf

# 파일 끝에 다음 줄 추가:
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    misopin_cms     misopin_user    0.0.0.0/0               md5

# 주의: 보안을 위해 특정 IP만 허용하려면:
# host    misopin_cms     misopin_user    YOUR_IP/32              md5
```

**설정 예시 (pg_hba.conf)**:
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
host    misopin_cms     misopin_user    0.0.0.0/0               md5

# IPv6 local connections:
host    all             all             ::1/128                 md5
```

---

### Step 2.4: PostgreSQL 재시작 및 검증

```bash
# 1. PostgreSQL 재시작
sudo systemctl restart postgresql

# 2. 재시작 확인
sudo systemctl status postgresql

# 3. 포트 5432 리스닝 확인
sudo netstat -tlnp | grep 5432
# 또는
sudo ss -tlnp | grep 5432
```

**예상 출력**:
```
tcp        0      0 0.0.0.0:5432            0.0.0.0:*               LISTEN
```

---

### Step 2.5: 방화벽 설정

```bash
# UFW 사용 시
sudo ufw allow 5432/tcp
sudo ufw status

# iptables 사용 시
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4

# 클라우드 제공자 방화벽 설정도 확인 필요
# (AWS Security Group, DigitalOcean Firewall 등)
```

---

### Step 2.6: 로컬에서 연결 테스트

```bash
# 로컬 머신에서 실행 (서버 SSH 종료 후)
psql "postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms"

# 또는 Podman으로 테스트
podman run --rm -it postgres:16-alpine \
  psql "postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms"
```

**성공 조건**:
```
psql (16.x)
Type "help" for help.

misopin_cms=>
```

**연결 테스트 쿼리**:
```sql
-- 데이터베이스 목록
\l

-- 현재 사용자 확인
SELECT current_user, current_database();

-- 종료
\q
```

---

### Phase 2 체크리스트

**서버 설정**:
- [ ] PostgreSQL 실행 중
- [ ] misopin_cms 데이터베이스 생성됨
- [ ] misopin_user 사용자 생성됨
- [ ] 권한 설정 완료

**네트워크 설정**:
- [ ] listen_addresses = '*' 설정됨
- [ ] pg_hba.conf에 접속 규칙 추가됨
- [ ] PostgreSQL 재시작 완료
- [ ] 포트 5432 리스닝 확인됨
- [ ] 방화벽 규칙 추가됨

**연결 테스트**:
- [ ] 로컬에서 프로덕션 DB 접속 성공
- [ ] SQL 쿼리 실행 가능

---

## 🎯 Phase 3: 프로덕션 마이그레이션

### 목표
- 프로덕션 DB에 스키마 적용
- 초기 데이터 시딩
- 연결 및 동작 검증

### 소요 시간: 20-30분

---

### Step 3.1: 프로덕션 환경변수 설정

```bash
cd /Users/blee/Desktop/cms/misopin-cms

# .env.production 생성
cat > .env.production << 'EOF'
# ============= 프로덕션 환경 =============
DATABASE_URL="postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms"
STATIC_PAGES_DIR="/var/www/Misopin-renew"
NODE_ENV=production
EOF

# 확인
cat .env.production
```

**중요**: 비밀번호를 실제 값으로 교체하세요!

---

### Step 3.2: 프로덕션 마이그레이션 실행

```bash
# 프로덕션 DATABASE_URL 사용하여 마이그레이션 적용
DATABASE_URL="postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms" \
  npx prisma migrate deploy
```

**예상 출력**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

Applying migration `XXXXXX_init`

The following migration(s) have been applied:

migrations/
  └─ XXXXXX_init/
      └─ migration.sql

All migrations have been successfully applied.
```

**검증**:
```bash
# 테이블 생성 확인
psql "postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms" \
  -c "\dt"
```

**예상 출력**:
```
                List of relations
 Schema |         Name          | Type  |    Owner
--------+-----------------------+-------+--------------
 public | static_pages          | table | misopin_user
 public | static_page_versions  | table | misopin_user
 public | users                 | table | misopin_user
 [...]
```

---

### Step 3.3: 프로덕션 시딩

**옵션 A: 시드 스크립트 실행 (권장)**

```bash
# 프로덕션 DB에 직접 시딩
DATABASE_URL="postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms" \
STATIC_PAGES_DIR="/Users/blee/Desktop/cms/Misopin-renew" \
  npm run db:seed:static
```

**주의**: STATIC_PAGES_DIR은 로컬 경로 사용 (로컬에서 HTML 파일을 읽어서 DB에 저장)

**옵션 B: 로컬 데이터 덤프 후 복원**

```bash
# 1. 로컬 데이터 덤프
pg_dump -h localhost -U misopin -d misopin_cms \
  --table=static_pages --table=static_page_versions \
  --data-only --inserts > static_pages_dump.sql

# 2. 프로덕션에 복원
psql "postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms" \
  -f static_pages_dump.sql
```

**검증**:
```bash
# 데이터 확인
psql "postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms" \
  -c "SELECT slug, title FROM static_pages;"
```

**예상 출력**:
```
  slug   |      title
---------+-----------------
 index   | 메인 페이지
 about   | 병원 소개
 botox   | 보톡스 시술
 filler  | 필러 시술
 lifting | 리프팅 시술
(5 rows)
```

---

### Phase 3 체크리스트

**마이그레이션**:
- [ ] 프로덕션 DB 연결 성공
- [ ] 마이그레이션 적용 완료
- [ ] 모든 테이블 생성 확인

**시딩**:
- [ ] 5개 페이지 데이터 삽입 완료
- [ ] 섹션 데이터 확인

**검증**:
- [ ] 테이블 목록 확인
- [ ] 데이터 조회 성공

---

## 🎯 Phase 4: 자체 서버 배포 (one-q.xyz)

### 목표
- one-q.xyz 서버에 Next.js 애플리케이션 배포
- PM2로 프로세스 관리
- Nginx로 리버스 프록시 설정
- 도메인 연결 및 SSL 설정

### 소요 시간: 1-2시간

---

### Step 4.1: 서버 준비 및 Node.js 설치

```bash
# SSH 접속 (one-q.xyz 서버)
ssh root@one-q.xyz
# 또는 IP로 접속
# ssh root@SERVER_IP

# Node.js 설치 확인
node --version
npm --version

# Node.js 미설치 시 (권장: Node.js 18 LTS 이상)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v18.x.x 이상
npm --version   # 9.x.x 이상
```

---

### Step 4.2: PM2 설치

```bash
# PM2 글로벌 설치
sudo npm install -g pm2

# PM2 버전 확인
pm2 --version

# PM2 자동 시작 설정
pm2 startup systemd
# 출력된 명령어를 복사해서 실행
```

---

### Step 4.3: 애플리케이션 디렉토리 준비

```bash
# 애플리케이션 디렉토리 생성
sudo mkdir -p /var/www/misopin-cms
sudo chown $USER:$USER /var/www/misopin-cms

cd /var/www/misopin-cms

# Git 설치 확인
git --version

# Git 미설치 시
sudo apt-get install -y git
```

---

### Step 4.4: 코드 배포

**옵션 A: Git으로 배포 (권장)**

```bash
cd /var/www/misopin-cms

# Git 저장소 클론
git clone https://github.com/YOUR_USERNAME/misopin-cms.git .

# 또는 기존 저장소 업데이트
git pull origin main
```

**옵션 B: rsync로 배포**

```bash
# 로컬 머신에서 실행
rsync -avz --exclude 'node_modules' --exclude '.next' \
  /Users/blee/Desktop/cms/misopin-cms/ \
  root@one-q.xyz:/var/www/misopin-cms/
```

---

### Step 4.5: 환경변수 설정

```bash
cd /var/www/misopin-cms

# .env.production 생성
cat > .env.production << 'EOF'
# ============= 프로덕션 환경 =============
DATABASE_URL="postgresql://misopin_user:your_secure_password_here@141.164.60.51:5432/misopin_cms"
STATIC_PAGES_DIR="/var/www/Misopin-renew"
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://one-q.xyz
PORT=3000
EOF

# 확인
cat .env.production
```

---

### Step 4.6: 정적 페이지 파일 배포

```bash
# 정적 페이지 디렉토리 생성
sudo mkdir -p /var/www/Misopin-renew
sudo chown $USER:$USER /var/www/Misopin-renew

# 로컬에서 HTML 파일 업로드 (로컬 머신에서 실행)
rsync -avz /Users/blee/Desktop/cms/Misopin-renew/ \
  root@one-q.xyz:/var/www/Misopin-renew/

# 서버에서 파일 확인
ls -la /var/www/Misopin-renew/
```

---

### Step 4.7: 의존성 설치 및 빌드

```bash
cd /var/www/misopin-cms

# 1. 의존성 설치
npm ci --production=false

# 2. Prisma Client 생성
npx prisma generate

# 3. Next.js 빌드
npm run build
```

**예상 출력**:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    [...]
├ ○ /admin/static-pages                  [...]
└ ○ /api/static-pages                    [...]

○  (Static)  prerendered as static content
```

**빌드 성공 조건**:
- [ ] 빌드 에러 없음
- [ ] .next 폴더 생성됨

---

### Step 4.8: PM2로 애플리케이션 시작

```bash
cd /var/www/misopin-cms

# PM2 ecosystem 파일 생성
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'misopin-cms',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/misopin-cms',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# PM2로 애플리케이션 시작
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 로그 확인
pm2 logs misopin-cms

# PM2 설정 저장 (서버 재시작 시 자동 실행)
pm2 save
```

**예상 출력**:
```
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ mode        │ ↺       │ status  │ cpu      │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ misopin-cms  │ fork        │ 0       │ online  │ 0%       │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘
```

**테스트**:
```bash
# 로컬에서 접속 테스트
curl http://one-q.xyz:3000/api/static-pages
```

---

### Step 4.9: Nginx 설치 및 설정

```bash
# Nginx 설치
sudo apt-get update
sudo apt-get install -y nginx

# Nginx 실행 및 활성화
sudo systemctl start nginx
sudo systemctl enable nginx

# Nginx 설정 파일 생성
sudo vim /etc/nginx/sites-available/misopin-cms
```

**Nginx 설정 내용**:
```nginx
server {
    listen 80;
    server_name one-q.xyz www.one-q.xyz;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 정적 파일 직접 서빙 (선택 사항)
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 설정 파일 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/misopin-cms /etc/nginx/sites-enabled/

# 기본 설정 파일 제거 (선택)
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

**예상 출력**:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

### Step 4.10: 도메인 DNS 설정

**도메인 등록 업체에서 설정**:

```
A 레코드:
one-q.xyz       →  SERVER_IP
www.one-q.xyz   →  SERVER_IP
```

**DNS 전파 확인** (로컬에서):
```bash
# DNS 조회
nslookup one-q.xyz
dig one-q.xyz

# HTTP 접속 테스트
curl http://one-q.xyz
```

---

### Step 4.11: SSL 인증서 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 및 자동 설정
sudo certbot --nginx -d one-q.xyz -d www.one-q.xyz

# 이메일 입력 및 약관 동의
# 자동으로 Nginx 설정 업데이트됨

# 인증서 자동 갱신 테스트
sudo certbot renew --dry-run
```

**성공 후 Nginx 설정 자동 업데이트**:
```nginx
server {
    listen 443 ssl http2;
    server_name one-q.xyz www.one-q.xyz;

    ssl_certificate /etc/letsencrypt/live/one-q.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/one-q.xyz/privkey.pem;

    # [나머지 설정은 동일]
}

server {
    listen 80;
    server_name one-q.xyz www.one-q.xyz;
    return 301 https://$server_name$request_uri;
}
```

---

### Step 4.12: 배포 검증

**체크리스트**:
- [ ] https://one-q.xyz 접속 가능
- [ ] https://one-q.xyz/admin/static-pages 접속 가능
- [ ] 페이지 목록 표시
- [ ] 페이지 편집 가능
- [ ] 저장 시 데이터베이스 업데이트 확인
- [ ] 버전 기록 표시

**테스트 명령어** (로컬에서):
```bash
# HTTPS 접속 테스트
curl https://one-q.xyz

# API 테스트
curl https://one-q.xyz/api/static-pages

# 페이지 조회
curl https://one-q.xyz/api/static-pages/[id]
```

---

### Phase 4 체크리스트

**서버 준비**:
- [ ] Node.js 18+ 설치됨
- [ ] PM2 설치됨
- [ ] Nginx 설치됨

**애플리케이션**:
- [ ] 코드 배포 완료
- [ ] 환경변수 설정 완료
- [ ] 의존성 설치 완료
- [ ] Next.js 빌드 성공
- [ ] PM2로 실행 중

**네트워크**:
- [ ] Nginx 리버스 프록시 설정됨
- [ ] DNS A 레코드 설정됨
- [ ] SSL 인증서 발급됨
- [ ] HTTPS 접속 가능

**기능 검증**:
- [ ] 페이지 목록 조회
- [ ] 페이지 편집
- [ ] 데이터베이스 저장
- [ ] 버전 관리

---

## 📊 전체 타임라인

| Phase | 작업 | 예상 시간 | 상태 |
|-------|------|-----------|------|
| 1 | 로컬 환경 완성 (Podman PostgreSQL) | 30분 | ⏳ 대기 |
| 2 | 기존 서버 DB 설정 (141.164.60.51) | 30-45분 | ⏳ 대기 |
| 3 | 프로덕션 마이그레이션 | 20-30분 | ⏳ 대기 |
| 4 | 자체 서버 배포 (one-q.xyz) | 1-2시간 | ⏳ 대기 |
| **전체** | | **3-4시간** | |

---

## 🚨 예상 문제 및 해결책

### 문제 1: 로컬 DB 연결 실패
```
Error: Can't reach database server at localhost:5432
```

**원인**:
- Podman 컨테이너 미실행
- 포트 충돌

**해결**:
```bash
podman ps  # 컨테이너 확인
podman restart misopin-postgres
lsof -i :5432  # 포트 충돌 확인
```

---

### 문제 2: 기존 서버 PostgreSQL 외부 접속 불가
```
Error: Connection timed out
```

**원인**:
- listen_addresses 설정 안 됨
- pg_hba.conf 설정 안 됨
- 방화벽 차단

**해결**:
```bash
# PostgreSQL 설정 확인
sudo cat /etc/postgresql/[VERSION]/main/postgresql.conf | grep listen_addresses
sudo cat /etc/postgresql/[VERSION]/main/pg_hba.conf | grep misopin

# 방화벽 확인
sudo ufw status
sudo iptables -L -n | grep 5432

# PostgreSQL 재시작
sudo systemctl restart postgresql
```

---

### 문제 3: Next.js 빌드 실패
```
Error: Cannot find module 'next'
```

**원인**:
- 의존성 설치 안 됨
- node_modules 누락

**해결**:
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### 문제 4: PM2 프로세스 자동 재시작 실패
```
Error: App crashed
```

**원인**:
- 환경변수 누락
- 포트 충돌
- 메모리 부족

**해결**:
```bash
# PM2 로그 확인
pm2 logs misopin-cms --lines 100

# 환경변수 확인
pm2 show misopin-cms

# 메모리 사용량 확인
pm2 monit

# 재시작
pm2 restart misopin-cms
```

---

### 문제 5: Nginx 502 Bad Gateway
```
Error: 502 Bad Gateway
```

**원인**:
- Next.js 앱 미실행
- 포트 3000 리스닝 안 됨

**해결**:
```bash
# Next.js 앱 상태 확인
pm2 status
pm2 logs misopin-cms

# 포트 확인
sudo netstat -tlnp | grep 3000

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

---

### 문제 6: SSL 인증서 발급 실패
```
Error: Challenge failed
```

**원인**:
- DNS 미전파
- 포트 80/443 차단
- 도메인 소유권 검증 실패

**해결**:
```bash
# DNS 확인
nslookup one-q.xyz

# 포트 확인
sudo netstat -tlnp | grep 80
sudo netstat -tlnp | grep 443

# 방화벽 확인
sudo ufw status

# Certbot 디버그 모드
sudo certbot --nginx -d one-q.xyz --dry-run
```

---

## ✅ 최종 체크리스트

### Phase 1: 로컬 환경
- [ ] Podman PostgreSQL 실행
- [ ] 마이그레이션 완료
- [ ] 시딩 완료
- [ ] 5개 페이지 편집 테스트 완료

### Phase 2: 기존 서버 DB
- [ ] PostgreSQL 실행 중 (141.164.60.51)
- [ ] misopin_cms DB 생성
- [ ] 외부 접속 허용
- [ ] 로컬에서 연결 테스트 성공

### Phase 3: 프로덕션 마이그레이션
- [ ] 마이그레이션 적용
- [ ] 시딩 완료
- [ ] 데이터 검증

### Phase 4: 자체 서버 배포
- [ ] one-q.xyz 서버 준비
- [ ] PM2로 Next.js 실행
- [ ] Nginx 리버스 프록시 설정
- [ ] SSL 인증서 발급
- [ ] HTTPS 접속 가능
- [ ] 모든 기능 정상 작동

---

## 🎯 우선 순위

**오늘 완료 목표**:
1. ✅ Phase 1: 로컬 환경 완성 (30분)
2. ✅ Phase 2: 기존 서버 DB 설정 (45분)

**다음 세션**:
3. Phase 3: 프로덕션 마이그레이션 (30분)
4. Phase 4: 자체 서버 배포 (2시간)

---

## 📝 빠른 시작 명령어

### Phase 1: 로컬 환경 (5분 시작)

```bash
# Step 1: PostgreSQL 시작
podman run -d --name misopin-postgres \
  -e POSTGRES_USER=misopin \
  -e POSTGRES_PASSWORD=misopin123 \
  -e POSTGRES_DB=misopin_cms \
  -p 5432:5432 postgres:16-alpine

# Step 2: 환경변수 설정
cd /Users/blee/Desktop/cms/misopin-cms
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://misopin:misopin123@localhost:5432/misopin_cms"
STATIC_PAGES_DIR="/Users/blee/Desktop/cms/Misopin-renew"
NODE_ENV=development
EOF

# Step 3: 마이그레이션 및 시딩
npx prisma generate
npx prisma migrate deploy
npm run db:seed:static

# Step 4: 개발 서버 시작
npm run dev
```

### Phase 2: 기존 서버 DB 설정 (5분 시작)

```bash
# SSH 접속
ssh root@141.164.60.51

# PostgreSQL 설정
sudo -u postgres psql << 'EOF'
CREATE DATABASE misopin_cms;
CREATE USER misopin_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE misopin_cms TO misopin_user;
\c misopin_cms
GRANT ALL ON SCHEMA public TO misopin_user;
\q
EOF

# 외부 접속 허용 (PostgreSQL 버전 확인 후)
# listen_addresses = '*' 설정
# pg_hba.conf에 규칙 추가
# 재시작 및 방화벽 설정
```

---

**준비되셨나요? 각 Phase를 순서대로 진행하세요!** 🚀
