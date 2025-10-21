#!/bin/bash

# 미소핀 CMS 빠른 배포 스크립트 (빌드 없이 배포만)
# 사용법: ./deploy-quick.sh
# 주의: 코드 변경이 없고 이미 빌드된 상태에서만 사용

set -e  # 에러 발생 시 스크립트 중단

echo "================================"
echo "미소핀 CMS 빠른 배포 (빌드 제외)"
echo "================================"
echo ""

# 1. .next 디렉토리 배포
echo "🚀 [1/4] .next 디렉토리 배포 중..."
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" \
  .next/standalone/.next/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/.next/
echo "✅ .next 디렉토리 배포 완료"
echo ""

# 2. static 파일 배포
echo "🎨 [2/4] static 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  .next/static/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/.next/static/
echo "✅ static 파일 배포 완료"
echo ""

# 3. public 파일 배포
echo "📁 [3/4] public 파일 배포 중..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  public/ \
  root@cms.one-q.xyz:/var/www/misopin-cms/.next/standalone/public/
echo "✅ public 파일 배포 완료"
echo ""

# 4. PM2 재시작
echo "🔄 [4/4] PM2 재시작 중..."
ssh root@cms.one-q.xyz "pm2 restart misopin-cms"
echo "✅ PM2 재시작 완료"
echo ""

echo "================================"
echo "⚡ 빠른 배포 완료!"
echo "================================"
echo ""
echo "🌐 사이트: https://cms.one-q.xyz"
echo ""
