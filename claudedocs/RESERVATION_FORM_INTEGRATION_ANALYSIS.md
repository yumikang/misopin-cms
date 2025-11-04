# 정적 페이지 예약 폼 통합 분석 및 개선 방안

분석일시: 2025-11-04
대상: calendar-page.html
목표: 시간 기반 예약 시스템 통합

---

## 📊 현재 상태 분석

### 1. 현재 예약 폼 구조

**파일 위치**: `public/static-pages/calendar-page.html`

**폼 필드**:
```html
<select name="sh_checktime" id="sh_checktime">
  <option value="">예약 시간을 선택해주세요.</option>
  <option value="09:00">오전 09:00</option>
  <option value="09:30">오전 09:30</option>
  <option value="10:00">오전 10:00</option>
  <option value="10:30">오전 10:30</option>
  <option value="11:00">오전 11:00</option>
  <option value="11:30">오전 11:30</option>
  <option value="14:00">오후 02:00</option>  <!-- 점심시간 없음 -->
  <option value="14:30">오후 02:30</option>
  <option value="15:00">오후 03:00</option>
  <option value="15:30">오후 03:30</option>
  <option value="16:00">오후 04:00</option>
  <option value="16:30">오후 04:30</option>
</select>

<select name="sh_service" id="sh_service">
  <option value="">진료 항목을 선택해주세요</option>
  <option value="WRINKLE_BOTOX">주름 보톡스</option>
  <option value="VOLUME_LIFTING">볼륨 리프팅</option>
  <option value="SKIN_CARE">피부 관리</option>
  <option value="REMOVAL_PROCEDURE">제거 시술</option>
  <option value="BODY_CARE">바디 케어</option>
  <option value="OTHER_CONSULTATION">기타 상담</option>
</select>
```

**제출 로직** (line 1007-1018):
```javascript
const reservationData = {
    patient_name: formData.get('wr_name'),
    phone: phone,
    email: formData.get('sh_email') || null,
    birth_date: formData.get('sh_birth'),
    gender: gender,
    treatment_type: treatmentType,
    service: formData.get('sh_service'),        // enum 값
    preferred_date: formData.get('sh_checkday'),
    preferred_time: formData.get('sh_checktime'), // 정적 시간
    notes: formData.get('wr_content') || null
};

// API 호출
const api = new MisopinAPI();
const result = await api.submitReservation(reservationData);
```

### 2. 문제점 분석

#### ❌ 치명적 문제

1. **정적 시간 슬롯**
   - 하드코딩된 12개 옵션
   - 서비스별 소요 시간 고려 안 함
   - 실제 진료 시간(09:00-12:00, 14:00-18:00)과 불일치

2. **오버부킹 가능**
   ```
   현재: 사용자가 09:00 선택 → 바로 예약
   문제: 이미 3건 예약되어 시간 부족해도 접수됨
   결과: 💥 오버부킹 발생
   ```

3. **시간 계산 없음**
   - 주름 보톡스 (40분) vs 피부 관리 (70분) 구분 없음
   - 남은 가용 시간 확인 불가
   - 예약 거부 로직 없음

4. **사용자 경험**
   - 예약 가능 여부를 제출 후에만 알 수 있음
   - 실시간 피드백 없음
   - 가득 찬 시간대도 선택 가능

#### ⚠️ 개선 필요 사항

1. **서비스 정보 부재**
   - 각 서비스의 소요 시간 표시 없음
   - 사용자가 얼마나 걸리는지 모름

2. **점심시간 표시 문제**
   - 12:00-14:00 점심시간인데 슬롯에 없음
   - 혼란 가능성

3. **실시간 현황 없음**
   - "잔여 N명" 같은 정보 없음
   - 인기 시간대 알 수 없음

---

## 🎯 목표 상태 (After)

### 1. 동적 시간 슬롯

```html
<!-- 서비스 선택 후 자동으로 시간 슬롯 로드 -->
<select name="sh_service" id="sh_service" onchange="loadAvailableTimeSlots()">
  <option value="">진료 항목을 선택해주세요</option>
  <option value="WRINKLE_BOTOX" data-duration="40">주름 보톡스 (약 40분)</option>
  <option value="SKIN_CARE" data-duration="70">피부 관리 (약 70분)</option>
  <!-- ... -->
</select>

<select name="sh_checktime" id="sh_checktime">
  <option value="">시간을 선택해주세요 (먼저 진료 항목을 선택하세요)</option>
  <!-- JavaScript로 동적 생성 -->
</select>
```

