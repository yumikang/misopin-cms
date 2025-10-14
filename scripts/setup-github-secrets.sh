#!/bin/bash
# GitHub Secrets 자동 설정 스크립트

set -e

REPO=$1
if [ -z "$REPO" ]; then
    echo "Usage: $0 <owner/repo>"
    echo "Example: $0 yumikang/misopin-cms"
    exit 1
fi

echo "🔐 GitHub Secrets 자동 설정 - $REPO"

# GitHub CLI 확인
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) 설치 필요"
    echo "설치: brew install gh"
    exit 1
fi

# 로그인 확인
if ! gh auth status &> /dev/null; then
    echo "🔑 GitHub CLI 로그인 필요"
    gh auth login
fi

# 공통 Secrets 파일 로드
SECRETS_FILE=~/.github-secrets-template.env
if [ ! -f "$SECRETS_FILE" ]; then
    echo "❌ Secrets 템플릿 파일 없음: $SECRETS_FILE"
    exit 1
fi

echo "📄 Secrets 로드 중..."

# Secrets 추가
while IFS='=' read -r key value; do
    # 주석 및 빈 줄 제외
    if [[ $key =~ ^#.*$ ]] || [ -z "$key" ]; then
        continue
    fi

    # 값이 "새로_생성"이면 자동 생성
    if [ "$value" = "새로_생성" ]; then
        value=$(openssl rand -base64 32)
        echo "🔑 $key 자동 생성"
    else
        echo "✅ $key 설정"
    fi

    # GitHub Secret 추가
    echo "$value" | gh secret set "$key" -R "$REPO"
done < <(grep -v '^#\|^$' "$SECRETS_FILE")

echo ""
echo "✨ 완료! GitHub Secrets 설정됨"
echo "확인: https://github.com/$REPO/settings/secrets/actions"
