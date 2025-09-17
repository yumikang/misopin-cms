# MCP (Model Context Protocol) 서버 설치 가이드

이 가이드는 다른 맥북에 동일한 MCP 환경을 구축하기 위한 완전한 설치 매뉴얼입니다.

## 📋 현재 설치된 MCP 서버 목록

1. **sequential-thinking** - 체계적 사고 및 문제 해결
2. **memory** - 지식 그래프 및 메모리 관리
3. **context7** - 라이브러리 문서 검색
4. **firecrawl** - 웹 스크래핑 및 검색
5. **github** - GitHub 통합
6. **supabase** - Supabase 데이터베이스 관리
7. **filesystem** - 파일 시스템 접근
8. **shrimp-task-manager** - 작업 관리 및 계획
9. **coolify** - Coolify 배포 플랫폼 통합
10. **playwright** - 브라우저 자동화
11. **google-drive** - Google Drive 통합

## 🚀 설치 방법

### 1. 전제 조건

```bash
# Node.js 설치 확인 (v18 이상 필요)
node --version

# npm 설치 확인
npm --version

# Claude Desktop 앱 설치 필요
# https://claude.ai/download 에서 다운로드
```

### 2. MCP 설정 디렉토리 생성

```bash
# Claude Desktop 설정 디렉토리 확인
mkdir -p ~/Library/Application\ Support/Claude/
```

### 3. MCP 서버 설정 파일 생성

`~/Library/Application Support/Claude/claude_desktop_config.json` 파일을 생성하고 아래 내용을 추가:

```json
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
        "FIRECRAWL_API_KEY": "YOUR_FIRECRAWL_API_KEY_HERE"
      }
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_TOKEN_HERE"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_SUPABASE_TOKEN_HERE"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/admin"
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
        "COOLIFY_API_URL": "YOUR_COOLIFY_URL_HERE",
        "COOLIFY_API_TOKEN": "YOUR_COOLIFY_TOKEN_HERE"
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
        "GOOGLE_CLIENT_ID": "YOUR_GOOGLE_CLIENT_ID_HERE",
        "GOOGLE_CLIENT_SECRET": "YOUR_GOOGLE_CLIENT_SECRET_HERE",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth/callback"
      }
    }
  }
}
```

## 🔑 API 키 설정

각 서비스의 API 키를 얻는 방법:

### 1. Firecrawl API Key
- https://firecrawl.dev 에서 계정 생성
- Dashboard에서 API Key 생성
- `FIRECRAWL_API_KEY` 값 교체

### 2. GitHub Personal Access Token
- GitHub Settings → Developer settings → Personal access tokens
- "Generate new token (classic)" 클릭
- 필요한 권한 선택 (repo, user, admin:org 등)
- `GITHUB_PERSONAL_ACCESS_TOKEN` 값 교체

### 3. Supabase Access Token
- https://supabase.com/dashboard/account/tokens
- "Generate new token" 클릭
- `SUPABASE_ACCESS_TOKEN` 값 교체

### 4. Coolify API Token
- Coolify 대시보드 → Settings → API Tokens
- "Create new token" 클릭
- `COOLIFY_API_URL`과 `COOLIFY_API_TOKEN` 값 교체

### 5. Google Drive API
- https://console.cloud.google.com/
- 새 프로젝트 생성 또는 선택
- APIs & Services → Credentials
- OAuth 2.0 Client ID 생성
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 값 교체

## 📁 디렉토리 구조

```
~/Library/Application Support/Claude/
├── claude_desktop_config.json    # MCP 서버 설정
└── logs/                         # 로그 파일 (자동 생성)

~/.npm/_npx/                     # npx 캐시 (자동 생성)
└── [각 MCP 서버 패키지들]
```

## ✅ 설치 확인

1. Claude Desktop 앱 재시작
2. 새 대화 시작
3. 다음 명령어로 MCP 서버 확인:
   - "List available MCP servers"
   - "What MCP tools are available?"

## 🔧 문제 해결

### MCP 서버가 보이지 않는 경우:
```bash
# 설정 파일 권한 확인
ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json

# JSON 문법 검증
python3 -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 특정 MCP 서버 오류:
```bash
# npx 캐시 정리
rm -rf ~/.npm/_npx/

# 개별 서버 수동 설치 테스트
npx -y @modelcontextprotocol/server-sequential-thinking --version
```

## 📝 추가 설정 (선택사항)

### 파일시스템 접근 경로 수정
filesystem MCP의 접근 경로를 변경하려면:
```json
"filesystem": {
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/Users/YOUR_USERNAME",  // 여기를 수정
    "/path/to/another/directory"  // 추가 경로
  ]
}
```

### 로컬 MCP 서버 개발
로컬에서 개발한 MCP 서버를 추가하려면:
```json
"my-local-server": {
  "command": "node",
  "args": [
    "/path/to/your/local/server.js"
  ],
  "env": {
    "CUSTOM_ENV": "value"
  }
}
```

## 🔄 백업 및 복원

### 설정 백업:
```bash
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/Desktop/mcp_backup.json
```

### 설정 복원:
```bash
cp ~/Desktop/mcp_backup.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## 📚 참고 자료

- [MCP 공식 문서](https://modelcontextprotocol.io)
- [MCP GitHub](https://github.com/modelcontextprotocol)
- [Claude Desktop 다운로드](https://claude.ai/download)

---

**중요**: API 키는 안전하게 보관하고, 공개 저장소에 커밋하지 마세요!