#!/bin/bash

# 서버 연결 테스트 스크립트
# 배포 전 서버 접속 가능 여부를 확인합니다.

echo "🔍 서버 연결 테스트 시작..."

# 서버 정보
SERVER_IP="141.164.60.51"
SERVER_USER="root"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Ping 테스트
echo -e "${YELLOW}📡 서버 Ping 테스트...${NC}"
ping -c 3 ${SERVER_IP} > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 서버가 응답합니다.${NC}"
else
    echo -e "${RED}❌ 서버가 응답하지 않습니다.${NC}"
    exit 1
fi

# 2. SSH 연결 테스트
echo -e "${YELLOW}🔐 SSH 연결 테스트...${NC}"
echo "SSH 연결을 테스트합니다. 비밀번호를 입력해주세요:"
ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo '✅ SSH 연결 성공'; exit"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSH 연결이 정상적으로 작동합니다.${NC}"

    # 3. 서버 정보 확인
    echo -e "${YELLOW}📊 서버 정보 확인...${NC}"
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
echo "=== 시스템 정보 ==="
uname -a
echo ""
echo "=== Podman 버전 ==="
podman --version 2>/dev/null || echo "Podman이 설치되지 않음"
echo ""
echo "=== Nginx 상태 ==="
systemctl status nginx --no-pager 2>/dev/null || echo "Nginx가 설치되지 않음"
echo ""
echo "=== 디스크 공간 ==="
df -h /
echo ""
echo "=== 메모리 사용량 ==="
free -h
ENDSSH

    echo -e "${GREEN}✅ 서버 연결 테스트 완료!${NC}"
    echo ""
    echo "다음 단계:"
    echo "1. chmod +x deploy-podman.sh"
    echo "2. ./deploy-podman.sh 실행하여 배포 진행"
else
    echo -e "${RED}❌ SSH 연결 실패!${NC}"
    echo "다음 사항을 확인해주세요:"
    echo "1. SSH 키가 설정되어 있는지 확인"
    echo "2. 서버의 SSH 포트(22)가 열려있는지 확인"
    echo "3. root 계정으로 접속이 허용되는지 확인"
    exit 1
fi