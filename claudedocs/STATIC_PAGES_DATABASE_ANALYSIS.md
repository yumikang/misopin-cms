# 정적 페이지 관리 시스템 - 데이터베이스 세부 분석 리포트

**생성일**: 2025-10-16
**분석 대상**: StaticPage, StaticPageVersion 모델
**목적**: 데이터베이스 구조, 데이터 흐름, 문제점 및 개선사항 분석

---

## 📊 1. 데이터베이스 스키마 구조

### 1.1 StaticPage 모델 (주 테이블)

```prisma
model StaticPage {
  id          String              @id @default(cuid())
  slug        String              @unique
  title       String
  filePath    String
  sections    Json
  lastEdited  DateTime            @updatedAt
  createdAt   DateTime            @default(now())

  versions    StaticPageVersion[]

  @@map("static_pages")
}
```

**필드 상세 분석:**

| 필드 | 타입 | 제약조건 | 용도 | 비고 |
|------|------|----------|------|------|
| `id` | String | PK, CUID | 페이지 고유 식별자 | 26자 CUID 형식 |
| `slug` | String | UNIQUE | URL 경로/파일명 | 예: "about.html" |
| `title` | String | NOT NULL | 페이지 제목 | 관리자 화면 표시용 |
| `filePath` | String | NOT NULL | HTML 파일 경로 | 실제 파일 시스템 경로 |
| `sections` | Json | NOT NULL | 편집 가능 섹션 데이터 | ParsedSection[] 배열 |
| `lastEdited` | DateTime | AUTO | 마지막 수정 시간 | @updatedAt 자동 갱신 |
| `createdAt` | DateTime | AUTO | 생성 시간 | @default(now()) |

**섹션 데이터 구조 (Json 필드):**

```typescript
interface ParsedSection {
  id: string;              // 섹션 고유 ID (예: "inc01", "inc02")
  type: 'text' | 'image' | 'background';  // 섹션 타입
  label: string;           // 관리자용 라벨 (예: "병원 소개 - 제목")
  selector: string;        // CSS 셀렉터 (예: "#inc01 h1")
  content?: string;        // 텍스트 내용
  imageUrl?: string;       // 이미지 URL
  alt?: string;            // 이미지 alt 텍스트
  preview?: string;        // 미리보기 텍스트
}
```

---

### 1.2 StaticPageVersion 모델 (버전 관리 테이블)

```prisma
model StaticPageVersion {
  id         String     @id @default(cuid())
  pageId     String
  version    Int
  sections   Json
  changedBy  String
  changeNote String?
  createdAt  DateTime   @default(now())

  page       StaticPage @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@unique([pageId, version])
  @@index([pageId])
  @@map("static_page_versions")
}
```

**필드 상세 분석:**

| 필드 | 타입 | 제약조건 | 용도 | 비고 |
|------|------|----------|------|------|
| `id` | String | PK | 버전 레코드 고유 ID | CUID |
| `pageId` | String | FK, INDEX | 원본 페이지 참조 | StaticPage.id |
| `version` | Int | UNIQUE (with pageId) | 버전 번호 | 1부터 시작, 자동 증가 |
| `sections` | Json | NOT NULL | 해당 버전의 섹션 데이터 | 스냅샷 방식 |
| `changedBy` | String | NOT NULL | 수정자 이름 | 사용자 식별 |
| `changeNote` | String | NULLABLE | 변경 사항 메모 | 선택적 기록 |
| `createdAt` | DateTime | AUTO | 버전 생성 시간 | 불변 |

**관계 및 제약조건:**
- `pageId` + `version`: Composite Unique Key (한 페이지에서 버전 번호는 고유)
- `onDelete: Cascade`: 페이지 삭제 시 모든 버전 자동 삭제
- `@@index([pageId])`: 페이지별 버전 조회 최적화

---

## 🔄 2. 데이터 흐름 및 라이프사이클

### 2.1 페이지 생성 프로세스

```
[HTML 파일] → HTMLParser.parseHTML()
    ↓
[ParsedSection[]] → sectionsToJson()
    ↓
[StaticPage 생성] (DB)
    ↓
[StaticPageVersion v1 생성] (초기 버전)
```

**단계별 상세:**

1. **HTML 파싱**:
   - `HTMLParser.parseHTML(filePath)` 호출
   - `data-editable` 속성 감지
   - 섹션 타입 자동 판별 (text/image/background)
   - CSS 셀렉터 생성

