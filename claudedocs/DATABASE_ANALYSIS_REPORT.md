# 미소핀의원 CMS 데이터베이스 분석 보고서

**생성일시:** 2025-10-16
**데이터베이스:** PostgreSQL (Supabase)
**분석 범위:** 전체 테이블 및 데이터

---

## 📊 종합 요약

### 데이터 현황
- **총 테이블 수:** 18개
- **활성 사용자:** 3명 (비활성 1명)
- **정적 페이지:** 19개
- **클리닉 정보:** 설정 완료
- **예약/팝업/게시글:** 데이터 없음
- **웹빌더 기능:** 미사용

### 시스템 상태
- ✅ 사용자 인증 시스템: 정상
- ✅ 정적 페이지 관리: 활성화
- ✅ 클리닉 정보 관리: 설정 완료
- ⚠️ 예약 시스템: 데이터 없음 (기능 미사용)
- ⚠️ 게시판: 데이터 없음 (기능 미사용)
- ⚠️ 팝업 관리: 데이터 없음 (기능 미사용)
- ❌ 웹빌더: 완전 미사용

---

## 👥 사용자 (Users)

### 총 4명

| 이름 | 이메일 | 역할 | 상태 | 마지막 로그인 |
|------|--------|------|------|---------------|
| 김지식 | wonjang@misopin.com | SUPER_ADMIN | 활성 | 2025-10-16 09:52:50 |
| 팀장님 | teamlead@misopin.com | ADMIN | 활성 | Never |
| 미소핀 | editor@misopin.com | EDITOR | 활성 | Never |
| 테스트유저 | test@misopin.com | EDITOR | **비활성** | Never |

### 분석
- SUPER_ADMIN 1명만 로그인 기록 있음
- ADMIN과 EDITOR 계정은 생성되었으나 미사용
- 테스트 계정 1개 비활성화 상태
- 파일 업로드, 콘텐츠 버전, 템플릿 생성 기록 전무

### 권한 구조
```
SUPER_ADMIN (최상위 관리자)
  ├─ 모든 시스템 접근 및 사용자 관리
  └─ 현재: 김지식 (wonjang@misopin.com)

ADMIN (일반 관리자)
  ├─ 대부분의 관리 기능 접근
  └─ 사용자 관리 제외

EDITOR (편집자)
  ├─ 콘텐츠 편집 권한만
  └─ 제한적 관리 기능
```

---

## 🌐 정적 페이지 (Static Pages)

### 총 19개 페이지

#### 루트 페이지 (6개)
1. **index** - 메인 페이지 (버전: 2)
2. **about** - 병원 소개 (버전: 1)
3. **calendar-page** - 온라인 상담 (버전: 1)
4. **board-page** - 공지 및 이벤트 (버전: 1)
5. **privacy** - 개인정보 처리방침 (버전: 1)
6. **stipulation** - 이용약관 (버전: 1)
7. **fee-schedule** - 비급여 수가표 (버전: 1)

#### 진료 안내 페이지 (/dist, 12개)
1. **botox** - 보톡스
2. **jeomin** - 제오민
3. **filler** - 필러
4. **skinbooster** - 스킨부스터
5. **lifting** - 리프팅
6. **acne** - 여드름치료
7. **peeling** - 필링
8. **mole** - 점
9. **milia** - 비립종
10. **tattoo** - 문신제거
11. **hair-removal** - 제모
12. **diet** - 다이어트

### 페이지 버전 관리
- 대부분 페이지: 버전 1 (초기 생성 상태)
- **index.html만 버전 2** (1회 수정됨)

### 분석
- 모든 주요 페이지 등록 완료
- 진료 항목별 상세 페이지 체계적으로 구성
- 버전 관리 시스템 작동 중 (index만 수정 이력 있음)
- 실제 HTML 파일과 DB 메타데이터 동기화 상태

---

## 🏥 클리닉 정보 (Clinic Info)

