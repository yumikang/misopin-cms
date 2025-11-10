# 시술 관리 시스템 통합 테스트 가이드

## 📋 시스템 아키텍처 개요

### 1. 데이터 흐름도

```
[Admin UI] → [Backend API] → [Database (Prisma)] → [Public API] → [Static Page]
    ↓              ↓                  ↓                   ↓              ↓
시술 CRUD    시술 검증/저장    services 테이블    시술 목록 조회    예약 폼 표시
시간 변경    cascade 계산    service_limits    시간 계산         시간 선택
```

### 2. 핵심 컴포넌트

#### A. 시술 관리 (Admin)
- **위치**: `/admin/reservations/settings`
- **기능**: 시술 생성, 수정, 삭제, 시간 변경
- **API**: `/api/admin/services/*`

#### B. 시술 정보 조회 (Public API)
- **위치**: `/api/public/services`
- **기능**: 활성화된 시술 목록 반환
- **캐싱**: 5분 (max-age=300)

#### C. 예약 시간 계산 (Time Slot Calculator)
- **위치**: `/lib/reservations/time-slot-calculator.ts`
- **기능**: 시술 시간 기반 예약 가능 시간대 계산
- **API**: `/api/public/reservations/time-slots`

#### D. 정적 페이지 (Static Page)
- **위치**: `/public/static-pages/calendar-page.html`
- **기능**: 고객용 예약 신청 폼
- **API 호출**: `/api/public/services`, `/api/public/reservations/time-slots`

---

## 🔄 시술 시간 변경 시 영향 분석

### 시나리오: 주름 보톡스 시술 시간을 30분 → 40분으로 변경

#### 1단계: Admin에서 시술 시간 변경
```
시술명: 주름 보톡스
기존 시간: 30분
변경 시간: 40분
일일 한도: 180분
```

#### 2단계: Cascade 효과 계산 (자동)
```javascript
// 변경 전
최대 예약 건수 = 180분 / 30분 = 6건

// 변경 후
최대 예약 건수 = 180분 / 40분 = 4.5 → 4건 (내림)

// Cascade 효과
- 최대 예약 건수 감소: 6건 → 4건 (-2건)
- 영향: 기존 5건 이상 예약된 날짜에 문제 발생 가능
```

#### 3단계: 데이터베이스 업데이트
```sql
-- services 테이블 업데이트
UPDATE services
SET durationMinutes = 40, updatedAt = NOW()
WHERE code = 'WRINKLE_BOTOX';

-- 영향 받는 테이블
-- 1. services (시술 정보)
-- 2. service_reservation_limits (한도 계산 변경)
-- 3. reservations (기존 예약은 유지, 신규 예약 계산에만 영향)
```

#### 4단계: API 응답 변경
```javascript
// GET /api/public/services?code=WRINKLE_BOTOX
{
  "success": true,
  "services": [{
    "code": "WRINKLE_BOTOX",
    "name": "주름 보톡스",
    "durationMinutes": 40,    // ← 변경됨
    "bufferMinutes": 10,
    "totalMinutes": 50         // ← 40 + 10 = 50
  }]
}
```

#### 5단계: Time Slot Calculator 재계산
```javascript
// 2025-11-10 예약 가능 시간 계산
// GET /api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-11-10

// 변경 전 (30분 기준)
{
  "slots": [
    { "time": "09:00", "available": true, "remaining": 180 },  // 6건 가능
    { "time": "14:00", "available": true, "remaining": 180 }   // 6건 가능
  ]
}

// 변경 후 (40분 기준)
{
  "slots": [
    { "time": "09:00", "available": true, "remaining": 180 },  // 4건 가능 (40분 기준)
    { "time": "14:00", "available": true, "remaining": 180 }   // 4건 가능
  ]
}
```

#### 6단계: 정적 페이지 자동 반영 (실시간)
```javascript
// calendar-page.html의 JavaScript가 API 호출
// 5분 캐시 후 새로운 시간 기준 적용

// 사용자가 보는 화면:
// - 시술 선택: "주름 보톡스 (40분)" ← 변경된 시간 표시
// - 예약 가능 시간: 09:00, 09:40, 10:20, 11:00 (40분 간격)
```

---

## 🧪 테스트 시나리오

### Test 1: 시술 추가 → 정적 페이지 반영

#### 준비
```
1. Admin 로그인: https://cms.one-q.xyz/admin/reservations/settings
2. 새 시술 추가 버튼 클릭
```

