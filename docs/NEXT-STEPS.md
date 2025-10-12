# 다음 단계 - 정적 페이지 편집기 활성화

## ✅ 구현 완료 항목

모든 코드 구현이 완료되었습니다! 이제 데이터베이스 설정만 하면 바로 사용할 수 있습니다.

### 완성된 파일 목록
- ✅ Prisma 스키마 업데이트
- ✅ 마이그레이션 SQL 파일
- ✅ HTML 파싱 라이브러리 (HTMLParser)
- ✅ HTML 업데이트 라이브러리 (HTMLUpdater)
- ✅ 7개 API 엔드포인트
- ✅ 2개 관리자 UI 페이지
- ✅ 시딩 스크립트
- ✅ 전체 문서

---

## 🚀 실행해야 할 명령어 (순서대로)

### 1️⃣ 데이터베이스 마이그레이션 적용

Supabase 데이터베이스에 새 테이블을 생성합니다.

```bash
cd /Users/blee/Desktop/cms/misopin-cms

# Prisma Client 재생성
npx prisma generate

# 마이그레이션 적용
npm run db:migrate
```

**예상 결과**:
```
✔ Generated Prisma Client
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres"

Applying migration `20250112000000_add_static_pages`

The following migration(s) have been applied:

migrations/
  └─ 20250112000000_add_static_pages/
      └─ migration.sql

Your database is now in sync with your schema.
```

**생성되는 테이블**:
- ✅ `static_pages` - 정적 페이지 메타데이터
- ✅ `static_page_versions` - 버전 관리

---

### 2️⃣ 초기 페이지 시딩

5개 우선순위 페이지를 데이터베이스에 등록합니다.

```bash
npm run db:seed:static
```

**예상 결과**:
```
🌱 정적 페이지 시딩 시작...

📄 처리 중: 메인 페이지 (index.html)
   ✅ 45개 섹션 파싱 완료
   ✅ 페이지 생성 완료 (ID: clt...)
   📊 섹션 정보:
      - 텍스트: 28개
      - 이미지: 12개
      - 배경: 5개

📄 처리 중: 병원 소개 (about.html)
   ✅ 32개 섹션 파싱 완료
   ✅ 페이지 생성 완료 (ID: clt...)
   📊 섹션 정보:
      - 텍스트: 20개
      - 이미지: 8개
      - 배경: 4개

[... 나머지 페이지들 ...]

✨ 시딩 완료!
   성공: 5개
   실패: 0개
   총계: 5개

📋 현재 등록된 페이지:
   1. 메인 페이지 (index)
   2. 병원 소개 (about)
   3. 보톡스 시술 (botox)
   4. 필러 시술 (filler)
   5. 리프팅 시술 (lifting)
```

---

### 3️⃣ 이미지 업로드 디렉토리 생성

이미지 업로드를 위한 디렉토리를 미리 생성합니다.

```bash
mkdir -p /Users/blee/Desktop/cms/Misopin-renew/img/uploads/banner
mkdir -p /Users/blee/Desktop/cms/Misopin-renew/img/uploads/content
mkdir -p /Users/blee/Desktop/cms/Misopin-renew/img/uploads/facility

# 권한 확인
chmod 755 /Users/blee/Desktop/cms/Misopin-renew/img/uploads
```

---

### 4️⃣ CMS 서버 시작 (이미 실행 중이면 재시작)

```bash
# 개발 서버 시작
npm run dev
```

서버 시작 후 다음 URL로 접속:

```
http://localhost:3000/admin/static-pages
```

---

## 🎯 첫 번째 테스트

### 테스트 1: 페이지 목록 확인

1. 브라우저에서 접속:
   ```
   http://localhost:3000/admin/static-pages
   ```

2. 5개 페이지가 표시되는지 확인:
   - ✅ 메인 페이지 (index)
   - ✅ 병원 소개 (about)
   - ✅ 보톡스 시술 (botox)
   - ✅ 필러 시술 (filler)
   - ✅ 리프팅 시술 (lifting)

### 테스트 2: 페이지 편집

1. **"병원 소개 (about)"** 페이지의 **편집** 버튼 클릭

2. **텍스트 탭**에서 아무 제목이나 수정
   - 예: "미소핀 성형외과에 오신 것을 환영합니다" → "테스트 수정"

3. **변경사항 저장** 버튼 클릭
   - 메모 입력: "첫 번째 테스트 편집"

