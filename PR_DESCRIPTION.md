# PR Title
feat: Add Service Management System (Phase 5.1 + 5.2)

# PR Description

## 📋 변경 사항

### Phase 5.1: Backend API 구현
- ✅ 시술 CRUD API 완전 구현
- ✅ 필터링, 검색, 정렬 기능
- ✅ Cascade 효과 감지 (시술 시간 변경 시)
- ✅ 안전한 삭제 로직 (soft/hard delete)
- ✅ Korean 에러 메시지

### Phase 5.2: Admin UI 구현
- ✅ 시술 관리 페이지 (`/admin/services`)
- ✅ 시술 생성/수정 폼 (cascade 효과 미리보기)
- ✅ 삭제 확인 다이얼로그 (soft/hard 선택)
- ✅ 예약 관리 페이지에 "시술 관리" 버튼 추가

## 🎯 핵심 기능

1. **시술 CRUD**: 생성, 조회, 수정, 삭제
2. **Cascade 효과 미리보기**: 시술 시간 변경 시 예약 가능 건수 자동 계산
3. **안전한 삭제**: 예약 기록 있는 시술 하드 삭제 차단
4. **통합 관리**: 예약 관리 페이지에서 시술 관리 접근 가능

## 📦 신규 파일

**Backend (7 files)**:
- `app/api/admin/services/validation.ts`
- `app/api/admin/services/route.ts`
- `app/api/admin/services/[id]/route.ts`
- `app/api/admin/services/reorder/route.ts`
- `app/api/admin/services/types.ts`

**Frontend (4 files)**:
- `app/admin/services/page.tsx`
- `app/admin/services/components/ServiceList.tsx`
- `app/admin/services/components/ServiceForm.tsx`
- `app/admin/services/components/DeleteConfirmDialog.tsx`

**UI Components (2 files)**:
- `components/ui/radio-group.tsx`
- `hooks/use-toast.ts`

## ✅ 테스트 확인 사항

배포 후 확인:
- [ ] https://cms.one-q.xyz/admin/reservations - "시술 관리" 버튼 표시
- [ ] https://cms.one-q.xyz/admin/services - 시술 관리 페이지 접근
- [ ] 시술 생성/수정/삭제 작동
- [ ] Cascade 효과 미리보기 작동

## 🚀 배포

이 PR이 main에 merge되면 GitHub Actions가 자동으로 배포합니다.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