#### 테스트 단계
```
Step 1: 시술 정보 입력
- 코드: TEST_TREATMENT
- 이름: 테스트 시술
- 시술 시간: 45분
- 준비 시간: 15분
- 카테고리: 테스트
- 상태: 활성

Step 2: 저장 클릭

Step 3: API 확인
curl https://cms.one-q.xyz/api/public/services

Step 4: 정적 페이지 확인
https://cms.one-q.xyz/static-pages/calendar-page.html
→ 시술 선택 드롭다운에 "테스트 시술" 표시 확인

Step 5: 캐시 고려
- 최대 5분 대기 후 재확인 (Cache-Control: max-age=300)
- 또는 브라우저 새로고침 (Ctrl+F5)
```

#### 예상 결과
```
✅ 시술이 정적 페이지 드롭다운에 즉시 표시됨 (캐시 만료 후)
✅ 시술 시간(45분) 기반으로 예약 시간 간격 계산됨
✅ 일일 한도가 설정되지 않았으므로 모든 시간대 available=true
```

---

### Test 2: 시술 시간 변경 → Cascade 효과

#### 준비
```sql
-- 기존 시술 확인
SELECT code, name, durationMinutes FROM services
WHERE code = 'OTHER_CONSULTATION';

-- 기존 한도 확인
SELECT dailyLimitMinutes FROM service_reservation_limits
WHERE serviceId = (SELECT id FROM services WHERE code = 'OTHER_CONSULTATION');
```

#### 테스트 단계
```
Step 1: 시술 시간 변경
- https://cms.one-q.xyz/admin/reservations/settings
- "기타 상담" 시술 편집 클릭
- 시술 시간: 10분 → 15분 변경
- Cascade 효과 미리보기 확인:
  * 기존: 최대 X건 예약 가능
  * 변경 후: 최대 Y건 예약 가능

Step 2: 저장 클릭

Step 3: 영향 확인
curl "https://cms.one-q.xyz/api/public/reservations/time-slots?service=OTHER_CONSULTATION&date=2025-11-15"

Step 4: 계산 검증
일일 한도가 180분이라면:
- 변경 전: 180 / 10 = 18건 가능
- 변경 후: 180 / 15 = 12건 가능
- 차이: -6건 (감소)
```

#### 예상 결과
```
✅ Admin UI에서 Cascade 효과 미리보기 표시됨
✅ API 응답에서 durationMinutes=15로 변경됨
✅ Time Slot Calculator가 15분 기준으로 재계산함
✅ 기존 예약은 유지됨 (이미 완료된 예약은 변경 없음)
```

---

### Test 3: 시술 비활성화 → 정적 페이지 제거

#### 테스트 단계
```
Step 1: 시술 비활성화
- https://cms.one-q.xyz/admin/reservations/settings
- "테스트 시술" 편집 클릭
- 상태: 활성 → 비활성 변경
- 저장

Step 2: API 확인 (활성만 조회)
curl https://cms.one-q.xyz/api/public/services
→ 비활성 시술은 목록에서 제외됨

Step 3: API 확인 (모든 시술 조회)
curl "https://cms.one-q.xyz/api/public/services?active=false"
→ 비활성 시술 포함

Step 4: 정적 페이지 확인
https://cms.one-q.xyz/static-pages/calendar-page.html
→ "테스트 시술"이 드롭다운에서 제거됨
```

#### 예상 결과
```
✅ 비활성 시술은 Public API에서 제외됨
✅ 정적 페이지 드롭다운에 표시되지 않음
✅ 기존 예약은 유지됨 (예약 이력은 삭제되지 않음)
```

---

### Test 4: 시술 삭제 → 안전성 검증

#### 테스트 단계
```
Step 1: 예약이 없는 시술 삭제 시도
- 새로 생성한 시술 (예약 없음)
- 삭제 버튼 클릭
- Soft Delete / Hard Delete 선택
  * Soft: isActive=false로 변경
  * Hard: DB에서 완전 삭제

Step 2: 예약이 있는 시술 삭제 시도
- 기존 시술 (예약 있음)
- 삭제 버튼 비활성화 확인
- "예약이 있어 삭제할 수 없습니다" 메시지 표시

Step 3: 강제 삭제 방지 확인
curl -X DELETE https://cms.one-q.xyz/api/admin/services/{id} \
  -H "Authorization: Bearer {token}"
→ 400 Bad Request (예약이 있는 경우)
```

#### 예상 결과
```
✅ 예약이 없는 시술만 Hard Delete 가능
✅ 예약이 있는 시술은 UI에서 삭제 버튼 비활성화
✅ API에서도 예약 여부 검증 (이중 안전장치)
✅ Soft Delete는 항상 가능 (비활성화만)
```

---