### 기본 정보
- **대표 전화:** 061-277-1001
- **주소:** 전남 목포시 영산로 362 미소핀의원
- **사업자등록번호:** 123-56-789
- **대표자명:** 김지식

### 운영 시간
- **평일:** 08:30 ~ 19:30
- **토요일:** 09:00 ~ 14:00
- **일요일/공휴일:** 휴무

### SNS 링크
- **Instagram:** https://www.instagram.com/misopin_clin
- **Kakao:** http://pf.kakao.com/_xjxeLxj
- **Naver Blog:** 미설정
- **Facebook:** 미설정
- **Youtube:** 미설정

### 분석
- 클리닉 기본 정보 완전히 설정됨
- 주요 SNS (인스타그램, 카카오) 링크 활성화
- 네이버 블로그, 페이스북, 유튜브는 미설정
- 단일 레코드 패턴으로 관리 (isActive: true)

---

## 📅 예약 시스템 (Reservations)

### 현황
- **총 예약 건수:** 0건
- **상태:** 데이터 없음

### DB 구조
```typescript
- 환자명, 전화번호, 이메일
- 생년월일, 성별
- 진료 유형 (초진/재진)
- 원하는 진료 내용
- 희망 날짜 및 시간
- 예약 상태 (PENDING/CONFIRMED/CANCELLED/COMPLETED)
- 관리자 메모
```

### 분석
- 예약 시스템 테이블은 존재하나 **전혀 사용되지 않음**
- 온라인 예약 기능이 비활성화 되어있거나 별도 시스템 사용 중일 가능성
- calendar-page.html 존재하나 DB 연동 안 된 상태

---

## 🔔 팝업 관리 (Popups)

### 현황
- **총 팝업:** 0개
- **활성 팝업:** 0개

### DB 구조
```typescript
- 제목, 내용, 이미지
- 링크 URL
- 활성화 여부
- 노출 기간 (시작일 ~ 종료일)
- 표시 위치 (x, y, width, height)
- 노출 페이지 목록
- 팝업 타입 (MODAL/BANNER/SLIDE_IN)
- 우선순위
```

### 분석
- 팝업 시스템 준비되어 있으나 **완전 미사용**
- 프론트엔드에서 팝업 표시 기능 구현 필요

---

## 📝 게시판 (Board Posts)

### 현황
- **총 게시글:** 0개
- **공지사항:** 0개
- **이벤트:** 0개

### DB 구조
```typescript
- 게시판 유형 (NOTICE/EVENT)
- 제목, 내용, 요약
- 작성자
- 게시 상태, 상단 고정 여부
- 조회수
- 태그, 이미지
- 게시일
```

### 분석
- board-page.html 존재하나 DB 연동 안 됨
- 게시판 기능이 **완전 비활성화** 상태
- 별도 게시판 시스템 사용 중이거나 향후 구현 예정

---

## ⚙️ 시스템 설정 (System Settings)

### 현황
- **총 설정:** 0개

### 분석
- 시스템 설정 테이블 존재하나 **데이터 없음**
- 일반 설정, 이메일, 보안 등 카테고리별 설정 미사용
- 설정은 환경 변수(.env)로 관리 중

---

## 📁 파일 업로드 (File Uploads)

### 현황
- **총 업로드 파일:** 0개
- **총 용량:** 0 MB

### DB 구조
```typescript
- 파일명 (저장용/원본)
- MIME 타입, 크기
- 저장 경로, URL
- 카테고리 (image/document/etc)
- 업로드자 정보
```

### 분석
- 파일 업로드 시스템 구현되어 있으나 **전혀 사용 안 됨**
- Supabase Storage와 연동되어 있을 가능성
- 정적 파일들은 직접 서버에 배치하는 방식으로 운영 중

---

## 🧩 웹빌더 시스템

### 현황
- **Pages:** 0개
- **Content Blocks:** 0개
- **Block Templates:** 0개
- **Page Blocks (연결):** 0개
- **Content Versions:** 0개
- **SEO Settings:** 0개

