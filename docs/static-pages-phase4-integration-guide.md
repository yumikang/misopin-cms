# Phase 4: UI Integration - 통합 가이드

## 생성된 파일 목록

### 1. 새 페이지 라우트
```
/app/admin/static-pages/[slug]/edit/page.tsx
```
- **목적**: TipTap 기반 정적 페이지 편집 UI
- **기능**:
  - JWT 인증 확인 (localStorage에서 토큰 가져오기)
  - StaticPageEditor 컴포넌트 렌더링
  - 뒤로 가기 버튼
  - 로딩 상태 표시

### 2. 수정된 파일
```
/app/admin/static-pages/page.tsx
```
- **변경사항**:
  - `editMode` 필드 추가 (PARSER | ATTRIBUTE)
  - TipTap 편집 버튼 조건부 렌더링
  - ATTRIBUTE 모드일 때 → TipTap 편집 버튼 표시
  - PARSER 모드일 때 → 기존 편집 버튼 표시
  - Sparkles 아이콘으로 TipTap 편집 강조

### 3. 이미지 업로드 API
```
/app/api/admin/upload/route.ts
```
- **목적**: ElementImagePicker에서 사용할 이미지 업로드 엔드포인트
- **기능**:
  - POST 핸들러
  - 파일 타입 검증 (jpg, png, webp, gif)
  - 파일 크기 제한 (5MB)
  - 고유 파일명 생성 (timestamp + random)
  - `/public/uploads/` 디렉토리에 저장
  - URL 반환

## 컴포넌트 구조

```
┌─────────────────────────────────────────────────┐
│ /admin/static-pages/[slug]/edit/page.tsx       │
│ ┌─────────────────────────────────────────────┐ │
│ │ StaticPageEditor                            │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ EditableSection                         │ │ │
│ │ │ ┌─────────────────────────────────────┐ │ │ │
│ │ │ │ EditableElement                     │ │ │ │
│ │ │ │ ┌─────────────────────────────────┐ │ │ │ │
│ │ │ │ │ ElementTipTapEditor             │ │ │ │ │
│ │ │ │ └─────────────────────────────────┘ │ │ │ │
│ │ │ │ ┌─────────────────────────────────┐ │ │ │ │
│ │ │ │ │ ElementImagePicker              │ │ │ │ │
│ │ │ │ │  → /api/admin/upload            │ │ │ │ │
│ │ │ │ └─────────────────────────────────┘ │ │ │ │
│ │ │ └─────────────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ SaveControls                            │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 데이터 흐름

### 1. 페이지 진입
```
사용자 → /admin/static-pages → "TipTap 편집" 버튼 클릭
  → /admin/static-pages/[slug]/edit
    → localStorage에서 JWT 확인
      → StaticPageEditor 렌더링
```

### 2. 데이터 로드
```
StaticPageEditor
  → GET /api/admin/static-pages/[slug]/editable-elements
    → { elements: Element[] }
      → EditableSection 렌더링
        → EditableElement 렌더링
```

### 3. 편집 및 저장
```
사용자 편집
  → 로컬 상태 업데이트 (useElements hook)
    → "저장" 버튼 클릭
      → PATCH /api/admin/static-pages/[slug]/elements/[elementId]
        → HTML 업데이트
          → 성공 메시지 표시
```

### 4. 이미지 업로드
```
ElementImagePicker
  → 파일 선택
    → POST /api/admin/upload (FormData)
      → 파일 검증
        → /public/uploads/ 저장
          → { url: string } 반환
            → 로컬 상태 업데이트
```

## API 엔드포인트

### 정적 페이지 편집
- `GET /api/admin/static-pages/[slug]/editable-elements` - 편집 가능한 요소 조회
- `PATCH /api/admin/static-pages/[slug]/elements/[elementId]` - 요소 업데이트
- `GET /api/admin/static-pages/[slug]/parse` - HTML 파싱 (초기 설정용)

### 이미지 업로드
- `POST /api/admin/upload` - 이미지 업로드 (5MB 제한)

## 인증

### JWT 토큰 관리
```typescript
// 로그인 후 저장
localStorage.setItem('authToken', token);

// 편집 페이지에서 확인
const token = localStorage.getItem('authToken');
if (!token) {
  router.push('/admin/login');
}

// API 요청 시 사용
headers: {
  'Authorization': `Bearer ${token}`
}
```

## 사용 시나리오

### ATTRIBUTE 모드 페이지 편집

1. **페이지 목록에서 선택**
   ```
   /admin/static-pages
   → editMode: 'ATTRIBUTE' 페이지 확인
   → "TipTap 편집" 버튼 클릭
   ```

2. **TipTap 편집기에서 작업**
   ```
   /admin/static-pages/about/edit
   → 섹션별로 요소 편집
   → 텍스트는 TipTap 에디터
   → 이미지는 ImagePicker
   ```

3. **저장**
   ```
   → "저장" 버튼 클릭
   → 각 변경된 요소별로 PATCH 요청
   → 성공 메시지 표시
   ```

### PARSER 모드 페이지 편집

```
/admin/static-pages
→ editMode: 'PARSER' 페이지 확인
→ "편집" 버튼 클릭 (기존 방식)
  → /admin/static-pages/[id]
    → 섹션별 textarea 편집
    → 이미지 URL 입력
