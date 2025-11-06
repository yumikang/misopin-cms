#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 1. Build
echo "📦 Building Next.js application..."
npm run build

# 2. Copy static files to standalone
echo "📁 Copying static files to standalone..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# 3. Sync to server
echo "🔄 Syncing to server..."
rsync -avz --progress --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next/cache' \
  .next root@141.164.60.51:/var/www/misopin-cms/

# 4. Restart PM2
echo "🔄 Restarting PM2..."
ssh root@141.164.60.51 "cd /var/www/misopin-cms && pm2 restart misopin-cms"

echo "✅ Deployment complete!"