### 2. 실시간 가용성 표시

```html
<select name="sh_checktime" id="sh_checktime">
  <option value="09:00" data-status="available">
    오전 09:00 ✓ 예약 가능 (잔여 2명)
  </option>
  <option value="09:30" data-status="limited">
    오전 09:30 ⚠ 잔여 1명
  </option>
  <option value="10:00" data-status="full" disabled>
    오전 10:00 ✕ 예약 마감
  </option>
</select>
```

### 3. 실시간 검증

```javascript
// 시간 선택 시 즉시 검증
document.getElementById('sh_checktime').addEventListener('change', async function() {
    const service = document.getElementById('sh_service').value;
    const date = document.getElementById('sh_checkday').value;
    const time = this.value;

    // 실시간 가용성 체크
    const isAvailable = await checkAvailability(service, date, time);

    if (!isAvailable) {
        alert('죄송합니다. 해당 시간은 예약이 마감되었습니다.');
        this.value = '';
    }
});
```

---

## 🏗️ 구현 계획 (3단계)

### Phase 1: Backend API 개발 (Week 1, Day 1-3)

#### 1.1 Time Slot Calculator

**파일**: `lib/reservations/time-slot-calculator.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

interface TimeSlot {
  time: string;          // "09:00"
  available: boolean;
  remaining: number;     // 남은 예약 가능 인원
  capacity: number;      // 해당 슬롯의 총 수용 인원
  status: 'available' | 'limited' | 'full';
}

export async function calculateAvailableTimeSlots(
  serviceCode: string,
  dateString: string
): Promise<TimeSlot[]> {
  // 1. 서비스 정보 조회
  const service = await prisma.services.findUnique({
    where: { code: serviceCode }
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const totalDuration = service.durationMinutes + service.bufferMinutes;

  // 2. 해당 날짜의 요일 확인
  const targetDate = parseISO(dateString);
  const dayOfWeek = targetDate.getDay(); // 0=일, 1=월, ...

  // 3. 해당 요일의 진료 시간 조회
  const timeSlots = await prisma.clinicTimeSlots.findMany({
    where: {
      dayOfWeek: getDayOfWeekEnum(dayOfWeek),
      isActive: true,
      OR: [
        { serviceId: null },      // 모든 서비스에 적용
        { serviceId: service.id } // 특정 서비스 전용
      ]
    }
  });

  if (timeSlots.length === 0) {
    return []; // 해당 요일 휴진
  }

  // 4. 기존 예약 조회
  const existingReservations = await prisma.reservations.findMany({
    where: {
      preferredDate: {
        gte: startOfDay(targetDate),
        lt: endOfDay(targetDate)
      },
      status: { in: ['PENDING', 'CONFIRMED'] }
    }
  });

  // 5. 시간대별 슬롯 생성
  const result: TimeSlot[] = [];

  for (const slot of timeSlots) {
    const slotStartTime = parseInt(slot.startTime.split(':')[0]) * 60 +
                          parseInt(slot.startTime.split(':')[1]);
    const slotEndTime = parseInt(slot.endTime.split(':')[0]) * 60 +
                        parseInt(slot.endTime.split(':')[1]);

    // 30분 간격으로 슬롯 생성
    for (let minutes = slotStartTime; minutes <= slotEndTime - totalDuration; minutes += 30) {
      const hour = Math.floor(minutes / 60).toString().padStart(2, '0');
      const min = (minutes % 60).toString().padStart(2, '0');
      const timeString = `${hour}:${min}`;

      // 해당 시간대 예약 체크
      const reservationsAtTime = existingReservations.filter(r => {
        const rPeriod = r.period;
        const sPeriod = slot.period;
        const rTime = r.preferredTime;

        return rPeriod === sPeriod && rTime === timeString;
      });

      // 소비된 시간 계산
      const consumedMinutes = reservationsAtTime.reduce(
        (sum, r) => sum + (r.estimatedDuration || 0),
        0
      );

      // 남은 시간
      const totalSlotMinutes = slotEndTime - minutes;
      const remainingMinutes = totalSlotMinutes - consumedMinutes;

      // 최대 수용 인원 (슬롯 시간 / 서비스 시간)
      const capacity = Math.floor(totalSlotMinutes / totalDuration);
      const remaining = Math.floor(remainingMinutes / totalDuration);

      result.push({
        time: timeString,
        available: remaining > 0,
        remaining: remaining,
        capacity: capacity,
        status: remaining === 0 ? 'full' :
                remaining === 1 ? 'limited' :
                'available'
      });
    }
  }

  return result;
}

function getDayOfWeekEnum(day: number): string {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[day];
}
```