2. **데이터베이스 저장**:
   ```typescript
   const page = await prisma.staticPage.create({
     data: {
       slug,
       title,
       filePath,
       sections: sectionsToJson(parseResult.sections)
     }
   });
   ```

3. **초기 버전 생성**:
   ```typescript
   await prisma.staticPageVersion.create({
     data: {
       pageId: page.id,
       version: 1,
       sections: sectionsToJson(parseResult.sections),
       changedBy: 'system',
       changeNote: '초기 페이지 등록'
     }
   });
   ```

---

### 2.2 페이지 업데이트 프로세스

```
[사용자 수정] → PUT /api/static-pages/[id]
    ↓
[HTMLUpdater.updateHTML()] → HTML 파일 수정 + 백업
    ↓
[StaticPage.sections 업데이트] (DB)
    ↓
[StaticPageVersion 생성] (새 버전 +1)
    ↓
[응답: 성공 + 백업 경로]
```

**단계별 상세:**

1. **HTML 파일 업데이트**:
   - 백업 파일 생성: `{filename}.backup.{timestamp}.html`
   - Cheerio로 HTML 파싱
   - CSS 셀렉터로 요소 찾기
   - 내용 업데이트 (텍스트/이미지/배경)
   - 파일 시스템에 저장

2. **데이터베이스 업데이트**:
   ```typescript
   const latestVersion = page.versions[0]?.version || 0;
   const newVersion = latestVersion + 1;

   await prisma.staticPage.update({
     where: { id },
     data: {
       sections: sectionsToJson(sections),
       lastEdited: new Date()
     }
   });
   ```

3. **버전 생성**:
   ```typescript
   await prisma.staticPageVersion.create({
     data: {
       pageId: id,
       version: newVersion,
       sections: sectionsToJson(sections),
       changedBy: changedBy || 'unknown',
       changeNote: changeNote || '페이지 업데이트'
     }
   });
   ```

---

### 2.3 페이지 재파싱 프로세스

```
[재파싱 요청] → POST /api/static-pages/[id]/reparse
    ↓
[HTML 파일 다시 읽기]
    ↓
[HTMLParser.parseHTML()] → 섹션 재추출
    ↓
[StaticPage.sections 업데이트]
    ↓
[StaticPageVersion 생성] (재파싱 버전)
```

**사용 시나리오:**
- HTML 파일이 외부에서 수정된 경우
- `data-editable` 속성이 추가/변경된 경우
- 섹션 구조가 변경된 경우

---

## 🔗 3. API 엔드포인트 분석

### 3.1 GET /api/static-pages

**목적**: 페이지 목록 조회 또는 특정 페이지 조회

**파라미터:**
- `?slug={slug}`: 특정 페이지 조회 (선택)

**응답:**

```typescript
// 목록 조회
{
  success: true,
  pages: [
    {
      id: "...",
      slug: "about.html",
      title: "병원 소개",
      filePath: "/path/to/about.html",
      lastEdited: "2025-10-16T...",
      createdAt: "2025-10-14T..."
    }
  ]
}

// 특정 페이지 조회
{
  success: true,
  page: {
    id: "...",
    slug: "about.html",
    title: "병원 소개",
    filePath: "/path/to/about.html",
    sections: [...],
    lastEdited: "...",
    createdAt: "...",
    versions: [...]  // 최근 10개
  }
}
```

---

### 3.2 POST /api/static-pages

**목적**: 새 정적 페이지 등록

**요청 본문:**

```typescript
{
  slug: "about.html",
  title: "병원 소개",
  filePath: "/var/www/misopin.com/about.html"
}
```

**처리 과정:**
1. HTML 파일 파싱
2. 섹션 추출
3. StaticPage 생성
4. 초기 버전 (v1) 생성

**응답:**

```typescript
{
  success: true,
  page: {...},
  sectionsCount: 12
}
```

**에러 처리:**
- 400: 필수 필드 누락
- 400: HTML 파싱 실패
- 409: slug 중복

---

### 3.3 PUT /api/static-pages/[id]

**목적**: 페이지 내용 업데이트

**요청 본문:**

```typescript
{
  sections: [
    {
      id: "inc01",
      type: "text",
      selector: "#inc01 h1",
      content: "수정된 텍스트",
      ...
    }
  ],
  changedBy: "admin@example.com",
  changeNote: "제목 수정"
}
```

