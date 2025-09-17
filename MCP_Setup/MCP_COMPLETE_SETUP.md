# 📦 MCP 서버 완전 설치 가이드 (macOS)

## 🎯 현재 설치 및 사용 가능한 MCP 서버

### ✅ 현재 설치됨 (사용 가능)
1. **Sequential-Thinking** (v2025.7.1) - 체계적 사고 및 문제 해결
2. **Memory** (v2025.4.25) - 지식 그래프 및 메모리 관리
3. **Firecrawl** (v1.12.0) - 웹 스크래핑 및 검색
4. **GitHub** (v2025.4.8) - GitHub 통합
5. **Filesystem** (v2025.7.29) - 파일 시스템 접근
6. **Google Drive** (v2025.1.14) - Google Drive 통합

### ❌ 설정되었지만 미설치
- Context7 - 라이브러리 문서 검색
- Supabase - 데이터베이스 관리
- Shrimp Task Manager - 작업 관리
- Coolify - 배포 플랫폼
- Playwright - 브라우저 자동화

## 🚀 다른 맥북에 동일 환경 구축하기

### Step 1: 기본 요구사항 설치

```bash
# Homebrew 설치 (없는 경우)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 18+ 설치
brew install node

# Claude Desktop 앱 다운로드 및 설치
# https://claude.ai/download
```

### Step 2: MCP 설정 디렉토리 생성

```bash
mkdir -p ~/Library/Application\ Support/Claude/
```

### Step 3: 설정 파일 생성

`~/Library/Application Support/Claude/claude_desktop_config.json` 파일 생성:

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
    "firecrawl": {
      "command": "npx",
      "args": [
        "-y",
        "firecrawl-mcp"
      ],
      "env": {
        "FIRECRAWL_API_KEY": "YOUR_API_KEY_HERE"
      }
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_TOKEN_HERE"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/YOUR_USERNAME"
      ]
    },
    "google-drive": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-gdrive"
      ],
      "env": {
        "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth/callback"
      }
    }
  }
}
```

### Step 4: API 키 획득 방법

#### 1. Firecrawl API Key
```bash
# 1. https://firecrawl.dev 접속
# 2. Sign Up / Login
# 3. Dashboard → API Keys → Create API Key
# 4. 생성된 키를 FIRECRAWL_API_KEY에 입력
```

#### 2. GitHub Personal Access Token
```bash
# 1. GitHub → Settings → Developer settings
# 2. Personal access tokens → Tokens (classic)
# 3. Generate new token (classic)
# 4. 권한 선택:
#    - repo (전체)
#    - user (전체)
#    - admin:org (선택사항)
# 5. Generate token → 복사 → GITHUB_PERSONAL_ACCESS_TOKEN에 입력
```

#### 3. Google Drive API
```bash
# 1. https://console.cloud.google.com/
# 2. 새 프로젝트 생성
# 3. APIs & Services → Enable APIs → Google Drive API 활성화
# 4. Credentials → Create Credentials → OAuth 2.0 Client ID
# 5. Application type: Web application
# 6. Authorized redirect URIs: http://localhost:3000/oauth/callback
# 7. Client ID와 Secret 복사
```

### Step 5: 자동 설치 스크립트 사용

```bash
# 설치 스크립트 다운로드
curl -O https://raw.githubusercontent.com/YOUR_REPO/install_mcp.sh

# 실행 권한 부여
chmod +x install_mcp.sh

# 실행
./install_mcp.sh
```

## 📂 디렉토리 구조

```
~/
├── Library/
│   └── Application Support/
│       └── Claude/
│           ├── claude_desktop_config.json  # MCP 설정
│           └── logs/                       # 로그 파일
│
└── .npm/
    └── _npx/                               # MCP 서버 캐시
        ├── [해시값]/
        │   └── node_modules/
        │       └── @modelcontextprotocol/
        │           └── server-*/
        └── ...
```

## 🔧 문제 해결

### 1. MCP 서버가 로드되지 않는 경우

```bash
# Claude Desktop 완전 종료
pkill -f "Claude"

# 설정 파일 확인
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool

# Claude Desktop 재시작
open -a "Claude"
```

### 2. 특정 MCP 서버 오류

```bash
# npx 캐시 삭제
rm -rf ~/.npm/_npx/

# 개별 서버 테스트
npx -y @modelcontextprotocol/server-filesystem --help
```

### 3. 권한 문제

```bash
# 설정 파일 권한 확인
ls -la ~/Library/Application\ Support/Claude/

# 권한 수정 (필요시)
chmod 644 ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## 📊 MCP 서버별 주요 기능

### Sequential-Thinking
- 복잡한 문제를 단계별로 분석
- 논리적 사고 체인 구성
- 가설 검증 및 수정

### Memory
- 대화 내용 영구 저장
- 지식 그래프 구축
- 엔티티 관계 관리

### Firecrawl
- 웹페이지 스크래핑
- 사이트맵 생성
- 웹 검색 및 크롤링

### GitHub
- 저장소 관리
- PR/Issue 생성 및 관리
- 코드 검색 및 커밋

### Filesystem
- 파일 읽기/쓰기
- 디렉토리 탐색
- 파일 검색 및 수정

### Google Drive
- 파일 업로드/다운로드
- 폴더 관리
- 파일 검색

## 💾 백업 및 복원

### 설정 백업
```bash
# 백업 생성
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/Desktop/mcp_backup_$(date +%Y%m%d).json

# 백업 목록 확인
ls ~/Desktop/mcp_backup_*.json
```

### 설정 복원
```bash
# 복원
cp ~/Desktop/mcp_backup_20241211.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Claude 재시작
pkill -f "Claude" && open -a "Claude"
```

## 🔐 보안 권장사항

1. **API 키 관리**
   - 절대 Git에 커밋하지 않기
   - 1Password/Keychain에 저장
   - 정기적으로 갱신

2. **파일시스템 접근 제한**
   - 필요한 디렉토리만 접근 허용
   - 민감한 폴더 제외

3. **로그 파일 정기 삭제**
   ```bash
   # 30일 이상 된 로그 삭제
   find ~/Library/Logs/Claude -mtime +30 -delete
   ```

## 📚 추가 리소스

- [MCP 공식 문서](https://modelcontextprotocol.io)
- [MCP GitHub](https://github.com/modelcontextprotocol)
- [Claude Desktop](https://claude.ai/download)
- [MCP 서버 목록](https://github.com/modelcontextprotocol/servers)

---

**마지막 업데이트**: 2024년 12월 11일
**테스트 환경**: macOS Sonoma 14.x, Claude Desktop 최신 버전