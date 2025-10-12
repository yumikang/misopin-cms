# 정적 페이지 편집기 배포 계획서

**작성일**: 2025-01-13
**목표**: Supabase 없이 자체 PostgreSQL 서버로 정적 페이지 편집기 배포

---

## 📋 전체 프로세스 개요

```
1단계: 로컬 환경 완전 구축 (Podman PostgreSQL)
   └─> 테스트 및 검증

2단계: 프로덕션 PostgreSQL 서버 준비
   └─> 데이터베이스 생성 및 사용자 설정

3단계: 프로덕션 마이그레이션
   └─> 스키마 적용 및 시딩

4단계: 서버 배포 (Vercel)
   └─> 환경변수 설정 및 배포
```

---

## 🎯 Phase 1: 로컬 환경 완전 구축

### 목표
- ✅ Podman PostgreSQL 로컬 DB 구축
- ✅ 마이그레이션 완료
- ✅ 시딩 완료
- ✅ 5개 페이지 편집 기능 테스트

### 소요 시간: 30분

---

### Step 1.1: Podman PostgreSQL 컨테이너 시작

**상태**: ✅ Podman 머신 실행 완료

```bash
# 1. PostgreSQL 16 컨테이너 실행
podman run -d \
  --name misopin-postgres \
  -e POSTGRES_USER=misopin \
  -e POSTGRES_PASSWORD=misopin123 \
  -e POSTGRES_DB=misopin_cms \
  -p 5432:5432 \
  postgres:16-alpine

# 2. 실행 확인
podman ps

# 3. 로그 확인 (PostgreSQL 준비 완료 대기)
podman logs -f misopin-postgres
```

**성공 조건**:
```
database system is ready to accept connections
```

**예상 문제**:
- ❌ 포트 5432 충돌 → 기존 PostgreSQL 중지 필요
- ❌ 네트워크 오류 → Podman 머신 재시작

**해결책**:
```bash
# 포트 충돌 시
lsof -i :5432
brew services stop postgresql

# Podman 재시작
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

**성공 조건**:
- ✅ .env.local 파일 생성됨
- ✅ DATABASE_URL 형식 정확함

---

### Step 1.3: Prisma 마이그레이션

```bash
# 1. Prisma Client 재생성
npx prisma generate

# 2. 데이터베이스 연결 테스트
npx prisma db pull --force --schema=./prisma/schema.prisma

# 3. 마이그레이션 적용
npx prisma migrate deploy
```

**성공 조건**:
```
✔ Generated Prisma Client
✔ Migrations applied successfully
```

**예상 문제**:
- ❌ 연결 실패 → DATABASE_URL 확인
- ❌ 기존 테이블 충돌 → DROP DATABASE 후 재생성

**해결책**:
```bash
# 데이터베이스 초기화
podman exec -it misopin-postgres psql -U misopin -c "DROP DATABASE misopin_cms;"
podman exec -it misopin-postgres psql -U misopin -c "CREATE DATABASE misopin_cms;"
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

**성공 조건**:
- ✅ 5개 페이지 모두 성공
- ✅ 각 페이지에 섹션 데이터 있음
- ✅ `static_pages` 테이블에 5개 레코드

**검증 방법**:
```bash
# Prisma Studio로 확인
npx prisma studio

# 또는 psql로 확인
podman exec -it misopin-postgres psql -U misopin -d misopin_cms \
  -c "SELECT slug, title, array_length(sections::jsonb, 1) as sections_count FROM static_pages;"
```

---

### Step 1.5: 개발 서버 테스트

```bash
# 개발 서버 재시작 (Mock API 비활성화)
npm run dev
```

**테스트 시나리오**:

#### Test 1: 페이지 목록 조회
```
URL: http://localhost:3003/admin/static-pages
기대: 5개 페이지 표시
확인:
- [ ] 메인 페이지 (index)
- [ ] 병원 소개 (about)
- [ ] 보톡스 시술 (botox)
- [ ] 필러 시술 (filler)
- [ ] 리프팅 시술 (lifting)
```