### 시스템 구조
```
Page (페이지)
  └─ PageBlock (페이지-블록 연결)
       └─ ContentBlock (콘텐츠 블록)
            └─ ContentVersion (버전 관리)

BlockTemplate (블록 템플릿)
  └─ 카테고리별 재사용 가능한 템플릿

SEOSetting (SEO 설정)
  └─ 페이지별 메타데이터
```

### 블록 타입
- TEXT, IMAGE, VIDEO, CAROUSEL
- GRID, BUTTON, FORM, MAP
- HTML, COMPONENT

### 템플릿 카테고리
- UI, LAYOUT, CONTENT, FORM
- MEDIA, NAVIGATION, MARKETING
- SOCIAL, OTHER

### 분석
- 웹빌더 전체 시스템이 **완전 미사용** 상태
- 복잡한 블록 기반 페이지 빌더 구조가 구현되어 있으나 실제로는 활용 안 됨
- 정적 HTML 파일 직접 편집 방식으로 운영 중
- 향후 확장 대비용으로 보임

---

## 🔍 데이터베이스 스키마 분석

### 모델 관계도

```
User
├─ FileUpload (1:N)
├─ ContentVersion (1:N)
└─ BlockTemplate (1:N)

Page
├─ PageBlock (1:N)
└─ SEOSetting (1:1)

ContentBlock
├─ PageBlock (1:N)
└─ ContentVersion (1:N)

StaticPage
└─ StaticPageVersion (1:N)

PageBlock
├─ Page (N:1)
└─ ContentBlock (N:1)

ContentVersion
├─ ContentBlock (N:1)
└─ User (N:1)

BlockTemplate
└─ User (N:1)

SEOSetting
└─ Page (1:1)

StaticPageVersion
└─ StaticPage (N:1)

ClinicInfo (독립 - 단일 레코드)
Reservation (독립)
Popup (독립)
BoardPost (독립)
SystemSetting (독립)
FileUpload
└─ User (N:1)
```

### 인덱스 현황
```sql
-- Users
users.email (UNIQUE)

-- Pages
pages.slug (UNIQUE)

-- StaticPages
static_pages.slug (UNIQUE)

-- SystemSettings
system_settings.key (UNIQUE)

-- FileUploads
file_uploads.uploadedById (INDEX)
file_uploads.category (INDEX)

-- ContentBlocks
content_blocks.type (INDEX)
content_blocks.isGlobal (INDEX)

-- PageBlocks
page_blocks.[pageId, sectionName, order] (UNIQUE)
page_blocks.pageId (INDEX)
page_blocks.blockId (INDEX)

-- ContentVersions
content_versions.[blockId, version] (UNIQUE)
content_versions.blockId (INDEX)
content_versions.changedBy (INDEX)

-- BlockTemplates
block_templates.category (INDEX)
block_templates.isPublic (INDEX)
block_templates.createdBy (INDEX)

-- SEOSettings
seo_settings.pageId (UNIQUE)

-- StaticPageVersions
static_page_versions.[pageId, version] (UNIQUE)
static_page_versions.pageId (INDEX)

-- ClinicInfo
clinic_info.isActive (INDEX)
```

### Cascade 삭제 설정
```
Page 삭제 시:
  → PageBlock 자동 삭제
  → SEOSetting 자동 삭제

ContentBlock 삭제 시:
  → ContentVersion 자동 삭제

StaticPage 삭제 시:
  → StaticPageVersion 자동 삭제
```

---

## 📊 사용 중인 기능 vs 미사용 기능

### ✅ 활발히 사용 중
1. **사용자 인증** - SUPER_ADMIN 1명 활동 중
2. **정적 페이지 관리** - 19개 페이지 등록 및 관리
3. **클리닉 정보 관리** - 완전히 설정됨