```

## 환경 설정

### 1. 업로드 디렉토리 생성
```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

### 2. .gitignore 업데이트
```
# 업로드 파일 무시
/public/uploads/*
!/public/uploads/.gitkeep
```

### 3. 환경 변수 (선택사항)
```env
# .env.local
MAX_UPLOAD_SIZE=5242880  # 5MB
ALLOWED_IMAGE_TYPES=jpg,png,webp,gif
```

## 테스트

### 1. 빌드 확인
```bash
npm run build
```
✅ 성공: Route `/admin/static-pages/[slug]/edit` 생성 확인됨

### 2. 페이지 접근 테스트
```
1. 관리자 로그인
2. /admin/static-pages 접속
3. editMode가 'ATTRIBUTE'인 페이지 확인
4. "TipTap 편집" 버튼 클릭
5. 편집 페이지 로드 확인
```

### 3. 편집 기능 테스트
```
1. 텍스트 요소 편집 (TipTap)
2. 이미지 업로드 테스트
3. 저장 버튼 클릭
4. HTML 파일 업데이트 확인
```

## 다음 단계

### Phase 5: E2E 통합 테스트
1. 전체 워크플로우 테스트
2. 에러 처리 검증
3. 성능 최적화
4. 사용자 가이드 작성

## 트러블슈팅

### 1. "TipTap 편집" 버튼이 보이지 않음
- **원인**: editMode가 'ATTRIBUTE'로 설정되지 않음
- **해결**: `/api/admin/static-pages/[slug]/parse` 호출하여 HTML 파싱

### 2. 이미지 업로드 실패
- **원인**: /public/uploads/ 디렉토리 권한 부족
- **해결**:
  ```bash
  mkdir -p public/uploads
  chmod 755 public/uploads
  ```

### 3. JWT 인증 실패
- **원인**: localStorage에 토큰이 없음
- **해결**: 로그인 페이지로 리다이렉트 확인

### 4. 저장 후 반영되지 않음
- **원인**: 캐시 또는 HTML 파일 권한 문제
- **해결**:
  ```bash
  # HTML 파일 권한 확인
  ls -la /path/to/html/files
  chmod 644 /path/to/html/files/*.html
  ```

## 파일 구조 요약

```
misopin-cms/
├── app/
│   ├── admin/
│   │   └── static-pages/
│   │       ├── page.tsx (수정됨 - TipTap 버튼 추가)
│   │       ├── [id]/
│   │       │   └── page.tsx (기존 PARSER 모드)
│   │       └── [slug]/
│   │           └── edit/
│   │               └── page.tsx (신규 - TipTap 모드)
│   └── api/
│       └── admin/
│           ├── static-pages/
│           │   └── [slug]/
│           │       ├── editable-elements/
│           │       │   └── route.ts (Phase 2)
│           │       ├── elements/
│           │       │   └── [elementId]/
│           │       │       └── route.ts (Phase 2)
│           │       └── parse/
│           │           └── route.ts (Phase 1)
│           └── upload/
│               └── route.ts (신규 - Phase 4)
├── components/
│   └── static-pages/
│       ├── index.ts (Phase 3)
│       ├── StaticPageEditor.tsx (Phase 3)
│       ├── EditableSection.tsx (Phase 3)
│       ├── EditableElement.tsx (Phase 3)
│       ├── ElementTipTapEditor.tsx (Phase 3)
│       ├── ElementImagePicker.tsx (Phase 3)
│       └── SaveControls.tsx (Phase 3)
└── public/
    └── uploads/ (생성 필요)
```

## Phase 4 완료 체크리스트

- ✅ `/app/admin/static-pages/[slug]/edit/page.tsx` 생성
- ✅ `/app/admin/static-pages/page.tsx` 수정 (TipTap 버튼)
- ✅ `/app/api/admin/upload/route.ts` 생성
- ✅ Next.js 빌드 성공
- ✅ 통합 가이드 작성
- ⏳ 실제 테스트 (다음 단계)
- ⏳ 사용자 가이드 작성 (다음 단계)

## 참고 자료

- Phase 1: HTML 파싱 API
- Phase 2: 편집 API (GET/PATCH)
- Phase 3: React 컴포넌트
- Phase 4: UI 통합 (현재)
- Phase 5: E2E 테스트 (다음)