#### Test 2: 페이지 편집 - 텍스트 수정
```
1. "병원 소개" 페이지 편집 클릭
2. 텍스트 탭에서 첫 번째 제목 수정
   변경 전: "미소핀 성형외과에 오신 것을 환영합니다"
   변경 후: "테스트 수정 - 로컬 환경"
3. "변경사항 저장" 클릭
4. 메모 입력: "로컬 환경 테스트"
5. 성공 메시지 확인
```

**기대 결과**:
```
✅ 페이지가 성공적으로 업데이트되었습니다. (버전 2)
```

**검증**:
```bash
# 1. 데이터베이스 확인
podman exec -it misopin-postgres psql -U misopin -d misopin_cms \
  -c "SELECT version, changed_by, change_note FROM static_page_versions WHERE page_id = (SELECT id FROM static_pages WHERE slug = 'about') ORDER BY version DESC LIMIT 1;"

# 2. HTML 파일 확인 (실제 파일 변경됨)
grep "테스트 수정" /Users/blee/Desktop/cms/Misopin-renew/about.html

# 3. 백업 파일 확인
ls -la /Users/blee/Desktop/cms/Misopin-renew/*.backup.html
```

#### Test 3: 페이지 편집 - 이미지 교체
```
1. "보톡스 시술" 페이지 편집
2. 이미지 탭 선택
3. 첫 번째 이미지 URL 변경
   변경 전: /img/treatments/botox-01.jpg
   변경 후: /img/treatments/test-image.jpg
4. 저장
```

#### Test 4: 버전 기록 확인
```
1. 임의 페이지 편집
2. "버전 기록" 탭 클릭
3. 확인:
   - [ ] v1: 초기 시딩 (system)
   - [ ] v2: 첫 번째 수정 (admin)
   - [ ] 각 버전에 변경 시간 표시
```

---

### Step 1.6: 로컬 환경 체크리스트

**인프라**:
- [ ] Podman 머신 실행 중
- [ ] PostgreSQL 컨테이너 실행 중 (포트 5432)
- [ ] 컨테이너 로그에 "ready to accept connections"

**데이터베이스**:
- [ ] `static_pages` 테이블 생성됨
- [ ] `static_page_versions` 테이블 생성됨
- [ ] 5개 페이지 시딩 완료
- [ ] 각 페이지에 섹션 데이터 있음

**애플리케이션**:
- [ ] .env.local 설정 완료
- [ ] Prisma Client 생성됨
- [ ] 개발 서버 실행 중
- [ ] Mock API 비활성화됨

**기능 테스트**:
- [ ] 페이지 목록 표시
- [ ] 페이지 편집 화면 열림
- [ ] 텍스트 수정 및 저장
- [ ] 이미지 URL 변경 및 저장
- [ ] 버전 기록 표시
- [ ] HTML 파일 실제 변경 확인
- [ ] 백업 파일 생성 확인

---

## 🎯 Phase 2: 프로덕션 PostgreSQL 서버 준비

### 목표
- 자체 PostgreSQL 서버 구축 (또는 관리형 서비스 사용)
- 데이터베이스 생성 및 사용자 설정
- 네트워크 접근 설정

### 소요 시간: 1-2시간

---

### Option A: AWS RDS PostgreSQL (권장)

**장점**:
- ✅ 관리형 서비스 (백업 자동)
- ✅ 높은 가용성
- ✅ 확장 용이

**비용**:
- 프리티어: db.t3.micro (750시간/월)
- 유료: 약 $15-30/월

**설정 단계**:
```
1. AWS Console → RDS → Create database
2. Engine: PostgreSQL 16
3. Template: Free tier (또는 Production)
4. DB instance identifier: misopin-cms-prod
5. Master username: misopin
6. Master password: [강력한 비밀번호]
7. Public access: Yes (Vercel 접근 위해)
8. VPC security group: PostgreSQL (5432) 허용
9. Initial database name: misopin_cms
```