#### 1.2 API Endpoints

**파일**: `app/api/public/reservations/time-slots/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { calculateAvailableTimeSlots } from '@/lib/reservations/time-slot-calculator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const service = searchParams.get('service');
    const date = searchParams.get('date');

    // 입력 검증
    if (!service || !date) {
      return NextResponse.json(
        { error: 'service and date are required' },
        { status: 400 }
      );
    }

    // 날짜 형식 검증 (YYYYMMDD)
    if (!/^\d{8}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected: YYYYMMDD' },
        { status: 400 }
      );
    }

    // YYYYMMDD → YYYY-MM-DD 변환
    const formattedDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;

    // 시간 슬롯 계산
    const timeSlots = await calculateAvailableTimeSlots(service, formattedDate);

    return NextResponse.json({
      success: true,
      service: service,
      date: formattedDate,
      slots: timeSlots
    });

  } catch (error: any) {
    console.error('Time slots API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}
```

**파일**: `app/api/public/services/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const services = await prisma.services.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        durationMinutes: true,
        bufferMinutes: true,
        displayOrder: true
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      services: services.map(s => ({
        code: s.code,
        name: s.name,
        description: s.description,
        totalMinutes: s.durationMinutes + s.bufferMinutes,
        durationMinutes: s.durationMinutes,
        bufferMinutes: s.bufferMinutes
      }))
    });

  } catch (error: any) {
    console.error('Services API error:', error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

### Phase 2: 기존 API 개선 (Week 1, Day 4-5)

**파일**: `app/api/public/reservations/route.ts` (수정)

```typescript
// 기존 POST endpoint에 시간 기반 검증 추가

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { service, preferred_date, preferred_time } = body;

    // === 새로운 시간 기반 검증 ===

    // 1. 서비스 정보 조회
    const serviceInfo = await prisma.services.findUnique({
      where: { code: service }
    });

    if (!serviceInfo) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 서비스입니다.' },
        { status: 400 }
      );
    }

    const requiredMinutes = serviceInfo.durationMinutes + serviceInfo.bufferMinutes;

    // 2. Period 결정
    const hour = parseInt(preferred_time.split(':')[0]);
    const period = hour < 12 ? 'MORNING' : 'AFTERNOON';

    // 3. 트랜잭션으로 실시간 가용성 체크 + 예약 생성
    const reservation = await prisma.$transaction(async (tx) => {
      // 날짜 파싱 (YYYYMMDD → YYYY-MM-DD)
      const dateStr = `${preferred_date.substring(0, 4)}-${preferred_date.substring(4, 6)}-${preferred_date.substring(6, 8)}`;
      const targetDate = parseISO(dateStr);

      // 해당 시간대의 모든 예약 조회
      const existingReservations = await tx.reservations.findMany({
        where: {
          preferredDate: {
            gte: startOfDay(targetDate),
            lt: endOfDay(targetDate)
          },
          period: period,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      // 소비된 시간 계산
      const consumedMinutes = existingReservations.reduce(
        (sum, r) => sum + (r.estimatedDuration || 0),
        0
      );

      // 진료 시간 조회
      const dayOfWeek = getDayOfWeekEnum(targetDate.getDay());
      const timeSlot = await tx.clinicTimeSlots.findFirst({
        where: {
          dayOfWeek: dayOfWeek,
          period: period,
          isActive: true
        }
      });

      if (!timeSlot) {
        throw new Error('해당 날짜/시간은 진료하지 않습니다.');
      }

      // 진료 시간 (분)
      const totalMinutes =
        (parseInt(timeSlot.endTime.split(':')[0]) * 60 + parseInt(timeSlot.endTime.split(':')[1])) -
        (parseInt(timeSlot.startTime.split(':')[0]) * 60 + parseInt(timeSlot.startTime.split(':')[1]));

      // 남은 시간
      const remainingMinutes = totalMinutes - consumedMinutes;

      // 시간 부족 체크
      if (remainingMinutes < requiredMinutes) {
        throw new Error(
          `해당 시간대 예약이 마감되었습니다. (필요: ${requiredMinutes}분, 잔여: ${remainingMinutes}분)`
        );
      }

      // 예약 생성
      return await tx.reservations.create({
        data: {
          id: generateId(),
          // 기존 필드
          patientName: body.patient_name,
          phone: body.phone,
          email: body.email,
          birthDate: parseISO(body.birth_date),
          gender: body.gender,
          treatmentType: body.treatment_type,
          service: service,
          preferredDate: targetDate,
          preferredTime: preferred_time,
          // 새 필드
          serviceId: serviceInfo.id,
          serviceName: serviceInfo.name,
          estimatedDuration: requiredMinutes,
          period: period,
          timeSlotStart: preferred_time,
          timeSlotEnd: calculateEndTime(preferred_time, requiredMinutes),
          status: 'PENDING',
          notes: body.notes,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    });

    return NextResponse.json({
      success: true,
      reservation: reservation
    });

  } catch (error: any) {
    console.error('Reservation creation error:', error);

    // 시간 부족 에러는 사용자에게 명확히 전달
    if (error.message.includes('마감') || error.message.includes('잔여')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json(
      { success: false, error: '예약 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hour, min] = startTime.split(':').map(Number);
  const totalMinutes = hour * 60 + min + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60);
  const endMin = totalMinutes % 60;
  return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
}
```

---

### Phase 3: Frontend 개선 (Week 2)

#### 3.1 JavaScript 로직

**파일**: `public/static-pages/js/time-slot-loader.js` (신규)

```javascript
// 시간 슬롯 로더
class TimeSlotLoader {
  constructor() {
    this.apiBaseURL = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://cms.one-q.xyz';
    this.serviceSelect = document.getElementById('sh_service');
    this.dateInput = document.getElementById('sh_checkday');
    this.timeSelect = document.getElementById('sh_checktime');

    this.init();
  }

  init() {
    // 서비스 선택 시 시간 슬롯 로드
    this.serviceSelect?.addEventListener('change', () => this.loadTimeSlots());

    // 날짜 선택 시 시간 슬롯 로드
    this.dateInput?.addEventListener('change', () => this.loadTimeSlots());
  }

  async loadTimeSlots() {
    const service = this.serviceSelect.value;
    const date = this.dateInput.value;

    // 둘 다 선택되지 않으면 리턴
    if (!service || !date) {
      this.resetTimeSelect();
      return;
    }

    try {
      // 로딩 상태
      this.timeSelect.disabled = true;
      this.timeSelect.innerHTML = '<option value="">시간 로딩 중...</option>';

      // API 호출
      const response = await fetch(
        `${this.apiBaseURL}/api/public/reservations/time-slots?service=${service}&date=${date}`
      );

      const data = await response.json();

      if (data.success && data.slots) {
        this.renderTimeSlots(data.slots);
      } else {
        throw new Error(data.error || '시간 슬롯을 불러올 수 없습니다.');
      }

    } catch (error) {
      console.error('Time slots loading error:', error);

      // 실패 시 기본 슬롯으로 폴백
      this.renderFallbackTimeSlots();

      // 사용자에게 알림 (선택적)
      // alert('실시간 예약 현황을 불러오지 못했습니다. 기본 시간대로 표시됩니다.');
    } finally {
      this.timeSelect.disabled = false;
    }
  }

  renderTimeSlots(slots) {
    // 옵션 초기화
    this.timeSelect.innerHTML = '<option value="">시간을 선택해주세요</option>';

    // 슬롯 렌더링
    slots.forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.time;

      // 상태에 따른 텍스트
      const period = parseInt(slot.time.split(':')[0]) < 12 ? '오전' : '오후';
      const displayTime = this.formatTime(slot.time);

      let statusText = '';
      let statusIcon = '';

      if (slot.status === 'available') {
        statusText = `✓ 예약 가능 (잔여 ${slot.remaining}명)`;
        statusIcon = '✓';
        option.className = 'time-available';
      } else if (slot.status === 'limited') {
        statusText = `⚠ 잔여 ${slot.remaining}명`;
        statusIcon = '⚠';
        option.className = 'time-limited';
      } else {
        statusText = '✕ 예약 마감';
        statusIcon = '✕';
        option.className = 'time-full';
        option.disabled = true;
      }

      option.textContent = `${period} ${displayTime} ${statusText}`;
      option.dataset.status = slot.status;
      option.dataset.remaining = slot.remaining;

      this.timeSelect.appendChild(option);
    });

    // 슬롯이 하나도 없으면
    if (slots.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '해당 날짜는 휴진일입니다';
      option.disabled = true;
      this.timeSelect.appendChild(option);
    }
  }

  renderFallbackTimeSlots() {
    // API 실패 시 기본 슬롯
    this.timeSelect.innerHTML = `
      <option value="">시간을 선택해주세요</option>
      <option value="09:00">오전 09:00</option>
      <option value="09:30">오전 09:30</option>
      <option value="10:00">오전 10:00</option>
      <option value="10:30">오전 10:30</option>
      <option value="11:00">오전 11:00</option>
      <option value="11:30">오전 11:30</option>
      <option value="14:00">오후 02:00</option>
      <option value="14:30">오후 02:30</option>
      <option value="15:00">오후 03:00</option>
      <option value="15:30">오후 03:30</option>
      <option value="16:00">오후 04:00</option>
      <option value="16:30">오후 04:30</option>
    `;
  }

  resetTimeSelect() {
    this.timeSelect.innerHTML = '<option value="">먼저 진료 항목과 날짜를 선택하세요</option>';
    this.timeSelect.disabled = true;
  }

  formatTime(time24) {
    const [hour, min] = time24.split(':');
    const h = parseInt(hour);
    return `${h.toString().padStart(2, '0')}:${min}`;
  }
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  new TimeSlotLoader();
});
```

#### 3.2 CSS 스타일

**파일**: `public/static-pages/css/time-slot-styles.css` (신규)

```css
/* 시간 슬롯 스타일 */
#sh_checktime option.time-available {
  color: #10b981; /* green */
  font-weight: 500;
}

#sh_checktime option.time-limited {
  color: #f59e0b; /* orange */
  font-weight: 500;
}

#sh_checktime option.time-full {
  color: #ef4444; /* red */
  text-decoration: line-through;
  background-color: #fee2e2;
}

/* 서비스 선택 옵션에 시간 표시 */
#sh_service option[data-duration]::after {
  content: " (" attr(data-duration) "분)";
  color: #6b7280;
  font-size: 0.9em;
}

