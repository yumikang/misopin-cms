#!/bin/bash

# 서버 초기 설정 스크립트
# 서버에서 직접 실행할 스크립트입니다.

echo "🔧 서버 초기 설정 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Podman 설치 확인
echo -e "${YELLOW}📦 Podman 설치 확인...${NC}"
if ! command -v podman &> /dev/null; then
    echo "Podman이 설치되어 있지 않습니다. 설치를 진행합니다..."
    dnf install -y podman
else
    echo -e "${GREEN}✅ Podman이 이미 설치되어 있습니다.${NC}"
fi

# 2. Nginx 설치 확인
echo -e "${YELLOW}🌐 Nginx 설치 확인...${NC}"
if ! command -v nginx &> /dev/null; then
    echo "Nginx가 설치되어 있지 않습니다. 설치를 진행합니다..."
    dnf install -y nginx
    systemctl enable nginx
    systemctl start nginx
else
    echo -e "${GREEN}✅ Nginx가 이미 설치되어 있습니다.${NC}"
fi

# 3. 방화벽 설정
echo -e "${YELLOW}🔥 방화벽 설정...${NC}"
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=5432/tcp
firewall-cmd --reload
echo -e "${GREEN}✅ 방화벽 설정 완료${NC}"

# 4. SELinux 설정 (필요한 경우)
echo -e "${YELLOW}🔒 SELinux 설정...${NC}"
setsebool -P httpd_can_network_connect 1
echo -e "${GREEN}✅ SELinux 설정 완료${NC}"

# 5. Let's Encrypt 인증서 설정
echo -e "${YELLOW}🔐 SSL 인증서 설정...${NC}"
if ! command -v certbot &> /dev/null; then
    echo "Certbot이 설치되어 있지 않습니다. 설치를 진행합니다..."
    dnf install -y certbot python3-certbot-nginx
fi

# 인증서가 없으면 생성
if [ ! -d "/etc/letsencrypt/live/one-q.xyz" ]; then
    echo "SSL 인증서를 생성합니다..."
    certbot certonly --nginx -d one-q.xyz -d cms.one-q.xyz --non-interactive --agree-tos --email admin@one-q.xyz
else
    echo -e "${GREEN}✅ SSL 인증서가 이미 존재합니다.${NC}"
fi

# 6. Nginx 설정 복사
echo -e "${YELLOW}📋 Nginx 설정 파일 복사...${NC}"
if [ -f "/opt/misopin-cms/nginx.conf" ]; then
    cp /opt/misopin-cms/nginx.conf /etc/nginx/conf.d/cms.one-q.xyz.conf
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}✅ Nginx 설정 완료${NC}"
else
    echo -e "${RED}❌ Nginx 설정 파일이 없습니다. /opt/misopin-cms/nginx.conf 파일을 확인하세요.${NC}"
fi

# 7. Podman 로그인 없이 실행 가능하도록 설정
echo -e "${YELLOW}🔧 Podman 시스템 설정...${NC}"
loginctl enable-linger root
echo -e "${GREEN}✅ Podman 시스템 설정 완료${NC}"

# 8. 시스템 서비스 생성 (선택사항)
echo -e "${YELLOW}📝 시스템 서비스 파일 생성...${NC}"

# PostgreSQL 서비스 파일 생성
cat > /etc/systemd/system/misopin-postgres.service << EOL
[Unit]
Description=Misopin CMS PostgreSQL Database
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/podman start -a misopin-postgres
ExecStop=/usr/bin/podman stop misopin-postgres
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOL

# CMS 서비스 파일 생성
cat > /etc/systemd/system/misopin-cms.service << EOL
[Unit]
Description=Misopin CMS Application
After=network.target misopin-postgres.service
Requires=misopin-postgres.service

[Service]
Type=simple
ExecStart=/usr/bin/podman start -a misopin-cms
ExecStop=/usr/bin/podman stop misopin-cms
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOL

# 서비스 활성화
systemctl daemon-reload
systemctl enable misopin-postgres.service
systemctl enable misopin-cms.service

echo -e "${GREEN}✅ 시스템 서비스 설정 완료${NC}"

# 9. 상태 확인
echo -e "${YELLOW}🔍 시스템 상태 확인...${NC}"
echo "=== Podman 컨테이너 상태 ==="
podman ps -a

echo ""
echo "=== Nginx 상태 ==="
systemctl status nginx --no-pager

echo ""
echo "=== 방화벽 상태 ==="
firewall-cmd --list-all

echo ""
echo -e "${GREEN}🎉 서버 초기 설정이 완료되었습니다!${NC}"
echo -e "${GREEN}📱 다음 URL로 접속 가능합니다:${NC}"
echo "   - https://cms.one-q.xyz (CMS 관리자 패널)"
echo ""
echo -e "${YELLOW}⚠️  확인사항:${NC}"
echo "   1. DNS 설정: cms.one-q.xyz가 141.164.60.51을 가리키는지 확인"
echo "   2. 데이터베이스: PostgreSQL이 정상 작동하는지 확인"
echo "   3. 애플리케이션: CMS가 포트 3000에서 실행 중인지 확인"