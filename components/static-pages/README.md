# Static Pages Editor Components

TipTap 기반 정적 페이지 편집 컴포넌트 모음입니다.

## 생성된 컴포넌트 (6개)

### 1. StaticPageEditor (메인 에디터)
**경로**: `/components/static-pages/StaticPageEditor.tsx`

메인 에디터 컨테이너로 전체 편집 기능을 통합합니다.

**Props**:
```typescript
interface StaticPageEditorProps {
  slug: string;      // 페이지 slug (예: "about-us")
  token: string;     // JWT 인증 토큰
}
```

**주요 기능**:
- API로 editable_elements 로드 (GET `/api/admin/static-pages/[slug]/editable-elements`)
- 섹션별 요소 그룹 표시
- 변경사항 추적 (dirty state)
- 저장/취소 기능 (PATCH `/api/admin/static-pages/[slug]/elements`)
- 로딩/에러 상태 관리

**사용 예시**:
```tsx
import { StaticPageEditor } from '@/components/static-pages';

function Page() {
  const token = 'your-jwt-token';

  return <StaticPageEditor slug="about-us" token={token} />;
}
```

---

### 2. EditableSection (섹션 그룹)
**경로**: `/components/static-pages/EditableSection.tsx`

섹션별로 편집 요소를 그룹화하여 표시합니다.

**Props**:
```typescript
interface EditableSectionProps {
  sectionName: string;
  elements: ParsedSection[];
  onElementChange: (index: number, updatedElement: ParsedSection) => void;
  defaultExpanded?: boolean;
}
```

**주요 기능**:
- 섹션 제목과 요소 개수 표시
- 접기/펼치기 토글
- 섹션 내 EditableElement 목록 렌더링

---

### 3. EditableElement (개별 요소)
**경로**: `/components/static-pages/EditableElement.tsx`

ElementType에 따라 적절한 입력 컴포넌트를 렌더링합니다.

**Props**:
```typescript
interface EditableElementProps {
  element: ParsedSection;
  onChange: (updatedElement: ParsedSection) => void;
}
```

**요소 타입별 렌더링**:
- `TEXT` → 기본 Input 컴포넌트
- `HTML` → ElementTipTapEditor (리치 텍스트)
- `IMAGE` → ElementImagePicker (alt 텍스트 포함)
- `BACKGROUND` → ElementImagePicker (배경 이미지용)

**주요 기능**:
- 변경사항 시각적 표시 (isDirty)
- 미리보기 표시 (선택사항)
- CSS 선택자 정보 표시

---

### 4. ElementTipTapEditor (HTML 에디터)
**경로**: `/components/static-pages/ElementTipTapEditor.tsx`

HTML 요소 편집을 위한 간소화된 TipTap 에디터입니다.

**Props**:
```typescript
interface ElementTipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  inline?: boolean;
}
```

**툴바 기능**:
- 텍스트 서식: Bold, Italic, Underline
- 링크 삽입/편집
- 목록: Bullet List, Ordered List
- 제목: H1, H2, H3

**특징**:
- 기존 `TipTapEditor`보다 간소화된 인터페이스
- inline 모드 지원
- 자동 HTML 변환

---

### 5. ElementImagePicker (이미지 선택)
**경로**: `/components/static-pages/ElementImagePicker.tsx`

이미지 업로드 및 URL 입력을 지원하는 이미지 선택 컴포넌트입니다.

**Props**:
```typescript
interface ElementImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  alt?: string;
  onAltChange?: (alt: string) => void;
  label?: string;
}
```

**주요 기능**:
- 현재 이미지 미리보기
- 파일 업로드 (POST `/api/admin/upload`)
- URL 직접 입력
- Alt 텍스트 편집 (선택사항)
- 이미지 제거

---

### 6. SaveControls (저장 컨트롤)
**경로**: `/components/static-pages/SaveControls.tsx`

상단 고정 저장/취소 컨트롤 바입니다.

**Props**:
```typescript
interface SaveControlsProps {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved?: Date;
  error?: string;
  onSave: () => void;
  onCancel: () => void;
}
```

**주요 기능**:
- 변경사항 표시 (isDirty)
- 저장 중 로딩 스피너
- 마지막 저장 시간 표시
- 에러 메시지 표시
- 저장/취소 버튼