**연결 정보**:
```
Host: misopin-cms-prod.xxxx.ap-northeast-2.rds.amazonaws.com
Port: 5432
Database: misopin_cms
Username: misopin
Password: [설정한 비밀번호]
```

---

### Option B: DigitalOcean Managed PostgreSQL

**장점**:
- ✅ 간단한 설정
- ✅ 저렴한 가격
- ✅ 한국 리전 지원 (싱가포르)

**비용**:
- Basic: $15/월 (1GB RAM, 10GB SSD)

**설정**:
```
1. DigitalOcean Console → Databases → Create
2. PostgreSQL 16
3. Region: Singapore (가장 가까운 리전)
4. Plan: Basic $15/월
5. Database name: misopin_cms
6. Trusted sources: Allow from anywhere (Vercel용)
```

---

### Option C: 자체 서버 (VPS)

**장점**:
- ✅ 완전한 제어권
- ✅ 장기적으로 저렴

**단점**:
- ❌ 관리 부담
- ❌ 백업 직접 구성

**권장 사양**:
- CPU: 2 vCPU
- RAM: 2GB
- Storage: 20GB SSD
- 제공자: Vultr, Linode, Hetzner

**설정 단계** (Ubuntu 22.04):
```bash
# 1. PostgreSQL 16 설치
sudo apt update
sudo apt install -y postgresql-16

# 2. 외부 접속 허용
sudo vim /etc/postgresql/16/main/postgresql.conf
# listen_addresses = '*'

sudo vim /etc/postgresql/16/main/pg_hba.conf
# host all all 0.0.0.0/0 md5

# 3. 재시작
sudo systemctl restart postgresql

# 4. 사용자 및 DB 생성
sudo -u postgres psql
CREATE USER misopin WITH PASSWORD 'your_secure_password';
CREATE DATABASE misopin_cms OWNER misopin;
GRANT ALL PRIVILEGES ON DATABASE misopin_cms TO misopin;
\q

# 5. 방화벽 설정
sudo ufw allow 5432/tcp
```

---

### Phase 2 체크리스트

**서버 준비**:
- [ ] PostgreSQL 16 서버 구축 완료
- [ ] 외부 접속 가능 (포트 5432 오픈)
- [ ] SSL 설정 완료 (권장)

**데이터베이스**:
- [ ] 데이터베이스 `misopin_cms` 생성
- [ ] 사용자 `misopin` 생성
- [ ] 권한 설정 완료

**연결 테스트**:
```bash
# 로컬에서 프로덕션 DB 접속 테스트
psql "postgresql://misopin:[password]@[host]:5432/misopin_cms"

# 또는
podman run --rm -it postgres:16-alpine \
  psql "postgresql://misopin:[password]@[host]:5432/misopin_cms"
```

**성공 조건**:
```
psql (16.x)
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256)
Type "help" for help.

misopin_cms=>
```

---

## 🎯 Phase 3: 프로덕션 마이그레이션

### 목표
- 프로덕션 DB에 스키마 적용
- 초기 데이터 시딩
- 연결 및 동작 검증

### 소요 시간: 30분

---

### Step 3.1: 환경변수 설정

```bash
# .env.production 생성
cat > .env.production << 'EOF'
# ============= 프로덕션 환경 =============
DATABASE_URL="postgresql://misopin:[PASSWORD]@[HOST]:5432/misopin_cms?sslmode=require"
STATIC_PAGES_DIR="/var/app/Misopin-renew"
NODE_ENV=production
EOF

# Vercel 환경변수 설정 (나중에)
```

**중요**: 비밀번호와 호스트는 실제 값으로 교체

---

### Step 3.2: 마이그레이션 실행

```bash
# 프로덕션 DB에 마이그레이션 적용
DATABASE_URL="postgresql://misopin:[PASSWORD]@[HOST]:5432/misopin_cms?sslmode=require" \
  npx prisma migrate deploy
```

**예상 출력**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

Applying migration `20250112000000_add_static_pages`

The following migration(s) have been applied:

migrations/
  └─ 20250112000000_add_static_pages/
      └─ migration.sql

