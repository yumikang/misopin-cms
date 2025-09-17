# 🚀 MCP 서버 설치 패키지

이 패키지는 Claude Desktop의 MCP (Model Context Protocol) 서버를 다른 맥북에 동일하게 설치할 수 있도록 만든 완전한 설치 패키지입니다.

## 📦 패키지 내용

- `install_mcp.sh` - 자동 설치 스크립트
- `check_mcp_versions.sh` - 설치된 버전 확인 스크립트
- `MCP_COMPLETE_SETUP.md` - 완전한 설치 가이드
- `MCP_SETUP_GUIDE.md` - 기본 설치 가이드
- `MCP_API_KEYS.env.example` - API 키 템플릿

## ⚡ 빠른 설치 (5분 소요)

### 1. 압축 해제
```bash
tar -xzf MCP_Setup.tar.gz
cd MCP_Setup
```

### 2. 자동 설치 실행
```bash
chmod +x install_mcp.sh
./install_mcp.sh
```

### 3. API 키 입력
설치 스크립트 실행 시 필요한 API 키를 입력하세요:
- Firecrawl API Key
- GitHub Personal Access Token
- Supabase Access Token
- Google Drive Client ID/Secret
- Coolify API URL/Token

### 4. Claude Desktop 재시작
```bash
# Claude 종료
pkill -f "Claude"

# Claude 재시작
open -a "Claude"
```

## 🔍 설치 확인

```bash
# 설치된 MCP 서버 확인
./check_mcp_versions.sh
```

## 📋 현재 포함된 MCP 서버

✅ **즉시 사용 가능**
- Sequential-Thinking (v2025.7.1) - 체계적 사고
- Memory (v2025.4.25) - 지식 그래프
- Firecrawl (v1.12.0) - 웹 스크래핑
- GitHub (v2025.4.8) - GitHub 통합
- Filesystem (v2025.7.29) - 파일 시스템
- Google Drive (v2025.1.14) - 구글 드라이브

## 🔑 API 키 획득처

1. **Firecrawl**: https://firecrawl.dev
2. **GitHub**: Settings → Developer settings → Personal access tokens
3. **Supabase**: https://supabase.com/dashboard/account/tokens
4. **Google Drive**: https://console.cloud.google.com/

## 🆘 문제 해결

설치 중 문제가 발생하면:

1. Node.js 18+ 설치 확인
   ```bash
   node --version
   ```

2. Claude Desktop 설치 확인
   ```bash
   ls /Applications/ | grep Claude
   ```

3. 설정 파일 검증
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
   ```

## 📝 수동 설치

자동 설치가 실패하면 `MCP_COMPLETE_SETUP.md` 파일의 수동 설치 가이드를 참조하세요.

---

**문의사항**: 설치 중 문제가 발생하면 상세 로그와 함께 문의해주세요.
**버전**: 2024.12.11
**호환성**: macOS 12.0+, Claude Desktop 최신 버전