**처리 과정:**
1. 페이지 존재 확인
2. HTML 파일 백업
3. HTML 파일 업데이트
4. StaticPage.sections 업데이트
5. 새 버전 생성

**응답:**

```typescript
{
  success: true,
  page: {...},
  version: 2,
  backupPath: "/backups/about.html.backup.1697452800000.html",
  message: "페이지가 성공적으로 업데이트되었습니다."
}
```

---

### 3.4 DELETE /api/static-pages/[id]

**목적**: 페이지 삭제

**처리 과정:**
1. 페이지 존재 확인
2. CASCADE로 모든 버전 자동 삭제
3. StaticPage 삭제

**주의사항:**
- **HTML 파일은 삭제되지 않음** (데이터베이스 레코드만 삭제)
- 복구 불가능 (버전 포함 모두 삭제)

---

### 3.5 POST /api/static-pages/[id]/reparse

**목적**: HTML 파일 재파싱

**처리 과정:**
1. 현재 filePath로 HTML 파일 읽기
2. HTMLParser로 섹션 재추출
3. StaticPage.sections 업데이트
4. 새 버전 생성

**응답:**

```typescript
{
  success: true,
  page: {...},
  sectionsCount: 15,
  version: 3,
  message: "페이지가 재파싱되었습니다."
}
```

---

## 📈 4. 주요 기능 및 사용 패턴

### 4.1 버전 관리 시스템

**특징:**
- ✅ 스냅샷 방식: 각 버전은 완전한 섹션 데이터 보유
- ✅ 자동 버전 증가: 업데이트 시 자동으로 +1
- ✅ 버전별 메타데이터: changedBy, changeNote, createdAt
- ✅ 최근 10개 버전 조회: 성능 최적화

**버전 관리 흐름:**

```
v1 (초기)  →  v2 (텍스트 수정)  →  v3 (이미지 변경)  →  v4 (재파싱)
   ↓              ↓                  ↓                  ↓
sections[]     sections[]         sections[]         sections[]
(스냅샷)       (스냅샷)           (스냅샷)           (스냅샷)
```

**장점:**
- 버전 간 독립성 보장
- 롤백 가능 (이론적으로)
- 변경 이력 추적

**단점:**
- 저장 공간 증가 (중복 데이터)
- 버전 간 diff 미제공

---

### 4.2 HTML 파싱 시스템

**파싱 대상:**

```html
<!-- 텍스트 섹션 -->
<div id="inc01" data-editable="text">
  <h1>병원 소개</h1>
  <p>미소핀의원은...</p>
</div>

<!-- 이미지 섹션 -->
<img
  id="banner01"
  data-editable="image"
  src="/images/banner.jpg"
  alt="배너 이미지"
>

<!-- 배경 이미지 섹션 -->
<section
  id="hero"
  data-editable="background"
  style="background-image: url(/images/hero.jpg)"
>
</section>
```

**파싱 결과:**

```typescript
[
  {
    id: "inc01",
    type: "text",
    label: "병원 소개 - 텍스트",
    selector: "#inc01",
    content: "<h1>병원 소개</h1><p>미소핀의원은...</p>",
    preview: "병원 소개 미소핀의원은..."
  },
  {
    id: "banner01",
    type: "image",
    label: "배너 - 이미지",
    selector: "#banner01",
    imageUrl: "/images/banner.jpg",
    alt: "배너 이미지"
  },
  {
    id: "hero",
    type: "background",
    label: "히어로 - 배경",
    selector: "#hero",
    imageUrl: "/images/hero.jpg"
  }
]
```

---

### 4.3 파일 시스템 통합

**백업 전략:**

```
원본: /var/www/misopin.com/about.html
백업: /var/www/misopin.com/backups/about.html.backup.1697452800000.html
```

**백업 생성 시점:**
- 페이지 업데이트 직전
- 타임스탬프 기반 파일명
- 원본 파일 덮어쓰기 전 안전장치

**파일 시스템 구조:**

```
/var/www/misopin.com/
├── index.html
├── about.html
├── contact.html
└── backups/
    ├── about.html.backup.1697452800000.html
    ├── about.html.backup.1697452801000.html
    └── contact.html.backup.1697452802000.html
```

---

## ⚠️ 5. 문제점 및 개선사항

### 5.1 데이터 무결성 문제

