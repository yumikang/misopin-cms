#!/bin/bash

# MCP 서버 전역 설치 확인 스크립트

echo "🔍 전역 설치된 MCP 서버 확인"
echo "================================"

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# NPM 전역 경로 확인
NPM_GLOBAL_PATH=$(npm root -g)
echo -e "${BLUE}📍 NPM 전역 설치 경로: $NPM_GLOBAL_PATH${NC}"
echo ""

# 설치된 MCP 서버 목록
echo "📦 설치된 MCP 서버:"
echo "-------------------"
npm list -g --depth=0 2>/dev/null | grep -E "@modelcontextprotocol|@upstash|firecrawl" | while read line; do
    echo -e "${GREEN}$line${NC}"
done

echo ""
echo "📂 MCP 서버 파일 존재 확인:"
echo "----------------------------"

# 각 MCP 서버 파일 확인
declare -a servers=(
    "Sequential-Thinking:@modelcontextprotocol/server-sequential-thinking/dist/index.js"
    "Memory:@modelcontextprotocol/server-memory/dist/index.js"
    "Context7:@upstash/context7-mcp/dist/index.js"
    "Firecrawl:firecrawl-mcp/dist/index.js"
    "GitHub:@modelcontextprotocol/server-github/dist/index.js"
    "Filesystem:@modelcontextprotocol/server-filesystem/dist/index.js"
    "Google-Drive:@modelcontextprotocol/server-gdrive/dist/index.js"
)

for entry in "${servers[@]}"; do
    IFS=':' read -r name path <<< "$entry"
    full_path="$NPM_GLOBAL_PATH/$path"
    
    if test -f "$full_path"; then
        echo -e "${GREEN}✅ $name${NC}"
    else
        echo -e "${RED}❌ $name - 파일을 찾을 수 없음${NC}"
    fi
done

echo ""
echo "📁 Claude 설정 파일:"
echo "--------------------"
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}✅ 설정 파일 존재${NC}"
    echo "   위치: $CONFIG_FILE"
    
    # JSON 유효성 검증
    if python3 -m json.tool "$CONFIG_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ JSON 문법 유효${NC}"
    else
        echo -e "${RED}❌ JSON 문법 오류${NC}"
    fi
else
    echo -e "${RED}❌ 설정 파일이 없습니다${NC}"
fi

echo ""
echo "💡 사용 방법:"
echo "-------------"
echo "1. Claude Desktop 앱을 재시작하세요"
echo "2. 새 대화를 시작하세요"
echo "3. MCP 기능을 테스트하세요"
echo ""
echo "🔧 문제 해결:"
echo "-------------"
echo "• 로그 확인: ~/Library/Logs/Claude/"
echo "• 설정 수정: open '$CONFIG_FILE'"
echo "• API 키 설정이 필요한 서버:"
echo "  - Firecrawl: FIRECRAWL_API_KEY"
echo "  - GitHub: GITHUB_PERSONAL_ACCESS_TOKEN"
echo "  - Google Drive: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"