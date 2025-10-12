# 정적 페이지 편집기 설정 가이드

## 📋 개요

Misopin-renew 정적 사이트의 HTML 파일을 CMS에서 간편하게 수정할 수 있는 기능입니다.

**핵심 기능**:
- ✅ 텍스트 내용 편집 (제목, 단락)
- ✅ 이미지 교체 및 업로드
- ✅ 배경 이미지 변경
- ✅ 자동 백업 생성
- ✅ 버전 관리 (변경 이력 추적)
- ✅ WebP 이미지 최적화

**제외 기능** (간단함 유지):
- ❌ 레이아웃 변경
- ❌ CSS 편집
- ❌ 복잡한 블록 빌더
- ❌ 드래그 앤 드롭

---

## 🚀 설치 및 설정

### 1. 필수 패키지 확인

```bash
cd /Users/blee/Desktop/cms/misopin-cms

# 패키지 확인 (이미 설치됨)
# - cheerio: HTML 파싱 및 조작
# - sharp: 이미지 최적화
# - tsx: TypeScript 스크립트 실행
```

### 2. 데이터베이스 마이그레이션

```bash
# Supabase 연결이 활성화되어 있는지 확인
# DATABASE_URL이 .env에 설정되어 있어야 함

# 마이그레이션 적용
npm run db:migrate

# 또는 직접 실행
npx prisma migrate deploy
```

**마이그레이션 파일 위치**:
- `prisma/migrations/20250112000000_add_static_pages/migration.sql`

**생성되는 테이블**:
- `static_pages`: 정적 페이지 메타데이터
- `static_page_versions`: 버전 관리

### 3. 초기 데이터 시딩

5개 우선순위 페이지를 데이터베이스에 등록합니다:

```bash
npm run db:seed:static
```

**시딩되는 페이지**:
1. `index.html` - 메인 페이지
2. `about.html` - 병원 소개
3. `contents/treatments/botox.html` - 보톡스 시술
4. `contents/treatments/filler.html` - 필러 시술
5. `contents/treatments/lifting.html` - 리프팅 시술

**시딩 스크립트**:
- 위치: `prisma/seed-static-pages.ts`
- 각 페이지의 HTML을 파싱하여 편집 가능한 섹션 추출
- 초기 버전 (v1) 자동 생성

---

## 📂 디렉토리 구조

```
misopin-cms/
├── lib/
│   └── static-pages/
│       ├── html-parser.ts      # HTML 파일 파싱 (섹션 추출)
│       └── html-updater.ts     # HTML 파일 업데이트 (백업 포함)
│
├── app/
│   ├── api/
│   │   └── static-pages/
│   │       ├── route.ts                    # GET, POST (목록, 생성)
│   │       ├── [id]/
│   │       │   ├── route.ts                # GET, PUT, DELETE (상세, 수정, 삭제)
│   │       │   └── reparse/route.ts        # POST (재파싱)
│   │       └── upload-image/route.ts       # POST (이미지 업로드)
│   │
│   └── admin/
│       └── static-pages/
│           ├── page.tsx        # 페이지 목록
│           └── [id]/page.tsx   # 페이지 편집기
│
├── prisma/
│   ├── schema.prisma                       # StaticPage 모델 추가
│   ├── migrations/...                      # 마이그레이션 파일
│   └── seed-static-pages.ts                # 시딩 스크립트
│
└── ../Misopin-renew/
    ├── img/uploads/                        # 업로드된 이미지 저장
    │   ├── banner/
    │   ├── content/
    │   └── facility/
    ├── index.html
    ├── about.html
    └── contents/treatments/*.html
```

---

## 🛠️ 사용 방법

### 1. CMS 관리자 페이지 접속

```
http://localhost:3000/admin/static-pages
```

### 2. 페이지 목록 확인

- 5개 우선순위 페이지 표시
- 각 페이지의 상태, 마지막 수정 시간 확인
- **편집** 버튼 클릭하여 편집 모드 진입

### 3. 페이지 편집

편집 화면은 4개 탭으로 구성:

#### ① 텍스트 탭
- 제목, 단락, 리스트 등 텍스트 콘텐츠 편집
- HTML 태그 포함 가능 (예: `<strong>`, `<em>`)
- 실시간 미리보기 제공

#### ② 이미지 탭
- 콘텐츠 이미지 URL 수정
- **업로드** 버튼으로 새 이미지 업로드
- 대체 텍스트(alt) 수정
- 이미지 미리보기 제공

