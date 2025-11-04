# 프로덕션 데이터 분석 결과

분석일시: 2025-11-04
데이터베이스: misopin_cms (141.164.60.51)

## 1. 전체 현황

```
총 예약 건수: 4건
사용 중인 서비스 타입: 1개 (WRINKLE_BOTOX만 사용)
preferredTime NULL: 0건 (모든 예약이 시간 정보 보유)
preferredTime 존재: 4건
예약 날짜 범위: 2025-10-16 ~ 2025-10-30
```

## 2. preferredTime 형식 분석

### 2.1 발견된 형식

```sql
preferredTime | occurrence_count | service        | earliest_reservation      | latest_reservation
--------------+------------------+----------------+---------------------------+---------------------------
09:30         | 1                | WRINKLE_BOTOX  | 2025-10-21 15:08:41.901  | 2025-10-21 15:08:41.901
16:00         | 1                | WRINKLE_BOTOX  | 2025-10-16 04:06:51.134  | 2025-10-16 04:06:51.134
14:00         | 1                | WRINKLE_BOTOX  | 2025-10-22 06:56:28.382  | 2025-10-22 06:56:28.382
15:00         | 1                | WRINKLE_BOTOX  | 2025-10-16 03:47:28.683  | 2025-10-16 03:47:28.683
```

### 2.2 형식 특징

✅ **일관된 형식**: `HH:mm` (예: "09:30", "14:00", "15:00", "16:00")
✅ **표준 시간 형식**: 24시간 형식 사용
✅ **파싱 가능**: 간단한 문자열 파싱으로 시간 추출 가능
✅ **NULL 없음**: 모든 예약이 preferredTime 값을 가지고 있음

## 3. 서비스 타입 분포

```
WRINKLE_BOTOX: 4건 (100%)
```

**주의사항**:
- 현재는 WRINKLE_BOTOX만 사용 중
- 다른 5개 enum 값은 프로덕션 데이터 없음 (VOLUME_LIFTING, SKIN_CARE, REMOVAL_PROCEDURE, BODY_CARE, OTHER_CONSULTATION)

## 4. 마이그레이션 고려사항

### 4.1 데이터 볼륨

**🟢 저위험**:
- 총 4건의 예약만 존재
- 마이그레이션 실행 시간: 1초 미만 예상
- 롤백 시간: 1초 미만 예상

### 4.2 preferredTime → period 변환 로직

```typescript
// 변환 로직 (마이그레이션 스크립트용)
function convertPreferredTimeToPeriod(preferredTime: string): 'MORNING' | 'AFTERNOON' {
  const hour = parseInt(preferredTime.split(':')[0]);
  return hour < 12 ? 'MORNING' : 'AFTERNOON';
}

// 실제 데이터 변환 결과
// 09:30 → MORNING
// 14:00 → AFTERNOON
// 15:00 → AFTERNOON
// 16:00 → AFTERNOON
```

**변환 후 분포**:
- MORNING: 1건 (25%)
- AFTERNOON: 3건 (75%)

### 4.3 Service 테이블 초기 데이터

현재 WRINKLE_BOTOX만 사용 중이므로, 마이그레이션 시 최소한 이 서비스는 반드시 추가해야 함:

```sql
-- Phase 1에서 필수 추가할 서비스
INSERT INTO "Service" (
  id,
  code,
  name,
  "durationMinutes",
  "bufferMinutes",
  "isActive",
  "displayOrder"
) VALUES (
  'service_wrinkle_botox',
  'WRINKLE_BOTOX',
  '주름/보톡스',
  40,  -- duration.md에서 정의된 시간
  10,
  true,
  1
);
```

## 5. 위험도 평가

### 🟢 저위험 요소
- ✅ 데이터 볼륨 매우 작음 (4건)
- ✅ preferredTime 형식 일관됨
- ✅ NULL 값 없음
- ✅ 단일 서비스 타입만 사용

### 🟡 주의 요소
- ⚠️ 다른 5개 enum 서비스 타입 미사용 (향후 추가 시 고려 필요)
- ⚠️ preferredTime → period 변환 시 정보 손실 (정확한 시간 → 오전/오후)

### 권장사항

1. **마이그레이션 타이밍**: 데이터 볼륨이 작으므로 언제든 안전하게 실행 가능
2. **preferredTime 보존**: 마이그레이션 후에도 원본 데이터 당분간 유지 (롤백 용이)
3. **서비스 추가 순서**: WRINKLE_BOTOX 먼저, 나머지는 필요 시 점진적 추가
4. **검증 쿼리**: 마이그레이션 후 4건 모두 정상 변환 확인 필수

## 6. 다음 단계

✅ **완료**: 프로덕션 데이터 분석
⏭️ **다음**: 테스트 환경 준비
  - 스테이징 DB 백업
  - 프로덕션 데이터 복사 (4건)
  - 마이그레이션 스크립트 테스트
  - 롤백 절차 검증