/* 로딩 상태 */
#sh_checktime:disabled {
  background-color: #f3f4f6;
  cursor: wait;
}
```

#### 3.3 HTML 수정

**파일**: `public/static-pages/calendar-page.html` (수정)

```html
<!-- HEAD에 추가 -->
<link rel="stylesheet" href="css/time-slot-styles.css">
<script src="js/time-slot-loader.js"></script>

<!-- 서비스 선택에 시간 정보 추가 -->
<select name="sh_service" id="sh_service" required class="sh_input required">
  <option value="">진료 항목을 선택해주세요</option>
  <option value="WRINKLE_BOTOX" data-duration="40">주름 보톡스 (약 40분)</option>
  <option value="VOLUME_LIFTING" data-duration="40">볼륨 리프팅 (약 40분)</option>
  <option value="SKIN_CARE" data-duration="70">피부 관리 (약 70분)</option>
  <option value="REMOVAL_PROCEDURE" data-duration="30">제거 시술 (약 30분)</option>
  <option value="BODY_CARE" data-duration="60">바디 케어 (약 60분)</option>
  <option value="OTHER_CONSULTATION" data-duration="30">기타 상담 (약 30분)</option>
</select>

<!-- 시간 선택 - JavaScript로 동적 생성됨 -->
<select name="sh_checktime" id="sh_checktime" required disabled>
  <option value="">먼저 진료 항목과 날짜를 선택하세요</option>