#### ③ 배경 탭
- 배너/히어로 섹션의 배경 이미지 변경
- URL 직접 입력 또는 업로드

#### ④ 버전 기록 탭
- 모든 변경 이력 확인
- 버전 번호, 변경자, 변경 시간 표시

### 4. 변경사항 저장

1. **변경사항 저장** 버튼 클릭
2. 변경 메모 입력 (선택사항)
3. 저장 완료 시 새 버전 자동 생성
4. 백업 파일 생성: `filename.backup.html`

---

## 🔧 API 엔드포인트

### 페이지 관리

```typescript
// 페이지 목록 조회
GET /api/static-pages
Response: { success: boolean, pages: StaticPage[] }

// 특정 페이지 조회
GET /api/static-pages?slug=about
Response: { success: boolean, page: StaticPage }

// 새 페이지 등록
POST /api/static-pages
Body: { slug: string, title: string, filePath: string }
Response: { success: boolean, page: StaticPage, sectionsCount: number }

// 페이지 업데이트
PUT /api/static-pages/[id]
Body: { sections: Section[], changedBy: string, changeNote?: string }
Response: { success: boolean, page: StaticPage, version: number, backupPath: string }

// 페이지 재파싱
POST /api/static-pages/[id]/reparse
Response: { success: boolean, page: StaticPage, sectionsCount: number }

// 페이지 삭제
DELETE /api/static-pages/[id]
Response: { success: boolean, message: string }
```

### 이미지 업로드

```typescript
// 이미지 업로드 (WebP 변환)
POST /api/static-pages/upload-image
Body: FormData { file: File, category?: string, maxWidth?: number, quality?: number }
Response: {
  success: boolean,
  files: {
    webp: { filename: string, url: string, path: string },
    thumbnail: { filename: string, url: string, path: string },
    original: { filename: string, url: string, path: string }
  },
  metadata: { width: number, height: number, format: string, size: number }
}

// 업로드된 이미지 목록
GET /api/static-pages/upload-image?category=banner
Response: { success: boolean, images: Array<{ filename, url, thumbnail }> }
```

---

## 🔒 안전 기능

### 1. 자동 백업
- 모든 변경 전 `.backup.html` 파일 생성
- 오류 발생 시 자동 복원
- 수동 백업 삭제 가능

### 2. HTML 검증
- 변경 후 HTML 길이 검증 (50% 이상 감소 시 경고)
- DOCTYPE 보존
- 특수문자 인코딩 방지

### 3. Cheerio 설정
```typescript
cheerio.load(html, {
  xmlMode: false,        // HTML 모드
  decodeEntities: false  // 엔티티 인코딩 방지
})
```

### 4. 버전 관리
- 모든 변경사항 데이터베이스 저장
- 변경자 및 변경 메모 기록
- 버전 번호 자동 증가

---

## 📝 작업 순서 예시

### 예시 1: 병원 소개 페이지 텍스트 수정

```bash
1. http://localhost:3000/admin/static-pages 접속
2. "병원 소개 (about)" 페이지 → 편집 클릭
3. 텍스트 탭에서 원하는 제목/단락 수정
4. 변경사항 저장 → 메모 입력: "병원 소개 문구 업데이트"
5. 실제 사이트 확인: http://localhost:3000 (또는 Misopin-renew 서버)
```

### 예시 2: 보톡스 페이지 이미지 교체

```bash
1. "보톡스 시술 (botox)" 페이지 → 편집 클릭
2. 이미지 탭으로 이동
3. 변경할 이미지 → 업로드 버튼 클릭
4. 새 이미지 선택 (자동으로 WebP 변환됨)
5. 대체 텍스트(alt) 수정: "보톡스 시술 전후 비교"
6. 변경사항 저장
```

### 예시 3: 메인 배너 배경 변경

```bash
1. "메인 페이지 (index)" → 편집 클릭
2. 배경 탭으로 이동
3. "main-banner 배경 이미지" 섹션 → 업로드 버튼
4. 새 배너 이미지 선택 (1920x1080 권장)
5. 변경사항 저장
```

---

## 🐛 문제 해결

### 1. 데이터베이스 연결 실패

```bash
# .env 파일 확인
DATABASE_URL="postgresql://..."

# Supabase 대시보드에서 연결 정보 확인
# 또는 로컬 PostgreSQL 사용
```

### 2. 시딩 실패

```bash
# 파일 경로 확인
ls ../Misopin-renew/index.html
ls ../Misopin-renew/about.html

# Misopin-renew가 올바른 위치에 있는지 확인
# 상대 경로: misopin-cms/../Misopin-renew
```

