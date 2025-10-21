# 🏥 Misopin (미소핀의원) 웹사이트

The best luxury CLINIC

## 🌐 사이트 정보

- **프로덕션**: http://misopin.one-q.xyz
- **CMS 관리자**: https://cms.one-q.xyz

## 🚀 빠른 시작

### 현재 상태: 개발 단계 (자동 배포 활성화)

```bash
# 1. 파일 수정
vim index.html

# 2. 커밋 & 푸시
git add .
git commit -m "feat: 메인 페이지 업데이트"
git push origin master

# 3. 자동 배포 완료! (1-2분 소요)
```

### 운영 단계로 전환 시

```bash
# .github/workflows/deploy.yml에서 AUTO_DEPLOY를 false로 변경
# 이후: CMS에서만 편집, Git 자동 배포 중단
```

자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md) 참고

## 📁 프로젝트 구조

```
Misopin-renew/
├── index.html              # 메인 페이지
├── about.html              # 병원 소개
├── contents/               # 콘텐츠 페이지
│   └── treatments/         # 시술 페이지
│       ├── botox.html
│       ├── filler.html
│       └── lifting.html
├── css/                    # 스타일시트
├── js/                     # 자바스크립트
├── assets/                 # 이미지 등 리소스
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 배포 설정
└── DEPLOYMENT.md           # 배포 가이드

```

## 🛠️ 기술 스택

- **프론트엔드**: HTML5, CSS3, JavaScript
- **웹서버**: Caddy
- **배포**: GitHub Actions (자동 배포)
- **CMS**: Next.js + Prisma + PostgreSQL

## 📝 개발 워크플로우

1. **로컬에서 수정** ✏️
2. **Git 커밋 & 푸시** 📤
3. **GitHub Actions 자동 실행** 🤖
4. **서버에 자동 배포** 🚀
5. **완료** ✅

## 🔧 유지보수

### 백업
- **자동 백업**: 매일 새벽 2시 (30일 보관)
- **배포 시 백업**: 매 배포마다 자동 생성
- **백업 위치**: 서버 `/var/www/misopin.com/.backups/`

### 모니터링
- **헬스체크**: 15분마다 자동 체크
- **로그**: `/var/log/caddy/misopin-static.log`
- **헬스로그**: `/var/log/misopin-health.log`

## 🐛 문제 해결

문제 발생 시 [DEPLOYMENT.md](./DEPLOYMENT.md)의 트러블슈팅 섹션 참고

## 📞 연락처

- **개발**: [GitHub Issues](https://github.com/yumikang/Misopin-renew/issues)
- **배포 상태**: [GitHub Actions](https://github.com/yumikang/Misopin-renew/actions)

## 📄 라이선스

© 2025 Misopin Clinic. All rights reserved.