#### 🔴 문제 1: HTML 파일과 DB 동기화

**현재 상황:**
- DB에 섹션 데이터 저장
- HTML 파일에도 실제 내용 저장
- **두 곳이 불일치할 수 있음**

**문제 시나리오:**
1. HTML 파일이 외부에서 직접 수정됨
2. DB는 이전 데이터 보유
3. 관리자 화면에서는 이전 내용 표시
4. 실제 웹사이트는 새 내용 표시

**개선 방안:**
```typescript
// 정기적 동기화 체크
async function syncCheck() {
  const pages = await prisma.staticPage.findMany();

  for (const page of pages) {
    const fileContent = await fs.readFile(page.filePath, 'utf-8');
    const parsedSections = await htmlParser.parseHTML(page.filePath);

    // DB와 파일 비교
    const isDifferent = JSON.stringify(page.sections) !==
                        JSON.stringify(parsedSections.sections);

    if (isDifferent) {
      console.warn(`불일치 감지: ${page.slug}`);
      // 자동 재파싱 또는 알림
    }
  }
}
```

---

#### 🔴 문제 2: 버전 롤백 기능 부재

**현재 상황:**
- 버전 데이터는 저장됨
- 롤백 API 없음
- 이전 버전 복구 불가능

**개선 방안:**

```typescript
// POST /api/static-pages/[id]/rollback
export async function POST(request, { params }) {
  const { version } = await request.json();

  // 1. 해당 버전 조회
  const targetVersion = await prisma.staticPageVersion.findUnique({
    where: { pageId_version: { pageId: params.id, version } }
  });

  // 2. HTML 파일 업데이트
  await htmlUpdater.updateHTML(
    page.filePath,
    parseSectionsFromJson(targetVersion.sections)
  );

  // 3. StaticPage 업데이트 + 새 버전 생성
  // ...
}
```

---

#### 🟡 문제 3: changedBy가 String 타입

**현재 상황:**
- `changedBy: String` (자유 텍스트)
- User 모델과 연결되지 않음
- 사용자 추적 불가능

**개선 방안:**

```prisma
model StaticPageVersion {
  // 현재
  changedBy  String

  // 개선안
  changedById String?
  changedBy   User?   @relation(fields: [changedById], references: [id])

  @@index([changedById])
}
```

**장점:**
- 사용자별 수정 이력 조회
- 사용자 권한 연동
- 감사 로그 강화

---

### 5.2 성능 문제

#### 🟡 문제 4: sections Json 필드 크기

**현재 상황:**
- 섹션 데이터가 Json 필드에 저장
- 섹션이 많을수록 크기 증가
- PostgreSQL Json 필드 성능 이슈 가능

**예상 크기:**
```typescript
// 섹션 1개 평균 크기: ~500 bytes
// 섹션 20개 페이지: ~10KB
// 버전 10개: ~100KB
// 페이지 100개: ~10MB (관리 가능)
```

**개선 방안:**
- 현재는 문제 없음
- 섹션 수가 50개 이상이면 정규화 고려
- JSONB 인덱싱 활용 (PostgreSQL)

---

#### 🟡 문제 5: 버전 무제한 증가

**현재 상황:**
- 버전이 무제한 증가
- 조회는 최근 10개로 제한
- 오래된 버전 자동 삭제 없음

**개선 방안:**

```typescript
// 주기적 정리 (30일 이상 된 버전 삭제, 최근 10개는 유지)
async function cleanOldVersions() {
  const pages = await prisma.staticPage.findMany({
    include: {
      versions: {
        orderBy: { version: 'desc' }
      }
    }
  });

  for (const page of pages) {
    const versionsToKeep = page.versions.slice(0, 10);
    const versionsToDelete = page.versions.slice(10).filter(v =>
      v.createdAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    await prisma.staticPageVersion.deleteMany({
      where: {
        id: { in: versionsToDelete.map(v => v.id) }
      }
    });
  }
}
```

---

### 5.3 기능 부재

#### 🟢 문제 6: isPublished 필드 미사용

**현재 상황:**
- 스키마에 `isPublished` 필드 있음
- API나 로직에서 사용 안 함
- 게시/비게시 기능 없음

**개선 방안:**

```typescript
// 게시 상태 관리 API 추가
// PATCH /api/static-pages/[id]/publish
export async function PATCH(request, { params }) {
  const { isPublished } = await request.json();

  await prisma.staticPage.update({
    where: { id: params.id },
    data: { isPublished }
  });

  // isPublished가 false면 HTML 파일 숨기기 또는 접근 제한
}
```

