#!/bin/bash

# 미소핀 CMS 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

echo "================================"
echo "미소핀 CMS 배포 시작"
echo "================================"
echo ""

# 1. 빌드
echo "📦 [1/7] Next.js 빌드 중..."
npm run build
echo "✅ 빌드 완료"
echo ""

# 2. Prisma 파일 배포
echo "🗄️  [2/7] Prisma 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  prisma/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/prisma/
echo "✅ Prisma 파일 배포 완료"
echo ""

# 3. .next 디렉토리 배포
echo "🚀 [3/7] .next 디렉토리 배포 중..."
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" \
  .next/standalone/.next/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/.next/
echo "✅ .next 디렉토리 배포 완료"
echo ""

# 4. static 파일 배포
echo "🎨 [4/7] static 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  .next/static/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/.next/static/
echo "✅ static 파일 배포 완료"
echo ""

# 5. public 파일 배포
echo "📁 [5/7] public 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  public/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/public/
echo "✅ public 파일 배포 완료"
echo ""

# 6. 서버에서 Prisma Client 생성 및 마이그레이션
echo "💾 [6/7] Prisma 설정 중..."
ssh root@cms.one-q.xyz "cd /var/www/misopin-cms && npx prisma generate && npx prisma migrate deploy"
echo "✅ Prisma 설정 완료"
echo ""

# 7. PM2 재시작
echo "🔄 [7/7] PM2 재시작 중..."
ssh root@cms.one-q.xyz "pm2 restart misopin-cms"
echo "✅ PM2 재시작 완료"
echo ""

echo "================================"
echo "✨ 배포 완료!"
echo "================================"
echo ""
echo "🌐 사이트: https://cms.one-q.xyz"
echo "📊 관리자: https://cms.one-q.xyz/admin/reservations"
echo ""
