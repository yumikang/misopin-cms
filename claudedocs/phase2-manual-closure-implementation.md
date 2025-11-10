# Phase 2: 수동 시간 마감 기능 구현 완료 문서

**작업 기간**: 2025-11-06
**완료도**: 100%
**배포 상태**: ✅ 프로덕션 배포 완료

---

## 📋 목차

1. [기능 개요](#기능-개요)
2. [구현 내역](#구현-내역)
3. [데이터베이스 스키마](#데이터베이스-스키마)
4. [API 엔드포인트](#api-엔드포인트)
5. [UI 컴포넌트](#ui-컴포넌트)
6. [버그 수정 내역](#버그-수정-내역)
7. [배포 정보](#배포-정보)
8. [테스트 결과](#테스트-결과)

---

## 기능 개요

### 목적
관리자가 특정 날짜/시간대/서비스에 대해 예약을 수동으로 마감할 수 있는 기능을 제공합니다.

### 사용 시나리오
- 임시 휴진 (의사 부재, 긴급 상황)
- 설비 점검
- 특정 시술 일시 중단
- 특정 시간대 예약 제한

### 주요 기능
1. **날짜별 시간대 마감**: 특정 날짜의 특정 시간대 마감
2. **서비스별 마감**: 특정 서비스만 선택적으로 마감 (선택사항)
3. **마감 사유 기록**: 마감 이유를 텍스트로 기록
4. **마감 목록 관리**: 현재 마감된 시간대 조회 및 해제
5. **실시간 반영**: 사용자 예약 페이지에 즉시 반영

---

## 구현 내역

### 1. 데이터베이스 스키마

#### `manual_time_closures` 테이블

```prisma
model manual_time_closures {
  id            String    @id
  closureDate   DateTime  @db.Date
  period        String    @db.VarChar(20)  // MORNING, AFTERNOON, EVENING
  timeSlotStart String    @db.VarChar(10)  // "09:00"
  timeSlotEnd   String?   @db.VarChar(10)  // "09:30"
  serviceId     String?                      // NULL = 모든 서비스
  reason        String?                      // 마감 사유
  createdBy     String    @db.VarChar(255)
  createdAt     DateTime  @default(now())
  isActive      Boolean   @default(true)
  services      services? @relation(fields: [serviceId], references: [id])

  @@index([closureDate, period])
  @@index([serviceId])
  @@index([isActive])
}
```

**필드 설명**:
- `closureDate`: 마감할 날짜 (YYYY-MM-DD)
- `period`: 시간대 (MORNING/AFTERNOON/EVENING)
- `timeSlotStart`: 마감 시작 시간 (예: "09:00")
- `timeSlotEnd`: 마감 종료 시간 (선택사항)
- `serviceId`: 특정 서비스만 마감 (NULL이면 전체)
- `reason`: 마감 사유 (예: "임시 휴진")
- `createdBy`: 생성자 이메일
- `isActive`: 활성 상태 (삭제 시 false로 변경)

### 2. API 엔드포인트

#### 파일: `app/api/admin/manual-close/route.ts`

#### **GET** `/api/admin/manual-close`
특정 날짜의 수동 마감 목록 조회

**Query Parameters**:
```typescript
{
  date: string;         // 필수: YYYY-MM-DD
  serviceId?: string;   // 선택: 서비스 UUID
  serviceCode?: string; // 선택: 서비스 코드 (예: "OTHER_CONSULTATION")
}
```

**Response**:
```json
{
  "success": true,
  "closures": [
    {
      "id": "uuid",
      "closureDate": "2025-11-06",
      "period": "MORNING",
      "timeSlotStart": "09:00",
      "timeSlotEnd": null,
      "serviceId": "uuid",
      "reason": "긴급 휴진",
      "createdBy": "admin@example.com",
      "isActive": true,
      "service": {
        "id": "uuid",
        "code": "OTHER_CONSULTATION",
        "name": "기타 상담"
      }
    }
  ]
}
```

#### **POST** `/api/admin/manual-close`
수동 마감 생성

**Request Body (Batch)**:
```json
{
  "closureDate": "2025-11-06",
  "period": "MORNING",
  "timeSlots": ["09:00", "09:30", "10:00"],
  "serviceCode": "OTHER_CONSULTATION",
  "reason": "임시 휴진"
}
```

**Request Body (Single)**:
```json
{
  "closureDate": "2025-11-06",
  "period": "MORNING",
  "timeSlotStart": "09:00",
  "timeSlotEnd": "09:30",
  "serviceCode": "OTHER_CONSULTATION",
  "reason": "빠른 마감"
}
```

**Response**:
```json
{
  "success": true,
  "count": 3,
  "message": "3 time slots closed successfully"
}
```

#### **DELETE** `/api/admin/manual-close`
수동 마감 삭제 (비활성화)

**Query Parameters**:
```typescript
{
  id: string; // 마감 ID
}
```

**Response**:
```json
{
  "success": true,
  "message": "Closure deleted successfully"
}
```

### 3. UI 컴포넌트

#### 파일: `components/admin/ManualCloseForm.tsx`

**주요 기능**:
1. 날짜 선택 (고정 - props로 전달받음)
2. 시간대 선택 (오전/오후)
3. 마감할 시간 복수 선택 (버튼 토글)
4. 대상 서비스 선택 (선택사항)
5. 마감 사유 입력 (선택사항)
6. 현재 마감된 시간대 목록 표시
7. 마감 해제 기능

**UI 구성**:
```
┌─────────────────────────────────────┐
│ 수동 시간 마감                       │
├─────────────────────────────────────┤
│ 날짜: 2025-11-06                    │
│ 시간대: [오전] [오후]                │
│                                      │
│ 마감할 시간:                         │
│ [09:00] [09:30] [10:00 (마감됨)]    │
│ [10:30] [11:00] [11:30]             │
│                                      │
│ 대상 서비스: [전체 ▼]                │
│ 마감 사유: [___________________]    │
│                                      │
│ [2개 시간대 마감하기]                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 현재 마감된 시간대                   │
├─────────────────────────────────────┤
│ [오전] 09:00 [기타 상담]     [X]    │
│ 사유: 긴급 휴진                      │
│ 등록: admin@example.com              │
└─────────────────────────────────────┘
```

**Props**:
```typescript
interface ManualCloseFormProps {
  date: string;           // YYYY-MM-DD
  serviceCode?: string;   // 선택적 서비스 필터
  onUpdate?: () => void;  // 업데이트 콜백
  className?: string;
}
```

### 4. 예약 시스템 통합

#### time-slots API 수정
**파일**: `app/api/public/reservations/time-slots/route.ts`

**수동 마감 체크 로직**:
```typescript
// 1. 수동 마감 정보 조회
const manualClosures = await prisma.manual_time_closures.findMany({
  where: {
    closureDate: targetDate,
    isActive: true,
    OR: [
      { serviceId: null },           // 전체 서비스 마감
      { serviceId: serviceRecord.id } // 특정 서비스 마감
    ]
  }
});

// 2. 각 시간대별로 마감 여부 확인
for (const slot of slots) {
  const closure = manualClosures.find(c =>
    c.timeSlotStart === slot.time &&
    c.period === slot.period
  );

  if (closure) {
    slot.available = false;
    slot.status = 'full';
    slot.isManualClosed = true;
    slot.closureReason = closure.reason || '관리자 마감';
  }
}
```

**API Response 예시**:
```json
{
  "success": true,
  "slots": [
    {
      "time": "09:00",
      "period": "MORNING",
      "available": false,
      "status": "full",
      "isManualClosed": true,
      "closureReason": "긴급 휴진"
    }
  ]
}
```

---

## 버그 수정 내역

### 1. JWT 인증 불일치 (401 Unauthorized)

**문제**:
- 로그인 API: `JWT_SECRET || NEXTAUTH_SECRET || fallback`
- 수동 마감 API: `JWT_SECRET || fallback`
- NEXTAUTH_SECRET로 생성된 토큰을 검증 실패

**해결**:
```typescript
// app/api/admin/manual-close/route.ts:27
const decoded = jwt.verify(
  token,
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'
) as JwtPayload;
```

### 2. localStorage 키 불일치

**문제**:
- 로그인 페이지: `localStorage.setItem("token", ...)`
- 컴포넌트: `localStorage.getItem("accessToken")`

**해결**:
```typescript
// app/login/page.tsx:34
localStorage.setItem("accessToken", data.token);
```

### 3. Foreign Key Constraint Violation

**문제**:
- ManualCloseForm이 `serviceCode` (문자열)를 `serviceId`로 전송
- 데이터베이스는 UUID 형식의 `serviceId` 기대
- Prisma가 외래키 제약 위반 에러 발생

**해결**:
```typescript
// API에서 serviceCode → serviceId 변환
let resolvedServiceId = serviceId;
if (serviceCode && !serviceId) {
  const service = await prisma.services.findUnique({
    where: { code: serviceCode },
    select: { id: true }
  });
  resolvedServiceId = service?.id || null;
}

// ManualCloseForm에서 serviceCode로 전송
body: JSON.stringify({
  serviceCode: selectedService || null,  // serviceId가 아닌 serviceCode
  // ...
})
```

### 4. Prisma 필드명 불일치 (TypeScript 빌드 에러)

**문제**:
- 코드에서 snake_case 사용: `patient_name`, `reservation_time`
- Prisma 스키마는 camelCase: `patientName`, `preferredTime`

**해결**:
```typescript
// app/api/admin/manual-close/route.ts (checkConflicts 함수)
const reservations = await prisma.reservations.findMany({
  where: {
    preferredDate: dateObj,  // reservation_date → preferredDate
    status: { in: ['PENDING', 'CONFIRMED'] }
  },
  select: {
    patientName: true,       // patient_name → patientName
    preferredTime: true,     // reservation_time → preferredTime
    timeSlotStart: true,
    period: true,
    status: true
  }
});
```

### 5. ServiceSelector Props 에러

**문제**:
- ManualCloseForm이 `allowAll={true}` 전달
- ServiceSelector 컴포넌트에 `allowAll` props 없음

**해결**:
```typescript
// components/admin/ManualCloseForm.tsx:314
<ServiceSelector
  value={selectedService}
  onChange={setSelectedService}
  disabled={submitting}
  // allowAll 제거
/>
```

### 6. Next.js Turbopack 캐시 문제

**문제**:
- API 수정 후에도 이전 코드 실행
- `.next` 폴더의 캐시된 빌드 사용

**해결**:
```bash
lsof -ti:3003 | xargs kill -9
rm -rf .next
npm run dev -- -p 3003 &
```

---

## 배포 정보

### 배포 날짜
2025-11-06 17:09:08

### 배포 스크립트
1. **CMS 시스템**: `./deploy.sh`
2. **정적 페이지**: `./deploy-calendar-remote.sh`

### 배포된 서버

#### 1. CMS 관리 시스템 (cms.one-q.xyz)
**위치**: `/var/www/misopin-cms/`

**배포 내용**:
- Next.js 프로덕션 빌드 (58개 정적 페이지)
- Prisma 스키마 및 마이그레이션
- API 엔드포인트 (manual-close 포함)
- 관리자 UI 컴포넌트

**프로세스 관리**: PM2 (misopin-cms)

**접근 URL**:
- 로그인: https://cms.one-q.xyz/login
- 수동 마감 관리: https://cms.one-q.xyz/admin/reservations/timeline

#### 2. 사용자 웹사이트 (misopin.one-q.xyz)
**위치**:
- 정적 파일: `/var/www/misopin.com/`
- CMS 연동: `/var/www/misopin-cms/.next/standalone/public/static-pages/`

**배포 내용**:
- calendar-page.html (예약 신청 페이지)
- time-slot-loader.js (시간대 로더)
- time-slot-styles.css, minimal-base.css

**웹서버**: Caddy

**접근 URL**:
- 예약 페이지: https://misopin.one-q.xyz/static-pages/calendar-page.html

### 배포 검증

#### CMS API 테스트
```bash
# 서비스 목록 조회
curl https://misopin.one-q.xyz/api/public/services
# ✅ 200 OK

# 시간대 조회 (수동 마감 포함)
curl "https://misopin.one-q.xyz/api/public/reservations/time-slots?service=OTHER_CONSULTATION&date=2025-11-06"
# ✅ 200 OK
# ✅ isManualClosed: true 확인
# ✅ closureReason: "긴급 휴진" 확인
```

---

## 테스트 결과

### 로컬 테스트 (localhost:3003)

#### 1. 수동 마감 생성
**테스트 케이스**: 2025-11-06, 오전 9:00, 기타 상담, "긴급 휴진"

**결과**: ✅ 성공
```json
{
  "success": true,
  "count": 1,
  "message": "1 time slots closed successfully"
}
```

#### 2. 데이터베이스 확인
**명령어**: `node scripts/check-closures.js`

**결과**: ✅ 성공
```
=== 최근 생성된 수동 마감 데이터 ===

1. 마감 ID: [uuid]
   날짜: 2025-11-06
   기간: MORNING
   시간: 09:00
   서비스: 기타 상담 (OTHER_CONSULTATION)
   사유: 긴급 휴진
   등록자: admin@example.com
```

#### 3. time-slots API 통합
**테스트 URL**:
```
http://localhost:3003/api/public/reservations/time-slots?service=OTHER_CONSULTATION&date=2025-11-06
```

**결과**: ✅ 성공
```json
{
  "time": "09:00",
  "period": "MORNING",
  "available": false,
  "status": "full",
  "isManualClosed": true,
  "closureReason": "긴급 휴진"
}
```

### 프로덕션 테스트 (misopin.one-q.xyz)

#### 1. Services API
**URL**: https://misopin.one-q.xyz/api/public/services

**결과**: ✅ 200 OK
- 전체 서비스 목록 정상 반환

#### 2. Time Slots API
**URL**: https://misopin.one-q.xyz/api/public/reservations/time-slots?service=OTHER_CONSULTATION&date=2025-11-06

**결과**: ✅ 200 OK
- 수동 마감 시간대 `isManualClosed: true` 확인
- `closureReason: "긴급 휴진"` 확인

#### 3. 캘린더 페이지
**URL**: https://misopin.one-q.xyz/static-pages/calendar-page.html

**결과**: ✅ 200 OK
- 페이지 정상 로드

---

## 파일 변경 내역

### 수정된 파일

#### 1. `app/api/admin/manual-close/route.ts`
- JWT 인증: NEXTAUTH_SECRET 폴백 추가 (Line 27)
- GET 엔드포인트: serviceCode 파라미터 지원 (Lines 309-327)
- POST 엔드포인트: serviceCode → serviceId 변환 (Lines 149-157)
- checkConflicts 함수: Prisma 필드명 수정 (Lines 64-98)

#### 2. `app/login/page.tsx`
- localStorage 키 변경: "token" → "accessToken" (Line 34)

#### 3. `components/admin/ManualCloseForm.tsx`
- GET 요청: serviceCode 파라미터로 변경 (Line 101)
- POST 요청: serviceCode 전송으로 변경 (Line 151)
- ServiceSelector: allowAll prop 제거 (Line 314)

### 생성된 파일

#### 1. `scripts/check-closures.js`
데이터베이스 마감 정보 확인용 스크립트

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const closures = await prisma.manual_time_closures.findMany({
    where: { isActive: true },
    include: { service: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  // ... 출력 로직
}

main().finally(() => prisma.$disconnect());
```

#### 2. `/tmp/changed-files-summary.md`
변경 사항 요약 문서 (임시)

---

## 기술 스택

### Backend
- **Framework**: Next.js 15.5.3 (App Router)
- **Database**: PostgreSQL (Prisma ORM)
- **Authentication**: JWT (jsonwebtoken)
- **Deployment**: PM2, Caddy

### Frontend
- **Framework**: React 18+ (Next.js)
- **UI Library**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### DevOps
- **Process Manager**: PM2
- **Web Server**: Caddy
- **Deployment**: rsync over SSH
- **Server**: VPS (141.164.60.51)

---

## 향후 개선 사항

### 1. 캘린더 페이지 UI 개선
현재 time-slots API는 `isManualClosed`를 반환하지만, calendar-page.html에서 시각적으로 강조 표시 필요

**제안**:
- 마감된 시간대에 빨간색 배지 표시
- 마감 사유 툴팁 표시
- "예약 불가" 버튼 비활성화

### 2. 대량 마감 기능
현재는 시간대별 개별 선택이지만, 전체 오전/오후 일괄 마감 기능 추가

**제안**:
- "오전 전체 마감" 버튼
- "오후 전체 마감" 버튼
- 날짜 범위 선택 (예: 11/10 ~ 11/15 오전 전체 마감)

### 3. 마감 히스토리
마감 생성/삭제 이력 추적

**제안**:
- `manual_time_closure_history` 테이블 생성
- 누가, 언제, 무엇을 마감/해제했는지 기록
- 관리자 페이지에 히스토리 조회 기능

### 4. 알림 기능
마감 시 영향받는 예약이 있을 경우 알림

**제안**:
- 기존 예약자에게 이메일/SMS 발송
- 관리자 대시보드에 경고 표시

### 5. 반복 마감 설정
매주 반복되는 마감 (예: 매주 수요일 오후 휴진)

**제안**:
- `recurring_closures` 테이블 생성
- RRULE 패턴 지원
- 반복 마감 관리 UI

---

## 참고 자료

### API 문서
- [수동 마감 API 스펙](./api-specs/manual-close.md)
- [예약 시스템 API](./api-specs/reservations.md)

### 관련 이슈
- #PHE2-001: JWT 인증 불일치
- #PHE2-002: Foreign Key Constraint
- #PHE2-003: Prisma 필드명 타입 에러

### 배포 로그
- [Deploy Log 2025-11-06](./deploy-logs/20251106-170908.log)

---

## 작성자

**작성일**: 2025-11-06
**작성자**: Claude (Anthropic AI)
**문서 버전**: 1.0

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2025-11-06 | 1.0 | 최초 작성 | Claude |