All migrations have been successfully applied.
```

---

### Step 3.3: 프로덕션 시딩 (선택)

**주의**: 프로덕션에서는 신중하게!

```bash
# 프로덕션 DB에 시딩
DATABASE_URL="postgresql://misopin:[PASSWORD]@[HOST]:5432/misopin_cms?sslmode=require" \
  npm run db:seed:static
```

**또는 수동으로**:
```bash
# 로컬 데이터를 덤프
pg_dump -h localhost -U misopin -d misopin_cms \
  --table=static_pages --table=static_page_versions \
  --data-only > static_pages_dump.sql

# 프로덕션에 복원
psql "postgresql://misopin:[PASSWORD]@[HOST]:5432/misopin_cms" \
  -f static_pages_dump.sql
```

---

### Phase 3 체크리스트

**마이그레이션**:
- [ ] 프로덕션 DB 연결 성공
- [ ] 마이그레이션 적용 완료
- [ ] `static_pages` 테이블 생성 확인
- [ ] `static_page_versions` 테이블 생성 확인

**시딩** (선택):
- [ ] 5개 페이지 데이터 삽입
- [ ] 섹션 데이터 정확함

**검증**:
```bash
# 테이블 확인
psql "[프로덕션 CONNECTION_STRING]" -c "\dt"

# 데이터 확인
psql "[프로덕션 CONNECTION_STRING]" -c "SELECT COUNT(*) FROM static_pages;"
```

---

## 🎯 Phase 4: Vercel 배포

### 목표
- Vercel에 애플리케이션 배포
- 환경변수 설정
- 정적 페이지 파일 업로드
- 배포 검증

### 소요 시간: 30분

---

### Step 4.1: Vercel 환경변수 설정

**Vercel Dashboard → Project → Settings → Environment Variables**

추가할 환경변수:
```
DATABASE_URL = postgresql://misopin:[PASSWORD]@[HOST]:5432/misopin_cms?sslmode=require
STATIC_PAGES_DIR = /var/app/Misopin-renew
NODE_ENV = production
NEXT_PUBLIC_API_URL = https://your-domain.vercel.app
```

---

### Step 4.2: 정적 페이지 파일 처리

**문제**: Vercel은 파일 시스템 접근 제한

**해결책 옵션**:

#### Option A: S3/R2 스토리지 사용 (권장)
```
1. Cloudflare R2 또는 AWS S3 버킷 생성
2. Misopin-renew 폴더 전체 업로드
3. 환경변수 추가:
   S3_BUCKET = misopin-static-pages
   S3_REGION = ap-northeast-2
4. HTMLUpdater 수정: 파일 대신 S3 사용
```

#### Option B: Git Repository에 포함
```
1. Misopin-renew를 서브디렉토리로 추가
2. .gitignore에서 제외
3. STATIC_PAGES_DIR = ./Misopin-renew
```

#### Option C: 별도 서버에 파일 호스팅
```
1. VPS에 Nginx 설정
2. WebDAV 또는 SFTP로 파일 접근
3. HTMLUpdater를 API로 변경
```

---

### Step 4.3: 배포 실행

```bash
# Vercel CLI로 배포
npx vercel --prod

# 또는 Git push로 자동 배포
git push origin main
```

---

### Step 4.4: 배포 검증

**체크리스트**:
- [ ] https://your-domain.vercel.app/admin/static-pages 접속
- [ ] 페이지 목록 표시
- [ ] 페이지 편집 가능
- [ ] 저장 시 데이터베이스 업데이트
- [ ] 버전 기록 표시

**테스트**:
```bash
# API 테스트
curl https://your-domain.vercel.app/api/static-pages