4. 성공 메시지 확인:
   ```
   ✅ 페이지가 성공적으로 업데이트되었습니다. (버전 2)
   ```

5. **버전 기록** 탭에서 변경 이력 확인
   - v1: 초기 시딩 (system)
   - v2: 첫 번째 테스트 편집 (admin)

### 테스트 3: 백업 파일 확인

```bash
ls /Users/blee/Desktop/cms/Misopin-renew/*.backup.html
```

**예상 결과**:
```
/Users/blee/Desktop/cms/Misopin-renew/about.backup.html
```

### 테스트 4: 실제 HTML 확인

```bash
# 변경 전 백업 확인
cat /Users/blee/Desktop/cms/Misopin-renew/about.backup.html | grep "미소핀 성형외과"

# 변경 후 파일 확인
cat /Users/blee/Desktop/cms/Misopin-renew/about.html | grep "테스트 수정"
```

---

## 🐛 문제 발생 시 체크리스트

### ❌ 마이그레이션 실패

**증상**: `Can't reach database server`

**해결**:
```bash
# .env 파일 확인
cat .env

# DATABASE_URL이 올바른지 확인
# Supabase 대시보드 → Settings → Database → Connection string
```

### ❌ 시딩 실패 (파일을 찾을 수 없음)

**증상**: `파일을 찾을 수 없습니다: /Users/blee/Desktop/cms/Misopin-renew/index.html`

**해결**:
```bash
# Misopin-renew 경로 확인
ls -la /Users/blee/Desktop/cms/Misopin-renew/

# 파일 존재 확인
ls /Users/blee/Desktop/cms/Misopin-renew/index.html
ls /Users/blee/Desktop/cms/Misopin-renew/about.html
```

경로가 다르다면 `prisma/seed-static-pages.ts` 파일의 `STATIC_SITE_PATH` 수정:
```typescript
const STATIC_SITE_PATH = path.join(process.cwd(), '../Misopin-renew');
// 실제 경로로 변경
```

### ❌ 페이지 목록이 비어있음

**증상**: "등록된 페이지가 없습니다"

**해결**:
```bash
# 시딩 다시 실행
npm run db:seed:static

# 데이터베이스 직접 확인
npx prisma studio
# → static_pages 테이블 확인
```

### ❌ 이미지 업로드 실패

**증상**: `ENOENT: no such file or directory, open '.../img/uploads/content/...'`

**해결**:
```bash
# 업로드 디렉토리 생성
mkdir -p /Users/blee/Desktop/cms/Misopin-renew/img/uploads/banner
mkdir -p /Users/blee/Desktop/cms/Misopin-renew/img/uploads/content
mkdir -p /Users/blee/Desktop/cms/Misopin-renew/img/uploads/facility
```

---

## 📋 완료 체크리스트

### 필수 단계
- [ ] 1. 데이터베이스 마이그레이션 적용 (`npm run db:migrate`)
- [ ] 2. 초기 페이지 시딩 (`npm run db:seed:static`)
- [ ] 3. 이미지 업로드 디렉토리 생성
- [ ] 4. CMS 서버 시작 (`npm run dev`)

### 테스트
- [ ] 5. 페이지 목록 확인 (`/admin/static-pages`)
- [ ] 6. 페이지 편집 테스트 (텍스트 수정)
- [ ] 7. 백업 파일 생성 확인 (`.backup.html`)
- [ ] 8. 버전 기록 확인

### 선택 사항
- [ ] 9. 이미지 업로드 테스트
- [ ] 10. 배경 이미지 변경 테스트
- [ ] 11. 재파싱 기능 테스트

---

## 📚 참고 문서

- **전체 설정 가이드**: `docs/static-page-editor-setup.md`
- **구현 요약**: `docs/static-page-editor-README.md`
- **간소화 계획**: `docs/static-page-editor-simple-plan.md`

---

## 🎉 완료 후

모든 단계를 완료하면:

1. ✅ `/admin/static-pages`에서 5개 페이지 확인
2. ✅ 텍스트, 이미지, 배경 편집 가능
3. ✅ 자동 백업 및 버전 관리 작동
4. ✅ 이미지 업로드 및 WebP 변환 작동

**간소화된 정적 페이지 편집기가 완전히 작동합니다! 🚀**

---

**마지막 업데이트**: 2025-01-12
**작성자**: Claude Code