---

#### 🟢 문제 7: 버전 비교 (Diff) 기능 부재

**현재 상황:**
- 버전별 전체 스냅샷만 저장
- 버전 간 차이 비교 불가
- 무엇이 변경되었는지 알 수 없음

**개선 방안:**

```typescript
// GET /api/static-pages/[id]/versions/[v1]/diff/[v2]
export async function GET(request, { params }) {
  const v1 = await prisma.staticPageVersion.findUnique(...);
  const v2 = await prisma.staticPageVersion.findUnique(...);

  const diff = calculateDiff(
    parseSectionsFromJson(v1.sections),
    parseSectionsFromJson(v2.sections)
  );

  return NextResponse.json({ diff });
}

function calculateDiff(sections1, sections2) {
  const changes = [];

  sections1.forEach(s1 => {
    const s2 = sections2.find(s => s.id === s1.id);
    if (!s2) {
      changes.push({ type: 'deleted', section: s1 });
    } else if (JSON.stringify(s1) !== JSON.stringify(s2)) {
      changes.push({ type: 'modified', before: s1, after: s2 });
    }
  });

  sections2.forEach(s2 => {
    if (!sections1.find(s => s.id === s2.id)) {
      changes.push({ type: 'added', section: s2 });
    }
  });

  return changes;
}
```

---

### 5.4 보안 문제

#### 🔴 문제 8: 파일 경로 검증 부족

**현재 상황:**
- `filePath`를 사용자 입력으로 받음
- 경로 탐색 공격 (Path Traversal) 가능성
- 예: `../../../etc/passwd`

**개선 방안:**

```typescript
import path from 'path';

function validateFilePath(filePath: string): boolean {
  // 절대 경로 정규화
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(STATIC_SITE_PATH, filePath);

  // STATIC_SITE_PATH 밖으로 나가는지 확인
  if (!resolved.startsWith(STATIC_SITE_PATH)) {
    throw new Error('잘못된 파일 경로: 허용된 디렉토리 외부');
  }

  // 파일 확장자 확인
  if (!resolved.endsWith('.html')) {
    throw new Error('HTML 파일만 허용됩니다.');
  }

  return true;
}
```

---

#### 🟡 문제 9: 권한 확인 부재

**현재 상황:**
- API에 인증/권한 확인 없음
- 누구나 페이지 수정 가능
- 프로덕션 환경에서 위험

**개선 방안:**

```typescript
import { getServerSession } from 'next-auth';

export async function PUT(request, { params }) {
  // 세션 확인
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  // 권한 확인
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  // 업데이트 로직...
}
```

---

## 📝 6. 데이터 무결성 체크리스트

### 6.1 제약조건 검증

| 제약조건 | 상태 | 비고 |
|---------|------|------|
| ✅ `StaticPage.slug` UNIQUE | 정상 | DB 레벨 강제 |
| ✅ `StaticPageVersion.pageId + version` UNIQUE | 정상 | Composite key |
| ✅ CASCADE 삭제 | 정상 | 페이지 삭제 시 버전 자동 삭제 |
| ⚠️ `sections` Json 유효성 | 미검증 | 런타임에만 확인 |
| ❌ `filePath` 유효성 | 없음 | Path traversal 위험 |

---

### 6.2 외래 키 관계

```
StaticPage (1) ←→ (N) StaticPageVersion
    ↓
onDelete: Cascade
```

**검증 사항:**
- ✅ 버전은 항상 유효한 pageId 참조
- ✅ 페이지 삭제 시 모든 버전 자동 삭제
- ⚠️ 고아 버전 가능성 없음 (CASCADE 덕분)

---

### 6.3 데이터 일관성

**확인 필요 항목:**

```sql
-- 1. 버전 없는 페이지 (비정상)
SELECT * FROM static_pages sp
LEFT JOIN static_page_versions spv ON sp.id = spv."pageId"
WHERE spv.id IS NULL;

-- 2. 버전 번호 불연속 (정상 가능)
SELECT "pageId", version
FROM static_page_versions
ORDER BY "pageId", version;

-- 3. sections Json 유효성 (애플리케이션에서 확인)
-- ParsedSection[] 타입과 일치하는지 검증
```

---