# 페이지 조회
curl https://your-domain.vercel.app/api/static-pages/[id]
```

---

## 📊 전체 타임라인

| Phase | 작업 | 예상 시간 | 상태 |
|-------|------|-----------|------|
| 1.1 | Podman PostgreSQL 시작 | 10분 | ⏳ 대기 |
| 1.2 | 환경변수 설정 | 5분 | ⏳ 대기 |
| 1.3 | Prisma 마이그레이션 | 5분 | ⏳ 대기 |
| 1.4 | 시딩 실행 | 5분 | ⏳ 대기 |
| 1.5 | 개발 서버 테스트 | 15분 | ⏳ 대기 |
| **Phase 1 소계** | **로컬 환경 구축** | **40분** | ⏳ |
| 2 | 프로덕션 DB 서버 준비 | 1-2시간 | ⏳ 대기 |
| 3 | 프로덕션 마이그레이션 | 30분 | ⏳ 대기 |
| 4 | Vercel 배포 | 30분 | ⏳ 대기 |
| **전체** | | **3-4시간** | |

---

## 🚨 예상 문제 및 해결책

### 문제 1: 로컬 DB 연결 실패
```
Error: Can't reach database server at localhost:5432
```

**원인**:
- Podman 컨테이너 실행 안 됨
- 포트 충돌

**해결**:
```bash
podman ps  # 컨테이너 확인
podman restart misopin-postgres  # 재시작
lsof -i :5432  # 포트 충돌 확인
```

---

### 문제 2: 시딩 중 파일 경로 오류
```
Error: ENOENT: no such file or directory
```

**원인**:
- STATIC_PAGES_DIR 경로 오류
- HTML 파일 없음

**해결**:
```bash
# 경로 확인
echo $STATIC_PAGES_DIR
ls -la /Users/blee/Desktop/cms/Misopin-renew/

# .env.local 수정
vim .env.local
```

---

### 문제 3: Vercel 배포 후 파일 접근 불가
```
Error: ENOENT or EROFS: read-only file system
```

**원인**:
- Vercel은 읽기 전용 파일 시스템

**해결**:
- S3/R2 스토리지 사용
- 또는 별도 서버에 파일 호스팅

---

## ✅ 최종 체크리스트

### 로컬 환경
- [ ] Podman PostgreSQL 실행
- [ ] 마이그레이션 완료
- [ ] 시딩 완료
- [ ] 5개 페이지 편집 테스트 완료

### 프로덕션 환경
- [ ] PostgreSQL 서버 구축
- [ ] 마이그레이션 적용
- [ ] Vercel 배포 완료
- [ ] 정적 파일 접근 방법 구현

### 기능 검증
- [ ] 페이지 목록 조회
- [ ] 페이지 편집 (텍스트)
- [ ] 페이지 편집 (이미지)
- [ ] 페이지 편집 (배너)
- [ ] 저장 및 버전 관리
- [ ] HTML 파일 실제 변경
- [ ] 백업 파일 생성

---

## 🎯 우선 순위

**오늘 반드시 완료**:
1. ✅ Phase 1: 로컬 환경 완전 구축 (40분)
2. ✅ 로컬에서 5개 페이지 편집 테스트

**나중에 진행**:
3. Phase 2-4: 프로덕션 배포 (별도 세션)

---

## 📝 다음 액션

**지금 바로 시작할 명령어**:

```bash
# Step 1: PostgreSQL 컨테이너 실행
podman run -d \
  --name misopin-postgres \
  -e POSTGRES_USER=misopin \
  -e POSTGRES_PASSWORD=misopin123 \
  -e POSTGRES_DB=misopin_cms \
  -p 5432:5432 \
  postgres:16-alpine

# 준비 완료 확인 (10-20초 대기)
podman logs -f misopin-postgres
# "database system is ready" 메시지 확인 후 Ctrl+C

# Step 2: 환경변수 설정
cd /Users/blee/Desktop/cms/misopin-cms
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://misopin:misopin123@localhost:5432/misopin_cms"
STATIC_PAGES_DIR="/Users/blee/Desktop/cms/Misopin-renew"
NODE_ENV=development
EOF

# Step 3: Prisma 마이그레이션
npx prisma generate
npx prisma migrate deploy

# Step 4: 시딩
npm run db:seed:static

# Step 5: 개발 서버 시작
npm run dev
```

**준비되셨나요? 지금 시작하시겠습니까?** 🚀
