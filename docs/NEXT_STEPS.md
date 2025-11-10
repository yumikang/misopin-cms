# 다음 단계 가이드

## 현재 상황 요약

### ✅ 완료된 작업
- 20개 정적 페이지 모두 로컬에 준비 완료
- 6개 파비콘 파일 생성 완료
- 데이터베이스 페이지 등록 완료
- HTML 파일 파비콘 업데이트 완료
- Git 커밋 완료 (7ad0ef4)

### ⏳ 대기 중
- 서버 SSH 접속 불가로 배포 대기 중
- 파일은 모두 준비되어 있고 배포만 남음

---

## 즉시 해야 할 일

### 1단계: 서버 접속 복구 (최우선)

**방법 A: SSH 복구**
```bash
# 호스팅 업체 또는 서버 관리자에게 문의:
1. SSH 서비스 상태 확인
2. SSH 포트 22 활성화
3. 방화벽 설정 확인
```

**방법 B: 대안 업로드 방법**
1. **웹 호스팅 제어판 사용**
   - cPanel/Plesk 등 파일 관리자
   - 파일 직접 업로드

2. **FTP/SFTP 클라이언트**
   - FileZilla 다운로드: https://filezilla-project.org/
   - FTP 계정 정보 필요
   - 호스팅 업체에서 제공

3. **서버 콘솔 직접 접속**
   - 호스팅 업체 콘솔/터미널 사용
   - SSH 서비스 재시작: `sudo systemctl restart sshd`

### 2단계: 파일 서버 업로드

**SSH 접속 시**:
```bash
# HTML 파일 (20개)
rsync -avz /Users/blee/Desktop/cms/misopin-cms/public/static-pages/*.html \
  blee@141.164.60.51:/var/www/misopin-cms/.next/standalone/public/static-pages/

# 파비콘 파일 (6개)
rsync -avz /Users/blee/Desktop/cms/Misopin-renew/favicon*.{ico,png} \
  /Users/blee/Desktop/cms/Misopin-renew/android-chrome*.png \
  /Users/blee/Desktop/cms/Misopin-renew/apple-touch-icon.png \
  blee@141.164.60.51:/var/www/misopin.com/
```

**FTP 클라이언트 사용 시**:
1. FileZilla 실행
2. 서버 연결 (141.164.60.51, FTP 계정)
3. 로컬 파일 선택 후 드래그 & 드롭:
   - `public/static-pages/*.html` → `/var/www/misopin-cms/.next/standalone/public/static-pages/`
   - `Misopin-renew/favicon*` → `/var/www/misopin.com/`

### 3단계: 배포 후 검증

**웹 브라우저 테스트**:
```
http://141.164.60.51/about.html
http://141.164.60.51/board-page.html
http://141.164.60.51/calendar-page.html
http://141.164.60.51/privacy.html
http://141.164.60.51/stipulation.html
http://141.164.60.51/fee-schedule.html
http://141.164.60.51/quickmenu.html
```

**파비콘 확인**:
```
http://141.164.60.51/favicon.ico
http://141.164.60.51/apple-touch-icon.png
```

**터미널 테스트**:
```bash
# 페이지 접근 확인 (200 OK 응답 확인)
curl -I http://141.164.60.51/about.html
curl -I http://141.164.60.51/privacy.html

# 파비콘 확인
curl -I http://141.164.60.51/favicon.ico

# 모든 페이지 일괄 확인
for page in about board-page calendar-page privacy stipulation fee-schedule quickmenu; do
  echo "Testing $page.html:"
  curl -s -o /dev/null -w "%{http_code}\n" http://141.164.60.51/$page.html
done
```

**체크리스트**:
- [ ] 7개 신규 페이지 모두 접속 가능 (404 에러 없음)
- [ ] 파비콘 정상 표시 (브라우저 탭에서 확인)
- [ ] quickmenu.html은 파비콘 없음 (정상)
- [ ] 모바일 반응형 정상 작동
- [ ] 브라우저 캐시 삭제 후 재확인

---

## 단기 개선 작업 (1-2주)

### 1. CMS 편집 기능 검증

**각 페이지 편집 테스트**:
```bash
# 로컬 개발 서버 실행
cd /Users/blee/Desktop/cms/misopin-cms
npm run dev

# 브라우저에서 접속
http://localhost:3000/admin/static-pages/about/edit
http://localhost:3000/admin/static-pages/privacy/edit
```

**테스트 항목**:
- [ ] 페이지 로드 정상
- [ ] 섹션 파싱 작동
- [ ] 편집 후 저장 성공
- [ ] HTML 파일 업데이트 확인
- [ ] 락 시스템 정상 작동

