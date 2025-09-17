#!/bin/bash

# MCP 서버 버전 확인 스크립트

echo "🔍 설치된 MCP 서버 버전 확인"
echo "================================"

# 각 MCP 서버 확인
declare -a servers=(
    "Sequential-Thinking:@modelcontextprotocol/server-sequential-thinking"
    "Memory:@modelcontextprotocol/server-memory"
    "Context7:context7-mcp"
    "Firecrawl:firecrawl-mcp"
    "GitHub:@modelcontextprotocol/server-github"
    "Supabase:@modelcontextprotocol/server-supabase"
    "Filesystem:@modelcontextprotocol/server-filesystem"
    "Shrimp-Task-Manager:shrimp-mcp"
    "Coolify:@coolify/mcp-server"
    "Playwright:@modelcontextprotocol/server-playwright"
    "Google-Drive:@modelcontextprotocol/server-gdrive"
)

for entry in "${servers[@]}"; do
    IFS=':' read -r name package <<< "$entry"
    echo -n "📦 $name: "
    
    # npm 캐시에서 버전 확인
    if npm list -g "$package" 2>/dev/null | grep -q "$package"; then
        version=$(npm list -g "$package" 2>/dev/null | grep "$package" | head -1 | sed 's/.*@//')
        echo "v$version ✅"
    else
        # npx 캐시 확인
        if ls ~/.npm/_npx/*/package.json 2>/dev/null | xargs grep -l "\"name\".*\"$package\"" > /dev/null 2>&1; then
            echo "캐시됨 ✅"
        else
            echo "설치되지 않음 ❌"
        fi
    fi
done

echo ""
echo "📁 Claude 설정 파일 위치:"
echo "   ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "📊 npx 캐시 크기:"
du -sh ~/.npm/_npx/ 2>/dev/null || echo "   캐시 없음"