#!/bin/bash

# 미소핀 CMS 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

echo "================================"
echo "미소핀 CMS 배포 시작"
echo "================================"
echo ""

# 1. 빌드
echo "📦 [1/5] Next.js 빌드 중..."
npm run build
echo "✅ 빌드 완료"
echo ""

# 2. .next 디렉토리 배포
echo "🚀 [2/5] .next 디렉토리 배포 중..."
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" \
  .next/standalone/.next/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/.next/
echo "✅ .next 디렉토리 배포 완료"
echo ""

# 3. static 파일 배포
echo "🎨 [3/5] static 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  .next/static/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/.next/static/
echo "✅ static 파일 배포 완료"
echo ""

# 4. public 파일 배포
echo "📁 [4/5] public 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  public/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/public/
echo "✅ public 파일 배포 완료"
echo ""

# 5. PM2 재시작
echo "🔄 [5/5] PM2 재시작 중..."
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
