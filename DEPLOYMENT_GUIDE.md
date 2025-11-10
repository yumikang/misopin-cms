# 배포 가이드 - 시술 관리 기능 추가

## 📋 변경 사항 요약

### 새로 추가된 기능
- **시술 관리 시스템 (Phase 5.1 + 5.2 완료)**
  - Backend API: 시술 CRUD 완전 구현
  - Admin UI: 시술 관리 인터페이스
  - 예약 관리 페이지에 "시술 관리" 버튼 추가

---

## 🚀 서버에서 배포하기

**서버 접속 후 다음 명령어 실행**:

```bash
cd /home/blee/cms/misopin-cms
git pull origin main
npm install
npm run build
pm2 restart misopin-cms
pm2 status
```

---

## ✅ 배포 후 검증

### 1. 예약 관리 페이지 확인
```
https://cms.one-q.xyz/admin/reservations
```

**확인 사항**:
- [ ] "시술 관리" 버튼 표시됨
- [ ] 버튼 클릭 시 모달 열림
- [ ] 시술 CRUD 작동

### 2. 시술 관리 직접 접근
```
https://cms.one-q.xyz/admin/services
```

---

## 🎯 핵심 기능

1. **시술 생성/수정/삭제**
2. **시술 시간 변경 시 cascade 효과 미리보기**
3. **예약 있는 시술 하드 삭제 차단**
4. **필터링, 검색, 정렬**

---

**문제 발생 시**: `pm2 logs misopin-cms`
