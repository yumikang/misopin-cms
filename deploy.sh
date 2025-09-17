#!/bin/bash

# 배포 스크립트 - 서버에 CMS 프로젝트 배포
# 서버: 141.164.60.51
# 도메인: one-q.xyz

echo "🚀 미소핀 CMS 서버 배포 시작..."

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
echo "서버에 SSH 접속을 위해 root 비밀번호가 필요합니다."

# 1. 프로젝트 파일 복사 (node_modules 제외)
rsync -avz --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env.local' \
  --exclude 'dist' \
  --exclude '.git' \
  . ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 파일 복사 실패!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 파일 복사 완료!${NC}"

# 2. 서버에서 실행할 명령어들
echo -e "${YELLOW}🔧 서버에서 환경 설정 중...${NC}"

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

echo "🐘 PostgreSQL 컨테이너 시작..."
podman run -d \
  --name misopin-postgres \
  --restart always \
  -e POSTGRES_USER=misopin \
  -e POSTGRES_PASSWORD=MisopinCMS2025! \
  -e POSTGRES_DB=misopin_cms \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine 2>/dev/null || echo "PostgreSQL 이미 실행 중"

echo "⏳ PostgreSQL 시작 대기..."
sleep 5

echo "🏗️ Next.js 애플리케이션 빌드..."
# Node.js 컨테이너에서 빌드 실행
podman run --rm \
  -v /opt/misopin-cms:/app \
  -w /app \
  node:18-alpine \
  sh -c "npm ci && npm run build"

echo "🚀 CMS 애플리케이션 시작..."
podman run -d \
  --name misopin-cms \
  --restart always \
  -p 3000:3000 \
  -v /opt/misopin-cms:/app \
  -w /app \
  --env-file .env.production \
  node:18-alpine \
  sh -c "npx prisma migrate deploy && npm start" 2>/dev/null || echo "CMS 이미 실행 중"

echo "✅ 배포 완료!"
ENDSSH

echo -e "${GREEN}🎉 배포가 완료되었습니다!${NC}"
echo -e "${GREEN}📱 접속 주소: https://cms.${DOMAIN}${NC}"
echo ""
echo "⚠️  Nginx 설정이 필요한 경우:"
echo "   - SSL 인증서 설정 (Let's Encrypt)"
echo "   - 프록시 설정 (localhost:3000 → cms.one-q.xyz)"