### 2. 데이터베이스 최적화

**인덱스 추가 검토**:
```sql
-- 자주 조회되는 컬럼에 인덱스 추가
CREATE INDEX idx_static_pages_slug ON static_pages(slug);
CREATE INDEX idx_static_pages_ispublished ON static_pages(isPublished);
CREATE INDEX idx_static_pages_lastedited ON static_pages(lastEdited);
```

**쿼리 성능 확인**:
```sql
-- 느린 쿼리 찾기
EXPLAIN ANALYZE SELECT * FROM static_pages WHERE slug = 'about';

-- 페이지 로드 시간 체크
SELECT slug, title,
       EXTRACT(EPOCH FROM (lastEdited - createdAt)) as age_seconds
FROM static_pages
ORDER BY lastEdited DESC;
```

### 3. 모니터링 및 로깅 설정

**에러 로깅**:
```typescript
// lib/static-pages/error-logger.ts 생성
export function logStaticPageError(
  operation: string,
  pageSlug: string,
  error: Error
) {
  console.error(`[StaticPages] ${operation} failed for ${pageSlug}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // TODO: 외부 로깅 서비스 연동 (Sentry, LogRocket 등)
}
```

**성능 모니터링**:
```typescript
// 페이지 로드 시간 추적
export function trackPageLoadTime(slug: string, startTime: number) {
  const duration = Date.now() - startTime;
  console.log(`[Performance] ${slug} loaded in ${duration}ms`);

  // TODO: 분석 도구 연동 (Google Analytics, Mixpanel 등)
}
```

### 4. 백업 자동화

**일일 백업 스크립트**:
```bash
#!/bin/bash
# scripts/backup-static-pages.sh

BACKUP_DIR="/var/backups/misopin-cms"
DATE=$(date +%Y%m%d_%H%M%S)

# HTML 파일 백업
tar -czf "$BACKUP_DIR/static-pages-$DATE.tar.gz" \
  /var/www/misopin-cms/.next/standalone/public/static-pages/

# 데이터베이스 백업
pg_dump -U postgres misopin_cms \
  --table=static_pages \
  --file="$BACKUP_DIR/static-pages-db-$DATE.sql"

# 7일 이상 된 백업 삭제
find "$BACKUP_DIR" -name "static-pages-*" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**cron 설정**:
```bash
# 매일 새벽 3시 백업 실행
0 3 * * * /path/to/backup-static-pages.sh
```

---

## 중기 개선 작업 (1-3개월)

### 1. WYSIWYG 에디터 고도화

**현재**: 텍스트 영역만 편집 가능

**개선안**:
- 이미지 업로드 및 관리
- 비디오 임베드
- 테이블 편집
- 색상/폰트 커스터마이징
- 마크다운 지원

**기술 스택 검토**:
- TipTap (현재 사용 중, 확장 가능)
- Slate.js (고급 커스터마이징)
- ProseMirror (TipTap 기반)

### 2. 버전 관리 시스템

**페이지 히스토리 추적**:
```prisma
model StaticPageVersion {
  id          String   @id @default(uuid())
  pageId      String
  version     Int
  content     String   // HTML 전체 내용
  changedBy   String?
  changedAt   DateTime @default(now())
  changeNote  String?  // 변경 사유

  page        StaticPages @relation(fields: [pageId], references: [id])

  @@index([pageId, version])
  @@map("static_page_versions")
}
```

**기능**:
- 모든 수정 기록 저장
- 이전 버전으로 복원
- 변경 사항 비교 (diff)
- 승인 워크플로우

### 3. 멀티 언어 지원

**구조 설계**:
```typescript
// 언어별 페이지 관리
interface MultiLanguagePage {
  baseSlug: string;           // 'about'
  languages: {
    ko: string;               // 'about.html'
    en: string;               // 'about-en.html'
    ja?: string;              // 'about-ja.html'
  };
  defaultLanguage: 'ko';
}
```

**URL 구조**:
```
/about.html         (한국어 기본)
/en/about.html      (영어)
/ja/about.html      (일본어)
```

### 4. SEO 최적화

**메타 태그 관리**:
```typescript
interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  robots?: 'index,follow' | 'noindex,nofollow';
}
```