### 3. 이미지 업로드 실패

```bash
# 업로드 디렉토리 생성
mkdir -p ../Misopin-renew/img/uploads/banner
mkdir -p ../Misopin-renew/img/uploads/content
mkdir -p ../Misopin-renew/img/uploads/facility

# 권한 확인
chmod 755 ../Misopin-renew/img/uploads
```

### 4. HTML 파싱 오류

```bash
# 페이지 재파싱 시도
# 관리자 페이지에서 "새로고침" 아이콘 버튼 클릭

# 또는 API 직접 호출
curl -X POST http://localhost:3000/api/static-pages/[id]/reparse
```

### 5. 백업 파일이 많이 쌓임

```bash
# 백업 파일 정리 (수동)
cd ../Misopin-renew
find . -name "*.backup.html" -mtime +7 -delete

# 7일 이상 된 백업만 삭제
```

---

## 📊 개발 체크리스트

### ✅ 완료 항목

- [x] Prisma 스키마 추가 (StaticPage, StaticPageVersion)
- [x] 마이그레이션 파일 생성
- [x] HTMLParser 구현 (multi-pattern 섹션 감지)
- [x] HTMLUpdater 구현 (백업, 복원, 검증)
- [x] 이미지 업로드 API (Sharp WebP 변환)
- [x] 정적 페이지 CRUD API
- [x] 재파싱 API
- [x] 관리자 페이지 목록 UI
- [x] 관리자 페이지 편집 UI (탭 구조)
- [x] 버전 관리 UI
- [x] 시딩 스크립트
- [x] 설정 문서

### 🔜 추후 고려사항 (선택)

- [ ] 사용자 인증 연동 (현재는 "admin" 하드코딩)
- [ ] 배포 워크플로우 (변경사항 → Git → 배포)
- [ ] 이미지 갤러리 (업로드된 이미지 재사용)
- [ ] 미리보기 기능 (iframe으로 실제 페이지 미리보기)
- [ ] 변경사항 롤백 (특정 버전으로 복원)
- [ ] 섹션 추가/삭제 (현재는 파싱된 섹션만)

---

## 🎯 핵심 파일 요약

| 파일 | 용도 | 핵심 기능 |
|------|------|----------|
| `lib/static-pages/html-parser.ts` | HTML 파싱 | 4가지 패턴으로 섹션 감지 |
| `lib/static-pages/html-updater.ts` | HTML 업데이트 | 백업, 업데이트, 복원, 검증 |
| `app/api/static-pages/route.ts` | 페이지 CRUD | GET (목록), POST (생성) |
| `app/api/static-pages/[id]/route.ts` | 페이지 상세 | GET, PUT, DELETE |
| `app/api/static-pages/upload-image/route.ts` | 이미지 업로드 | Sharp WebP 변환 |
| `app/admin/static-pages/page.tsx` | 목록 UI | 페이지 리스트, 재파싱 |
| `app/admin/static-pages/[id]/page.tsx` | 편집 UI | 4개 탭 (텍스트, 이미지, 배경, 버전) |
| `prisma/seed-static-pages.ts` | 시딩 | 5개 페이지 초기화 |

---

## 💡 개발자 노트

### Cheerio 주의사항

```typescript
// ❌ 잘못된 설정 (HTML 손상 가능)
cheerio.load(html)

// ✅ 올바른 설정
cheerio.load(html, {
  xmlMode: false,        // HTML 파서 사용
  decodeEntities: false  // 특수문자 보존
})
```

### 섹션 파싱 패턴

1. **`<section>` 태그**: id 또는 class 기반 섹션
2. **콘텐츠 클래스**: `.treatment-section`, `.info-section` 등
3. **컨테이너**: `div.container` 내부 카드들
4. **배경 이미지**: `style` 속성에 `background-image` 포함

### 이미지 최적화

- 원본 크기 → 최대 1920px 리사이즈
- WebP 품질 85% (배너는 90% 권장)
- 썸네일 자동 생성 (400px)
- 원본 포맷 폴백 버전 유지

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. **데이터베이스 연결**: Supabase 대시보드 확인
2. **파일 경로**: Misopin-renew 위치 확인
3. **권한**: 이미지 업로드 디렉토리 쓰기 권한
4. **로그**: 브라우저 개발자 도구 콘솔
5. **API 응답**: Network 탭에서 에러 메시지 확인

---

**마지막 업데이트**: 2025-01-12
**버전**: 1.0.0
