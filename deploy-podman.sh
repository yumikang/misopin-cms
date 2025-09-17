#!/bin/bash

# Podman 기반 CMS 배포 스크립트
# 서버: 141.164.60.51
# 도메인: one-q.xyz

echo "🚀 미소핀 CMS Podman 배포 시작..."

# 서버 정보
SERVER_IP="141.164.60.51"
SERVER_USER="root"
PROJECT_DIR="/opt/misopin-cms"
DOMAIN="one-q.xyz"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 프로젝트를 서버로 복사 중...${NC}"

# 1. 서버에 프로젝트 디렉토리 생성
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${PROJECT_DIR}"

# 2. 프로젝트 파일 복사 (node_modules, .next, .git 제외)
rsync -avz --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env.local' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  . ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 파일 복사 실패!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 파일 복사 완료!${NC}"

# 3. 서버에서 Podman으로 배포
echo -e "${YELLOW}🔧 서버에서 Podman 환경 설정 중...${NC}"

ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/misopin-cms

echo "📝 환경 변수 파일 생성..."
cat > .env.production << EOL
# Database
DATABASE_URL="postgresql://misopin:MisopinCMS2025!@localhost:5432/misopin_cms"

# NextAuth.js
NEXTAUTH_SECRET="Tz39kg/GwmtWWqaiCCnBVHgfPWU3k/uCRUlN3aJERcY="
NEXTAUTH_URL="https://cms.one-q.xyz"

# Node
NODE_ENV="production"
EOL

echo "🐘 PostgreSQL 컨테이너 확인 및 시작..."
# 기존 컨테이너가 있으면 중지하고 제거
podman stop misopin-postgres 2>/dev/null || true
podman rm misopin-postgres 2>/dev/null || true

# PostgreSQL 컨테이너 시작
podman run -d \
  --name misopin-postgres \
  --restart always \
  -e POSTGRES_USER=misopin \
  -e POSTGRES_PASSWORD=MisopinCMS2025! \
  -e POSTGRES_DB=misopin_cms \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

echo "⏳ PostgreSQL 시작 대기..."
sleep 10

echo "📦 프로젝트 의존성 설치..."
# Node.js 컨테이너에서 의존성 설치
podman run --rm \
  -v /opt/misopin-cms:/app \
  -w /app \
  --network host \
  node:18-alpine \
  sh -c "npm ci --production=false"

echo "🗄️ Prisma 클라이언트 생성..."
podman run --rm \
  -v /opt/misopin-cms:/app \
  -w /app \
  --network host \
  node:18-alpine \
  sh -c "npx prisma generate"

echo "🏗️ Next.js 애플리케이션 빌드..."
podman run --rm \
  -v /opt/misopin-cms:/app \
  -w /app \
  --network host \
  --env-file .env.production \
  node:18-alpine \
  sh -c "npm run build"

echo "🗄️ 데이터베이스 마이그레이션 실행..."
podman run --rm \
  -v /opt/misopin-cms:/app \
  -w /app \
  --network host \
  --env-file .env.production \
  node:18-alpine \
  sh -c "npx prisma migrate deploy"

echo "🚀 CMS 애플리케이션 시작..."
# 기존 컨테이너가 있으면 중지하고 제거
podman stop misopin-cms 2>/dev/null || true
podman rm misopin-cms 2>/dev/null || true

# CMS 컨테이너 시작
podman run -d \
  --name misopin-cms \
  --restart always \
  -p 3000:3000 \
  -v /opt/misopin-cms:/app \
  -w /app \
  --network host \
  --env-file .env.production \
  node:18-alpine \
  sh -c "npm start"

echo "🔍 컨테이너 상태 확인..."
podman ps -a | grep -E "(misopin-postgres|misopin-cms)"

echo "✅ 배포 완료!"
ENDSSH

echo -e "${GREEN}🎉 배포가 완료되었습니다!${NC}"
echo -e "${GREEN}📱 접속 주소: https://cms.${DOMAIN}${NC}"
echo ""
echo "⚠️  다음 단계:"
echo "   1. Nginx 설정 확인 (프록시 설정: localhost:3000 → cms.one-q.xyz)"
echo "   2. SSL 인증서 확인 (Let's Encrypt)"
echo "   3. 방화벽 설정 확인 (포트 3000, 5432)"
echo "   4. DNS 설정 확인 (cms.one-q.xyz → 141.164.60.51)"