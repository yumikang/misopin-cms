#!/bin/bash

# MCP 서버 자동 설치 스크립트
# 사용법: ./install_mcp.sh

set -e

echo "🚀 MCP 서버 설치 스크립트 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Node.js 버전 확인
echo "📋 환경 확인 중..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js가 설치되어 있지 않습니다.${NC}"
    echo "Homebrew로 설치하려면: brew install node"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18 이상이 필요합니다. 현재 버전: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) 확인됨${NC}"

# 2. Claude Desktop 설정 디렉토리 생성
CONFIG_DIR="$HOME/Library/Application Support/Claude"
echo "📁 설정 디렉토리 생성 중..."
mkdir -p "$CONFIG_DIR"

# 3. 기존 설정 백업
if [ -f "$CONFIG_DIR/claude_desktop_config.json" ]; then
    BACKUP_FILE="$CONFIG_DIR/claude_desktop_config.backup.$(date +%Y%m%d_%H%M%S).json"
    cp "$CONFIG_DIR/claude_desktop_config.json" "$BACKUP_FILE"
    echo -e "${YELLOW}📦 기존 설정을 백업했습니다: $BACKUP_FILE${NC}"
fi

# 4. API 키 입력 받기
echo ""
echo "🔑 API 키 설정 (선택사항 - Enter를 눌러 건너뛸 수 있습니다)"
echo "================================================"

read -p "Firecrawl API Key: " FIRECRAWL_KEY
read -p "GitHub Personal Access Token: " GITHUB_TOKEN
read -p "Supabase Access Token: " SUPABASE_TOKEN
read -p "Coolify API URL: " COOLIFY_URL
read -p "Coolify API Token: " COOLIFY_TOKEN
read -p "Google Client ID: " GOOGLE_CLIENT_ID
read -p "Google Client Secret: " GOOGLE_CLIENT_SECRET

# 기본값 설정
FIRECRAWL_KEY=${FIRECRAWL_KEY:-"YOUR_FIRECRAWL_API_KEY_HERE"}
GITHUB_TOKEN=${GITHUB_TOKEN:-"YOUR_GITHUB_TOKEN_HERE"}
SUPABASE_TOKEN=${SUPABASE_TOKEN:-"YOUR_SUPABASE_TOKEN_HERE"}
COOLIFY_URL=${COOLIFY_URL:-"YOUR_COOLIFY_URL_HERE"}
COOLIFY_TOKEN=${COOLIFY_TOKEN:-"YOUR_COOLIFY_TOKEN_HERE"}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-"YOUR_GOOGLE_CLIENT_ID_HERE"}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-"YOUR_GOOGLE_CLIENT_SECRET_HERE"}

# 5. 설정 파일 생성
echo "📝 MCP 설정 파일 생성 중..."
cat > "$CONFIG_DIR/claude_desktop_config.json" << EOF
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    },
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ]
    },
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "context7-mcp"
      ]
    },
    "firecrawl": {
      "command": "npx",
      "args": [
        "-y",
        "firecrawl-mcp"
      ],
      "env": {
        "FIRECRAWL_API_KEY": "$FIRECRAWL_KEY"
      }
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_TOKEN"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "$SUPABASE_TOKEN"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "$HOME"
      ]
    },
    "shrimp-task-manager": {
      "command": "npx",
      "args": [
        "-y",
        "shrimp-mcp"
      ]
    },
    "coolify": {
      "command": "npx",
      "args": [
        "-y",
        "@coolify/mcp-server"
      ],
      "env": {
        "COOLIFY_API_URL": "$COOLIFY_URL",
        "COOLIFY_API_TOKEN": "$COOLIFY_TOKEN"
      }
    },
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-playwright"
      ]
    },
    "google-drive": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-gdrive"
      ],
      "env": {
        "GOOGLE_CLIENT_ID": "$GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET": "$GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth/callback"
      }
    }
  }
}
EOF

echo -e "${GREEN}✅ MCP 설정 파일이 생성되었습니다!${NC}"

# 6. 설정 검증
echo "🔍 설정 파일 검증 중..."
if python3 -m json.tool "$CONFIG_DIR/claude_desktop_config.json" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ JSON 문법 검증 완료${NC}"
else
    echo -e "${RED}❌ JSON 문법 오류가 있습니다${NC}"
    exit 1
fi

# 7. MCP 서버 사전 다운로드 (선택사항)
echo ""
read -p "MCP 서버를 미리 다운로드하시겠습니까? (y/N): " DOWNLOAD_NOW
if [[ $DOWNLOAD_NOW =~ ^[Yy]$ ]]; then
    echo "📦 MCP 서버 다운로드 중... (시간이 걸릴 수 있습니다)"
    
    SERVERS=(
        "@modelcontextprotocol/server-sequential-thinking"
        "@modelcontextprotocol/server-memory"
        "context7-mcp"
        "firecrawl-mcp"
        "@modelcontextprotocol/server-github"
        "@modelcontextprotocol/server-supabase"
        "@modelcontextprotocol/server-filesystem"
        "shrimp-mcp"
        "@coolify/mcp-server"
        "@modelcontextprotocol/server-playwright"
        "@modelcontextprotocol/server-gdrive"
    )
    
    for server in "${SERVERS[@]}"; do
        echo "  📥 $server 다운로드 중..."
        npx -y "$server" --version > /dev/null 2>&1 || true
    done
    
    echo -e "${GREEN}✅ MCP 서버 다운로드 완료${NC}"
fi

# 8. 완료 메시지
echo ""
echo "🎉 MCP 설치가 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. Claude Desktop 앱을 재시작하세요"
echo "2. 새 대화를 시작하세요"
echo "3. MCP 서버가 제대로 로드되었는지 확인하세요"
echo ""
echo "문제가 발생하면:"
echo "- 로그 확인: ~/Library/Logs/Claude/"
echo "- 설정 파일 확인: $CONFIG_DIR/claude_desktop_config.json"
echo ""
echo -e "${YELLOW}⚠️  API 키를 아직 설정하지 않았다면, 설정 파일을 직접 편집해주세요:${NC}"
echo "  open '$CONFIG_DIR/claude_desktop_config.json'"