---

## 설치 및 설정

### 필요한 패키지 (이미 설치됨)
```json
{
  "@tiptap/react": "^2.10.5",
  "@tiptap/starter-kit": "^2.10.5",
  "@tiptap/extension-underline": "^2.10.5",
  "@tiptap/extension-link": "^2.10.5",
  "@tiptap/extension-placeholder": "^2.10.5",
  "lucide-react": "^0.544.0"
}
```

### shadcn/ui 컴포넌트
다음 컴포넌트가 사용됩니다 (이미 설치됨):
- Button
- Card
- Input
- Label
- Alert

---

## 통합 가이드

### 1. Admin 페이지 생성

```tsx
// app/admin/static-pages/[slug]/edit/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { StaticPageEditor } from '@/components/static-pages';
import { useAuth } from '@/hooks/useAuth'; // 인증 훅 (예시)

export default function EditStaticPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { token } = useAuth(); // JWT 토큰 가져오기

  if (!token) {
    return <div>인증이 필요합니다.</div>;
  }

  return (
    <div>
      <StaticPageEditor slug={slug} token={token} />
    </div>
  );
}
```

### 2. API 엔드포인트 확인

다음 API 엔드포인트가 구현되어 있어야 합니다:

- `GET /api/admin/static-pages/[slug]/editable-elements`
  - 응답: `{ success: true, editableElements: ParsedSection[] }`

- `PATCH /api/admin/static-pages/[slug]/elements`
  - 요청: `{ sections: ParsedSection[] }`
  - 응답: `{ success: true, message: string }`

- `POST /api/admin/upload` (이미지 업로드용)
  - 요청: FormData (file)
  - 응답: `{ url: string }`

### 3. 개별 컴포넌트 사용

필요시 개별 컴포넌트를 독립적으로 사용할 수 있습니다:

```tsx
import {
  ElementTipTapEditor,
  ElementImagePicker,
  EditableElement
} from '@/components/static-pages';

// HTML 에디터만 사용
<ElementTipTapEditor
  content="<p>초기 내용</p>"
  onChange={(html) => console.log(html)}
  placeholder="내용 입력..."
/>

// 이미지 피커만 사용
<ElementImagePicker
  value="https://example.com/image.jpg"
  onChange={(url) => console.log(url)}
  alt="설명"
  onAltChange={(alt) => console.log(alt)}
  label="메인 이미지"
/>
```

---

## 타입 정의

모든 타입은 `/lib/static-pages/types.ts`에 정의되어 있습니다:

```typescript
interface ParsedSection {
  id: string;
  type: 'text' | 'image' | 'background' | 'html';
  label: string;
  selector: string;
  content?: string;
  imageUrl?: string;
  alt?: string;
  preview?: string;
}
```

---

## 주요 기능

### 자동 Dirty State 관리
- 변경사항 자동 추적
- 저장되지 않은 변경사항 시각적 표시
- 저장/취소 버튼 자동 활성화/비활성화

### 섹션별 그룹화
- CSS 선택자 기반 자동 그룹화
- 접기/펼치기 지원
- 직관적인 UI

### 에러 처리
- API 요청 실패 처리
- 사용자 친화적 에러 메시지
- 로딩 상태 표시

### 반응형 디자인
- Tailwind CSS 기반
- 모바일 친화적
- shadcn/ui 디자인 시스템

---

## 다음 단계

1. `/api/admin/upload` 엔드포인트 구현 (이미지 업로드)
2. Admin 페이지 라우팅 설정
3. 인증 미들웨어 통합
4. 사용자 권한 검증
5. 실시간 미리보기 기능 (선택사항)

---

## 문제 해결

### TypeScript 오류
- `@/` 경로 별칭이 `tsconfig.json`에 설정되어 있는지 확인
- shadcn/ui 컴포넌트가 설치되어 있는지 확인

### API 연결 오류
- JWT 토큰이 올바르게 전달되는지 확인
- CORS 설정 확인
- API 엔드포인트 경로 확인

### TipTap 에디터 문제
- `'use client'` 지시어 확인
- TipTap 패키지 버전 확인
- 브라우저 콘솔 에러 확인
