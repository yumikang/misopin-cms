# 웹빌더 빌드 오류 해결 개발문서

## 프로젝트 개요
- **프로젝트**: blee-app 웹빌더 시스템
- **Next.js 버전**: 15.5.3
- **React 버전**: 19
- **TypeScript**: strict 모드
- **작업일자**: 2025년 9월 19일

## 해결된 빌드 오류 목록

### 1. JSX 구문 오류 (Critical)
**문제**: `hooks/usePermissions.ts` 파일에서 JSX 컴포넌트 사용 시 타입 오류 발생
```
Expected '>', got 'className' at line 107
```

**원인**: TypeScript 파일(.ts)에서 JSX 구문 사용

**해결방법**:
- 파일명 변경: `hooks/usePermissions.ts` → `hooks/usePermissions.tsx`
- 파일 상단에 `'use client'` 지시어 추가
- React import 문 추가

**수정된 코드**:
```typescript
'use client';

import { useState, useEffect } from 'react';
// ... 기존 코드
```

### 2. 웹빌더 컴포넌트 경로 불일치 (Critical)
**문제**: 컴포넌트 import 경로와 실제 파일 위치 불일치
```
Can't resolve '@/components/webbuilder/BlockEditor'
```

**원인**:
- 실제 위치: `app/components/webbuilder/`
- 예상 위치: `components/webbuilder/`

**해결방법**:
- 루트 레벨에 `components/webbuilder/` 디렉토리 생성
- 모든 웹빌더 컴포넌트를 새 위치로 이동
- tsconfig.json의 path mapping 활용 (`"@/*": ["./*"]`)

**이동된 컴포넌트 파일들**:
- BlockEditor.tsx
- TemplateGallery.tsx
- PreviewFrame.tsx
- FormBlockEditor.tsx
- GridBlockEditor.tsx
- ImageUploader.tsx
- MapBlockEditor.tsx
- TemplateCard.tsx
- TemplatePreview.tsx
- TipTapEditor.tsx

### 3. useAutoSave 커스텀 훅 누락 (Critical)
**문제**: 웹빌더 페이지에서 사용하는 useAutoSave 훅이 존재하지 않음

**해결방법**: 완전한 자동저장 시스템 구현

**구현된 기능**:
```typescript
// hooks/useAutoSave.tsx
export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveOptions {
  interval?: number;        // 자동저장 주기 (기본 30초)
  debounceDelay?: number;   // 디바운스 지연 (기본 2초)
  enabled?: boolean;        // 자동저장 활성화 여부
  onSave?: () => Promise<void> | void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAutoSave<T>(data: T, options: UseAutoSaveOptions): AutoSaveStatus
export function AutoSaveIndicator({ status }: { status: AutoSaveStatus })
```

**핵심 기능**:
- 데이터 변경 감지 (JSON 기반 깊은 비교)
- Debounce 기능 (2초 지연)
- 주기적 자동저장 (30초 간격)
- 5가지 상태 관리 (idle, pending, saving, saved, error)
- 메모리 누수 방지 (타이머 정리)
- 시각적 상태 표시 (Tailwind CSS)

### 4. TypeScript Strict 모드 오류 (Warning → Fixed)
**문제**: `any` 타입 사용으로 인한 타입 안전성 문제

**해결방법**:
1. **타입 정의 강화**:
```typescript
// app/types/webbuilder.ts
export interface BlockTemplateData {
  // ... 기존 속성들
  creator?: { name: string };  // 추가된 속성
}
```

2. **안전한 타입 가드 적용**:
```typescript
// Before
{(template as any).creator?.name || '익명'}

// After
{template.creator?.name || '익명'}

// Before
const where: any = {};

// After
const where: Record<string, unknown> = {};
```

3. **복합 타입 안전 접근**:
```typescript
// Before
(templateData.content as any).text

// After
'text' in templateData.content ? templateData.content.text : '기본값'
```

### 5. 의존성 누락 해결
**문제**: `@radix-ui/react-scroll-area` 패키지 누락
```bash
npm install @radix-ui/react-scroll-area
```

## 기술 스택 호환성 확인

### Next.js 15.5.3 호환성
- ✅ App Router 패턴 사용
- ✅ 'use client' 지시어 활용
- ✅ 서버 컴포넌트와 클라이언트 컴포넌트 분리
- ✅ 최신 빌드 시스템 (Turbopack) 지원

### React 19 호환성
- ✅ 최신 Hook 패턴 사용
- ✅ useCallback, useEffect, useState 최적화
- ✅ 메모리 누수 방지 패턴 적용

### TypeScript Strict 모드
- ✅ 모든 `any` 타입 제거
- ✅ 타입 안전성 확보
- ✅ 인터페이스 정의 완성

## 성능 최적화 적용사항

### 1. React Hook 최적화
```typescript
// useCallback으로 불필요한 리렌더링 방지
const debouncedSave = useCallback(() => {
  // 디바운스 로직
}, [hasDataChanged, performSave, debounceDelay]);
```

### 2. 메모리 관리
```typescript
// useRef로 타이머 관리
const debounceTimer = useRef<NodeJS.Timeout | null>(null);

// cleanup 함수로 메모리 누수 방지
useEffect(() => {
  return () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  };
}, []);
```

### 3. 타입 가드를 통한 런타임 안전성
```typescript
// 타입 체크를 통한 안전한 속성 접근
if ('text' in templateData.content) {
  return templateData.content.text;
}
```

## 빌드 결과

### 최종 빌드 상태
```bash
✓ Compiled successfully in 3.3s
```

### 해결된 오류들
- ❌ JSX syntax error → ✅ 해결
- ❌ Module resolution error → ✅ 해결
- ❌ Missing useAutoSave hook → ✅ 해결
- ❌ TypeScript any types → ✅ 해결
- ❌ Missing dependencies → ✅ 해결

### 개발 서버 확인
- ✅ 포트 3002에서 정상 시작
- ✅ 웹빌더 페이지 로딩 준비 완료
- ✅ 자동저장 기능 구현 완료

## 향후 개선사항

### 1. ESLint 경고 정리
- unused variables 정리
- missing dependencies 최적화
- img 태그를 Next.js Image 컴포넌트로 교체

### 2. 추가 기능 구현
- 웹빌더 컴포넌트 최적화
- 권한 시스템 강화
- 성능 모니터링 추가

### 3. 테스트 커버리지 확장
- 자동저장 기능 테스트
- 권한 시스템 테스트
- E2E 테스트 추가

## 개발 팀 가이드라인

### 1. 타입 안전성 유지
- `any` 타입 사용 금지
- 타입 가드 패턴 적극 활용
- 인터페이스 정의를 통한 타입 명시

### 2. React Hook 베스트 프랙티스
- useCallback/useMemo로 성능 최적화
- useEffect cleanup 함수 필수 구현
- 메모리 누수 방지 패턴 적용

### 3. 컴포넌트 구조 가이드라인
- 'use client' 지시어 적절한 위치에 사용
- 서버/클라이언트 컴포넌트 명확한 분리
- TypeScript strict 모드 준수

---

**작업 완료일**: 2025년 9월 19일
**담당자**: MCP 서버 활용 시스템적 해결
**검토자**: 빌드 시스템 자동 검증 완료