**sitemap.xml 자동 생성**:
```typescript
// scripts/generate-sitemap.ts
export async function generateSitemap() {
  const pages = await prisma.static_pages.findMany({
    where: { isPublished: true },
    select: { slug: true, lastEdited: true },
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(page => `
  <url>
    <loc>https://misopin.com/${page.slug}.html</loc>
    <lastmod>${page.lastEdited.toISOString()}</lastmod>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

  fs.writeFileSync('public/sitemap.xml', sitemap);
}
```

### 5. 성능 최적화

**이미지 최적화**:
- WebP 변환
- 지연 로딩 (lazy loading)
- 반응형 이미지 (srcset)

**CSS/JS 최적화**:
- Critical CSS 인라인
- 사용하지 않는 CSS 제거
- JavaScript 번들 최소화

**캐싱 전략**:
```nginx
# Caddy 설정
header Cache-Control "public, max-age=31536000, immutable" {
  path *.css *.js *.png *.jpg *.webp
}

header Cache-Control "public, max-age=3600" {
  path *.html
}
```

---

## 장기 전략 (3-6개월)

### 1. 헤드리스 CMS로 전환 검토

**현재 구조**:
- HTML 파일 직접 편집
- 파일 시스템 기반

**헤드리스 CMS 구조**:
- 콘텐츠와 프레젠테이션 분리
- API 기반 콘텐츠 제공
- 다중 플랫폼 지원 (웹, 앱, 키오스크)

**추천 솔루션**:
- Strapi (오픈소스, 자체 호스팅)
- Contentful (클라우드, 유료)
- Sanity (실시간 협업)

### 2. AI 기반 콘텐츠 어시스턴트

**기능 아이디어**:
- SEO 추천 (제목, 메타 설명)
- 맞춤법/문법 검사
- 콘텐츠 요약 생성
- 이미지 alt 텍스트 자동 생성
- 다국어 번역 제안

### 3. A/B 테스팅 플랫폼

**사용 사례**:
- 헤드라인 변형 테스트
- CTA 버튼 위치/색상
- 페이지 레이아웃 변형
- 이미지 vs 비디오 효과

### 4. 개인화 엔진

**사용자 맞춤 콘텐츠**:
- 방문 이력 기반 추천
- 지역별 콘텐츠 변형
- 재방문자 vs 신규 방문자
- 시간대별 콘텐츠 변경

---

## 우선순위 매트릭스

### 🔴 긴급 & 중요 (지금 당장)
1. 서버 SSH 복구 및 파일 배포
2. 배포 후 검증 (404 에러 해결 확인)
3. 백업 설정

### 🟠 중요하지만 긴급하지 않음 (1-2주 내)
1. CMS 편집 기능 전체 테스트
2. 데이터베이스 인덱스 최적화
3. 에러 로깅 시스템 구축

### 🟡 긴급하지만 덜 중요함 (1개월 내)
1. 페이지 버전 관리 시스템
2. SEO 메타 태그 관리
3. 성능 모니터링 대시보드

### 🟢 장기 계획 (3-6개월)
1. 헤드리스 CMS 전환 검토
2. 멀티 언어 지원
3. AI 콘텐츠 어시스턴트

---

## 지원 연락처

### 서버 관련
- **호스팅 업체**: [업체명 확인 필요]
- **서버 IP**: 141.164.60.51
- **SSH 포트**: 22 (현재 차단됨)

### 기술 스택
- **웹서버**: Caddy v2.10.2
- **프레임워크**: Next.js 15.5.3
- **데이터베이스**: PostgreSQL (Prisma ORM)
- **배포**: Standalone mode

### 문서
- `docs/STATIC_PAGES_CMS_GUIDE.md` - CMS 사용법
- `docs/STATIC_PAGES_DEPLOYMENT_GUIDE.md` - 배포 가이드
- `docs/NEXT_STEPS.md` - 이 문서

---

## 체크리스트 요약

### 즉시 (오늘)
- [ ] SSH 복구 또는 대안 방법 확보
- [ ] 서버에 파일 업로드 (HTML 20개 + 파비콘 6개)
- [ ] 웹 브라우저로 페이지 접근 확인
- [ ] 404 에러 해결 확인

### 이번 주
- [ ] CMS 편집 기능 전체 테스트
- [ ] 데이터베이스 백업 자동화
- [ ] 에러 로깅 시스템 구축

### 이번 달
- [ ] 페이지 버전 관리 시스템 설계
- [ ] SEO 메타 태그 관리 구현
- [ ] 성능 모니터링 설정

### 장기
- [ ] 헤드리스 CMS 전환 검토
- [ ] 멀티 언어 지원 구현
- [ ] AI 기반 기능 추가

---

**마지막 업데이트**: 2025-11-03
**작성자**: Claude Code
**Git 커밋**: 7ad0ef4