### Test 5: 일일 한도 변경 → 예약 가능 여부

#### 테스트 단계
```
Step 1: 기존 한도 확인
- https://cms.one-q.xyz/admin/settings
- "서비스 한도 설정" 탭
- "주름 보톡스" 한도: 180분 (6건)

Step 2: 한도 증가
- 한도 변경: 180분 → 240분
- 저장

Step 3: 영향 확인
curl "https://cms.one-q.xyz/api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-11-15"

Step 4: 계산 검증
시술 시간 30분 기준:
- 변경 전: 180 / 30 = 6건 가능
- 변경 후: 240 / 30 = 8건 가능
- 차이: +2건 (증가)
```

#### 예상 결과
```
✅ 일일 최대 예약 건수 증가
✅ Time Slot API에서 available=true인 시간 증가
✅ 정적 페이지에서 예약 가능한 시간 선택지 증가
```

---

## 🔍 디버깅 도구

### 1. API 디버깅

```bash
# 시술 목록 확인
curl https://cms.one-q.xyz/api/public/services

# 특정 시술 확인
curl "https://cms.one-q.xyz/api/public/services?code=WRINKLE_BOTOX"

# 예약 가능 시간 확인 (디버그 모드)
curl "https://cms.one-q.xyz/api/public/reservations/time-slots?service=WRINKLE_BOTOX&date=2025-11-15&debug=true"
```

### 2. 데이터베이스 확인

```sql
-- 시술 정보
SELECT id, code, name, durationMinutes, bufferMinutes, isActive
FROM services
ORDER BY displayOrder;

-- 시술 한도
SELECT s.name, srl.dailyLimitMinutes, srl.isActive,
       FLOOR(srl.dailyLimitMinutes / s.durationMinutes) as maxBookings
FROM services s
LEFT JOIN service_reservation_limits srl ON s.id = srl.serviceId
WHERE s.isActive = true;

-- 예약 통계
SELECT s.name, COUNT(r.id) as reservationCount
FROM services s
LEFT JOIN reservations r ON s.id = r.serviceId
GROUP BY s.id, s.name
ORDER BY reservationCount DESC;
```

### 3. 캐시 확인

```bash
# 캐시 헤더 확인
curl -I https://cms.one-q.xyz/api/public/services
# Cache-Control: public, max-age=300, s-maxage=300

# 캐시 무효화 (강제 새로고침)
curl -H "Cache-Control: no-cache" https://cms.one-q.xyz/api/public/services
```

---

## ⚠️ 알려진 제약사항

### 1. 캐시 지연
- **문제**: API 응답이 5분간 캐시됨
- **영향**: 시술 변경 후 최대 5분 지연
- **해결**: 브라우저 강제 새로고침 (Ctrl+F5)

### 2. 기존 예약 영향 없음
- **문제**: 시술 시간 변경 시 기존 예약은 변경되지 않음
- **영향**: 과거 예약은 이전 시간 기준 유지
- **의도**: 데이터 무결성 보호 (의도된 동작)

### 3. 동시 편집 충돌
- **문제**: 여러 관리자가 동시에 같은 시술 편집 시
- **영향**: 마지막 저장만 반영됨
- **해결**: 낙관적 잠금 필요 (향후 개선)

---

## ✅ 체크리스트

### 시술 추가 테스트
- [ ] Admin UI에서 시술 생성 가능
- [ ] API에서 새 시술 조회 가능
- [ ] 정적 페이지에 시술 표시됨
- [ ] 시술 시간 기반 계산 정확

### 시술 수정 테스트
- [ ] 시술 시간 변경 시 Cascade 효과 미리보기
- [ ] 일일 한도 변경 시 최대 예약 건수 재계산
- [ ] API 응답 즉시 반영 (캐시 만료 후)
- [ ] Time Slot Calculator 재계산 정확

### 시술 삭제 테스트
- [ ] 예약 없는 시술 Hard Delete 가능
- [ ] 예약 있는 시술 삭제 차단
- [ ] Soft Delete 항상 가능
- [ ] 정적 페이지에서 비활성 시술 제거

### 통합 테스트
- [ ] Admin → API → Static Page 전체 흐름 정상
- [ ] 시간 변경 시 전체 시스템 영향 확인
- [ ] 캐시 동작 정상
- [ ] 에러 처리 정상

---

## 📚 참고 문서

- [시술 관리 API 문서](./PHASE5_API_QUICK_REFERENCE.md)
- [Time Slot Calculator 구조](../lib/reservations/ARCHITECTURE.md)
- [배포 가이드](./DEPLOYMENT_GUIDE.md)