### ⚠️ 시스템 존재, 데이터 없음
1. **예약 시스템** - 테이블 있으나 예약 0건
2. **팝업 관리** - 테이블 있으나 팝업 0개
3. **게시판** - 테이블 있으나 게시글 0개
4. **파일 업로드** - 시스템 있으나 파일 0개
5. **시스템 설정** - 테이블 있으나 설정 0개

### ❌ 완전 미사용
1. **웹빌더 시스템** - 모든 관련 테이블 데이터 0
   - Pages (0)
   - ContentBlocks (0)
   - BlockTemplates (0)
   - PageBlocks (0)
   - ContentVersions (0)
   - SEOSettings (0)

---

## 🎯 권장 사항

### 즉시 조치 권장
1. **미사용 계정 정리**
   - 테스트 계정(test@misopin.com) 삭제
   - ADMIN, EDITOR 계정 활용 방안 수립 또는 삭제

2. **클리닉 정보 보완**
   - 네이버 블로그 링크 추가 (있는 경우)
   - 의료기관 인허가번호 등록
   - 보조 전화번호 확인 및 등록

3. **기능 활성화 여부 결정**
   - 예약 시스템 사용 여부 결정
   - 팝업 기능 사용 여부 결정
   - 게시판 기능 사용 여부 결정

### 향후 개선 사항
1. **웹빌더 시스템**
   - 사용하지 않을 경우 관련 코드 제거 고려
   - 사용할 경우 초기 설정 및 교육 필요

2. **파일 관리**
   - 이미지 등 정적 파일을 DB 기반으로 관리할지 결정
   - Supabase Storage 연동 활성화 여부 결정

3. **모니터링**
   - 실제 사용되는 기능 추적
   - 불필요한 기능 제거로 시스템 단순화

---

## 📈 데이터베이스 건강도 평가

### 구조 건강도: 🟢 우수 (95/100)
- ✅ 정규화 잘 되어있음
- ✅ 관계 설정 적절
- ✅ 인덱스 최적화됨
- ✅ Cascade 삭제 설정 양호
- ⚠️ 미사용 테이블 다수 (웹빌더)

### 데이터 건강도: 🟡 보통 (60/100)
- ✅ 사용자 데이터 정상
- ✅ 정적 페이지 데이터 완전
- ✅ 클리닉 정보 완전
- ❌ 예약 데이터 없음
- ❌ 게시판 데이터 없음
- ❌ 팝업 데이터 없음
- ❌ 파일 업로드 없음
- ❌ 웹빌더 완전 미사용

### 활용도: 🟡 낮음 (30/100)
- 전체 18개 테이블 중
  - 실제 사용: 3개 (User, StaticPage, ClinicInfo)
  - 데이터 없음: 15개

---

## 🔒 보안 고려사항

### 현재 상태
- ✅ 비밀번호 암호화 (bcrypt)
- ✅ 역할 기반 접근 제어 (RBAC)
- ✅ 환경 변수로 민감 정보 관리

### 권장사항
1. 미사용 계정 정리 (test@misopin.com)
2. 비활성 사용자 주기적 검토
3. 로그인 이력 모니터링 강화
4. 2단계 인증 도입 검토 (SUPER_ADMIN)

---

## 📝 결론

미소핀의원 CMS 데이터베이스는 **구조적으로 우수**하나 **실제 활용도는 낮은** 상태입니다.

### 핵심 요약
1. **정적 페이지 관리 시스템**은 정상 작동 중
2. **클리닉 정보 관리**는 완전히 설정됨
3. **예약/팝업/게시판** 기능은 준비되었으나 미사용
4. **웹빌더 시스템** 전체가 완전 미사용
5. **파일 업로드** 기능 미사용

### 최종 권장사항
- 사용하지 않는 기능의 제거 또는 활성화 결정 필요
- 시스템 단순화를 통한 유지보수성 향상
- 실제 필요한 기능에 집중한 개발 전략 수립

---

**보고서 생성:** 2025-10-16
**분석 도구:** Prisma Client + TypeScript
**데이터베이스:** PostgreSQL (Supabase)