## 🎯 7. 권장 개선 로드맵

### Phase 1: 즉시 (보안 및 안정성)

1. ✅ **파일 경로 검증 추가**
   - Path traversal 방지
   - 확장자 화이트리스트

2. ✅ **인증/권한 추가**
   - NextAuth 세션 확인
   - ADMIN 권한 필수

3. ✅ **에러 처리 강화**
   - 파일 시스템 오류 처리
   - DB 트랜잭션 추가

---

### Phase 2: 단기 (1-2주)

4. ⚡ **버전 롤백 API**
   - POST `/api/static-pages/[id]/rollback`
   - 이전 버전 복구 기능

5. ⚡ **동기화 체크**
   - HTML 파일 ↔ DB 일관성 확인
   - 자동 재파싱 옵션

6. ⚡ **버전 정리**
   - 30일 이상 된 버전 자동 삭제
   - 최근 10개는 항상 유지

---

### Phase 3: 중기 (1-2개월)

7. 📊 **버전 비교 (Diff)**
   - 버전 간 차이 시각화
   - 변경 이력 추적

8. 📊 **isPublished 기능 활성화**
   - 게시/비게시 상태 관리
   - 비게시 페이지 접근 제한

9. 📊 **changedBy User 연동**
   - User 모델과 FK 설정
   - 사용자별 수정 이력

---

### Phase 4: 장기 (3개월+)

10. 🚀 **감사 로그 시스템**
    - 모든 변경 사항 로깅
    - 누가, 언제, 무엇을 변경했는지

11. 🚀 **미리보기 모드**
    - 저장 전 변경 사항 미리보기
    - 임시 저장 기능

12. 🚀 **A/B 테스팅**
    - 버전별 트래픽 분산
    - 성과 측정

---

## 📊 8. 요약 및 결론

### 8.1 강점

✅ **명확한 구조**: 페이지-버전 분리로 관리 용이
✅ **버전 관리**: 모든 변경 이력 추적 가능
✅ **백업 시스템**: 파일 수정 전 자동 백업
✅ **CASCADE 삭제**: 데이터 정리 자동화

---

### 8.2 약점

❌ **동기화 문제**: HTML 파일 ↔ DB 불일치 가능
❌ **보안 취약**: 경로 검증, 권한 확인 부족
❌ **기능 부재**: 롤백, Diff, isPublished 미구현
❌ **User 연동 없음**: changedBy가 단순 문자열

---

### 8.3 우선순위 개선 사항

#### 🔴 긴급 (즉시)
1. 파일 경로 검증
2. 인증/권한 추가
3. 에러 처리 강화

#### 🟡 중요 (1-2주)
4. 버전 롤백 API
5. 동기화 체크
6. 버전 정리 자동화

#### 🟢 향후 (1개월+)
7. 버전 비교 (Diff)
8. isPublished 활성화
9. User 모델 연동

---

### 8.4 현재 상태 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 데이터 모델링 | 8/10 | 명확하고 확장 가능 |
| 기능 완성도 | 6/10 | 핵심 기능은 있으나 부가 기능 부족 |
| 보안 | 4/10 | 인증/권한 없음, 경로 검증 부족 |
| 성능 | 7/10 | 현재는 문제 없으나 스케일 고려 필요 |
| 유지보수성 | 7/10 | 코드 구조 양호, 문서화 개선 필요 |

**종합 평가**: **6.4/10**
"프로토타입으로는 훌륭하나, 프로덕션에는 보안 강화 필수"

---

## 📚 9. 참고 자료

### 9.1 관련 파일

- `prisma/schema.prisma`: 데이터베이스 스키마
- `app/api/static-pages/route.ts`: 목록/생성 API
- `app/api/static-pages/[id]/route.ts`: 조회/수정/삭제 API
- `app/api/static-pages/[id]/reparse/route.ts`: 재파싱 API
- `lib/static-pages/html-parser.ts`: HTML 파싱 로직
- `lib/static-pages/html-updater.ts`: HTML 업데이트 로직
- `lib/static-pages/types.ts`: 타입 정의

---

### 9.2 외부 참조

- [Prisma Docs - Json Fields](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#json-fields)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Cheerio Documentation](https://cheerio.js.org/)

---

**보고서 작성**: Claude (Assistant)
**검토 필요 사항**: 보안 취약점, 동기화 문제
**다음 단계**: Phase 1 보안 개선 우선 구현