</select>
```

---

## 🧪 테스트 시나리오

### Scenario 1: 정상 예약

```
1. 사용자: 날짜 선택 (2025-11-15)
2. 사용자: 서비스 선택 (주름 보톡스)
3. 시스템: API 호출 → 시간 슬롯 로드
4. 화면: "09:00 ✓ 예약 가능 (잔여 3명)" 표시
5. 사용자: 09:00 선택 → 제출
6. 시스템: 트랜잭션으로 실시간 체크 → 예약 성공
```

### Scenario 2: 시간 부족 (오버부킹 방지)

```
1. 현재 상태: 오전 180분 중 140분 사용 (잔여 40분)
2. 사용자: 피부 관리 (70분) 선택
3. 시스템: API 호출
4. 화면: 모든 오전 슬롯 "✕ 예약 마감" (disabled)
5. 사용자: 오후 시간 선택
6. 시스템: 정상 예약
```

### Scenario 3: 동시 예약 (Race Condition)

```
1. 사용자 A, B 동시에 마지막 슬롯 선택
2. 둘 다 "✓ 예약 가능 (잔여 1명)" 확인
3. A 먼저 제출 → 트랜잭션 시작 → 예약 성공
4. B 제출 → 트랜잭션 시작 → 실시간 체크 → 409 Conflict
5. B에게 "해당 시간대 예약이 마감되었습니다" 표시
```

### Scenario 4: API 장애 (Graceful Degradation)

```
1. 사용자: 서비스 선택
2. 시스템: API 호출 실패
3. 화면: 기본 시간 슬롯으로 폴백
4. 사용자: 시간 선택 → 제출
5. 시스템: 제출 시점에 다시 검증 → 성공 또는 실패
```

---

## 📈 성공 지표

### 기술 지표

- ✅ API 응답 시간 < 500ms
- ✅ 오버부킹 발생률 0%
- ✅ API 에러율 < 1%
- ✅ 동시 예약 충돌 정상 처리 100%

### 비즈니스 지표

- ✅ 예약 완료율 +15% (실시간 가용성 표시로 개선)
- ✅ 예약 취소율 -30% (정확한 시간 정보 제공)
- ✅ 고객 만족도 향상 (혼란 감소)
- ✅ 관리자 업무 부담 -50% (오버부킹 방지)

---

## 🚀 배포 계획

### Week 1: Backend
- Day 1-2: Time Slot Calculator 개발
- Day 3: API Endpoints 개발
- Day 4-5: 기존 API 개선 및 테스트

### Week 2: Frontend
- Day 1-2: JavaScript 로직 개발
- Day 3: CSS 스타일링
- Day 4: 통합 테스트
- Day 5: 프로덕션 배포

### Phased Rollout

```
Step 1: Backend 배포 (사용자 영향 없음)
  → API 엔드포인트 추가
  → 기존 API 로직 개선

