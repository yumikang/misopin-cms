# 미소핀 CMS 배포 가이드

## 배포 방법

### 1. 전체 배포 (권장)
코드 변경 후 빌드부터 배포까지 전체 과정을 실행합니다.

```bash
./deploy.sh
```

**단계:**
1. Next.js 빌드 (`npm run build`)
2. .next 디렉토리 배포
3. static 파일 배포
4. public 파일 배포
5. PM2 재시작

**소요 시간:** 약 2-3분

---

### 2. 빠른 배포 (선택적)
이미 빌드된 상태에서 배포만 실행합니다.

```bash
./deploy-quick.sh
```

**사용 시기:**
- 코드 변경 없이 서버만 재시작할 때
- 이미 로컬에서 빌드가 완료된 경우

**주의:** 코드가 변경되었다면 반드시 전체 배포를 사용하세요!

**소요 시간:** 약 30초

---

## 배포 후 확인

배포 완료 후 다음 URL에서 확인하세요:

- **메인 사이트**: https://cms.one-q.xyz
- **관리자 페이지**: https://cms.one-q.xyz/admin/reservations
- **정적 홈페이지**: http://misopin.one-q.xyz

---

## 문제 해결

### CSS가 적용되지 않는 경우

```bash
./deploy.sh
```

전체 배포 스크립트가 static 파일을 올바르게 복사합니다.

### 서버 로그 확인

```bash
ssh root@cms.one-q.xyz "pm2 logs misopin-cms --lines 50"
```

### PM2 상태 확인

```bash
ssh root@cms.one-q.xyz "pm2 list"
```

### 서버 재시작만

```bash
ssh root@cms.one-q.xyz "pm2 restart misopin-cms"
```

---

## 배포 아키텍처

```
로컬 개발 환경
└── npm run build
    ├── .next/standalone/     → 서버 코드
    ├── .next/static/         → CSS, JS 번들
    └── public/               → 정적 파일

                ↓ rsync

서버 (/var/www/misopin-cms/.next/standalone/)
├── .next/
│   ├── server/              → Next.js 서버 코드
│   └── static/              → CSS, JS (복사됨)
├── public/                  → 정적 파일 (복사됨)
├── node_modules/
└── server.js                → PM2가 실행

                ↓

PM2 (cluster mode, 2 instances)
└── http://localhost:3001

                ↓

Caddy (역방향 프록시)
└── https://cms.one-q.xyz
```

---

## 중요 사항

1. **심볼릭 링크 사용 안 함**: 과거에는 심볼릭 링크를 사용했으나, `rsync --delete` 옵션과 충돌하여 실제 파일 복사 방식으로 변경했습니다.

2. **static 파일 필수**: Next.js standalone 모드에서는 static 파일을 수동으로 복사해야 CSS/JS가 정상 작동합니다.

3. **서버 환경 변수**: `.env` 파일은 `/var/www/misopin-cms/.next/standalone/.env`에 있습니다.

4. **데이터베이스**: PostgreSQL (141.164.60.51:5432/misopin_cms)

---

## 배포 스크립트 수정

배포 스크립트를 수정하려면:

```bash
nano deploy.sh
# 또는
nano deploy-quick.sh
```

수정 후 실행 권한 확인:

```bash
chmod +x deploy.sh deploy-quick.sh
```
