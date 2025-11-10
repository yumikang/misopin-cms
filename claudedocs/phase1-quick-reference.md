# Phase 1 빠른 참조 카드

**목표**: 타임라인 마감 정보 통합
**시간**: 3시간 | **난이도**: MEDIUM

---

## 🎯 체크리스트

### Task 1.1: Tooltip (20분)
```bash
# 1. Tooltip 설치
npx shadcn-ui@latest add tooltip

# 2. 파일 생성
touch components/ui/tooltip.tsx

# 3. 구현 (Radix UI 래핑)
# 4. 테스트: hover, 키보드 접근
```

---

### Task 1.2: ClosureIndicator (40분)
```bash
# 1. 파일 생성
touch components/admin/ClosureIndicator.tsx

# 2. Props 정의
interface ClosureIndicatorProps {
  closure: ManualClosure;
  onRemove?: (id: string) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  showQuickRelease?: boolean;
}

# 3. 핵심 기능
- 빨간 배경 + XCircle 아이콘
- Tooltip 상세 정보
- 빠른 해제 버튼 (확인 대화상자)
- 로딩 상태 처리
```

---

### Task 1.3: Fetch 로직 (30분)
```typescript
// ReservationTimeline.tsx에 추가

// 1. State 추가
const [closures, setClosures] = useState<ManualClosure[]>([]);

// 2. Fetch 함수
const fetchClosures = useCallback(async () => {
  const token = localStorage.getItem("accessToken");
  const params = new URLSearchParams({ date });
  if (service && service !== 'ALL') params.append('serviceId', service);

  const response = await fetch(`/api/admin/manual-close?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json();
  if (data.success) setClosures(data.closures || []);
}, [date, service]);

// 3. 병렬 로드
useEffect(() => {
  Promise.all([fetchReservations(), fetchClosures()]);
}, [fetchReservations, fetchClosures]);
```

---

### Task 1.4: 타임라인 시각화 (50분)
```typescript
// 1. 시간대 생성
const generateTimeSlots = (period: 'MORNING' | 'AFTERNOON' | 'EVENING') => {
  const slots = {
    MORNING: ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
    AFTERNOON: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'],
    EVENING: ['18:30', '19:00', '19:30']
  };
  return slots[period] || [];
};

// 2. 시간대 정보 구성
interface TimeSlotInfo {
  time: string;
  period: 'MORNING' | 'AFTERNOON' | 'EVENING';
  status: 'available' | 'booked' | 'closed' | 'limited';
  reservations: Reservation[];
  closures: ManualClosure[];
}

const buildTimeSlotInfo = (time: string, period: string): TimeSlotInfo => {
  const slotReservations = reservations.filter(
    r => r.timeSlotStart === time && r.period === period
  );
  const slotClosures = closures.filter(
    c => c.timeSlotStart === time && c.period === period
  );

  let status: TimeSlotInfo['status'] = 'available';
  if (slotClosures.length > 0) status = 'closed';
  else if (slotReservations.length > 0) status = 'booked';

  return { time, period: period as any, status, reservations: slotReservations, closures: slotClosures };
};

