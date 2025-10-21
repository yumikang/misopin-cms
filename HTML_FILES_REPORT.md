# 미소핀 정적 사이트 HTML 파일 상세 리포트

생성일: 2025-10-14
분석 대상: /var/www/misopin.com/ 및 /var/www/misopin.com/dist/

---

## 📊 전체 현황

### 파일 개수
- **/var/www/misopin.com/**: **13개** HTML 파일 (CMS 관리 페이지)
- **/var/www/misopin.com/dist/**: **12개** HTML 파일 (정적 진료안내 페이지)
- **총 25개 HTML 파일**

---

## 📂 1. /var/www/misopin.com/ (13개 파일)

### 파일 목록 및 용도

| 파일명 | 크기 | 용도 |
|--------|------|------|
| index.html | 73K | 메인 페이지 |
| calendar-page.html | 60K | 예약 달력 |
| board-page.html | 31K | 게시판 목록 |
| board-event.html | 30K | 이벤트 게시판 |
| board-notice.html | 30K | 공지사항 게시판 |
| about.html | 27K | 병원 소개 |
| board-detail.html | 20K | 게시글 상세 |
| privacy.html | 12K | 개인정보처리방침 |
| directions.html | 11K | 오시는 길 |
| fee-schedule.html | 9.2K | 진료 안내/비용 |
| quickmenu.html | 8.2K | 퀵메뉴 (iframe) |
| stipulation.html | 7.8K | 이용약관 |
| auto-clear-popups.html | 3.6K | 팝업 관리 스크립트 |

### 연락처 정보 분석

**전화번호 (061-277-1001)**:
- 총 18회 출현
- 주로 헤더, 푸터, 퀵메뉴에 위치

**Instagram**:
- 10개 파일에 링크 존재
- index.html, calendar-page.html: 각 2회
- 나머지: 각 1회

**Kakao**:
- quickmenu.html: 1회

**주소 정보**:
- "목포시" 키워드 포함 파일 다수
- 주로 푸터 영역에 위치

---

## 📂 2. /var/www/misopin.com/dist/ (12개 파일)

### 파일 목록 및 용도

| 파일명 | 크기 | 용도 | 진료 분야 |
|--------|------|------|-----------|
| tattoo.html | 38K | 타투제거 안내 | 레이저 |
| hair-removal.html | 37K | 제모 안내 | 레이저 |
| diet.html | 37K | 다이어트 안내 | 비만클리닉 |
| milia.html | 33K | 좁쌀제거 안내 | 피부관리 |
| peeling.html | 32K | 필링 안내 | 피부관리 |
| lifting.html | 30K | 리프팅 안내 | 안티에이징 |
| jeomin.html | 30K | 제오민 안내 | 주사시술 |
| filler.html | 29K | 필러 안내 | 주사시술 |
| mole.html | 29K | 점/사마귀 제거 | 레이저 |
| acne.html | 28K | 여드름 치료 | 피부과 |
| skinbooster.html | 28K | 스킨부스터 안내 | 피부관리 |
| botox.html | 28K | 보톡스 안내 | 주사시술 |

### 연락처 정보 분석

**전화번호 (061-277-1001)**:
- 총 36회 출현
- **각 파일당 평균 3회** (헤더, 푸터, 예약버튼 등)

**Instagram**:
- **전체 12개 파일**에 링크 존재
- 대부분 2회씩 출현 (총 21회)
- 주로 헤더 SNS 아이콘 + 푸터에 위치

**Kakao**:
- dist 폴더에는 kakao.com 링크 없음 (0회)

**주소 정보**:
- 전체 12개 파일에 "목포시" 주소 포함
- 주로 푸터의 사업자 정보 영역

---

## 📈 통합 분석

### 1. 전화번호 (061-277-1001)

| 위치 | 출현 횟수 |
|------|-----------|
| /var/www/misopin.com/ | 18회 |
| /var/www/misopin.com/dist/ | 36회 |
| **총합** | **54회** |

### 2. Instagram 링크

| 위치 | 파일 수 | 총 출현 횟수 |
|------|---------|--------------|
| /var/www/misopin.com/ | 10개 파일 | ~10회 |
| /var/www/misopin.com/dist/ | 12개 파일 | ~21회 |
| **총합** | **22개 파일** | **~31회** |

### 3. Kakao 링크

| 위치 | 출현 횟수 |
|------|-----------|
| /var/www/misopin.com/ | 1회 (quickmenu.html) |
| /var/www/misopin.com/dist/ | 0회 |
| **총합** | **1회** |

### 4. 주소 정보 (목포시)

| 위치 | 파일 수 |
|------|---------|
| /var/www/misopin.com/ | ~8-10개 파일 |
| /var/www/misopin.com/dist/ | 12개 파일 |
| **총합** | **~20-22개 파일** |

---

## 🎯 수정 대상 우선순위

### Priority 1: 필수 수정 (높은 변경 빈도)
- ✅ **전화번호**: 54회 (모든 페이지)
- ✅ **주소**: ~20-22개 파일
- ✅ **Instagram**: 31회
- ✅ **운영시간**: 푸터에 하드코딩 (전체 파일)

### Priority 2: 선택 수정 (낮은 변경 빈도)
- ⚠️ **Kakao**: 1회 (quickmenu.html만)
- ⚠️ **사업자등록번호**: 거의 변경 없음 (하드코딩 유지 가능)

---

## 🔧 수정 전략

### 방법 1: 전체 자동화 (권장)
**대상**: 25개 모든 HTML 파일

**작업 내용**:
1. `/var/www/misopin.com/js/clinic-info.js` 배포
2. 25개 파일에 `<script>` 태그 추가
3. 전화번호, 주소, SNS 링크에 `data-clinic-*` 속성 추가

**예상 시간**: 1시간 (자동화 스크립트 사용)

### 방법 2: dist 폴더만 우선 수정
**대상**: 12개 dist HTML 파일

**이유**:
- 진료 안내 페이지로 **방문자가 많음**
- 연락처 정보가 더 많이 노출됨 (36회 vs 18회)
- 일관된 구조로 **스크립트 적용 용이**

**예상 시간**: 30분

---

## 📝 권장 사항

1. **우선순위**: `dist/` 폴더 12개 파일 먼저 수정
2. **테스트**: 1-2개 파일로 먼저 테스트 후 전체 적용
3. **백업**: 수정 전 반드시 전체 백업 필수
4. **검증**: 수정 후 각 페이지 브라우저 테스트

---

## ⚠️ 주의사항

1. **dist 폴더**는 빌드 결과물일 수 있음
   - 소스 파일이 별도로 있다면 그쪽도 수정 필요
   - 재빌드 시 덮어쓰기 주의

2. **quickmenu.html**은 iframe으로 사용됨
   - 다른 페이지에 영향을 줄 수 있음
   - 신중한 테스트 필요

3. **auto-clear-popups.html**은 스크립트 파일
   - 수정 불필요

---

## 📊 최종 요약

| 항목 | 값 |
|------|-----|
| 총 HTML 파일 | **25개** |
| 수정 필요 파일 | **24개** (auto-clear-popups 제외) |
| 전화번호 출현 | **54회** |
| Instagram 링크 | **31회** |
| 주소 정보 | **~20-22개 파일** |
| 예상 작업 시간 | **1-2시간** (자동화 스크립트 사용) |

---

**생성 도구**: Claude Code + Sequential-thinking MCP
**다음 단계**: 배포 스크립트를 25개 파일에 맞게 업데이트