Step 2: Frontend 배포 (점진적)
  → 새 JS 파일 추가
  → HTML 수정 (feature flag로 제어)

Step 3: 활성화
  → feature flag 활성화
  → 모니터링 강화 (24시간)

Step 4: 완전 전환
  → 기본 동작으로 설정
  → 폴백 제거
```

---

## 💡 추가 개선 아이디어

### 단기 (1개월)

1. **인기 시간대 표시**
   - "🔥 인기 시간" 배지
   - 조기 마감 가능성 경고

2. **추천 시간대**
   - AI 기반 시간 추천
   - "이 시간은 어떠세요?" 제안

3. **대기자 명단**
   - 마감된 시간대 대기 신청
   - 취소 발생 시 자동 알림

### 중기 (2-3개월)

1. **캘린더 뷰**
   - 월간 가용성 한눈에 보기
   - 색상으로 여유/보통/마감 표시

2. **자동 리마인더**
   - 예약 1일 전 SMS/이메일
   - 당일 오전 알림

3. **재예약 간소화**
   - 이전 예약 정보 불러오기
   - 원클릭 재예약

---

## 📌 주의사항

### 개발 시

1. **타임존 처리**
   - 모든 시간은 한국 시간(KST) 기준
   - Date 객체 사용 시 주의

2. **트랜잭션**
   - 예약 생성은 반드시 트랜잭션 사용
   - Race condition 방지

3. **에러 처리**
   - 사용자 친화적 에러 메시지
   - Graceful degradation

### 운영 시

1. **모니터링**
   - API 응답 시간
   - 에러율
   - 오버부킹 발생 여부

2. **백업**
   - 매일 자동 백업
   - 롤백 절차 준비

3. **성능**
   - DB 쿼리 최적화
   - 캐싱 전략 (선택적)

---

## 🎯 결론

**현재 상태**: DB 기반 완성 ✅
**다음 단계**: 비즈니스 로직 + 프론트엔드 통합

**예상 완성 기간**: 2주
**예상 개발 시간**: 40-60시간

**ROI**:
- 오버부킹 방지 → 고객 신뢰 향상 💰
- 정확한 시간 관리 → 운영 효율성 증가 📈
- 실시간 피드백 → 예약 완료율 증가 ✨

**준비 완료!** 🚀