// 3. 렌더링
const renderTimeSlot = (slotInfo: TimeSlotInfo) => {
  if (slotInfo.status === 'closed') {
    return <ClosureIndicator closure={slotInfo.closures[0]} onRemove={handleRemoveClosure} />;
  }
  if (slotInfo.status === 'booked') {
    return slotInfo.reservations.map(r => <ReservationCard key={r.id} reservation={r} />);
  }
  return null; // 빈 시간대는 표시 안 함
};
```

---

### Task 1.5: 빠른 해제 (30분)
```typescript
const handleRemoveClosure = async (closureId: string) => {
  if (!confirm("정말로 마감을 해제하시겠습니까?")) return;

  // 낙관적 업데이트
  const previous = closures;
  setClosures(prev => prev.filter(c => c.id !== closureId));

  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`/api/admin/manual-close?id=${closureId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('해제 실패');

    setStatusMessage({ type: 'success', message: '마감이 해제되었습니다.' });
    setTimeout(() => setStatusMessage(null), 3000);
  } catch (err) {
    setClosures(previous); // 롤백
    setStatusMessage({ type: 'error', message: err.message });
    setTimeout(() => setStatusMessage(null), 5000);
  }
};
```

---

### Task 1.6: 테스트 (30분)
```typescript
// 1. 마감 등록 → 타임라인 반영
// 2. 빠른 해제 → UI 업데이트
// 3. 서비스 필터 변경
// 4. 날짜 변경
// 5. 자동 새로고침 (30초)
// 6. 에러 시나리오
// 7. 성능: 로딩 < 2초
// 8. 접근성: 키보드 네비게이션
```

---

## 🚀 성능 최적화

```typescript
// useMemo로 계산 캐싱
const timeSlots = useMemo(() => generateTimeSlots(period), [period]);

// useCallback로 함수 안정화
const fetchClosures = useCallback(async () => { ... }, [date, service]);

// 병렬 로드
Promise.all([fetchReservations(), fetchClosures()]);

// 조건부 렌더링
{activeSlots.length > 0 && <PeriodSection />}
```

---

## ⚠️ 리스크 대응

### 성능 저하
```typescript
✓ useMemo, useCallback 사용
✓ 조건부 렌더링
✓ React.memo (필요 시)
목표: 로딩 < 2초, 반응 < 100ms
```

### 데이터 동기화
```typescript
✓ 30초 자동 새로고침
✓ 낙관적 업데이트 + 검증
✓ 독립적 실패 처리
```

### 사용성
```typescript
✓ 확인 대화상자 필수
✓ 명확한 피드백
✓ 에러 시 롤백
```

---

## 📚 주요 API

### GET /api/admin/manual-close
```typescript
// Query: ?date=2025-11-10&serviceId=xxx
// Response: { success: true, closures: [...] }
```

### DELETE /api/admin/manual-close
```typescript
// Query: ?id=xxx
// Response: { success: true, message: "..." }
```

---

## 🎨 UI 패턴

### 색상
```typescript
마감: bg-red-50 border-red-300
예약: bg-blue-50 border-blue-200
빈 시간: (표시 안 함)
```

### 아이콘
```typescript
XCircle // 마감
Unlock // 해제
Clock // 시간
AlertCircle // 경고
```

### 컴포넌트
```typescript
Badge // 상태 표시
Tooltip // 상세 정보
Button // 액션
Alert // 메시지
```

---

## ⏱️ 타임라인

```
09:00 ─┬─ Task 1.1 (20분) Tooltip
       │
09:20 ─┼─ Task 1.2 (40분) ClosureIndicator
       │
10:00 ─┼─ Task 1.3 (30분) Fetch 로직
       │
10:30 ─┼─ Task 1.4 (50분) 타임라인 시각화
       │
11:20 ─┼─ Task 1.5 (30분) 빠른 해제
       │
11:50 ─┼─ Task 1.6 (30분) 테스트
       │
12:20 ─┴─ 완료 (버퍼 40분)
```

---

## ✅ 완료 기준

- [ ] Tooltip 컴포넌트 동작
- [ ] ClosureIndicator 표시
- [ ] 타임라인에 마감 통합
- [ ] 빠른 해제 동작
- [ ] 모든 테스트 통과
- [ ] 성능 목표 달성 (< 2초)
- [ ] 접근성 검증

---

## 📖 참고

- [상세 계획](/Users/blee/Desktop/cms/misopin-cms/claudedocs/phase1-implementation-plan.md)
- [요약 보고서](/Users/blee/Desktop/cms/misopin-cms/claudedocs/phase1-executive-summary.md)
- [설계 문서](/Users/blee/Desktop/cms/misopin-cms/claudedocs/manual-closure-feature-design.md)

---

**준비 상태**: ✅ 즉시 시작 가능
**예상 완료**: 3시간 후
